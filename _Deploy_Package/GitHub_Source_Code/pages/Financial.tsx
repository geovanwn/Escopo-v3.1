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
    Building, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw,
    ArrowRight, CreditCard, Search, FileText, Lock, MoreHorizontal, Layers, PieChart as PieChartIcon, UploadCloud, Trash2, SquareActivity
} from 'lucide-react';
import { formatDateBR, parseDateSafe } from '../utils/formatters';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { parseOFX } from '../utils/bankParsers';


const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const Financial: React.FC = () => {
    const {
        invoices, employees, theme, selectedCompany, bankAccounts,
        settleInvoice, addInvoice, updateInvoice, addBankTransaction,
        currentUser, userEmail, addAuditLog, generateDRE, calculateProductTaxes,
        userRole, userPermissions, deleteItem, operationTypes
    } = useData();
    const { addToast } = useToast();
    const navigate = useNavigate();

    // Tabs
    const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'receivables' | 'payables' | 'reconciliation' | 'advances' | 'dre' | 'forecast'>('overview');

    // Filters
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    // Reconciliation Match State
    const [matchingTransactions, setMatchingTransactions] = useState<any[]>([]);
    const [isMatchingActive, setIsMatchingActive] = useState(false);


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
        const relevantInvoices = invoices.filter(i => parseDateSafe(i.date).getFullYear() === filterYear);

        // Receivables List (Contas a Receber)
        // Includes: 
        // 1. All service invoices (prestados) from ALL periods
        // 2. Yearly exit invoices (vendas)
        // 3. Yearly receipts (entrada)
        const receivables = invoices
            .filter(i => {
                if (i.status === 'cancelada') return false;
                // Show all service prestados across all years
                if (i.type === 'service' && (i.naturezaOperacao === 'Prestação de Serviço' || !i.naturezaOperacao)) return true;

                // Show other types only for the selected year
                if (parseDateSafe(i.date).getFullYear() !== filterYear) return false;
                if (i.type === 'exit') return true;
                if (i.type === 'receipt' && i.naturezaOperacao?.includes('Entrada')) return true;
                return false;
            })
            .map(i => ({
                id: i.id,
                title: i.entityName || 'Consumidor',
                desc: `${i.type === 'service' ? 'Serviço' : i.type === 'receipt' ? 'Recibo' : 'NF'} #${i.number}`,
                value: i.value,
                date: i.date,
                status: i.status === 'paga' ? 'paid' : (parseDateSafe(i.date) < new Date() ? 'overdue' : 'pending'),
                type: 'receivable',
                obj: i
            }));

        // Payables List (Contas a Pagar)
        // Includes:
        // 1. All service tomados (despesas) from ALL periods
        // 2. Yearly entry invoices (compras)
        // 3. Yearly receipts (saída)
        const payables = invoices
            .filter(i => {
                if (i.status === 'cancelada') return false;
                // Show all service tomados across all years
                if (i.type === 'service' && i.naturezaOperacao === 'Tomada de Serviço') return true;

                // Show other types only for the selected year
                if (parseDateSafe(i.date).getFullYear() !== filterYear) return false;
                if (i.type === 'entry' || i.type === 'payroll') return true;
                if (i.type === 'receipt' && i.naturezaOperacao?.includes('Saída')) return true;
                return false;
            })
            .map(i => ({
                id: i.id,
                title: i.entityName || 'Fornecedor',
                desc: `${i.type === 'service' ? 'Serviço Tomado' : i.type === 'payroll' ? 'Folha' : i.type === 'receipt' ? 'Recibo' : 'Compra'} #${i.number}`,
                value: i.value,
                date: i.date,
                status: i.status === 'paga' ? 'paid' : 'pending',
                type: 'payable',
                obj: i
            }));

        // Total Receivable for the KPI (Matching the List)
        const totalReceivable = receivables.reduce((sum, r) => sum + r.value, 0);

        // Total Payable for the KPI (Matching the List)
        const totalPayable = payables.reduce((sum, p) => sum + p.value, 0);

        // Merged List for "Movimentação" (Extrato Unificado)
        // We keep it year-filtered to be consistent with a "Statement" view
        const yearReceivables = relevantInvoices
            .filter(i => (i.type === 'exit' || (i.type === 'service' && i.naturezaOperacao !== 'Tomada de Serviço')) && i.status !== 'cancelada')
            .map(i => ({
                id: i.id,
                title: i.entityName || 'Consumidor',
                desc: `${i.type === 'service' ? 'Serviço' : 'NF'} #${i.number}`,
                value: i.value,
                date: i.date,
                status: i.status === 'paga' ? 'paid' : (parseDateSafe(i.date) < new Date() ? 'overdue' : 'pending'),
                type: 'receivable',
                obj: i
            }));

        const allTransactions = [...yearReceivables, ...payables]
            .map(t => ({ ...t, key: `${t.type}-${t.id}` }))
            .sort((a, b) => parseDateSafe(b.date).getTime() - parseDateSafe(a.date).getTime());

        // Chart Data (Yearly)
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const currentMonth = new Date().getMonth();
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
            const mIdx = (currentMonth - i + 12) % 12;
            const entries = relevantInvoices
                .filter(inv => parseDateSafe(inv.date).getMonth() === mIdx && (inv.type === 'exit' || (inv.type === 'service' && inv.naturezaOperacao !== 'Tomada de Serviço')))
                .reduce((sum, inv) => sum + inv.value, 0);
            const exits = relevantInvoices
                .filter(inv => parseDateSafe(inv.date).getMonth() === mIdx && (inv.type === 'entry' || (inv.type === 'service' && inv.naturezaOperacao === 'Tomada de Serviço')))
                .reduce((sum, inv) => sum + inv.value, 0);
            last6Months.push({ name: months[mIdx], entrada: entries, saida: exits });
        }

        // Pie Chart Data: Receivables Status
        const paidReceivables = receivables.filter(r => r.obj.status === 'paga').reduce((sum, r) => sum + r.value, 0);
        const pendingReceivables = totalReceivable - paidReceivables;
        const receivablesPieData = [
            { name: 'Recebido', value: paidReceivables, color: '#10b981' },
            { name: 'Pendente', value: pendingReceivables, color: '#e2e8f0' }
        ];

        // Pie Chart Data: Payables Status
        const paidPayables = payables.filter(p => p.obj.status === 'paga').reduce((sum, p) => sum + p.value, 0);
        const pendingPayables = totalPayable - paidPayables;
        const payablesPieData = [
            { name: 'Pago', value: paidPayables, color: '#ef4444' },
            { name: 'Pendente', value: pendingPayables, color: '#e2e8f0' }
        ];

        // Pie Chart Data: Cash Flow Proportion
        const cashFlowPieData = [
            { name: 'Entradas', value: totalReceivable, color: '#10b981' },
            { name: 'Saídas', value: totalPayable, color: '#f43f5e' }
        ];

        // Pie Chart Data: Advances (Mock or Filtered from data if exists)
        // Since advances aren't explicitly tracked in the current schema as a separate list, 
        // we'll search for 'Adiantamento' in naturalezaOperacao or desc if available.
        const advancesTotal = invoices.filter(i => i.naturezaOperacao?.toLowerCase().includes('adiantamento')).reduce((sum, i) => sum + i.value, 0);
        const advancesPieData = [
            { name: 'Adiantado', value: advancesTotal, color: '#f59e0b' },
            { name: 'Disponível', value: Math.max(0, totalReceivable - advancesTotal), color: '#e2e8f0' }
        ];

        return {
            receivables,
            payables,
            allTransactions,
            totalReceivable,
            totalPayable,
            chartData: last6Months,
            balance: totalReceivable - totalPayable,
            receivablesPieData,
            payablesPieData,
            cashFlowPieData,
            advancesPieData
        };
    }, [invoices, filterYear]);

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
        } catch (e) {
            console.error(e);
            addToast('Erro ao salvar lançamento', 'error');
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
        } catch (error) {
            console.error('Erro ao excluir transação:', error);
            addToast('Erro ao excluir transação', 'error');
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
        <div className="flex flex-col h-[calc(100vh-2rem)] bg-slate-50 -m-6 p-6 overflow-hidden">
            {/* TOP HEADER BAR */}
            <header className="flex justify-between items-center mb-6 shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200">
                        <Wallet className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Gestão Financeira</h1>
                        <p className="text-xs text-gray-500 font-medium">Controle de Fluxo de Caixa e Tesouraria</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
                    <button
                        onClick={() => navigate('/app/reports')}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                        <Download size={16} />
                        Relatórios
                    </button>
                    <div className="h-6 w-px bg-gray-200 mx-1"></div>
                    <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
                        <Filter size={18} />
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                        title="Atualizar"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col overflow-hidden gap-6">

                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-default">
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Saldo Disponível</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{currency(bankAccounts.reduce((acc, b) => acc + b.balance, 0))}</p>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-lg group-hover:scale-110 transition-transform">
                            <Wallet className="w-5 h-5 text-emerald-600" />
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-default">
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total a Receber</p>
                            <p className="text-2xl font-bold text-emerald-600 mt-1">{currency(financialData.totalReceivable)}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg group-hover:scale-110 transition-transform">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-default">
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total a Pagar</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">{currency(financialData.totalPayable)}</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg group-hover:scale-110 transition-transform">
                            <ArrowDownCircle className="w-5 h-5 text-red-600" />
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-xl text-white shadow-lg shadow-indigo-500/20 flex items-center justify-between relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">Saldo Projetado</p>
                            <p className="text-xl font-bold mt-1">{currency(financialData.balance)}</p>
                        </div>
                        <Building className="w-8 h-8 text-white/20 absolute right-4 bottom-4" />
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex gap-2 p-1 bg-white border border-gray-200 rounded-xl w-full overflow-x-auto no-scrollbar shrink-0 shadow-sm">
                    {[
                        { id: 'overview', label: 'Visão Geral', icon: Layers },
                        { id: 'transactions', label: 'Extrato Unificado', icon: FileText },
                        { id: 'receivables', label: 'A Receber', icon: ArrowUpCircle },
                        { id: 'payables', label: 'A Pagar', icon: ArrowDownCircle },
                        { id: 'reconciliation', label: 'Conciliação', icon: CheckCircle2 },
                        { id: 'advances', label: 'Adiantamentos', icon: Banknote },
                        { id: 'dre', label: 'DRE Gerencial', icon: FileText },
                        { id: 'forecast', label: 'Previsão de Caixa', icon: TrendingUp },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                            flex items-center gap-2 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap
                            ${activeTab === tab.id
                                    ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                }
                        `}
                        >
                            <tab.icon size={14} className={activeTab === tab.id ? 'text-emerald-600' : 'text-gray-400'} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-4">
                    {/* TAB: OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                            {/* SECTION 1: TRENDS CHART (New) */}
                            <Card className="p-6 bg-white dark:bg-slate-900 border-none shadow-sm rounded-3xl">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                            <TrendingUp className="text-emerald-500" size={20} />
                                            Fluxo de Caixa (Últimos 6 Meses)
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium">Comparativo de Receitas vs Despesas</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-lg">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-[10px] font-bold text-emerald-700 uppercase">Entradas</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 rounded-lg">
                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                            <span className="text-[10px] font-bold text-red-700 uppercase">Saídas</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={financialData.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorEntrada" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorSaida" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                                tickFormatter={(value) => `R$ ${value / 1000}k`}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                                itemStyle={{ color: '#fff', padding: 0 }}
                                                formatter={(value: number) => currency(value)}
                                                cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="entrada"
                                                name="Receitas"
                                                stroke="#10b981"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorEntrada)"
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="saida"
                                                name="Despesas"
                                                stroke="#ef4444"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorSaida)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>

                            {/* SECTION 2: PIE CHARTS GRID */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { title: 'Contas a Receber', data: financialData.receivablesPieData, icon: ArrowUpCircle, color: 'emerald' },
                                    { title: 'Contas a Pagar', data: financialData.payablesPieData, icon: ArrowDownCircle, color: 'red' },
                                    { title: 'Proporção de Fluxo', data: financialData.cashFlowPieData, icon: SquareActivity, color: 'blue' },
                                    { title: 'Adiantamentos', data: financialData.advancesPieData, icon: Banknote, color: 'amber' }
                                ].map((chart, idx) => (
                                    <Card key={idx} className="p-5 flex flex-col shadow-sm rounded-3xl bg-white dark:bg-slate-900 border-none transition-all hover:translate-y-[-2px]">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className={`p-1.5 rounded-lg bg-${chart.color}-50`}>
                                                <chart.icon size={14} className={`text-${chart.color}-500`} />
                                            </div>
                                            <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{chart.title}</h4>
                                        </div>

                                        <div className="h-40 w-full relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={chart.data}
                                                        innerRadius={40}
                                                        outerRadius={60}
                                                        paddingAngle={4}
                                                        dataKey="value"
                                                        stroke="none"
                                                        cornerRadius={4}
                                                    >
                                                        {chart.data.map((entry: any, index: number) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }}
                                                        itemStyle={{ color: '#fff' }}
                                                        formatter={(value: number) => currency(value)}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            {/* Center Label using absolute positioning */}
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="text-center">
                                                    <span className="text-[10px] font-bold text-slate-400 block">Total</span>
                                                    <span className="text-xs font-black text-slate-700 dark:text-white">
                                                        {currency(chart.data.reduce((acc: number, curr: any) => acc + curr.value, 0))}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 mt-2">
                                            {chart.data.map((item: any) => (
                                                <div key={item.name} className="flex justify-between items-center text-[10px]">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                                                        <span className="font-bold text-slate-500">{item.name}</span>
                                                    </div>
                                                    <span className="font-bold text-slate-700">{currency(item.value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
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
                                    { header: 'Data', accessor: (t: any) => formatDateBR(t.date), className: "font-bold text-slate-600 w-32" },
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
                                            <div className="flex flex-col gap-0.5 text-[9px] text-gray-500">
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
                                        <button className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 transition-colors">
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
                                    { header: 'Vencimento', accessor: (t: any) => formatDateBR(t.date), className: "font-bold text-slate-600 w-32" },
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
                                            <div className="flex flex-col gap-0.5 text-[9px] text-gray-500">
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
                                    { header: 'Vencimento', accessor: (t: any) => formatDateBR(t.date), className: "font-bold text-slate-600 w-32" },
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
                                            <div className="flex flex-col gap-0.5 text-[9px] text-gray-500">
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
                                    </div>
                                )}
                            />
                        </div>
                    )}

                    {/* TAB: CONCILIAÇÃO BANCÁRIA */}
                    {activeTab === 'reconciliation' && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2.5rem] p-10 text-center text-white shadow-2xl mb-8 relative overflow-hidden">
                                <div className="relative z-10">
                                    <h2 className="text-2xl font-black mb-2">Conciliação Inteligente OFX/CSV</h2>
                                    <p className="opacity-80 max-w-xl mx-auto mb-6 text-sm">Importe seu extrato bancário (OFX, CSV ou PDF Texto) e nosso sistema irá processar e importar os lançamentos automaticamente.</p>

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
                                                const text = await file.text();
                                                const matches: any[] = [];

                                                if (file.name.toLowerCase().endsWith('.ofx')) {
                                                    const transactionMatches = [...text.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)];

                                                    for (const match of transactionMatches) {
                                                        const block = match[1];
                                                        const dateMatch = block.match(/<DTPOSTED>(.*?)(\r|\n|<)/);
                                                        const amountMatch = block.match(/<TRNAMT>(.*?)(\r|\n|<)/);
                                                        const memoMatch = block.match(/<MEMO>(.*?)(\r|\n|<)/);
                                                        const fitidMatch = block.match(/<FITID>(.*?)(\r|\n|<)/);

                                                        if (dateMatch && amountMatch) {
                                                            const rawDate = dateMatch[1].trim().substring(0, 8);
                                                            const date = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
                                                            const amountStr = amountMatch[1].trim().replace(',', '.');
                                                            const amount = parseFloat(amountStr);
                                                            const desc = memoMatch ? memoMatch[1].trim() : 'OFX Transaction';
                                                            const fitid = fitidMatch ? fitidMatch[1].trim() : String(Math.random());
                                                            const type = amount < 0 ? 'exit' : 'entry';
                                                            const absAmount = Math.abs(amount);

                                                            // 1. Find Exact Amount Match within +/- 3 days
                                                            const targetDate = new Date(date);
                                                            const existingMatch = invoices.find(inv => {
                                                                const invDate = new Date(inv.date);
                                                                const diffTime = Math.abs(targetDate.getTime() - invDate.getTime());
                                                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                                                return (
                                                                    Math.abs(inv.value - absAmount) < 0.05 && // Float tolerance
                                                                    diffDays <= 3 &&
                                                                    inv.status !== 'paga' &&
                                                                    inv.type === type
                                                                );
                                                            });

                                                            matches.push({
                                                                id: fitid,
                                                                date,
                                                                desc,
                                                                amount: absAmount,
                                                                type,
                                                                matchQuality: existingMatch ? 'high' : 'none',
                                                                matchedInvoiceId: existingMatch?.id || null,
                                                                matchedInvoiceDesc: existingMatch ? `${existingMatch.number} - ${existingMatch.entityName}` : null
                                                            });
                                                        }
                                                    }
                                                }

                                                if (matches.length > 0) {
                                                    setMatchingTransactions(matches);
                                                    setIsMatchingActive(true);
                                                    addToast(`${matches.length} transações analisadas. Revise as conciliações abaixo.`, 'success');
                                                } else {
                                                    addToast('Nenhuma transação identificada no arquivo.', 'warning');
                                                }

                                            } catch (err) {
                                                console.error(err);
                                                addToast('Erro ao ler arquivo.', 'error');
                                            }
                                        }}
                                    />

                                    <label htmlFor="bank-file-upload" className="px-8 py-3 bg-white text-blue-700 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform shadow-xl cursor-pointer inline-block">
                                        Fazer Upload de Arquivo
                                    </label>
                                </div>
                                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                            </div>

                            {isMatchingActive ? (
                                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-slate-700 dark:text-slate-200">Revisão de Importação</h3>
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
                                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${match.type === 'entry' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {match.type === 'entry' ? 'Entrada' : 'Saída'}
                                                    </span>
                                                    <span className="text-xs text-slate-400">{formatDateBR(match.date)}</span>
                                                </div>
                                                <p className="font-bold text-sm text-slate-900 dark:text-white truncate" title={match.desc}>{match.desc}</p>
                                                <p className="font-black text-lg text-slate-700 dark:text-slate-300 mt-1">{currency(match.amount)}</p>
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
                                                            await addInvoice({
                                                                id: '',
                                                                number: `OFX-${Date.now()}`,
                                                                entityName: 'Não Identificado',
                                                                date: match.date,
                                                                value: match.amount,
                                                                type: match.type,
                                                                status: 'paga',
                                                                category: 'Conciliação Bancária',
                                                                details: match.desc,
                                                                naturezaOperacao: 'Importação OFX'
                                                            } as any);
                                                            setMatchingTransactions(prev => prev.filter(p => p.id !== match.id));
                                                            addToast('Lançamento criado!', 'success');
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
                                                <div key={t.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <div>
                                                        <p className="font-bold text-xs text-slate-900 dark:text-white">{t.desc}</p>
                                                        <p className="text-[10px] text-slate-400">{formatDateBR(t.date)}</p>
                                                    </div>
                                                    <span className="font-black text-sm text-slate-600">{currency(t.value)}</span>
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
                    )}

                    {/* TAB: ADIANTAMENTOS */}
                    {activeTab === 'advances' && (
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
                    )}

                    {/* MODAL DE LIQUIDAÇÃO */}
                    <Modal
                        isOpen={liquidationModalOpen}
                        onClose={() => setLiquidationModalOpen(false)}
                        title={`Liquidar: ${selectedInvoice?.desc || 'Título'}`}
                    >
                        <div className="space-y-6 pt-2">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-slate-800">
                                <span className="text-xs font-bold text-slate-500 uppercase">Valor Original</span>
                                <span className="text-xl font-black text-slate-900 dark:text-white">{selectedInvoice && currency(selectedInvoice.value)}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] uppercase font-black text-slate-400 mb-1 block">Conta Bancária</label>
                                    <select
                                        value={liquidationData.bankAccountId}
                                        onChange={e => setLiquidationData(p => ({ ...p, bankAccountId: e.target.value }))}
                                        className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value="">Selecione a conta...</option>
                                        {bankAccounts.map(b => (
                                            <option key={b.id} value={b.id}>{b.bankName} (Final {b.accountNumber.slice(-4)})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-black text-slate-400 mb-1 block">Data do Pagamento</label>
                                    <input
                                        type="date"
                                        value={liquidationData.date}
                                        onChange={e => setLiquidationData(p => ({ ...p, date: e.target.value }))}
                                        className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-black text-slate-400 mb-1 block">Valor Pago (R$)</label>
                                <input
                                    type="number"
                                    value={liquidationData.value}
                                    onChange={e => setLiquidationData(p => ({ ...p, value: parseFloat(e.target.value) }))}
                                    className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-lg font-black outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <p className="text-[10px] text-slate-400 mt-1 italic">* Diferenças serão lançadas como Juros ou Descontos automaticamente.</p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button onClick={() => setLiquidationModalOpen(false)} className="px-6 py-3 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900">Cancelar</button>
                                <button onClick={confirmLiquidation} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                                    Confirmar Liquidação
                                </button>
                            </div>
                        </div>
                    </Modal>

                    {/* MODAL NOVAS TRANSAÇÕES RAPIDAS */}
                    <Modal
                        isOpen={transactionModalOpen}
                        onClose={() => setTransactionModalOpen(false)}
                        title={transactionData.type === 'exit' ? 'Nova Entrada (Receita)' : 'Nova Saída (Despesa)'}
                    >
                        <div className="space-y-4 pt-2">
                            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
                                <button
                                    onClick={() => setTransactionData(p => ({ ...p, type: 'exit' }))}
                                    className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${transactionData.type === 'exit' ? 'bg-white shadow text-emerald-600' : 'text-slate-400'
                                        }`}
                                >
                                    Entrada
                                </button>
                                <button
                                    onClick={() => setTransactionData(p => ({ ...p, type: 'entry' }))}
                                    className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${transactionData.type === 'entry' ? 'bg-white shadow text-red-600' : 'text-slate-400'
                                        }`}
                                >
                                    Saída
                                </button>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400">Descrição</label>
                                <input
                                    value={transactionData.description}
                                    onChange={e => setTransactionData(p => ({ ...p, description: e.target.value }))}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Ex: Aluguel, Venda de Balcão..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-400">Categoria</label>
                                    <select
                                        value={transactionData.category}
                                        onChange={e => setTransactionData(p => ({ ...p, category: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none"
                                    >
                                        <option value="">Selecione...</option>
                                        {transactionData.type === 'exit' ? (
                                            <>
                                                <option value="Vendas">Vendas</option>
                                                <option value="Serviços">Prestação de Serviços</option>
                                                <option value="Rendimentos">Rendimentos / Juros</option>
                                                <option value="Recebimentos">Recebimentos Pendentes</option>
                                                <option value="Outros">Outras Entradas</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="Salarios">Salários / Pró-Labore</option>
                                                <option value="Contas Fixas">Contas Fixas (Água/Luz/Net)</option>
                                                <option value="Aluguel">Aluguel</option>
                                                <option value="Compras">Compras / Despesas Diárias</option>
                                                <option value="Dividas">Pagamento de Dívidas</option>
                                                <option value="Impostos">Impostos e Taxas</option>
                                                <option value="Outros">Outras Saídas</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-400">Centro de Custo (Rec. 9)</label>
                                    <select
                                        value={transactionData.costCenter}
                                        onChange={e => setTransactionData(p => ({ ...p, costCenter: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none"
                                    >
                                        <option value="">Geral</option>
                                        <option value="ADM">Administrativo</option>
                                        <option value="COM">Comercial</option>
                                        <option value="OP">Operacional / Produção</option>
                                        <option value="MKT">Marketing</option>
                                        <option value="TI">Tecnologia</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400">Natureza da Operação</label>
                                <input
                                    value={transactionData.naturezaOperacao}
                                    list="naturezas-financial-list"
                                    onChange={e => setTransactionData(p => ({ ...p, naturezaOperacao: e.target.value }))}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Ex: Venda, Serviço, Pagamento de Aluguel..."
                                />
                                <datalist id="naturezas-financial-list">
                                    {(operationTypes || []).map(ot => (
                                        <option key={ot.id} value={ot.name}>{ot.name}</option>
                                    ))}
                                </datalist>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400">Valor (R$)</label>
                                <input
                                    type="number"
                                    value={transactionData.value}
                                    onChange={e => setTransactionData(p => ({ ...p, value: parseFloat(e.target.value) }))}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400">Data de Competência</label>
                                <input
                                    type="date"
                                    value={transactionData.date}
                                    onChange={e => setTransactionData(p => ({ ...p, date: e.target.value }))}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400">Status</label>
                                <select
                                    value={transactionData.status}
                                    onChange={e => setTransactionData(p => ({ ...p, status: e.target.value as any }))}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none"
                                >
                                    <option value="pendente">Pendente (Agendar)</option>
                                    <option value="paga">Realizado (Já Pago)</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveTransaction}
                            className="w-full py-3 mt-4 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                        >
                            Confirmar Lançamento
                        </button>
                    </Modal>

                </div>
            </div >
        </div >
    );
};
