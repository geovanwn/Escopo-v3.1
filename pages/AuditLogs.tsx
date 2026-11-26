import React, { useEffect } from 'react';
import { useAuditStore } from '../stores/useAuditStore';
import {
    History,
    Search,
    User,
    Activity,
    Database,
    LogIn,
    LogOut,
    Plus,
    Edit,
    Trash2,
    Monitor,
    Globe,
    Download
} from 'lucide-react';
import { formatDateBR, parseDateSafe } from '../utils/formatters';

export const AuditLogs: React.FC = () => {
    const [searchTerm, setSearchTerm] = React.useState('');
    const { logs, isLoaded, subscribe } = useAuditStore();

    useEffect(() => {
        const unsub = subscribe();
        return () => unsub();
    }, [subscribe]);

    const filteredLogs = (logs || []).filter(log =>
        (log.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.entity || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'login': return <LogIn className="text-blue-500" size={16} />;
            case 'logout': return <LogOut className="text-slate-500" size={16} />;
            case 'create': return <Plus className="text-green-500" size={16} />;
            case 'update': return <Edit className="text-amber-500" size={16} />;
            case 'delete': return <Trash2 className="text-red-500" size={16} />;
            default: return <Activity className="text-slate-400" size={16} />;
        }
    };

    const getEntityColor = (entity: string) => {
        if (!entity) return 'bg-slate-100 text-slate-600';
        const colors: Record<string, string> = {
            'companies': 'bg-indigo-100 text-indigo-700 border-indigo-200',
            'invoices': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'employees': 'bg-violet-100 text-violet-700 border-violet-200',
            'payroll': 'bg-pink-100 text-pink-700 border-pink-200',
            'financial': 'bg-amber-100 text-amber-700 border-amber-200',
            'session': 'bg-slate-100 text-slate-700 border-slate-200'
        };
        return colors[entity] || 'bg-slate-100 text-slate-600 border-slate-200';
    };

    const handleExportCSV = () => {
        if (!filteredLogs || filteredLogs.length === 0) return;
        const headers = ['Data/Hora', 'ID Usuario', 'Nome Usuario', 'Email Usuario', 'Acao', 'Entidade', 'ID Entidade', 'Detalhes', 'User Agent'];
        const rows = filteredLogs.map(log => [
            `"${log.timestamp || ''}"`,
            `"${log.userId || ''}"`,
            `"${(log.userName || '').replace(/"/g, '""')}"`,
            `"${(log.userEmail || '').replace(/"/g, '""')}"`,
            `"${log.action || ''}"`,
            `"${log.entity || ''}"`,
            `"${log.entityId || ''}"`,
            `"${(log.details || '').replace(/"/g, '""')}"`,
            `"${(log.userAgent || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `trilha_auditoria_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
                        <History size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Trilha de Auditoria</h1>
                        <p className="text-[var(--text-secondary)] text-sm font-medium">Histórico detalhado de ações no sistema</p>
                    </div>
                </div>
                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
                >
                    <Download size={16} />
                    Exportar CSV
                </button>
            </header>

            <div className="bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-color)] shadow-xl overflow-hidden">
                <div className="p-6 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/30 flex justify-between items-center">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Pesquisar por usuário ou ação..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 outline-none transition-all shadow-sm"
                        />
                    </div>
                    <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 px-4">
                        Mostrando os últimos 100 registros
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--bg-secondary)]/50">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Data e Hora</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Usuário</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Ação</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Entidade</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Detalhes</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Dispositivo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-700 dark:text-slate-200">{formatDateBR(log.timestamp)}</span>
                                            <span className="text-[10px] font-bold text-slate-400">{log.timestamp && parseDateSafe(log.timestamp).toLocaleTimeString('pt-BR')}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                                <User size={14} className="text-slate-500" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-700 dark:text-slate-200">{log.userName}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ID: {log.userId?.substring(0, 6)}...</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {getActionIcon(log.action)}
                                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">{log.action}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${getEntityColor(log.entity)}`}>
                                            {log.entity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-start gap-2 max-w-md">
                                            <Activity size={14} className="text-slate-300 mt-1 flex-shrink-0" />
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal font-medium">{log.details}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700" title={log.userAgent}>
                                                <Monitor size={12} className="text-slate-400" />
                                                <span className="text-[10px] font-bold text-slate-500">Desktop</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                <Globe size={12} className="text-slate-400" />
                                                <span className="text-[10px] font-bold text-slate-500">BR</span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {isLoaded && logs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                            <History size={32} />
                                        </div>
                                        <p className="text-slate-400 text-sm font-medium">Nenhum log encontrado.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
