import { useState, useCallback } from 'react';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: string;
}

export const useNotifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const notify = useCallback((title: string, message: string, type: Notification['type'] = 'info') => {
        const newNotification: Notification = {
            id: Math.random().toString(36).substr(2, 9),
            title,
            message,
            type,
            timestamp: new Date().toISOString()
        };

        setNotifications(prev => [newNotification, ...prev]);

        // In a real app, this would also trigger a Push Notification via FCM or similar
        console.log(`Push Notification: [${type.toUpperCase()}] ${title} - ${message}`);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
        }, 5000);
    }, []);

    return { notifications, notify };
};
