import { create } from 'zustand';
import { Notification } from '../types';
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';

interface NotificationState {
    notifications: Notification[];
    isLoaded: boolean;
    addNotification: (notification: Omit<Notification, 'id' | 'userId' | 'date' | 'isRead'>) => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    subscribe: () => () => void;
    clearNotifications: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    isLoaded: false,

    addNotification: async (notification) => {
        const user = auth.currentUser;
        if (!user) return;

        const newNotification = {
            ...notification,
            userId: user.uid,
            date: new Date().toISOString(),
            isRead: false,
            whatsappSent: false,
            emailSent: false,
            createdAt: new Date().toISOString(),
            createdBy: user.displayName || 'System',
            createdBy_id: user.uid,
            createdBy_name: user.displayName || 'System',
            updatedAt: new Date().toISOString(),
            updatedBy: user.displayName || 'System',
            updatedBy_id: user.uid,
            updatedBy_name: user.displayName || 'System'
        };

        try {
            await addDoc(collection(db, 'notifications'), newNotification);

            // Simulating API calls for External Integrations (Rec 1)
            if (notification.priority === 'high') {
                console.log(`[SIMULATION] Sending WhatsApp to user for: ${notification.title}`);
                console.log(`[SIMULATION] Sending Email to user for: ${notification.title}`);
            }
        } catch (error) {
            console.error('Error adding notification:', error);
        }
    },

    markAsRead: async (id) => {
        try {
            await updateDoc(doc(db, 'notifications', id), {
                isRead: true,
                updatedAt: new Date().toISOString(),
                updatedBy: auth.currentUser?.displayName || 'System',
                updatedBy_id: auth.currentUser?.uid || 'SYSTEM',
                updatedBy_name: auth.currentUser?.displayName || 'System'
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    },

    markAllAsRead: async () => {
        const { notifications } = get();
        const unread = notifications.filter(n => !n.isRead);
        try {
            await Promise.all(unread.map(n => updateDoc(doc(db, 'notifications', n.id), {
                isRead: true,
                updatedAt: new Date().toISOString(),
                updatedBy: auth.currentUser?.displayName || 'System',
                updatedBy_id: auth.currentUser?.uid || 'SYSTEM',
                updatedBy_name: auth.currentUser?.displayName || 'System'
            })));
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    },

    deleteNotification: async (id) => {
        try {
            await deleteDoc(doc(db, 'notifications', id));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    },

    clearNotifications: async () => {
        const { notifications } = get();
        try {
            // Deleting all notifications concurrently
            await Promise.all(notifications.map(n => deleteDoc(doc(db, 'notifications', n.id))));
            // Optimistically update logic reference if needed, but the snapshot listener should handle it.
        } catch (error) {
            console.error('Error clearing notifications:', error);
        }
    },

    subscribe: () => {
        const user = auth.currentUser;
        if (!user) return () => { };

        // Optimized query: removed orderBy to avoid the need for a composite index
        // which was causing white screens due to 'failed-precondition' errors.
        // We now sort in the onSnapshot callback in memory.
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Notification[];

            // Sort by date descending in memory
            items.sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return dateB - dateA;
            });

            set({ notifications: items, isLoaded: true });
        }, (error) => {
            console.error("❌ [useNotificationStore] Firestore Subscribe Error:", error);
            set({ isLoaded: true });
        });

        return unsubscribe;
    }
}));
