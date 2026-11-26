
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Card } from '../components/ui/Card';
import {
    ShieldCheck,
    FileText,
    Download,
    Eye,
    Clock,
    Search,
    Banknote,
    Bell,
    UserCircle,
    CreditCard,
    ArrowUpRight,
    AlertCircle,
    ExternalLink,
    Send
} from 'lucide-react';
import { formatDateBR, parseDateSafe } from '../utils/formatters';
import { generateInvoicePDF } from '../utils/invoicePdfGenerator';

export const Portal: React.FC = () => {
    const { invoices, selectedCompany, theme } = useData();
    const [activeMode, setActiveMode] = useState<'client' | 'supplier'>('client');
    const [searchTerm, setSearchTerm] = useState('');

    // --- DATA PROCESSING: RELEVANT DOCUMENTS ---
    const portalInvoices = useMemo(() => {
        return invoices.filter(inv => {
            if (activeMode === 'client') {
                return inv.type === 'service' || inv.type === 'exit';
            } else {
                return inv.type === 'entry';
            }
        }).sort((a, b) => parseDateSafe(b.date).getTime() - parseDateSafe(a.date).getTime());
    }, [invoices, activeMode]);

    const stats = useMemo(() => {
        const pending = portalInvoices.filter(i => i.status === 'pendente');
        const totalPending = pending.reduce((sum, i) => sum + i.value, 0);
        const nextDue = pending.length > 0 ? pending[0].date : '-';

        return {
            count: portalInvoices.length,
            pendingCount: pending.length,
            totalPending,
            nextDue
        };
    }, [portalInvoices]);

    const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-3xl">
                        <ShieldCheck size={40} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Portal do Parceiro</h1>
                        <p className="text-slate-500 font-medium mt-1">
                            Área restrita para consulta de documentos e pagamentos
                        </p>
                    </div>
                </div>
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                    <button
                        onClick={() => setActiveMode('client')}
                        className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeMode === 'client' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-lg' : 'text-slate-500'}`}
                    >
                        Área do Cliente
                    </button>
                    <button
                        onClick={() => setActiveMode('supplier')}
                        className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeMode === 'supplier' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-lg' : 'text-slate-500'}`}
                    >
                        Área do Fornecedor
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6 border-none bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-2">Total de {activeMode === 'client' ? 'Notas' : 'Pagamentos'}</p>
                    <h3 className="text-3xl font-black">{stats.count}</h3>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-indigo-100">
                        <Clock size={12} /> Sincronizado agora
                    </div>
                </Card>

                <Card className="p-6 border-none bg-white dark:bg-slate-900 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Pendente de {activeMode === 'client' ? 'Recebíveis' : 'Pagamento'}</p>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{currency(stats.totalPending)}</h3>
                    <p className="text-[10px] font-bold text-orange-500 mt-4 flex items-center gap-1">
                        <AlertCircle size={12} /> {stats.pendingCount} faturas aguardando
                    </p>
                </Card>

                <Card className="p-6 border-none bg-white dark:bg-slate-900 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Vencimento Mais Próximo</p>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                        {stats.nextDue !== '-' ? formatDateBR(stats.nextDue) : '-'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-tighter">Baseado em NF-e/NFS-e</p>
                </Card>

                <Card className="p-6 border-none bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Suporte Direto</p>
                    <button className="mt-4 w-full py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                        <Send size={14} /> Abrir Chamado
                    </button>
                </Card>
            </div>

            {/* Main Listing Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 p-0 overflow-hidden border-none shadow-sm rounded-[2.5rem]">
                    <div className="p-8 pb-4 flex justify-between items-center">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Documentos Disponíveis</h3>
                        <div className="relative w-64 group">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar por número/parceiro..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="p-8">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50/50 dark:bg-slate-950 text-slate-400 text-[10px] uppercase font-black">
                                <tr>
                                    <th className="p-4 text-left rounded-l-2xl">Documento</th>
                                    <th className="p-4 text-left">Parceiro</th>
                                    <th className="p-4 text-center">Data</th>
                                    <th className="p-4 text-right">Valor</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-right rounded-r-2xl">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {portalInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center font-black text-xs">
                                                    <FileText size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-extrabold text-slate-800 dark:text-slate-200">NF {inv.number}</p>
                                                    <p className="text-[9px] uppercase font-black text-slate-400 leading-tight">Série {inv.serie || '1'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold text-slate-600 dark:text-slate-400">{inv.entityName}</td>
                                        <td className="p-4 text-center font-medium text-slate-500">{formatDateBR(inv.date)}</td>
                                        <td className="p-4 text-right font-black text-slate-900 dark:text-white">{currency(inv.value)}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest ${inv.status === 'paga' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button title="Visualizar XML/PDF" className="p-2 aspect-square bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 rounded-xl transition-all"><Eye size={16} /></button>
                                                <button
                                                    title="Download PDF"
                                                    onClick={() => generateInvoicePDF(inv, selectedCompany)}
                                                    className="p-2 aspect-square bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 rounded-xl transition-all"
                                                >
                                                    <Download size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {portalInvoices.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                <UserCircle size={64} className="mb-4 text-slate-300" />
                                <p className="font-black uppercase tracking-widest text-sm">Nenhum documento encontrado</p>
                            </div>
                        )}
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card className="p-8 border-none bg-white dark:bg-slate-900 shadow-sm rounded-[2.5rem]">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 leading-tight">Links Externos</h3>
                        <div className="space-y-4">
                            {[
                                { label: 'Nota Fiscal Paulistana', icon: ExternalLink, link: 'https://nfe.prefeitura.sp.gov.br/' },
                                { label: 'Portal e-CAC (Receita Federal)', icon: ExternalLink, link: 'https://cav.receita.fazenda.gov.br/' },
                                { label: 'Certificados Digitais (A1/A3)', icon: ShieldCheck, link: '#' },
                                { label: 'Solicitar Recusa de Nota', icon: AlertCircle, link: '#' },
                            ].map((item, i) => (
                                <button key={i} className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900 group">
                                    <div className="flex items-center gap-3">
                                        <item.icon size={18} className="text-slate-400 group-hover:text-indigo-600" />
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-indigo-600">{item.label}</span>
                                    </div>
                                    <ArrowUpRight size={14} className="text-slate-300 group-hover:text-indigo-600" />
                                </button>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-8 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-[2.5rem] border-none shadow-xl overflow-hidden relative">
                        <div className="relative z-10">
                            <Bell size={24} className="text-indigo-200 mb-6" />
                            <h4 className="text-xl font-black mb-2">Comunicações</h4>
                            <p className="text-sm font-medium text-indigo-100/80 mb-6 leading-relaxed">
                                Você não possui novos comunicados da contabilidade no momento.
                            </p>
                            <button className="w-full py-3 bg-white text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all">
                                Acessar Mural
                            </button>
                        </div>
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Portal;
