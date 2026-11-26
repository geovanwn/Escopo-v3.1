import React, { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { 
    ArrowLeft, FileText, Calendar, Plus, Edit2, Trash2, 
    Search, Filter, Check, Info, X, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMergedChartOfAccounts } from '../../utils/accountingEngine';
import { AccountingEntry } from '../../types';

export const LivroDiario: React.FC = () => {
    const { 
        accountingEntries, 
        selectedCompany, 
        clients, 
        employees, 
        bankAccounts, 
        partners,
        addAccountingEntry,
        updateAccountingEntry,
        deleteItem
    } = useData();
    const navigate = useNavigate();
    
    // Period Filters
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAccountFilter, setSelectedAccountFilter] = useState('all');

    // Modal state
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<AccountingEntry | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        history: '',
        debitAccount: '',
        creditAccount: '',
        value: 0,
        documentRef: ''
    });

    const chartOfAccounts = useMemo(() => {
        return getMergedChartOfAccounts(
            selectedCompany?.id || '',
            accountingEntries,
            clients,
            employees,
            bankAccounts,
            partners
        );
    }, [selectedCompany, accountingEntries, clients, employees, bankAccounts, partners]);

    const analyticAccounts = useMemo(() => {
        return chartOfAccounts.filter(a => a.isAnalytic);
    }, [chartOfAccounts]);

    const getAccountName = (code: string) => {
        const acc = chartOfAccounts.find(a => a.code === code);
        return acc ? acc.name : 'Conta não encontrada';
    };

    const filteredEntries = useMemo(() => {
        if (!selectedCompany) return [];
        return accountingEntries
            .filter(e => {
                const matchesCompany = e.companyId === selectedCompany.id;
                const matchesDate = e.date >= startDate && e.date <= endDate;
                const matchesSearch = searchQuery === '' || 
                    (e.history || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                    e.id.includes(searchQuery) ||
                    (e.documentRef && e.documentRef.includes(searchQuery));
                const matchesAccount = selectedAccountFilter === 'all' || 
                    e.debitAccount === selectedAccountFilter || 
                    e.creditAccount === selectedAccountFilter;
                
                return matchesCompany && matchesDate && matchesSearch && matchesAccount;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [accountingEntries, startDate, endDate, searchQuery, selectedAccountFilter, selectedCompany]);

    const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    // Open entry modal for create or edit
    const openEntryModal = (entry: AccountingEntry | null = null) => {
        if (entry) {
            setEditingEntry(entry);
            setFormData({
                date: entry.date,
                history: entry.history || '',
                debitAccount: entry.debitAccount,
                creditAccount: entry.creditAccount,
                value: entry.value,
                documentRef: entry.documentRef || ''
            });
        } else {
            setEditingEntry(null);
            setFormData({
                date: new Date().toISOString().split('T')[0],
                history: '',
                debitAccount: '',
                creditAccount: '',
                value: 0,
                documentRef: ''
            });
        }
        setIsEntryModalOpen(true);
    };

    // Save Entry Form
    const handleSaveEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCompany) return;

        if (!formData.debitAccount || !formData.creditAccount) {
            alert('Por favor, selecione as contas de Débito e Crédito.');
            return;
        }

        if (formData.debitAccount === formData.creditAccount) {
            alert('A conta de Débito não pode ser idêntica à conta de Crédito.');
            return;
        }

        if (formData.value <= 0) {
            alert('O valor do lançamento deve ser maior que zero.');
            return;
        }

        try {
            const entryData = {
                id: editingEntry ? editingEntry.id : crypto.randomUUID(),
                date: formData.date,
                history: formData.history,
                debitAccount: formData.debitAccount,
                creditAccount: formData.creditAccount,
                value: Number(formData.value),
                documentRef: formData.documentRef || undefined,
                originModule: editingEntry ? editingEntry.originModule : 'manual',
                companyId: selectedCompany.id,
                status: 'posted'
            } as AccountingEntry;

            if (editingEntry) {
                await updateAccountingEntry(entryData);
                alert('Lançamento atualizado com sucesso!');
            } else {
                await addAccountingEntry(entryData);
                alert('Lançamento contábil inserido com sucesso!');
            }
            setIsEntryModalOpen(false);
        } catch (err: any) {
            alert(err.message || 'Erro ao salvar o lançamento contábil.');
        }
    };

    // Delete Entry
    const handleDeleteEntry = async (id: string, origin?: string) => {
        const isAuto = origin && origin !== 'manual';
        const msg = isAuto 
            ? 'Atenção: Este lançamento foi gerado automaticamente pela integração de módulos. Se você excluí-lo, ele poderá ser recriado na próxima sincronização contábil. Deseja prosseguir com a exclusão?'
            : 'Tem certeza de que deseja excluir permanentemente este lançamento manual?';

        if (window.confirm(msg)) {
            try {
                await deleteItem('accountingEntries', id);
                alert('Lançamento contábil excluído com sucesso!');
            } catch (err: any) {
                alert(err.message || 'Erro ao excluir lançamento contábil.');
            }
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/app/accounting')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0">
                        <ArrowLeft size={24} className="text-slate-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Livro Diário</h1>
                        <p className="text-sm text-slate-500">Registro cronológico de lançamentos contábeis e partidas dobradas</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={() => openEntryModal(null)}
                        className="bg-gradient-to-r from-[#0ea5e9] to-[#10b981] text-white hover:opacity-95 font-black flex items-center gap-2 rounded-full px-6 py-3 shadow-md shadow-cyan-500/10 text-xs uppercase hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <Plus size={16} /> Novo Lançamento Manual
                    </button>
                </div>
            </div>

            {/* Filter Cockpit Card */}
            <Card className="p-6 rounded-[2rem] border border-slate-200/50 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Period Pickers */}
                    <div className="relative">
                        <label className="absolute -top-2 left-3 bg-white dark:bg-[var(--bg-card)] px-1 text-[10px] font-black uppercase text-slate-400">Data Inicial</label>
                        <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-full px-3 py-2 bg-transparent">
                            <Calendar size={16} className="text-slate-400 mr-2" />
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-xs font-semibold outline-none text-slate-700 dark:text-slate-300 w-full" />
                        </div>
                    </div>

                    <div className="relative">
                        <label className="absolute -top-2 left-3 bg-white dark:bg-[var(--bg-card)] px-1 text-[10px] font-black uppercase text-slate-400">Data Final</label>
                        <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-full px-3 py-2 bg-transparent">
                            <Calendar size={16} className="text-slate-400 mr-2" />
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-xs font-semibold outline-none text-slate-700 dark:text-slate-300 w-full" />
                        </div>
                    </div>

                    {/* Filter account */}
                    <div className="relative col-span-1">
                        <label className="absolute -top-2 left-3 bg-white dark:bg-[var(--bg-card)] px-1 text-[10px] font-black uppercase text-slate-400">Filtrar por Conta</label>
                        <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-full px-3 py-2 bg-transparent">
                            <Filter size={16} className="text-slate-400 mr-2" />
                            <select 
                                value={selectedAccountFilter} 
                                onChange={e => setSelectedAccountFilter(e.target.value)}
                                className="bg-transparent text-xs font-semibold outline-none text-slate-700 dark:text-slate-300 w-full"
                            >
                                <option value="all">Todas as Contas</option>
                                {analyticAccounts.map(a => (
                                    <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <label className="absolute -top-2 left-3 bg-white dark:bg-[var(--bg-card)] px-1 text-[10px] font-black uppercase text-slate-400">Pesquisar Histórico</label>
                        <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-full px-3 py-2 bg-transparent">
                            <Search size={16} className="text-slate-400 mr-2" />
                            <input 
                                type="text" 
                                placeholder="Descreva termos..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="bg-transparent text-xs font-semibold outline-none text-slate-700 dark:text-slate-300 w-full"
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* entries list */}
            <Card className="p-0 overflow-hidden border-none shadow-xl shadow-slate-200/40 dark:shadow-none bg-white dark:bg-slate-900 rounded-[2rem]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                                <th className="p-4 font-semibold text-xs w-28">Data</th>
                                <th className="p-4 font-semibold text-xs w-36">Origem / Doc</th>
                                <th className="p-4 font-semibold text-xs">Histórico</th>
                                <th className="p-4 font-semibold text-xs w-64">Débito</th>
                                <th className="p-4 font-semibold text-xs w-64">Crédito</th>
                                <th className="p-4 font-semibold text-xs text-right w-36">Valor</th>
                                <th className="p-4 font-semibold text-xs text-center w-24">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {filteredEntries.map((entry) => (
                                <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4 text-xs text-slate-500 font-mono">
                                        {new Date(entry.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                    </td>
                                    <td className="p-4 text-xs font-mono text-slate-400">
                                        <div className="flex flex-col">
                                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase w-max mb-1 ${
                                                entry.originModule === 'fiscal' ? 'bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600' :
                                                entry.originModule === 'payroll' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600' :
                                                entry.originModule === 'financial' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600' :
                                                'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600'
                                            }`}>
                                                {entry.originModule}
                                            </span>
                                            {entry.documentRef ? (
                                                <span className="truncate max-w-[120px]" title={entry.documentRef}>Ref: {entry.documentRef.substring(0, 10)}</span>
                                            ) : (
                                                <span>Ajuste Manual</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-700 dark:text-slate-300 font-medium">
                                        {entry.history}
                                    </td>
                                    <td className="p-4 text-xs font-mono">
                                        <div className="text-cyan-600 dark:text-cyan-400 font-semibold">{entry.debitAccount}</div>
                                        <div className="text-[10px] text-slate-400 truncate max-w-[200px]" title={getAccountName(entry.debitAccount)}>
                                            {getAccountName(entry.debitAccount)}
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs font-mono">
                                        <div className="text-orange-600 dark:text-orange-400 font-semibold">{entry.creditAccount}</div>
                                        <div className="text-[10px] text-slate-400 truncate max-w-[200px]" title={getAccountName(entry.creditAccount)}>
                                            {getAccountName(entry.creditAccount)}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right text-sm font-mono font-bold text-slate-900 dark:text-white">
                                        {currency(entry.value)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button 
                                                onClick={() => openEntryModal(entry)}
                                                className="p-1 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 rounded transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteEntry(entry.id, entry.originModule)}
                                                className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredEntries.length === 0 && (
                    <div className="p-16 text-center text-slate-400 text-sm">
                        Nenhum lançamento contábil encontrado para o período ou critérios informados.
                    </div>
                )}
            </Card>

            {/* FORM MODAL FOR CREATE/EDIT ENTRY */}
            {isEntryModalOpen && (
                <Modal 
                    isOpen={isEntryModalOpen} 
                    onClose={() => setIsEntryModalOpen(false)} 
                    title={editingEntry ? 'Editar Lançamento Contábil' : 'Novo Lançamento Contábil Manual'}
                    maxWidth="max-w-xl"
                >
                    <form onSubmit={handleSaveEntry} className="space-y-6 animate-in fade-in duration-300">
                        {editingEntry && editingEntry.originModule !== 'manual' && (
                            <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex gap-3">
                                <AlertCircle size={20} className="shrink-0" />
                                <div className="text-xs">
                                    <span className="font-bold">Aviso:</span> Este lançamento provém de integração automática. Alterações manuais podem ser sobrescritas caso o período correspondente seja sincronizado novamente.
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <label className="absolute -top-2 left-3 bg-white dark:bg-[var(--bg-card)] px-1 text-[10px] font-black uppercase text-slate-400">Data do Lançamento</label>
                                <input 
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full p-3 rounded-full border border-slate-200 dark:border-slate-700 bg-transparent text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-cyan-500"
                                />
                            </div>

                            <div className="relative">
                                <label className="absolute -top-2 left-3 bg-white dark:bg-[var(--bg-card)] px-1 text-[10px] font-black uppercase text-slate-400">Valor (R$)</label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    required
                                    min="0.01"
                                    value={formData.value || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                                    placeholder="0,00"
                                    className="w-full p-3 rounded-full border border-slate-200 dark:border-slate-700 bg-transparent text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-cyan-500"
                                />
                            </div>
                        </div>

                        {/* Debit Account */}
                        <div className="relative">
                            <label className="absolute -top-2 left-3 bg-white dark:bg-[var(--bg-card)] px-1 text-[10px] font-black uppercase text-slate-400">Conta a Débito (Aplicação)</label>
                            <select
                                required
                                value={formData.debitAccount}
                                onChange={e => setFormData(prev => ({ ...prev, debitAccount: e.target.value }))}
                                className="w-full p-3 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-cyan-500"
                            >
                                <option value="">-- Selecione a conta de Débito --</option>
                                {analyticAccounts.map(a => (
                                    <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Credit Account */}
                        <div className="relative">
                            <label className="absolute -top-2 left-3 bg-white dark:bg-[var(--bg-card)] px-1 text-[10px] font-black uppercase text-slate-400">Conta a Crédito (Origem)</label>
                            <select
                                required
                                value={formData.creditAccount}
                                onChange={e => setFormData(prev => ({ ...prev, creditAccount: e.target.value }))}
                                className="w-full p-3 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-cyan-500"
                            >
                                <option value="">-- Selecione a conta de Crédito --</option>
                                {analyticAccounts.map(a => (
                                    <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* History Description */}
                        <div className="relative">
                            <label className="absolute -top-2 left-3 bg-white dark:bg-[var(--bg-card)] px-1 text-[10px] font-black uppercase text-slate-400">Histórico do Lançamento</label>
                            <textarea
                                required
                                value={formData.history}
                                onChange={e => setFormData(prev => ({ ...prev, history: e.target.value }))}
                                placeholder="Ex: Apropriação de despesas bancárias ref. a tarifas mensais..."
                                rows={3}
                                className="w-full p-4 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 bg-transparent text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-cyan-500 resize-none"
                            />
                        </div>

                        {/* Doc Ref */}
                        <div className="relative">
                            <label className="absolute -top-2 left-3 bg-white dark:bg-[var(--bg-card)] px-1 text-[10px] font-black uppercase text-slate-400">Documento de Referência (Opcional)</label>
                            <input 
                                type="text"
                                value={formData.documentRef}
                                onChange={e => setFormData(prev => ({ ...prev, documentRef: e.target.value }))}
                                placeholder="Código identificador do documento"
                                className="w-full p-3 rounded-full border border-slate-200 dark:border-slate-700 bg-transparent text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-cyan-500"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button 
                                type="button" 
                                onClick={() => setIsEntryModalOpen(false)}
                                className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-full px-6 py-2.5 text-xs uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                className="bg-gradient-to-r from-[#0ea5e9] to-[#10b981] text-white font-bold rounded-full px-6 py-2.5 shadow-md shadow-cyan-500/10 text-xs uppercase hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                Salvar Lançamento
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};
