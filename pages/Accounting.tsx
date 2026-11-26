import React, { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
    FileText, BookOpen, BarChart3, PieChart, Activity, RefreshCw, 
    Link2, AlertTriangle, CheckCircle, Database, Search, ArrowRight, 
    User, Calendar, Landmark, Settings, ArrowLeftRight, HelpCircle, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { SyncModal } from '../components/accounting/SyncModal';
import { 
    getChartOfAccounts, 
    calculateBalanceSheet, 
    calculateDRE, 
    generateJournalEntries, 
    generatePayrollEntries, 
    generateBankEntries 
} from '../utils/accountingEngine';

export const Accounting: React.FC = () => {
    const navigate = useNavigate();
    const { 
        selectedCompany, 
        accountingEntries, 
        invoices, 
        payrollRuns, 
        bankTransactions,
        clients,
        partners,
        employees,
        bankAccounts,
        services,
        products,
        addAccountingEntry,
        updateClient,
        updatePartner,
        updateEmployee,
        updateBankAccount,
        updateService,
        updateProduct,
        checkPeriodClosed
    } = useData();

    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'kpi' | 'mapping' | 'audit'>('kpi');

    // MAPPING SUBTAB STATES
    const [mappingSubtab, setMappingSubtab] = useState<'clients' | 'partners' | 'employees' | 'banks' | 'categories'>('clients');
    const [mappingSearch, setMappingSearch] = useState('');
    const [selectedMappingAccount, setSelectedMappingAccount] = useState<Record<string, string>>({});

    // AUDIT PENDING SYNC LIST
    const [isPostingAll, setIsPostingAll] = useState(false);
    const [auditFeedback, setAuditFeedback] = useState('');

    const chartOfAccounts = useMemo(() => {
        return getChartOfAccounts(selectedCompany?.id || '');
    }, [selectedCompany]);

    const analyticAccounts = useMemo(() => {
        return chartOfAccounts.filter(a => a.isAnalytic);
    }, [chartOfAccounts]);

    // Format currency helper
    const currency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    // Calculate core metrics for selected company
    const metrics = useMemo(() => {
        if (!selectedCompany) return { asset: 0, liabilities: 0, pl: 0, difference: 0, isBalanced: true, revenue: 0, profit: 0 };
        const balance = calculateBalanceSheet(accountingEntries, new Date().toISOString().split('T')[0], selectedCompany.id);
        
        const currentYear = new Date().getFullYear();
        const startOfYear = `${currentYear}-01-01`;
        const endOfYear = `${currentYear}-12-31`;
        const dre = calculateDRE(accountingEntries, startOfYear, endOfYear, selectedCompany);

        return {
            asset: balance.ativo.total,
            liabilities: balance.passivo.total,
            pl: balance.patrimonioLiquido.total - balance.patrimonioLiquido.resultadoExercicio,
            difference: balance.difference,
            isBalanced: balance.isBalanced,
            revenue: dre.receitaLiquida,
            profit: dre.lucroLiquido
        };
    }, [accountingEntries, selectedCompany]);

    // AUDIT ENGINE: Find documents that DO NOT have matching journal entries (documentRef)
    const unpostedItems = useMemo(() => {
        if (!selectedCompany) return [];
        const list: Array<{
            id: string;
            date: string;
            description: string;
            amount: number;
            type: 'faturamento' | 'compras' | 'folha' | 'banco';
            rawObj: any;
        }> = [];

        const postedDocRefs = new Set(
            accountingEntries
                .filter(e => e.companyId === selectedCompany.id && e.documentRef)
                .map(e => e.documentRef)
        );

        // 1. Invoices (Sales or Purchases)
        invoices.forEach(inv => {
            if (inv.companyId === selectedCompany.id && inv.status !== 'cancelada' && !postedDocRefs.has(inv.id)) {
                list.push({
                    id: inv.id,
                    date: inv.date,
                    description: `${inv.type === 'entry' ? 'Compra' : 'Venda'} - Doc ${inv.number} - ${inv.entityName || 'Cliente/Fornecedor'}`,
                    amount: inv.value,
                    type: inv.type === 'entry' ? 'compras' : 'faturamento',
                    rawObj: inv
                });
            }
        });

        // 2. Payroll Runs
        payrollRuns.forEach(pr => {
            if (pr.companyId === selectedCompany.id && pr.status !== 'rascunho' && !postedDocRefs.has(pr.id)) {
                const prDate = pr.closedAt || pr.createdAt || pr.competence + '-28';
                list.push({
                    id: pr.id,
                    date: prDate,
                    description: `Folha de Pagamento - Competência ${pr.competence}`,
                    amount: pr.totalGross || 0,
                    type: 'folha',
                    rawObj: pr
                });
            }
        });

        // 3. Bank Transactions (not reconciled with invoices)
        bankTransactions.forEach(tx => {
            if (tx.companyId === selectedCompany.id && !tx.reconciledWith && !postedDocRefs.has(tx.id)) {
                list.push({
                    id: tx.id,
                    date: tx.date,
                    description: `Movimentação Extrato: ${tx.description}`,
                    amount: tx.amount,
                    type: 'banco',
                    rawObj: tx
                });
            }
        });

        return list.sort((a, b) => b.date.localeCompare(a.date));
    }, [invoices, payrollRuns, bankTransactions, accountingEntries, selectedCompany]);

    // MAPPING DATA
    const currentMappingList = useMemo(() => {
        const query = mappingSearch.toLowerCase();
        let items: Array<{ id: string; name: string; document: string; account?: string; type: string }> = [];

        if (mappingSubtab === 'clients') {
            items = clients.map(c => ({ id: c.id, name: (c as any).nomeFantasia || (c as any).razaoSocial || (c as any).fantasyName || (c as any).name || 'Cliente Sem Nome', document: c.cnpj || 'Sem CNPJ', account: c.accountingAccount, type: 'cliente' }));
        } else if (mappingSubtab === 'partners') {
            items = partners.map(p => ({ id: p.id, name: (p as any).nomeFantasia || (p as any).razaoSocial || (p as any).fantasyName || (p as any).name || 'Fornecedor Sem Nome', document: p.cnpj || 'Sem CNPJ', account: (p as any).accountingAccount, type: 'fornecedor' }));
        } else if (mappingSubtab === 'employees') {
            items = employees.map(e => ({ id: e.id, name: e.name || 'Funcionário Sem Nome', document: e.cpf || 'Sem CPF', account: (e as any).accountingAccount, type: 'funcionario' }));
        } else if (mappingSubtab === 'banks') {
            items = bankAccounts.map(b => ({ id: b.id, name: `${b.bankName || 'Banco'} - Ag. ${b.agency || ''} CC ${b.accountNumber || ''}`, document: b.id.substring(0, 6).toUpperCase(), account: (b as any).accountingAccount, type: 'banco' }));
        } else if (mappingSubtab === 'categories') {
            // Get unique categories in transactions
            const cats = Array.from(new Set(bankTransactions.map((t: any) => t.category).filter(Boolean)));
            const mappingsStr = localStorage.getItem(`escopov3_category_mappings_${selectedCompany?.id}`);
            let mappings: Record<string, string> = {};
            if (mappingsStr) {
                try { mappings = JSON.parse(mappingsStr); } catch {}
            }
            items = cats.map(cat => ({
                id: cat,
                name: cat,
                document: 'Categoria Financeira',
                account: mappings[cat] || '',
                type: 'categoria'
            }));
        }

        return items.filter(i => {
            const nameMatch = (i.name || '').toLowerCase().includes(query);
            const docMatch = (i.document || '').toLowerCase().includes(query);
            const accMatch = i.account ? i.account.toLowerCase().includes(query) : false;
            return nameMatch || docMatch || accMatch;
        });
    }, [clients, partners, employees, bankAccounts, bankTransactions, mappingSubtab, mappingSearch, selectedCompany]);

    // Handle mapping account change
    const handleUpdateMapping = async (id: string, accountCode: string) => {
        if (!selectedCompany) return;
        try {
            if (mappingSubtab === 'clients') {
                const target = clients.find(c => c.id === id);
                if (target) await updateClient({ ...target, accountingAccount: accountCode });
            } else if (mappingSubtab === 'partners') {
                const target = partners.find(p => p.id === id);
                if (target) await updatePartner({ ...target, accountingAccount: accountCode });
            } else if (mappingSubtab === 'employees') {
                const target = employees.find(e => e.id === id);
                if (target) await updateEmployee({ ...target, accountingAccount: accountCode } as any);
            } else if (mappingSubtab === 'banks') {
                const target = bankAccounts.find(b => b.id === id);
                if (target) await updateBankAccount({ ...target, accountingAccount: accountCode } as any);
            } else if (mappingSubtab === 'categories') {
                const mappingsStr = localStorage.getItem(`escopov3_category_mappings_${selectedCompany.id}`);
                let mappings: Record<string, string> = {};
                if (mappingsStr) {
                    try { mappings = JSON.parse(mappingsStr); } catch {}
                }
                mappings[id] = accountCode;
                localStorage.setItem(`escopov3_category_mappings_${selectedCompany.id}`, JSON.stringify(mappings));
                // Trigger state recalculation by updating selectedMappingAccount ref
                setSelectedMappingAccount(prev => ({ ...prev, [id]: accountCode }));
            }
            setSelectedMappingAccount(prev => ({ ...prev, [id]: accountCode }));
        } catch (e) {
            console.error(e);
            alert('Falha ao atualizar vínculo contábil');
        }
    };

    // Post an individual missing document
    const handlePostItem = async (item: typeof unpostedItems[0]) => {
        if (!selectedCompany) return;
        try {
            let entriesToPost: any[] = [];
            if (item.type === 'faturamento' || item.type === 'compras') {
                entriesToPost = generateJournalEntries(item.rawObj, selectedCompany);
            } else if (item.type === 'folha') {
                entriesToPost = generatePayrollEntries(item.rawObj, selectedCompany);
            } else if (item.type === 'banco') {
                entriesToPost = generateBankEntries(item.rawObj, selectedCompany);
            }

            for (const entry of entriesToPost) {
                await addAccountingEntry({
                    ...entry,
                    companyId: selectedCompany.id,
                    status: 'posted'
                });
            }
            alert('Lançamentos contábeis efetuados com sucesso!');
        } catch (err: any) {
            alert(`Erro ao efetuar lançamento: ${err.message}`);
        }
    };

    // Post all unposted items in bulk
    const handlePostAllMissing = async () => {
        if (unpostedItems.length === 0) return;
        setIsPostingAll(true);
        setAuditFeedback('Iniciando lançamentos em lote...');
        
        try {
            let postedCount = 0;
            let skippedCount = 0;
            for (let i = 0; i < unpostedItems.length; i++) {
                const item = unpostedItems[i];
                setAuditFeedback(`Processando (${i + 1}/${unpostedItems.length}): ${item.description}`);
                
                let entriesToPost: any[] = [];
                if (item.type === 'faturamento' || item.type === 'compras') {
                    entriesToPost = generateJournalEntries(item.rawObj, selectedCompany);
                } else if (item.type === 'folha') {
                    entriesToPost = generatePayrollEntries(item.rawObj, selectedCompany);
                } else if (item.type === 'banco') {
                    entriesToPost = generateBankEntries(item.rawObj, selectedCompany);
                }

                // Check if any entry in this group belongs to a closed period
                let isClosed = false;
                for (const entry of entriesToPost) {
                    if (checkPeriodClosed(entry.date, selectedCompany?.id, 'contabil')) {
                        isClosed = true;
                        break;
                    }
                }

                if (isClosed) {
                    skippedCount++;
                    continue;
                }

                for (const entry of entriesToPost) {
                    await addAccountingEntry({
                        ...entry,
                        companyId: selectedCompany?.id,
                        status: 'posted'
                    });
                }
                postedCount++;
            }
            
            if (skippedCount > 0) {
                alert(`Lançamentos em lote finalizados! ${postedCount} efetuados com sucesso. ${skippedCount} documentos foram ignorados por pertencerem a períodos contábeis ou fiscais encerrados.`);
            } else {
                alert(`Sincronização de integridade finalizada! ${postedCount} lançamentos efetuados.`);
            }
        } catch (err: any) {
            alert(`Erro na sincronização em lote: ${err.message}`);
        } finally {
            setIsPostingAll(false);
            setAuditFeedback('');
        }
    };

    const reportsList = [
        { title: 'DRE', desc: 'Detalhamento de receitas e despesas operacionais.', path: '/app/accounting/dre', icon: BarChart3, color: 'text-[#10b981]', bg: 'bg-[#10b981]/10' },
        { title: 'Balanço Patrimonial', desc: 'Validação da equação contábil de Ativos e Passivos.', path: '/app/accounting/balanco', icon: PieChart, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-950/40' },
        { title: 'Balancete de Verificação', desc: 'Lista de saldos analíticos e partidas dobradas.', path: '/app/accounting/balancete', icon: Activity, color: 'text-sky-500', bg: 'bg-sky-100 dark:bg-sky-950/40' },
        { title: 'Livro Diário', desc: 'Registro cronológico e lançamentos de ajuste.', path: '/app/accounting/diario', icon: BookOpen, color: 'text-[#0ea5e9]', bg: 'bg-[#0ea5e9]/10' },
        { title: 'Plano de Contas', desc: 'Hierarquias e configurações de contas contábeis.', path: '/app/accounting/plano-contas', icon: FileText, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800/40' },
        { title: 'DMPL', desc: 'Demonstração das Mutações do Patrimônio Líquido.', path: '/app/accounting/dmpl', icon: BarChart3, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-950/40' },
        { title: 'DFC', desc: 'Demonstração dos Fluxos de Caixa (Método Direto).', path: '/app/accounting/dfc', icon: Activity, color: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-950/40' }
    ];


    return (
        <div className="flex flex-col h-full bg-transparent p-0 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Navigation */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <BookOpen className="w-5 h-5 text-[#0ea5e9]" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Escrituração Contábil</h1>
                        <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Demonstrativos, escrituração do livro diário e vínculo de contas</p>
                    </div>
                </div>

                {/* Tabs selection */}
                <div className="flex bg-white/85 dark:bg-slate-800/85 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700 shadow-sm backdrop-blur-md">
                    <button 
                        onClick={() => setActiveTab('kpi')}
                        className={`px-5 py-2 rounded-full text-xs font-black uppercase transition-all ${activeTab === 'kpi' ? 'bg-gradient-to-r from-[#0ea5e9] to-[#10b981] text-white shadow-md shadow-cyan-500/10' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                    >
                        Cockpit Contábil
                    </button>
                    <button 
                        onClick={() => setActiveTab('mapping')}
                        className={`px-5 py-2 rounded-full text-xs font-black uppercase transition-all ${activeTab === 'mapping' ? 'bg-gradient-to-r from-[#0ea5e9] to-[#10b981] text-white shadow-md shadow-cyan-500/10' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                    >
                        Vínculo de Contas
                    </button>
                    <button 
                        onClick={() => {
                            setActiveTab('audit');
                            setMappingSearch('');
                        }}
                        className={`px-5 py-2 rounded-full text-xs font-black uppercase transition-all relative ${activeTab === 'audit' ? 'bg-gradient-to-r from-[#0ea5e9] to-[#10b981] text-white shadow-md shadow-cyan-500/10' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                    >
                        Auditoria de Lançamentos
                        {unpostedItems.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold w-4 h-4 rounded-full text-[9px] flex items-center justify-center animate-bounce">
                                {unpostedItems.length}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* main scrollable wrapper */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-6 space-y-6">
                
                {/* 1. COCKPIT TAB */}
                {activeTab === 'kpi' && (
                    <>
                        {/* Analytical KPIs - Premium */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">

                            {/* Ativo */}
                            <div className="relative bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden cursor-default">
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                                <div className="relative flex items-start justify-between mb-3">
                                    <div className="p-2.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                        <Landmark className="w-4 h-4" />
                                    </div>
                                    <span className="text-[9px] font-black text-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider">Ativo</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Ativo</p>
                                <p className="text-lg font-black text-slate-800 dark:text-white tabular-nums leading-tight">{currency(metrics.asset)}</p>
                                <p className="text-[9px] text-cyan-500 font-semibold mt-1">Direito e Bens</p>
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-sky-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>

                            {/* Passivo + PL */}
                            <div className="relative bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden cursor-default">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                                <div className="relative flex items-start justify-between mb-3">
                                    <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                        <Database className="w-4 h-4" />
                                    </div>
                                    <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider">Passivo</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Passivo + PL</p>
                                <p className="text-lg font-black text-slate-800 dark:text-white tabular-nums leading-tight">{currency(metrics.liabilities + metrics.pl + metrics.profit)}</p>
                                <p className="text-[9px] text-indigo-500 font-semibold mt-1">Obrigações e Capital</p>
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-400 to-violet-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>

                            {/* Lucro DRE */}
                            <div className="relative bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden cursor-default">
                                <div className={`absolute inset-0 bg-gradient-to-br ${metrics.profit >= 0 ? 'from-emerald-50/80' : 'from-rose-50/80'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`} />
                                <div className="relative flex items-start justify-between mb-3">
                                    <div className={`p-2.5 ${metrics.profit >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-500'} rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                                        <Activity className="w-4 h-4" />
                                    </div>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${metrics.profit >= 0 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' : 'text-rose-500 bg-rose-50 dark:bg-rose-900/30'}`}>DRE</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lucro do Exercício</p>
                                <p className={`text-lg font-black tabular-nums leading-tight ${metrics.profit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{currency(metrics.profit)}</p>
                                <p className={`text-[9px] font-semibold mt-1 ${metrics.profit >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>DRE Ano Corrente</p>
                                <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${metrics.profit >= 0 ? 'from-emerald-400 to-teal-300' : 'from-rose-400 to-pink-300'} opacity-0 group-hover:opacity-100 transition-opacity`} />
                            </div>

                            {/* Equação Contábil */}
                            <div className={`relative p-5 rounded-2xl border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden cursor-default ${
                                metrics.isBalanced
                                    ? 'bg-gradient-to-br from-emerald-500 to-teal-500 border-emerald-400/30'
                                    : 'bg-gradient-to-br from-rose-500 to-pink-500 border-rose-400/30'
                            }`}>
                                <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500" />
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                                            <ArrowLeftRight className="w-4 h-4 text-white" />
                                        </div>
                                        {metrics.isBalanced
                                            ? <CheckCircle className="w-4 h-4 text-white/80" />
                                            : <AlertTriangle className="w-4 h-4 text-white/80" />
                                        }
                                    </div>
                                    <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">Equação Contábil</p>
                                    {metrics.isBalanced ? (
                                        <p className="text-lg font-black text-white leading-tight">Equilibrado</p>
                                    ) : (
                                        <p className="text-base font-black text-white leading-tight">Diferença<br/>{currency(metrics.difference)}</p>
                                    )}
                                    <p className="text-[9px] text-white/60 font-semibold mt-1">Ativo = Passivo + PL</p>
                                </div>
                            </div>
                        </div>

                        {/* Integration & Sync banner - Premium */}
                        <div className="relative bg-gradient-to-r from-[#0c4a6e] via-[#0ea5e9] to-[#10b981] p-7 rounded-2xl text-white shadow-xl shadow-cyan-900/20 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden group">
                            {/* Decorative blobs */}
                            <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
                            <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />

                            <div className="flex items-center gap-5 relative z-10">
                                <div className="relative">
                                    <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                        <RefreshCw className="w-7 h-7 text-white" />
                                    </div>
                                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-base font-black uppercase tracking-tight">Sincronização Contábil em Lote</h3>
                                        <span className="bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">Automático</span>
                                    </div>
                                    <p className="text-xs text-white/80 max-w-lg leading-relaxed">
                                        Importe, classifique e gere lançamentos contábeis de notas fiscais, faturamentos, extratos e folhas de pagamento no período contábil ativo.
                                    </p>
                                </div>
                            </div>

                            <button 
                                onClick={() => setIsSyncModalOpen(true)}
                                className="relative z-10 flex items-center gap-2.5 bg-white text-cyan-700 hover:bg-slate-50 font-black rounded-full px-7 py-3.5 shadow-lg hover:scale-105 transition-all text-xs uppercase border border-white/50 whitespace-nowrap"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Iniciar Sincronização
                            </button>
                        </div>

                        {/* Reports Catalog - Premium */}
                        <div>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-1 h-5 rounded-full bg-gradient-to-b from-cyan-400 to-teal-500" />
                                <h3 className="text-sm font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider">Catálogo de Relatórios</h3>
                                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                                <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">{reportsList.length} relatórios</span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {reportsList.map((item, idx) => {
                                    const gradients = [
                                        'from-emerald-400 to-teal-500',
                                        'from-indigo-400 to-violet-500',
                                        'from-sky-400 to-cyan-500',
                                        'from-[#0ea5e9] to-blue-600',
                                        'from-slate-400 to-slate-600',
                                        'from-purple-400 to-violet-600',
                                        'from-pink-400 to-rose-500',
                                    ];
                                    const grad = gradients[idx % gradients.length];
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => navigate(item.path)}
                                            className="group relative bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left overflow-hidden"
                                        >
                                            {/* Hover bg shimmer */}
                                            <div className={`absolute inset-0 bg-gradient-to-br ${grad} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl`} />
                                            <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br from-slate-50 to-transparent dark:from-slate-700/30 opacity-50" />

                                            <div className={`relative z-10 w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                                                <item.icon className="w-5 h-5 text-white" />
                                            </div>

                                            <div className="relative z-10">
                                                <h4 className="font-black text-sm text-slate-800 dark:text-slate-100 group-hover:text-[#0ea5e9] transition-colors leading-tight">{item.title}</h4>
                                                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{item.desc}</p>
                                            </div>

                                            <div className="relative z-10 flex items-center gap-1 mt-4 text-slate-300 dark:text-slate-600 group-hover:text-[#0ea5e9] transition-colors">
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Abrir</span>
                                                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                            </div>

                                            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${grad} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* 2. MAPPING TAB */}
                {activeTab === 'mapping' && (
                    <Card className="p-6 rounded-[2rem] border border-slate-200/60 shadow-sm flex flex-col h-[550px] overflow-hidden">
                        {/* Selector Row */}
                        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
                            {/* Subtabs */}
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200/40 dark:border-slate-700/50">
                                {[
                                    { id: 'clients', label: 'Clientes' },
                                    { id: 'partners', label: 'Fornecedores' },
                                    { id: 'employees', label: 'Funcionários' },
                                    { id: 'banks', label: 'Contas Bancárias' },
                                    { id: 'categories', label: 'Categorias Caixa' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setMappingSubtab(tab.id as any);
                                            setMappingSearch('');
                                        }}
                                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${mappingSubtab === tab.id ? 'bg-white dark:bg-slate-900 text-[#0ea5e9] shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Search bar */}
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 rounded-full border border-slate-200/60 dark:border-slate-800 w-full md:w-80">
                                <Search size={16} className="text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Pesquisar..." 
                                    value={mappingSearch}
                                    onChange={e => setMappingSearch(e.target.value)}
                                    className="bg-transparent text-xs outline-none text-slate-700 dark:text-slate-300 w-full"
                                />
                            </div>
                        </div>

                        {/* List grid */}
                        <div className="flex-1 overflow-y-auto min-h-0 py-4 pr-1">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-400">
                                        <th className="py-3 px-4">Identificação</th>
                                        <th className="py-3 px-4">Documento / Referência</th>
                                        <th className="py-3 px-4">Tipo</th>
                                        <th className="py-3 px-4 w-96 text-right">Conta Contábil Vinculada</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
                                    {currentMappingList.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <div className="font-bold text-sm text-slate-700 dark:text-slate-200">{item.name}</div>
                                            </td>
                                            <td className="py-3.5 px-4 font-mono text-xs text-slate-400">{item.document}</td>
                                            <td className="py-3.5 px-4">
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full font-bold text-[9px] uppercase">{item.type}</span>
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <select
                                                    value={item.account || ''}
                                                    onChange={(e) => handleUpdateMapping(item.id, e.target.value)}
                                                    className="w-full max-w-[280px] p-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-cyan-500"
                                                >
                                                    <option value="">-- Sem Conta Contábil --</option>
                                                    {analyticAccounts.map(acc => (
                                                        <option key={acc.code} value={acc.code}>
                                                            {acc.code} - {acc.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                    {currentMappingList.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
                                                Nenhum item pendente de vínculo ou correspondente à busca.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* 3. AUDIT TAB (AUSENCIA DE LANCAMENTOS) */}
                {activeTab === 'audit' && (
                    <Card className="p-6 rounded-[2rem] border border-slate-200/60 shadow-sm flex flex-col h-[550px] overflow-hidden">
                        {/* Header actions */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-amber-500" />
                                    Lançamentos Pendentes ({unpostedItems.length})
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">Estes documentos fiscais, folhas ou transações bancárias não possuem correspondentes no diário contábil.</p>
                            </div>
                            
                            {unpostedItems.length > 0 && (
                                <button
                                    onClick={handlePostAllMissing}
                                    disabled={isPostingAll}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full px-6 py-2.5 shadow-md shadow-emerald-500/10 text-xs uppercase disabled:opacity-50 transition-all hover:scale-[1.02]"
                                >
                                    {isPostingAll ? 'Processando Lote...' : 'Lançar Todos Ausentes'}
                                </button>
                            )}
                        </div>

                        {/* Bulk progress feedback */}
                        {isPostingAll && (
                            <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3 animate-pulse shrink-0 my-3">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span className="text-xs font-bold">{auditFeedback}</span>
                            </div>
                        )}

                        {/* Table list */}
                        <div className="flex-1 overflow-y-auto min-h-0 py-4 pr-1">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-400">
                                        <th className="py-3 px-4">Data Ocorrência</th>
                                        <th className="py-3 px-4">Descrição / Origem</th>
                                        <th className="py-3 px-4">Módulo</th>
                                        <th className="py-3 px-4 text-right">Valor</th>
                                        <th className="py-3 px-4 text-right w-36">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
                                    {unpostedItems.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                                                {new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-bold text-sm text-slate-700 dark:text-slate-200">{item.description}</div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                                                    item.type === 'faturamento' ? 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600' :
                                                    item.type === 'compras' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600' :
                                                    item.type === 'folha' ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600' :
                                                    'bg-purple-50 dark:bg-purple-950/30 text-purple-600'
                                                }`}>
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                                                {currency(item.amount)}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <button
                                                    onClick={() => handlePostItem(item)}
                                                    className="px-4 py-1.5 bg-slate-100 hover:bg-[#10b981] hover:text-white dark:bg-slate-800 dark:hover:bg-[#10b981] text-slate-600 dark:text-slate-400 rounded-full font-bold text-[10px] uppercase transition-all"
                                                >
                                                    Efetuar Lançamento
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {unpostedItems.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-16 text-center text-slate-400 text-xs">
                                                <div className="flex flex-col items-center gap-2">
                                                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                                                    <div className="font-bold">Base de Lançamentos 100% Conciliada!</div>
                                                    <div className="text-[10px] text-slate-400">Nenhum documento fiscal, transação ou folha pendente encontrado.</div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            {/* SYNC RUN MODAL */}
            {isSyncModalOpen && (
                <SyncModal 
                    isOpen={isSyncModalOpen} 
                    onClose={() => setIsSyncModalOpen(false)} 
                />
            )}
        </div>
    );
};
