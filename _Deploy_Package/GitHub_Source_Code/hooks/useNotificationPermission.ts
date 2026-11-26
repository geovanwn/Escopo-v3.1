import { useEffect } from 'react';

/**
 * Hook para solicitar permissão de notificações do navegador
 */
export const useNotificationPermission = () => {
    useEffect(() => {
        // Verificar se o navegador suporta notificações
        if ('Notification' in window) {
            // Se a permissão ainda não foi concedida nem negada, solicitar
            if (Notification.permission === 'default') {
                setTimeout(() => {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            console.log('✅ Permissão de notificação concedida');

                            // Enviar notificação de boas-vindas
                            new Notification('🎉 Sistema EscopoV3', {
                                body: 'Notificações ativadas! Você receberá alertas importantes sobre prazos, guias e obrigações.',
                                icon: '/icon.png',
                                badge: '/icon.png',
                                tag: 'welcome'
                            });
                        } else {
                            console.log('⚠️ Permissão de notificação negada');
                        }
                    });
                }, 2000); // Esperar 2 segundos após o login para não ser intrusivo
            } else if (Notification.permission === 'granted') {
                console.log('✅ Permissão de notificação já concedida anteriormente');
            }
        } else {
            console.log('⚠️ Este navegador não suporta notificações');
        }
    }, []);
};

/**
 * Função para enviar notificação em balão
 */
export const sendBrowserNotification = (
    title: string,
    body: string,
    options?: {
        icon?: string;
        badge?: string;
        tag?: string;
        requireInteraction?: boolean;
        vibrate?: boolean; // Opção para ativar vibração em dispositivos móveis
    }
) => {
    if ('Notification' in window && Notification.permission === 'granted') {
        // Ativar vibração se solicitado e suportado
        if (options?.vibrate && 'vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
        }

        return new Notification(title, {
            body,
            icon: options?.icon || '/icon.png',
            badge: options?.badge || '/icon.png',
            tag: options?.tag,
            requireInteraction: options?.requireInteraction || false
        });
    }
    return null;
};
