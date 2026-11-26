import { create } from 'zustand';
import { AuditLogEntry } from '../types';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

interface AuditState {
    logs: AuditLogEntry[];
    isLoaded: boolean;
    subscribe: () => () => void;
    addAuditLog: (log: Omit<AuditLogEntry, 'id'>) => Promise<void>;
}


export const useAuditStore = create<AuditState>((set) => ({
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
            const { addDoc, collection } = await import('firebase/firestore');
            await addDoc(collection(db, 'audit_logs'), {
                ...log,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error adding audit log:", error);
        }
    }
}));

