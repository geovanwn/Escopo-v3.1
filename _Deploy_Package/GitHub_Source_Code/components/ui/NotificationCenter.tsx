import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, AlertTriangle, AlertCircle, Info, Calendar } from 'lucide-react';
import { FiscalAlert, Notification } from '../../types';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useData } from '../../contexts/DataContext';


export const NotificationCenter: React.FC = () => {
    const { notifications, markAsRead, markAllAsRead, deleteNotification, clearNotifications } = useNotificationStore();
    const { companies } = useData();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const getCompanyName = (id?: string) => {
        if (!id) return null;
        const company = companies.find(c => c.id === id);
        return company ? company.nomeFantasia.toUpperCase() : null;
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOpen = () => setIsOpen(!isOpen);

    const getIcon = (notification: Notification) => {
        switch (notification.type) {
            case 'tax_deadline': return <Calendar size={16} />;
            case 'xml_inconsistency': return <AlertTriangle size={16} />;
            default: return <Info size={16} />;
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


    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={toggleOpen}
                className="relative p-2.5 text-slate-500 hover:text-green-600 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-green-500/10 group"
            >
                <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[var(--bg-card)]"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 bg-[var(--bg-card)] rounded-[2rem] shadow-2xl border border-[var(--border-color)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-300 origin-top-right">
                    <div className="px-6 py-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-secondary)]">
                        <h3 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-[0.2em]">Notificações</h3>
                        <div className="flex gap-3">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-[10px] font-black text-green-600 hover:text-green-700 uppercase tracking-widest flex items-center transition-all bg-green-50 dark:bg-green-500/10 px-2 py-1 rounded-lg border border-green-100 dark:border-green-500/20"
                                >
                                    Ler Tudo
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={clearNotifications}
                                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Limpar tudo"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">Nenhuma notificação.</p>
                                <p className="text-xs mt-1">Você está em dia com suas obrigações!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        onClick={() => markAsRead(notification.id)}
                                        className={`p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all border-l-2 ${!notification.isRead ? 'bg-green-50/30 dark:bg-green-500/5 border-green-500' : 'border-transparent opacity-60'}`}
                                    >
                                        <div className="flex gap-4">
                                            <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 shadow-sm ${getColorClass(notification.priority)}`}>
                                                {getIcon(notification)}
                                            </div>
                                            <div className="flex-1">
                                                {notification.companyId && getCompanyName(notification.companyId) && (
                                                    <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                                        {getCompanyName(notification.companyId)}
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className={`text-sm font-black tracking-tight ${!notification.isRead ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500'}`}>
                                                        {notification.title}
                                                    </h4>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                                                        className="text-slate-400 hover:text-red-500"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-2">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                    <Calendar size={10} />
                                                    {new Date(notification.date).toLocaleDateString()} • {new Date(notification.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
};