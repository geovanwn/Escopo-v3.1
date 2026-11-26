import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { app, ipcMain } from 'electron';
import dns from 'node:dns';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyA0ikwLcXZd5ZkhJ3YuXVfjgt-fXhpeZrA",
    authDomain: "escopo-v3-8e4c3.firebaseapp.com",
    projectId: "escopo-v3-8e4c3",
};

// Use a distinct app name to avoid collisions if initialized elsewhere in main
const firebaseApp = initializeApp(firebaseConfig, 'electron-auth-app');
const auth = getAuth(firebaseApp);

import { syncFirebaseToLocal, setLocalDb } from './syncService';

let db: Database.Database;

export function performAutoBackupSqlite() {
    try {
        const userDataPath = app.getPath('userData');
        const dbPath = path.join(userDataPath, 'escopov3_local.db');
        if (!fs.existsSync(dbPath)) return;

        const backupDir = path.join(userDataPath, 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const destPath = path.join(backupDir, `escopov3_backup_${timestamp}.db`);
        fs.copyFileSync(dbPath, destPath);
        console.log(`[DatabaseService] Backup automático do SQLite salvo em: ${destPath}`);

        // Keep last 10 backup files
        const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('escopov3_backup_') && f.endsWith('.db'))
            .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);

        if (files.length > 10) {
            files.slice(10).forEach(f => {
                try { fs.unlinkSync(path.join(backupDir, f.name)); } catch (e) {}
            });
        }
    } catch (err) {
        console.error('[DatabaseService] Erro ao realizar backup automático do SQLite:', err);
    }
}

