import React, { useMemo, useState, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/ui/Card';

import { ArrowLeft, FileText, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportElementToPdf } from '../../utils/exportPdf';
import { calculateDFC } from '../../utils/accountingEngine';

export const DFC: React.FC = () => {
    const { accountingEntries, selectedCompany } = useData();
    const navigate = useNavigate();
    const reportRef = useRef<HTMLDivElement>(null);
    
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const dfc = useMemo(() => {
        return calculateDFC(
            accountingEntries,
            startDate,
            endDate,
            selectedCompany?.id
        );
    }, [accountingEntries, startDate, endDate, selectedCompany]);

    const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/app/accounting')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0">
                        <ArrowLeft size={24} className="text-slate-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">DFC</h1>
                        <p className="text-sm text-slate-500">Demonstração dos Fluxos de Caixa (Método Direto)</p>
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
                        onClick={() => exportElementToPdf(reportRef.current, 'DFC', selectedCompany)} 
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

                <div className="p-6 space-y-1 text-xs">
                    <div className="flex justify-between py-3 border-b-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 px-4 rounded-xl mb-4 font-bold text-slate-900 dark:text-white">
                        <span className="uppercase">Saldo Inicial de Caixa e Equivalentes</span>
                        <span className="font-mono">{currency(dfc.saldoInicialCaixa)}</span>
                    </div>

                    {/* Atividades Operacionais */}
                    <div className="pt-4 pb-2">
                        <h3 className="font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest text-[10px] mb-2">1. Fluxo de Caixa das Atividades Operacionais</h3>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/30 pl-4 text-slate-600 dark:text-slate-400">
                        <span>Recebimentos de Clientes</span>
                        <span className="font-mono text-emerald-600 font-bold">{currency(dfc.atividadesOperacionais.recebimentosClientes)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/30 pl-4 text-slate-600 dark:text-slate-400">
                        <span>Pagamentos a Fornecedores</span>
                        <span className="font-mono text-rose-500 font-bold">({currency(Math.abs(dfc.atividadesOperacionais.pagamentosFornecedores))})</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/30 pl-4 text-slate-600 dark:text-slate-400">
                        <span>Pagamentos a Empregados</span>
                        <span className="font-mono text-rose-500 font-bold">({currency(Math.abs(dfc.atividadesOperacionais.pagamentosEmpregados))})</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/30 pl-4 text-slate-600 dark:text-slate-400">
                        <span>Pagamentos de Tributos</span>
                        <span className="font-mono text-rose-500 font-bold">({currency(Math.abs(dfc.atividadesOperacionais.pagamentosTributos))})</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/30 pl-4 text-slate-600 dark:text-slate-400">
                        <span>Outros Recebimentos/Pagamentos Operacionais</span>
                        <span className="font-mono">{currency(dfc.atividadesOperacionais.outros)}</span>
                    </div>
                    <div className="flex justify-between py-3 bg-cyan-50/30 dark:bg-cyan-950/20 px-4 rounded-xl mt-2 border-l-4 border-[#0ea5e9] font-bold">
                        <span className="uppercase text-[10px]">Caixa Líquido das Atividades Operacionais</span>
                        <span className={`font-mono ${dfc.atividadesOperacionais.caixaLiquido >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{currency(dfc.atividadesOperacionais.caixaLiquido)}</span>
                    </div>

                    {/* Atividades de Investimento */}
                    <div className="pt-6 pb-2">
                        <h3 className="font-black text-amber-500 dark:text-amber-400 uppercase tracking-widest text-[10px] mb-2">2. Fluxo de Caixa das Atividades de Investimento</h3>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/30 pl-4 text-slate-600 dark:text-slate-400">
                        <span>Aquisição de Imobilizado / Intangível</span>
                        <span className="font-mono text-rose-500 font-bold">({currency(Math.abs(dfc.atividadesInvestimento.aquisicaoImobilizado))})</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/30 pl-4 text-slate-600 dark:text-slate-400">
                        <span>Venda de Imobilizado / Intangível</span>
                        <span className="font-mono text-emerald-600 font-bold">{currency(dfc.atividadesInvestimento.vendaImobilizado)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/30 pl-4 text-slate-600 dark:text-slate-400">
                        <span>Outros Investimentos</span>
                        <span className="font-mono">{currency(dfc.atividadesInvestimento.outros)}</span>
                    </div>
                    <div className="flex justify-between py-3 bg-amber-50/30 dark:bg-amber-950/20 px-4 rounded-xl mt-2 border-l-4 border-amber-500 font-bold">
                        <span className="uppercase text-[10px]">Caixa Líquido das Atividades de Investimento</span>
                        <span className={`font-mono ${dfc.atividadesInvestimento.caixaLiquido >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{currency(dfc.atividadesInvestimento.caixaLiquido)}</span>
                    </div>

                    {/* Atividades de Financiamento */}
                    <div className="pt-6 pb-2">
                        <h3 className="font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest text-[10px] mb-2">3. Fluxo de Caixa das Atividades de Financiamento</h3>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/30 pl-4 text-slate-600 dark:text-slate-400">
                        <span>Aumento de Capital Social</span>
                        <span className="font-mono text-emerald-600 font-bold">{currency(dfc.atividadesFinanciamento.aumentoCapital)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/30 pl-4 text-slate-600 dark:text-slate-400">
                        <span>Empréstimos e Financiamentos Recebidos</span>
                        <span className="font-mono text-emerald-600 font-bold">{currency(dfc.atividadesFinanciamento.emprestimosRecebidos)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/30 pl-4 text-slate-600 dark:text-slate-400">
                        <span>Amortização de Empréstimos e Financiamentos</span>
                        <span className="font-mono text-rose-500 font-bold">({currency(Math.abs(dfc.atividadesFinanciamento.amortizacaoEmprestimos))})</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/30 pl-4 text-slate-600 dark:text-slate-400">
                        <span>Pagamento de Dividendos e Lucros</span>
                        <span className="font-mono text-rose-500 font-bold">({currency(Math.abs(dfc.atividadesFinanciamento.pagamentoDividendos))})</span>
                    </div>
                    <div className="flex justify-between py-3 bg-indigo-50/30 dark:bg-indigo-950/20 px-4 rounded-xl mt-2 border-l-4 border-indigo-500 font-bold">
                        <span className="uppercase text-[10px]">Caixa Líquido das Atividades de Financiamento</span>
                        <span className={`font-mono ${dfc.atividadesFinanciamento.caixaLiquido >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{currency(dfc.atividadesFinanciamento.caixaLiquido)}</span>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800 mt-6 pt-6"></div>

                    <div className="flex justify-between py-3.5 bg-slate-100 dark:bg-slate-800 px-5 rounded-2xl font-black text-slate-900 dark:text-white">
                        <span className="uppercase flex items-center gap-2">
                            Aumento (Redução) Líquido de Caixa e Equivalentes
                            {dfc.geracaoLiquidaCaixa >= 0 ? <TrendingUp size={16} className="text-emerald-600" /> : <TrendingDown size={16} className="text-rose-500" />}
                        </span>
                        <span className="font-mono">{currency(dfc.geracaoLiquidaCaixa)}</span>
                    </div>

                    <div className="flex justify-between py-3.5 bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-250 dark:border-emerald-800/30 px-5 rounded-2xl mt-4 font-black text-emerald-800 dark:text-emerald-400">
                        <span className="uppercase text-sm">Saldo Final de Caixa e Equivalentes</span>
                        <span className="font-mono text-base">{currency(dfc.saldoFinalCaixa)}</span>
                    </div>
                </div>
            </Card>
        </div>
    );
};
