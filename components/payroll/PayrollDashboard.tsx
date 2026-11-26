import React, { useMemo } from 'react';
import { Employee, Partner, PayrollRun } from '../../types';
import { formatCurrency, formatDateBR } from '../../utils/formatters';
import {
    Users, DollarSign, AlertTriangle, FileCheck, Calendar,
    TrendingUp, Clock, ShieldAlert, Award, ChevronRight, UserCheck,
    PieChart, Briefcase, Plus, FileText, CheckCircle2
} from 'lucide-react';

interface PayrollDashboardProps {
    employees: Employee[];
    partners: Partner[];
    history: PayrollRun[];
    currentCompetence: string;
    onNavigateTab: (tab: string) => void;
    onOpenNewEmployee: () => void;
}

export const PayrollDashboard: React.FC<PayrollDashboardProps> = ({
    employees,
    partners,
    history,
    currentCompetence,
    onNavigateTab,
    onOpenNewEmployee
}) => {
    // Current closed run or latest
    const activeRun = useMemo(() => {
        return history.find(h => h.competence === currentCompetence) || history[0] || null;
    }, [history, currentCompetence]);

    // Headcount stats
    const activeEmployees = useMemo(() => employees.filter(e => e.status === 'ativo'), [employees]);
    const vacationEmployees = useMemo(() => employees.filter(e => e.status === 'ferias'), [employees]);
    const awayEmployees = useMemo(() => employees.filter(e => e.status === 'afastado'), [employees]);

    // Vacation warnings (CLT Art. 134/137)
    const vacationAlerts = useMemo(() => {
        const alerts: Array<{ employee: Employee; monthsWorked: number; deadlineMonths: number; status: 'critical' | 'warning' }> = [];
        const now = new Date();

        activeEmployees.forEach(emp => {
            if (!emp.admissionDate) return;
            const adm = new Date(emp.admissionDate);
            const diffMonths = (now.getFullYear() - adm.getFullYear()) * 12 + (now.getMonth() - adm.getMonth());

            if (diffMonths >= 11) {
                // Período concessivo vence aos 23 meses se o aquisitivo for de 12 meses
                const cycle = diffMonths % 12;
                const totalYears = Math.floor(diffMonths / 12);
                if (totalYears >= 1) {
                    const isCritical = cycle >= 10; // Faltam 2 meses para dobrar
                    alerts.push({
                        employee: emp,
                        monthsWorked: diffMonths,
                        deadlineMonths: 12 - cycle,
                        status: isCritical ? 'critical' : 'warning'
                    });
                }
            }
        });

        return alerts.sort((a, b) => a.deadlineMonths - b.deadlineMonths);
    }, [activeEmployees]);

    // Experience contract alerts (45 or 90 days)
    const experienceAlerts = useMemo(() => {
        const alerts: Array<{ employee: Employee; daysActive: number; daysRemaining: number }> = [];
        const now = new Date();

        activeEmployees.forEach(emp => {
            if (!emp.admissionDate) return;
            if (emp.contractType?.includes('experiencia') || !emp.contractType) {
                const adm = new Date(emp.admissionDate);
                const diffTime = now.getTime() - adm.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 90) {
                    const targetDays = diffDays <= 45 ? 45 : 90;
                    const remaining = targetDays - diffDays;
                    if (remaining <= 15 && remaining >= 0) {
                        alerts.push({
                            employee: emp,
                            daysActive: diffDays,
                            daysRemaining: remaining
                        });
                    }
                }
            }
        });

        return alerts;
    }, [activeEmployees]);

    // Financial totals (either from active run or estimated from base salaries)
    const financialStats = useMemo(() => {
        if (activeRun) {
            return {
                gross: activeRun.totalGross || 0,
                discounts: (activeRun.totalGross || 0) - (activeRun.totalNet || 0),
                net: activeRun.totalNet || 0,
                taxes: activeRun.totalTaxes || 0,
                isClosed: activeRun.status === 'fechado',
                employeeCount: activeRun.employeeCount || 0
            };
        }

        // Estimation from base salaries
        const empSalaries = activeEmployees.reduce((sum, e) => sum + (Number(e.salary) || 0), 0);
        const partSalaries = partners.reduce((sum, p) => sum + (Number(p.proLaboreValue) || 0), 0);
        const totalBase = empSalaries + partSalaries;

        return {
            gross: totalBase,
            discounts: totalBase * 0.09, // Média estimativa INSS/IRRF
            net: totalBase * 0.91,
            taxes: totalBase * 0.09 + totalBase * 0.08,
            isClosed: false,
            employeeCount: activeEmployees.length + partners.length
        };
    }, [activeRun, activeEmployees, partners]);

    // Department Distribution
    const departmentDistribution = useMemo(() => {
        const counts: Record<string, { count: number; salaryTotal: number }> = {};
        activeEmployees.forEach(emp => {
            const dept = emp.department || 'Geral';
            if (!counts[dept]) counts[dept] = { count: 0, salaryTotal: 0 };
            counts[dept].count += 1;
            counts[dept].salaryTotal += Number(emp.salary) || 0;
        });
        return Object.entries(counts).sort((a, b) => b[1].salaryTotal - a[1].salaryTotal);
    }, [activeEmployees]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Top Stats Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* CLT Ativos */}
                <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Quadro CLT</span>
                            <div className="flex items-baseline gap-2 mt-2">
                                <h3 className="text-3xl font-black text-slate-800 dark:text-white tabular-nums">
                                    {activeEmployees.length}
                                </h3>
                                <span className="text-xs font-bold text-sky-600 dark:text-sky-400">Ativos</span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium mt-1">
                                {vacationEmployees.length > 0 && `${vacationEmployees.length} em férias • `}
                                {awayEmployees.length > 0 && `${awayEmployees.length} afastados`}
                                {vacationEmployees.length === 0 && awayEmployees.length === 0 && 'Todos em atividade normal'}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                            <Users size={22} />
                        </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                        <div className="bg-sky-500 h-full rounded-full" style={{ width: '100%' }} />
                    </div>
                </div>

                {/* Sócios / Pró-labore */}
                <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Quadro Societário</span>
                            <div className="flex items-baseline gap-2 mt-2">
                                <h3 className="text-3xl font-black text-slate-800 dark:text-white tabular-nums">
                                    {partners.length}
                                </h3>
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Sócios</span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium mt-1">
                                Pró-labore ativo sob Retenção INSS
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                            <UserCheck size={22} />
                        </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: '100%' }} />
                    </div>
                </div>

                {/* Folha Líquida da Competência */}
                <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Folha Líquida ({currentCompetence})
                            </span>
                            <div className="mt-2">
                                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    {formatCurrency(financialStats.net)}
                                </h3>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className={`w-2 h-2 rounded-full ${financialStats.isClosed ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                                <p className="text-[11px] text-slate-400 font-medium">
                                    {financialStats.isClosed ? 'Competência Fechada' : 'Estimativa em Aberto'}
                                </p>
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                            <DollarSign size={22} />
                        </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: '85%' }} />
                    </div>
                </div>

                {/* Encargos & DCTFWeb Estimada */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-5 rounded-3xl shadow-lg shadow-indigo-500/15 group">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200">
                                Encargos & Tributos (INSS/FGTS)
                            </span>
                            <div className="mt-2">
                                <h3 className="text-2xl font-black tabular-nums">
                                    {formatCurrency(financialStats.taxes)}
                                </h3>
                            </div>
                            <p className="text-[11px] text-indigo-200 font-medium mt-1">
                                Base Bruta: {formatCurrency(financialStats.gross)}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-sm group-hover:rotate-6 transition-transform">
                            <FileCheck size={22} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-indigo-100">
                        <span>Obrigações DCTFWeb</span>
                        <span className="bg-white/20 px-2 py-0.5 rounded-full">Dia 20</span>
                    </div>
                </div>
            </div>

            {/* Middle Section: Alerts and Action Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left (2 cols): Preventive Alerts & Actions */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Preventive Alerts Container */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600">
                                    <ShieldAlert size={18} />
                                </div>
                                <div>
                                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
                                        Monitoramento Preventivo de Prazos Trabalhistas
                                    </h4>
                                    <p className="text-xs text-slate-400">
                                        Alertas legais da CLT (férias com risco de dobra e término de experiência)
                                    </p>
                                </div>
                            </div>
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {vacationAlerts.length + experienceAlerts.length} pendências
                            </span>
                        </div>

                        {vacationAlerts.length === 0 && experienceAlerts.length === 0 ? (
                            <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Nenhuma conformidade em risco
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Todas as férias e períodos de experiência estão em dia.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                                {vacationAlerts.map(({ employee, deadlineMonths, status }) => (
                                    <div
                                        key={`vac_${employee.id}`}
                                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                                            status === 'critical'
                                                ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                                                : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                                                status === 'critical' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                <Calendar size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <h5 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                                                    {employee.name}
                                                </h5>
                                                <p className="text-[11px] text-slate-500 truncate">
                                                    {employee.role || 'Colaborador'} • Admissão: {formatDateBR(employee.admissionDate)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                status === 'critical'
                                                    ? 'bg-rose-100 text-rose-800'
                                                    : 'bg-amber-100 text-amber-800'
                                            }`}>
                                                {status === 'critical' ? 'Risco de Dobra' : 'Férias Vencendo'} ({deadlineMonths}m)
                                            </span>
                                            <button
                                                onClick={() => onNavigateTab('cockpit')}
                                                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-[11px] hover:bg-slate-50 transition-colors"
                                            >
                                                Agendar
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {experienceAlerts.map(({ employee, daysActive, daysRemaining }) => (
                                    <div
                                        key={`exp_${employee.id}`}
                                        className="p-3.5 rounded-2xl border border-sky-200 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/20 flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-black text-xs">
                                                <Clock size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <h5 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                                                    {employee.name}
                                                </h5>
                                                <p className="text-[11px] text-slate-500 truncate">
                                                    Contrato de Experiência • {daysActive} dias ativos ({daysRemaining} dias restantes)
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => onNavigateTab('documents')}
                                            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 font-bold text-[11px] hover:bg-sky-50 transition-colors shrink-0"
                                        >
                                            Efetivar / Aditivo
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick Access Matrix */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div
                            onClick={() => onNavigateTab('cockpit')}
                            className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 shadow-sm cursor-pointer group transition-all"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <TrendingUp size={20} />
                            </div>
                            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white mb-1 flex items-center justify-between">
                                Calcular Folha
                                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                            </h4>
                            <p className="text-xs text-slate-400">
                                Assistente passo a passo ou processamento em lote para {currentCompetence}.
                            </p>
                        </div>

                        <div
                            onClick={onOpenNewEmployee}
                            className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-sm cursor-pointer group transition-all"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Plus size={20} />
                            </div>
                            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white mb-1 flex items-center justify-between">
                                Nova Admissão
                                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                            </h4>
                            <p className="text-xs text-slate-400">
                                Cadastro guiado de novo colaborador CLT ou Sócio com validações.
                            </p>
                        </div>

                        <div
                            onClick={() => onNavigateTab('documents')}
                            className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm cursor-pointer group transition-all"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <FileText size={20} />
                            </div>
                            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white mb-1 flex items-center justify-between">
                                Central Documentos
                                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                            </h4>
                            <p className="text-xs text-slate-400">
                                Folha de Ponto, Contrato de Trabalho, Avisos e Declarações.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right (1 col): Department Breakdown */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                <Briefcase size={16} className="text-slate-400" />
                                Massa Salarial por Setor
                            </h4>
                            <span className="text-[10px] font-black uppercase text-slate-400">
                                {departmentDistribution.length} setores
                            </span>
                        </div>

                        {departmentDistribution.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6">
                                Nenhum colaborador com departamento configurado.
                            </p>
                        ) : (
                            <div className="space-y-3.5">
                                {departmentDistribution.map(([dept, data]) => {
                                    const percentage = financialStats.gross > 0 ? (data.salaryTotal / financialStats.gross) * 100 : 0;
                                    return (
                                        <div key={dept} className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                                    {dept}
                                                </span>
                                                <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                                                    {formatCurrency(data.salaryTotal)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                                                <span>{data.count} colaboradores</span>
                                                <span>{percentage.toFixed(1)}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-sky-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Legal Calendar Box */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl p-5 border border-slate-200/60 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-3">
                            <Calendar size={16} className="text-sky-600 dark:text-sky-400" />
                            <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                                Prazos Trabalhistas Fixos
                            </h5>
                        </div>
                        <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                            <li className="flex justify-between border-b border-slate-200/50 dark:border-slate-700 pb-1.5">
                                <span>Pagamento dos Salários:</span>
                                <strong className="text-slate-800 dark:text-white font-mono">5º dia útil</strong>
                            </li>
                            <li className="flex justify-between border-b border-slate-200/50 dark:border-slate-700 pb-1.5">
                                <span>Guia FGTS Digital:</span>
                                <strong className="text-slate-800 dark:text-white font-mono">Dia 20 do mês</strong>
                            </li>
                            <li className="flex justify-between border-b border-slate-200/50 dark:border-slate-700 pb-1.5">
                                <span>DCTFWeb / Previdência:</span>
                                <strong className="text-slate-800 dark:text-white font-mono">Dia 20 do mês</strong>
                            </li>
                            <li className="flex justify-between">
                                <span>Adiantamento Salarial:</span>
                                <strong className="text-slate-800 dark:text-white font-mono">Dia 15 a 20</strong>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
