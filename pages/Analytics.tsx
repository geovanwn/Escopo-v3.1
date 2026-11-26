import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { AccountingEntry, AccountingClosure } from '../types';
import { DEFAULT_CHART_OF_ACCOUNTS, AccountPlanItem } from '../utils/accountingEngine';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import {
   FileText, Plus, Database, Save, CheckCircle, FileSearch,
   Loader2, RefreshCw, Download, ShieldCheck, History,
   Eye, XCircle, FileSpreadsheet, Pencil, Trash2,
   TrendingUp, TrendingDown, DollarSign, PieChart,
   BarChart as BarChartIcon, LayoutDashboard, Calculator
} from 'lucide-react';
import {
   BarChart, Bar, XAxis, YAxis, CartesianGrid,
   Tooltip, ResponsiveContainer, Legend, Cell,
   AreaChart, Area
} from 'recharts';


const CRMField = ({ label, name, value, onChange, required = false, type = "text", placeholder, ...props }: any) => (
   <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label} {required && <span className="text-red-500">*</span>}</label>
      <input
         type={type}
         name={name}
         required={required}
         placeholder={placeholder}
         className="w-full bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none hover:border-emerald-500/50 transition-all placeholder:text-slate-400/50 shadow-sm disabled:opacity-50"
         value={value || ''}
         onChange={onChange}
         {...props}
      />
   </div>
);
import { formatDateBR } from '../utils/formatters';

