import React, { useMemo, useState, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/ui/Card';

import { ArrowLeft, FileText, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportElementToPdf } from '../../utils/exportPdf';
import { calculateBalanceSheet } from '../../utils/accountingEngine';

export const Balanco: React.FC = () => {
    const { accountingEntries, selectedCompany } = useData();
    const navigate = useNavigate();
    const reportRef = useRef<HTMLDivElement>(null);
    
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const balanco = useMemo(() => {
        return calculateBalanceSheet(
            accountingEntries,
            endDate,
            selectedCompany?.id
        );
    }, [accountingEntries, endDate, selectedCompany]);

    const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/app/accounting')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0">
                        <ArrowLeft size={24} className="text-slate-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Balanço Patrimonial</h1>
                        <p className="text-sm text-slate-500">Exibição de Ativo, Passivo e Patrimônio Líquido</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm p-1.5">
                        <div className="flex items-center px-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors group cursor-text">
                            <Calendar size={16} className="text-slate-400 mr-2" />
                            <span className="text-xs text-slate-400 uppercase font-black mr-2">Posição em</span>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)} 
                                className="bg-transparent text-xs font-semibold outline-none text-slate-700 dark:text-slate-200 w-[115px] cursor-pointer" 
                            />
                        </div>
                    </div>
                    <button 
                        onClick={() => exportElementToPdf(reportRef.current, 'Balanco', selectedCompany)} 
                        className="bg-gradient-to-r from-[#0ea5e9] to-[#10b981] text-white hover:opacity-95 font-black gap-1.5 rounded-full px-5 py-2 shadow-md shadow-cyan-500/10 text-xs uppercase"
                    >
                        <FileText size={14} /> Exportar PDF
                    </button>
                </div>
            </div>

            {!balanco.isBalanced && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 p-4 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={20} />
                    <div>
                        <h3 className="font-bold text-rose-800 dark:text-rose-400 text-sm">Aviso de Equação Desbalanceada</h3>
                        <p className="text-xs text-rose-600 dark:text-rose-300 mt-0.5">
                            A soma dos Ativos difere do Passivo + PL em <b>{currency(balanco.difference)}</b>. Por favor, revise a conciliação e lançamentos contábeis.
                        </p>
                    </div>
                </div>
            )}

            {balanco.isBalanced && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 p-4 rounded-2xl flex items-center gap-2">
                    <CheckCircle className="text-emerald-500 shrink-0" size={18} />
                    <p className="text-xs text-emerald-800 dark:text-emerald-400 font-bold uppercase">Balanço Patrimonial Equilibrado e Consolidado</p>
                </div>
            )}

            <div ref={reportRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-950 p-4 rounded-[2rem] border border-slate-200/50 dark:border-slate-800">
                {/* ATIVO */}
                <Card className="p-0 overflow-hidden border-none shadow-xl bg-white dark:bg-slate-900 rounded-[2rem]">
                    <div className="p-5 bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white flex justify-between items-center">
                        <h2 className="text-sm font-black uppercase tracking-wider">1. ATIVO</h2>
                        <span className="font-mono font-bold text-base">{currency(balanco.ativo.total)}</span>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        <div>
                            <div className="flex justify-between font-black text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2 uppercase tracking-wider">
                                <span>1.1 ATIVO CIRCULANTE</span>
                                <span className="text-slate-700 dark:text-slate-200 font-bold">{currency(balanco.ativo.circulante)}</span>
                            </div>
                            <div className="pl-4 space-y-2 py-3">
                                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    <span>Disponibilidades (Caixa e Equivalentes)</span>
                                    <span className="font-mono">{currency(balanco.ativo.disponivel)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    <span>Clientes a Receber</span>
                                    <span className="font-mono">{currency(balanco.ativo.clientes)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    <span>Estoques</span>
                                    <span className="font-mono">{currency(balanco.ativo.estoques)}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between font-black text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2 uppercase tracking-wider mt-4">
                                <span>1.2 ATIVO NÃO CIRCULANTE</span>
                                <span className="text-slate-700 dark:text-slate-200 font-bold">{currency(balanco.ativo.naoCirculante)}</span>
                            </div>
                            <div className="pl-4 space-y-2 py-3">
                                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    <span>Realizável a Longo Prazo</span>
                                    <span className="font-mono">{currency(balanco.ativo.rlp)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    <span>Investimentos</span>
                                    <span className="font-mono">{currency(balanco.ativo.investimentos)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    <span>Imobilizado Líquido</span>
                                    <span className="font-mono">{currency(balanco.ativo.imobilizado)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    <span>Intangível</span>
                                    <span className="font-mono">{currency(balanco.ativo.intangivel)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* PASSIVO E PATRIMÔNIO LÍQUIDO */}
                <div className="space-y-6">
                    {/* PASSIVO */}
                    <Card className="p-0 overflow-hidden border-none shadow-xl bg-white dark:bg-slate-900 rounded-[2rem]">
                        <div className="p-5 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex justify-between items-center">
                            <h2 className="text-sm font-black uppercase tracking-wider">2. PASSIVO</h2>
                            <span className="font-mono font-bold text-base">{currency(balanco.passivo.total)}</span>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <div className="flex justify-between font-black text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2 uppercase tracking-wider">
                                    <span>2.1 PASSIVO CIRCULANTE</span>
                                    <span className="text-slate-700 dark:text-slate-200 font-bold">{currency(balanco.passivo.circulante)}</span>
                                </div>
                                <div className="pl-4 space-y-2 py-3">
                                    <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        <span>Fornecedores</span>
                                        <span className="font-mono">{currency(balanco.passivo.fornecedores)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        <span>Obrigações Trabalhistas</span>
                                        <span className="font-mono">{currency(balanco.passivo.trabalhistas)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        <span>Obrigações Tributárias</span>
                                        <span className="font-mono">{currency(balanco.passivo.tributarias)}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between font-black text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2 uppercase tracking-wider mt-2">
                                    <span>2.2 PASSIVO NÃO CIRCULANTE</span>
                                    <span className="text-slate-700 dark:text-slate-200 font-bold">{currency(balanco.passivo.naoCirculante)}</span>
                                </div>
                                <div className="pl-4 space-y-2 py-3">
                                    <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        <span>Exigível a Longo Prazo</span>
                                        <span className="font-mono">{currency(balanco.passivo.elp)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* PATRIMÔNIO LÍQUIDO */}
                    <Card className="p-0 overflow-hidden border-none shadow-xl bg-white dark:bg-slate-900 rounded-[2rem]">
                        <div className="p-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex justify-between items-center">
                            <h2 className="text-sm font-black uppercase tracking-wider">2.3 PATRIMÔNIO LÍQUIDO</h2>
                            <span className="font-mono font-bold text-base">{currency(balanco.patrimonioLiquido.total)}</span>
                        </div>
                        
                        <div className="p-6 space-y-2">
                            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                                <span>Capital Social Integralizado</span>
                                <span className="font-mono">{currency(balanco.patrimonioLiquido.capitalSocial)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2 py-1">
                                <span>Reservas de Lucros</span>
                                <span className="font-mono">{currency(balanco.patrimonioLiquido.reservas)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2 py-1">
                                <span>Lucros ou Prejuízos Acumulados</span>
                                <span className="font-mono">{currency(balanco.patrimonioLiquido.lucrosAcumulados)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 py-1">
                                <span>Lucro/Prejuízo Líquido do Período</span>
                                <span className="font-mono font-bold text-[#10b981]">{currency(balanco.patrimonioLiquido.resultadoExercicio)}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
