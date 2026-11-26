import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useError } from '../contexts/ErrorContext';
import { useToast } from '../contexts/ToastContext';
import { useAuditStore } from '../stores/useAuditStore';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import {
    Users, DollarSign, FileCheck, Calculator, Calendar,
    ChevronLeft, ChevronRight, CheckCircle, CheckCircle2,
    Plus, Download, Printer, ArrowLeft, Search, X,
    FileText, ShieldCheck, AlertCircle, RefreshCw,
    TrendingUp, Landmark, FileCode, Layers, UserCheck
} from 'lucide-react';
import { PayrollRun, PayrollRunDetail, PayrollInputState, Employee, Partner } from '../types';
import { formatCurrency, formatDateBR } from '../utils/formatters';
import { calculatePayroll, PayrollResult, CONSTANTS } from '../utils/payrollEngine';
import { RUBRICS } from '../constants/rubrics';
import { generatePayrollSummaryPDF, generateSinglePayslipPDF } from '../services/payrollPdfService';
import { generateEsocial } from '../utils/legalGenerators';
import { auth } from '../firebaseConfig';

// Subcomponents
import { PayrollDashboard } from '../components/payroll/PayrollDashboard';
import { EmployeeDirectory } from '../components/payroll/EmployeeDirectory';
import { PayrollHistoryTable } from '../components/payroll/PayrollHistoryTable';
import { PayrollTaxSummary } from '../components/payroll/PayrollTaxSummary';
import { EmployeeModal } from '../components/payroll/EmployeeModal';
import { PayrollDocuments } from '../components/payroll/PayrollDocuments';

// Cockpit Step 2 Configs
import { MonthlyConfig } from '../components/payroll/cockpit/MonthlyConfig';
import { ThirteenthConfig } from '../components/payroll/cockpit/ThirteenthConfig';
import { VacationConfig } from '../components/payroll/cockpit/VacationConfig';
import { TerminationConfig } from '../components/payroll/cockpit/TerminationConfig';

// Payslip Templates for preview & print
import { PayslipTemplate } from '../components/payroll/templates/PayslipTemplate';
import { TRCTTemplate } from '../components/payroll/templates/TRCTTemplate';
import { DecimoTerceiroTemplate } from '../components/payroll/templates/DecimoTerceiroTemplate';
import { FeriasTemplate } from '../components/payroll/templates/FeriasTemplate';

