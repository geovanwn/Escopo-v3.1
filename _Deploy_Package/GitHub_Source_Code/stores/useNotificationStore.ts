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
            createdBy: 'System'
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
            await updateDoc(doc(db, 'notifications', id), { isRead: true });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    },

    markAllAsRead: async () => {
        const { notifications } = get();
        const unread = notifications.filter(n => !n.isRead);
        try {
            await Promise.all(unread.map(n => updateDoc(doc(db, 'notifications', n.id), { isRead: true })));
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

        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', user.uid),
            orderBy('date', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Notification[];
            set({ notifications, isLoaded: true });
        });

        return unsubscribe;
    }
}));
