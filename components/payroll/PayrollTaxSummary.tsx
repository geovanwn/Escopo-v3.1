import React, { useMemo } from 'react';
import { CompanyEntity, Employee, Partner, PayrollRun } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import {
    Landmark, ShieldCheck, DollarSign, Calendar, FileText,
    Calculator, AlertCircle, CheckCircle2, TrendingUp, Info
} from 'lucide-react';

interface PayrollTaxSummaryProps {
    selectedCompany: CompanyEntity | null;
    employees: Employee[];
    partners: Partner[];
    history: PayrollRun[];
    currentCompetence: string;
}

export const PayrollTaxSummary: React.FC<PayrollTaxSummaryProps> = ({
    selectedCompany,
    employees,
    partners,
    history,
    currentCompetence
}) => {
    // Current run or active calculation
    const activeRun = useMemo(() => {
        return history.find(h => h.competence === currentCompetence) || null;
    }, [history, currentCompetence]);

    const activeEmployees = useMemo(() => employees.filter(e => e.status === 'ativo'), [employees]);

    // Financial calculations
    const totals = useMemo(() => {
        if (activeRun && activeRun.details && activeRun.details.length > 0) {
            const baseINSS = activeRun.details.reduce((sum, d) => sum + (d.baseINSS || 0), 0);
            const baseFGTS = activeRun.details.reduce((sum, d) => sum + (d.baseFGTS || 0), 0);
            const baseIRRF = activeRun.details.reduce((sum, d) => sum + (d.baseIRRF || 0), 0);
            const inssSegurados = activeRun.details.reduce((sum, d) => sum + (d.inssValue || 0), 0);
            const irrfRetido = activeRun.details.reduce((sum, d) => sum + (d.irrfValue || 0), 0);
            const fgtsMensal = activeRun.details.reduce((sum, d) => sum + (d.fgtsValue || 0), 0);

            // Regime tributário da empresa
            const regime = (selectedCompany as any)?.taxRegime || 'Simples Nacional';
            const isSimples = regime.toLowerCase().includes('simples');

            // Patronal (Se simples, geralmente CPP inclusa no DAS exceto Anexo IV)
            const inssPatronal = isSimples ? 0 : baseINSS * 0.20;
            const rat = isSimples ? 0 : baseINSS * 0.02; // RAT médio 2%
            const terceiros = isSimples ? 0 : baseINSS * 0.058; // Terceiros 5.8%

            return {
                baseINSS,
                baseFGTS,
                baseIRRF,
                inssSegurados,
                inssPatronal,
                rat,
                terceiros,
                totalINSS: inssSegurados + inssPatronal + rat + terceiros,
                fgtsMensal,
                irrfRetido,
                totalTributos: inssSegurados + inssPatronal + rat + terceiros + fgtsMensal + irrfRetido,
                isSimples,
                isClosed: true
            };
        }

        // Estimativa baseada nos salários cadastrados
        const empBase = activeEmployees.reduce((sum, e) => sum + (Number(e.salary) || 0), 0);
        const partBase = partners.reduce((sum, p) => sum + (Number(p.proLaboreValue) || 0), 0);
        const baseTotal = empBase + partBase;

        const regime = (selectedCompany as any)?.taxRegime || 'Simples Nacional';
        const isSimples = regime.toLowerCase().includes('simples');

        const inssSegurados = baseTotal * 0.09;
        const inssPatronal = isSimples ? 0 : baseTotal * 0.20;
        const rat = isSimples ? 0 : baseTotal * 0.02;
        const terceiros = isSimples ? 0 : baseTotal * 0.058;
        const fgtsMensal = empBase * 0.08;
        const irrfRetido = baseTotal * 0.03;

        return {
            baseINSS: baseTotal,
            baseFGTS: empBase,
            baseIRRF: baseTotal * 0.85,
            inssSegurados,
            inssPatronal,
            rat,
            terceiros,
            totalINSS: inssSegurados + inssPatronal + rat + terceiros,
            fgtsMensal,
            irrfRetido,
            totalTributos: inssSegurados + inssPatronal + rat + terceiros + fgtsMensal + irrfRetido,
            isSimples,
            isClosed: false
        };
    }, [activeRun, activeEmployees, partners, selectedCompany]);

    // Provisões trabalhistas
    const provisoes = useMemo(() => {
        const baseCLT = totals.baseFGTS;
        const provFerias = baseCLT * (1 / 12) * (4 / 3); // 1/12 + 1/3 constitucional = 11,11%
        const prov13 = baseCLT * (1 / 12); // 8,33%
        const provEncargos = (provFerias + prov13) * 0.08; // FGTS s/ provisões

        return {
            provFerias,
            prov13,
            provEncargos,
            totalProvisoes: provFerias + prov13 + provEncargos
        };
    }, [totals.baseFGTS]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Header Box */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl shadow-md shadow-indigo-500/20">
                        <Landmark size={24} />
                    </div>
                    <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                            Demonstrativo de Tributos & Guias da Folha ({currentCompetence})
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">
                            Apuração legal de encargos previdenciários (DCTFWeb), FGTS Digital e retenções na fonte.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Regime Tributário:</span>
                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-full font-black text-xs border border-indigo-200/60 dark:border-indigo-800/60">
                        {(selectedCompany as any)?.taxRegime || 'Simples Nacional'}
                    </span>
                </div>
            </div>

            {/* Main Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. DCTFWEB / INSS */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full">
                                Previdência Oficial
                            </span>
                            <span className="text-xs font-bold text-slate-400">Venc. Dia 20</span>
                        </div>

                        <h4 className="text-lg font-black text-slate-800 dark:text-white mb-1">
                            DCTFWeb Previdenciária
                        </h4>
                        <p className="text-xs text-slate-400 mb-4">
                            INSS Segurados + Patronal e Terceiros
                        </p>

                        <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono mb-6">
                            {formatCurrency(totals.totalINSS)}
                        </div>

                        <div className="space-y-2.5 text-xs border-t border-slate-100 dark:border-slate-800 pt-4">
                            <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                <span>Base INSS da Folha:</span>
                                <span className="font-bold font-mono">{formatCurrency(totals.baseINSS)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                <span>INSS Segurados (Retido):</span>
                                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(totals.inssSegurados)}
                                </span>
                            </div>
                            <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                <span>INSS Patronal (Empresa):</span>
                                <span className="font-bold font-mono">
                                    {totals.isSimples ? 'Incluso no DAS' : formatCurrency(totals.inssPatronal)}
                                </span>
                            </div>
                            {!totals.isSimples && (
                                <>
                                    <div className="flex justify-between text-slate-500">
                                        <span>RAT / FAP (2%):</span>
                                        <span className="font-mono">{formatCurrency(totals.rat)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                        <span>Terceiros / Outras Entidades:</span>
                                        <span className="font-mono">{formatCurrency(totals.terceiros)}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. FGTS DIGITAL */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-full">
                                Caixa Econômica
                            </span>
                            <span className="text-xs font-bold text-slate-400">Venc. Dia 20</span>
                        </div>

                        <h4 className="text-lg font-black text-slate-800 dark:text-white mb-1">
                            Guia FGTS Digital
                        </h4>
                        <p className="text-xs text-slate-400 mb-4">
                            Depósito mensal de 8% sobre remuneração CLT
                        </p>

                        <div className="text-3xl font-black text-teal-600 dark:text-teal-400 font-mono mb-6">
                            {formatCurrency(totals.fgtsMensal)}
                        </div>

                        <div className="space-y-2.5 text-xs border-t border-slate-100 dark:border-slate-800 pt-4">
                            <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                <span>Base de Cálculo FGTS:</span>
                                <span className="font-bold font-mono">{formatCurrency(totals.baseFGTS)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                <span>Alíquota Regular CLT:</span>
                                <span className="font-bold font-mono">8,00%</span>
                            </div>
                            <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                <span>Colaboradores com Depósito:</span>
                                <span className="font-bold font-mono">{activeEmployees.length} funcionários</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <span>Forma de Recolhimento:</span>
                                <span className="font-semibold text-teal-600">PIX QR Code Oficial</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. IRRF DARF 0561 */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full">
                                Receita Federal
                            </span>
                            <span className="text-xs font-bold text-slate-400">DARF Código 0561</span>
                        </div>

                        <h4 className="text-lg font-black text-slate-800 dark:text-white mb-1">
                            IRRF Retido na Fonte
                        </h4>
                        <p className="text-xs text-slate-400 mb-4">
                            Imposto retido s/ salários e pró-labore
                        </p>

                        <div className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono mb-6">
                            {formatCurrency(totals.irrfRetido)}
                        </div>

                        <div className="space-y-2.5 text-xs border-t border-slate-100 dark:border-slate-800 pt-4">
                            <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                <span>Base Tributável IRRF:</span>
                                <span className="font-bold font-mono">{formatCurrency(totals.baseIRRF)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                <span>Regra de Cálculo:</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-200">Tabela Progressiva 2025/2026</span>
                            </div>
                            <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                <span>Dedução Simplificada:</span>
                                <span className="font-bold font-mono">R$ 564,80</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <span>Vencimento da Guia:</span>
                                <span className="font-semibold text-rose-600">Dia 20 do mês seguinte</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Provisões Mensais & Informações Contábeis */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Calculator size={18} className="text-sky-600" />
                        <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
                            Provisões Contábeis Trabalhistas Mensais (DRE & Balanço)
                        </h4>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                        Custo Competencial sem impacto imediato no fluxo de caixa
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                        <span className="text-[10px] font-black uppercase text-slate-400">Provisão de Férias + 1/3</span>
                        <p className="text-lg font-black text-slate-800 dark:text-white font-mono mt-1">
                            {formatCurrency(provisoes.provFerias)}
                        </p>
                        <span className="text-[10px] text-slate-400">11,11% da folha CLT</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                        <span className="text-[10px] font-black uppercase text-slate-400">Provisão de 13º Salário</span>
                        <p className="text-lg font-black text-slate-800 dark:text-white font-mono mt-1">
                            {formatCurrency(provisoes.prov13)}
                        </p>
                        <span className="text-[10px] text-slate-400">8,33% da folha CLT</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                        <span className="text-[10px] font-black uppercase text-slate-400">Encargos s/ Provisões</span>
                        <p className="text-lg font-black text-slate-800 dark:text-white font-mono mt-1">
                            {formatCurrency(provisoes.provEncargos)}
                        </p>
                        <span className="text-[10px] text-slate-400">FGTS 8% s/ provisões</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md">
                        <span className="text-[10px] font-black uppercase text-slate-300">Custo Total de Provisão</span>
                        <p className="text-lg font-black font-mono mt-1 text-emerald-400">
                            {formatCurrency(provisoes.totalProvisoes)}
                        </p>
                        <span className="text-[10px] text-slate-400">Mensal provisionado</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
