import React, { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Card } from '../components/ui/Card';
import { UniversalList } from '../components/ui/UniversalList';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    DollarSign, ArrowUpCircle, ArrowDownCircle,
    Calendar, Download,
    Filter, TrendingUp, Wallet, Banknote,
    Building, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Info, Users,
    ArrowRight, CreditCard, Search, FileText, Lock, MoreHorizontal, Layers, PieChart as PieChartIcon, UploadCloud, Trash2, SquareActivity, Percent
} from 'lucide-react';
import { formatDateBR, parseDateSafe } from '../utils/formatters';
import { Modal } from '../components/ui/Modal';
import { LiquidationModal } from '../components/financial/LiquidationModal';
import { TransactionModal } from '../components/financial/TransactionModal';
import { PasteStatementModal } from '../components/financial/PasteStatementModal';
import { useToast } from '../contexts/ToastContext';
import { useError } from '../contexts/ErrorContext';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { parseOFX, parseMercadoPagoText, MERCADO_PAGO_SAMPLE } from '../utils/bankParsers';
import * as pdfjsLib from 'pdfjs-dist';

// Carga do worker via CDN para evitar problemas de compatibilidade no Vite sem configurações estendidas
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);


export const Financial: React.FC = () => {
    const {
        invoices, employees, theme, selectedCompany, bankAccounts, clients,
        settleInvoice, addInvoice, updateInvoice, addBankTransaction,
        currentUser, userEmail, addAuditLog,
        userRole, userPermissions, deleteItem, operationTypes
    } = useData();
    const { addToast } = useToast();
    const { showError } = useError();
    const navigate = useNavigate();

    // Tabs
    const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'receivables' | 'payables' | 'reconciliation' | 'advances' | 'dre' | 'forecast' | 'aging'>('overview');

    // Filters
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    // Reconciliation Match State
    const [matchingTransactions, setMatchingTransactions] = useState<any[]>([]);
    const [isMatchingActive, setIsMatchingActive] = useState(false);


    // Paste Statement Modal State
    const [pasteModalOpen, setPasteModalOpen] = useState(false);
    const [pastedText, setPastedText] = useState('');

    // Transaction Modal State
    const [transactionModalOpen, setTransactionModalOpen] = useState(false);
    const [transactionData, setTransactionData] = useState({
        type: 'entry' as 'entry' | 'exit', // entry = expense (saida), exit = income (entrada) - aligned with Invoice Type, but wait. Invoice type 'entry' is usually 'Input Invoice' (Expense). 'exit' is 'Output' (Revenue).
        description: '',
        category: '',
        value: 0,
        date: new Date().toISOString().split('T')[0],
        status: 'pendente' as 'pendente' | 'paga',
        costCenter: '' as string,
        naturezaOperacao: '' as string
    });

    // Liquidation Modal State
    const [liquidationModalOpen, setLiquidationModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [liquidationData, setLiquidationData] = useState({
        bankAccountId: '',
        date: new Date().toISOString().split('T')[0],
        value: 0
    });

    // --- DATA LOGIC ---
    const financialData = useMemo(() => {
        const receivables: any[] = [];
        const payables: any[] = [];
        const yearReceivables: any[] = [];
        let totalReceivable = 0;
        let totalPayable = 0;
        let paidReceivables = 0;
        let paidPayables = 0;
        let advancesTotal = 0;

        let revenue = 0;
        let taxesOnSales = 0;
        let personnelCosts = 0;
        let fixedExpenses = 0;
        let otherExpenses = 0;

        const monthlyStats = new Map<number, { in: number; out: number }>();
        const currentMonth = new Date().getMonth();
        for (let i = 0; i < 12; i++) monthlyStats.set(i, { in: 0, out: 0 });

        const now = new Date();

        invoices.forEach(i => {
            if (i.status === 'cancelada') return;
            const date = parseDateSafe(i.date);
            const year = date.getFullYear();
            const month = date.getMonth();
            const isYear = year === filterYear;
            const isPaid = i.status === 'paga';

            // Receivables logic
            const isReceivable = (i.type === 'service' && (i.naturezaOperacao === 'Prestação de Serviço' || !i.naturezaOperacao)) ||
                (isYear && (i.type === 'exit' || (i.type === 'receipt' && i.naturezaOperacao?.includes('Entrada'))));

            if (isReceivable) {
                const rec = {
                    id: i.id,
                    title: i.entityName || 'Consumidor',
                    desc: `${i.type === 'service' ? 'Serviço' : i.type === 'receipt' ? 'Recibo' : 'NF'} #${i.number}`,
                    value: i.value,
                    date: i.date,
                    status: isPaid ? 'paid' : (date < now ? 'overdue' : 'pending'),
                    type: 'receivable',
                    obj: i
                };
                receivables.push(rec);
                if (isYear) {
                    yearReceivables.push(rec);
                    totalReceivable += i.value;
                    if (isPaid) paidReceivables += i.value;
                } else if (i.type === 'service') {
                    // Cross-year receivables kpi? The original logic did sum of the filtered list.
                    // The original: totalReceivable = receivables.reduce(...)
                    totalReceivable += i.value;
                    if (isPaid) paidReceivables += i.value;
                }
            }

            // Payables logic
            const isPayable = (i.type === 'service' && i.naturezaOperacao === 'Tomada de Serviço') ||
                (isYear && (i.type === 'entry' || i.type === 'payroll' || i.type === 'tax' || (i.type === 'receipt' && i.naturezaOperacao?.includes('Saída'))));

            if (isPayable) {
                const pay = {
                    id: i.id,
                    title: i.entityName || 'Fornecedor',
                    desc: `${i.type === 'service' ? 'Serviço Tomado' : i.type === 'payroll' ? 'Folha' : i.type === 'tax' ? 'Imposto' : i.type === 'receipt' ? 'Recibo' : 'Compra'} #${i.number}`,
                    value: i.value,
                    date: i.date,
                    status: isPaid ? 'paid' : 'pending',
                    type: 'payable',
                    obj: i
                };
                payables.push(pay);
                // The original logic: totalPayable = payables.reduce(...)
                totalPayable += i.value;
                if (isPaid) paidPayables += i.value;
            }

            if (isYear) {
                // Monthly Stats
                const stats = monthlyStats.get(month)!;
                if (i.type === 'exit' || (i.type === 'service' && i.naturezaOperacao !== 'Tomada de Serviço')) {
                    stats.in += i.value;
                } else if (i.type === 'entry' || i.type === 'tax' || (i.type === 'service' && i.naturezaOperacao === 'Tomada de Serviço')) {
                    stats.out += i.value;
                }

                // DRE logic
                if (i.type === 'exit' || (i.type === 'service' && i.naturezaOperacao !== 'Tomada de Serviço') || (i.type === 'receipt' && i.naturezaOperacao?.includes('Entrada'))) {
                    revenue += i.value;
                }
                if (i.type === 'tax' || i.category === 'Impostos') {
                    taxesOnSales += i.value;
                } else if (i.type === 'payroll' || ['Salários', 'Impostos - Trabalhista', 'Salarios'].includes(i.category || '')) {
                    personnelCosts += i.value;
                } else if (['Contas Fixas', 'Aluguel'].includes(i.category || '')) {
                    fixedExpenses += i.value;
                } else if (i.type === 'entry' || i.category === 'Compras' || i.category === 'Outros') {
                    otherExpenses += i.value;
                }
            }

            if (i.naturezaOperacao?.toLowerCase().includes('adiantamento')) {
                advancesTotal += i.value;
            }
        });

        const allTransactions = [...yearReceivables, ...payables]
            .map(t => ({ ...t, key: `${t.type}-${t.id}` }))
            .sort((a, b) => parseDateSafe(b.date).getTime() - parseDateSafe(a.date).getTime());

        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
            const mIdx = (currentMonth - i + 12) % 12;
            const s = monthlyStats.get(mIdx)!;
            last6Months.push({ name: months[mIdx], entrada: s.in, saida: s.out });
        }

        return {
            receivables,
            payables,
            allTransactions,
            totalReceivable,
            totalPayable,
            chartData: last6Months,
            balance: totalReceivable - totalPayable,
            receivablesPieData: [
                { name: 'Recebido', value: paidReceivables, color: '#10b981' },
                { name: 'Pendente', value: Math.max(0, totalReceivable - paidReceivables), color: '#e2e8f0' }
            ],
            payablesPieData: [
                { name: 'Pago', value: paidPayables, color: '#ef4444' },
                { name: 'Pendente', value: Math.max(0, totalPayable - paidPayables), color: '#e2e8f0' }
            ],
            cashFlowPieData: [
                { name: 'Entradas', value: totalReceivable, color: '#10b981' },
                { name: 'Saídas', value: totalPayable, color: '#f43f5e' }
            ],
            advancesPieData: [
                { name: 'Adiantado', value: advancesTotal, color: '#f59e0b' },
                { name: 'Disponível', value: Math.max(0, totalReceivable - advancesTotal), color: '#e2e8f0' }
            ],
            dreData: {
                revenue,
                taxesOnSales,
                netRevenue: revenue - taxesOnSales,
                personnelCosts,
                fixedExpenses,
                otherExpenses,
                ebitda: (revenue - taxesOnSales) - personnelCosts - fixedExpenses - otherExpenses
            }
        };
    }, [invoices, filterYear]);

    // Common processing logic for bank reconciliation
    const processBankStatement = (text: string, fileName: string = '') => {
        let matches: any[] = [];
        try {
            if (fileName.toLowerCase().endsWith('.ofx') || text.includes('<OFX>')) {
                const transactions = parseOFX(text);
                matches = transactions.map(t => ({
                    id: t.id,
                    docNumber: t.checknum || '',
                    date: t.date,
                    desc: t.description,
                    amount: Math.abs(t.amount),
                    type: t.amount < 0 ? 'entry' : 'exit',
                    matchQuality: 'none',
                    matchedInvoiceId: null,
                    matchedInvoiceDesc: null
                }));
            } else if (text.includes('Mercado Pago') || text.includes('EXTRATO DE CONTA') || text.includes('Data Descrição ID da operação')) {
                matches = parseMercadoPagoText(text);
            }

            // Process Matching Logic
            matches = matches.map(m => {
                const targetDate = new Date(m.date);
                const existingMatch = invoices.find(inv => {
                    const invDate = new Date(inv.date);
                    const diffTime = Math.abs(targetDate.getTime() - invDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return (
                        Math.abs(inv.value - m.amount) < 0.05 &&
                        diffDays <= 5 && // Increased window for better matching
                        inv.status !== 'paga' &&
                        inv.type === m.type
                    );
                });

                return {
                    ...m,
                    matchQuality: existingMatch ? 'high' : 'none',
                    matchedInvoiceId: existingMatch?.id || null,
                    matchedInvoiceDesc: existingMatch ? `${existingMatch.number} - ${existingMatch.entityName}` : null
                };
            });

            if (matches.length > 0) {
                setMatchingTransactions(matches);
                setIsMatchingActive(true);
                addToast(`${matches.length} transações analisadas. Revise as conciliações abaixo.`, 'success');
            } else {
                addToast('Nenhuma transação identificada no texto fornecido.', 'warning');
            }

        } catch (err) {
            console.error(err);
            addToast('Erro ao processar as transações bancárias.', 'error');
        }
    };

    // RBAC: Check permissions
    const canWriteFinancial = useMemo(() => {
        return userRole === 'Admin' || userPermissions?.financial === 'full';
    }, [userRole, userPermissions]);

    const handleLiquidationClick = (item: any) => {
        if (!canWriteFinancial) return; // RBAC Block
        setSelectedInvoice(item);
        setLiquidationData({
            bankAccountId: bankAccounts[0]?.id || '',
            date: new Date().toISOString().split('T')[0],
            value: item.value // Default to full value
        });
        setLiquidationModalOpen(true);
    };

    const confirmLiquidation = async () => {
        if (!canWriteFinancial) return; // RBAC Block
        if (!liquidationData.bankAccountId || !selectedInvoice) {
            addToast('Selecione uma conta bancária', 'error');
            return;
        }

        await settleInvoice(
            selectedInvoice.id,
            liquidationData.bankAccountId,
            liquidationData.date,
            liquidationData.value
        );

        await addAuditLog(
            'update',
            'financial',
            selectedInvoice.id,
            `Liquidação de título: ${selectedInvoice.desc} no valor de ${currency(liquidationData.value)}`
        );

        setLiquidationModalOpen(false);
    };

    const handleSaveTransaction = async () => {
        if (!canWriteFinancial) return; // RBAC Block
        if (!transactionData.description || !transactionData.value || !transactionData.category) {
            addToast('Preencha os campos obrigatórios', 'error');
            return;
        }

        try {
            await addInvoice({
                id: '', // Generated by simple add
                number: 'MANUAL-' + Date.now().toString().slice(-6),
                entityName: transactionData.category, // Using Category as "Entity" for manual records if needed, or generic
                entityId: 'manual',
                cnpj: '00000000000000',
                date: transactionData.date,
                value: transactionData.value,
                type: transactionData.type === 'exit' ? 'exit' : 'entry', // Exit = Venda/Receita in this logic? Wait.
                // In generic logic: Entry (Entrada de Nota) = Expense (Saida de Dinheiro). Exit (Saida de Nota) = Revenue (Entrada de Dinheiro).
                // Let's stick to that map.
                status: transactionData.status === 'paga' ? 'paga' : 'pendente',
                category: transactionData.category,
                details: transactionData.description,
                naturezaOperacao: transactionData.naturezaOperacao,
                costCenter: transactionData.costCenter // Recommendation 9
            } as any);

            addToast('Lançamento registrado com sucesso!', 'success');
            setTransactionModalOpen(false);
            setTransactionData({ type: 'entry', description: '', category: '', value: 0, date: new Date().toISOString().split('T')[0], status: 'pendente', costCenter: '', naturezaOperacao: '' });

            // Add to Audit Log
            await addAuditLog(
                'create',
                'financial',
                'manual',
                `Lançamento manual: ${transactionData.description} (${currency(transactionData.value)})`
            );
        } catch (e: any) {
            console.error(e);
            if (e.message.includes('Bloqueada') || e.message.includes('Bloqueado')) {
                showError({
                    code: 'PERIOD_LOCKED',
                    title: 'Período Contábil/Fiscal Encerrado',
                    description: e.message,
                    origin: 'Módulo Financeiro',
                    suggestion: 'A data informada pertence a um mês já fechado pelo setor contábil.',
                    type: 'lock'
                });
            } else {
                addToast(e.message || 'Erro ao salvar lançamento', 'error');
            }
        }
    };

    const handleDeleteTransaction = async (transaction: any) => {
        if (!canWriteFinancial) return;

        const confirmMessage = `Tem certeza que deseja excluir esta transação?\n\n` +
            `${transaction.desc}\n` +
            `Valor: ${currency(transaction.value)}\n` +
            `Data: ${formatDateBR(transaction.date)}\n\n` +
            `ATENÇÃO: Esta ação não pode ser desfeita!`;

        if (!confirm(confirmMessage)) return;

        try {
            // Se for uma invoice (veio do fiscal), avisar
            if (transaction.obj.accessKey || transaction.obj.xmlContent) {
                const proceed = confirm(
                    'ATENÇÃO: Esta transação está vinculada a uma Nota Fiscal!\n\n' +
                    'Ao excluir, você estará removendo apenas o lançamento financeiro.\n' +
                    'A nota fiscal permanecerá no módulo Fiscal.\n\n' +
                    'Deseja continuar?'
                );
                if (!proceed) return;
            }

            await deleteItem('invoices', transaction.id);
            addToast('Transação excluída com sucesso!', 'success');

            await addAuditLog(
                'delete',
                'financial',
                transaction.id,
                `Exclusão de transação: ${transaction.desc} (${currency(transaction.value)})`
            );
        } catch (error: any) {
            console.error('Erro ao excluir transação:', error);
            if (error.message.includes('Bloqueada') || error.message.includes('Bloqueado')) {
                showError({
                    code: 'PERIOD_LOCKED',
                    title: 'Exclusão Bloqueada',
                    description: error.message,
                    origin: 'Módulo Financeiro',
                    suggestion: 'Não é possível excluir registros de períodos encerrados.',
                    type: 'lock'
                });
            } else {
                addToast(error.message || 'Erro ao excluir transação', 'error');
            }
        }
    };

    // AI suggestion for categories (Recommendation 9)
    const suggestCategory = (description: string) => {
        const desc = description.toLowerCase();
        if (desc.includes('aluguel') || desc.includes('locação')) return 'Aluguel';
        if (desc.includes('energia') || desc.includes('enel') || desc.includes('light')) return 'Utilidades';
        if (desc.includes('folha') || desc.includes('salário') || desc.includes('pro-labore')) return 'Folha de Pagamento';
        if (desc.includes('serviço') || desc.includes('sessão')) return 'Serviços Prestados';
        if (desc.includes('imposto') || desc.includes('das') || desc.includes('fgts') || desc.includes('gps')) return 'Impostos';
        if (desc.includes('transferência') || desc.includes('ted') || desc.includes('pix')) return 'Transferência';
        return 'Geral';
    };


    const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="flex flex-col min-h-full bg-slate-50 dark:bg-slate-900 -m-4 md:-m-6 p-4 md:p-6">

            {/* TOP HEADER BAR — Premium */}
            <header className="flex justify-between items-center mb-6 shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl shadow-md shadow-emerald-500/20">
                        <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Gestão Financeira</h1>
                        <p className="text-xs text-gray-400 dark:text-slate-400 font-medium">Controle de Fluxo de Caixa e Tesouraria</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/app/reports')}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm hover:shadow-emerald-500/10 hover:border-emerald-300 transition-all"
                    >
                        <Download size={13} />
                        Relatórios
                    </button>
                    <button className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm hover:bg-slate-50 transition-all text-slate-500 dark:text-slate-400">
                        <Filter size={15} />
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm hover:bg-slate-50 transition-all text-slate-500 dark:text-slate-400"
                        title="Atualizar"
                    >
                        <RefreshCw size={15} />
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col overflow-hidden gap-5">

                {/* KPI CARDS — Premium */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">

                    {/* Saldo Disponível */}
                    <div className="relative bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden cursor-default">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                        <div className="relative flex items-start justify-between mb-3">
                            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                <Wallet className="w-4 h-4" />
                            </div>
                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider">Banco</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Saldo Disponível</p>
                        <p className="text-xl font-black text-slate-800 dark:text-white tabular-nums leading-tight">{currency(bankAccounts.reduce((acc, b) => acc + b.balance, 0))}</p>
                        <p className="text-[9px] text-emerald-500 font-semibold mt-1">Contas bancárias ativas</p>
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Total a Receber */}
                    <div className="relative bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden cursor-default">
                        <div className="absolute inset-0 bg-gradient-to-br from-sky-50/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                        <div className="relative flex items-start justify-between mb-3">
                            <div className="p-2.5 bg-sky-100 dark:bg-sky-900/30 text-sky-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                            <span className="text-[9px] font-black text-sky-500 bg-sky-50 dark:bg-sky-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider">A Receber</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total a Receber</p>
                        <p className="text-xl font-black text-emerald-600 tabular-nums leading-tight">{currency(financialData.totalReceivable)}</p>
                        <p className="text-[9px] text-sky-500 font-semibold mt-1">Títulos em aberto</p>
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400 to-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Total a Pagar */}
                    <div className="relative bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden cursor-default">
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-50/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                        <div className="relative flex items-start justify-between mb-3">
                            <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                <ArrowDownCircle className="w-4 h-4" />
                            </div>
                            <span className="text-[9px] font-black text-rose-500 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider">A Pagar</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total a Pagar</p>
                        <p className="text-xl font-black text-rose-600 tabular-nums leading-tight">{currency(financialData.totalPayable)}</p>
                        <p className="text-[9px] text-rose-400 font-semibold mt-1">Compromissos financeiros</p>
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-400 to-pink-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Saldo Projetado — gradient card */}
                    <div className="relative bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-5 rounded-2xl text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden cursor-default">
                        <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500" />
                        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full blur-lg" />
                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-3">
                                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <BarChart className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-[9px] font-black text-white/70 bg-white/15 px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">Projetado</span>
                            </div>
                            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Saldo Projetado</p>
                            <p className="text-xl font-black text-white tabular-nums leading-tight">{currency(financialData.balance)}</p>
                            <p className="text-[9px] text-white/50 font-semibold mt-1">Recebíveis − Pagamentos</p>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs — Premium */}
                <div className="flex gap-1 p-1.5 bg-white/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700 rounded-2xl w-full overflow-x-auto no-scrollbar shrink-0 shadow-sm backdrop-blur-sm">
                    {[
                        { id: 'overview', label: 'Visão Geral', icon: Layers },
                        { id: 'transactions', label: 'Extrato Unificado', icon: FileText },
                        { id: 'receivables', label: 'A Receber', icon: ArrowUpCircle },
                        { id: 'payables', label: 'A Pagar', icon: ArrowDownCircle },
                        { id: 'reconciliation', label: 'Conciliação', icon: CheckCircle2 },
                        { id: 'advances', label: 'Adiantamentos', icon: Banknote },
                        { id: 'dre', label: 'DRE Gerencial', icon: FileText },
                        { id: 'forecast', label: 'Previsão de Caixa', icon: TrendingUp },
                        { id: 'aging', label: 'Aging (30/60/90d)', icon: Calendar },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                            }`}
                        >
                            <tab.icon size={13} className={activeTab === tab.id ? 'text-white' : 'text-slate-400'} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-4">
                    {/* TAB: OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
                            {/* SECTION 1: TRENDS CHART — Premium */}
                            <div className="bg-white dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-teal-500" />
                                            <h3 className="text-base font-black text-slate-800 dark:text-white">Fluxo de Caixa — Últimos 6 Meses</h3>
                                        </div>
                                        <p className="text-xs text-slate-400 font-medium ml-3">Comparativo de Receitas vs Despesas</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-full border border-emerald-100 dark:border-emerald-800/30">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Entradas</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 rounded-full border border-rose-100 dark:border-rose-800/30">
                                            <div className="w-2 h-2 rounded-full bg-rose-500" />
                                            <span className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider">Saídas</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-60 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={financialData.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorEntrada" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorSaida" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(value) => `R$ ${value / 1000}k`} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
                                                itemStyle={{ color: '#fff', padding: 0 }}
                                                formatter={(value: number) => currency(value)}
                                                cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                            />
                                            <Area type="monotone" dataKey="entrada" name="Receitas" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEntrada)" />
                                            <Area type="monotone" dataKey="saida" name="Despesas" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSaida)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* SECTION 2: PIE CHARTS GRID — Premium */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { title: 'Contas a Receber', data: financialData.receivablesPieData, icon: ArrowUpCircle, grad: 'from-emerald-400 to-teal-500', iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600' },
                                    { title: 'Contas a Pagar', data: financialData.payablesPieData, icon: ArrowDownCircle, grad: 'from-rose-400 to-pink-500', iconBg: 'bg-rose-100 dark:bg-rose-900/30', iconColor: 'text-rose-600' },
                                    { title: 'Proporção de Fluxo', data: financialData.cashFlowPieData, icon: SquareActivity, grad: 'from-sky-400 to-cyan-500', iconBg: 'bg-sky-100 dark:bg-sky-900/30', iconColor: 'text-sky-600' },
                                    { title: 'Adiantamentos', data: financialData.advancesPieData, icon: Banknote, grad: 'from-amber-400 to-orange-500', iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600' }
                                ].map((chart, idx) => (
                                    <div key={idx} className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                                        {/* Card header */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className={`p-2 rounded-xl ${chart.iconBg}`}>
                                                <chart.icon size={13} className={chart.iconColor} />
                                            </div>
                                            <h4 className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest leading-tight">{chart.title}</h4>
                                        </div>

                                        <div className="h-36 w-full relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={chart.data} innerRadius={38} outerRadius={55} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={5}>
                                                        {chart.data.map((entry: any, index: number) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }}
                                                        itemStyle={{ color: '#fff' }}
                                                        formatter={(value: number) => currency(value)}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="text-center">
                                                    <span className="text-[9px] font-bold text-slate-400 block leading-none mb-0.5">Total</span>
                                                    <span className="text-[11px] font-black text-slate-800 dark:text-slate-100 tabular-nums">
                                                        {currency(chart.data.reduce((acc: number, curr: any) => acc + curr.value, 0))}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-slate-50 dark:border-slate-700/50">
                                            {chart.data.map((item: any) => (
                                                <div key={item.name} className="flex justify-between items-center">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                                        <span className="text-[10px] font-bold text-slate-500">{item.name}</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 tabular-nums">{currency(item.value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB: MOVIMENTAÇÃO FINANCEIRA (Transactions) */}
                    {activeTab === 'transactions' && (
                        <div className="flex-1 h-full overflow-hidden p-1">
                            <UniversalList
                                title="Extrato Unificado"
                                subtitle="Todas as movimentações financeiras"
                                icon={FileText}
                                data={financialData.allTransactions}
                                columns={[
                                    { header: 'Data', accessor: (t: any) => formatDateBR(t.date), className: "font-bold text-slate-600 dark:text-slate-300 w-32" },
                                    {
                                        header: 'Descrição', accessor: (t: any) => (
                                            <div>
                                                <p className="font-black text-slate-900 dark:text-white">{t.title}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold">{t.desc}</p>
                                            </div>
                                        ), className: "min-w-[200px]"
                                    },
                                    {
                                        header: 'Categoria', accessor: (t: any) => (
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${t.type === 'receivable' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                {t.type === 'receivable' ? 'Receita' : 'Despesa'}
                                            </span>
                                        ), className: "w-32"
                                    },
                                    {
                                        header: 'Auditoria', accessor: (t: any) => (
                                            <div className="flex flex-col gap-0.5 text-[9px] text-gray-500 dark:text-slate-400">
                                                <div className="flex items-center gap-1" title="Criado por">
                                                    <span className="w-1 h-1 rounded-full bg-blue-400 inline-block"></span>
                                                    <span className="truncate max-w-[60px]">{t.obj?.createdBy || '-'}</span>
                                                </div>
                                                {t.obj?.updatedBy && (
                                                    <div className="flex items-center gap-1" title="Alterado por">
                                                        <span className="w-1 h-1 rounded-full bg-orange-400 inline-block"></span>
                                                        <span className="truncate max-w-[60px]">{t.obj.updatedBy}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ), className: "hidden md:table-cell w-40"
                                    },
                                    {
                                        header: 'Valor', accessor: (t: any) => (
                                            <span className={`font-black text-sm ${t.type === 'receivable' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {t.type === 'receivable' ? '+' : '-'}{currency(t.value)}
                                            </span>
                                        ), className: "text-right w-32"
                                    },
                                    {
                                        header: 'Status', accessor: (t: any) => t.status === 'paid' ? (
                                            <div className="flex flex-col items-center text-emerald-500"><CheckCircle2 size={16} /><span className="text-[9px] font-black uppercase mt-0.5">Liquidado</span></div>
                                        ) : t.status === 'overdue' ? <span className="text-red-500 text-[10px] font-black uppercase">Atrasado</span> : <span className="text-slate-400 text-[10px] font-black uppercase">Pendente</span>, className: "text-center w-24"
                                    }
                                ]}
                                headerActions={
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setTransactionData(prev => ({ ...prev, type: 'exit' })); setTransactionModalOpen(true); }}
                                            className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-emerald-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={!canWriteFinancial}
                                        >
                                            + Receita
                                        </button>
                                        <button
                                            onClick={() => { setTransactionData(prev => ({ ...prev, type: 'entry' })); setTransactionModalOpen(true); }}
                                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={!canWriteFinancial}
                                        >
                                            - Despesa
                                        </button>
                                        <button className="px-3 py-1 bg-slate-100 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 transition-colors">
                                            Definir Orçamento
                                        </button>
                                    </div>
                                }
                                actions={(t: any) => (
                                    <div className="flex items-center justify-center gap-2">
                                        {t.status !== 'paid' && (
                                            <button
                                                onClick={() => handleLiquidationClick(t.obj)}
                                                title="Liquidar"
                                                className="p-1.5 bg-slate-900 dark:bg-slate-800 text-white rounded-lg hover:scale-105 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={!canWriteFinancial}
                                            >
                                                <CheckCircle2 size={14} />
                                            </button>
                                        )}
                                        <select
                                            value={t.obj.status}
                                            onChange={(e) => updateInvoice({ ...t.obj, status: e.target.value as any })}
                                            className="text-[10px] font-black uppercase bg-transparent border border-slate-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                                            disabled={!canWriteFinancial}
                                        >
                                            <option value="pendente">Pendente</option>
                                            <option value="paga">Paga</option>
                                            <option value="vencida">Vencida</option>
                                            <option value="cancelada">Cancelada</option>
                                        </select>
                                        <button
                                            onClick={() => handleDeleteTransaction(t)}
                                            title="Excluir"
                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                            disabled={!canWriteFinancial}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            />
                        </div>
                    )}

                    {/* TAB: CONTAS A RECEBER */}
                    {activeTab === 'receivables' && (
                        <div className="flex-1 h-full overflow-hidden p-1">
                            <UniversalList
                                title="Contas a Receber (Receitas)"
                                subtitle="Gestão de entradas e cobranças"
                                icon={ArrowUpCircle}
                                data={financialData.receivables}
                                columns={[
                                    { header: 'Vencimento', accessor: (t: any) => formatDateBR(t.date), className: "font-bold text-slate-600 dark:text-slate-300 w-32" },
                                    {
                                        header: 'Cliente / Descrição', accessor: (t: any) => (
                                            <div>
                                                <p className="font-black text-slate-900 dark:text-white">{t.title}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold">{t.desc}</p>
                                            </div>
                                        ), className: "min-w-[200px]"
                                    },
                                    {
                                        header: 'Auditoria', accessor: (t: any) => (
                                            <div className="flex flex-col gap-0.5 text-[9px] text-gray-500 dark:text-slate-400">
                                                <div className="flex items-center gap-1" title="Criado por">
                                                    <span className="w-1 h-1 rounded-full bg-blue-400 inline-block"></span>
                                                    <span className="truncate max-w-[60px]">{t.obj?.createdBy || '-'}</span>
                                                </div>
                                                {t.obj?.updatedBy && (
                                                    <div className="flex items-center gap-1" title="Alterado por">
                                                        <span className="w-1 h-1 rounded-full bg-orange-400 inline-block"></span>
                                                        <span className="truncate max-w-[60px]">{t.obj.updatedBy}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ), className: "hidden md:table-cell w-40"
                                    },
                                    {
                                        header: 'Valor', accessor: (t: any) => (
                                            <span className="font-black text-sm text-emerald-600">
                                                {currency(t.value)}
                                            </span>
                                        ), className: "text-right w-32"
                                    },
                                    {
                                        header: 'Status', accessor: (t: any) => t.status === 'paid' ? (
                                            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-black uppercase">Recebido</span>
                                        ) : t.status === 'overdue' ? (
                                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-black uppercase">Atrasado</span>
                                        ) : (
                                            <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] font-black uppercase">A Receber</span>
                                        ), className: "text-center w-24"
                                    }
                                ]}
                                headerActions={
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setTransactionData(prev => ({ ...prev, type: 'exit' })); setTransactionModalOpen(true); }}
                                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={!canWriteFinancial}
                                        >
                                            + Nova Receita
                                        </button>
                                    </div>
                                }
                                actions={(t: any) => (
                                    <div className="flex items-center justify-center gap-2">
                                        {t.status !== 'paid' && (
                                            <button
                                                onClick={() => handleLiquidationClick(t.obj)}
                                                title="Receber"
                                                className="p-1.5 bg-emerald-600 text-white rounded-lg hover:scale-105 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={!canWriteFinancial}
                                            >
                                                <ArrowUpCircle size={14} />
                                            </button>
                                        )}
                                        <select
                                            value={t.obj.status}
                                            onChange={(e) => updateInvoice({ ...t.obj, status: e.target.value as any })}
                                            className="text-[10px] font-black uppercase bg-transparent border border-slate-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                                            disabled={!canWriteFinancial}
                                        >
                                            <option value="pendente">Pendente</option>
                                            <option value="paga">Paga</option>
                                            <option value="vencida">Vencida</option>
                                            <option value="cancelada">Cancelada</option>
                                        </select>
                                        <button
                                            onClick={() => handleDeleteTransaction(t)}
                                            title="Excluir"
                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                            disabled={!canWriteFinancial}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            />
                        </div>
                    )}

                    {/* TAB: CONTAS A PAGAR */}
                    {activeTab === 'payables' && (
                        <div className="flex-1 h-full overflow-hidden p-1">
                            <UniversalList
                                title="Contas a Pagar (Despesas)"
                                subtitle="Gestão de pagamentos e obrigações"
                                icon={ArrowDownCircle}
                                data={financialData.payables}
                                columns={[
                                    { header: 'Vencimento', accessor: (t: any) => formatDateBR(t.date), className: "font-bold text-slate-600 dark:text-slate-300 w-32" },
                                    {
                                        header: 'Fornecedor / Descrição', accessor: (t: any) => (
                                            <div>
                                                <p className="font-black text-slate-900 dark:text-white">{t.title}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold">{t.desc}</p>
                                            </div>
                                        ), className: "min-w-[200px]"
                                    },
                                    {
                                        header: 'Auditoria', accessor: (t: any) => (
                                            <div className="flex flex-col gap-0.5 text-[9px] text-gray-500 dark:text-slate-400">
                                                <div className="flex items-center gap-1" title="Criado por">
                                                    <span className="w-1 h-1 rounded-full bg-blue-400 inline-block"></span>
                                                    <span className="truncate max-w-[60px]">{t.obj?.createdBy || '-'}</span>
                                                </div>
                                                {t.obj?.updatedBy && (
                                                    <div className="flex items-center gap-1" title="Alterado por">
                                                        <span className="w-1 h-1 rounded-full bg-orange-400 inline-block"></span>
                                                        <span className="truncate max-w-[60px]">{t.obj.updatedBy}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ), className: "hidden md:table-cell w-40"
                                    },
                                    {
                                        header: 'Valor', accessor: (t: any) => (
                                            <span className="font-black text-sm text-red-500">
                                                {currency(t.value)}
                                            </span>
                                        ), className: "text-right w-32"
                                    },
                                    {
                                        header: 'Status', accessor: (t: any) => t.status === 'paid' ? (
                                            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-black uppercase">Pago</span>
                                        ) : (
                                            <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded text-[10px] font-black uppercase">A Pagar</span>
                                        ), className: "text-center w-24"
                                    }
                                ]}
                                headerActions={
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setTransactionData(prev => ({ ...prev, type: 'entry' })); setTransactionModalOpen(true); }}
                                            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={!canWriteFinancial}
                                        >
                                            + Nova Despesa
                                        </button>
                                    </div>
                                }
                                actions={(t: any) => (
                                    <div className="flex items-center justify-center gap-2">
                                        {t.status !== 'paid' && (
                                            <button
                                                onClick={() => handleLiquidationClick(t.obj)}
                                                title="Pagar"
                                                className="p-1.5 bg-red-600 text-white rounded-lg hover:scale-105 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={!canWriteFinancial}
                                            >
                                                <ArrowDownCircle size={14} />
                                            </button>
                                        )}
                                        <select
                                            value={t.obj.status}
                                            onChange={(e) => updateInvoice({ ...t.obj, status: e.target.value as any })}
                                            className="text-[10px] font-black uppercase bg-transparent border border-slate-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50"
                                            disabled={!canWriteFinancial}
                                        >
                                            <option value="pendente">Pendente</option>
                                            <option value="paga">Paga</option>
                                            <option value="vencida">Vencida</option>
                                            <option value="cancelada">Cancelada</option>
                                        </select>
                                        <button
                                            onClick={() => handleDeleteTransaction(t)}
                                            title="Excluir"
                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                            disabled={!canWriteFinancial}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            />
                        </div>
                    )
                    }

                    {/* TAB: CONCILIAÇÃO BANCÁRIA */}
                    {
                        activeTab === 'reconciliation' && (
                            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2.5rem] p-10 text-center text-white shadow-2xl mb-8 relative overflow-hidden">
                                    <div className="relative z-10">
                                        <h2 className="text-2xl font-black mb-2">Conciliação Inteligente (OFX/CSV/PDF)</h2>
                                        <p className="opacity-80 max-w-xl mx-auto mb-6 text-sm">Importe seu extrato bancário (OFX, CSV ou PDF) e nosso sistema irá processar e importar os lançamentos automaticamente.</p>

                                        <input
                                            type="file"
                                            accept=".ofx,.csv,.txt,.pdf"
                                            className="hidden"
                                            id="bank-file-upload"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;

                                                addToast('Analisando arquivo...', 'info');

                                                try {
                                                    let text = '';
                                                    if (file.name.toLowerCase().endsWith('.pdf')) {
                                                        const arrayBuffer = await file.arrayBuffer();
                                                        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                                                        for (let i = 1; i <= pdf.numPages; i++) {
                                                            const page = await pdf.getPage(i);
                                                            const content = await page.getTextContent();

                                                            let lastY: number | undefined;
                                                            let pageText = '';
                                                            for (const item of content.items as any) {
                                                                const y = item.transform[5];
                                                                if (lastY !== undefined && Math.abs(lastY - y) > 2) {
                                                                    pageText += '\n';
                                                                } else if (lastY !== undefined && pageText.length > 0 && !pageText.endsWith(' ')) {
                                                                    pageText += ' ';
                                                                }
                                                                pageText += item.str;
                                                                lastY = y;
                                                            }
                                                            text += pageText + '\n';
                                                        }
                                                    } else {
                                                        text = await file.text();
                                                    }

                                                    processBankStatement(text, file.name);
                                                } catch (err) {
                                                    console.error(err);
                                                    addToast('Erro ao ler arquivo.', 'error');
                                                }
                                            }}
                                        />

                                        <div className="flex flex-col gap-4 items-center">
                                            <div className="flex flex-wrap gap-4 items-center justify-center">
                                                <label htmlFor="bank-file-upload" className="px-8 py-3 bg-white dark:bg-slate-800 text-blue-700 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform shadow-xl cursor-pointer inline-flex items-center gap-2">
                                                    <UploadCloud size={16} /> Fazer Upload de Arquivo
                                                </label>
                                                <button
                                                    onClick={() => setPasteModalOpen(true)}
                                                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform shadow-xl cursor-pointer flex items-center gap-2"
                                                >
                                                    <Layers size={16} /> Colar Texto
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    processBankStatement(MERCADO_PAGO_SAMPLE, 'sample.txt');
                                                    addToast('Modelo de exemplo carregado!', 'success');
                                                }}
                                                className="text-[10px] text-white/70 hover:text-white underline"
                                            >
                                                Carregar Modelo Exemplo (MP)
                                            </button>
                                        </div>


                                    </div>
                                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                                </div>

                                {isMatchingActive ? (
                                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-slate-700 dark:text-slate-200 dark:text-slate-200">Revisão de Importação</h3>
                                            <button
                                                onClick={() => {
                                                    setMatchingTransactions([]);
                                                    setIsMatchingActive(false);
                                                }}
                                                className="text-xs text-red-500 hover:underline"
                                            >
                                                Cancelar Importação
                                            </button>
                                        </div>

                                        {matchingTransactions.map((match) => (
                                            <div key={match.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${match.type === 'exit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {match.type === 'exit' ? 'Crédito / Saída' : 'Débito / Entrada'}
                                                        </span>
                                                        <span className="text-xs text-slate-400">{formatDateBR(match.date)}</span>
                                                    </div>
                                                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate" title={match.desc}>{match.desc}</p>
                                                    <p className="font-black text-lg text-slate-700 dark:text-slate-200 dark:text-slate-300 mt-1">{currency(match.amount)}</p>
                                                </div>

                                                <div className="flex flex-col gap-2 min-w-[200px]">
                                                    {match.matchQuality === 'high' ? (
                                                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                                            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 mb-2">
                                                                <CheckCircle2 size={14} />
                                                                <span className="text-[10px] font-black uppercase">Sugestão Encontrada</span>
                                                            </div>
                                                            <p className="text-xs font-medium text-indigo-900 dark:text-indigo-200 mb-2">{match.matchedInvoiceDesc}</p>
                                                            <button
                                                                onClick={async () => {
                                                                    await settleInvoice(match.matchedInvoiceId, bankAccounts[0]?.id, match.date, match.amount);
                                                                    setMatchingTransactions(prev => prev.filter(p => p.id !== match.id));
                                                                    addToast('Conciliado com sucesso!', 'success');
                                                                }}
                                                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
                                                            >
                                                                Confirmar Vínculo
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={async () => {
                                                                const invoiceNumber = match.docNumber || (match.id && match.id.length < 20 ? match.id : `OFX-${Date.now().toString().slice(-6)}`);

                                                                // Tentar encontrar parceiro pelo nome (Fuzzy Match simples)
                                                                const cleanMatchDesc = (match.desc || '').toLowerCase();
                                                                const matchedPartner = clients.find((c: any) =>
                                                                    cleanMatchDesc.includes((c.name || '').toLowerCase()) ||
                                                                    cleanMatchDesc.includes((c.fantasyName || '').toLowerCase())
                                                                );

                                                                await addInvoice({
                                                                    id: '',
                                                                    number: invoiceNumber,
                                                                    entityId: matchedPartner?.id || 'manual',
                                                                    entityName: matchedPartner?.name || match.desc || 'Não Identificado',
                                                                    cnpj: matchedPartner?.cnpj || '',
                                                                    date: match.date,
                                                                    value: match.amount,
                                                                    type: match.type,
                                                                    status: 'paga',
                                                                    category: 'Conciliação Bancária',
                                                                    details: match.desc,
                                                                    naturezaOperacao: match.type === 'exit' ? 'Venda (Importação Bancária)' : 'Compra (Importação Bancária)',
                                                                    items: [{
                                                                        productId: 'manual',
                                                                        description: match.desc || 'Lançamento Automático',
                                                                        quantity: 1,
                                                                        unitPrice: match.amount,
                                                                        total: match.amount,
                                                                        cfop: match.type === 'exit' ? '5102' : '1102' // Padrões fiscais
                                                                    }]
                                                                } as any);
                                                                setMatchingTransactions(prev => prev.filter(p => p.id !== match.id));
                                                                addToast('Lançamento criado com sucesso e integrado ao Fiscal!', 'success');
                                                            }}
                                                            className="w-full py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors"
                                                        >
                                                            Criar Novo Lançamento
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {matchingTransactions.length === 0 && (
                                            <div className="text-center py-10">
                                                <p className="text-slate-400 text-sm">Todas as transações do arquivo foram processadas.</p>
                                                <button
                                                    onClick={() => setIsMatchingActive(false)}
                                                    className="mt-4 text-indigo-500 text-xs font-bold uppercase hover:underline"
                                                >
                                                    Voltar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <Card title="Extrato Bancário (Não Conciliado)" className="h-96 flex flex-col items-center justify-center border-dashed border-2 bg-slate-50/50">
                                            <div className="text-center text-slate-400">
                                                <Building size={48} className="mx-auto mb-4 opacity-50" />
                                                <p className="font-bold text-sm">Selecione um arquivo para pré-visualizar</p>
                                                <p className="text-xs mt-2 max-w-xs mx-auto">Suporte nativo para arquivos .OFX (Padrão Bancário) e .CSV (Planilhas)</p>
                                            </div>
                                        </Card>
                                        <Card title="Lançamentos no Sistema (Pendentes)" className="h-96 overflow-y-auto custom-scrollbar">
                                            <div className="space-y-3 mt-4">
                                                {financialData.allTransactions.filter(t => t.status !== 'paid').slice(0, 5).map(t => (
                                                    <div key={t.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 dark:border-slate-800">
                                                        <div>
                                                            <p className="font-bold text-xs text-slate-900 dark:text-white">{t.desc}</p>
                                                            <p className="text-[10px] text-slate-400">{formatDateBR(t.date)}</p>
                                                        </div>
                                                        <span className="font-black text-sm text-slate-600 dark:text-slate-300">{currency(t.value)}</span>
                                                    </div>
                                                ))}
                                                {financialData.allTransactions.filter(t => t.status !== 'paid').length === 0 && (
                                                    <div className="text-center py-10 text-slate-400">
                                                        <p className="text-sm">Tudo conciliado! 🎉</p>
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    </div>
                                )}
                            </div>
                        )
                    }

                    {/* TAB: ADIANTAMENTOS */}
                    {
                        activeTab === 'advances' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-4 duration-500">
                                <div className="lg:col-span-2">
                                    <Card title="Solicitações de Adiantamento" className="min-h-[500px]">
                                        <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 rounded-2xl flex gap-4 items-start">
                                            <AlertCircle className="text-orange-600 shrink-0" size={20} />
                                            <div>
                                                <h4 className="text-xs font-black text-orange-800 dark:text-orange-400 uppercase tracking-wide">Política da Empresa</h4>
                                                <p className="text-xs text-orange-600 dark:text-orange-300 mt-1">Adiantamentos salariais são limitados a 40% do salário base e devem ser solicitados até o dia 15.</p>
                                            </div>
                                        </div>

                                        <div className="mt-8 text-center py-20">
                                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                                <CheckCircle2 size={32} />
                                            </div>
                                            <h3 className="font-black text-slate-900 dark:text-white text-lg">Tudo em dia!</h3>
                                            <p className="text-slate-500 text-sm mt-2">Nenhuma solicitação pendente de aprovação.</p>
                                            <button className="mt-6 px-6 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                Ver Histórico
                                            </button>
                                        </div>
                                    </Card>
                                </div>
                                <div>
                                    <Card className="bg-slate-900 text-white h-auto p-8 rounded-[2.5rem]">
                                        <h3 className="text-xl font-black mb-6">Novo Adiantamento</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-slate-400">Colaborador</label>
                                                <select className="w-full bg-slate-800 border-none rounded-xl p-3 text-sm font-bold mt-1 text-white">
                                                    <option>Selecione...</option>
                                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-slate-400">Valor (R$)</label>
                                                <input type="number" placeholder="0,00" className="w-full bg-slate-800 border-none rounded-xl p-3 text-sm font-bold mt-1 text-white" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-slate-400">Data Prevista</label>
                                                <input type="date" className="w-full bg-slate-800 border-none rounded-xl p-3 text-sm font-bold mt-1 text-white" />
                                            </div>
                                            <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-900/30 mt-4 transition-all active:scale-95">
                                                Aprovar Adiantamento
                                            </button>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        )
                    }

                    {/* TAB: DRE GERENCIAL */}
                    {
                        activeTab === 'dre' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                                        <div className="text-center md:text-left">
                                            <h2 className="text-3xl font-black mb-2">DRE Gerencial {filterYear}</h2>
                                            <p className="text-slate-400 text-sm max-w-md">Visão analítica de resultados baseada nos dados apurados pelo DP, Contabilidade e Financeiro.</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="text-center">
                                                <p className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] mb-1">Lucro Líquido</p>
                                                <p className={`text-3xl font-black ${financialData.dreData.ebitda >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {currency(financialData.dreData.ebitda)}
                                                </p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] mb-1">Margem Líquida</p>
                                                <p className="text-3xl font-black text-white">
                                                    {financialData.dreData.revenue > 0 ? ((financialData.dreData.ebitda / financialData.dreData.revenue) * 100).toFixed(1) : 0}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full"></div>
                                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 blur-[80px] rounded-full"></div>
                                </div>

                                <Card className="p-0 overflow-hidden shadow-xl border-slate-100 dark:border-slate-800">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-900 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100 dark:border-slate-800">
                                                <th className="p-6">Indicador de Resultado</th>
                                                <th className="p-6 text-right">Valor Período</th>
                                                <th className="p-6 text-right">% Receita</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {/* RECEITA */}
                                            <tr className="bg-emerald-50/10 hover:bg-emerald-50/20 transition-colors">
                                                <td className="p-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600"><TrendingUp size={16} /></div>
                                                        <div>
                                                            <p className="font-black text-sm text-slate-800 dark:text-white">RECEITA BRUTA TOTAL</p>
                                                            <p className="text-[10px] text-slate-400">Vendas, Serviços e Entradas Diversas</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6 text-right font-black text-emerald-600">{currency(financialData.dreData.revenue)}</td>
                                                <td className="p-6 text-right text-xs font-bold text-slate-400">100.0%</td>
                                            </tr>

                                            {/* IMPOSTOS */}
                                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                                <td className="p-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600"><Percent size={16} /></div>
                                                        <div>
                                                            <p className="font-black text-xs text-slate-700 dark:text-slate-200">(-) IMPOSTOS S/ VENDAS</p>
                                                            <p className="text-[10px] text-slate-400">DAS, PIS, COFINS (Apurado no Fiscal)</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6 text-right font-bold text-red-500">({currency(financialData.dreData.taxesOnSales)})</td>
                                                <td className="p-6 text-right text-xs font-medium text-slate-400">
                                                    {financialData.dreData.revenue > 0 ? ((financialData.dreData.taxesOnSales / financialData.dreData.revenue) * 100).toFixed(1) : 0}%
                                                </td>
                                            </tr>

                                            {/* RECEITA LIQUIDA */}
                                            <tr className="bg-slate-50 dark:bg-slate-900/50 font-black">
                                                <td className="p-6 p-6 pl-12">(=) RECEITA LÍQUIDA</td>
                                                <td className="p-6 text-right text-slate-800 dark:text-white">{currency(financialData.dreData.netRevenue)}</td>
                                                <td className="p-6 text-right text-xs text-slate-400">
                                                    {financialData.dreData.revenue > 0 ? ((financialData.dreData.netRevenue / financialData.dreData.revenue) * 100).toFixed(1) : 0}%
                                                </td>
                                            </tr>

                                            {/* DP / PESSOAL */}
                                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                                <td className="p-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600"><Users size={16} /></div>
                                                        <div>
                                                            <p className="font-black text-xs text-slate-700 dark:text-slate-200">(-) DESPESAS COM PESSOAL (DP)</p>
                                                            <p className="text-[10px] text-slate-400">Salários, Pró-labore, FGTS, INSS</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6 text-right font-bold text-red-500">({currency(financialData.dreData.personnelCosts)})</td>
                                                <td className="p-6 text-right text-xs font-medium text-slate-400">
                                                    {financialData.dreData.revenue > 0 ? ((financialData.dreData.personnelCosts / financialData.dreData.revenue) * 100).toFixed(1) : 0}%
                                                </td>
                                            </tr>

                                            {/* FIXAS */}
                                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                                <td className="p-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600"><Building size={16} /></div>
                                                        <div>
                                                            <p className="font-black text-xs text-slate-700 dark:text-slate-200">(-) CUSTOS E DESPESAS FIXAS</p>
                                                            <p className="text-[10px] text-slate-400">Aluguel, Luz, Água, Internet</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6 text-right font-bold text-red-500">({currency(financialData.dreData.fixedExpenses)})</td>
                                                <td className="p-6 text-right text-xs font-medium text-slate-400">
                                                    {financialData.dreData.revenue > 0 ? ((financialData.dreData.fixedExpenses / financialData.dreData.revenue) * 100).toFixed(1) : 0}%
                                                </td>
                                            </tr>

                                            {/* OUTROS */}
                                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                                <td className="p-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600"><Layers size={16} /></div>
                                                        <div>
                                                            <p className="font-black text-xs text-slate-700 dark:text-slate-200">(-) OUTRAS DESPESAS OPERACIONAIS</p>
                                                            <p className="text-[10px] text-slate-400">Compras Diversas, Manutenção</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6 text-right font-bold text-red-500">({currency(financialData.dreData.otherExpenses)})</td>
                                                <td className="p-6 text-right text-xs font-medium text-slate-400">
                                                    {financialData.dreData.revenue > 0 ? ((financialData.dreData.otherExpenses / financialData.dreData.revenue) * 100).toFixed(1) : 0}%
                                                </td>
                                            </tr>

                                            {/* EBITDA */}
                                            <tr className="bg-slate-900 text-white font-black">
                                                <td className="p-6 rounded-bl-[2.5rem]">(=) EBITDA / RESULTADO OPERACIONAL</td>
                                                <td className="p-6 text-right text-emerald-400">{currency(financialData.dreData.ebitda)}</td>
                                                <td className="p-6 text-right text-xs text-slate-500 rounded-br-[2.5rem]">
                                                    {financialData.dreData.revenue > 0 ? ((financialData.dreData.ebitda / financialData.dreData.revenue) * 100).toFixed(1) : 0}%
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </Card>
                            </div>
                        )
                    }

                    {/* TAB: PREVISÃO DE CAIXA */}
                    {
                        activeTab === 'forecast' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Card className="p-6 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-800 border-indigo-100 dark:border-slate-700">
                                        <h4 className="text-[10px] uppercase font-black text-indigo-500 tracking-widest mb-4">Meta de Saldo (30 Dias)</h4>
                                        <div className="flex items-end gap-2">
                                            <span className="text-3xl font-black text-slate-900 dark:text-white">{currency(financialData.balance + 15000)}</span>
                                            <span className="text-xs font-bold text-emerald-500 mb-2 flex items-center gap-1"><TrendingUp size={12} /> +12%</span>
                                        </div>
                                        <div className="mt-4 w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                            <div className="bg-indigo-600 h-full w-[65%]"></div>
                                        </div>
                                    </Card>
                                    <Card className="p-6">
                                        <h4 className="text-[10px] uppercase font-black text-emerald-500 tracking-widest mb-4">Entradas Previstas</h4>
                                        <p className="text-3xl font-black text-slate-900 dark:text-white">{currency(financialData.totalReceivable)}</p>
                                        <p className="text-[10px] text-slate-400 mt-2">Baseado em notas fiscais e boletos emitidos.</p>
                                    </Card>
                                    <Card className="p-6">
                                        <h4 className="text-[10px] uppercase font-black text-red-500 tracking-widest mb-4">Saídas Previstas</h4>
                                        <p className="text-3xl font-black text-slate-900 dark:text-white">{currency(financialData.totalPayable)}</p>
                                        <p className="text-[10px] text-slate-400 mt-2">Inclui Folha (DP) e Impostos (Contábil).</p>
                                    </Card>
                                </div>

                                <Card title="Processamento de Fluxo de Caixa Futuro" className="min-h-[400px]">
                                    <div className="h-80 w-full mt-6">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={[
                                                { name: 'Hoje', saldo: financialData.balance },
                                                { name: '7 dias', saldo: financialData.balance + (financialData.totalReceivable * 0.2) - (financialData.totalPayable * 0.3) },
                                                { name: '15 dias', saldo: financialData.balance + (financialData.totalReceivable * 0.5) - (financialData.totalPayable * 0.6) },
                                                { name: '21 dias', saldo: financialData.balance + (financialData.totalReceivable * 0.8) - (financialData.totalPayable * 0.8) },
                                                { name: '30 dias', saldo: financialData.balance + financialData.totalReceivable - financialData.totalPayable },
                                            ]}>
                                                <defs>
                                                    <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                                <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                                                <YAxis hide />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                    formatter={(value) => currency(value as number)}
                                                />
                                                <Area isAnimationActive={false} type="monotone" dataKey="saldo" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorSaldo)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex items-center gap-4 border border-slate-100 dark:border-slate-800">
                                        <Info className="text-indigo-600" size={20} />
                                        <p className="text-xs text-slate-500 font-medium">A projeção utiliza o **Método Direto**, considerando faturamento real emitido e obrigações geradas pelos módulos de Folha e Fiscal.</p>
                                    </div>
                                </Card>
                            </div>
                        )
                    }

                    {/* TAB: AGING (30/60/90+ DIAS) */}
                    {activeTab === 'aging' && (() => {
                        const todayZero = new Date();
                        todayZero.setHours(0, 0, 0, 0);

                        const aging = {
                            overdue: { rec: 0, pay: 0, count: 0 },
                            d0_30: { rec: 0, pay: 0, count: 0 },
                            d31_60: { rec: 0, pay: 0, count: 0 },
                            d61_90: { rec: 0, pay: 0, count: 0 },
                            d90_plus: { rec: 0, pay: 0, count: 0 },
                            items: [] as any[]
                        };

                        invoices.forEach(inv => {
                            if (inv.status === 'paga' || inv.status === 'cancelada') return;
                            const dueDate = parseDateSafe(inv.date);
                            const diffDays = Math.floor((dueDate.getTime() - todayZero.getTime()) / (1000 * 60 * 60 * 24));
                            const isReceivable = inv.type === 'exit' || inv.type === 'service';

                            let bucketLabel = '0 - 30 dias';
                            if (diffDays < 0) {
                                bucketLabel = 'Vencido';
                                if (isReceivable) aging.overdue.rec += inv.value;
                                else aging.overdue.pay += inv.value;
                                aging.overdue.count++;
                            } else if (diffDays <= 30) {
                                bucketLabel = '0 - 30 dias';
                                if (isReceivable) aging.d0_30.rec += inv.value;
                                else aging.d0_30.pay += inv.value;
                                aging.d0_30.count++;
                            } else if (diffDays <= 60) {
                                bucketLabel = '31 - 60 dias';
                                if (isReceivable) aging.d31_60.rec += inv.value;
                                else aging.d31_60.pay += inv.value;
                                aging.d31_60.count++;
                            } else if (diffDays <= 90) {
                                bucketLabel = '61 - 90 dias';
                                if (isReceivable) aging.d61_90.rec += inv.value;
                                else aging.d61_90.pay += inv.value;
                                aging.d61_90.count++;
                            } else {
                                bucketLabel = '+90 dias';
                                if (isReceivable) aging.d90_plus.rec += inv.value;
                                else aging.d90_plus.pay += inv.value;
                                aging.d90_plus.count++;
                            }

                            aging.items.push({
                                ...inv,
                                diffDays,
                                bucketLabel,
                                isReceivable
                            });
                        });

                        const chartData = [
                            { name: 'Vencido', Receber: aging.overdue.rec, Pagar: aging.overdue.pay },
                            { name: '0-30 dias', Receber: aging.d0_30.rec, Pagar: aging.d0_30.pay },
                            { name: '31-60 dias', Receber: aging.d31_60.rec, Pagar: aging.d31_60.pay },
                            { name: '61-90 dias', Receber: aging.d61_90.rec, Pagar: aging.d61_90.pay },
                            { name: '+90 dias', Receber: aging.d90_plus.rec, Pagar: aging.d90_plus.pay },
                        ];

                        return (
                            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                {/* SUMMARY CARDS BUCKETS */}
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black uppercase text-red-500 tracking-wider">Vencidos (Atraso)</span>
                                            <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-[10px] font-bold">{aging.overdue.count} títulos</span>
                                        </div>
                                        <p className="text-xs font-bold text-gray-500">Rec: <span className="text-emerald-600">{currency(aging.overdue.rec)}</span></p>
                                        <p className="text-xs font-bold text-gray-500 mt-0.5">Pag: <span className="text-red-600">{currency(aging.overdue.pay)}</span></p>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">0 a 30 Dias</span>
                                            <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">{aging.d0_30.count} títulos</span>
                                        </div>
                                        <p className="text-xs font-bold text-gray-500">Rec: <span className="text-emerald-600">{currency(aging.d0_30.rec)}</span></p>
                                        <p className="text-xs font-bold text-gray-500 mt-0.5">Pag: <span className="text-red-600">{currency(aging.d0_30.pay)}</span></p>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">31 a 60 Dias</span>
                                            <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold">{aging.d31_60.count} títulos</span>
                                        </div>
                                        <p className="text-xs font-bold text-gray-500">Rec: <span className="text-emerald-600">{currency(aging.d31_60.rec)}</span></p>
                                        <p className="text-xs font-bold text-gray-500 mt-0.5">Pag: <span className="text-red-600">{currency(aging.d31_60.pay)}</span></p>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-purple-200 dark:border-purple-900/50 shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black uppercase text-purple-600 tracking-wider">61 a 90 Dias</span>
                                            <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-bold">{aging.d61_90.count} títulos</span>
                                        </div>
                                        <p className="text-xs font-bold text-gray-500">Rec: <span className="text-emerald-600">{currency(aging.d61_90.rec)}</span></p>
                                        <p className="text-xs font-bold text-gray-500 mt-0.5">Pag: <span className="text-red-600">{currency(aging.d61_90.pay)}</span></p>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">+90 Dias</span>
                                            <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">{aging.d90_plus.count} títulos</span>
                                        </div>
                                        <p className="text-xs font-bold text-gray-500">Rec: <span className="text-emerald-600">{currency(aging.d90_plus.rec)}</span></p>
                                        <p className="text-xs font-bold text-gray-500 mt-0.5">Pag: <span className="text-red-600">{currency(aging.d90_plus.pay)}</span></p>
                                    </div>
                                </div>

                                {/* CHART */}
                                <Card className="p-6 bg-white dark:bg-slate-900 border-none shadow-sm rounded-3xl">
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                        <Calendar className="text-indigo-500" size={20} />
                                        Análise de Aging por Intervalo de Vencimento
                                    </h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                                                <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} tickFormatter={v => `R$ ${v/1000}k`} />
                                                <Tooltip formatter={(value: number) => currency(value)} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                                                <Legend />
                                                <Bar dataKey="Receber" fill="#10b981" radius={[6, 6, 0, 0]} />
                                                <Bar dataKey="Pagar" fill="#ef4444" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                {/* DETAILED LIST */}
                                <UniversalList
                                    title="Títulos em Carteira (Aging)"
                                    subtitle="Classificação por tempo de vencimento"
                                    icon={Calendar}
                                    data={aging.items}
                                    columns={[
                                        { header: 'Entidade', accessor: (i: any) => <span className="font-bold text-slate-800 dark:text-slate-200">{i.entityName || 'Sem nome'}</span> },
                                        { header: 'Tipo', accessor: (i: any) => <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded ${i.isReceivable ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{i.isReceivable ? 'A Receber' : 'A Pagar'}</span> },
                                        { header: 'Vencimento', accessor: (i: any) => formatDateBR(i.date) },
                                        { header: 'Prazo', accessor: (i: any) => i.diffDays < 0 ? <span className="text-red-600 font-bold">Atrasado ({Math.abs(i.diffDays)}d)</span> : <span className="text-slate-600 font-bold">{i.diffDays} dias restantes</span> },
                                        { header: 'Faixa', accessor: (i: any) => <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px] font-bold text-slate-600 dark:text-slate-300">{i.bucketLabel}</span> },
                                        { header: 'Valor', accessor: (i: any) => <span className="font-black text-slate-900 dark:text-white">{currency(i.value)}</span>, className: 'text-right' },
                                    ]}
                                />
                            </div>
                        );
                    })()}

                    <LiquidationModal
                        isOpen={liquidationModalOpen}
                        onClose={() => setLiquidationModalOpen(false)}
                        selectedInvoice={selectedInvoice}
                        liquidationData={liquidationData}
                        setLiquidationData={setLiquidationData}
                        bankAccounts={bankAccounts}
                        onConfirm={confirmLiquidation}
                        currencyFormatter={currency}
                    />

                    <TransactionModal
                        isOpen={transactionModalOpen}
                        onClose={() => setTransactionModalOpen(false)}
                        transactionData={transactionData}
                        setTransactionData={setTransactionData}
                        operationTypes={operationTypes}
                        onConfirm={handleSaveTransaction}
                    />

                    <PasteStatementModal
                        isOpen={pasteModalOpen}
                        onClose={() => setPasteModalOpen(false)}
                        pastedText={pastedText}
                        setPastedText={setPastedText}
                        onProcess={(text) => processBankStatement(text, 'pasted.txt')}
                    />
                </div >
            </div >
        </div >
    );
};
