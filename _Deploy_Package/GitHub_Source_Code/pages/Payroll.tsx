import React, { useState, useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { useData } from '../contexts/DataContext';
import { useError } from '../contexts/ErrorContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
    DollarSign, Users, FileCheck, Trash2, Printer,
    FileText, Calculator, Eye, Calendar, CheckCircle,
    Plus, Edit2, Loader2, Pencil, ArrowLeft, ChevronLeft, ChevronRight, Scissors, Save, Download, ClipboardList, FileCode,
    TrendingUp, AlertTriangle, CheckCircle2
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { PayrollRun, PayrollRunDetail, PayrollInputState, Employee, Partner } from '../types';
import { maskCNPJ, formatDateBR, parseDateSafe } from '../utils/formatters';

// --- ENGINE IMPORTADA ---
import { RUBRICS, RubricDefinition } from '../constants/rubrics';
import { calculatePayroll, SimulationResult, CONSTANTS } from '../utils/payrollEngine';
import { RubricSelector } from '../components/RubricSelector';
import { generateEsocial } from '../utils/legalGenerators';
import { TRCTTemplate } from '../components/payroll/templates/TRCTTemplate';
import { PayslipTemplate } from '../components/payroll/templates/PayslipTemplate';
import { DecimoTerceiroTemplate } from '../components/payroll/templates/DecimoTerceiroTemplate';
import { FeriasTemplate } from '../components/payroll/templates/FeriasTemplate';
import { MonthlyConfig } from '../components/payroll/cockpit/MonthlyConfig';
import { ThirteenthConfig } from '../components/payroll/cockpit/ThirteenthConfig';
import { VacationConfig } from '../components/payroll/cockpit/VacationConfig';
import { TerminationConfig } from '../components/payroll/cockpit/TerminationConfig';
import { PayrollInputSchema } from '../utils/payrollSchemas';
import { z } from 'zod';

// Local helpers removed in favor of payrollEngine.ts


// --- TRCT TEMPLATE (Termo de Rescisão - Modelo Profissional) ---
// TRCTTemplate moved to components/payroll/templates/TRCTTemplate.tsx
// Helper Calculation Function
// Helper Calculation Function
// Legacy calculateSimulation removed. using calculatePayroll from utils/payrollEngine.ts

export const Payroll: React.FC = () => {
    const { employees, partners, selectedCompany, addInvoice, payrollItems, currentUser, userRole, userPermissions } = useData();
    const { showError } = useError();
    const [viewMode, setViewMode] = useState<'list' | 'cockpit' | 'ferias' | 'simulador'>('list');

    // RBAC: Check permissions
    const canWritePayroll = useMemo(() => {
        return userRole === 'Admin' || userPermissions?.payroll === 'full';
    }, [userRole, userPermissions]);

    // Competence Navigation
    const [competenceDate, setCompetenceDate] = useState(new Date());

    const currentCompetence = useMemo(() => {
        return `${(competenceDate.getMonth() + 1).toString().padStart(2, '0')}/${competenceDate.getFullYear()}`;
    }, [competenceDate]);

    const handleNextMonth = () => {
        setCompetenceDate(new Date(competenceDate.getFullYear(), competenceDate.getMonth() + 1, 1));
    };

    const handlePrevMonth = () => {
        setCompetenceDate(new Date(competenceDate.getFullYear(), competenceDate.getMonth() - 1, 1));
    };

    // Cockpit States
    const [selectedPersonId, setSelectedPersonId] = useState<string>('');
    const [inputs, setInputs] = useState<PayrollInputState & { proLaboreOverride?: number }>({
        he50_qtde: 0, he100_qtde: 0, faltas_dias: 0, atrasos_mins: 0, comissao_valor: 0,
        bonus_valor: 0, adicional_periculosidade: false, adicional_insalubridade: 'nenhum',
        desc_vt: false, desc_plano_saude: 0, desc_adiantamento: 0, desc_outros: 0,
        proLaboreOverride: 0,
        customEvents: [],
        selectedRubrics: ['1001', '5001', '5002'] // Default to Salary/INSS/IRRF
    });
    const [allMovements, setAllMovements] = useState<Record<string, any>>({});

    // History State


    // History State (Managed by DataContext)
    // History State (Managed by DataContext)
    const { payrollRuns: history, addPayrollRun, deletePayrollRun, updatePayrollRun } = useData();
    const [viewDetails, setViewDetails] = useState<PayrollRun | null>(null);
    const [viewPayslip, setViewPayslip] = useState<PayrollRunDetail | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [editingRunId, setEditingRunId] = useState<string | null>(null);

    // Temp state for new rubric addition
    // REMOVED: newRubric state in favor of system calculation only
    // const [newRubric, setNewRubric] = useState({ code: '', description: '', value: 0, type: 'provento' as 'provento' | 'desconto' });

    // Unified People List
    const people = useMemo(() => {
        const emps = employees.filter(e => e.status === 'ativo').map(e => ({ ...e, type: 'employee' as const }));
        const parts = partners.map(p => ({ ...p, type: 'partner' as const }));
        return [...emps, ...parts].sort((a, b) => a.name.localeCompare(b.name));
    }, [employees, partners]);

    const selectedPerson = useMemo(() => people.find(p => p.id === selectedPersonId), [selectedPersonId, people]);

    // Load Inputs when Person Changes
    useEffect(() => {
        if (selectedPerson) {
            // setEditingRunId(null); // REMOVED: Prevent clearing edit mode when selecting via handleEditHistory
            const saved = allMovements[selectedPersonId];
            if (saved) {
                setInputs({ ...saved, customEvents: saved.customEvents || [] });
            } else {
                // Generate defaults if not saved
                let defaultInputs = {
                    he50_qtde: 0, he100_qtde: 0, faltas_dias: 0, atrasos_mins: 0, comissao_valor: 0, bonus_valor: 0,
                    adicional_periculosidade: false, adicional_insalubridade: 'nenhum',
                    desc_vt: false, desc_plano_saude: 0, desc_adiantamento: 0, desc_outros: 0,
                    proLaboreOverride: 0,
                    customEvents: [],
                    calculationType: 'folha_mensal',
                    rescisaoReason: 'sem_justa_causa',
                    rescisaoNotice: 'indenizado',
                    rescisaoVacationBalance: 0,
                    decimoTerceiroParcela: '1',
                    feriasDias: 30,
                    feriasAbono: false,
                    rescisaoDate: '',
                    rescisaoAfastamentoCode: 'SJ2',
                    media_variaveis_valor: 0, // NEW
                    vacationStart: '' // NEW
                };

                if (selectedPerson.type === 'employee') {
                    const emp = selectedPerson as Employee;
                    defaultInputs = { ...defaultInputs, desc_vt: emp.transportVoucher || false, desc_plano_saude: emp.healthPlan ? 150 : 0 };
                } else {
                    const part = selectedPerson as Partner;
                    defaultInputs = { ...defaultInputs, proLaboreOverride: part.proLaboreValue || CONSTANTS[2025].SALARIO_MINIMO };
                }
                setInputs({
                    ...defaultInputs,
                    adicional_insalubridade: 'nenhum' as const
                } as any);
            }
        }
    }, [selectedPersonId, allMovements]);

    const handleInputChange = (field: string, value: any) => {
        setInputs(prev => ({ ...prev, [field]: value }));
        setSimulation(null); // Clear preview to force valid calculation
    };

    // REMOVED: handleAddRubric in favor of system calculation only
    // const handleAddRubric = () => { ... }

    // --- PAYSLIP TEMPLATE ---
    // --- PAYSLIP TEMPLATE ---
    // --- PAYSLIP TEMPLATE (HOLERITE PADRÃO) ---
    // --- PAYSLIP TEMPLATE (HALF PAGE FOR 2 COPIES ON A4) ---
    // PayslipTemplate moved to components/payroll/templates/PayslipTemplate.tsx

    // --- 13th SALARY TEMPLATE ---
    // DecimoTerceiroTemplate moved to components/payroll/templates/DecimoTerceiroTemplate.tsx

    // --- VACATION TEMPLATE ---
    // FeriasTemplate moved to components/payroll/templates/FeriasTemplate.tsx

    // REMOVED: handleRemoveRubric in favor of system calculation only
    // const handleRemoveRubric = (index: number) => { ... }

    const handleSaveCalculation = async () => {
        if (!canWritePayroll) return; // RBAC Block
        if (!selectedPersonId || !selectedPerson) return;
        setIsProcessing(true);

        // Save to local state (legacy behavior)
        setAllMovements(prev => ({ ...prev, [selectedPersonId]: inputs }));

        // --- Create History Entry (Simulacao) ---
        const sim = calculatePayroll(selectedPerson, inputs, payrollItems);

        const detail: PayrollRunDetail = {
            employeeId: sim.person.id,
            employeeName: sim.person.name,
            personType: (sim.person.type === 'employee' || sim.person.type === 'partner') ? sim.person.type : 'employee',
            role: sim.person.role,
            competence: currentCompetence,
            baseSalary: sim.events.find((e: any) => e.description === 'Salário Base' || e.description === 'Pró-Labore')?.value || 0,
            events: sim.events,
            totalProventos: sim.totalProventos,
            totalDescontos: sim.totalDescontos,
            netSalary: sim.netSalary,
            baseINSS: sim.baseINSS,
            baseFGTS: sim.fgtsVal / 0.08,
            baseIRRF: sim.baseIRRF,
            fgtsValue: sim.fgtsVal,
            inssValue: sim.events.find((e: any) => e.description.includes('INSS'))?.value || 0,
            irrfValue: sim.events.find((e: any) => e.description.includes('IRRF'))?.value || 0,
            inputsSnapshot: inputs // Save snapshot for restoring
        };

        const run: PayrollRun = {
            id: editingRunId || Math.random().toString(36).substr(2, 9),
            competence: currentCompetence,
            calculationType: inputs.calculationType || 'folha_mensal',
            status: 'fechado',
            totalGross: detail.totalProventos,
            totalNet: detail.netSalary,
            totalTaxes: detail.inssValue + detail.irrfValue,
            employeeCount: 1, // Individual calculation
            details: [detail],
            closedAt: new Date().toISOString()
        };

        if (editingRunId) {
            updatePayrollRun(run);
            setEditingRunId(null);
        } else {
            addPayrollRun(run);
        }

        // --- INTEGRATION REMOVED: MOVED TO CLOSE PAYROLL TO AVOID PREMATURE DEBT ---

        setIsProcessing(false);

        const btn = document.getElementById('save-btn');
        if (btn) {
            const original = btn.innerText;
            btn.innerText = "Salvo & Integrado!";
            setTimeout(() => btn.innerText = original, 2000);
        }
    };

    const handleEditHistory = (run: PayrollRun) => {
        if (!run.details.length) return;
        const detail = run.details[0];

        // 1. Update allMovements to ensure correct data loading
        if (detail.inputsSnapshot) {
            setAllMovements(prev => ({
                ...prev,
                [detail.employeeId]: {
                    ...detail.inputsSnapshot,
                    // Ensure specific fields are mapped if needed
                    proLaboreOverride: (detail.inputsSnapshot as any).proLaboreOverride
                }
            }));
        }

        // 2. Switch Context
        setSelectedPersonId(detail.employeeId);
        setEditingRunId(run.id);

        // 3. Switch to Cockpit
        setViewMode('cockpit');
    };

    const handleDeleteHistory = (id: string) => {
        if (confirm('Tem certeza que deseja excluir este histórico?')) {
            deletePayrollRun(id);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // Calculate Simulation (Manual Trigger)
    const [simulation, setSimulation] = useState<any>(null);

    const handleSimulate = () => {
        if (!selectedPerson) return;
        try {
            // Validation (Recommendation 2)
            const validInputs = PayrollInputSchema.parse(inputs);
            const result = calculatePayroll(selectedPerson, validInputs, payrollItems);
            setSimulation(result);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                showError({
                    code: 'VAL_INPUT_001',
                    title: 'Dados Inválidos',
                    description: `Erro de validação nos dados de entrada: ${error.issues.map((e: any) => e.message).join(', ')}`,
                    origin: 'Simulador de Folha',
                    suggestion: 'Verifique os campos preenchidos e tente novamente. Certifique-se que valores numéricos estão corretos.'
                });
            } else {
                showError({
                    code: 'ERR_SIM_001',
                    title: 'Erro na Simulação',
                    description: error.message || 'Falha ao calcular a folha.',
                    origin: 'Motor de Cálculo',
                    suggestion: 'Verifique as configurações das rubricas e os dados do colaborador.'
                });
            }
            setSimulation(null);
        }
    };

    // Reset simulation when person changes
    useEffect(() => {
        setSimulation(null);
    }, [selectedPersonId]);

    // Calculate All for Summary Table
    const summaryList = useMemo(() => {
        return people.map(p => {
            // Retrieve saved inputs or generate partial defaults just for display?
            // Ideally we should use the same default logic.
            // For simplicity, we check allMovements, if not found, use minimal default or "Pending" status content?
            // To properly list calculated values, we need inputs.
            // We will assume "inputs" are required to be "saved" to be robust, but for "preview" we can apply defaults again.
            // Duplicating default logic here is safe for "viewing".
            let pInputs = allMovements[p.id];
            if (!pInputs) {
                if (p.type === 'employee') {
                    const emp = p as Employee;
                    pInputs = {
                        he50_qtde: 0, he100_qtde: 0, faltas_dias: 0, atrasos_mins: 0, comissao_valor: 0, bonus_valor: 0,
                        adicional_periculosidade: false, adicional_insalubridade: 'nenhum',
                        desc_vt: emp.transportVoucher || false, desc_plano_saude: emp.healthPlan ? 150 : 0,
                        desc_adiantamento: 0, desc_outros: 0, customEvents: [],
                        selectedRubrics: ['1001', '5001', '5002']
                    };
                } else {
                    const part = p as Partner;
                    pInputs = {
                        he50_qtde: 0, he100_qtde: 0, faltas_dias: 0, atrasos_mins: 0, comissao_valor: 0, bonus_valor: 0,
                        adicional_periculosidade: false, adicional_insalubridade: 'nenhum',
                        desc_vt: false, desc_plano_saude: 0, desc_adiantamento: 0, desc_outros: 0,
                        proLaboreOverride: part.proLaboreValue || 1412.00, customEvents: [],
                        selectedRubrics: ['1002', '5001']
                    };
                }
            }
            try {
                return calculatePayroll(p, pInputs as any, payrollItems);
            } catch (e) {
                return null; // Skip invalid
            }
        }).filter((item): item is NonNullable<typeof item> => item !== null); // Filter failed calcs
    }, [people, allMovements, payrollItems]);


    const generatePayrollSummaryPDF = async (run: PayrollRun) => {
        setIsProcessing(true);
        try {
            const doc = new jsPDF();

            // Title
            doc.setFontSize(16);
            doc.text(`Resumo da Folha - ${run.competence}`, 14, 20);
            doc.setFontSize(10);
            doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 26);

            // Prepare Data for Table
            const tableData = run.details.map(detail => [
                detail.employeeName,
                detail.personType === 'partner' ? 'Sócio' : 'CLT',
                formatCurrency(detail.totalProventos),
                formatCurrency(detail.totalDescontos),
                formatCurrency(detail.netSalary)
            ]);

            // Add Total Row
            const totalGross = run.details.reduce((acc, curr) => acc + curr.totalProventos, 0);
            const totalDesc = run.details.reduce((acc, curr) => acc + curr.totalDescontos, 0);
            const totalNet = run.details.reduce((acc, curr) => acc + curr.netSalary, 0);

            tableData.push([
                { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
                { content: formatCurrency(totalGross), styles: { fontStyle: 'bold' } },
                { content: formatCurrency(totalDesc), styles: { fontStyle: 'bold' } },
                { content: formatCurrency(totalNet), styles: { fontStyle: 'bold' } }
            ] as any);

            // Generate Table
            autoTable(doc, {
                startY: 35,
                head: [['Nome', 'Tipo', 'Proventos', 'Descontos', 'Líquido']],
                body: tableData,
                styles: { fontSize: 9 },
                headStyles: { fillColor: [41, 128, 185] }, // Blue header
                columnStyles: {
                    0: { cellWidth: 'auto' }, // Name
                    1: { cellWidth: 20 }, // Type
                    2: { cellWidth: 30, halign: 'right' },
                    3: { cellWidth: 30, halign: 'right' },
                    4: { cellWidth: 30, halign: 'right' }
                }
            });

            doc.save(`Resumo_Folha_${run.competence.replace('/', '-')}.pdf`);

        } catch (e: any) {
            console.error(e);
            showError({
                code: 'ERR_PDF_001',
                title: 'Erro ao Gerar PDF',
                description: e.message || 'Falha na geração do arquivo PDF de resumo.',
                origin: 'Gerador de Relatórios',
                suggestion: 'Tente novamente. Se o erro persistir, verifique se há dados corrompidos no histórico.'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const generateSinglePayslipPDF = async (detail: PayrollRunDetail, action: 'print' | 'download') => {
        setIsProcessing(true);
        try {
            // Reconstruct data structure for template
            const person = people.find(p => p.id === detail.employeeId) || {
                id: detail.employeeId,
                name: detail.employeeName,
                type: detail.personType,
                role: detail.role,
                pis: '',
                admissionDate: '',
                cbo: ''
            };

            const templateData = {
                person: {
                    ...person,
                    // Ensure we have properties even if person not found in current list (maybe deleted?)
                    name: detail.employeeName,
                    role: detail.role,
                    type: detail.personType
                },
                events: detail.events,
                totalProventos: detail.totalProventos,
                totalDescontos: detail.totalDescontos,
                netSalary: detail.netSalary,
                baseINSS: detail.baseINSS,
                baseIRRF: detail.baseIRRF,
                fgtsVal: detail.fgtsValue,
                // Pass baseSalary if needed by template, though mostly calc'd from events or override
                proLaboreOverride: detail.personType === 'partner' ? detail.baseSalary : 0,
            };

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const margin = 5;
            const printableWidth = pdfWidth - (margin * 2);

            const addPayslipPage = async () => {
                const tempDiv = document.createElement('div');
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                tempDiv.style.top = '0';
                tempDiv.style.width = '210mm';
                tempDiv.style.height = '297mm';
                tempDiv.style.background = 'white';
                document.body.appendChild(tempDiv);

                const root = createRoot(tempDiv);
                root.render(
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10mm' }}>
                        <PayslipTemplate
                            data={templateData}
                            company={selectedCompany}
                            label="1ª VIA - EMPREGADOR"
                            id="temp-payslip-1"
                        />
                        <div style={{ borderBottom: '1px dashed #ccc', margin: '0 5mm' }}></div>
                        <PayslipTemplate
                            data={templateData}
                            company={selectedCompany}
                            label="2ª VIA - COLABORADOR"
                            id="temp-payslip-2"
                        />
                    </div>
                );

                await new Promise(resolve => setTimeout(resolve, 500));

                const canvas = await html2canvas(tempDiv, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    windowWidth: 1600,
                } as any);

                const imgData = canvas.toDataURL('image/png');
                const imgHeight = (canvas.height * printableWidth) / canvas.width;

                pdf.addImage(imgData, 'PNG', margin, 0, printableWidth, imgHeight);

                root.unmount();
                document.body.removeChild(tempDiv);
            };

            await addPayslipPage();

            if (action === 'print') {
                pdf.autoPrint();
                window.open(pdf.output('bloburl'), '_blank');
            } else {
                pdf.save(`Holerite_${detail.employeeName.replace(/\s+/g, '_')}_${detail.competence || 'Folha'}.pdf`);
            }

        } catch (e: any) {
            console.error(e);
            showError({
                code: 'ERR_PDF_002',
                title: 'Erro ao Gerar Holerite',
                description: e.message || 'Falha na geração do arquivo PDF do holerite.',
                origin: 'Gerador de Relatórios',
                suggestion: 'Verifique se o navegador não está bloqueando popups (para impressão) ou tente novamente.'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClosePayroll = async () => {
        if (!confirm(`Fechar folha de ${currentCompetence} para ${people.length} pessoas?\nIsso irá gerar os lançamentos no financeiro.`)) return;
        setIsProcessing(true);

        try {
            const details: PayrollRunDetail[] = summaryList.map(item => ({
                employeeId: item.person.id,
                employeeName: item.person.name,
                personType: (item.person.type === 'employee' || item.person.type === 'partner') ? item.person.type : 'employee',
                role: item.person.role,
                competence: currentCompetence,
                baseSalary: item.events.find(e => e.description === 'Salário Base' || e.description === 'Pró-Labore')?.value || 0,
                events: item.events,
                totalProventos: item.totalProventos,
                totalDescontos: item.totalDescontos,
                netSalary: item.netSalary,
                baseINSS: item.baseINSS,
                baseFGTS: item.fgtsVal / 0.08,
                baseIRRF: item.baseIRRF,
                fgtsValue: item.fgtsVal,
                inssValue: item.events.find(e => e.description.includes('INSS'))?.value || 0,
                irrfValue: item.events.find(e => e.description.includes('IRRF'))?.value || 0
            }));

            const run: PayrollRun = {
                id: Math.random().toString(36).substr(2, 9),
                competence: currentCompetence,
                calculationType: inputs.calculationType || 'folha_mensal', // Preserve type if possible or assume monthly
                status: 'fechado',
                totalGross: details.reduce((acc, curr) => acc + curr.totalProventos, 0),
                totalNet: details.reduce((acc, curr) => acc + curr.netSalary, 0),
                totalTaxes: details.reduce((acc, curr) => acc + curr.inssValue + curr.irrfValue, 0),
                employeeCount: details.length,
                details,
                closedAt: new Date().toISOString()
            };

            // 1. Save Run
            addPayrollRun(run);

            // 2. Integration: Financial Records
            const dueDate = new Date();
            dueDate.setDate(5); // Payment usually on 5th working day. Just using 5th of current month (since competence is probably previous? logic needed)
            // If competence is "01/2026", usually paying in "02/2026".
            // Let's assume competence is current month being calculated, output payment date next month 5th?
            // Or current date + 5 days default. Let's stick to +5 days for safety.
            const payDate = new Date();
            payDate.setDate(payDate.getDate() + 5);
            const payDateStr = payDate.toISOString().split('T')[0];

            const taxDate = new Date();
            taxDate.setDate(20);
            const taxDateStr = taxDate.toISOString().split('T')[0];

            for (const detail of details) {
                // Salário Líquido
                if (detail.netSalary > 0) {
                    await addInvoice({
                        id: '',
                        number: `FOLHA-${run.id.substr(0, 4)}-${detail.employeeId.substr(0, 3)}`,
                        entityName: detail.employeeName,
                        entityId: detail.employeeId,
                        cnpj: '00000000000',
                        date: payDateStr,
                        value: detail.netSalary,
                        type: 'payroll',
                        status: 'pendente',
                        category: 'Salários',
                        details: `Salário Líquido - ${currentCompetence} (${detail.personType === 'partner' ? 'Pró-Labore' : 'CLT'})`
                    } as any);
                }

                // Impostos
                if (detail.inssValue > 0) {
                    await addInvoice({
                        id: '',
                        number: `INSS-${run.id.substr(0, 4)}-${detail.employeeId.substr(0, 3)}`,
                        entityName: 'Receita Federal (INSS)',
                        entityId: 'gov-inss',
                        cnpj: '00000000000',
                        date: taxDateStr,
                        value: detail.inssValue,
                        type: 'payroll',
                        status: 'pendente',
                        category: 'Impostos - Trabalhista',
                        details: `INSS - ${detail.employeeName} - ${currentCompetence}`
                    } as any);
                }

                if (detail.fgtsValue > 0) {
                    await addInvoice({
                        id: '',
                        number: `FGTS-${run.id.substr(0, 4)}-${detail.employeeId.substr(0, 3)}`,
                        entityName: 'Caixa Econômica (FGTS)',
                        entityId: 'gov-fgts',
                        cnpj: '00000000000',
                        date: taxDateStr,
                        value: detail.fgtsValue,
                        type: 'payroll',
                        status: 'pendente',
                        category: 'Impostos - Trabalhista',
                        details: `FGTS - ${detail.employeeName} - ${currentCompetence}`
                    } as any);
                }

                if (detail.irrfValue > 0) {
                    await addInvoice({
                        id: '',
                        number: `IRRF-${run.id.substr(0, 4)}-${detail.employeeId.substr(0, 3)}`,
                        entityName: 'Receita Federal (IRRF)',
                        entityId: 'gov-irrf',
                        cnpj: '00000000000',
                        date: taxDateStr,
                        value: detail.irrfValue,
                        type: 'payroll',
                        status: 'pendente',
                        category: 'Impostos - Trabalhista',
                        details: `IRRF - ${detail.employeeName} - ${currentCompetence}`
                    } as any);
                }
            }

            setViewMode('list');
            setAllMovements({});

        } catch (error: any) {
            console.error('Error closing payroll:', error);
            showError({
                code: 'ERR_CLOSE_001',
                title: 'Erro ao Fechar Folha',
                description: error.message || 'Falha ao processar o fechamento e integração financeira.',
                origin: 'Módulo de Fechamento',
                suggestion: 'Verifique se a conexão com o banco de dados está ativa. Nenhum dado foi perdido, tente fechar novamente.'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    // --- UI HELPERS ---
    const StatusBadge = ({ type }: { type: 'employee' | 'partner' }) => (
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${type === 'employee' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {type === 'employee' ? 'CLT' : 'Sócio'}
        </span>
    );

    // --- RENDER ---
    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] bg-slate-50 -m-6 p-6 overflow-hidden">
            {/* TOP HEADER BAR */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 shrink-0">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)] uppercase">DP. Pessoal</h1>
                    <p className="text-[var(--text-secondary)]">Processamento de salários, impostos e obrigações.</p>
                </div>

                <div className="flex bg-[var(--bg-secondary)] p-1.5 rounded-2xl border border-[var(--border-color)]">
                    {[
                        { id: 'list', label: 'Histórico' },
                        { id: 'cockpit', label: 'Cálculo' },
                        { id: 'ferias', label: 'Férias' },
                        { id: 'simulador', label: 'Simulador' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setViewMode(tab.id as any)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === tab.id ? 'bg-white text-[var(--accent-primary)] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            <div className="flex justify-between items-center mb-6 shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="bg-[var(--bg-secondary)] p-2.5 rounded-xl border border-[var(--border-color)]">
                        <Calendar className="w-5 h-5 text-[var(--accent-primary)]" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-widest leading-none mb-1">Competência Atual</p>
                        <p className="text-lg font-black text-[var(--text-primary)] leading-none">{currentCompetence}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
                    {/* Botão de Resumo da Folha (Prévia) */}
                    <Button variant="ghost" onClick={() => {
                        // Generate summary from current state (preview)
                        const previewRun: PayrollRun = {
                            id: 'preview',
                            competence: currentCompetence,
                            status: 'simulacao',
                            totalGross: summaryList.reduce((acc, curr) => acc + curr.totalProventos, 0),
                            totalNet: summaryList.reduce((acc, curr) => acc + curr.netSalary, 0),
                            totalTaxes: summaryList.reduce((acc, curr) => acc + (curr.events.find(e => e.description.includes('INSS'))?.value || 0) + (curr.events.find(e => e.description.includes('IRRF'))?.value || 0), 0),
                            employeeCount: summaryList.length,
                            details: summaryList.map(item => ({
                                employeeId: item.person.id,
                                employeeName: item.person.name,
                                personType: (item.person.type === 'employee' || item.person.type === 'partner') ? item.person.type : 'employee',
                                role: item.person.role,
                                competence: currentCompetence,
                                baseSalary: item.events.find(e => e.description === 'Salário Base' || e.description === 'Pró-Labore')?.value || 0,
                                events: item.events,
                                totalProventos: item.totalProventos,
                                totalDescontos: item.totalDescontos,
                                netSalary: item.netSalary,
                                baseINSS: item.baseINSS,
                                baseFGTS: item.fgtsVal / 0.08,
                                baseIRRF: item.baseIRRF,
                                fgtsValue: item.fgtsVal,
                                inssValue: item.events.find(e => e.description.includes('INSS'))?.value || 0,
                                irrfValue: item.events.find(e => e.description.includes('IRRF'))?.value || 0
                            })),
                            closedAt: new Date().toISOString()
                        };
                        generatePayrollSummaryPDF(previewRun);
                    }} icon={ClipboardList} className="text-gray-600 hover:text-orange-600 hover:bg-orange-50 mr-2">
                        Resumo Folha
                    </Button>
                    <div className="h-6 w-px bg-gray-200 mx-1"></div>

                    {viewMode === 'list' ? (
                        <>
                            <div className="flex items-center gap-2 px-2 border-r border-gray-100 mr-2">
                                <button onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"><ChevronLeft size={16} /></button>
                                <span className="text-sm font-bold text-gray-900 min-w-[80px] text-center">{currentCompetence}</span>
                                <button onClick={handleNextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"><ChevronRight size={16} /></button>
                            </div>
                            <Button onClick={() => setViewMode('cockpit')} icon={Calculator} className="shadow-orange-500/20 shadow-lg">
                                Abrir Cockpit
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={() => setViewMode('list')} icon={ArrowLeft}>
                                Voltar
                            </Button>
                            <div className="h-6 w-px bg-gray-200 mx-1"></div>
                            <Button variant="primary" onClick={handleClosePayroll} icon={CheckCircle} disabled={isProcessing} className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 shadow-lg border-transparent text-white">
                                {isProcessing ? 'Processando...' : 'Fechar Folha'}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex overflow-hidden gap-6">

                {/* VIEW MODE: LIST (HISTORY) */}
                {viewMode === 'list' && (
                    <div className="w-full flex flex-col overflow-y-auto pr-2 pb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* KPI CARDS */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-default">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Funcionários</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{people.filter(p => p.type === 'employee').length}</p>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-lg group-hover:scale-110 transition-transform">
                                    <Users className="w-5 h-5 text-blue-600" />
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-default">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Sócios</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{people.filter(p => p.type === 'partner').length}</p>
                                </div>
                                <div className="p-3 bg-emerald-50 rounded-lg group-hover:scale-110 transition-transform">
                                    <Users className="w-5 h-5 text-emerald-600" />
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-default">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Folhas Fechadas</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{history.length}</p>
                                </div>
                                <div className="p-3 bg-indigo-50 rounded-lg group-hover:scale-110 transition-transform">
                                    <FileCheck className="w-5 h-5 text-indigo-600" />
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-5 rounded-xl text-white shadow-lg shadow-orange-500/20 flex items-center justify-between relative overflow-hidden">
                                <div className="relative z-10">
                                    <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">Status Atual</p>
                                    <p className="text-sm font-bold mt-1">Competência Aberta</p>
                                </div>
                                <Calendar className="w-8 h-8 text-white/20 absolute right-4 bottom-4" />
                            </div>
                        </div>

                        {/* HISTORY TABLE */}
                        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-orange-500 rounded-full inline-block"></span>
                                    Histórico de Processamento
                                </h3>
                                <div className="flex gap-2">
                                    <input type="text" placeholder="Buscar competência..." className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-orange-100 focus:border-orange-400 outline-none w-48" />
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase font-semibold">
                                            <th className="px-6 py-4">Competência</th>
                                            <th className="px-6 py-4">Tipo</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Colaboradores</th>
                                            <th className="px-6 py-4">Processado em</th>
                                            <th className="px-6 py-4 text-right">Valor Líquido Total</th>
                                            <th className="px-6 py-4 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {history.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="p-4 bg-gray-50 rounded-full"><FileText size={24} className="text-gray-300" /></div>
                                                        <p>Nenhuma folha fechada encontrada.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            history.map((run) => (
                                                <tr key={run.id} onClick={() => setViewDetails(run)} className="hover:bg-blue-50/30 transition-colors cursor-pointer group">
                                                    <td className="px-6 py-4 font-bold text-gray-900">{run.competence}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 uppercase">
                                                            {run.calculationType === 'decimo_terceiro' ? '13º Salário' :
                                                                run.calculationType === 'ferias' ? 'Férias' :
                                                                    run.calculationType === 'rescisao' ? 'Rescisão' : 'Mensal'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {run.status === 'fechado' ? (
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${run.employeeCount === 1 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                                                {run.employeeCount === 1 ? 'Individual' : 'Fechado'}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 uppercase tracking-wide">Simulação</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600">
                                                        {run.employeeCount === 1
                                                            ? run.details[0]?.employeeName
                                                            : `${run.employeeCount} pessoas`
                                                        }
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500 text-xs text-center border-b border-gray-100/50">
                                                        <span className="font-bold">{formatDateBR(run.closedAt)}</span>
                                                        <span className="text-[10px] ml-1 opacity-60 font-mono">
                                                            {run.closedAt && parseDateSafe(run.closedAt).toLocaleTimeString('pt-BR')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono font-medium text-gray-900">
                                                        {formatCurrency(run.totalNet)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); generatePayrollSummaryPDF(run); }}
                                                                className="p-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm active:scale-95"
                                                                title="Baixar Resumo (PDF)"
                                                            >
                                                                <ClipboardList size={16} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleEditHistory(run); }}
                                                                className="p-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm active:scale-95"
                                                                title="Editar / Restaurar"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (run.employeeCount === 1 && run.details[0]) {
                                                                        setViewPayslip({ ...run.details[0], competence: run.details[0].competence || run.competence });
                                                                    } else {
                                                                        setViewDetails(run);
                                                                    }
                                                                }}
                                                                className="p-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-95"
                                                                title="Ver Holerite"
                                                            >
                                                                <FileText size={16} />
                                                            </button>
                                                            <div className="w-px h-6 bg-gray-200 mx-1"></div>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteHistory(run.id); }}
                                                                className="p-2 bg-white border border-gray-200 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm active:scale-95 group-hover:border-red-100"
                                                                title="Excluir Definitivamente"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW MODE: COCKPIT (CALCULATION) */}
                {viewMode === 'cockpit' && (
                    <div className="flex w-full h-full gap-6 animate-in fade-in zoom-in-95 duration-300">
                        {/* SIDEBAR: PEOPLE LIST */}
                        <div className="w-[300px] flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden shrink-0">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Buscar colaborador..."
                                        className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                    />
                                    <Users className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                {people.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => { setSelectedPersonId(p.id); setEditingRunId(null); }}
                                        className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${selectedPersonId === p.id ? 'bg-orange-50 border-orange-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-gray-50'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-transform group-hover:scale-105 ${p.type === 'employee' ? 'bg-white text-blue-600 border border-blue-100' : 'bg-white text-emerald-600 border border-emerald-100'}`}>
                                            {p.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-semibold text-sm truncate ${selectedPersonId === p.id ? 'text-gray-900' : 'text-gray-700'}`}>{p.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <StatusBadge type={p.type} />
                                                <span className="text-[10px] text-gray-400 truncate flex-1">{p.role}</span>
                                            </div>
                                        </div>
                                        {selectedPersonId === p.id && <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>}
                                    </div>
                                ))}
                            </div>
                            <div className="p-3 bg-gray-50 border-t border-gray-100 text-xs text-center flex justify-between items-center text-gray-500 px-4">
                                <span>Total: <strong>{people.length}</strong></span>
                                <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wide"><CheckCircle size={10} className="text-green-500" /> Todos ativos</span>
                            </div>
                        </div>

                        {/* MIDDLE: WORKSPACE (Inputs & Preview) */}
                        <div className="flex-1 flex gap-6 overflow-hidden">
                            {/* CENTER: INPUTS */}
                            <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar pr-2 pb-10">
                                {selectedPerson ? (
                                    <div className="space-y-6">
                                        {/* Header Card */}
                                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10"><Calculator size={120} /></div>
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h2 className="text-xl font-bold text-gray-800">{selectedPerson.name}</h2>
                                                        <p className="text-sm text-gray-500 mb-2">{selectedPerson.role} &bull; {selectedPerson.type === 'employee' ? 'CLT' : 'Sócio'}</p>
                                                    </div>

                                                    {/* Calculation Type Selector */}
                                                    {/* Calculation Type Tabs - Prominent UI */}
                                                    <div className="bg-gray-100/50 p-1 rounded-lg border border-gray-200 flex gap-1">
                                                        {[
                                                            { id: 'folha_mensal', label: 'Folha Mensal', icon: Calculator },
                                                            { id: 'decimo_terceiro', label: '13º Salário', icon: DollarSign },
                                                            { id: 'ferias', label: 'Férias', icon: Calendar },
                                                            { id: 'rescisao', label: 'Rescisão', icon: Scissors }
                                                        ].map(type => (
                                                            <button
                                                                key={type.id}
                                                                onClick={() => handleInputChange('calculationType', type.id)}
                                                                className={`
                                                                    flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-all
                                                                    ${(inputs.calculationType || 'folha_mensal') === type.id
                                                                        ? 'bg-white text-orange-600 shadow-sm border border-gray-200'
                                                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                                                    }
                                                                `}
                                                            >
                                                                <type.icon size={14} />
                                                                <span className="hidden xl:inline">{type.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <RubricSelector
                                                    calculationType={inputs.calculationType || 'folha_mensal'}
                                                    selectedRubrics={inputs.selectedRubrics || []}
                                                    onChange={(codes) => setInputs(prev => ({ ...prev, selectedRubrics: codes }))}
                                                    customRubrics={payrollItems}
                                                />

                                                <div className="flex items-center gap-4 mt-4">
                                                    <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-100">
                                                        <span className="text-xs text-gray-500 uppercase font-bold block">Salário Base / Pró-Labore</span>
                                                        <span className="text-lg font-mono font-bold text-gray-900">
                                                            {formatCurrency(
                                                                selectedPerson.type === 'employee'
                                                                    ? (selectedPerson as Employee).salary
                                                                    : (selectedPerson as Partner).proLaboreValue || inputs.proLaboreOverride || 0
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="h-8 w-px bg-gray-200"></div>
                                                    <div className="flex gap-2">
                                                        <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded border border-green-100 font-medium self-center">Ativo</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Input Groups */}
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                                            {/* SPECIFIC INPUTS FOR CALCULATION TYPES */}
                                            {/* --- 1. 13º SALÁRIO --- */}
                                            {inputs.calculationType === 'decimo_terceiro' && (
                                                <ThirteenthConfig
                                                    inputs={inputs}
                                                    handleInputChange={handleInputChange}
                                                    onSimulate={handleSimulate}
                                                    onSave={handleSaveCalculation}
                                                    canWrite={canWritePayroll}
                                                />
                                            )}

                                            {/* --- 2. FÉRIAS --- */}
                                            {inputs.calculationType === 'ferias' && (
                                                <VacationConfig
                                                    inputs={inputs}
                                                    handleInputChange={handleInputChange}
                                                    onSimulate={handleSimulate}
                                                    onSave={handleSaveCalculation}
                                                    canWrite={canWritePayroll}
                                                />
                                            )}

                                            {/* --- 3. RESCISÃO --- */}
                                            {inputs.calculationType === 'rescisao' && (
                                                <TerminationConfig
                                                    inputs={inputs}
                                                    handleInputChange={handleInputChange}
                                                    onSimulate={handleSimulate}
                                                    onSave={handleSaveCalculation}
                                                    canWrite={canWritePayroll}
                                                />
                                            )}

                                            {/* --- 4. FOLHA MENSAL (DEFAULT) --- */}
                                            {(inputs.calculationType === 'folha_mensal' || !inputs.calculationType) && (
                                                <MonthlyConfig
                                                    inputs={inputs}
                                                    selectedPerson={selectedPerson}
                                                    handleInputChange={handleInputChange}
                                                    onSimulate={handleSimulate}
                                                    onSave={handleSaveCalculation}
                                                    canWrite={canWritePayroll}
                                                />
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 h-full min-h-[400px]">
                                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                            <Users size={48} className="opacity-50" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-400">Selecione um colaborador para iniciar</h3>
                                        <p className="text-sm max-w-xs text-center mt-2 opacity-70">Utilize a barra lateral para escolher um funcionário ou sócio e gerenciar seus lançamentos.</p>
                                    </div>
                                )}
                            </div>

                            {/* RIGHT: LIVE PREVIEW (STICKY) */}
                            <div className="w-[680px] shrink-0 border-l border-gray-200 bg-white shadow-xl shadow-gray-200 z-20 flex flex-col h-full rounded-tl-2xl overflow-hidden print:hidden relative">
                                <div className="p-4 bg-gray-900 text-white flex justify-between items-center shadow-md shrink-0">
                                    <h3 className="font-bold text-sm tracking-wide flex items-center gap-2">
                                        <FileText size={16} className="text-orange-400" /> Pré-visualização do Holerite
                                    </h3>
                                    {simulation && <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-mono">{formatCurrency(simulation.netSalary)}</span>}
                                </div>
                                <div className="flex-1 overflow-y-auto bg-gray-100 p-6 flex justify-center custom-scrollbar">
                                    {simulation ? (
                                        <div className="scale-[0.80] origin-top animate-in fade-in slide-in-from-right-4 duration-500 shadow-2xl">
                                            <div id="payslip-source" className="bg-white">
                                                {inputs.calculationType === 'rescisao' ? (
                                                    <TRCTTemplate data={simulation} company={selectedCompany} inputs={inputs} />
                                                ) : inputs.calculationType === 'decimo_terceiro' ? (
                                                    <>
                                                        <DecimoTerceiroTemplate data={simulation} company={selectedCompany} label="1ª VIA - EMPREGADOR" inputs={inputs} />
                                                        <div className="h-0.5 w-full bg-dashed border-t border-gray-300 my-4 relative"></div>
                                                        <DecimoTerceiroTemplate data={simulation} company={selectedCompany} label="2ª VIA - COLABORADOR" inputs={inputs} />
                                                    </>
                                                ) : inputs.calculationType === 'ferias' ? (
                                                    <>
                                                        <FeriasTemplate data={simulation} company={selectedCompany} label="1ª VIA - EMPREGADOR" inputs={inputs} />
                                                        <div className="h-0.5 w-full bg-dashed border-t border-gray-300 my-4 relative"></div>
                                                        <FeriasTemplate data={simulation} company={selectedCompany} label="2ª VIA - COLABORADOR" inputs={inputs} />
                                                    </>
                                                ) : (
                                                    <>
                                                        <PayslipTemplate data={simulation} company={selectedCompany} label="1ª VIA - EMPREGADOR" inputs={inputs} />
                                                        <div className="h-0.5 w-full bg-dashed border-t border-gray-300 my-4 relative"></div>
                                                        <PayslipTemplate data={simulation} company={selectedCompany} label="2ª VIA - COLABORADOR" inputs={inputs} />
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs gap-3">
                                            <Calculator size={48} className="text-gray-200" />
                                            <p className="text-center max-w-[200px]">Clique em "Calcular Prévia" para visualizar o holerite.</p>
                                        </div>
                                    )}
                                </div>
                                {simulation && (
                                    <div className="p-4 bg-white border-t border-gray-200 shrink-0 flex gap-2 justify-center shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                                        <Button variant="outline" icon={Printer} onClick={handlePrint}>Imprimir</Button>
                                        <Button variant="primary" icon={Download} onClick={async () => {
                                            if (!simulation) return;

                                            const pdf = new jsPDF('p', 'mm', 'a4');
                                            const pdfWidth = pdf.internal.pageSize.getWidth();
                                            const margin = 5;
                                            const printableWidth = pdfWidth - (margin * 2);

                                            const addPayslipPage = async () => {
                                                const tempDiv = document.createElement('div');
                                                tempDiv.style.position = 'absolute';
                                                tempDiv.style.left = '-9999px';
                                                tempDiv.style.top = '0';
                                                tempDiv.style.width = '210mm';
                                                tempDiv.style.height = '297mm';
                                                tempDiv.style.background = 'white';
                                                document.body.appendChild(tempDiv);

                                                const root = createRoot(tempDiv);
                                                root.render(
                                                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10mm' }}>
                                                        {inputs.calculationType === 'rescisao' ? (
                                                            <TRCTTemplate data={simulation} company={selectedCompany} inputs={inputs} />
                                                        ) : inputs.calculationType === 'decimo_terceiro' ? (
                                                            <>
                                                                <DecimoTerceiroTemplate
                                                                    data={simulation}
                                                                    company={selectedCompany}
                                                                    label="1ª VIA - EMPREGADOR"
                                                                    id="temp-payslip-1"
                                                                    inputs={inputs}
                                                                />
                                                                <div style={{ borderBottom: '1px dashed #ccc', margin: '0 5mm' }}></div>
                                                                <DecimoTerceiroTemplate
                                                                    data={simulation}
                                                                    company={selectedCompany}
                                                                    label="2ª VIA - COLABORADOR"
                                                                    id="temp-payslip-2"
                                                                    inputs={inputs}
                                                                />
                                                            </>
                                                        ) : inputs.calculationType === 'ferias' ? (
                                                            <>
                                                                <FeriasTemplate
                                                                    data={simulation}
                                                                    company={selectedCompany}
                                                                    label="1ª VIA - EMPREGADOR"
                                                                    id="temp-payslip-1"
                                                                    inputs={inputs}
                                                                />
                                                                <div style={{ borderBottom: '1px dashed #ccc', margin: '0 5mm' }}></div>
                                                                <FeriasTemplate
                                                                    data={simulation}
                                                                    company={selectedCompany}
                                                                    label="2ª VIA - COLABORADOR"
                                                                    id="temp-payslip-2"
                                                                    inputs={inputs}
                                                                />
                                                            </>
                                                        ) : (
                                                            <>
                                                                <PayslipTemplate
                                                                    data={simulation}
                                                                    company={selectedCompany}
                                                                    label="1ª VIA - EMPREGADOR"
                                                                    id="temp-payslip-1"
                                                                    inputs={inputs}
                                                                />
                                                                <div style={{ borderBottom: '1px dashed #ccc', margin: '0 5mm' }}></div>
                                                                <PayslipTemplate
                                                                    data={simulation}
                                                                    company={selectedCompany}
                                                                    label="2ª VIA - COLABORADOR"
                                                                    id="temp-payslip-2"
                                                                    inputs={inputs}
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                );

                                                await new Promise(resolve => setTimeout(resolve, 500));

                                                const canvas = await html2canvas(tempDiv, {
                                                    scale: 2,
                                                    useCORS: true,
                                                    logging: false,
                                                    windowWidth: 1600,
                                                } as any);

                                                const imgData = canvas.toDataURL('image/png');
                                                const imgHeight = (canvas.height * printableWidth) / canvas.width;

                                                pdf.addImage(imgData, 'PNG', margin, 0, printableWidth, imgHeight);

                                                root.unmount();
                                                document.body.removeChild(tempDiv);
                                            };

                                            await addPayslipPage();
                                            pdf.save(`Holerite_${simulation.person.name.replace(/\s+/g, '_')}_${currentCompetence.replace('/', '-')}.pdf`);
                                        }}>
                                            Baixar PDF
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div >
                )
                }
            </div >

            <Modal isOpen={!!viewDetails} onClose={() => setViewDetails(null)} title="Detalhes do Fechamento">
                {viewDetails && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Competência</p>
                                <p className="font-bold text-lg">{viewDetails.competence}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500 uppercase">Total Líquido</p>
                                <p className="font-bold text-lg text-green-600">{formatCurrency(viewDetails.totalNet)}</p>
                            </div>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto border rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 text-xs uppercase sticky top-0">
                                    <tr>
                                        <th className="p-2 text-left">Funcionário</th>
                                        <th className="p-2 text-right">Proventos</th>
                                        <th className="p-2 text-right">Descontos</th>
                                        <th className="p-2 text-right">Líquido</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {viewDetails.details.map((d, i) => (
                                        <tr key={i}>
                                            <td className="p-2">{d.employeeName}</td>
                                            <td className="p-2 text-right text-green-600">{formatCurrency(d.totalProventos)}</td>
                                            <td className="p-2 text-right text-red-600">{formatCurrency(d.totalDescontos)}</td>
                                            <td className="p-2 text-right font-bold">{formatCurrency(d.netSalary)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Modal>

            {/* HOLERITE VIEW MODAL */}
            <Modal isOpen={!!viewPayslip} onClose={() => setViewPayslip(null)} title="Visualização do Holerite" maxWidth="5xl">
                {viewPayslip && (
                    <div className="flex flex-col items-center bg-gray-100 p-8 rounded-lg">
                        <div className="w-full flex justify-end gap-3 mb-4">
                            <Button onClick={() => generateSinglePayslipPDF(viewPayslip, 'print')} className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 flex items-center gap-2">
                                <Printer size={16} /> Imprimir
                            </Button>
                            <Button onClick={() => generateSinglePayslipPDF(viewPayslip, 'download')} className="bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-2">
                                <Download size={16} /> Salvar PDF
                            </Button>
                            <Button onClick={() => {
                                if (selectedCompany) {
                                    // alert("Funcionalidade de XML individual em desenvolvimento. Use o módulo Declarações.");
                                    const xml = generateEsocial({ ...viewDetails, details: [viewPayslip] } as any, selectedCompany, people.filter(p => p.type === 'employee') as Employee[]);
                                    const blob = new Blob([xml], { type: 'text/xml' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `S-1200_${viewPayslip.competence.replace('/', '-')}_${viewPayslip.employeeName.split(' ')[0]}.xml`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                }
                            }} className="bg-orange-600 text-white hover:bg-orange-700 flex items-center gap-2">
                                <FileCode size={16} /> eSocial XML
                            </Button>
                        </div>
                        <div className="scale-[0.85] origin-top shadow-2xl bg-white">
                            {(() => {
                                const dataProp = {
                                    person: {
                                        id: viewPayslip.employeeId,
                                        name: viewPayslip.employeeName,
                                        type: viewPayslip.personType,
                                        role: viewPayslip.role,
                                        pis: (people.find(p => p.id === viewPayslip.employeeId) as any)?.pis || '',
                                        admissionDate: (people.find(p => p.id === viewPayslip.employeeId) as any)?.admissionDate || (people.find(p => p.id === viewPayslip.employeeId) as any)?.entryDate || '',
                                        cbo: (people.find(p => p.id === viewPayslip.employeeId) as any)?.cbo || ''
                                    },
                                    events: viewPayslip.events,
                                    totalProventos: viewPayslip.totalProventos,
                                    totalDescontos: viewPayslip.totalDescontos,
                                    netSalary: viewPayslip.netSalary,
                                    baseINSS: viewPayslip.baseINSS,
                                    baseIRRF: viewPayslip.baseIRRF,
                                    fgtsVal: viewPayslip.fgtsValue,
                                    ...viewPayslip.inputsSnapshot,
                                };

                                const calcType = viewPayslip.inputsSnapshot?.calculationType;

                                if (calcType === 'rescisao') {
                                    return <TRCTTemplate data={dataProp} company={selectedCompany} />;
                                } else if (calcType === 'decimo_terceiro') {
                                    return <DecimoTerceiroTemplate data={dataProp} company={selectedCompany} label="VISUALIZAÇÃO DE HISTÓRICO" inputs={viewPayslip.inputsSnapshot} />;
                                } else if (calcType === 'ferias') {
                                    return <FeriasTemplate data={dataProp} company={selectedCompany} label="VISUALIZAÇÃO DE HISTÓRICO" inputs={viewPayslip.inputsSnapshot} />;
                                }
                                return <PayslipTemplate data={dataProp} company={selectedCompany} label="VISUALIZAÇÃO DE HISTÓRICO" />;
                            })()}
                        </div>
                    </div>
                )}
            </Modal>
        </div >
    );
};

const ViewIcon = ({ className }: any) => <Eye className={className} />