export function initializeSqlite() {
    const dbPath = path.join(app.getPath('userData'), 'escopov3_local.db');
    db = new Database(dbPath, { verbose: console.log });
    db.pragma('journal_mode = WAL'); // Performance e concorrência
    
    // CRITICAL: Share this DB instance with syncService so syncFirebaseToLocal works correctly
    setLocalDb(db);

    // Tabela de usuários locais (substituindo o Firebase Auth)
    db.exec(`
        CREATE TABLE IF NOT EXISTS local_users (
            uid TEXT PRIMARY KEY,
            email TEXT UNIQUE,
            passwordHash TEXT,
            displayName TEXT,
            role TEXT,
            profileData TEXT
        );
    `);

    // Tabela de Documentos (estilo NoSQL/Firestore)
    db.exec(`
        CREATE TABLE IF NOT EXISTS local_docs (
            collectionName TEXT,
            docId TEXT,
            userId TEXT,
            docData TEXT,
            PRIMARY KEY (collectionName, docId)
        );
        CREATE INDEX IF NOT EXISTS idx_collection_user ON local_docs (collectionName, userId);

        CREATE TABLE IF NOT EXISTS sync_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            operation TEXT,
            collectionName TEXT,
            docId TEXT,
            userId TEXT,
            docData TEXT,
            timestamp INTEGER
        );
    `);

    // Registro de IPCs para o Frontend se comunicar com o SQLite
    ipcMain.handle('db-get-collection', async (_, collectionName: string, userId: string) => {
        try {
            // Try filtered query first
            let stmt = db.prepare('SELECT docId, docData FROM local_docs WHERE collectionName = ? AND userId = ?');
            let rows = stmt.all(collectionName, userId) as any[];
            
            // If no results found with userId, try fetching all docs for this collection
            // This handles cases where data was synced with different userId format
            if (rows.length === 0) {
                console.log(`[DB] No results for ${collectionName} with userId=${userId}, trying without filter...`);
                const allStmt = db.prepare('SELECT docId, docData, userId FROM local_docs WHERE collectionName = ?');
                const allRows = allStmt.all(collectionName) as any[];
                console.log(`[DB] Found ${allRows.length} total docs for ${collectionName} (any userId)`);
                rows = allRows;
            }
            
            return rows.map((row) => {
                const data = JSON.parse(row.docData);
                return { ...data, id: row.docId };
            });
        } catch (error) {
            console.error(`Erro ao ler coleção [${collectionName}]:`, error);
            return [];
        }
    });

    ipcMain.handle('db-get-collection-all', async (_, collectionName: string) => {
        try {
            let stmt = db.prepare('SELECT docId, docData FROM local_docs WHERE collectionName = ?');
            const rows = stmt.all(collectionName) as any[];
            return rows.map((row) => {
                const data = JSON.parse(row.docData);
                return { ...data, id: row.docId };
            });
        } catch (error) {
            console.error(`Erro ao ler coleção [${collectionName}]:`, error);
            return [];
        }
    });

    ipcMain.handle('db-get-doc', async (_, collectionName: string, docId: string) => {
        try {
            const stmt = db.prepare('SELECT docData FROM local_docs WHERE collectionName = ? AND docId = ?');
            const row = stmt.get(collectionName, docId) as any;
            if (row) {
                return { ...JSON.parse(row.docData), id: docId };
            }
            return null;
        } catch (error) {
            console.error(`Erro ao ler doc [${collectionName}/${docId}]:`, error);
            return null;
        }
    });

    ipcMain.handle('db-save-doc', async (_, collectionName: string, docId: string, data: any, userId: string) => {
        try {
            const uid = userId || data.userId || 'GLOBAL';
            const stmt = db.prepare('INSERT OR REPLACE INTO local_docs (collectionName, docId, userId, docData) VALUES (?, ?, ?, ?)');
            stmt.run(collectionName, docId, uid, JSON.stringify(data));
            
            // Adicionar na fila de sincronização
            const syncStmt = db.prepare('INSERT INTO sync_queue (operation, collectionName, docId, userId, docData, timestamp) VALUES (?, ?, ?, ?, ?, ?)');
            syncStmt.run('SAVE', collectionName, docId, uid, JSON.stringify(data), Date.now());

            return { success: true };
        } catch (error: any) {
            console.error(`Erro ao salvar doc [${collectionName}/${docId}]:`, error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db-delete-doc', async (_, collectionName: string, docId: string) => {
        try {
            const stmt = db.prepare('DELETE FROM local_docs WHERE collectionName = ? AND docId = ?');
            stmt.run(collectionName, docId);

            // Adicionar na fila de sincronização
            const syncStmt = db.prepare('INSERT INTO sync_queue (operation, collectionName, docId, userId, docData, timestamp) VALUES (?, ?, ?, ?, ?, ?)');
            syncStmt.run('DELETE', collectionName, docId, 'GLOBAL', null, Date.now());

            return { success: true };
        } catch (error: any) {
            console.error(`Erro ao deletar doc [${collectionName}/${docId}]:`, error);
            return { success: false, error: error.message };
        }
    });

    // Simple Auth Handlers
    ipcMain.handle('auth-login', async (_, email: string, pass: string) => {
        try {
            const checkInternet = (): Promise<boolean> => new Promise(resolve => dns.lookup('google.com', err => resolve(!err || err.code !== "ENOTFOUND")));
            const isOnline = await checkInternet();
            
            if (isOnline) {
                try {
                    console.log('[Auth] Online, autenticando via Firebase...');
                    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
                    const user = userCredential.user;
                    
                    const defaultProfile = { name: user.displayName || email.split('@')[0], role: 'Admin', isApproved: true, isSuperAdmin: true, master_flag: true };
                    const stmt = db.prepare('INSERT OR REPLACE INTO local_users (uid, email, passwordHash, displayName, role, profileData) VALUES (?, ?, ?, ?, ?, ?)');
                    stmt.run(user.uid, email, pass, defaultProfile.name, 'Admin', JSON.stringify(defaultProfile));
                    
                    // NEW: Pull all existing data from Firebase for this user so they have their companies/data offline!
                    await syncFirebaseToLocal(user.uid);
                    
                    return { success: true, user: { uid: user.uid, email: user.email, displayName: defaultProfile.name, profileData: defaultProfile } };
                } catch (fbErr: any) {
                    console.error('[Auth] Erro Firebase:', fbErr);
                    return { success: false, error: 'Credenciais inválidas na nuvem' };
                }
            } else {
                console.log('[Auth] Offline, autenticando via cache local...');
                const stmt = db.prepare('SELECT * FROM local_users WHERE email = ? AND passwordHash = ?');
                const row = stmt.get(email, pass) as any;
                if (row) {
                    return { success: true, user: { uid: row.uid, email: row.email, displayName: row.displayName, profileData: JSON.parse(row.profileData) } };
                }
                return { success: false, error: 'Credenciais inválidas ou conta não sincronizada localmente' };
            }
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('auth-register', async (_, email: string, pass: string, name: string) => {
        try {
            const uid = Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
            const defaultProfile = {
                name, role: 'Admin', isApproved: true, isSuperAdmin: true, master_flag: true
            };
            const stmt = db.prepare('INSERT INTO local_users (uid, email, passwordHash, displayName, role, profileData) VALUES (?, ?, ?, ?, ?, ?)');
            stmt.run(uid, email, pass, name, 'Admin', JSON.stringify(defaultProfile));
            return { success: true, user: { uid, email, displayName: name, profileData: defaultProfile } };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('sync-cloud-now', async (_, userId: string) => {
        try {
            const uid = userId || 'GLOBAL';
            await syncFirebaseToLocal(uid);
            return { success: true };
        } catch (err: any) {
            console.error('Erro em sync-cloud-now:', err);
            return { success: false, error: err.message };
        }
    });
}
