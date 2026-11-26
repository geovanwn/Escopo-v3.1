import { create } from 'zustand';
import { AuditLogEntry } from '../types';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs, addDoc } from 'firebase/firestore';
import forge from 'node-forge';

interface AuditState {
    logs: AuditLogEntry[];
    isLoaded: boolean;
    subscribe: () => () => void;
    addAuditLog: (log: Omit<AuditLogEntry, 'id'>) => Promise<void>;
}


export const useAuditStore = create<AuditState>((set, get) => ({
    logs: [],
    isLoaded: false,

    subscribe: () => {
        const user = auth.currentUser;
        if (!user) return () => { };

        const q = query(
            collection(db, 'audit_logs'),
            orderBy('timestamp', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as AuditLogEntry[];
            set({ logs, isLoaded: true });
        }, (error) => {
            console.error("Audit Subscribe Error (likely missing index):", error);
            set({ isLoaded: true });
        });

        return unsubscribe;
    },

    addAuditLog: async (log: Omit<AuditLogEntry, 'id'>) => {
        try {
            const state = get();
            let previousHash = '';
            
            // Pega o hash anterior do estado ou busca no DB
            if (state.logs.length > 0) {
                previousHash = (state.logs[0] as any).hash || '';
            } else {
                const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    previousHash = snap.docs[0].data().hash || '';
                }
            }

            const timestamp = new Date().toISOString();
            
            // Dados para o Hash
            const payload = `${log.userId}|${log.action}|${log.entity}|${log.entityId}|${timestamp}|${previousHash}`;
            const md = forge.md.sha256.create();
            md.update(payload);
            const hash = md.digest().toHex();

            await addDoc(collection(db, 'audit_logs'), {
                ...log,
                timestamp,
                createdAt: timestamp,
                createdBy: log.userName || 'System',
                createdBy_id: log.userId || 'SYSTEM',
                createdBy_name: log.userName || 'System',
                previousHash,
                hash
            });
        } catch (error) {
            console.error("Error adding audit log:", error);
        }
    }
}));

