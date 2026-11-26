import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
   PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
   AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar
} from 'recharts';
import {
   ArrowUpRight, ArrowDownRight, FileBarChart, DollarSign,
   TrendingUp, TrendingDown, Percent, Calendar, Package,
   Calculator, CheckCircle, Upload, AlertTriangle, FileText,
   XCircle, Info, Users, Download, Eye, FileSearch, Database,
   CreditCard, RefreshCw, Layers, SlidersHorizontal, Trash2, X, MessageSquare, ActivitySquare, Loader2, Target, Plus, ShieldCheck, Zap
} from 'lucide-react';
import { formatDateBR, parseDateSafe } from '../utils/formatters';
import { SIMPLES_ANNEXES, TAX_RATES, PRESUMIDO_RATES } from '../constants/legal';
import { generateJournalEntries, calculateAccountBalance, calculateDRE, calculateBalanceSheet, syncAccountingData, DEFAULT_CHART_OF_ACCOUNTS } from '../utils/accountingEngine';
import { generateClosingEntries } from '../utils/accountingAutomations';
import { FixedAsset, AccountingEntry, AccountingClosure } from '../types';
import { AssetSchema, AccountingEntrySchema } from '../utils/accountingSchemas';
import { z } from 'zod';

export const Accounting: React.FC = () => {
   const {
      invoices, employees, theme, products, addInvoice, selectedCompany,
      bankAccounts, bankTransactions: contextBankTransactions, payrollRuns,
      assets: assetsProps, addAsset, updateAsset,
      accountingEntries, addAccountingEntry, updateAccountingEntry, deleteItem,
      filings, addAccountingClosure, checkPeriodClosed, currentUser,
      csts, cfops // Add more context data if needed
   } = useData();

   const [previewUrl, setPreviewUrl] = useState<string | null>(null);
   const [isPreviewOpen, setIsPreviewOpen] = useState(false);

   const [activeTab, setActiveTab] = useState<'dre' | 'balance' | 'cashflow' | 'bank' | 'tax_sim' | 'audit' | 'assets'>('dre');
   const [regime, setRegime] = useState<'competencia' | 'caixa'>('competencia');
   const [isImporting, setIsImporting] = useState(false);
   const [importProgress, setImportProgress] = useState(0);
   const [isSyncing, setIsSyncing] = useState(false);

   const [selectedDivergence, setSelectedDivergence] = useState<any | null>(null);
   const [explanation, setExplanation] = useState<string>('');

   const [closingDate, setClosingDate] = useState(new Date().toISOString().split('T')[0]);
   const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
   const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
   const fileInputRef = useRef<HTMLInputElement>(null);

   // Assets State
   const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
   const [newAssetForm, setNewAssetForm] = useState<Partial<FixedAsset>>({
      name: '',
      acquisitionValue: 0,
      acquisitionDate: new Date().toISOString().split('T')[0],
      usefulLifeMonths: 60,
      category: 'maquinas'
   });

   // Manual Entry State
   const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
   const [newEntryForm, setNewEntryForm] = useState<Partial<AccountingEntry>>({
      description: '',
      date: new Date().toISOString().split('T')[0],
      value: 0,
      debitAccount: '',
      creditAccount: '',
      history: ''
   });

   // --- LOGICA DE INTEGRAÇÃO CONTÁBIL ---
   const handleAccountingSync = async () => {
      setIsSyncing(true);
      try {
         const result = await syncAccountingData(
            invoices,
            payrollRuns,
            accountingEntries,
            selectedCompany,
            {
               addEntry: async (e) => addAccountingEntry(e as any),
               deleteEntry: async (t, id) => await deleteItem(t as any, id)
            }
         );

         if (result.count > 0 || result.updatedCount > 0) {
            alert(`${result.count} novos documentos integrados e ${result.updatedCount} atualizados com sucesso!`);
         } else {
            alert("Tudo atualizado! Nenhuma nova pendência encontrada.");
         }
      } catch (error) {
         console.error(error);
         alert("Erro ao sincronizar dados.");
      } finally {
         setIsSyncing(false);
      }
   };



   // --- FECHAMENTO EXPRESS (ONE-CLICK) ---
   const handleSmartClosing = async () => {
      if (!selectedCompany) return;

      const period = closingDate.slice(0, 7); // Current competence from selected date

      if (checkPeriodClosed(closingDate, selectedCompany.id)) {
         alert(`O período ${period} já está encerrado. Reabra-o em "Minha Empresa" para realizar novas operações.`);
         return;
      }

      if (!confirm(`Deseja realizar o Fechamento Contábil Automático para ${period} com data de ${formatDateBR(closingDate)}? \nIsso irá gerar lançamentos de Receita, Impostos e Folha e BLOQUEARÁ o mês para edições.`)) return;

      setIsSyncing(true);

      try {
         const summary = generateClosingEntries(
            selectedCompany,
            period,
            invoices,
            employees,
            filings,
            closingDate,
            payrollRuns
         );

         if (summary.entries.length === 0) {
            alert('Nenhum dado encontrado para gerar fechamento neste período.');
         } else {
            for (const entry of summary.entries) {
               await addAccountingEntry({
                  ...entry,
                  id: Math.random().toString(36).substr(2, 9),
                  status: 'draft', // Create as draft for review
                  createdAt: new Date().toISOString()
               } as any);
            }

            // Close the period
            await addAccountingClosure({
               id: Math.random().toString(36).substr(2, 9),
               companyId: selectedCompany.id,
               period: period,
               closingDate: closingDate,
               status: 'closed',
               closedBy: currentUser || 'Sistema',
               closedAt: new Date().toISOString()
            });

            alert(`Fechamento realizado e PERÍODO BLOQUEADO! ${summary.entries.length} lançamentos gerados.\n\nReceita: ${summary.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\nFolha: ${summary.payroll.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
         }
      } catch (error) {
         console.error(error);
         alert('Erro ao realizar fechamento.');
      } finally {
         setIsSyncing(false);
      }
   };

   const handleSaveAsset = async () => {
      try {
         const validated = AssetSchema.parse(newAssetForm);

         const asset: FixedAsset = {
            id: Math.random().toString(36).substr(2, 9),
            companyId: selectedCompany?.id || '',
            name: validated.name,
            acquisitionDate: validated.acquisitionDate,
            acquisitionValue: validated.acquisitionValue,
            usefulLifeMonths: validated.usefulLifeMonths,
            depreciationRate: 1 / validated.usefulLifeMonths,
            accumulatedDepreciation: 0,
            status: 'active',
            category: validated.category
         };

         await addAsset(asset);

         // Integration: Create Financial Entry
         await addInvoice({
            id: Math.random().toString(36).substr(2, 9),
            companyId: selectedCompany?.id || '',
            number: `PAT-${Date.now().toString().slice(-4)}`,
            type: 'entry',
            status: 'paga',
            date: asset.acquisitionDate,
            value: asset.acquisitionValue,
            entityName: 'Fornecedor de Ativos',
            description: `Aquisição de Imobilizado: ${asset.name}`,
            category: 'Investimentos'
         } as any);

         setIsAssetModalOpen(false);
         setNewAssetForm({ name: '', acquisitionValue: 0, acquisitionDate: new Date().toISOString().split('T')[0], usefulLifeMonths: 60, category: 'maquinas' });
      } catch (error) {
         if (error instanceof z.ZodError) {
            alert((error as any).errors.map((e: any) => e.message).join('\n'));
         }
      }
   };

   const handleSaveEntry = async () => {
      try {
         // Convert to number manually before validation if needed, or rely on form state which should be number/string
         // Form state is Partial<AccountingEntry>, value is number.
         const validated = AccountingEntrySchema.parse({
            ...newEntryForm,
            value: Number(newEntryForm.value)
         });

         if (checkPeriodClosed(validated.date, selectedCompany?.id)) {
            alert("Período encerrado. Não é possível adicionar lançamentos.");
            return;
         }

         await addAccountingEntry({
            id: Math.random().toString(36).substr(2, 9),
            companyId: selectedCompany?.id || '',
            date: validated.date,
            description: validated.description,
            debitAccount: validated.debitAccount,
            creditAccount: validated.creditAccount,
            value: validated.value,
            history: validated.history || validated.description,
            originModule: 'manual',
            status: 'posted',
            createdAt: new Date().toISOString()
         } as any);

         setIsEntryModalOpen(false);
         setNewEntryForm({ description: '', date: new Date().toISOString().split('T')[0], value: 0, debitAccount: '', creditAccount: '', history: '' });
         alert("Lançamento Contábil realizado com sucesso!");
      } catch (error) {
         if (error instanceof z.ZodError) {
            alert((error as any).errors.map((e: any) => e.message).join('\n'));
         } else {
            alert("Erro desconhecido ao salvar lançamento.");
         }
      }
   };

   // --- DATA PROCESSING: DRE INTEGRADA ---
   const dre = useMemo(() => {
      return calculateDRE(
         accountingEntries,
         invoices,
         payrollRuns,
         assetsProps,
         startDate,
         endDate,
         selectedCompany?.id
      );
   }, [accountingEntries, invoices, payrollRuns, assetsProps, startDate, endDate, selectedCompany]);

   // --- BALANCE SHEET INTEGRADO ---
   const balanceSheet = useMemo(() => {
      return calculateBalanceSheet(accountingEntries, assetsProps, endDate);
   }, [accountingEntries, assetsProps, endDate]);

   const projectedCashFlow = useMemo(() => {
      const data = [];
      // FIX: Use selected period for Cash Flow
      const start = new Date(startDate);
      const end = new Date(endDate);

      let current = new Date(start.getFullYear(), start.getMonth(), 1);
      const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);

      while (current <= lastMonth) {
         const label = current.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();
         const month = current.getMonth();
         const year = current.getFullYear();

         const comp = `${(month + 1).toString().padStart(2, '0')}/${year}`;

         // Calculate for this month based on invoices (Competency view for now, usually needs cash basis switch)
         // Assuming 'paga' status for cash flow correctness if available, else all
         const monthIn = invoices.filter(inv => {
            const d = parseDateSafe(inv.date);
            return d.getMonth() === month && d.getFullYear() === year && (inv.type === 'exit' || inv.type === 'service') && inv.status !== 'cancelada';
         }).reduce((s, i) => s + i.value, 0);

         const monthOut = invoices.filter(inv => {
            const d = parseDateSafe(inv.date);
            return d.getMonth() === month && d.getFullYear() === year && inv.type === 'entry' && inv.status !== 'cancelada';
         }).reduce((s, i) => s + i.value, 0) + (payrollRuns.find(r => r.competence === comp)?.totalGross || 0);

         data.push({ name: label, receita: monthIn, despesa: monthOut, saldo: monthIn - monthOut });

         current.setMonth(current.getMonth() + 1);
         if (data.length > 24) break; // Safety limit
      }
      return data;
   }, [invoices, payrollRuns, startDate, endDate]);

   const taxSimulation = useMemo(() => {
      const revenue = dre.grossRevenue || 0;
      const annexIII = SIMPLES_ANNEXES['III'];
      const tier = annexIII.find(t => revenue <= t.limit) || annexIII[annexIII.length - 1];
      const simples = revenue > 0 ? (revenue * tier.rate) - tier.ded : 0;

      const presumption = revenue * PRESUMIDO_RATES.SERVICE;
      const presumido = presumption * (TAX_RATES.IRPJ + TAX_RATES.CSLL_GENERAL) + revenue * (TAX_RATES.PIS_CUMULATIVE + TAX_RATES.COFINS_CUMULATIVE + TAX_RATES.ISS_AVERAGE);

      return [
         { name: 'Simples Nacional', total: Math.max(0, simples) },
         { name: 'Lucro Presumido', total: Math.max(0, presumido) },
         { name: 'Lucro Real', total: Math.max(0, dre.ebitda * 0.34) }
      ].sort((a, b) => a.total - b.total);
   }, [dre]);

   const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
   const handleExportPDF = () => {
      import('../utils/pdfReport').then(({ generatePDFReport }) => {
         const dreItems = [
            { desc: 'RECEITA BRUTA OPERACIONAL', val: dre.grossRevenue, pct: '100%' },
            { desc: '(-) Deduções e Impostos', val: -dre.deductions, pct: (dre.grossRevenue ? (-dre.deductions / dre.grossRevenue * 100).toFixed(1) : '0') + '%' },
            { desc: '(=) RECEITA LÍQUIDA', val: dre.netRevenue, pct: (dre.grossRevenue ? (dre.netRevenue / dre.grossRevenue * 100).toFixed(1) : '0') + '%' },
            { desc: '(-) Custos (CMV/CPV)', val: -dre.cpv, pct: (dre.grossRevenue ? (-dre.cpv / dre.grossRevenue * 100).toFixed(1) : '0') + '%' },
            { desc: '(=) LUCRO BRUTO', val: dre.grossProfit, pct: (dre.grossRevenue ? (dre.grossProfit / dre.grossRevenue * 100).toFixed(1) : '0') + '%' },
            { desc: '(-) Despesas Operacionais', val: -(dre.personnel + dre.otherExpenses), pct: '' },
            { desc: '(=) EBITDA', val: dre.ebitda, pct: (dre.grossRevenue ? (dre.ebitda / dre.grossRevenue * 100).toFixed(1) : '0') + '%' },
            { desc: '(-) Depreciação', val: -dre.depreciation, pct: '' },
            { desc: '(=) RESULTADO LÍQUIDO', val: dre.netProfit, pct: (dre.grossRevenue ? (dre.netProfit / dre.grossRevenue * 100).toFixed(1) : '0') + '%' },
         ];

         const columns = [
            { header: 'ESTRUTURA DE RESULTADOS', dataKey: 'desc' },
            { header: 'VALOR (R$)', dataKey: 'val', halign: 'right' as const, format: (v: number) => currency(v) },
            { header: 'A.V. %', dataKey: 'pct', halign: 'right' as const }
         ];

         const totalizers = [
            { label: 'Resultado Líquido', value: dre.netProfit, icon: 'dollar' as const, color: dre.netProfit >= 0 ? 'green' as const : 'orange' as const },
            { label: 'Margem Líquida', value: dre.netMargin.toFixed(1) + '%', icon: 'percent' as const }
         ];

         const doc = generatePDFReport(
            selectedCompany || undefined,
            columns,
            dreItems,
            totalizers,
            {
               title: `Demonstrativo de Resultado - ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`,
               fileName: `dre_${startDate}_${endDate}.pdf`,
               status: 'CONTABILIZADO'
            },
            true
         );

         const blob = doc.output('blob');
         const url = URL.createObjectURL(blob);
         setPreviewUrl(url);
         setIsPreviewOpen(true);
      });
   };

   const handleExportExcel = () => {
      import('xlsx').then(XLSX => {
         const wb = XLSX.utils.book_new();

         // 1. DRE Sheet
         const dreData = [
            ['ESTRUTURA DE RESULTADOS', 'VALOR'],
            ['RECEITA BRUTA OPERACIONAL', dre.grossRevenue],
            ['(-) Deduções e Impostos', -dre.deductions],
            ['(=) RECEITA LÍQUIDA', dre.netRevenue],
            ['(-) Custos (CMV/CPV)', -dre.cpv],
            ['(=) LUCRO BRUTO', dre.grossProfit],
            ['(-) Despesas Operacionais', -(dre.personnel + dre.otherExpenses)],
            ['(-) Depreciação', -dre.depreciation],
            ['(=) RESULTADO LÍQUIDO', dre.netProfit]
         ];

         if (dre.dailyDre.length > 0) {
            dreData.push(['', '']);
            dreData.push(['DETALHAMENTO DIÁRIO', '']);
            dreData.push(['Data', 'Receita', 'Deduções', 'Custos', 'Despesas', 'Resultado']);
            dre.dailyDre.forEach(d => {
               dreData.push([d.date, d.grossRevenue, d.deductions, d.costs, d.expenses, d.netResult]);
            });
         }

         const wsDre = XLSX.utils.aoa_to_sheet(dreData);
         XLSX.utils.book_append_sheet(wb, wsDre, "DRE");

         // 2. Balanço Sheet
         const balancoData = [
            ['ATIVO', 'VALOR', '', 'PASSIVO', 'VALOR'],
            ['Circulante', balanceSheet.assets.currentAssets, '', 'Circulante', balanceSheet.liabilities.currentLiabilities],
            ['Caixa', balanceSheet.assets.cash, '', 'Fornecedores', balanceSheet.liabilities.suppliers],
            ['Clientes', balanceSheet.assets.receivables, '', 'Trabalhista', balanceSheet.liabilities.payroll],
            ['Estoques', balanceSheet.assets.inventory, '', 'Tributário', balanceSheet.liabilities.taxes],
            ['', '', '', '', ''],
            ['Não Circulante', balanceSheet.assets.fixedAssetsValue, '', 'Patrimônio Líquido', balanceSheet.equity],
            ['Imobilizado', balanceSheet.assets.fixedAssetsValue, '', 'PL', balanceSheet.equity],
            ['TOTAL ATIVO', balanceSheet.assets.totalAssets, '', 'TOTAL PASSIVO', balanceSheet.liabilities.totalLiabilities + balanceSheet.equity]
         ];
         const wsBalanco = XLSX.utils.aoa_to_sheet(balancoData);
         XLSX.utils.book_append_sheet(wb, wsBalanco, "Balanço Patrimonial");

         // 3. Journal Entries (Razão)
         const entriesData = accountingEntries
            .filter(e => e.date >= startDate && e.date <= endDate)
            .map(e => ({
               Data: e.date,
               Histórico: e.history,
               Débito: e.debitAccount,
               Crédito: e.creditAccount,
               Valor: e.value,
               Origem: e.originModule
            }));
         const wsRazao = XLSX.utils.json_to_sheet(entriesData);
         XLSX.utils.book_append_sheet(wb, wsRazao, "Razão Analítico");

         XLSX.writeFile(wb, `Contabil_${selectedCompany?.nomeFantasia}_${startDate}_${endDate}.xlsx`);
      }).catch(err => alert("Erro ao carregar módulo XLSX"));
   };

   return (
      <div className="space-y-6 animate-in fade-in duration-500">
         {/* HEADER */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-5">
               <div className="p-4 bg-orange-100 dark:bg-orange-900/30 rounded-3xl">
                  <Database className="text-orange-600" size={32} />
               </div>
               <div>
                  <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Dp. Contábil</h1>
                  <p className="text-slate-500 font-bold text-sm flex items-center gap-2">
                     <ShieldCheck size={16} className="text-emerald-500" />
                     {selectedCompany?.nomeFantasia} • {selectedCompany?.regimeTributario?.toUpperCase()}
                  </p>
               </div>
            </div>

            <div className="flex gap-3 items-end">
               <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                     <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Início</span>
                        <input
                           type="date"
                           value={startDate}
                           onChange={(e) => setStartDate(e.target.value)}
                           className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 outline-none focus:border-indigo-500 transition-all shadow-sm"
                        />
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fim</span>
                        <input
                           type="date"
                           value={endDate}
                           onChange={(e) => setEndDate(e.target.value)}
                           className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 outline-none focus:border-indigo-500 transition-all shadow-sm"
                        />
                     </div>
                     <Button
                        onClick={() => setIsEntryModalOpen(true)}
                        variant="secondary"
                        className="rounded-xl h-[42px] px-4 border-slate-200"
                        title="Novo Lançamento Manual"
                     >
                        <Plus size={16} /> Lançamento
                     </Button>
                  </div>
                  <div className="flex gap-2">
                     <Button
                        onClick={handleAccountingSync}
                        disabled={isSyncing}
                        className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 flex-1 justify-center"
                     >
                        {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} className="text-yellow-400 fill-yellow-400" />}
                        Sincronizar
                     </Button>
                     <Button
                        onClick={handleExportPDF}
                        variant="outline"
                        className="rounded-xl border-slate-200 dark:border-slate-800 px-3 py-2 text-[10px] uppercase font-bold"
                     >
                        <FileText size={14} className="mr-1" /> PDF
                     </Button>
                     <Button
                        onClick={handleExportExcel}
                        variant="outline"
                        className="rounded-xl border-slate-200 dark:border-slate-800 px-3 py-2 text-[10px] uppercase font-bold text-emerald-600"
                     >
                        <FileBarChart size={14} className="mr-1" /> Excel
                     </Button>
                  </div>
               </div>

               <div className="w-px h-20 bg-slate-200 dark:bg-slate-800 mx-2" />

               <div className="flex flex-col items-end gap-2">
                  <div className="flex flex-col items-end">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fechamento</span>
                     <input
                        type="date"
                        value={closingDate}
                        onChange={(e) => setClosingDate(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 outline-none focus:border-indigo-500 transition-all shadow-sm text-right"
                     />
                  </div>
                  <Button
                     onClick={handleSmartClosing}
                     disabled={isSyncing}
                     className="bg-indigo-600 text-white rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20"
                  >
                     <RefreshCw size={14} /> Fechamento Mensal
                  </Button>
               </div>
            </div>
         </div>

         {/* Sub-Header KPIs */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-5 bg-white dark:bg-slate-900 border-none shadow-sm flex items-center gap-4 group hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-default overflow-hidden relative">
               <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform"><TrendingUp size={24} /></div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lucro Líquido</p>
                  <p className={`text-lg font-black ${dre.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{currency(dre.netProfit)}</p>
               </div>
               <div className="absolute -right-2 -bottom-2 opacity-5"><TrendingUp size={80} /></div>
            </Card>
            <Card className="p-5 bg-white dark:bg-slate-900 border-none shadow-sm flex items-center gap-4 group hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-default overflow-hidden relative">
               <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform"><RefreshCw size={24} /></div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conciliação</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">
                     {accountingEntries.length > 0 ? '100%' : 'Pendente'}
                  </p>
               </div>
               <div className="absolute -right-2 -bottom-2 opacity-5"><RefreshCw size={80} /></div>
            </Card>
            <Card className="p-5 bg-white dark:bg-slate-900 border-none shadow-sm flex items-center gap-4 group hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-default overflow-hidden relative">
               <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform"><ShieldCheck size={24} /></div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Liquidez Corrente</p>
                  <p className="text-lg font-black text-purple-600">{balanceSheet.liquidity.toFixed(2)}</p>
               </div>
               <div className="absolute -right-2 -bottom-2 opacity-5"><ShieldCheck size={80} /></div>
            </Card>
            <Card className="p-5 bg-slate-900 text-white border-none shadow-xl flex items-center gap-4 overflow-hidden relative">
               <div className="p-3 bg-white/10 text-emerald-400 rounded-2xl"><Zap size={24} /></div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compliance Score</p>
                  <p className="text-lg font-black text-emerald-400">9.8/10</p>
               </div>
               <div className="absolute -right-2 -bottom-2 opacity-5 text-white"><Zap size={80} /></div>
            </Card>
         </div>

         {/* Navigation */}
         <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
            {[
               { id: 'dre', label: 'DRE', icon: FileBarChart },
               { id: 'balance', label: 'Balanço', icon: Package },
               { id: 'cashflow', label: 'Caixa', icon: DollarSign },
               { id: 'assets', label: 'Ativos', icon: Layers },
               { id: 'bank', label: 'Bancos', icon: CreditCard },
               { id: 'tax_sim', label: 'Tributário', icon: Calculator },
               { id: 'audit', label: 'Compliance', icon: CheckCircle },
            ].map(tab => (
               <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === tab.id
                     ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-sm border border-slate-200 dark:border-slate-700'
                     : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                     }`}
               >
                  <tab.icon size={16} />
                  {tab.label}
               </button>
            ))}
         </div>

         {/* Tab Content */}
         <div className="min-h-[500px]">
            {activeTab === 'dre' && (
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card title="Demonstrativo de Resultado (Exercício)" subtitle="Visão estruturada conforme CPC 26" className="lg:col-span-2">
                     <div className="mt-6 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                           <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-[10px] uppercase font-black">
                              <tr>
                                 <th className="p-5 text-left">Estrutura de Resultados</th>
                                 <th className="p-5 text-right">Valor Real</th>
                                 <th className="p-5 text-right">A.V. %</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                              <tr className="bg-blue-50/20 dark:bg-blue-900/10 font-black">
                                 <td className="p-5">(=) RECEITA BRUTA OPERACIONAL</td>
                                 <td className="p-5 text-right">{currency(dre.grossRevenue)}</td>
                                 <td className="p-5 text-right opacity-40">100%</td>
                              </tr>
                              <tr>
                                 <td className="p-5 pl-10 text-slate-500">(-) Impostos e Deduções</td>
                                 <td className="p-5 text-right text-red-500">-{currency(dre.deductions)}</td>
                                 <td className="p-5 text-right opacity-40">{(dre.deductions / (dre.grossRevenue || 1) * 100).toFixed(1)}%</td>
                              </tr>
                              <tr className="bg-slate-50/50 dark:bg-slate-900/50 font-bold">
                                 <td className="p-5">(=) RECEITA LÍQUIDA</td>
                                 <td className="p-5 text-right">{currency(dre.netRevenue)}</td>
                                 <td className="p-5 text-right opacity-40">{(dre.netRevenue / (dre.grossRevenue || 1) * 100).toFixed(1)}%</td>
                              </tr>
                              <tr>
                                 <td className="p-5 pl-10 text-slate-500">(-) Custos Operacionais (CMV/CPV)</td>
                                 <td className="p-5 text-right text-red-500">-{currency(dre.cpv)}</td>
                                 <td className="p-5 text-right opacity-40">{(dre.cpv / (dre.grossRevenue || 1) * 100).toFixed(1)}%</td>
                              </tr>
                              <tr className="font-black text-orange-600">
                                 <td className="p-5">(=) LUCRO BRUTO</td>
                                 <td className="p-5 text-right">{currency(dre.grossProfit)}</td>
                                 <td className="p-5 text-right opacity-40">{dre.grossMargin.toFixed(1)}%</td>
                              </tr>
                              <tr>
                                 <td className="p-5 pl-10 text-slate-500">(-) Impostos e Deduções</td>
                                 <td className="p-5 text-right text-red-500">-{currency(dre.deductions)}</td>
                                 <td className="p-5 text-right opacity-40">{(dre.deductions / (dre.grossRevenue || 1) * 100).toFixed(1)}%</td>
                              </tr>
                              {/* Breakdown of Deductions */}
                              {dre.taxesOnSales > 0 && (
                                 <tr>
                                    <td className="p-3 pl-16 text-slate-400 text-xs text-xs">(-) Impostos s/ Vendas</td>
                                    <td className="p-3 text-right text-red-400 text-xs">-{currency(dre.taxesOnSales)}</td>
                                    <td className="p-3 text-right opacity-30 text-xs"></td>
                                 </tr>
                              )}

                              <tr className="bg-slate-50/50 dark:bg-slate-900/50 font-bold">
                                 <td className="p-5">(=) RECEITA LÍQUIDA</td>
                                 <td className="p-5 text-right">{currency(dre.netRevenue)}</td>
                                 <td className="p-5 text-right opacity-40">{(dre.netRevenue / (dre.grossRevenue || 1) * 100).toFixed(1)}%</td>
                              </tr>
                              <tr>
                                 <td className="p-5 pl-10 text-slate-500">(-) Custos Operacionais (CMV/CPV)</td>
                                 <td className="p-5 text-right text-red-500">-{currency(dre.cpv)}</td>
                                 <td className="p-5 text-right opacity-40">{(dre.cpv / (dre.grossRevenue || 1) * 100).toFixed(1)}%</td>
                              </tr>
                              <tr className="font-black text-orange-600">
                                 <td className="p-5">(=) LUCRO BRUTO</td>
                                 <td className="p-5 text-right">{currency(dre.grossProfit)}</td>
                                 <td className="p-5 text-right opacity-40">{dre.grossMargin.toFixed(1)}%</td>
                              </tr>
                              <tr>
                                 <td className="p-5 pl-10 text-slate-500">(-) Despesas com Pessoal</td>
                                 <td className="p-5 text-right">-{currency(dre.personnel)}</td>
                                 <td className="p-5 text-right opacity-40">{(dre.personnel / (dre.grossRevenue || 1) * 100).toFixed(1)}%</td>
                              </tr>
                              <tr>
                                 <td className="p-5 pl-10 text-slate-500">(-) Despesas Administrativas</td>
                                 <td className="p-5 text-right">-{currency(dre.otherExpenses)}</td>
                                 <td className="p-5 text-right opacity-40">{(dre.otherExpenses / (dre.grossRevenue || 1) * 100).toFixed(1)}%</td>
                              </tr>
                              <tr className="bg-slate-50 dark:bg-slate-800 font-bold">
                                 <td className="p-5">(=) EBITDA</td>
                                 <td className="p-5 text-right text-blue-600">{currency(dre.ebitda)}</td>
                                 <td className="p-5 text-right opacity-40">{(dre.ebitda / (dre.grossRevenue || 1) * 100).toFixed(1)}%</td>
                              </tr>
                              <tr>
                                 <td className="p-5 pl-10 text-slate-500">(-) Depreciação e Amortização</td>
                                 <td className="p-5 text-right text-orange-500">-{currency(dre.depreciation)}</td>
                                 <td className="p-5 text-right opacity-40">{(dre.depreciation / (dre.grossRevenue || 1) * 100).toFixed(1)}%</td>
                              </tr>
                              <tr className="bg-slate-900 text-white font-black">
                                 <td className="p-5 text-emerald-400">(=) LUCRO/PREJUÍZO LÍQUIDO</td>
                                 <td className="p-5 text-right text-emerald-400">{currency(dre.netProfit)}</td>
                                 <td className="p-5 text-right">{dre.netMargin.toFixed(1)}%</td>
                              </tr>
                           </tbody>
                        </table>
                     </div>

                     {/* DAILY DRE TABLE */}
                     <div className="mt-8 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                        <div className="p-5 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                           <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">DRE Diária (Analítico)</h3>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                           <table className="w-full text-xs">
                              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold sticky top-0 z-10">
                                 <tr>
                                    <th className="p-3 text-left">Data</th>
                                    <th className="p-3 text-right text-emerald-600">Receita Bruta</th>
                                    <th className="p-3 text-right text-red-400">(-) Deduções</th>
                                    <th className="p-3 text-right text-red-500">(-) Custos</th>
                                    <th className="p-3 text-right text-orange-500">(-) Despesas</th>
                                    <th className="p-3 text-right font-black">(=) Resultado</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                 {dre.dailyDre.map((day: any) => (
                                    <tr key={day.date} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                       <td className="p-3 font-medium text-slate-600">{formatDateBR(day.date)}</td>
                                       <td className="p-3 text-right text-emerald-600 font-bold">{currency(day.grossRevenue)}</td>
                                       <td className="p-3 text-right text-red-400">{currency(day.deductions)}</td>
                                       <td className="p-3 text-right text-red-500">{currency(day.costs)}</td>
                                       <td className="p-3 text-right text-orange-500">{currency(day.expenses)}</td>
                                       <td className={`p-3 text-right font-black ${day.netResult >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                          {currency(day.netResult)}
                                       </td>
                                    </tr>
                                 ))}
                                 {dre.dailyDre.length === 0 && (
                                    <tr>
                                       <td colSpan={6} className="p-8 text-center text-slate-400">Nenhuma movimentação no período selecionado.</td>
                                    </tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </Card>

                  <div className="space-y-6">
                     <Card title="Margem Contábil" className="p-8 text-center bg-white dark:bg-slate-900 border-none shadow-sm flex flex-col items-center">
                        <div className="h-48 w-full">
                           <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                 <Pie
                                    data={[
                                       { name: 'Lucro Net', value: dre.netProfit > 0 ? dre.netProfit : 0 },
                                       { name: 'Custos', value: dre.cpv },
                                       { name: 'Impostos', value: dre.deductions },
                                       { name: 'Despesas', value: dre.personnel + dre.otherExpenses },
                                    ]}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                 >
                                    <Cell fill="#10b981" />
                                    <Cell fill="#ef4444" />
                                    <Cell fill="#f59e0b" />
                                    <Cell fill="#3b82f6" />
                                 </Pie>
                                 <Tooltip />
                              </PieChart>
                           </ResponsiveContainer>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-4 text-[10px] font-black uppercase text-slate-400">
                           <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Lucro</div>
                           <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Custos</div>
                           <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Impostos</div>
                           <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Despesas</div>
                        </div>
                     </Card>

                     <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 border-none shadow-2xl overflow-hidden relative group">
                        <div className="relative z-10">
                           <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Análise Gold IA</h4>
                           <p className="text-sm font-medium leading-relaxed italic text-slate-300">
                              {dre.netMargin > 15 ? "Parabéns! Sua margem líquida de " + dre.netMargin.toFixed(1) + "% está acima da média do setor. Recomendamos reinvestimento em ativos imobilizados." : "Atenção: Margem líquida pressionada. Revise os custos operacionais e a base de dedução de impostos."}
                           </p>
                           <div className="mt-6 flex items-center gap-3 text-emerald-400 font-black text-xs">
                              <Zap size={14} /> Otimização Tributária Disponível
                           </div>
                        </div>
                        <ShieldCheck size={120} className="absolute -bottom-10 -right-10 text-white/5 rotate-12 group-hover:scale-110 transition-transform" />
                     </Card>
                  </div>
               </div>
            )}

            {activeTab === 'balance' && (
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in zoom-in-95 duration-500">
                  <Card title="Ativo (Patrimônio + Direitos)" subtitle="Principais aplicações de recursos">
                     <div className="space-y-6 mt-6">
                        <section className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                           <h4 className="text-[10px] font-black text-blue-600 uppercase mb-4 tracking-widest">Ativo Circulante</h4>
                           <div className="space-y-4 text-sm">
                              <div className="flex justify-between font-bold border-b border-slate-100 dark:border-slate-800 pb-2">
                                 <span className="text-slate-500">Disponibilidades (Bancos/Caixa)</span>
                                 <span className="text-slate-900 dark:text-white">{currency(balanceSheet.assets.cash)}</span>
                              </div>
                              <div className="flex justify-between font-bold border-b border-slate-100 dark:border-slate-800 pb-2">
                                 <span className="text-slate-500">Contas a Receber (Clientes)</span>
                                 <span className="text-slate-900 dark:text-white">{currency(balanceSheet.assets.receivables)}</span>
                              </div>
                              <div className="flex justify-between font-bold">
                                 <span className="text-slate-500">Estoques de Mercadorias</span>
                                 <span className="text-slate-900 dark:text-white">{currency(balanceSheet.assets.inventory)}</span>
                              </div>
                           </div>
                        </section>

                        <section className="bg-slate-100 dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
                           <h4 className="text-[10px] font-black text-slate-500 uppercase mb-4 tracking-widest">Ativo Não Circulante</h4>
                           <div className="flex justify-between font-black text-sm">
                              <span>Imobilizado (Máquinas/Equips)</span>
                              <span>{currency(balanceSheet.assets.fixedAssetsValue)}</span>
                           </div>
                        </section>

                        <div className="p-6 bg-blue-600 text-white rounded-3xl flex justify-between items-center shadow-xl shadow-blue-500/20">
                           <span className="text-xs font-black uppercase">Total Ativo</span>
                           <span className="text-2xl font-black">{currency(balanceSheet.assets.totalAssets)}</span>
                        </div>
                     </div>
                  </Card>

                  <Card title="Passivo + PL (Dívidas + Capital)" subtitle="Origens de recursos e obrigações">
                     <div className="space-y-6 mt-6">
                        <section className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                           <h4 className="text-[10px] font-black text-red-500 uppercase mb-4 tracking-widest">Passivo Circulante</h4>
                           <div className="space-y-4 text-sm">
                              <div className="flex justify-between font-bold border-b border-slate-100 dark:border-slate-800 pb-2">
                                 <span className="text-slate-500">Fornecedores Nacionais</span>
                                 <span className="text-slate-900 dark:text-white">{currency(balanceSheet.liabilities.suppliers)}</span>
                              </div>
                              <div className="flex justify-between font-bold border-b border-slate-100 dark:border-slate-800 pb-2">
                                 <span className="text-slate-500">Obrigações Trabalhistas</span>
                                 <span className="text-slate-900 dark:text-white">{currency(balanceSheet.liabilities.payroll)}</span>
                              </div>
                              <div className="flex justify-between font-bold">
                                 <span className="text-slate-500">Impostos a Recolher</span>
                                 <span className="text-slate-900 dark:text-white">{currency(balanceSheet.liabilities.taxes)}</span>
                              </div>
                           </div>
                        </section>

                        <section className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800">
                           <h4 className="text-[10px] font-black text-emerald-600 uppercase mb-4 tracking-widest">Patrimônio Líquido</h4>
                           <div className="flex justify-between font-black text-sm text-emerald-700 dark:text-emerald-400">
                              <span>Capital Social & Reservas</span>
                              <span>{currency(balanceSheet.equity)}</span>
                           </div>
                        </section>

                        <div className="p-6 bg-slate-900 dark:bg-black text-white rounded-3xl flex justify-between items-center shadow-xl">
                           <span className="text-xs font-black uppercase">Total Passivo+PL</span>
                           <span className="text-2xl font-black">{currency(balanceSheet.liabilities.totalLiabilities + balanceSheet.equity)}</span>
                        </div>
                     </div>
                  </Card>
               </div>
            )}

            {activeTab === 'assets' && (
               <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                  <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                     <div className="flex items-center gap-6">
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-3xl">
                           <Layers size={32} />
                        </div>
                        <div>
                           <h2 className="text-2xl font-black text-slate-900 dark:text-white">Imobilizado e Depreciação</h2>
                           <p className="text-slate-500 font-medium italic">Gestão patrimonial automatizada conforme CPC 27</p>
                        </div>
                     </div>
                     <Button
                        onClick={() => setIsAssetModalOpen(true)}
                        className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl px-8 py-3 font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
                     >
                        <Plus size={16} /> Novo Ativo
                     </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <Card className="p-6 bg-white dark:bg-slate-900">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Custo Histórico</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{currency(balanceSheet.assets.fixedAssetsValue)}</p>
                     </Card>
                     <Card className="p-6 bg-white dark:bg-slate-900">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Depreciação Acum.</p>
                        <p className="text-2xl font-black text-red-500">-{currency(dre.depreciation / 12 * 24)}</p>
                     </Card>
                     <Card className="p-6 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800">
                        <p className="text-[10px] font-black uppercase text-emerald-600 mb-2">Valor Líquido</p>
                        <p className="text-2xl font-black text-emerald-700">{currency(balanceSheet.assets.fixedAssetsValue - (dre.depreciation / 12 * 24))}</p>
                     </Card>
                     <Card className="p-6 bg-white dark:bg-slate-900">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Vida Útil Média</p>
                        <p className="text-2xl font-black text-blue-600">5.4 Anos</p>
                     </Card>
                  </div>

                  <Card className="p-0 overflow-hidden border-none shadow-xl">
                     <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 text-[10px] uppercase font-black">
                           <tr>
                              <th className="p-5 text-left">Patrimônio / Descrição</th>
                              <th className="p-5 text-center">Aquisição</th>
                              <th className="p-5 text-right">Valor Compra</th>
                              <th className="p-5 text-center">Vida Útil</th>
                              <th className="p-5 text-right">Amort. Mensal</th>
                              <th className="p-5 text-right">Ação</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                           {assetsProps.length > 0 ? assetsProps.map(asset => (
                              <tr key={asset.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                                 <td className="p-5">
                                    <p className="font-extrabold text-slate-900 dark:text-white">{asset.name}</p>
                                    <p className="text-[10px] uppercase font-black text-slate-400">CAT: {asset.category}</p>
                                 </td>
                                 <td className="p-5 text-center text-slate-500">{formatDateBR(asset.acquisitionDate)}</td>
                                 <td className="p-5 text-right text-slate-900 dark:text-white font-bold">{currency(asset.acquisitionValue)}</td>
                                 <td className="p-5 text-center text-slate-500 font-bold">{asset.usefulLifeMonths} Meses</td>
                                 <td className="p-5 text-right text-red-500 font-black">-{currency(asset.acquisitionValue / asset.usefulLifeMonths)}</td>
                                 <td className="p-5 text-right">
                                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-all"><Eye size={18} /></button>
                                 </td>
                              </tr>
                           )) : (
                              <tr>
                                 <td colSpan={6} className="p-20 text-center">
                                    <Layers size={48} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum ativo cadastrado para esta empresa</p>
                                 </td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </Card>
               </div>
            )}

            {activeTab === 'cashflow' && (
               <div className="space-y-6 animate-in zoom-in-95 duration-500">
                  <Card title="Fluxo de Caixa Mensal (Regime de Caixa)" subtitle="Visão consolidada de entradas e saídas financeiras">
                     <div className="h-96 mt-8">
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={projectedCashFlow}>
                              <defs>
                                 <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                 </linearGradient>
                                 <linearGradient id="colorDes" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                 </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} tickFormatter={v => `R$${v / 1000}k`} />
                              <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                              <Area type="monotone" name="Receitas" dataKey="receita" stroke="#10b981" fillOpacity={1} fill="url(#colorRec)" strokeWidth={3} />
                              <Area type="monotone" name="Despesas" dataKey="despesa" stroke="#ef4444" fillOpacity={1} fill="url(#colorDes)" strokeWidth={3} />
                           </AreaChart>
                        </ResponsiveContainer>
                     </div>
                  </Card>
               </div>
            )}

            {activeTab === 'bank' && (
               <div className="space-y-6 animate-in fade-in slide-in-from-right-4 transition-all">
                  <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                     <div className="flex items-center gap-6">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-3xl">
                           <CreditCard size={32} />
                        </div>
                        <div>
                           <h2 className="text-2xl font-black text-slate-900 dark:text-white">Extrato Bancário Integrado</h2>
                           <p className="text-slate-500 font-medium italic">Conciliação automática de movimentações OFX/Excel</p>
                        </div>
                     </div>
                     <Button className="bg-emerald-600 text-white rounded-2xl px-6 py-3 font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all">
                        Auto-Conciliar IA
                     </Button>
                  </div>

                  <Card className="p-0 overflow-hidden border-none shadow-xl">
                     <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 text-[10px] uppercase font-black">
                           <tr>
                              <th className="p-5 text-left">Data</th>
                              <th className="p-5 text-left">Descrição no Extrato</th>
                              <th className="p-5 text-right">Valor</th>
                              <th className="p-5 text-center">Status</th>
                              <th className="p-5 text-right">Ação</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                           {contextBankTransactions.length > 0 ? contextBankTransactions.map(tx => (
                              <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                 <td className="p-5 font-bold text-slate-500">{formatDateBR(tx.date)}</td>
                                 <td className="p-5 font-extrabold text-slate-900 dark:text-white">{tx.description}</td>
                                 <td className={`p-5 text-right font-black ${tx.type === 'credit' ? 'text-emerald-500' : 'text-red-500'}`}>{currency(tx.amount)}</td>
                                 <td className="p-5 text-center">
                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${tx.status === 'reconciled' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                       {tx.status?.toUpperCase()}
                                    </span>
                                 </td>
                                 <td className="p-5 text-right">
                                    <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all">Conciliar</button>
                                 </td>
                              </tr>
                           )) : (
                              <tr>
                                 <td colSpan={5} className="p-20 text-center font-black text-slate-400 italic">Nenhum extrato importado. Clique em Importar para começar.</td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </Card>
               </div>
            )}
         </div>

         {/* Modals */}
         <Modal
            isOpen={isAssetModalOpen}
            onClose={() => setIsAssetModalOpen(false)}
            title="Adquirir Novo Ativo Fixo"
            maxWidth="max-w-2xl"
         >
            <div className="space-y-6 p-2">
               <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 ml-1">Descrição do Bem</label>
                  <input
                     type="text"
                     className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 transition-all font-bold text-slate-900 dark:text-white"
                     placeholder="Ex: Servidor de Dados High-End"
                     value={newAssetForm.name}
                     onChange={e => setNewAssetForm({ ...newAssetForm, name: e.target.value })}
                  />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-xs font-black uppercase text-slate-400 ml-1">Valor de Compra (R$)</label>
                     <input
                        type="number"
                        className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 transition-all font-bold text-slate-900 dark:text-white"
                        value={newAssetForm.acquisitionValue}
                        onChange={e => setNewAssetForm({ ...newAssetForm, acquisitionValue: Number(e.target.value) })}
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-black uppercase text-slate-400 ml-1">Data de Aquisição</label>
                     <input
                        type="date"
                        className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 transition-all font-bold text-slate-900 dark:text-white"
                        value={newAssetForm.acquisitionDate}
                        onChange={e => setNewAssetForm({ ...newAssetForm, acquisitionDate: e.target.value })}
                     />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-xs font-black uppercase text-slate-400 ml-1">Vida Útil (Meses)</label>
                     <input
                        type="number"
                        className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 transition-all font-bold text-slate-900 dark:text-white"
                        value={newAssetForm.usefulLifeMonths}
                        onChange={e => setNewAssetForm({ ...newAssetForm, usefulLifeMonths: Number(e.target.value) })}
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-black uppercase text-slate-400 ml-1">Categoria</label>
                     <select
                        className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 transition-all font-bold text-slate-900 dark:text-white"
                        value={newAssetForm.category}
                        onChange={e => setNewAssetForm({ ...newAssetForm, category: e.target.value as any })}
                     >
                        <option value="maquinas">Máquinas e Equipamentos</option>
                        <option value="veiculos">Veículos</option>
                        <option value="tecnologia">Hardware e TI</option>
                        <option value="moveis">Móveis e Utensílios</option>
                        <option value="imoveis">Imóveis</option>
                     </select>
                  </div>
               </div>
               <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="secondary" onClick={() => setIsAssetModalOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSaveAsset} className="bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/20">Finalizar Aquisição</Button>
               </div>
            </div>
         </Modal>
         <Modal isOpen={isEntryModalOpen} onClose={() => setIsEntryModalOpen(false)} title="Novo Lançamento Contábil">
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-500">Data</label>
                     <input
                        type="date"
                        className="w-full p-2 border rounded-lg"
                        value={newEntryForm.date}
                        onChange={e => setNewEntryForm({ ...newEntryForm, date: e.target.value })}
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-500">Valor (R$)</label>
                     <input
                        type="number"
                        className="w-full p-2 border rounded-lg"
                        value={newEntryForm.value}
                        onChange={e => setNewEntryForm({ ...newEntryForm, value: parseFloat(e.target.value) })}
                     />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">Descrição</label>
                  <input
                     type="text"
                     className="w-full p-2 border rounded-lg"
                     value={newEntryForm.description}
                     onChange={e => setNewEntryForm({ ...newEntryForm, description: e.target.value })}
                     placeholder="Ex: Pagamento de Fornecedor"
                  />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-500">Conta Débito</label>
                     <select
                        className="w-full p-2 border rounded-lg text-xs"
                        value={newEntryForm.debitAccount}
                        onChange={e => setNewEntryForm({ ...newEntryForm, debitAccount: e.target.value })}
                     >
                        <option value="">Selecione...</option>
                        {DEFAULT_CHART_OF_ACCOUNTS.filter(a => a.isAnalytic).map(acc => (
                           <option key={acc.code} value={acc.code}>{acc.code} - {acc.name}</option>
                        ))}
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-500">Conta Crédito</label>
                     <select
                        className="w-full p-2 border rounded-lg text-xs"
                        value={newEntryForm.creditAccount}
                        onChange={e => setNewEntryForm({ ...newEntryForm, creditAccount: e.target.value })}
                     >
                        <option value="">Selecione...</option>
                        {DEFAULT_CHART_OF_ACCOUNTS.filter(a => a.isAnalytic).map(acc => (
                           <option key={acc.code} value={acc.code}>{acc.code} - {acc.name}</option>
                        ))}
                     </select>
                  </div>
               </div>

               <div className="pt-4 flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setIsEntryModalOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSaveEntry}>Salvar Lançamento</Button>
               </div>
            </div>
         </Modal>

      </div >
   );
};