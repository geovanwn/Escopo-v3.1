import React, { useMemo } from 'react';
import { useNotificationStore } from '../stores/useNotificationStore';
import { useData } from '../contexts/DataContext';
import { Bell, AlertTriangle, Info, Calendar, Trash2, CheckCircle2 } from 'lucide-react';
import { Notification } from '../types';

export const NotificationsPage: React.FC = () => {
    const { notifications, markAsRead, markAllAsRead, deleteNotification, clearNotifications } = useNotificationStore();
    const { companies, selectedCompanyId } = useData();

    const getCompanyName = (id?: string) => {
        if (!id) return null;
        const company = companies.find(c => c.id === id);
        return company ? company.nomeFantasia.toUpperCase() : null;
    };

    const getIcon = (notification: Notification) => {
        switch (notification.type) {
            case 'tax_deadline': return <Calendar className="w-6 h-6" />;
            case 'xml_inconsistency': return <AlertTriangle className="w-6 h-6" />;
            default: return <Info className="w-6 h-6" />;
        }
    };

    const getColorClass = (priority: Notification['priority']) => {
        switch (priority) {
            case 'high': return 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-100 border-red-200 dark:border-red-800';
            case 'medium': return 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-100 border-amber-200 dark:border-amber-800';
            case 'low': return 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800';
            default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
        }
    };

    const filteredNotifications = notifications.filter(n => !n.companyId || n.companyId === selectedCompanyId);
    const unreadCount = filteredNotifications.filter(n => !n.isRead).length;

    return (
        <div className="p-8 max-w-6xl mx-auto h-full flex flex-col animate-in fade-in duration-300">
            {/* Cabecalho */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                        <Bell className="w-8 h-8 text-green-600" />
                        Central de Notificações
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Gerencie todos os seus avisos, alertas fiscais e pendências do sistema em um só lugar.
                    </p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={markAllAsRead}
                        disabled={unreadCount === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <CheckCircle2 size={18} />
                        Marcar todas como lidas
                    </button>
                    <button
                        onClick={clearNotifications}
                        disabled={filteredNotifications.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Trash2 size={18} />
                        Limpar todas
                    </button>
                </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm custom-scrollbar p-6">
                {filteredNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Bell className="w-20 h-20 mb-6 opacity-20 text-green-600" />
                        <h2 className="text-2xl font-bold text-slate-600 dark:text-slate-300 mb-2">Nenhuma notificação por aqui!</h2>
                        <p className="text-slate-500">Tudo em dia com as suas obrigações e processos. Relaxe!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredNotifications.map(notification => (
                            <div
                                key={notification.id}
                                className={`flex items-start gap-5 p-5 border rounded-2xl transition-all ${!notification.isRead
                                    ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800 shadow-sm'
                                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 opacity-80'
                                    }`}
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${getColorClass(notification.priority)}`}>
                                    {getIcon(notification)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <h3 className={`text-lg font-bold tracking-tight ${!notification.isRead ? 'text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {notification.title}
                                            </h3>
                                            {!notification.isRead && (
                                                <span className="px-2.5 py-1 text-[10px] font-black tracking-widest uppercase bg-green-500 text-white rounded-lg">
                                                    Novo
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-semibold text-slate-400 flex items-center gap-1.5">
                                                <Calendar size={14} />
                                                {new Date(notification.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                            </span>
                                            {!notification.isRead && (
                                                <button
                                                    onClick={() => markAsRead(notification.id)}
                                                    className="w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-green-100 text-slate-600 hover:text-green-600 rounded-full transition-colors"
                                                    title="Marcar como lida"
                                                >
                                                    <CheckCircle2 size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteNotification(notification.id)}
                                                className="w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-red-100 text-slate-600 hover:text-red-600 rounded-full transition-colors"
                                                title="Excluir notificação"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {notification.companyId && getCompanyName(notification.companyId) && (
                                        <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm">
                                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                                            {getCompanyName(notification.companyId)}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-end">
                                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                                            {notification.message}
                                        </p>

                                        {notification.actionUrl && (
                                            <button
                                                onClick={() => { window.location.hash = notification.actionUrl!; }}
                                                className="text-xs font-bold uppercase tracking-widest text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 px-4 py-2 rounded-xl transition-colors border border-blue-100 ml-4 shrink-0"
                                            >
                                                Corrigir / Acessar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
