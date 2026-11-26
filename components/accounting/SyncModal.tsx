import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { RefreshCw, CheckCircle2, AlertCircle, Calendar, FileText, Users, Database, ArrowRight, Zap, Info } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { syncAccountingData } from '../../utils/accountingEngine';

interface SyncModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose }) => {
    const { 
        clients,
        partners,
        products,
        services,
        employees,
        bankAccounts,
        bankTransactions,
        invoices, 
        payrollRuns, 
        accountingEntries, 
        selectedCompany, 
        addAccountingEntry, 
        deleteItem,
        updateClient,
        updatePartner,
        updateProduct,
        updateService,
        updateEmployee,
        updateBankAccount
    } = useData();

    // Default dates for current month
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);
    
    const [isSyncing, setIsSyncing] = useState(false);
    const [progressMsg, setProgressMsg] = useState('');
    const [progressPercent, setProgressPercent] = useState(0);
    
    interface SyncResult {
        success: boolean;
        message: string;
        stats?: { generated: number; deleted: number; updated: number };
    }
    const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

    const handleSync = async () => {
        setIsSyncing(true);
        setSyncResult(null);
        setProgressMsg('Iniciando sincronização...');
        setProgressPercent(5);

        try {
            const allData = {
                clients, partners, products, services, employees, bankAccounts, bankTransactions, invoices, payrollRuns, accountingEntries
            };

            const result = await syncAccountingData(
                allData,
                selectedCompany,
                {
                    addEntry: addAccountingEntry,
                    deleteEntry: async (table, id) => {
                        await deleteItem('accountingEntries', id);
                    },
                    updateItem: async (table, item, idField) => {
                        if (table === 'clients') await updateClient(item);
                        if (table === 'partners') await updatePartner(item);
                        if (table === 'products') await updateProduct(item);
                        if (table === 'services') await updateService(item);
                        if (table === 'employees') await updateEmployee(item);
                        if (table === 'bankAccounts') await updateBankAccount(item);
                    }
                },
                startDate || undefined,
                endDate || undefined,
                (msg, percent) => {
                    setProgressMsg(msg);
                    setProgressPercent(percent);
                }
            );
            
            setSyncResult({ 
                success: true, 
                message: 'Sincronização contábil finalizada com excelência.',
                stats: { generated: result.count, deleted: result.deletedCount, updated: result.updatedCount }
            });
        } catch (error: any) {
            console.error('Erro na sincronização', error);
            let errorMessage = 'Ocorreu um erro inesperado ao sincronizar os lançamentos.';
            
            if (error.message?.includes('not a function') || error.message?.includes('deleteItem')) {
                errorMessage = 'Erro interno: A função de atualização de banco de dados encontrou uma instabilidade. Por favor, recarregue a página.';
            } else if (error.message) {
                errorMessage = `Falha na operação: ${error.message}`;
            }

            setSyncResult({ success: false, message: errorMessage });
        } finally {
            setIsSyncing(false);
            setProgressPercent(100);
        }
    };

    const handleClose = () => {
        if (isSyncing) return;
        setSyncResult(null);
        setProgressPercent(0);
        setProgressMsg('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Sincronização Contábil Automática" maxWidth="max-w-2xl">
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                {/* Header Section */}
                <div className="flex gap-4 p-5 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center shrink-0">
                        <Zap size={24} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Integração de Módulos</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            O motor contábil irá processar todas as movimentações financeiras, fiscais e trabalhistas do período selecionado. Lançamentos manuais feitos no livro diário não serão apagados.
                        </p>
                    </div>
                </div>

                {/* Date Selection */}
                <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                        <Calendar size={18} className="text-slate-400" /> Período de Apuração
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="absolute -top-2 left-3 bg-white dark:bg-[var(--bg-card)] px-1 text-xs font-bold text-slate-500">Data Inicial</label>
                            <input 
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                disabled={isSyncing || syncResult?.success}
                                className="w-full p-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        <div className="relative">
                            <label className="absolute -top-2 left-3 bg-white dark:bg-[var(--bg-card)] px-1 text-xs font-bold text-slate-500">Data Final</label>
                            <input 
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                disabled={isSyncing || syncResult?.success}
                                className="w-full p-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Modules Overview */}
                {!isSyncing && !syncResult && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center text-center gap-2">
                            <Database size={24} className="text-slate-400" />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Limpeza</span>
                            <span className="text-sm font-semibold">Exclui registros antigos (automáticos) do período</span>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center text-center gap-2">
                            <FileText size={24} className="text-emerald-500" />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Faturamento</span>
                            <span className="text-sm font-semibold">Gera partidas dobradas das Notas Fiscais Emitidas</span>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center text-center gap-2">
                            <Users size={24} className="text-blue-500" />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Folha PGTO</span>
                            <span className="text-sm font-semibold">Apropriação de Salários e Encargos (INSS, FGTS)</span>
                        </div>
                    </div>
                )}

                {/* Progress Bar Area */}
                {isSyncing && (
                    <div className="bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <h4 className="text-indigo-700 dark:text-indigo-400 font-bold mb-1">Processando Lançamentos...</h4>
                                <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                    <RefreshCw size={14} className="animate-spin" /> {progressMsg}
                                </span>
                            </div>
                            <span className="text-2xl font-black text-indigo-700 dark:text-indigo-400 tabular-nums">
                                {Math.round(progressPercent)}%
                            </span>
                        </div>
                        
                        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out relative"
                                style={{ width: `${progressPercent}%` }}
                            >
                                <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results Area */}
                {syncResult && (
                    <div className={`p-6 rounded-2xl border-2 flex flex-col gap-4 animate-in slide-in-from-bottom-4 ${syncResult.success ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-900/30' : 'bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-900/30'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${syncResult.success ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'}`}>
                                {syncResult.success ? <CheckCircle2 size={28} /> : <AlertCircle size={28} />}
                            </div>
                            <div>
                                <h4 className={`text-xl font-black ${syncResult.success ? 'text-emerald-800 dark:text-emerald-400' : 'text-red-800 dark:text-red-400'}`}>
                                    {syncResult.success ? 'Sincronização Concluída' : 'Erro no Processamento'}
                                </h4>
                                <p className="text-slate-600 dark:text-slate-400 font-medium mt-1">{syncResult.message}</p>
                            </div>
                        </div>

                        {syncResult.success && syncResult.stats && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Lançamentos Gerados</p>
                                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{syncResult.stats.generated}</p>
                                    </div>
                                    <Database className="text-emerald-200 dark:text-emerald-900/50" size={32} />
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Registros Removidos</p>
                                        <p className="text-2xl font-black text-slate-700 dark:text-slate-300">{syncResult.stats.deleted}</p>
                                    </div>
                                    <RefreshCw className="text-slate-200 dark:text-slate-800" size={32} />
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Cadastros Saneados</p>
                                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{syncResult.stats.updated}</p>
                                    </div>
                                    <CheckCircle2 className="text-indigo-200 dark:text-indigo-900/50" size={32} />
                                </div>
                            </div>
                        )}
                        
                        {!syncResult.success && (
                            <div className="bg-red-100/50 dark:bg-red-900/30 p-3 rounded-lg flex gap-2 items-start text-sm text-red-800 dark:text-red-300">
                                <Info size={16} className="shrink-0 mt-0.5" />
                                <p>Dica: Feche esta janela, atualize a página (F5) e tente novamente. Caso o erro persista, verifique se há problemas de conexão.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <button 
                        onClick={handleClose} 
                        disabled={isSyncing} 
                        className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold text-sm min-w-[120px] text-slate-600 dark:text-slate-300"
                    >
                        {syncResult?.success ? 'Fechar Janela' : 'Cancelar'}
                    </button>
                    {!syncResult?.success && (
                        <button 
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm min-w-[200px] flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {isSyncing ? (
                                <>
                                    <RefreshCw size={18} className="animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                <>
                                    Iniciar Sincronização <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};
