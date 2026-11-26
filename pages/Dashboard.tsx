import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Card } from '../components/ui/Card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, DollarSign, FileText, AlertTriangle, Target, BarChart3, Calendar as CalendarIcon, Download, ChevronDown, ClipboardCheck, Clock, CheckCircle2, User, Building2, Menu } from 'lucide-react';
import { useWorkflowStore } from '../stores/useWorkflowStore';
import { parseDateSafe } from '../utils/formatters';
import { getNextBusinessDay } from '../utils/dateHelpers';
import { SmartAlerts } from '../components/SmartAlerts';

interface StatCardProps {
  title: string;
  value: string;
  subtext: string;
  icon: any;
  trend?: number;
  color?: 'green' | 'blue' | 'purple' | 'amber';
  trendLabel?: string;
  onClick?: () => void;
}

const StatCard = ({ title, value, subtext, icon: Icon, trend, color = 'green', trendLabel, onClick }: StatCardProps) => {
  const colorStyles = {
    green: 'bg-emerald-55 text-emerald-600 border border-emerald-100/50',
    blue: 'bg-cyan-55 text-cyan-600 border border-cyan-100/50',
    purple: 'bg-indigo-50 text-indigo-600 border border-indigo-100/50',
    amber: 'bg-amber-50 text-amber-605 border border-amber-100/50',
  };

  const trendColor = trend && trend > 0
    ? 'bg-emerald-50 text-emerald-600'
    : 'bg-rose-50 text-rose-600';

  return (
    <Card
      className={`hover:-translate-y-1.5 hover:scale-[1.015] hover:shadow-[0_20px_45px_rgba(14,165,233,0.09)] transition-all duration-300 border border-slate-200/60 shadow-[0_5px_15px_rgba(0,0,0,0.015)] bg-white rounded-[2rem] p-6 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
          <h3 className="text-2xl font-black text-slate-800 mt-1">{value}</h3>
        </div>
        <div className={`p-3 rounded-2xl ${colorStyles[color] || colorStyles.green}`}>
          <Icon size={22} strokeWidth={2.5} />
        </div>
      </div>
      <div className="flex items-center mt-6">
        {trend !== undefined && trend !== 0 ? (
          <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${trendColor}`}>
            {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend).toFixed(0)}%
          </div>
        ) : (
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">-</span>
        )}
        <span className="text-slate-400 text-[10px] font-bold ml-2 uppercase tracking-tight">{subtext || trendLabel}</span>
      </div>
    </Card>
  );
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const data = useData();
  const { invoices, employees, filings, taxCalendar } = data;
  const dashboardRef = useRef<HTMLDivElement>(null);

  const [period, setPeriod] = useState<'current_month' | 'last_3_months' | 'last_6_months' | 'year'>('last_6_months');
  const { tasks, subscribe: subscribeWorkflow } = useWorkflowStore();

  useEffect(() => {
    if (data.selectedCompany?.id) {
      const unsub = subscribeWorkflow(data.selectedCompany.id);
      return () => unsub();
    }
  }, [data.selectedCompany?.id, subscribeWorkflow]);

  const pendingTasks = useMemo(() => {
    return (tasks || [])
      .filter(t => t.status !== 'finalizado' && (t.status as string) !== 'cancelada' && t.status !== 'cancelado')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [tasks]);

  // Handlers for Drill-down
  const handleNavigate = (path: string) => navigate(path);

  // Export Functionality
  const handlePrint = () => {
    window.print();
  };

  // 1. Determine Date Range based on Period Selection
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();

    if (period === 'current_month') {
      start.setDate(1);
    } else if (period === 'last_3_months') {
      start.setMonth(start.getMonth() - 2);
      start.setDate(1);
    } else if (period === 'last_6_months') {
      start.setMonth(start.getMonth() - 5);
      start.setDate(1);
    } else if (period === 'year') {
      start.setMonth(0);
      start.setDate(1);
    }

    // Reset hours to compare dates properly
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }, [period]);

  // 2. Main KPI Calculation (Responsive to Date Range & Custom Rates)
  const { revenue, expenses, invoiceCount, payrollCost, taxLiability, netIncome } = useMemo(() => {
    let rev = 0;
    let exp = 0;
    let count = 0;
    let taxes = 0;

    const companyId = data.selectedCompany?.id;
    const taxRate = data.selectedCompany?.taxEstimationRate ? (data.selectedCompany.taxEstimationRate / 100) : 0.06;
    const payrollFactor = data.selectedCompany?.payrollOverheadFactor || 1.6;

    const filteredInvoices = invoices.filter(inv => {
      if (companyId && inv.companyId !== companyId) return false;
      if (inv.status === 'cancelada' || inv.status === 'cancelado' || inv.status === 'reprovado') return false;
      const d = parseDateSafe(inv.date);
      return d >= dateRange.start && d <= dateRange.end;
    });

    filteredInvoices.forEach(inv => {
      if (inv.type === 'exit' || inv.type === 'service') {
        rev += inv.value;
        count++;
        taxes += (inv.taxValue || (inv.value * taxRate));
      } else if (inv.type === 'entry') {
        exp += inv.value;
      }
    });

    let totalPayroll = 0;
    const runsInPeriod = data.payrollRuns.filter(pr => {
      if (companyId && pr.companyId !== companyId) return false;
      const d = parseDateSafe(pr.competence);
      return d >= dateRange.start && d <= dateRange.end;
    });

    if (runsInPeriod.length > 0) {
      totalPayroll = runsInPeriod.reduce((acc, run) => acc + run.totalGross * 1.2, 0);
    } else {
      const companyEmployees = companyId
        ? employees.filter(e => e.companyId === companyId && e.status === 'ativo')
        : employees.filter(e => e.status === 'ativo');
      const monthlyBase = companyEmployees.reduce((acc, emp) => acc + emp.salary, 0);
      const diffTime = Math.abs(dateRange.end.getTime() - dateRange.start.getTime());
      const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
      totalPayroll = (monthlyBase * payrollFactor) * (diffMonths || 1);
    }

    return {
      revenue: rev,
      expenses: exp,
      invoiceCount: count,
      payrollCost: totalPayroll,
      taxLiability: taxes,
      netIncome: rev - exp - totalPayroll - taxes
    };
  }, [invoices, employees, data.selectedCompany, dateRange, data.payrollRuns]);

  // 3. Prepare Chart Data (Historical + Projection)
  const { chartData } = useMemo(() => {
    const chartDataArr = [];
    const today = new Date();
    const companyId = data.selectedCompany?.id;
    const payrollFactor = data.selectedCompany?.payrollOverheadFactor || 1.6;

    // Group invoices by month first O(N)
    const monthlyStats = new Map<string, { rev: number; exp: number; projRev: number; projExp: number }>();

    invoices.forEach(inv => {
      if (companyId && inv.companyId !== companyId) return;
      if (inv.status === 'cancelada' || inv.status === 'cancelado' || inv.status === 'reprovado') return;

      const d = parseDateSafe(inv.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (!monthlyStats.has(key)) monthlyStats.set(key, { rev: 0, exp: 0, projRev: 0, projExp: 0 });
      const stats = monthlyStats.get(key)!;
      const isFuture = d > today;

      if (inv.type === 'exit' || inv.type === 'service') {
        if (isFuture || inv.status !== 'paga') stats.projRev += inv.value;
        if (!isFuture) stats.rev += inv.value;
      } else if (inv.type === 'entry') {
        if (isFuture || inv.status !== 'paga') stats.projExp += inv.value;
        if (!isFuture) stats.exp += inv.value;
      }
    });

    const companyEmployees = companyId
      ? employees.filter(e => e.companyId === companyId && e.status === 'ativo')
      : employees.filter(e => e.status === 'ativo');
    const monthlyPayroll = companyEmployees.reduce((acc, emp) => acc + emp.salary * payrollFactor, 0);

    const currentDate = new Date(dateRange.start);
    currentDate.setDate(1);
    const limitDate = new Date(today.getFullYear(), today.getMonth() + 3, 1);

    while (currentDate <= limitDate) {
      const monthKey = currentDate.toLocaleString('pt-BR', { month: 'short' });
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const key = `${year}-${month + 1}`;
      const isFuture = currentDate > today;

      const stats = monthlyStats.get(key) || { rev: 0, exp: 0, projRev: 0, projExp: 0 };

      chartDataArr.push({
        name: `${monthKey}/${year.toString().slice(2)}`,
        receita: isFuture ? 0 : stats.rev,
        despesa: isFuture ? 0 : stats.exp + monthlyPayroll,
        projetadoReceita: isFuture ? stats.projRev : stats.rev + stats.projRev,
        projetadoDespesa: isFuture ? stats.projExp + monthlyPayroll : stats.exp + stats.projExp + monthlyPayroll,
        isFuture
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return {
      chartData: chartDataArr
    };
  }, [invoices, employees, data.selectedCompany, dateRange]);

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // 4. Improved Smart Alerts (Business Day Logic)
  const smartAlerts = useMemo(() => {
    const alerts = [];
    const today = new Date();

    // Check Periodic Obligations
    // 1. DAS (Dia 20)
    const dasDeadline = new Date(today.getFullYear(), today.getMonth(), 20);
    const dasBusinessDeadline = getNextBusinessDay(dasDeadline);
    const daysToDas = Math.ceil((dasBusinessDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Check if we have a paid DAS for this month
    const dasPaid = invoices.some(i =>
      i.number.includes('DAS') &&
      i.status === 'paga' &&
      parseDateSafe(i.date).getMonth() === today.getMonth() &&
      (!data.selectedCompany || i.companyId === data.selectedCompany.id)
    );

    if (!dasPaid && daysToDas <= 10) {
      alerts.push({
        title: 'DAS Simples Nacional',
        days: daysToDas,
        message: daysToDas < 0 ? 'ATRASADO' : `Vence em ${daysToDas} dias`,
        severity: daysToDas <= 2 ? 'danger' : 'warning'
      });
    }

    // 2. DCTFWeb (Dia 15)
    const dctfDeadline = new Date(today.getFullYear(), today.getMonth(), 15);
    const dctfBusinessDeadline = getNextBusinessDay(dctfDeadline);
    const daysToDctf = Math.ceil((dctfBusinessDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Check filing status
    const filingSent = filings.some(f =>
      f.name === 'DCTFWeb' &&
      f.status === 'sent' &&
      f.competence === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}` &&
      (!data.selectedCompany || f.companyId === data.selectedCompany.id)
    );

    if (!filingSent && daysToDctf <= 10) {
      alerts.push({
        title: 'DCTFWeb',
        days: daysToDctf,
        message: daysToDctf < 0 ? 'ATRASADO' : `Vence em ${daysToDctf} dias`,
        severity: daysToDctf <= 2 ? 'danger' : 'warning'
      });
    }

    return alerts.sort((a, b) => a.days - b.days);

  }, [invoices, filings, data.selectedCompany]);

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500" ref={dashboardRef}>
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard Analítico</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mt-1">
            {data.selectedCompany ? `${data.selectedCompany.nomeFantasia} • ` : ''}
            Visão Geral e Projeções
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selector */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-bold shadow-sm hover:shadow-md transition-all focus:outline-none">
              <CalendarIcon size={16} className="text-[#0ea5e9]" />
              <span className="text-slate-700">
                {period === 'current_month' && 'Este Mês'}
                {period === 'last_3_months' && 'Últimos 3 Meses'}
                {period === 'last_6_months' && 'Últimos 6 Meses'}
                {period === 'year' && 'Este Ano'}
              </span>
              <ChevronDown size={14} className="opacity-50 text-slate-400" />
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-[1.5rem] shadow-xl border border-slate-200/70 overflow-hidden hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-1">
                <button onClick={() => setPeriod('current_month')} className="w-full text-left px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-all">Este Mês</button>
                <button onClick={() => setPeriod('last_3_months')} className="w-full text-left px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-all">Últimos 3 Meses</button>
                <button onClick={() => setPeriod('last_6_months')} className="w-full text-left px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-all">Últimos 6 Meses</button>
                <button onClick={() => setPeriod('year')} className="w-full text-left px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-all">Este Ano</button>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#0ea5e9] to-[#10b981] text-white rounded-full text-sm font-bold shadow-lg shadow-emerald-500/10 hover:opacity-95 active:scale-95 transition-all"
          >
            <Download size={16} />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Smart Alerts Component */}
      <div className="print:hidden">
        <SmartAlerts />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Faturamento"
          value={currency(revenue)}
          subtext="Receita bruta no período"
          icon={DollarSign}
          color="green"
          onClick={() => handleNavigate('/app/financial')}
        />
        <StatCard
          title="Notas Emitidas"
          value={String(invoiceCount)}
          subtext="Volume de documentos"
          icon={FileText}
          color="blue"
          onClick={() => handleNavigate('/app/fiscal')}
        />
        <StatCard
          title="Custos Totais"
          value={currency(expenses + payrollCost)}
          subtext="Operacional + Folha"
          icon={BarChart3}
          color="amber"
          onClick={() => handleNavigate('/app/financial')}
        />
        <StatCard
          title="Resultado Líquido"
          value={currency(netIncome)}
          subtext="Margem de Lucro"
          icon={Target}
          color="purple"
          trend={revenue > 0 ? (netIncome / revenue) * 100 : 0}
          trendLabel="Margem"
        />
      </div>

      {/* Pending Tasks & Reminders Card */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="p-4 md:p-8 rounded-[2rem] border border-slate-200/60 shadow-sm bg-white hover:shadow-[0_20px_45px_rgba(14,165,233,0.05)] transition-all overflow-hidden relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-50 text-cyan-600 border border-cyan-100/50 rounded-2xl">
                <ClipboardCheck size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800">Tarefas Pendentes</h3>
                <p className="text-sm text-slate-400 font-bold text-xs uppercase tracking-wider mt-0.5">Lembretes de vencimentos e prioridades</p>
              </div>
            </div>
            <button
              onClick={() => handleNavigate('/app/management')}
              className="px-6 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-650 rounded-full text-xs font-black uppercase tracking-widest border border-slate-200/50 transition-all"
            >
              Ver Todas
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {pendingTasks.length > 0 ? (
              pendingTasks.map((task) => {
                const dueDate = new Date(task.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const diffTime = dueDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                const isOverdue = diffDays < 0;
                const isToday = diffDays === 0;

                return (
                  <div
                    key={task.id}
                    className={`group p-5 rounded-[1.75rem] border transition-all hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_15px_30px_rgba(14,165,233,0.06)] cursor-pointer ${isOverdue ? 'bg-rose-50/40 border-rose-200' :
                      isToday ? 'bg-amber-50/40 border-amber-200' :
                        'bg-white border-slate-200/75 hover:border-cyan-350'
                      }`}
                    onClick={() => handleNavigate('/app/management')}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${task.priority === 'urgent' ? 'bg-rose-600 text-white' :
                        task.priority === 'high' ? 'bg-orange-500 text-white' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                        {task.priority}
                      </span>
                      {isOverdue && <AlertTriangle size={14} className="text-rose-600 animate-pulse" />}
                    </div>
                    <h4 className="text-sm font-black text-slate-800 mb-4 line-clamp-2 group-hover:text-cyan-600 transition-colors">
                      {task.title}
                    </h4>
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                        <Clock size={12} />
                        <span className={isOverdue ? 'text-rose-600' : isToday ? 'text-amber-600' : ''}>
                          {isOverdue ? `Atrasada ${Math.abs(diffDays)}d` :
                            isToday ? 'Vence hoje' :
                              `Vence em ${diffDays}d`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                        <User size={12} />
                        <span>{task.assignedTo || 'Não atribuído'}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-10 flex flex-col items-center justify-center opacity-40">
                <CheckCircle2 size={48} className="text-emerald-500 mb-3" />
                <p className="font-black uppercase tracking-widest text-xs">Tudo em dia! Nenhuma tarefa pendente.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Chart with Projection */}
        <Card className="lg:col-span-3 p-4 md:p-8 rounded-[2rem] border border-slate-200/60 shadow-sm bg-white hover:shadow-[0_20px_45px_rgba(14,165,233,0.05)] transition-all">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-800">Fluxo de Caixa & Projeção</h3>
              <p className="text-sm text-slate-400 font-bold text-xs uppercase tracking-wider mt-0.5">Histórico realizado e previsão para 3 meses</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] font-black uppercase text-slate-500">Realizado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400"></div>
                <span className="text-[10px] font-black uppercase text-slate-500">Projetado</span>
              </div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" opacity={0.5} vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value / 1000}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.05)' }}
                  formatter={(value: number) => currency(value)}
                />
                <Area isAnimationActive={false} type="monotone" name="Receita (Proj)" dataKey="projetadoReceita" stroke="#6ee7b7" strokeDasharray="5 5" fill="none" strokeWidth={2} />
                <Area isAnimationActive={false} type="monotone" name="Receita" dataKey="receita" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorReceita)" />

                <Area isAnimationActive={false} type="monotone" name="Despesa (Proj)" dataKey="projetadoDespesa" stroke="#67e8f9" strokeDasharray="5 5" fill="none" strokeWidth={2} />
                <Area isAnimationActive={false} type="monotone" name="Despesa" dataKey="despesa" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorDespesa)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* DRE Summary Widget */}
        <Card className="p-8 rounded-[2rem] border border-slate-200/60 shadow-sm flex flex-col bg-white hover:shadow-[0_20px_45px_rgba(14,165,233,0.05)] transition-all">
          <h3 className="text-lg font-black text-slate-800 mb-6 leading-tight">DRE Gerencial</h3>

          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Receita Bruta</span>
                <span className="text-sm font-bold text-slate-700">{currency(revenue)}</span>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 text-rose-500">
                <span className="text-[11px] font-black uppercase tracking-wider">(-) Impostos</span>
                <span className="text-sm font-bold">({currency(taxLiability)})</span>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 text-amber-600">
                <span className="text-[11px] font-black uppercase tracking-wider">(-) Custos/Folha</span>
                <span className="text-sm font-bold">({currency(expenses + payrollCost)})</span>
              </div>
            </div>
            <div className="pt-4 mt-auto">
              <div className="flex justify-between items-center bg-[#f8fafc] border border-slate-100/70 p-4 rounded-2xl shadow-sm">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-600">Lucro Líquido</span>
                <span className={`text-lg font-black ${netIncome >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{currency(netIncome)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Alerts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
        {smartAlerts.length > 0 && (
          <Card className="p-6 border-l-4 border-l-amber-500 bg-white rounded-[2rem] border border-slate-200/50 shadow-sm hover:shadow-[0_20px_45px_rgba(14,165,233,0.05)] transition-all">
            <h4 className="text-amber-650 font-bold flex items-center gap-2 mb-4">
              <AlertTriangle size={18} />
              Atenção aos Prazos Fiscais
            </h4>
            <div className="space-y-3">
              {smartAlerts.map((alert, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-xl shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-500">{alert.title}</span>
                    <span className="text-sm font-black text-slate-800 uppercase mt-0.5">{alert.message}</span>
                  </div>
                  {alert.days <= 2 && (
                    <span className="px-2 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-md animate-pulse">URGENTE</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6 bg-gradient-to-br from-[#0ea5e9] via-[#10b981] to-[#bef264] text-white rounded-[2rem] shadow-lg shadow-emerald-500/5 hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[180px]">
          {/* SVG Patterns decoration inside banner card */}
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <CalendarIcon size={24} className="text-white" />
            </div>
            <div>
              <h4 className="font-extrabold text-lg leading-tight text-white">Próximo Fechamento</h4>
              <p className="text-white/90 text-xs mt-1 leading-relaxed">Mantenha as conciliações bancárias em dia para agilizar o fechamento contábil do mês.</p>
            </div>
          </div>

          <button
            onClick={() => handleNavigate('/app/fiscal')}
            className="mt-6 w-full py-3 bg-white text-emerald-800 font-extrabold rounded-full text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-colors active:scale-95 transition-all"
          >
            Ir para Dp. Fiscal
          </button>
        </Card>
      </div>
    </div>
  );
};