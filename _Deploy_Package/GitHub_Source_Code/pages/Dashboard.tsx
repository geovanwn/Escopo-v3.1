import React, { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Card } from '../components/ui/Card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ArrowUpRight, ArrowDownRight, DollarSign, FileText, AlertTriangle, TrendingUp, Target, BarChart3, Calendar as CalendarIcon, Download, ChevronDown, Filter } from 'lucide-react';
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
    green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400',
  };

  const trendColor = trend && trend > 0
    ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
    : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400';

  return (
    <Card
      className={`hover:-translate-y-1 transition-all duration-300 border border-[var(--border-color)] shadow-sm hover:shadow-xl ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">{title}</p>
          <h3 className="text-2xl font-black text-[var(--text-primary)] mt-1">{value}</h3>
        </div>
        <div className={`p-3 rounded-2xl ${colorStyles[color]}`}>
          <Icon size={22} strokeWidth={2.5} />
        </div>
      </div>
      <div className="flex items-center mt-6">
        {trend !== undefined && trend !== 0 ? (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${trendColor}`}>
            {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend).toFixed(0)}%
          </div>
        ) : (
          <span className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider">-</span>
        )}
        <span className="text-[var(--text-secondary)] text-[10px] font-medium ml-2 uppercase tracking-tight">{subtext || trendLabel}</span>
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

    // Default Rates from Company or Hardcoded Fallbacks
    const taxRate = data.selectedCompany?.taxEstimationRate ? (data.selectedCompany.taxEstimationRate / 100) : 0.06;
    const payrollFactor = data.selectedCompany?.payrollOverheadFactor || 1.6;

    invoices.forEach(inv => {
      // Filter by Company
      if (data.selectedCompany && inv.companyId !== data.selectedCompany?.id) return;
      if (inv.status === 'cancelada') return;

      const d = parseDateSafe(inv.date);
      // Filter by Date Range
      if (d < dateRange.start || d > dateRange.end) return;

      if (inv.type === 'exit' || inv.type === 'service') {
        rev += inv.value;
        count++;
        // Use custom tax rate logic
        taxes += (inv.taxValue || (inv.value * taxRate));
      } else if (inv.type === 'entry') {
        exp += inv.value;
      }
    });

    // Payroll Calculation (Proportional to period length ideally, but here using active employees * factor)
    // IMPORTANT: Ideally Payroll should be stored in 'payrollRuns', but we fallback to employee estimation if no runs exist
    // For the KPI we check actual PayrollRuns if available in the period, else estimate.

    let totalPayroll = 0;

    // Check for actual payroll runs in period
    const runsInPeriod = data.payrollRuns.filter(pr => {
      const d = parseDateSafe(pr.competence);
      return (!data.selectedCompany || pr.companyId === data.selectedCompany.id) &&
        d >= dateRange.start && d <= dateRange.end;
    });

    if (runsInPeriod.length > 0) {
      totalPayroll = runsInPeriod.reduce((acc, run) => acc + run.totalGross * 1.2, 0); // Approx cost over gross
    } else {
      // Fallback estimation per month in range
      const companyEmployees = data.selectedCompany
        ? employees.filter(e => e.companyId === data.selectedCompany?.id && e.status === 'ativo')
        : employees.filter(e => e.status === 'ativo');

      const monthlyBase = companyEmployees.reduce((acc, emp) => acc + emp.salary, 0);

      // Count approximate months in range
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
  const { chartData, pieData } = useMemo(() => {
    // 3a. Historical Data
    const chartDataArr = [];
    // We want to show month-by-month for the selected period
    // Iterate from Start Date to End Date + 3 Months (Projection)

    const currentDate = new Date(dateRange.start);
    // Align to 1st of month
    currentDate.setDate(1);

    const taxRate = data.selectedCompany?.taxEstimationRate ? (data.selectedCompany.taxEstimationRate / 100) : 0.06;
    const payrollFactor = data.selectedCompany?.payrollOverheadFactor || 1.6;

    // Loop until we reach today + 3 months (for projection)
    const today = new Date();
    const limitDate = new Date(today.getFullYear(), today.getMonth() + 3, 1);

    while (currentDate <= limitDate) {
      const monthKey = currentDate.toLocaleString('pt-BR', { month: 'short' });
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const isFuture = currentDate > today;

      let monthlyRev = 0;
      let monthlyExp = 0;
      let monthlyProjRev = 0;
      let monthlyProjExp = 0;

      invoices.forEach(inv => {
        if (data.selectedCompany && inv.companyId !== data.selectedCompany?.id) return;
        if (inv.status === 'cancelada') return;

        const invDate = parseDateSafe(inv.date);
        if (invDate.getMonth() === month && invDate.getFullYear() === year) {
          if (inv.type === 'exit' || inv.type === 'service') {
            if (isFuture || inv.status !== 'paga') {
              monthlyProjRev += inv.value; // Open invoices count as projection if future or unpaid
            }
            if (!isFuture) {
              monthlyRev += inv.value; // Historical
            }
          } else if (inv.type === 'entry') {
            if (isFuture || inv.status !== 'paga') {
              monthlyProjExp += inv.value;
            }
            if (!isFuture) {
              monthlyExp += inv.value;
            }
          }
        }
      });

      // Add Estimated Payroll to Expenses
      const companyEmployees = data.selectedCompany
        ? employees.filter(e => e.companyId === data.selectedCompany?.id && e.status === 'ativo')
        : employees.filter(e => e.status === 'ativo');
      const monthlyPayroll = companyEmployees.reduce((acc, emp) => acc + emp.salary * payrollFactor, 0);

      if (isFuture) {
        monthlyProjExp += monthlyPayroll; // Project payroll
      } else {
        monthlyExp += monthlyPayroll;
      }

      chartDataArr.push({
        name: `${monthKey}/${year.toString().slice(2)}`,
        receita: isFuture ? 0 : monthlyRev,
        despesa: isFuture ? 0 : monthlyExp,
        projetadoReceita: isFuture ? monthlyProjRev : monthlyRev + monthlyProjRev, // Combine actual + pending for near future
        projetadoDespesa: isFuture ? monthlyProjExp : monthlyExp + monthlyProjExp,
        isFuture
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // PIE Data (Composition of CURRENT selection)
    const pie = [
      { name: 'Impostos', value: taxLiability, color: '#10b981' },
      { name: 'Folha', value: payrollCost, color: '#3b82f6' },
      { name: 'Despesas', value: expenses, color: '#64748b' }
    ].filter(d => d.value > 0);

    return {
      chartData: chartDataArr,
      pieData: pie,
    };
  }, [invoices, employees, taxLiability, payrollCost, expenses, data.selectedCompany, dateRange]);

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

  // Determine Trends (Simple implementation comparing last 2 months in filtered set if enough data, else 0)
  // ... (Simplified for brevity, can be expanded)

  return (
    <div className="space-y-8 pb-10" ref={dashboardRef}>
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Dashboard Analítico</h1>
          <p className="text-[var(--text-secondary)] font-medium">
            {data.selectedCompany ? `${data.selectedCompany.nomeFantasia} • ` : ''}
            Visão Geral e Projeções
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selector */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-[var(--border-color)] rounded-xl text-sm font-bold shadow-sm hover:shadow-md transition-all">
              <CalendarIcon size={16} className="text-blue-500" />
              <span>
                {period === 'current_month' && 'Este Mês'}
                {period === 'last_3_months' && 'Últimos 3 Meses'}
                {period === 'last_6_months' && 'Últimos 6 Meses'}
                {period === 'year' && 'Este Ano'}
              </span>
              <ChevronDown size={14} className="opacity-50" />
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-[var(--border-color)] overflow-hidden hidden group-hover:block z-50">
              <div className="p-1">
                <button onClick={() => setPeriod('current_month')} className="w-full text-left px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">Este Mês</button>
                <button onClick={() => setPeriod('last_3_months')} className="w-full text-left px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">Últimos 3 Meses</button>
                <button onClick={() => setPeriod('last_6_months')} className="w-full text-left px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">Últimos 6 Meses</button>
                <button onClick={() => setPeriod('year')} className="w-full text-left px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">Este Ano</button>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl text-sm font-bold shadow-lg hover:opacity-90 transition-all"
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

      {/* KPI Grid (Clickable Drill-down) */}
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Chart with Projection */}
        <Card className="lg:col-span-3 p-8 rounded-[2.5rem] border border-[var(--border-color)] shadow-sm" glow>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-[var(--text-primary)]">Fluxo de Caixa & Projeção</h3>
              <p className="text-sm text-[var(--text-secondary)] font-medium">Histórico realizado e previsão para 3 meses</p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-[10px] font-bold uppercase">Realizado</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-300 border border-dashed border-emerald-500"></div><span className="text-[10px] font-bold uppercase">Projetado</span></div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.3} vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value / 1000}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: number) => currency(value)}
                />
                <Area type="monotone" name="Receita (Proj)" dataKey="projetadoReceita" stroke="#6ee7b7" strokeDasharray="5 5" fill="none" strokeWidth={2} />
                <Area type="monotone" name="Receita" dataKey="receita" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorReceita)" />

                <Area type="monotone" name="Despesa (Proj)" dataKey="projetadoDespesa" stroke="#93c5fd" strokeDasharray="5 5" fill="none" strokeWidth={2} />
                <Area type="monotone" name="Despesa" dataKey="despesa" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorDespesa)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* DRE Summary Widget */}
        <Card className="p-8 rounded-[2.5rem] border border-[var(--border-color)] shadow-sm flex flex-col bg-slate-50 dark:bg-slate-900/50">
          <h3 className="text-lg font-black text-[var(--text-primary)] mb-6 leading-tight">DRE Gerencial</h3>

          <div className="space-y-4 flex-1">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold text-gray-500 uppercase">Receita Bruta</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{currency(revenue)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700 text-red-500">
              <span className="text-xs font-bold uppercase">(-) Impostos</span>
              <span className="text-sm font-bold">({currency(taxLiability)})</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700 text-amber-600">
              <span className="text-xs font-bold uppercase">(-) Custos/Folha</span>
              <span className="text-sm font-bold">({currency(expenses + payrollCost)})</span>
            </div>
            <div className="pt-4 mt-auto">
              <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-600">Lucro Líquido</span>
                <span className={`text-lg font-black ${netIncome >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{currency(netIncome)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Alerts Section (Radar Fiscal local + Business Days) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
        {smartAlerts.length > 0 && (
          <Card className="p-6 border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-900/10">
            <h4 className="text-amber-800 dark:text-amber-200 font-bold flex items-center gap-2 mb-4">
              <AlertTriangle size={18} />
              Atenção aos Prazos Fiscais
            </h4>
            <div className="space-y-3">
              {smartAlerts.map((alert, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{alert.title}</span>
                    <span className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase">{alert.message}</span>
                  </div>
                  {alert.days <= 2 && (
                    <span className="px-2 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded-md animate-pulse">URGENTE</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <CalendarIcon size={24} className="text-white" />
            </div>
            <div>
              <h4 className="font-bold text-lg">Próximo Fechamento</h4>
              <p className="text-indigo-100 text-sm opacity-90">Mantenha as conciliações bancárias em dia para agilizar o fechamento contábil.</p>
            </div>
          </div>
          <button
            onClick={() => handleNavigate('/app/fiscal')}
            className="mt-6 w-full py-2 bg-white text-indigo-700 font-bold rounded-xl text-sm hover:bg-indigo-50 transition-colors"
          >
            Ir para Dp. Fiscal
          </button>
        </Card>
      </div>
    </div>
  );
};