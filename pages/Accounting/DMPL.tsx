import React, { useMemo, useState, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/ui/Card';

import { ArrowLeft, FileText, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportElementToPdf } from '../../utils/exportPdf';
import { calculateDMPL } from '../../utils/accountingEngine';

export const DMPL: React.FC = () => {
    const { accountingEntries, selectedCompany } = useData();
    const navigate = useNavigate();
    const reportRef = useRef<HTMLDivElement>(null);
    
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const dmpl = useMemo(() => {
        return calculateDMPL(
            accountingEntries,
            startDate,
            endDate,
            selectedCompany?.id
        );
    }, [accountingEntries, startDate, endDate, selectedCompany]);

    const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/app/accounting')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0">
                        <ArrowLeft size={24} className="text-slate-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">DMPL</h1>
                        <p className="text-sm text-slate-500">Demonstração das Mutações do Patrimônio Líquido</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm p-1.5">
                        <div className="flex items-center gap-2 px-3">
                            <Calendar size={16} className="text-slate-400" />
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-xs font-semibold outline-none text-slate-700 dark:text-slate-300 w-[115px]" />
                            <span className="text-slate-300 text-xs font-bold">até</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-xs font-semibold outline-none text-slate-700 dark:text-slate-300 w-[115px]" />
                        </div>
                    </div>
                    <button 
                        onClick={() => exportElementToPdf(reportRef.current, 'DMPL', selectedCompany)} 
                        className="bg-gradient-to-r from-[#0ea5e9] to-[#10b981] text-white hover:opacity-95 font-black gap-1.5 rounded-full px-5 py-2 shadow-md shadow-cyan-500/10 text-xs uppercase"
                    >
                        <FileText size={14} /> Exportar PDF
                    </button>
                </div>
            </div>

            <Card ref={reportRef} className="p-0 overflow-hidden border-none shadow-xl bg-white dark:bg-slate-900 rounded-[2rem]">
                <div className="p-6 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Empresa: {selectedCompany?.nomeFantasia || selectedCompany?.razaoSocial}</h2>
                        <p className="text-[10px] text-slate-400 mt-0.5">CNPJ: {selectedCompany?.cnpj} | Período: {new Date(startDate).toLocaleDateString('pt-BR')} a {new Date(endDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>

                <div className="p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs whitespace-nowrap min-w-[600px]">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                                <tr className="border-b border-slate-150 dark:border-slate-850">
                                    <th className="p-4 font-black uppercase text-[10px] tracking-wider">Contas do Patrimônio Líquido</th>
                                    <th className="p-4 font-black uppercase text-[10px] tracking-wider text-right w-48">Saldo Inicial</th>
                                    <th className="p-4 font-black uppercase text-[10px] tracking-wider text-right w-48">Mutações no Período</th>
                                    <th className="p-4 font-black uppercase text-[10px] tracking-wider text-right w-48">Saldo Final</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="p-4 font-bold text-slate-700 dark:text-slate-300">Capital Social Realizado</td>
                                    <td className="p-4 font-mono text-right text-slate-650 dark:text-slate-400">{currency(dmpl.capitalSocial.saldoInicial)}</td>
                                    <td className={`p-4 font-mono text-right font-bold ${dmpl.capitalSocial.mutacoes !== 0 ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-400'}`}>{currency(dmpl.capitalSocial.mutacoes)}</td>
                                    <td className="p-4 font-mono font-black text-right text-slate-900 dark:text-white">{currency(dmpl.capitalSocial.saldoFinal)}</td>
                                </tr>
                                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="p-4 font-bold text-slate-700 dark:text-slate-300">Reservas (Capital/Lucros)</td>
                                    <td className="p-4 font-mono text-right text-slate-650 dark:text-slate-400">{currency(dmpl.reservas.saldoInicial)}</td>
                                    <td className={`p-4 font-mono text-right font-bold ${dmpl.reservas.mutacoes !== 0 ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-400'}`}>{currency(dmpl.reservas.mutacoes)}</td>
                                    <td className="p-4 font-mono font-black text-right text-slate-900 dark:text-white">{currency(dmpl.reservas.saldoFinal)}</td>
                                </tr>
                                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="p-4 font-bold text-slate-700 dark:text-slate-300">Lucros / Prejuízos Acumulados</td>
                                    <td className="p-4 font-mono text-right text-slate-650 dark:text-slate-400">{currency(dmpl.lucrosAcumulados.saldoInicial)}</td>
                                    <td className={`p-4 font-mono text-right font-bold ${dmpl.lucrosAcumulados.mutacoes !== 0 ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-400'}`}>{currency(dmpl.lucrosAcumulados.mutacoes)}</td>
                                    <td className="p-4 font-mono font-black text-right text-slate-900 dark:text-white">{currency(dmpl.lucrosAcumulados.saldoFinal)}</td>
                                </tr>
                            </tbody>
                            <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-200 dark:border-slate-700">
                                <tr className="font-black text-slate-950 dark:text-white">
                                    <td className="p-4 uppercase text-[10px] tracking-wider">Total do Patrimônio Líquido</td>
                                    <td className="p-4 font-mono text-right">{currency(dmpl.total.saldoInicial)}</td>
                                    <td className="p-4 font-mono text-right text-indigo-600 dark:text-indigo-400">{currency(dmpl.total.mutacoes)}</td>
                                    <td className="p-4 font-mono text-right text-base">{currency(dmpl.total.saldoFinal)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </Card>
        </div>
    );
};
