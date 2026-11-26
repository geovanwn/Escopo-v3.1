import Database from 'better-sqlite3';
import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import dns from 'node:dns';

// Import Firebase directly bypassing aliases if necessary
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyA0ikwLcXZd5ZkhJ3YuXVfjgt-fXhpeZrA",
    authDomain: "escopo-v3-8e4c3.firebaseapp.com",
    projectId: "escopo-v3-8e4c3",
};

const firebaseApp = initializeApp(firebaseConfig, 'electron-sync-app');
const firestoreDb = getFirestore(firebaseApp);
const syncAuth = getAuth(firebaseApp);

let localDb: Database.Database;

export function setLocalDb(db: Database.Database) {
    localDb = db;
}

export function initializeSyncService(db?: Database.Database) {
    if (db) {
        localDb = db;
    } else if (!localDb) {
        const dbPath = path.join(app.getPath('userData'), 'escopov3_local.db');
        localDb = new Database(dbPath);
    }

    // Run sync queue and cloud pull every 20 seconds
    setInterval(async () => {
        const isOnline = await checkInternet();
        if (isOnline) {
            await processSyncQueue();
            
            // Periodically sync cloud changes to local SQLite if auth user is logged in
            if (syncAuth.currentUser) {
                await syncFirebaseToLocal(syncAuth.currentUser.uid);
            }
        }
    }, 20000);
}

function checkInternet(): Promise<boolean> {
    return new Promise((resolve) => {
        dns.lookup('google.com', (err) => {
            if (err && err.code == "ENOTFOUND") {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

async function processSyncQueue() {
    try {
        if (!localDb) return;

        // Verify Firebase authentication before writing/reading from Cloud Firestore (Security Rules requirement)
        if (!syncAuth.currentUser) {
            console.log(`[SyncService] Usuário não autenticado no Firebase Cloud. Sincronização em espera.`);
            return;
        }

        const stmt = localDb.prepare('SELECT * FROM sync_queue ORDER BY timestamp ASC LIMIT 50');
        const pendingItems = stmt.all() as any[];

        if (pendingItems.length === 0) return;

        console.log(`[SyncService] Encontrados ${pendingItems.length} itens na fila. Sincronizando com a Nuvem...`);

        let processedCount = 0;
        for (const item of pendingItems) {
            try {
                const docRef = doc(firestoreDb, item.collectionName, item.docId);
                
                if (item.operation === 'SAVE') {
                    const data = JSON.parse(item.docData);
                    await setDoc(docRef, data, { merge: true });
                } else if (item.operation === 'DELETE') {
                    await deleteDoc(docRef);
                }

                // Remove from queue after successful sync
                const delStmt = localDb.prepare('DELETE FROM sync_queue WHERE id = ?');
                delStmt.run(item.id);
                processedCount++;
            } catch (err) {
                console.error(`[SyncService] Falha ao sincronizar item ${item.id}:`, err);
            }
        }
        
        console.log(`[SyncService] Sincronização da fila concluída (${processedCount} itens).`);

        if (processedCount > 0) {
            BrowserWindow.getAllWindows().forEach(win => {
                win.webContents.send('sync-completed', { processedCount, timestamp: Date.now() });
            });
        }
    } catch (err) {
        console.error(`[SyncService] Erro fatal no motor de sincronização:`, err);
    }
}

export async function syncFirebaseToLocal(uid: string) {
    if (!localDb) return;
    try {
        const isOnline = await checkInternet();
        if (!isOnline) return;
        
        console.log(`[SyncService] Baixando atualizações da nuvem para o SQLite local (UID: ${uid})...`);
        
        const globalCollections = ['ncms', 'csts', 'cfops', 'units', 'operationTypes', 'taxRates', 'taxCalendar', 'spedValidations', 'systemSettings'];
        const userCollections = [
            'companies', 'clients', 'products', 'services',
            'employees', 'partners', 'invoices', 'payrollItems', 'payrollRuns', 'alerts',
            'bankAccounts', 'bankTransactions', 'filings',
            'costCenters', 'assets', 'accountingEntries', 'accountingClosures', 'savedReports', 'users'
        ];
        
        const stmt = localDb.prepare('INSERT OR REPLACE INTO local_docs (collectionName, docId, userId, docData) VALUES (?, ?, ?, ?)');
        
        const transaction = localDb.transaction((docs: any[]) => {
            for (const d of docs) {
                stmt.run(d.collectionName, d.docId, uid, d.docData);
            }
        });

        const allDocs: any[] = [];

        // 1. Fetch reference/global tables
        for (const collName of globalCollections) {
            try {
                const snapshot = await getDocs(collection(firestoreDb, collName));
                snapshot.forEach((docSnap) => {
                    allDocs.push({
                        collectionName: collName,
                        docId: docSnap.id,
                        docData: JSON.stringify(docSnap.data())
                    });
                });
            } catch (err) {
                console.error(`[SyncService] Erro ao puxar coleção global ${collName}:`, err);
            }
        }

        // 2. Fetch user-specific tables
        for (const collName of userCollections) {
            try {
                let snapshot;
                if (!uid || uid === 'GLOBAL' || uid === 'master') {
                    snapshot = await getDocs(collection(firestoreDb, collName));
                } else {
                    const q = query(collection(firestoreDb, collName), where('userId', '==', uid));
                    snapshot = await getDocs(q);
                }
                snapshot.forEach((docSnap) => {
                    allDocs.push({
                        collectionName: collName === 'users' ? 'systemUsers' : collName, 
                        docId: docSnap.id,
                        docData: JSON.stringify(docSnap.data())
                    });
                });
            } catch (err) {
                console.error(`[SyncService] Erro ao puxar coleção ${collName}:`, err);
            }
        }
        
        if (allDocs.length > 0) {
            transaction(allDocs);
            console.log(`[SyncService] Sincronizados ${allDocs.length} documentos da Nuvem para o SQLite local.`);

            BrowserWindow.getAllWindows().forEach(win => {
                win.webContents.send('sync-completed', { count: allDocs.length, timestamp: Date.now() });
            });
        }
    } catch (err) {
        console.error(`[SyncService] Erro em syncFirebaseToLocal:`, err);
    }
}
