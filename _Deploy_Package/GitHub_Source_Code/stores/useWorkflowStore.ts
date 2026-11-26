import { create } from 'zustand';
import { WorkflowTask } from '../types';
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';

interface WorkflowState {
    tasks: WorkflowTask[];
    isLoaded: boolean;
    addTask: (task: Omit<WorkflowTask, 'id' | 'createdAt' | 'createdBy'>) => Promise<void>;
    updateTask: (id: string, updates: Partial<WorkflowTask>) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    subscribe: (companyId: string) => () => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
    tasks: [],
    isLoaded: false,

    addTask: async (task) => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            await addDoc(collection(db, 'workflow_tasks'), {
                ...task,
                createdAt: new Date().toISOString(),
                createdBy: user.displayName || 'User'
            });
        } catch (error) {
            console.error('Error adding task:', error);
        }
    },

    updateTask: async (id, updates) => {
        try {
            await updateDoc(doc(db, 'workflow_tasks', id), {
                ...updates,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error updating task:', error);
        }
    },

    deleteTask: async (id) => {
        try {
            await deleteDoc(doc(db, 'workflow_tasks', id));
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    },

    subscribe: (companyId) => {
        const user = auth.currentUser;
        if (!user) return () => { };

        const q = query(
            collection(db, 'workflow_tasks'),
            where('companyId', '==', companyId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tasks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as WorkflowTask[];
            set({ tasks, isLoaded: true });
        });

        return unsubscribe;
    }
}));