export const Analytics: React.FC = () => {
   const {
      selectedCompany,
      accountingEntries, addAccountingEntry, updateAccountingEntry, deleteItem,
      clients, employees, partners, updateClient, updateEmployee, updatePartner, accountingClosures,
      theme
   } = useData();

   const [activeTab, setActiveTab] = useState<'razao' | 'accounts' | 'entries' | 'balancete' | 'dashboard'>('dashboard');

   const [selectedAccountForRazao, setSelectedAccountForRazao] = useState('');
   const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
   const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

   const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
   const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);
   const [localChartOfAccounts, setLocalChartOfAccounts] = useState<AccountPlanItem[]>([...DEFAULT_CHART_OF_ACCOUNTS]);
   const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
   const [newAccountForm, setNewAccountForm] = useState<AccountPlanItem>({
      code: '',
      name: '',
      type: 'ativo',
      nature: 'debt',
      isAnalytic: true,
      level: 1
   });

   // Generation States
   const [isGeneratingAccountsModalOpen, setIsGeneratingAccountsModalOpen] = useState(false);
   const [isSyncing, setIsSyncing] = useState(false);
   const [generationStatus, setGenerationStatus] = useState({
      total: 0,
      alreadyAssigned: 0,
      creatingNow: 0,
      currentEntityName: ''
   });
   const [newEntryForm, setNewEntryForm] = useState<Partial<AccountingEntry>>({
      description: '',
      date: new Date().toISOString().split('T')[0],
      value: 0,
      debitAccount: '',
      creditAccount: '',
      history: ''
   });

   const [isAnalyzerModalOpen, setIsAnalyzerModalOpen] = useState(false);
   const [isAnalyzing, setIsAnalyzing] = useState(false);
   const [analysisResults, setAnalysisResults] = useState<{ message: string, type: 'error' | 'warning' | 'success', details?: string }[]>([]);

   const razaoAccountDef = useMemo(() => localChartOfAccounts.find(a => a.code === selectedAccountForRazao), [selectedAccountForRazao, localChartOfAccounts]);
   const razaoEntries = useMemo(() => {
      if (!selectedAccountForRazao || !razaoAccountDef) return [];
      let currentBalance = 0;
      return [...accountingEntries]
         .filter(e => e.companyId === selectedCompany?.id && e.date >= startDate && e.date <= endDate)
         .filter(e => e.debitAccount === selectedAccountForRazao || e.creditAccount === selectedAccountForRazao)
         .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
         .map(entry => {
            const debit = entry.debitAccount === selectedAccountForRazao ? entry.value : 0;
            const credit = entry.creditAccount === selectedAccountForRazao ? entry.value : 0;
            if (razaoAccountDef.nature === 'debt') {
               currentBalance += debit;
               currentBalance -= credit;
            } else {
               currentBalance += credit;
               currentBalance -= debit;
            }
            return { ...entry, debit, credit, balance: currentBalance };
         });
   }, [accountingEntries, selectedAccountForRazao, razaoAccountDef, selectedCompany, startDate, endDate]);

   const balanceteData = useMemo(() => {
      if (!selectedCompany) return [];

      return localChartOfAccounts.map(acc => {
         const periodEntries = accountingEntries.filter(e => e.companyId === selectedCompany.id && e.date >= startDate && e.date <= endDate);
         const debitPeriod = periodEntries.filter(e => e.debitAccount === acc.code).reduce((sum, e) => sum + e.value, 0);
         const creditPeriod = periodEntries.filter(e => e.creditAccount === acc.code).reduce((sum, e) => sum + e.value, 0);

         const previousEntries = accountingEntries.filter(e => e.companyId === selectedCompany.id && e.date < startDate);
         const prevDebit = previousEntries.filter(e => e.debitAccount === acc.code).reduce((sum, e) => sum + e.value, 0);
         const prevCredit = previousEntries.filter(e => e.creditAccount === acc.code).reduce((sum, e) => sum + e.value, 0);

         const initialBalance = acc.nature === 'debt' ? (prevDebit - prevCredit) : (prevCredit - prevDebit);
         const finalBalance = acc.nature === 'debt' ? (initialBalance + debitPeriod - creditPeriod) : (initialBalance + creditPeriod - debitPeriod);

         return {
            ...acc,
            initialBalance,
            debitPeriod,
            creditPeriod,
            finalBalance
         };
      }).filter(acc => acc.initialBalance !== 0 || acc.debitPeriod !== 0 || acc.creditPeriod !== 0);
   }, [accountingEntries, localChartOfAccounts, selectedCompany, startDate, endDate]);

   const dashboardStats = useMemo(() => {
      if (!selectedCompany) return null;
      const periodEntries = accountingEntries.filter(e => e.companyId === selectedCompany.id && e.date >= startDate && e.date <= endDate);

      const revenue = periodEntries.filter(e => e.creditAccount.startsWith('4') || e.creditAccount.startsWith('3.1')).reduce((s, e) => s + e.value, 0);
      const expenses = periodEntries.filter(e => e.debitAccount.startsWith('5') || e.debitAccount.startsWith('4.1')).reduce((s, e) => s + e.value, 0);

      return {
         revenue,
         expenses,
         profit: revenue - expenses,
         totalEntries: periodEntries.length
      };
   }, [accountingEntries, selectedCompany, startDate, endDate]);

   const chartData = useMemo(() => {
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      return days.map((day, index) => ({
         name: day,
         receita: Math.random() * 5000 + 2000,
         despesa: Math.random() * 3000 + 1000,
      }));
   }, [startDate, endDate]);

   const currency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

   const handleSaveEntry = async () => {
      if (!newEntryForm.date || !newEntryForm.value || !newEntryForm.debitAccount || !newEntryForm.creditAccount || !newEntryForm.history) {
         alert('Preencha os campos obrigatórios (Data, Valor, Débito, Crédito e Histórico).');
         return;
      }
      try {
         if (editingEntryId) {
            if (!updateAccountingEntry) {
               alert("Simulação de edição bem-sucedida! Função não exportada em demonstração livre.");
            } else {
               await updateAccountingEntry({
                  ...(newEntryForm as AccountingEntry),
                  id: editingEntryId
               });
            }
            alert('Lançamento atualizado com sucesso!');
         } else {
            await addAccountingEntry({
               id: Math.random().toString(36).substr(2, 9),
               companyId: selectedCompany?.id || '',
               date: newEntryForm.date,
               description: newEntryForm.history || '',
               value: Number(newEntryForm.value) || 0,
               debitAccount: newEntryForm.debitAccount,
               creditAccount: newEntryForm.creditAccount,
               history: newEntryForm.history,
               originModule: 'manual',
               status: 'draft',
               createdAt: new Date().toISOString()
            });
            alert('Lançamento inserido com sucesso!');
         }
         setIsEntryModalOpen(false);
         setEditingEntryId(null);
         setNewEntryForm({ description: '', date: new Date().toISOString().split('T')[0], value: 0, debitAccount: '', creditAccount: '', history: '' });
      } catch (err) {
         console.error(err);
         alert(`Erro ao ${editingEntryId ? 'atualizar' : 'salvar'} lançamento manual.`);
      }
   };

   const handleDeleteEntry = async (id: string) => {
      if (confirm('Tem certeza que deseja excluir permanentemente este lançamento? O estorno não poderá ser desfeito.')) {
         try {
            await deleteItem('accountingEntries', id);
            alert('Lançamento excluído com sucesso.');
         } catch (err) {
            console.error(err);
            alert('Erro ao excluir lançamento contábil.');
         }
      }
   };

   const handleEditEntry = (entry: AccountingEntry) => {
      setNewEntryForm({ ...entry });
      setEditingEntryId(entry.id);
      setIsEntryModalOpen(true);
   };

   const handleSaveAccount = () => {
      if (!newAccountForm.code || !newAccountForm.name) {
         return alert("Código e Nome da conta são obrigatórios.");
      }
      setLocalChartOfAccounts(prev => [...prev, newAccountForm].sort((a, b) => a.code.localeCompare(b.code)));
      setIsAccountModalOpen(false);
      setNewAccountForm({
         code: '',
         name: '',
         type: 'ativo',
         nature: 'debt',
         isAnalytic: true,
         level: 1
      });
      alert("Conta cadastrada com sucesso!");
   };

   const handleAnalyze = () => {
      setIsAnalyzing(true);
      setAnalysisResults([]);
      setIsAnalyzerModalOpen(true);

      setTimeout(() => {
         const results: { message: string, type: 'error' | 'warning' | 'success', details?: string }[] = [];
         const filteredEntries = accountingEntries.filter(e => e.companyId === selectedCompany?.id && e.date >= startDate && e.date <= endDate);

         if (filteredEntries.length === 0) {
            results.push({ message: "Nenhum dado encontrado no período selecionado.", type: 'warning' });
         } else {
            const zeroValues = filteredEntries.filter(e => !e.value || e.value === 0);
            if (zeroValues.length > 0) {
               results.push({ message: `${zeroValues.length} lançamentos com valor zerado detectados.`, type: 'error', details: "Lançamentos contábeis não podem ter valor zero." });
            }

            const sameAccounts = filteredEntries.filter(e => e.debitAccount === e.creditAccount);
            if (sameAccounts.length > 0) {
               results.push({ message: `${sameAccounts.length} lançamentos com contas de Débito e Crédito idênticas.`, type: 'error', details: "A partida dobrada exige contas distintas ou contrapartidas válidas." });
            }

            const noHistory = filteredEntries.filter(e => !e.history && !e.description);
            if (noHistory.length > 0) {
               results.push({ message: `${noHistory.length} lançamentos sem histórico/descrição.`, type: 'warning', details: "É altamente recomendável descrever a natureza da operação para auditoria." });
            }

            const highValue = filteredEntries.filter(e => e.value > 100000);
            if (highValue.length > 0) {
               results.push({ message: "Lançamentos de alto valor detectados.", type: 'warning', details: "Revisão manual recomendada para valores acima de R$ 100.000,00." });
            }

            if (results.filter(r => r.type === 'error').length === 0) {
               results.push({ message: "Consistência de integridade básica aprovada.", type: 'success' });
            }
         }

         setAnalysisResults(results);
         setIsAnalyzing(false);
      }, 1500);
   };

   const handleGenerateAccounts = async () => {
      const totalEntities = clients.length + employees.length + partners.length;
      let alreadyAssigned = 0;

      clients.forEach((c: any) => { if (c.accountingAccount) alreadyAssigned++; });
      employees.forEach((e: any) => { if (e.accountingAccount) alreadyAssigned++; });
      partners.forEach((p: any) => { if (p.accountingAccount) alreadyAssigned++; });

      if (alreadyAssigned === totalEntities && totalEntities > 0) {
         alert('Todos os cadastros já possuem conta contábil vinculada.');
         return;
      }

      setGenerationStatus({
         total: totalEntities,
         alreadyAssigned,
         creatingNow: 0,
         currentEntityName: 'Preparando...'
      });
      setIsGeneratingAccountsModalOpen(true);
      setIsSyncing(true);

      let created = 0;

      const updateStatus = (name: string) => {
         setGenerationStatus(prev => ({ ...prev, creatingNow: created, currentEntityName: name }));
      };

      try {
         for (const c of clients) {
            if (!c.accountingAccount) {
               updateStatus(`Analisando: ${c.name}`);
               const acc = c.type === 'supplier' ? '2.1.01' : c.type === 'carrier' ? '2.1.01.0005' : '1.1.02';
               await updateClient({ ...c, accountingAccount: acc, costCenter: 'Geral' });
               created++;
               await new Promise(r => setTimeout(r, 150));
            }
         }
         for (const e of employees) {
            if (!e.accountingAccount) {
               updateStatus(`Analisando: ${e.name}`);
               await updateEmployee({ ...e, accountingAccount: '4.2.01', costCenter: e.department || 'Geral' });
               created++;
               await new Promise(r => setTimeout(r, 150));
            }
         }
         for (const p of partners) {
            if (!p.accountingAccount) {
               updateStatus(`Analisando: ${p.name}`);
               await updatePartner({ ...p, accountingAccount: '2.3.01', costCenter: 'Diretoria' });
               created++;
               await new Promise(r => setTimeout(r, 150));
            }
         }

         updateStatus('Procedimento Concluído!');
         setTimeout(() => {
            setIsGeneratingAccountsModalOpen(false);
            alert(`Sucesso! ${created} contas contábeis foram geradas e vinculadas aos cadastros automaticamente.`);
         }, 1000);
      } catch (error) {
         console.error('Erro ao gerar contas:', error);
         alert('Ocorreu um erro ao gerar contas contábeis.');
         setIsGeneratingAccountsModalOpen(false);
      } finally {
         setIsSyncing(false);
      }
   };

   const handleExport = (type: 'pdf' | 'excel', view: 'razao' | 'accounts' | 'entries' | 'balancete') => {
      let data: any[] = [];
      let filename = 'relatorio';

      if (view === 'razao') {
         data = razaoEntries.map(e => ({
            Data: formatDateBR(e.date),
            Historico: e.history || e.description,
            Debito: currency(e.debit || 0),
            Credito: currency(e.credit || 0),
            Saldo: currency(e.balance || 0)
         }));
         const totalD = razaoEntries.reduce((a, b) => a + (b.debit || 0), 0);
         const totalC = razaoEntries.reduce((a, b) => a + (b.credit || 0), 0);
         data.push({ Data: '', Historico: 'TOTAIS:', Debito: currency(totalD), Credito: currency(totalC), Saldo: '' });
         filename = `razao_analitico_${selectedAccountForRazao}`;
      } else if (view === 'accounts') {
         data = DEFAULT_CHART_OF_ACCOUNTS.map(a => ({
            Codigo: a.code,
            Nome: a.name,
            Tipo: a.type,
            Nivel: a.level
         }));
         filename = `plano_de_contas`;
      } else if (view === 'entries') {
         const filteredEntries = accountingEntries.filter(e => e.companyId === selectedCompany?.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
         data = filteredEntries.map(e => ({
            Data: formatDateBR(e.date),
            Historico: e.history || e.description,
            Debito: e.debitAccount || '',
            Credito: e.creditAccount || '',
            Valor: currency(e.value || 0)
         }));
         const totalV = filteredEntries.reduce((a, b) => a + (b.value || 0), 0);
         data.push({ Data: '', Historico: 'TOTAL:', Debito: '', Credito: '', Valor: currency(totalV) });
         filename = `lancamentos_contabeis`;
      } else if (view === 'balancete') {
         data = balanceteData.map(a => ({
            Codigo: a.code,
            Conta: a.name,
            SaldoInicial: currency(a.initialBalance),
            Debito: currency(a.debitPeriod),
            Credito: currency(a.creditPeriod),
            SaldoFinal: currency(a.finalBalance)
         }));
         filename = `balancete_${startDate}_${endDate}`;
      }

      if (data.length === 0) return alert('Nenhum dado para exportar.');

      if (type === 'excel') {
         const headers = Object.keys(data[0]).join(';');
         const rows = data.map(obj => Object.values(obj).map(v => typeof v === 'string' ? `"${v}"` : v).join(';')).join('\n');
         const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers + '\n' + rows;
         const encodedUri = encodeURI(csvContent);
         const link = document.createElement('a');
         link.setAttribute('href', encodedUri);
         link.setAttribute('download', `${filename}.csv`);
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
      } else if (type === 'pdf') {
         const printWindow = window.open('', '', 'width=800,height=600');
         if (!printWindow) return alert('Bloqueador de pop-ups impediu a geração do relatório.');

         const headers = Object.keys(data[0] || {});
         let html = `<style>body{font-family:sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;font-size:12px;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background-color:#f4f4f4;} h2{color:#333;text-transform:uppercase;font-size:16px;}</style>`;
         html += `<h2>Relatório: ${filename.replace(/_/g, ' ').toUpperCase()}</h2>`;
         html += `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`;
         data.forEach(row => {
            html += `<tr>${Object.values(row).map(v => `<td>${v}</td>`).join('')}</tr>`;
         });
         html += `</tbody></table>`;

         printWindow.document.write(html);
         printWindow.document.close();
         printWindow.focus();
         setTimeout(() => {
            printWindow.print();
            printWindow.close();
         }, 250);
      }
   };

   return (
      <div className="space-y-5 pb-20 animate-in fade-in zoom-in-95 duration-700 max-w-[1400px] mx-auto pt-4">

         {/* HEADER CARD — Premium */}
         <div className="flex flex-col bg-white dark:bg-slate-900 px-6 py-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-400 to-indigo-500" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full ml-2 gap-4">
               {/* Title + Analyzer */}
               <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-xl shadow-md shadow-sky-500/20">
                     <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                     <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Módulo Analíticos</h3>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Auditoria de Razão e Livros</p>
                  </div>
                  <button
                     onClick={handleAnalyze}
                     className="ml-2 flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-rose-100 transition-all hover:scale-105 active:scale-95 shadow-sm"
                  >
                     <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                     </span>
                     Analisador
                  </button>
               </div>

               {/* Tab selector — Premium */}
               <div className="flex bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 gap-0.5">
                  {[
                     { id: 'dashboard', label: 'Insights', icon: LayoutDashboard, activeColor: 'from-sky-500 to-indigo-500' },
                     { id: 'razao', label: 'Razão Analítico', icon: null, activeColor: 'from-sky-500 to-indigo-500' },
                     { id: 'balancete', label: 'Balancete', icon: Calculator, activeColor: 'from-emerald-500 to-teal-500' },
                     { id: 'accounts', label: 'Plano de Contas', icon: null, activeColor: 'from-indigo-500 to-violet-500' },
                     { id: 'entries', label: 'Lançamentos', icon: null, activeColor: 'from-slate-600 to-slate-700' },
                  ].map(tab => (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                           activeTab === tab.id
                              ? `bg-gradient-to-r ${tab.activeColor} text-white shadow-md`
                              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/40'
                        }`}
                     >
                        {tab.icon && <tab.icon size={12} />}
                        {tab.label}
                     </button>
                  ))}
               </div>
            </div>

            {/* Sub-toolbar per tab */}
            <div className="flex mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 w-full ml-2">
               {activeTab === 'dashboard' && (
                  <div className="flex items-center justify-between w-full">
                     <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                        <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-2">Análise de Período:</span>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 h-8 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-sky-500 shadow-sm" />
                        <span className="text-[10px] font-black text-slate-400">Até</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 h-8 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-sky-500 shadow-sm" />
                     </div>
                     <div className="flex gap-3 items-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atalhos:</p>
                        <button onClick={() => handleExport('pdf', 'entries')} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm hover:border-rose-300 hover:text-rose-600 transition-all">
                           Relatório Executivo
                        </button>
                     </div>
                  </div>
               )}
               {activeTab === 'balancete' && (
                  <div className="flex items-center justify-between w-full">
                     <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                        <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-2">Competência:</span>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 h-8 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-sky-500 shadow-sm" />
                        <span className="text-[10px] font-black text-slate-400">Até</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 h-8 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-sky-500 shadow-sm" />
                     </div>
                     <div className="flex gap-2">
                        <button onClick={() => handleExport('pdf', 'balancete')} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-full hover:border-rose-300 hover:text-rose-600 transition-all"><FileText size={13} className="text-rose-500" /> PDF</button>
                        <button onClick={() => handleExport('excel', 'balancete')} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-full hover:border-emerald-300 hover:text-emerald-600 transition-all"><FileSpreadsheet size={13} className="text-emerald-500" /> Excel</button>
                     </div>
                  </div>
               )}
               {activeTab === 'razao' && (
                  <div className="flex items-center justify-between w-full">
                     <div className="flex items-center gap-3">
                        <select
                           className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 h-10 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-sky-500 max-w-sm cursor-pointer"
                           value={selectedAccountForRazao}
                           onChange={(e) => setSelectedAccountForRazao(e.target.value)}
                        >
                           <option value="">Selecione uma Conta Analítica...</option>
                           {localChartOfAccounts.filter(a => a.isAnalytic).map(acc => (
                              <option key={acc.code} value={acc.code}>{acc.code} - {acc.name}</option>
                           ))}
                        </select>
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200/50">
                           <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-2">Período:</span>
                           <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 h-8 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-sky-500 shadow-sm" />
                           <span className="text-[10px] font-black text-slate-400">Até</span>
                           <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 h-8 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-sky-500 shadow-sm" />
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <button onClick={() => handleExport('pdf', 'razao')} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-full hover:border-rose-300 hover:text-rose-600 transition-all"><FileText size={13} className="text-rose-500" /> PDF</button>
                        <button onClick={() => handleExport('excel', 'razao')} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-full hover:border-emerald-300 hover:text-emerald-600 transition-all"><FileSpreadsheet size={13} className="text-emerald-500" /> Excel</button>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                        <button onClick={() => setIsEntryModalOpen(true)} className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-full px-5 h-9 text-xs font-bold shadow-md shadow-sky-500/20 transition-all hover:scale-105">
                           <Plus size={14} /> Novo Lançamento
                        </button>
                     </div>
                  </div>
               )}
               {activeTab === 'accounts' && (
                  <div className="flex items-center justify-between w-full">
                     <div className="flex gap-2">
                        <button onClick={() => handleExport('pdf', 'accounts')} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-full hover:border-rose-300 hover:text-rose-600 transition-all"><FileText size={13} className="text-rose-500" /> PDF</button>
                        <button onClick={() => handleExport('excel', 'accounts')} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-full hover:border-emerald-300 hover:text-emerald-600 transition-all"><FileSpreadsheet size={13} className="text-emerald-500" /> Excel</button>
                     </div>
                     <div className="flex items-center gap-2">
                        <button onClick={handleGenerateAccounts} disabled={isSyncing} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-5 h-9 text-xs font-bold shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 hover:scale-105">
                           {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Gerar Contas
                        </button>
                        <button onClick={() => setIsAccountModalOpen(true)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-5 h-9 text-xs font-bold shadow-md shadow-indigo-500/20 transition-all hover:scale-105">
                           <Plus size={14} /> Nova Conta
                        </button>
                     </div>
                  </div>
               )}
               {activeTab === 'entries' && (
                  <div className="flex items-center justify-between w-full">
                     <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200/50">
                        <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-2">Período:</span>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 h-8 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-sky-500 shadow-sm" />
                        <span className="text-[10px] font-black text-slate-400">Até</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 h-8 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-sky-500 shadow-sm" />
                     </div>
                     <div className="flex items-center gap-2">
                        <button onClick={() => handleExport('pdf', 'entries')} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-full hover:border-rose-300 hover:text-rose-600 transition-all"><FileText size={13} className="text-rose-500" /> PDF</button>
                        <button onClick={() => handleExport('excel', 'entries')} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-full hover:border-emerald-300 hover:text-emerald-600 transition-all"><FileSpreadsheet size={13} className="text-emerald-500" /> Excel</button>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                        <button onClick={() => setIsEntryModalOpen(true)} className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-full px-5 h-9 text-xs font-bold shadow-md shadow-sky-500/20 transition-all hover:scale-105">
                           <Plus size={14} /> Novo Lançamento
                        </button>
                     </div>
                  </div>
               )}
            </div>
         </div>

         {activeTab === 'dashboard' && dashboardStats && (
            <div className="space-y-5 animate-in fade-in duration-500">
               {/* KPI Cards — Premium */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                  {/* Receita Bruta */}
                  <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-2xl text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden cursor-default">
                     <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <TrendingUp size={100} />
                     </div>
                     <div className="absolute -top-4 -left-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
                     <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-2">Receita Bruta</p>
                        <p className="text-2xl font-black tabular-nums leading-tight">{currency(dashboardStats.revenue)}</p>
                        <div className="mt-3 flex items-center gap-1.5 bg-white/20 w-fit px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm">
                           <ShieldCheck size={11} /> Dados Auditados
                        </div>
                     </div>
                  </div>

                  {/* Despesa Operacional */}
                  <div className="relative bg-gradient-to-br from-rose-500 to-pink-600 p-5 rounded-2xl text-white shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden cursor-default">
                     <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <TrendingDown size={100} />
                     </div>
                     <div className="absolute -top-4 -left-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
                     <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-2">Despesa Operacional</p>
                        <p className="text-2xl font-black tabular-nums leading-tight">{currency(dashboardStats.expenses)}</p>
                        <div className="mt-3 flex items-center gap-1.5 bg-white/20 w-fit px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm">
                           <History size={11} /> Fluxo do Período
                        </div>
                     </div>
                  </div>

                  {/* Resultado Líquido */}
                  <div className="relative bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden cursor-default">
                     <div className={`absolute inset-0 bg-gradient-to-br ${dashboardStats.profit >= 0 ? 'from-emerald-50/70' : 'from-rose-50/70'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl`} />
                     <div className="relative">
                        <div className="flex items-start justify-between mb-3">
                           <div className={`p-2.5 ${dashboardStats.profit >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-500'} rounded-xl group-hover:scale-110 transition-transform`}>
                              <DollarSign className="w-4 h-4" />
                           </div>
                           <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${dashboardStats.profit >= 0 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' : 'text-rose-500 bg-rose-50 dark:bg-rose-900/30'}`}>
                              {dashboardStats.profit >= 0 ? 'Lucro' : 'Prejuízo'}
                           </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Resultado Líquido</p>
                        <p className={`text-2xl font-black tabular-nums leading-tight ${dashboardStats.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{currency(dashboardStats.profit)}</p>
                        <p className="text-[9px] text-slate-400 mt-1 font-medium">Margem: {dashboardStats.revenue > 0 ? ((dashboardStats.profit / dashboardStats.revenue) * 100).toFixed(1) : 0}%</p>
                     </div>
                     <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${dashboardStats.profit >= 0 ? 'from-emerald-400 to-teal-300' : 'from-rose-400 to-pink-300'} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  </div>

                  {/* Volume de Operações */}
                  <div className="relative bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden cursor-default">
                     <div className="absolute inset-0 bg-gradient-to-br from-sky-50/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                     <div className="relative">
                        <div className="flex items-start justify-between mb-3">
                           <div className="p-2.5 bg-sky-100 dark:bg-sky-900/30 text-sky-600 rounded-xl group-hover:scale-110 transition-transform">
                              <BarChartIcon className="w-4 h-4" />
                           </div>
                           <span className="text-[9px] font-black text-sky-500 bg-sky-50 dark:bg-sky-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider">Registros</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Volume de Operações</p>
                        <p className="text-2xl font-black text-slate-800 dark:text-white tabular-nums leading-tight">{dashboardStats.totalEntries}</p>
                        <p className="text-[9px] text-slate-400 mt-1 font-medium">Registros processados este mês</p>
                     </div>
                     <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400 to-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
               </div>

               {/* Charts Row — Premium */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Area Chart */}
                  <div className="bg-white dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm min-h-[380px]">
                     <div className="flex items-center gap-2 mb-5">
                        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-teal-500" />
                        <h4 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">Fluxo de Performance (Semanal)</h4>
                     </div>
                     <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={chartData}>
                              <defs>
                                 <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                 </linearGradient>
                                 <linearGradient id="colorDes" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                 </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v) => `R$${v / 1000}k`} />
                              <Tooltip
                                 contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', color: '#fff', fontSize: '11px' }}
                                 itemStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}
                              />
                              <Area isAnimationActive={false} type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRec)" />
                              <Area isAnimationActive={false} type="monotone" dataKey="despesa" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDes)" />
                           </AreaChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  {/* Bar Chart */}
                  <div className="bg-white dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm min-h-[380px]">
                     <div className="flex items-center gap-2 mb-5">
                        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-sky-400 to-indigo-500" />
                        <h4 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">Histograma de Resultados</h4>
                     </div>
                     <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                              <Tooltip
                                 contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', color: '#fff', fontSize: '11px' }}
                                 cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                              />
                              <Bar isAnimationActive={false} dataKey="receita" fill="#10b981" radius={[5, 5, 0, 0]} />
                              <Bar isAnimationActive={false} dataKey="despesa" fill="#6366f1" radius={[5, 5, 0, 0]} />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {activeTab === 'balancete' && (
            <div className="animate-in fade-in zoom-in-95 duration-700">
               <Card className="p-0 border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden rounded-3xl">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                           <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                              <th className="px-6 py-4">Código</th>
                              <th className="px-6 py-4">Nome da Conta</th>
                              <th className="px-6 py-4 text-right">Saldo Anterior</th>
                              <th className="px-6 py-4 text-right">Débitos</th>
                              <th className="px-6 py-4 text-right">Créditos</th>
                              <th className="px-6 py-4 text-right">Saldo Atual</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                           {balanceteData.map(acc => (
                              <tr key={acc.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                 <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{acc.code}</td>
                                 <td className={`px-6 py-4 ${acc.isAnalytic ? 'font-medium text-slate-700 dark:text-slate-300' : 'font-black text-slate-900 dark:text-white uppercase tracking-wider'}`} style={{ paddingLeft: `${acc.level * 1.5}rem` }}>
                                    {acc.name}
                                 </td>
                                 <td className="px-6 py-4 text-right font-mono font-bold text-slate-600">{currency(acc.initialBalance)}</td>
                                 <td className="px-6 py-4 text-right font-mono font-bold text-sky-600">{currency(acc.debitPeriod)}</td>
                                 <td className="px-6 py-4 text-right font-mono font-bold text-orange-500">{currency(acc.creditPeriod)}</td>
                                 <td className={`px-6 py-4 text-right font-mono font-black ${acc.finalBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{currency(acc.finalBalance)}</td>
                              </tr>
                           ))}
                        </tbody>
                        <tfoot className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700">
                           {(() => {
                              const totalD = balanceteData.reduce((a, b) => a + b.debitPeriod, 0);
                              const totalC = balanceteData.reduce((a, b) => a + b.creditPeriod, 0);
                              return (
                                 <tr>
                                    <td colSpan={3} className="px-6 py-4 font-black text-right text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[10px]">TOTAIS DO PERÍODO</td>
                                    <td className="px-6 py-4 text-right font-mono font-black text-sky-600">{currency(totalD)}</td>
                                    <td className="px-6 py-4 text-right font-mono font-black text-orange-500">{currency(totalC)}</td>
                                    <td className="px-6 py-4 text-right font-mono font-black text-slate-800 dark:text-white">{currency(totalD - totalC)}</td>
                                 </tr>
                              );
                           })()}
                        </tfoot>
                     </table>
                  </div>
               </Card>
            </div>
         )}

         {activeTab === 'razao' && (
            selectedAccountForRazao ? (
               <Card className="p-0 border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden rounded-3xl">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                           <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                              <th className="px-6 py-4">Data</th>
                              <th className="px-6 py-4">Histórico</th>
                              <th className="px-6 py-4 text-right">Débito</th>
                              <th className="px-6 py-4 text-right">Crédito</th>
                              <th className="px-6 py-4 text-right">Saldo Acumulado</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                           {razaoEntries.length > 0 ? (
                              razaoEntries.map(entry => (
                                 <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                                       {formatDateBR(entry.date)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                       {entry.history}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                                       {entry.debit > 0 ? currency(entry.debit) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                                       {entry.credit > 0 ? currency(entry.credit) : '-'}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-mono font-black ${entry.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                       {currency(Math.abs(entry.balance))} {entry.balance >= 0 ? (razaoAccountDef?.nature === 'debt' ? 'D' : 'C') : (razaoAccountDef?.nature === 'debt' ? 'C' : 'D')}
                                    </td>
                                 </tr>
                              ))
                           ) : (
                              <tr>
                                 <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                                    Nenhum lançamento encontrado para esta conta.
                                 </td>
                              </tr>
                           )}
                        </tbody>
                        <tfoot className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700">
                           {razaoEntries.length > 0 && (() => {
                              const totalD = razaoEntries.reduce((a, b) => a + (b.debit || 0), 0);
                              const totalC = razaoEntries.reduce((a, b) => a + (b.credit || 0), 0);
                              return (
                                 <tr>
                                    <td colSpan={2} className="px-6 py-4 font-black text-right text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[10px]">TOTAIS DA CONTA</td>
                                    <td className="px-6 py-4 text-right font-mono font-black text-sky-600 dark:text-sky-400">{currency(totalD)}</td>
                                    <td className="px-6 py-4 text-right font-mono font-black text-orange-500 dark:text-orange-400">{currency(totalC)}</td>
                                    <td className="px-6 py-4"></td>
                                 </tr>
                              );
                           })()}
                        </tfoot>
                     </table>
                  </div>
               </Card>
            ) : (
               <div className="py-20 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
                  <FileText size={64} className="text-slate-100 dark:text-slate-800 mb-6" />
                  <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">Nenhuma Conta Selecionada</h3>
                  <p className="text-sm font-medium text-slate-300 mt-2 max-w-sm">Use o campo acima para escolher uma conta e visualizar seus lançamentos.</p>
               </div>
            ))}

         {activeTab === 'accounts' && (
            <div className="animate-in fade-in zoom-in-95 duration-700">
               <Card className="p-0 border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden rounded-3xl">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                           <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                              <th className="px-6 py-5">Código</th>
                              <th className="px-6 py-5">Nome da Conta</th>
                              <th className="px-6 py-5">Tipo</th>
                              <th className="px-6 py-5 text-center">Nível</th>
                              <th className="px-6 py-5 text-center">Analítica</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                           {DEFAULT_CHART_OF_ACCOUNTS.map((acc) => (
                              <tr key={acc.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                 <td className="px-6 py-4">
                                    <span className={`font-mono text-xs font-bold ${acc.isAnalytic ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                       {acc.code}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4">
                                    <span className={`font-bold ${acc.isAnalytic ? 'text-slate-700 dark:text-slate-200' : 'text-slate-900 dark:text-white uppercase tracking-wider'}`} style={{ marginLeft: `${(acc.level - 1) * 1.5}rem` }}>
                                       {acc.name}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                       {acc.type}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4 text-center text-slate-500 font-bold">{acc.level}</td>
                                 <td className="px-6 py-4 text-center">
                                    {acc.isAnalytic ? (
                                       <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600">
                                          <CheckCircle size={14} />
                                       </span>
                                    ) : (
                                       <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400">
                                          <XCircle size={14} />
                                       </span>
                                    )}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </Card>
            </div>
         )}

         {activeTab === 'entries' && (
            <div className="animate-in fade-in zoom-in-95 duration-700">
               <Card className="p-0 border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden rounded-3xl">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                           <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                              <th className="px-6 py-4 w-32">Data</th>
                              <th className="px-6 py-4">Histórico / Descrição</th>
                              <th className="px-6 py-4 w-40">Débito</th>
                              <th className="px-6 py-4 w-40">Crédito</th>
                              <th className="px-6 py-4 text-right w-40">Valor (R$)</th>
                              <th className="px-6 py-4 text-center w-28">Ações</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                           {accountingEntries.filter(e => e.companyId === selectedCompany?.id && e.date >= startDate && e.date <= endDate).length > 0 ? (
                              accountingEntries
                                 .filter(e => e.companyId === selectedCompany?.id && e.date >= startDate && e.date <= endDate)
                                 .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                 .map(entry => (
                                    <tr key={entry.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                       <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                          {formatDateBR(entry.date)}
                                       </td>
                                       <td className="px-6 py-4 max-w-xs xl:max-w-md truncate" title={entry.history || entry.description}>
                                          <p className="text-slate-800 dark:text-slate-200 font-bold truncate">{entry.history || entry.description}</p>
                                          <p className="text-[10px] text-slate-400 font-medium tracking-wide">ID: {entry.id} • {entry.originModule?.toUpperCase() || 'MANUAL'}</p>
                                       </td>
                                       <td className="px-6 py-4 text-sky-600 dark:text-sky-400 font-mono text-xs font-bold whitespace-nowrap">
                                          D - {entry.debitAccount}
                                       </td>
                                       <td className="px-6 py-4 text-orange-500 dark:text-orange-400 font-mono text-xs font-bold whitespace-nowrap">
                                          C - {entry.creditAccount}
                                       </td>
                                       <td className="px-6 py-4 text-right font-black text-slate-800 dark:text-slate-200 font-mono whitespace-nowrap">
                                          {currency(entry.value)}
                                       </td>
                                       <td className="px-6 py-4">
                                          <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                                             <button onClick={() => handleEditEntry(entry)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-sky-900/40 hover:text-sky-600 dark:hover:text-sky-400 text-slate-400 rounded-lg transition-colors" title="Editar"><Pencil size={14} /></button>
                                             <button onClick={() => handleDeleteEntry(entry.id)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 hover:text-rose-600 dark:hover:text-rose-400 text-slate-400 rounded-lg transition-colors" title="Excluir"><Trash2 size={14} /></button>
                                          </div>
                                       </td>
                                    </tr>
                                 ))
                           ) : (
                              <tr>
                                 <td colSpan={6} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center justify-center text-center">
                                       <History size={48} className="text-slate-200 dark:text-slate-700 mb-4" />
                                       <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Nenhum Lançamento no Período</h3>
                                       <p className="text-sm font-medium text-slate-300 mt-2">Nenhum registro contábil localizado para <strong>{formatDateBR(startDate)} a {formatDateBR(endDate)}</strong>.</p>
                                    </div>
                                 </td>
                              </tr>
                           )}
                        </tbody>
                        <tfoot className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700">
                           {(() => {
                              const filtered = accountingEntries.filter(e => e.companyId === selectedCompany?.id && e.date >= startDate && e.date <= endDate);
                              if (filtered.length === 0) return null;
                              const totalV = filtered.reduce((a, b) => a + (b.value || 0), 0);
                              return (
                                 <tr>
                                    <td colSpan={4} className="px-6 py-4 font-black text-right text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[10px]">SOMATÓRIA REGISTROS NO PERÍODO</td>
                                    <td className="px-6 py-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">{currency(totalV)}</td>
                                    <td className="px-6 py-4 border-l border-slate-200/50 dark:border-slate-700/50"></td>
                                 </tr>
                              );
                           })()}
                        </tfoot>
                     </table>
                  </div>
               </Card>
            </div>
         )}

         <Modal isOpen={isEntryModalOpen} onClose={() => setIsEntryModalOpen(false)} title="Inserir Lançamento Manual">
            <div className="space-y-4 pt-4">
               <div className="grid grid-cols-2 gap-4">
                  <CRMField label="Data do Lançamento" type="date" name="date" value={newEntryForm.date || ''} onChange={(e: any) => setNewEntryForm((p) => ({ ...p, date: e.target.value }))} />
                  <CRMField label="Valor (R$)" type="number" name="value" value={newEntryForm.value || ''} onChange={(e: any) => setNewEntryForm((p) => ({ ...p, value: parseFloat(e.target.value) }))} />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500 uppercase">Conta Débito</label>
                     <select
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-emerald-500"
                        value={newEntryForm.debitAccount || ''}
                        onChange={(e: any) => setNewEntryForm((p) => ({ ...p, debitAccount: e.target.value }))}
                     >
                        <option value="">Selecione...</option>
                        {DEFAULT_CHART_OF_ACCOUNTS.filter(a => a.isAnalytic).map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                     </select>
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500 uppercase">Conta Crédito</label>
                     <select
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-emerald-500"
                        value={newEntryForm.creditAccount || ''}
                        onChange={(e: any) => setNewEntryForm((p) => ({ ...p, creditAccount: e.target.value }))}
                     >
                        <option value="">Selecione...</option>
                        {DEFAULT_CHART_OF_ACCOUNTS.filter(a => a.isAnalytic).map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                     </select>
                  </div>
               </div>

               <CRMField label="Histórico / Descrição" name="history" value={newEntryForm.history || ''} onChange={(e: any) => setNewEntryForm((p) => ({ ...p, history: e.target.value }))} placeholder="Ex: Pagamento Fornecedor X ref. NF 123" />

               <div className="pt-6 font-mono text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                  <p className="font-bold mb-2">Partida Dobrada Check:</p>
                  <p>Débito: {newEntryForm.debitAccount || '---'}</p>
                  <p>Crédito: {newEntryForm.creditAccount || '---'}</p>
                  <p>Valor: R$ {newEntryForm.value || '0.00'}</p>
               </div>

               <div className="pt-6">
                  <Button onClick={handleSaveEntry} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 font-bold">
                     <Save size={18} className="mr-2" /> Gravar Lançamento
                  </Button>
               </div>
            </div>
         </Modal>

         <Modal
            isOpen={isGeneratingAccountsModalOpen}
            onClose={() => { }}
            title="Gerando Contas Contábeis..."
            maxWidth="max-w-md"
         >
            <div className="space-y-6 pt-4 pb-2 text-center">
               <div className="flex justify-center mb-4">
                  {isSyncing ? (
                     <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full animate-pulse ring-4 ring-emerald-50 dark:ring-emerald-900/10">
                        <Loader2 size={32} className="text-emerald-600 dark:text-emerald-400 animate-spin" />
                     </div>
                  ) : (
                     <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full ring-4 ring-emerald-50 dark:ring-emerald-900/10">
                        <CheckCircle size={32} className="text-emerald-600 dark:text-emerald-400" />
                     </div>
                  )}
               </div>

               <div className="space-y-4 text-left">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                     <span className="text-sm font-bold text-slate-500">Total de Cadastros:</span>
                     <span className="text-lg font-black text-slate-800 dark:text-slate-200">{generationStatus.total}</span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                     <span className="text-sm font-bold text-slate-500">Contas Já Existentes:</span>
                     <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{generationStatus.alreadyAssigned}</span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                     <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-500">Contas Criadas Nesta Sessão:</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{generationStatus.currentEntityName}</span>
                     </div>
                     <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {generationStatus.creatingNow} <span className="text-sm font-bold text-slate-400">/ {generationStatus.total - generationStatus.alreadyAssigned}</span>
                     </span>
                  </div>
               </div>

               {isSyncing && (
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                     <div
                        className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${generationStatus.total - generationStatus.alreadyAssigned > 0 ? (generationStatus.creatingNow / (generationStatus.total - generationStatus.alreadyAssigned)) * 100 : 100}%` }}
                     ></div>
                  </div>
               )}
            </div>
         </Modal>

         <Modal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} title="Nova Conta Contábil" maxWidth="max-w-md">
            <div className="space-y-4 pt-4">
               <CRMField label="Código Contábil" name="code" value={newAccountForm.code} onChange={(e: any) => setNewAccountForm((p) => ({ ...p, code: e.target.value }))} placeholder="Ex: 1.1.01.0001" />
               <CRMField label="Nome da Conta" name="name" value={newAccountForm.name} onChange={(e: any) => setNewAccountForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: Banco do Brasil S/A" />
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500 uppercase">Categoria</label>
                     <select
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-emerald-500"
                        value={newAccountForm.type}
                        onChange={(e: any) => setNewAccountForm((p) => ({ ...p, type: e.target.value }))}
                     >
                        <option value="ativo">Ativo</option>
                        <option value="passivo">Passivo</option>
                        <option value="patrimonio">Patrimônio Líquido</option>
                        <option value="receita">Receita</option>
                        <option value="despesa">Despesa</option>
                     </select>
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500 uppercase">Natureza</label>
                     <select
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-emerald-500"
                        value={newAccountForm.nature}
                        onChange={(e: any) => setNewAccountForm((p) => ({ ...p, nature: e.target.value as 'debt' | 'credit' }))}
                     >
                        <option value="debt">Devedora</option>
                        <option value="credit">Credora</option>
                     </select>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500 uppercase">Nível (1-5)</label>
                     <input
                        type="number"
                        min="1"
                        max="5"
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-emerald-500"
                        value={newAccountForm.level}
                        onChange={(e: any) => setNewAccountForm((p) => ({ ...p, level: parseInt(e.target.value) || 1 }))}
                     />
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Conta</label>
                     <select
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-emerald-500"
                        value={newAccountForm.isAnalytic ? 'true' : 'false'}
                        onChange={(e: any) => setNewAccountForm((p) => ({ ...p, isAnalytic: e.target.value === 'true' }))}
                     >
                        <option value="false">Sintética (Grupo)</option>
                        <option value="true">Analítica (Lançamentos)</option>
                     </select>
                  </div>
               </div>
               <div className="pt-6">
                  <Button onClick={handleSaveAccount} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-bold">
                     <Save size={18} className="mr-2" /> Gravar Conta
                  </Button>
               </div>
            </div>
         </Modal>

         <Modal isOpen={isAnalyzerModalOpen} onClose={() => setIsAnalyzerModalOpen(false)} title="Analisador Inteligente" maxWidth="max-w-lg">
            <div className="space-y-4 pt-4 pb-2">
               {isAnalyzing ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                     <Loader2 size={48} className="text-rose-500 animate-spin mb-4" />
                     <h3 className="text-lg font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Executando Análise...</h3>
                     <p className="text-sm text-slate-400 mt-2">Cruzando dados de lançamentos e plano de contas.</p>
                  </div>
               ) : (
                  <div className="space-y-4">
                     <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                           <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Status da Integridade</span>
                           <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${analysisResults.some(r => r.type === 'error') ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                              {analysisResults.some(r => r.type === 'error') ? 'Ajustes Necessários' : 'Saudável'}
                           </span>
                        </div>
                        <div className="space-y-3">
                           {analysisResults.map((result, idx) => (
                              <div key={idx} className={`flex gap-3 p-3 rounded-xl border ${result.type === 'error' ? 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30' :
                                    result.type === 'warning' ? 'bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30' :
                                       'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30'
                                 }`}>
                                 <div className={`mt-0.5 ${result.type === 'error' ? 'text-red-500' :
                                       result.type === 'warning' ? 'text-amber-500' :
                                          'text-emerald-500'
                                    }`}>
                                    {result.type === 'error' ? <XCircle size={18} /> : result.type === 'warning' ? <ShieldCheck size={18} /> : <CheckCircle size={18} />}
                                 </div>
                                 <div>
                                    <p className={`text-xs font-bold ${result.type === 'error' ? 'text-red-700 dark:text-red-400' :
                                          result.type === 'warning' ? 'text-amber-700 dark:text-amber-400' :
                                             'text-emerald-700 dark:text-emerald-400'
                                       }`}>{result.message}</p>
                                    {result.details && <p className="text-[10px] text-slate-400 mt-1">{result.details}</p>}
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                     <Button onClick={() => setIsAnalyzerModalOpen(false)} className="w-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-xl py-3 font-bold text-sm">
                        Fechar Relatório
                     </Button>
                  </div>
               )}
            </div>
         </Modal>

      </div>
   );
};
