import React, { useMemo, useState, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/ui/Card';

import { ArrowLeft, FileText, Calendar, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { calculateDRE } from '../../utils/accountingEngine';
import { ReportViewerModal } from '../../components/accounting/ReportViewerModal';
import { exportElementToPdf } from '../../utils/exportPdf';

export const DRE: React.FC = () => {
    const { accountingEntries, selectedCompany } = useData();
    const navigate = useNavigate();
    const reportRef = useRef<HTMLDivElement>(null);
    
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [isViewerOpen, setIsViewerOpen] = useState(false);

    const dre = useMemo(() => {
        return calculateDRE(
            accountingEntries,
            startDate,
            endDate,
            selectedCompany
        );
    }, [accountingEntries, startDate, endDate, selectedCompany]);

    const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const reportContent = (
        <div className="space-y-2 w-full text-slate-800 dark:text-slate-200 text-xs">
            <div className="hide-on-export mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-lg font-black uppercase text-center mb-1 text-slate-800 dark:text-white">Demonstração do Resultado do Exercício (DRE)</h2>
                <h3 className="text-sm font-semibold uppercase text-center text-slate-500">{selectedCompany?.nomeFantasia || selectedCompany?.razaoSocial}</h3>
                <p className="text-[10px] text-center text-slate-400">CNPJ: {selectedCompany?.cnpj} | Período Contábil: {new Date(startDate).toLocaleDateString('pt-BR')} a {new Date(endDate).toLocaleDateString('pt-BR')}</p>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 font-bold uppercase text-slate-700 dark:text-slate-300">
                <span>RECEITA BRUTA OPERACIONAL</span>
                <span className="font-mono text-slate-900 dark:text-white">{currency(dre.receitaBruta)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 pl-6 text-rose-500 font-medium">
                <span>(-) Deduções da Receita Bruta</span>
                <span className="font-mono">({currency(dre.deducoes)})</span>
            </div>
            <div className="flex justify-between py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-4 rounded-xl uppercase font-black mt-2 text-slate-900 dark:text-white">
                <span>= RECEITA LÍQUIDA OPERACIONAL</span>
                <span className="font-mono">{currency(dre.receitaLiquida)}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 pl-6 text-rose-500 font-medium mt-2">
                <span>(-) Custos dos Produtos e Serviços Vendidos (CPV/CSV)</span>
                <span className="font-mono">({currency(dre.custos)})</span>
            </div>
            <div className="flex justify-between py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-4 rounded-xl uppercase font-black mt-2 text-slate-900 dark:text-white">
                <span>= LUCRO BRUTO</span>
                <span className="font-mono">{currency(dre.lucroBruto)}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 pl-6 text-rose-500 font-black uppercase text-[10px] mt-4 tracking-wider">
                <span>(-) Despesas Operacionais</span>
                <span className="font-mono">({currency(dre.despesasOperacionais)})</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/30 pl-12 text-slate-500 dark:text-slate-400">
                <span>Despesas com Pessoal</span>
                <span className="font-mono">({currency(dre.despPessoal)})</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/30 pl-12 text-slate-500 dark:text-slate-400">
                <span>Despesas Administrativas</span>
                <span className="font-mono">({currency(dre.despAdmin)})</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/30 pl-12 text-slate-500 dark:text-slate-400">
                <span>Despesas Tributárias</span>
                <span className="font-mono">({currency(dre.despTributaria)})</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 pl-6 text-slate-700 dark:text-slate-300 font-black uppercase text-[10px] mt-2 tracking-wider">
                <span>(+/-) Resultado Financeiro</span>
                <span className="font-mono">{currency(dre.resultadoFinanceiro)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/30 pl-12 text-emerald-600 dark:text-emerald-400 font-medium">
                <span>(+) Receitas Financeiras</span>
                <span className="font-mono">{currency(dre.receitasFinanceiras)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/30 pl-12 text-rose-500 font-medium">
                <span>(-) Despesas Financeiras</span>
                <span className="font-mono">({currency(dre.despesasFinanceiras)})</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 pl-6 text-slate-700 dark:text-slate-300 font-black uppercase text-[10px] mt-2 tracking-wider">
                <span>(+/-) Outras Receitas e Despesas Operacionais</span>
                <span className="font-mono">{currency(dre.outrasReceitasDespesas)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/30 pl-12 text-emerald-600 dark:text-emerald-400 font-medium">
                <span>(+) Outras Receitas</span>
                <span className="font-mono">{currency(dre.outrasReceitas)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/30 pl-12 text-rose-500 font-medium">
                <span>(-) Outras Despesas</span>
                <span className="font-mono">({currency(dre.outrasDespesas)})</span>
            </div>

            <div className="flex justify-between py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-4 rounded-xl uppercase font-black mt-4 text-slate-900 dark:text-white">
                <span>= RESULTADO ANTES DOS TRIBUTOS (LAIR)</span>
                <span className="font-mono">{currency(dre.lucroAntesIR)}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 pl-6 text-rose-500 font-bold uppercase text-[10px] mt-2 tracking-wider">
                <span>(-) Provisão para IRPJ e CSLL</span>
                <span className="font-mono">({currency(dre.irpj + dre.csll)})</span>
            </div>

            <div className={`flex justify-between py-4 px-6 rounded-2xl mt-6 border-2 ${dre.lucroLiquido >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-800/30'}`}>
                <span className="font-black text-sm uppercase tracking-wider">= RESULTADO LÍQUIDO DO EXERCÍCIO</span>
                <span className="font-mono font-black text-lg">{currency(dre.lucroLiquido)}</span>
            </div>
        </div>
    );

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/app/accounting')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0">
                        <ArrowLeft size={24} className="text-slate-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">DRE</h1>
                        <p className="text-sm text-slate-500">Demonstração do Resultado do Exercício</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Date Picker Group */}
                    <div className="flex items-center bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm p-1.5">
                        <div className="flex items-center px-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors group cursor-text">
                            <Calendar size={16} className="text-slate-400 mr-2" />
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)} 
                                className="bg-transparent text-xs font-semibold outline-none text-slate-700 dark:text-slate-200 w-[115px] cursor-pointer" 
                            />
                        </div>
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                        <div className="flex items-center px-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors group cursor-text">
                            <span className="text-xs text-slate-400 uppercase font-black mr-2">até</span>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)} 
                                className="bg-transparent text-xs font-semibold outline-none text-slate-700 dark:text-slate-200 w-[115px] cursor-pointer" 
                            />
                        </div>
                    </div>

                    {/* Actions Group */}
                    <div className="flex items-center gap-2">
                        <button 
                             
                            onClick={() => setIsViewerOpen(true)} 
                            className="gap-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-cyan-800 hover:text-cyan-600 dark:hover:text-cyan-400 shadow-sm rounded-full text-xs font-bold py-2 px-4 uppercase"
                        >
                            <Eye size={14} /> Visualizar
                        </button>
                        <button 
                            onClick={() => exportElementToPdf(reportRef.current, 'Demonstracao_Resultado_Exercicio', selectedCompany)} 
                            className="bg-gradient-to-r from-[#0ea5e9] to-[#10b981] text-white hover:opacity-95 font-black gap-1.5 rounded-full px-5 py-2 shadow-md shadow-cyan-500/10 text-xs uppercase"
                        >
                            <FileText size={14} /> Exportar PDF
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex justify-center w-full">
                <Card 
                    ref={reportRef} 
                    className="p-10 sm:p-14 w-full max-w-4xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10 rounded-[2rem] border-none"
                >
                    {reportContent}
                </Card>
            </div>

            {isViewerOpen && (
                <ReportViewerModal
                    isOpen={isViewerOpen}
                    onClose={() => setIsViewerOpen(false)}
                    title="Visualizador de Relatório - DRE"
                    onExportPdf={() => exportElementToPdf(reportRef.current, 'Demonstracao_Resultado_Exercicio', selectedCompany)}
                >
                    {reportContent}
                </ReportViewerModal>
            )}
        </div>
    );
};
