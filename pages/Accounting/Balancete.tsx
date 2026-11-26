import React, { useMemo, useState, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/ui/Card';
import { ArrowLeft, FileText, Calendar, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportElementToPdf } from '../../utils/exportPdf';
import { ReportViewerModal } from '../../components/accounting/ReportViewerModal';
import { getMergedChartOfAccounts, calculateAccountBalance } from '../../utils/accountingEngine';

export const Balancete: React.FC = () => {
    const { accountingEntries, selectedCompany, clients, employees, bankAccounts, partners } = useData();
    const navigate = useNavigate();
    const reportRef = useRef<HTMLDivElement>(null);
    
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [selectedAnalyticAccount, setSelectedAnalyticAccount] = useState<string>('all');

    const balancete = useMemo(() => {
        const companyId = selectedCompany?.id || '';
        const mergedChart = getMergedChartOfAccounts(
            companyId,
            accountingEntries,
            clients,
            employees,
            bankAccounts,
            partners
        );

        const priorEntries = accountingEntries.filter(
            e => e.companyId === companyId && e.date < startDate
        );
        const periodEntries = accountingEntries.filter(
            e => e.companyId === companyId && e.date >= startDate && e.date <= endDate
        );

        let totalDebito = 0;
        let totalCredito = 0;

        const results = mergedChart.map(acc => {
            const hasChildren = mergedChart.some(child => child.code !== acc.code && child.code.startsWith(acc.code + '.'));
            const isAnalytic = !hasChildren;

            // Saldo Anterior
            const saldoAnteriorVal = calculateAccountBalance(acc.code, priorEntries);
            const isDebitNature = acc.nature === 'debt';
            const saldoAnterior = isDebitNature ? saldoAnteriorVal : -saldoAnteriorVal;

            // Débitos e Créditos do Período
            let debits = 0;
            let credits = 0;
            
            periodEntries.forEach(e => {
                if (e.debitAccount === acc.code || e.debitAccount?.startsWith(acc.code + '.')) {
                    debits += e.value;
                }
                if (e.creditAccount === acc.code || e.creditAccount?.startsWith(acc.code + '.')) {
                    credits += e.value;
                }
            });

            if (isAnalytic) {
                totalDebito += debits;
                totalCredito += credits;
            }

            const saldoAtual = saldoAnterior + (isDebitNature ? (debits - credits) : (credits - debits));

            return {
                ...acc,
                isAnalytic,
                saldoAnterior,
                debits,
                credits,
                saldo: saldoAtual,
                typeLabel: isDebitNature ? 'D' : 'C'
            };
        }).filter(a => a.saldoAnterior !== 0 || a.debits > 0 || a.credits > 0 || a.saldo !== 0 || a.level <= 2);

        return { items: results, totalDebito, totalCredito };
    }, [accountingEntries, startDate, endDate, selectedCompany, clients, employees, bankAccounts, partners]);

    const filteredBalancete = useMemo(() => {
        if (selectedAnalyticAccount === 'all') return balancete;

        const filteredItems = balancete.items.filter(acc => 
            acc.code === selectedAnalyticAccount || 
            selectedAnalyticAccount.startsWith(acc.code + '.') ||
            acc.code.startsWith(selectedAnalyticAccount + '.')
        );

        const targetAccount = filteredItems.find(a => a.code === selectedAnalyticAccount);
        return {
            items: filteredItems,
            totalDebito: targetAccount ? targetAccount.debits : 0,
            totalCredito: targetAccount ? targetAccount.credits : 0,
        };
    }, [balancete, selectedAnalyticAccount]);

    const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const reportContent = (
        <Card ref={reportRef} className="p-0 overflow-hidden border-none shadow-xl bg-white dark:bg-slate-900 rounded-[2rem]">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                        <th className="p-4 font-semibold text-xs w-32">Conta</th>
                        <th className="p-4 font-semibold text-xs">Descrição da Conta</th>
                        <th className="p-4 font-semibold text-xs text-right">Saldo Anterior</th>
                        <th className="p-4 font-semibold text-xs text-right">Débitos Período</th>
                        <th className="p-4 font-semibold text-xs text-right">Créditos Período</th>
                        <th className="p-4 font-semibold text-xs text-right">Saldo Atual</th>
                        <th className="p-4 font-semibold text-xs text-center">N/D</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {filteredBalancete.items.map((acc) => (
                        <tr key={acc.code} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${acc.level === 1 ? 'bg-slate-100/50 dark:bg-slate-800/30 font-bold' : ''}`}>
                            <td className="p-4 text-xs text-slate-500 font-mono">{acc.code}</td>
                            <td className={`p-4 text-xs ${acc.isAnalytic ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-950 dark:text-white font-bold'}`} style={{ paddingLeft: `${acc.level * 1}rem` }}>
                                {acc.name}
                            </td>
                            <td className="p-4 text-right text-xs font-mono text-slate-600 dark:text-slate-400">
                                {acc.saldoAnterior !== 0 ? currency(acc.saldoAnterior) : '-'}
                            </td>
                            <td className="p-4 text-right text-xs font-mono text-slate-600 dark:text-slate-400">
                                {acc.debits > 0 ? currency(acc.debits) : '-'}
                            </td>
                            <td className="p-4 text-right text-xs font-mono text-slate-600 dark:text-slate-400">
                                {acc.credits > 0 ? currency(acc.credits) : '-'}
                            </td>
                            <td className="p-4 text-right text-xs font-mono font-bold text-slate-900 dark:text-white">
                                {currency(acc.saldo)}
                            </td>
                            <td className="p-4 text-center text-xs font-black text-slate-500">
                                {acc.saldo !== 0 ? acc.typeLabel : ''}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-slate-100 dark:bg-slate-950 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                        <td colSpan={3} className="p-4 text-right text-xs uppercase tracking-wider">Totais Consolidados:</td>
                        <td className="p-4 text-right text-cyan-600 dark:text-cyan-400 font-mono text-xs">{currency(filteredBalancete.totalDebito)}</td>
                        <td className="p-4 text-right text-orange-600 dark:text-orange-400 font-mono text-xs">{currency(filteredBalancete.totalCredito)}</td>
                        <td className="p-4 text-center" colSpan={2}>
                            {filteredBalancete.totalDebito === filteredBalancete.totalCredito || selectedAnalyticAccount !== 'all' ? (
                                <span className="text-emerald-500 text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/40 px-3 py-1 rounded-full">Partidas OK</span>
                            ) : (
                                <span className="text-rose-500 text-[10px] font-black uppercase bg-rose-100 dark:bg-rose-950/40 px-3 py-1 rounded-full font-bold">Desbalanceado</span>
                            )}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </Card>
    );

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/app/accounting')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0">
                        <ArrowLeft size={24} className="text-slate-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Balancete de Verificação</h1>
                        <p className="text-sm text-slate-500">Validação técnica de saldos e partidas dobradas</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm p-1.5">
                        <div className="flex items-center gap-2 px-3 border-r border-slate-100 dark:border-slate-800">
                            <Calendar size={16} className="text-slate-400" />
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-xs font-semibold outline-none text-slate-700 dark:text-slate-300 w-[115px]" />
                            <span className="text-slate-300 text-xs font-bold">até</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-xs font-semibold outline-none text-slate-700 dark:text-slate-300 w-[115px]" />
                        </div>
                        <div className="flex items-center px-3 min-w-[180px] gap-2">
                            <input 
                                type="text"
                                placeholder="Filtrar Conta Analítica..."
                                value={selectedAnalyticAccount === 'all' ? '' : selectedAnalyticAccount} 
                                onChange={e => setSelectedAnalyticAccount(e.target.value || 'all')}
                                className="w-full bg-transparent text-xs font-semibold outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400 placeholder:font-normal"
                            />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setIsViewerOpen(true)} 
                            className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-cyan-800 hover:text-cyan-600 dark:hover:text-cyan-400 shadow-sm rounded-full text-xs font-bold py-2.5 px-4 uppercase transition-all"
                        >
                            <Eye size={14} /> Visualizar
                        </button>
                        <button 
                            onClick={() => exportElementToPdf(reportRef.current, 'Balancete', selectedCompany)} 
                            className="bg-gradient-to-r from-[#0ea5e9] to-[#10b981] text-white hover:opacity-95 font-black flex items-center gap-1.5 rounded-full px-5 py-2.5 shadow-md shadow-cyan-500/10 text-xs uppercase hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            <FileText size={14} /> Exportar PDF
                        </button>
                    </div>
                </div>
            </div>

            {reportContent}

            {isViewerOpen && (
                <ReportViewerModal
                    isOpen={isViewerOpen}
                    onClose={() => setIsViewerOpen(false)}
                    title={`Visualizador - Balancete ${selectedAnalyticAccount !== 'all' ? 'Analítico' : ''}`}
                    onExportPdf={() => exportElementToPdf(reportRef.current, 'Balancete', selectedCompany)}
                >
                    {reportContent}
                </ReportViewerModal>
            )}
        </div>
    );
};