export const Payroll: React.FC = () => {
    const {
        selectedCompany,
        employees,
        partners,
        payrollItems,
        payrollRuns,
        addPayrollRun,
        deletePayrollRun,
        deleteItem,
        userRole,
        userPermissions
    } = useData();

    const { showError } = useError();
    const { addToast } = useToast();
    const { addAuditLog } = useAuditStore();

    // Navigation Tab
    const [activeTab, setActiveTab] = useState<'overview' | 'cockpit' | 'collaborators' | 'history' | 'documents' | 'taxes'>('overview');

    // Competence Selector State
    const [competenceDate, setCompetenceDate] = useState(new Date());

    const currentCompetence = useMemo(() => {
        const m = (competenceDate.getMonth() + 1).toString().padStart(2, '0');
        const y = competenceDate.getFullYear();
        return `${m}/${y}`;
    }, [competenceDate]);

    const handlePrevMonth = () => {
        setCompetenceDate(new Date(competenceDate.getFullYear(), competenceDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCompetenceDate(new Date(competenceDate.getFullYear(), competenceDate.getMonth() + 1, 1));
    };

    // Consolidated People List (Employees + Partners)
    const people = useMemo(() => {
        const emps = (employees || []).filter(e => e.status !== 'inativo').map(e => ({ ...e, type: 'employee' as const }));
        const parts = (partners || []).map(p => ({ ...p, type: 'partner' as const }));
        return [...emps, ...parts].sort((a, b) => a.name.localeCompare(b.name));
    }, [employees, partners]);

    // Available Rubrics
    const allAvailableRubrics = useMemo(() => {
        const custom = (payrollItems || []).map(c => ({
            code: c.code,
            name: c.name,
            description: c.description || 'Rubrica Customizada',
            type: c.type,
            compatibleWith: ['all'],
            calcMethod: c.calcMethod,
            calcValue: c.calcValue,
            eventoFixo: c.eventoFixo,
            incidences: {
                inss: c.incidesINSS,
                fgts: c.incidesFGTS,
                irrf: c.incidesIRRF
            }
        }));
        return [...RUBRICS, ...custom];
    }, [payrollItems]);

    // Cockpit Wizard State
    const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
    const [personSearch, setPersonSearch] = useState('');
    const [personFilterType, setPersonFilterType] = useState<'all' | 'employee' | 'partner'>('all');

    const [inputs, setInputs] = useState<PayrollInputState & { proLaboreOverride?: number }>({
        he50_qtde: 0,
        he100_qtde: 0,
        faltas_dias: 0,
        atrasos_mins: 0,
        comissao_valor: 0,
        bonus_valor: 0,
        adicional_periculosidade: false,
        adicional_insalubridade: 'nenhum',
        desc_vt: false,
        desc_plano_saude: 0,
        desc_adiantamento: 0,
        desc_outros: 0,
        proLaboreOverride: 0,
        customEvents: [],
        selectedRubrics: ['1001', '1002', '5001', '5002'],
        calculationType: 'folha_mensal',
        year: competenceDate.getFullYear().toString()
    });

    const [calculatedResult, setCalculatedResult] = useState<PayrollResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Selected person
    const selectedPerson = useMemo(() => {
        return people.find(p => p.id === selectedPersonId) || null;
    }, [people, selectedPersonId]);

    // Update calculation when inputs or person change
    const runCalculation = (currentInputs: any, targetPerson = selectedPerson) => {
        if (!targetPerson) return;
        try {
            const res = calculatePayroll(targetPerson as any, currentInputs, allAvailableRubrics as any);
            setCalculatedResult(res);
        } catch (err: any) {
            console.error('Calculation error:', err);
        }
    };

    // Auto-setup defaults when person changes
    useEffect(() => {
        if (selectedPerson) {
            // Check if there's existing saved run detail in history
            const existingRun = payrollRuns.find(r =>
                r.competence === currentCompetence &&
                (r.details || []).some(d => d.employeeId === selectedPerson.id)
            );

            if (existingRun) {
                const detail = existingRun.details?.find(d => d.employeeId === selectedPerson.id);
                if (detail && detail.inputsSnapshot) {
                    const loadedInputs = {
                        ...detail.inputsSnapshot,
                        year: competenceDate.getFullYear().toString()
                    };
                    setInputs(loadedInputs);
                    runCalculation(loadedInputs, selectedPerson);
                    return;
                }
            }

            // Clean Slate defaults
            const baseSalary = selectedPerson.type === 'employee'
                ? (selectedPerson as Employee).salary || 1518
                : (selectedPerson as Partner).proLaboreValue || 1518;

            const isVt = selectedPerson.type === 'employee' ? Boolean((selectedPerson as Employee).transportVoucher) : false;
            const isHealth = selectedPerson.type === 'employee' ? Boolean((selectedPerson as Employee).healthPlan) : false;

            const initialInputs: any = {
                he50_qtde: 0,
                he100_qtde: 0,
                faltas_dias: 0,
                atrasos_mins: 0,
                comissao_valor: 0,
                bonus_valor: 0,
                adicional_periculosidade: false,
                adicional_insalubridade: 'nenhum',
                desc_vt: isVt,
                desc_plano_saude: isHealth ? 180 : 0,
                desc_adiantamento: 0,
                desc_outros: 0,
                proLaboreOverride: baseSalary,
                customEvents: [],
                selectedRubrics: ['1001', '1002', '5001', '5002'],
                calculationType: 'folha_mensal',
                rescisaoReason: 'sem_justa_causa',
                rescisaoNotice: 'indenizado',
                rescisaoVacationBalance: 0,
                decimoTerceiroParcela: '1',
                feriasDias: 30,
                feriasAbono: false,
                year: competenceDate.getFullYear().toString()
            };

            setInputs(initialInputs);
            runCalculation(initialInputs, selectedPerson);
        }
    }, [selectedPersonId, currentCompetence]);

    const handleInputChange = (field: string, value: any) => {
        setInputs(prev => {
            const next = { ...prev, [field]: value };
            runCalculation(next);
            return next;
        });
    };

    // Close and Save Payroll Run
    const handleCloseCurrentPayroll = async () => {
        if (!calculatedResult || !selectedPerson || !selectedCompany) {
            addToast('Dados incompletos para fechamento.', 'warning');
            return;
        }

        setIsProcessing(true);
        try {
            const runPayload: PayrollRun = {
                id: `run_${Date.now()}`,
                companyId: selectedCompany.id,
                competence: currentCompetence,
                status: 'fechado',
                closedAt: new Date().toISOString(),
                employeeCount: 1,
                totalGross: calculatedResult.totalProventos,
                totalNet: calculatedResult.netSalary,
                totalTaxes: (calculatedResult.events.find(e => e.code === '5001')?.value || 0) +
                    (calculatedResult.events.find(e => e.code === '5002')?.value || 0),
                details: [{
                    employeeId: selectedPerson.id,
                    employeeName: selectedPerson.name,
                    personType: selectedPerson.type as any,
                    role: selectedPerson.role || (selectedPerson as any).position || 'Colaborador',
                    competence: currentCompetence,
                    baseSalary: calculatedResult.events.find(e => e.code === '1001' || e.code === '1002')?.value || 0,
                    events: calculatedResult.events,
                    totalProventos: calculatedResult.totalProventos,
                    totalDescontos: calculatedResult.totalDescontos,
                    netSalary: calculatedResult.netSalary,
                    baseINSS: calculatedResult.baseINSS,
                    baseFGTS: calculatedResult.baseFGTS,
                    baseIRRF: calculatedResult.baseIRRF,
                    fgtsValue: calculatedResult.fgtsValue,
                    inssValue: calculatedResult.events.find(e => e.code === '5001')?.value || 0,
                    irrfValue: calculatedResult.events.find(e => e.code === '5002')?.value || 0,
                    inputsSnapshot: inputs
                }],
                calculationType: (inputs.calculationType as any) || 'folha_mensal'
            };

            await addPayrollRun(JSON.parse(JSON.stringify(runPayload)));

            addAuditLog({
                userId: auth.currentUser?.uid || 'system',
                userName: auth.currentUser?.email || 'Administrador',
                action: 'create',
                entity: 'Payroll',
                entityId: selectedCompany.id,
                details: `Fechamento de folha individual para ${selectedPerson.name} (${currentCompetence}) - Líquido ${formatCurrency(calculatedResult.netSalary)}.`,
                timestamp: new Date().toISOString()
            });

            addToast(`Folha de ${selectedPerson.name} fechada com sucesso!`, 'success');
            setActiveTab('history');
            setWizardStep(1);
            setSelectedPersonId(null);
            setCalculatedResult(null);
        } catch (err: any) {
            showError({
                code: 'CLOSE_ERR_001',
                title: 'Erro ao Fechar Folha',
                description: err.message,
                origin: 'Módulo DP',
                suggestion: 'Verifique se há bloqueios no período ou inconsistências de dados.',
                type: 'error'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Batch Calculation (Processar Todos)
    const [isBatchRunning, setIsBatchRunning] = useState(false);
    const handleBatchProcess = async () => {
        if (!selectedCompany) {
            addToast('Nenhuma empresa ativa selecionada.', 'warning');
            return;
        }

        if (people.length === 0) {
            addToast('Nenhum colaborador ativo cadastrado para processar.', 'warning');
            return;
        }

        if (!confirm(`Deseja calcular e fechar a folha da competência ${currentCompetence} para todos os ${people.length} colaboradores ativos?`)) {
            return;
        }

        setIsBatchRunning(true);
        try {
            const details: PayrollRunDetail[] = [];
            let totalGross = 0;
            let totalNet = 0;
            let totalTaxes = 0;

            for (const person of people) {
                const isEmp = person.type === 'employee';
                const base = isEmp ? (person as Employee).salary || 1518 : (person as Partner).proLaboreValue || 1518;
                const batchInput: any = {
                    he50_qtde: 0,
                    he100_qtde: 0,
                    faltas_dias: 0,
                    atrasos_mins: 0,
                    comissao_valor: 0,
                    bonus_valor: 0,
                    adicional_periculosidade: false,
                    adicional_insalubridade: 'nenhum',
                    desc_vt: isEmp ? Boolean((person as Employee).transportVoucher) : false,
                    desc_plano_saude: isEmp && (person as Employee).healthPlan ? 180 : 0,
                    desc_adiantamento: 0,
                    desc_outros: 0,
                    proLaboreOverride: base,
                    customEvents: [],
                    selectedRubrics: ['1001', '1002', '5001', '5002'],
                    calculationType: 'folha_mensal',
                    year: competenceDate.getFullYear().toString()
                };

                const calc = calculatePayroll(person as any, batchInput, allAvailableRubrics as any);

                const inss = calc.events.find(e => e.code === '5001')?.value || 0;
                const irrf = calc.events.find(e => e.code === '5002')?.value || 0;

                totalGross += calc.totalProventos;
                totalNet += calc.netSalary;
                totalTaxes += inss + irrf;

                details.push({
                    employeeId: person.id,
                    employeeName: person.name,
                    personType: person.type as any,
                    role: person.role || (person as any).position || 'Colaborador',
                    competence: currentCompetence,
                    baseSalary: base,
                    events: calc.events,
                    totalProventos: calc.totalProventos,
                    totalDescontos: calc.totalDescontos,
                    netSalary: calc.netSalary,
                    baseINSS: calc.baseINSS,
                    baseFGTS: calc.baseFGTS,
                    baseIRRF: calc.baseIRRF,
                    fgtsValue: calc.fgtsValue,
                    inssValue: inss,
                    irrfValue: irrf,
                    inputsSnapshot: batchInput
                });
            }

            const batchRun: PayrollRun = {
                id: `batch_${Date.now()}`,
                companyId: selectedCompany.id,
                competence: currentCompetence,
                status: 'fechado',
                closedAt: new Date().toISOString(),
                employeeCount: details.length,
                totalGross,
                totalNet,
                totalTaxes,
                details,
                calculationType: 'folha_mensal'
            };

            await addPayrollRun(JSON.parse(JSON.stringify(batchRun)));

            addAuditLog({
                userId: auth.currentUser?.uid || 'system',
                userName: auth.currentUser?.email || 'Administrador',
                action: 'create',
                entity: 'Payroll',
                entityId: selectedCompany.id,
                details: `Processamento em lote da folha ${currentCompetence} para ${details.length} colaboradores. Total líquido: ${formatCurrency(totalNet)}.`,
                timestamp: new Date().toISOString()
            });

            addToast(`Folha consolidada de ${details.length} colaboradores fechada com sucesso!`, 'success');
            setActiveTab('history');
        } catch (err: any) {
            showError({
                code: 'BATCH_ERR_001',
                title: 'Falha no Processamento em Lote',
                description: err.message,
                origin: 'Cálculo em Lote DP',
                suggestion: 'Verifique se os colaboradores possuem dados válidos cadastrados.',
                type: 'error'
            });
        } finally {
            setIsBatchRunning(false);
        }
    };

    // Modals state
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
    const [employeeToEdit, setEmployeeToEdit] = useState<any>(null);
    const [employeeModalDefaultType, setEmployeeModalDefaultType] = useState<'employee' | 'partner'>('employee');
    const [selectedDocEmployeeId, setSelectedDocEmployeeId] = useState<string | undefined>(undefined);

    const [viewPayslip, setViewPayslip] = useState<PayrollRunDetail | null>(null);
    const [viewDetails, setViewDetails] = useState<PayrollRun | null>(null);

    // Handlers
    const handleOpenNewEmployeeModal = (type: 'employee' | 'partner' = 'employee') => {
        setEmployeeToEdit(null);
        setEmployeeModalDefaultType(type);
        setIsEmployeeModalOpen(true);
    };

    const handleEditEmployee = (collab: any) => {
        setEmployeeToEdit(collab);
        setIsEmployeeModalOpen(true);
    };

    const handleDeleteEmployee = async (type: 'employee' | 'partner', id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja excluir o cadastro de "${name}"? Esta ação removerá o colaborador do sistema.`)) {
            return;
        }

        try {
            await deleteItem(type === 'employee' ? 'employees' : 'partners', id);
            addToast(`Colaborador ${name} excluído.`, 'success');
        } catch (err: any) {
            addToast(`Erro ao excluir: ${err.message}`, 'error');
        }
    };

    const handleCalculatePersonFromDirectory = (personId: string) => {
        setSelectedPersonId(personId);
        setWizardStep(2);
        setActiveTab('cockpit');
    };

    const handleGenerateDocFromDirectory = (personId: string) => {
        setSelectedDocEmployeeId(personId);
        setActiveTab('documents');
    };

    const handleEditRunFromHistory = (run: PayrollRun) => {
        if (run.details && run.details.length > 0) {
            const first = run.details[0];
            setSelectedPersonId(first.employeeId);
            setWizardStep(2);
            setActiveTab('cockpit');
            addToast(`Carregados lançamentos da competência ${run.competence}.`, 'info');
        }
    };

    const handleDeleteRun = async (runId: string) => {
        if (!confirm('Tem certeza que deseja excluir este fechamento de folha?')) return;
        try {
            await deletePayrollRun(runId);
            addToast('Fechamento de folha excluído.', 'success');
        } catch (err: any) {
            addToast(`Erro ao excluir: ${err.message}`, 'error');
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden animate-in fade-in duration-300">
            {/* TOP HEADER BAR — Executive Level */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-5 shrink-0 z-10">
                {/* Title & Badge */}
                <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-gradient-to-br from-sky-500 via-indigo-600 to-violet-700 rounded-2xl shadow-md shadow-sky-500/20 text-white">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                Departamento Pessoal & RH
                            </h1>
                            {selectedCompany && (
                                <span className="px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60 text-[10px] font-black uppercase">
                                    {selectedCompany.nomeFantasia || selectedCompany.razaoSocial}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 font-medium">
                            Gestão de colaboradores, cálculos de folha de pagamento, encargos e conformidade legal
                        </p>
                    </div>
                </div>

                {/* Right controls: Competence selector & Navigation pills */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Competence Navigator */}
                    <div className="flex items-center gap-2 bg-slate-900 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-md">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 rounded-xl text-white">
                            <Calendar size={14} />
                            <span className="text-xs font-black uppercase font-mono tracking-tight">{currentCompetence}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-slate-400">
                            <button
                                onClick={handlePrevMonth}
                                className="p-1 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                title="Competência Anterior"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={handleNextMonth}
                                className="p-1 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                title="Próxima Competência"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Quick Batch Button */}
                    <button
                        onClick={handleBatchProcess}
                        disabled={isBatchRunning}
                        className="flex items-center gap-2 px-4 py-2.5 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 rounded-2xl font-bold text-xs border border-sky-200/60 dark:border-sky-800/60 transition-all active:scale-95"
                        title="Calcular a folha de todos os colaboradores ativos"
                    >
                        <TrendingUp size={15} />
                        <span>{isBatchRunning ? 'Processando Lote...' : 'Calcular Todos em Lote'}</span>
                    </button>
                </div>
            </header>

            {/* NAVIGATION TABS — 6 Executive Pillars */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 mb-5 overflow-x-auto shrink-0 scrollbar-none">
                {[
                    { id: 'overview', label: 'Visão Geral & Indicadores', icon: Layers },
                    { id: 'cockpit', label: 'Folha & Cockpit', icon: Calculator },
                    { id: 'collaborators', label: 'Colaboradores', icon: Users, count: people.length },
                    { id: 'history', label: 'Histórico & Fechamentos', icon: FileCheck, count: payrollRuns.length },
                    { id: 'documents', label: 'Central de Documentos', icon: FileText },
                    { id: 'taxes', label: 'Encargos & DCTFWeb', icon: Landmark }
                ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                                isActive
                                    ? 'bg-gradient-to-r from-sky-500 via-indigo-600 to-violet-600 text-white shadow-md shadow-sky-500/20'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/40'
                            }`}
                        >
                            <Icon size={15} />
                            <span>{tab.label}</span>
                            {tab.count !== undefined && (
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* MAIN CONTENT WORKSPACE */}
            <div className="flex-1 overflow-y-auto pr-1 pb-6">
                {/* 1. OVERVIEW & ANALYTICS */}
                {activeTab === 'overview' && (
                    <PayrollDashboard
                        employees={employees}
                        partners={partners}
                        history={payrollRuns}
                        currentCompetence={currentCompetence}
                        onNavigateTab={tab => setActiveTab(tab as any)}
                        onOpenNewEmployee={() => handleOpenNewEmployeeModal('employee')}
                    />
                )}

                {/* 2. COCKPIT (CALCULATION ENGINE & WIZARD) */}
                {activeTab === 'cockpit' && (
                    <div className="flex flex-col h-full gap-4">
                        {/* WIZARD STEP HEADER */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between px-6 md:px-16 relative overflow-hidden">
                            {[
                                { step: 1, label: '1. Seleção do Colaborador' },
                                { step: 2, label: '2. Lançamento de Variáveis' },
                                { step: 3, label: '3. Conferência de Cálculos' },
                                { step: 4, label: '4. Conclusão & Fechamento' }
                            ].map(s => (
                                <div
                                    key={s.step}
                                    onClick={() => s.step <= wizardStep && setWizardStep(s.step as any)}
                                    className={`flex items-center gap-2.5 cursor-pointer transition-all ${
                                        wizardStep === s.step
                                            ? 'text-sky-600 dark:text-sky-400 font-extrabold'
                                            : wizardStep > s.step
                                            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                            : 'text-slate-400 font-medium opacity-60'
                                    }`}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                                        wizardStep === s.step
                                            ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                                            : wizardStep > s.step
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                    }`}>
                                        {wizardStep > s.step ? <CheckCircle size={14} /> : s.step}
                                    </div>
                                    <span className="text-xs uppercase tracking-wider hidden sm:inline">{s.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* STEP 1: SELECT COLLABORATOR */}
                        {wizardStep === 1 && (
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-5">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                                    <div>
                                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                                            Quem vamos processar nesta competência ({currentCompetence})?
                                        </h3>
                                        <p className="text-xs text-slate-400">
                                            Selecione o empregado CLT ou sócio para abrir a folha mensal, 13º, férias ou rescisão.
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                                            <button
                                                onClick={() => setPersonFilterType('all')}
                                                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                                                    personFilterType === 'all'
                                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                            >
                                                Todos ({people.length})
                                            </button>
                                            <button
                                                onClick={() => setPersonFilterType('employee')}
                                                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                                                    personFilterType === 'employee'
                                                        ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                            >
                                                CLT ({people.filter(p => p.type === 'employee').length})
                                            </button>
                                            <button
                                                onClick={() => setPersonFilterType('partner')}
                                                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                                                    personFilterType === 'partner'
                                                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                            >
                                                Sócios ({people.filter(p => p.type === 'partner').length})
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Search Bar */}
                                <div className="relative">
                                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nome, cargo ou CPF..."
                                        value={personSearch}
                                        onChange={e => setPersonSearch(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 rounded-2xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-sky-500 transition-all placeholder:text-slate-400"
                                    />
                                    {personSearch && (
                                        <button
                                            onClick={() => setPersonSearch('')}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Grid of People to Select */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[420px] overflow-y-auto pr-1">
                                    {people
                                        .filter(p => personFilterType === 'all' || p.type === personFilterType)
                                        .filter(p => {
                                            if (!personSearch.trim()) return true;
                                            const low = personSearch.toLowerCase();
                                            return p.name.toLowerCase().includes(low) || (p.role && p.role.toLowerCase().includes(low));
                                        })
                                        .map(person => {
                                            const isSelected = selectedPersonId === person.id;
                                            const isEmp = person.type === 'employee';
                                            const val = isEmp ? (person as Employee).salary || 0 : (person as Partner).proLaboreValue || 0;

                                            return (
                                                <div
                                                    key={person.id}
                                                    onClick={() => {
                                                        setSelectedPersonId(person.id);
                                                    }}
                                                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                                        isSelected
                                                            ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-500 shadow-md ring-2 ring-sky-500/20'
                                                            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0 shadow-inner ${
                                                            isEmp
                                                                ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                                                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                        }`}>
                                                            {person.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                                                                    {person.name}
                                                                </h4>
                                                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                                                    isEmp ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                                                                }`}>
                                                                    {isEmp ? 'CLT' : 'Sócio'}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                                                                {person.role || 'Cargo'} • <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(val)}</strong>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                                                        isSelected ? 'bg-sky-600 text-white' : 'border border-slate-300 dark:border-slate-600 text-transparent'
                                                    }`}>
                                                        <CheckCircle2 size={12} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>

                                {/* Step 1 Footer */}
                                {selectedPerson && (
                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 flex items-center justify-center font-black text-sm">
                                                {selectedPerson.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                                    {selectedPerson.name}
                                                </h4>
                                                <p className="text-xs text-slate-400">
                                                    Competência selecionada: <strong>{currentCompetence}</strong>
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setWizardStep(2)}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-sky-500/20 active:scale-95 transition-all"
                                        >
                                            <span>Avançar para Lançamentos</span>
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STEP 2: VARIABLE ENTRIES */}
                        {wizardStep === 2 && selectedPerson && (
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-6">
                                {/* Subheader with Regime selector */}
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setWizardStep(1)}
                                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"
                                        >
                                            <ArrowLeft size={18} />
                                        </button>
                                        <div>
                                            <h3 className="text-base font-black text-slate-900 dark:text-white">
                                                Lançamentos: {selectedPerson.name}
                                            </h3>
                                            <p className="text-xs text-slate-400">
                                                Competência {currentCompetence} • Salário Base Contratual: <strong>{formatCurrency(selectedPerson.type === 'employee' ? (selectedPerson as Employee).salary || 0 : (selectedPerson as Partner).proLaboreValue || 0)}</strong>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Regime Selection */}
                                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold">
                                        {[
                                            { id: 'folha_mensal', label: 'Folha Mensal' },
                                            { id: 'decimo_terceiro', label: '13º Salário' },
                                            { id: 'ferias', label: 'Férias' },
                                            { id: 'rescisao', label: 'Rescisão TRCT' }
                                        ].map(regime => (
                                            <button
                                                key={regime.id}
                                                type="button"
                                                onClick={() => handleInputChange('calculationType', regime.id)}
                                                className={`px-3 py-1.5 rounded-xl transition-all ${
                                                    inputs.calculationType === regime.id
                                                        ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                            >
                                                {regime.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Active Config according to calculationType */}
                                {inputs.calculationType === 'folha_mensal' && (
                                    <MonthlyConfig
                                        inputs={inputs}
                                        selectedPerson={selectedPerson}
                                        handleInputChange={handleInputChange}
                                        onSimulate={() => runCalculation(inputs)}
                                        onSave={() => {}}
                                        canWrite={true}
                                    />
                                )}
                                {inputs.calculationType === 'decimo_terceiro' && (
                                    <ThirteenthConfig
                                        inputs={inputs}
                                        handleInputChange={handleInputChange}
                                        onSimulate={() => runCalculation(inputs)}
                                        onSave={() => {}}
                                        canWrite={true}
                                    />
                                )}
                                {inputs.calculationType === 'ferias' && (
                                    <VacationConfig
                                        inputs={inputs}
                                        handleInputChange={handleInputChange}
                                        onSimulate={() => runCalculation(inputs)}
                                        onSave={() => {}}
                                        canWrite={true}
                                    />
                                )}
                                {inputs.calculationType === 'rescisao' && (
                                    <TerminationConfig
                                        inputs={inputs}
                                        handleInputChange={handleInputChange}
                                        onSimulate={() => runCalculation(inputs)}
                                        onSave={() => {}}
                                        canWrite={true}
                                    />
                                )}

                                {/* Step 2 Footer */}
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-slate-400">Estimativa Líquida:</span>
                                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                                            {calculatedResult ? formatCurrency(calculatedResult.netSalary) : '—'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setWizardStep(1)}
                                            className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors"
                                        >
                                            Voltar
                                        </button>
                                        <button
                                            onClick={() => {
                                                runCalculation(inputs);
                                                setWizardStep(3);
                                            }}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-sky-500/20 active:scale-95 transition-all"
                                        >
                                            <span>Conferir Espelho de Cálculos</span>
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: REVIEW & CONFERÊNCIA */}
                        {wizardStep === 3 && calculatedResult && selectedPerson && (
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-6">
                                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setWizardStep(2)}
                                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"
                                        >
                                            <ArrowLeft size={18} />
                                        </button>
                                        <div>
                                            <h3 className="text-base font-black text-slate-900 dark:text-white">
                                                Espelho de Cálculo Oficial: {selectedPerson.name}
                                            </h3>
                                            <p className="text-xs text-slate-400">
                                                Competência {currentCompetence} • Regime: {inputs.calculationType}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => generateSinglePayslipPDF(
                                                { ...calculatedResult, employeeId: selectedPerson.id, employeeName: selectedPerson.name, personType: selectedPerson.type as any, role: selectedPerson.role || '', competence: currentCompetence } as any,
                                                people,
                                                selectedCompany,
                                                currentCompetence,
                                                'print',
                                                setIsProcessing,
                                                showError
                                            )}
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors"
                                        >
                                            <Printer size={15} />
                                            <span>Imprimir Prévia</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Financial Summary Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                                        <span className="text-[10px] font-black uppercase text-slate-400">Total de Proventos</span>
                                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                                            {formatCurrency(calculatedResult.totalProventos)}
                                        </p>
                                    </div>

                                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                                        <span className="text-[10px] font-black uppercase text-slate-400">Total de Descontos</span>
                                        <p className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono mt-1">
                                            {formatCurrency(calculatedResult.totalDescontos)}
                                        </p>
                                    </div>

                                    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-600/20">
                                        <span className="text-[10px] font-black uppercase text-emerald-100">Valor Líquido a Receber</span>
                                        <p className="text-3xl font-black font-mono mt-1">
                                            {formatCurrency(calculatedResult.netSalary)}
                                        </p>
                                    </div>
                                </div>

                                {/* Rubrics Breakdown Table */}
                                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                            <tr>
                                                <th className="px-5 py-3">Código</th>
                                                <th className="px-5 py-3">Descrição da Rubrica</th>
                                                <th className="px-4 py-3 text-center">Referência</th>
                                                <th className="px-5 py-3 text-right">Proventos (R$)</th>
                                                <th className="px-5 py-3 text-right">Descontos (R$)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                            {calculatedResult.events.map((ev, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                                    <td className="px-5 py-3 font-mono font-bold text-slate-500">
                                                        {ev.code}
                                                    </td>
                                                    <td className="px-5 py-3 font-bold text-slate-800 dark:text-white">
                                                        {ev.description}
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-mono text-slate-400">
                                                        {ev.reference || '—'}
                                                    </td>
                                                    <td className="px-5 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                        {ev.type === 'provento' ? formatCurrency(ev.value) : '—'}
                                                    </td>
                                                    <td className="px-5 py-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                                        {ev.type === 'desconto' ? formatCurrency(ev.value) : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 font-extrabold text-xs">
                                            <tr>
                                                <td colSpan={3} className="px-5 py-3 text-right uppercase tracking-wider text-slate-400">
                                                    Totais Apurados:
                                                </td>
                                                <td className="px-5 py-3 text-right text-emerald-600 dark:text-emerald-400 font-mono">
                                                    {formatCurrency(calculatedResult.totalProventos)}
                                                </td>
                                                <td className="px-5 py-3 text-right text-rose-600 dark:text-rose-400 font-mono">
                                                    {formatCurrency(calculatedResult.totalDescontos)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Bases Legais */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                                        <span className="text-[10px] font-black uppercase text-slate-400">Base INSS</span>
                                        <p className="text-sm font-black font-mono text-slate-800 dark:text-white mt-1">
                                            {formatCurrency(calculatedResult.baseINSS)}
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                                        <span className="text-[10px] font-black uppercase text-slate-400">Base FGTS</span>
                                        <p className="text-sm font-black font-mono text-slate-800 dark:text-white mt-1">
                                            {formatCurrency(calculatedResult.baseFGTS)}
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                                        <span className="text-[10px] font-black uppercase text-slate-400">Base IRRF</span>
                                        <p className="text-sm font-black font-mono text-slate-800 dark:text-white mt-1">
                                            {formatCurrency(calculatedResult.baseIRRF)}
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                                        <span className="text-[10px] font-black uppercase text-slate-400">FGTS do Mês (8%)</span>
                                        <p className="text-sm font-black font-mono text-teal-600 dark:text-teal-400 mt-1">
                                            {formatCurrency(calculatedResult.fgtsValue)}
                                        </p>
                                    </div>
                                </div>

                                {/* Step 3 Footer */}
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <button
                                        onClick={() => setWizardStep(2)}
                                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors"
                                    >
                                        Revisar Lançamentos
                                    </button>

                                    <button
                                        onClick={() => setWizardStep(4)}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                                    >
                                        <span>Avançar para Conclusão</span>
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: CONCLUSÃO & FECHAMENTO */}
                        {wizardStep === 4 && calculatedResult && selectedPerson && (
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-10 text-center max-w-xl mx-auto space-y-6">
                                <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
                                    <CheckCircle2 size={40} />
                                </div>

                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                        Cálculo Pronto para Fechamento!
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Os valores foram conferidos com sucesso para <strong>{selectedPerson.name}</strong> na competência <strong>{currentCompetence}</strong>.
                                    </p>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700 text-left space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Total Proventos:</span>
                                        <span className="font-bold text-emerald-600 font-mono">{formatCurrency(calculatedResult.totalProventos)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Total Descontos:</span>
                                        <span className="font-bold text-rose-600 font-mono">{formatCurrency(calculatedResult.totalDescontos)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-black text-sm">
                                        <span className="text-slate-800 dark:text-white">Líquido Final:</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(calculatedResult.netSalary)}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleCloseCurrentPayroll}
                                        disabled={isProcessing}
                                        className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle size={18} />
                                        <span>{isProcessing ? 'Gravando e Fechando...' : 'Gravar e Fechar Folha Oficial'}</span>
                                    </button>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => generateSinglePayslipPDF(
                                                { ...calculatedResult, employeeId: selectedPerson.id, employeeName: selectedPerson.name, personType: selectedPerson.type as any, role: selectedPerson.role || '', competence: currentCompetence } as any,
                                                people,
                                                selectedCompany,
                                                currentCompetence,
                                                'download',
                                                setIsProcessing,
                                                showError
                                            )}
                                            className="py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Download size={14} />
                                            <span>Baixar Holerite (PDF)</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setWizardStep(1);
                                                setSelectedPersonId(null);
                                                setCalculatedResult(null);
                                            }}
                                            className="py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 rounded-xl font-bold text-xs transition-colors"
                                        >
                                            Calcular Outro
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. QUADRO DE COLABORADORES */}
                {activeTab === 'collaborators' && (
                    <EmployeeDirectory
                        employees={employees}
                        partners={partners}
                        onOpenNewModal={handleOpenNewEmployeeModal}
                        onEditEmployee={handleEditEmployee}
                        onDeleteEmployee={handleDeleteEmployee}
                        onCalculatePerson={handleCalculatePersonFromDirectory}
                        onGenerateDoc={handleGenerateDocFromDirectory}
                    />
                )}

                {/* 4. HISTÓRICO & FECHAMENTOS */}
                {activeTab === 'history' && (
                    <PayrollHistoryTable
                        history={payrollRuns}
                        selectedCompany={selectedCompany}
                        people={people}
                        onEditRun={handleEditRunFromHistory}
                        onDeleteRun={handleDeleteRun}
                        onViewPayslip={detail => setViewPayslip(detail)}
                        onViewDetails={run => setViewDetails(run)}
                    />
                )}

                {/* 5. CENTRAL DE DOCUMENTOS */}
                {activeTab === 'documents' && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
                        <PayrollDocuments initialEmployeeId={selectedDocEmployeeId} />
                    </div>
                )}

                {/* 6. ENCARGOS & DCTFWEB */}
                {activeTab === 'taxes' && (
                    <PayrollTaxSummary
                        selectedCompany={selectedCompany}
                        employees={employees}
                        partners={partners}
                        history={payrollRuns}
                        currentCompetence={currentCompetence}
                    />
                )}
            </div>

            {/* MODALS */}
            {/* Modal de Admissão / Edição de Colaborador */}
            <EmployeeModal
                isOpen={isEmployeeModalOpen}
                onClose={() => setIsEmployeeModalOpen(false)}
                employeeToEdit={employeeToEdit}
                defaultType={employeeModalDefaultType}
            />

            {/* Modal de Visualização do Holerite */}
            <Modal
                isOpen={Boolean(viewPayslip)}
                onClose={() => setViewPayslip(null)}
                title="Demonstrativo de Pagamento (Holerite Oficial)"
                maxWidth="5xl"
            >
                {viewPayslip && (
                    <div className="flex flex-col items-center bg-slate-100 dark:bg-slate-950 p-6 rounded-2xl">
                        <div className="w-full flex justify-end gap-3 mb-4">
                            <Button
                                onClick={() => generateSinglePayslipPDF(viewPayslip as any, people, selectedCompany, currentCompetence, 'print', setIsProcessing, showError)}
                                className="bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-2"
                            >
                                <Printer size={15} /> Imprimir Holerite
                            </Button>
                            <Button
                                onClick={() => generateSinglePayslipPDF(viewPayslip as any, people, selectedCompany, currentCompetence, 'download', setIsProcessing, showError)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                            >
                                <Download size={15} /> Salvar PDF
                            </Button>
                        </div>
                        <div className="scale-[0.88] origin-top shadow-xl bg-white rounded-xl overflow-hidden">
                            {(() => {
                                const personData = people.find(p => p.id === viewPayslip.employeeId);
                                const dataProp = {
                                    person: {
                                        id: viewPayslip.employeeId,
                                        name: viewPayslip.employeeName,
                                        type: viewPayslip.personType,
                                        role: viewPayslip.role,
                                        pis: (personData as any)?.pis || '',
                                        admissionDate: (personData as any)?.admissionDate || '',
                                        cbo: (personData as any)?.cbo || ''
                                    },
                                    events: viewPayslip.events,
                                    totalProventos: viewPayslip.totalProventos,
                                    totalDescontos: viewPayslip.totalDescontos,
                                    netSalary: viewPayslip.netSalary,
                                    baseINSS: viewPayslip.baseINSS,
                                    baseIRRF: viewPayslip.baseIRRF,
                                    baseFGTS: viewPayslip.baseFGTS,
                                    fgtsValue: viewPayslip.fgtsValue,
                                    ...viewPayslip.inputsSnapshot
                                };

                                const calcType = viewPayslip.inputsSnapshot?.calculationType;
                                if (calcType === 'rescisao') return <TRCTTemplate data={dataProp} company={selectedCompany} />;
                                if (calcType === 'decimo_terceiro') return <DecimoTerceiroTemplate data={dataProp} company={selectedCompany} label="HISTÓRICO" inputs={viewPayslip.inputsSnapshot} />;
                                if (calcType === 'ferias') return <FeriasTemplate data={dataProp} company={selectedCompany} label="HISTÓRICO" inputs={viewPayslip.inputsSnapshot} />;
                                return <PayslipTemplate data={dataProp} company={selectedCompany} label="HISTÓRICO" />;
                            })()}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal de Detalhes da Folha Consolidada */}
            <Modal
                isOpen={Boolean(viewDetails)}
                onClose={() => setViewDetails(null)}
                title={`Detalhes do Fechamento - ${viewDetails?.competence}`}
                maxWidth="4xl"
            >
                {viewDetails && (
                    <div className="space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex justify-between items-center text-xs">
                            <div>
                                <span className="text-slate-400 uppercase font-black">Competência:</span>
                                <p className="text-lg font-black text-slate-800 dark:text-white font-mono">{viewDetails.competence}</p>
                            </div>
                            <div>
                                <span className="text-slate-400 uppercase font-black">Colaboradores:</span>
                                <p className="text-lg font-black text-slate-800 dark:text-white font-mono">{viewDetails.employeeCount}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-slate-400 uppercase font-black">Total Líquido:</span>
                                <p className="text-lg font-black text-emerald-600 font-mono">{formatCurrency(viewDetails.totalNet)}</p>
                            </div>
                        </div>

                        <div className="max-h-[350px] overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-400 sticky top-0">
                                    <tr>
                                        <th className="p-3">Colaborador</th>
                                        <th className="p-3 text-right">Proventos</th>
                                        <th className="p-3 text-right">Descontos</th>
                                        <th className="p-3 text-right">Líquido</th>
                                        <th className="p-3 text-center">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {(viewDetails.details || []).map((d, i) => (
                                        <tr key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                            <td className="p-3 font-bold text-slate-800 dark:text-white">{d.employeeName}</td>
                                            <td className="p-3 text-right text-emerald-600 font-mono">{formatCurrency(d.totalProventos)}</td>
                                            <td className="p-3 text-right text-rose-600 font-mono">{formatCurrency(d.totalDescontos)}</td>
                                            <td className="p-3 text-right font-black font-mono">{formatCurrency(d.netSalary)}</td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => setViewPayslip({ ...d, competence: viewDetails.competence })}
                                                    className="px-2.5 py-1 bg-sky-50 dark:bg-sky-950/40 text-sky-600 rounded-lg font-bold text-[11px] hover:bg-sky-100"
                                                >
                                                    Ver Holerite
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
