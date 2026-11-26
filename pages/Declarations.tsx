import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { useError } from '../contexts/ErrorContext';
import { generateSPED, generateEsocialBatch, generateReinfBatch, generateEFDContrib } from '../utils/legalGenerators';
import { generateSEFIP84, validateSEFIP84Data } from '../utils/sefip84Generator';
import { Filing, EsocialEvent, PayrollRun } from '../types';
import {
    FileText, Layers, Download, CheckCircle, ShieldCheck,
    AlertTriangle, Database, ActivitySquare, ArrowUp, ArrowDown,
    FileBarChart, Search, RefreshCw, Send, Play, Trash2, Eye, Plus, Calendar, AlertCircle, XCircle
} from 'lucide-react';
import { formatDateBR, parseDateSafe } from '../utils/formatters';
import { AuditValidator } from '../components/fiscal/AuditValidator';
import { GovernmentTables } from '../components/fiscal/GovernmentTables';

// Local AppError interface moved to Context

export const Declarations: React.FC = () => {
    const {
        invoices, selectedCompany, products, clients, employees, partners, payrollRuns, payrollItems,
        filings, addFiling, updateFiling, deleteItem
    } = useData();
    const { addToast } = useToast();
    const { showError } = useError();

    // STATE
    const [selectedType, setSelectedType] = useState<string>('SPED_FISCAL');
    const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    const [activeObligationId, setActiveObligationId] = useState<string | null>(null);
    const [isProcessingObligation, setIsProcessingObligation] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('Todas');
    const [activePhaseTab, setActivePhaseTab] = useState<string>('1');
    const [isZeroMovement, setIsZeroMovement] = useState(false);
    const [isRectification, setIsRectification] = useState(false);
    const [codigoRecolhimento, setCodigoRecolhimento] = useState('115');
    const [dataFGTS, setDataFGTS] = useState('');

    // CONFIGURATION FOR SIDEBAR TYPES
    const DECLARATION_TYPES = [
        {
            id: 'SPED_FISCAL',
            label: 'SPED Fiscal',
            description: 'Escrituração Fiscal Digital - ICMS/IPI',
            icon: Database,
            color: 'purple'
        },
        {
            id: 'SPED_CONTRIBUICOES',
            label: 'EFD Contribuições',
            description: 'Escrituração de PIS/COFINS',
            icon: ActivitySquare,
            color: 'blue'
        },
        {
            id: 'AUDIT_SPED',
            label: 'Malha Fina (Audit)',
            description: 'Auditoria fiscal prévia e Inteligência',
            icon: ShieldCheck,
            color: 'amber'
        },
        {
            id: 'SPED_VALIDATOR',
            label: 'Validador PVA',
            description: 'Validação oficial de estrutura',
            icon: CheckCircle,
            color: 'emerald'
        },
        {
            id: 'DCTF',
            label: 'DCTF Mensal',
            description: 'Débitos e Créditos Tributários',
            icon: FileText,
            color: 'orange'
        },
        {
            id: 'ESOCIAL',
            label: 'eSocial',
            description: 'Folha, Admissões e SST',
            icon: Layers,
            color: 'green'
        },
        {
            id: 'TAX_CALENDAR',
            label: 'Agenda Tributária',
            description: 'Prazos e Obrigações',
            icon: Calendar,
            color: 'red'
        },
        {
            id: 'REINF',
            label: 'EFD-Reinf',
            description: 'Retenções e Outras Informações Fiscais',
            icon: FileText,
            color: 'indigo'
        },
        {
            id: 'SEFIP_84',
            label: 'SEFIP 8.4',
            description: 'FGTS e Informações à Previdência Social',
            icon: FileBarChart,
            color: 'blue'
        }
    ] as const;

    // VALIDATION LOGIC
    const validateObligationData = (type: string, period: string): string[] => {
        const errors: string[] = [];

        if (!selectedCompany) {
            errors.push('Nenhuma empresa selecionada.');
            return errors;
        }
        if (!selectedCompany.cnpj) errors.push('Empresa selecionada não possui CNPJ cadastrado.');
        if (!selectedCompany.address) errors.push('Empresa selecionada não possui endereço completo.');
        if (!selectedCompany.ie && type === 'SPED_FISCAL') errors.push('Inscrição Estadual é obrigatória para SPED Fiscal.');

        const [year, month] = period.split('-');
        const formattedPeriod = `${month}/${year}`;

        if (type === 'SPED_FISCAL') {
            // Invoices check
            const periodInvoices = invoices.filter(inv => {
                const invDate = parseDateSafe(inv.date);
                return invDate.getMonth() + 1 === parseInt(month) && invDate.getFullYear() === parseInt(year);
            });

            if (periodInvoices.length === 0) {
                // Warning logic could go here
            } else {
                if (!clients || clients.length === 0) errors.push('Notas fiscais detectadas, mas não há cadastro de Clientes/Fornecedores (Bloco 0150).');
                if (!products || products.length === 0) errors.push('Notas fiscais detectadas, mas não há cadastro de Produtos (Bloco 0200).');
            }
        } else if (type === 'ESOCIAL') {
            if (!employees || employees.length === 0) errors.push('Não há funcionários cadastrados para gerar eventos do eSocial.');

            // Check for phase 3 data
            const hasPayroll = payrollRuns?.some(run => run.competence === formattedPeriod);
            if (!hasPayroll) errors.push(`Não foi encontrado fechamento de folha de pagamento para a competência ${formattedPeriod}. (Eventos S-1200/S-1210 impossibilitados)`);
        } else if (type === 'REINF') {
            // Check for R-1000 minimum
            // RELAXED CHECK: Classificação Tributária defaults to '99' in generator if missing.
            // if (!selectedCompany.fiscalSettings?.esocial?.classificacaoTributaria) errors.push('Classificação Tributária não configurada no cadastro da empresa.');

            // Check for at least some movement or indicate emptiness
            // Not strictly an error to be empty, but good to warn if aiming for "Sem Movimento"
        } else if (type === 'SEFIP_84') {
            const hasPeople = (employees && employees.length > 0) || (partners && partners.length > 0);
            if (!hasPeople && !isZeroMovement) errors.push('Não há funcionários ou sócios cadastrados para gerar SEFIP.');
            
            const run = payrollRuns?.find(run => run.competence === formattedPeriod);
            if (!run && !isZeroMovement) {
                errors.push(`Folha de pagamento não encontrada para o período ${formattedPeriod}.`);
            } else if (!isZeroMovement && (!run?.details || run.details.length === 0)) {
                errors.push(`A folha de pagamento do período ${formattedPeriod} não possui detalhes/lançamentos.`);
            }
            
            // Check for required SEFIP fields in Company
            if (!selectedCompany.fpas) errors.push('O campo FPAS é obrigatório no cadastro da empresa para o SEFIP.');
            if (!selectedCompany.codigoTerceiros) errors.push('O código de terceiros é obrigatório no cadastro da empresa para o SEFIP.');
        }

        return errors;
    };


    // 1. GENERATE
    const handleGenerateObligation = () => {
        if (!selectedCompany) {
            addToast('Selecione uma empresa para gerar a declaração.', 'error');
            return;
        }

        // Run Pre-Validation
        const validationErrors = validateObligationData(selectedType, selectedPeriod);

        setIsProcessingObligation(true);
        addToast(validationErrors.length > 0 ? `Falha na pré-validação do ${selectedType.replace('_', ' ')}. Verifique as pendências.` : `Iniciando geração do ${selectedType.replace('_', ' ')}...`, validationErrors.length > 0 ? 'warning' : 'info');

        // Simulate progress for better UX
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            if (progress > 90) clearInterval(interval);
            // Ideally we'd have a setProgress state, but for now we rely on the final timeout to finish.
        }, 150);

        setTimeout(async () => {
            clearInterval(interval);
            const [year, month] = selectedPeriod.split('-');
            const formattedPeriod = `${month}/${year}`;

            let content = '';
            let fileName = '';
            let events: EsocialEvent[] = [];

            try {
                // Only generate content if NO validation errors
                if (validationErrors.length === 0) {
                    if (selectedType === 'SPED_FISCAL') {
                        content = generateSPED(invoices, selectedCompany, products || [], clients || [], isZeroMovement);
                        fileName = `SPED_FISCAL_${selectedCompany.cnpj.replace(/\D/g, '')}_${year}${month}.txt`;
                    } else if (selectedType === 'ESOCIAL') {
                        events = generateEsocialBatch(
                            selectedCompany,
                            employees || [],
                            payrollRuns || [],
                            payrollItems || [],
                            formattedPeriod,
                            isZeroMovement
                        );
                        content = `Lote de ${events.length} eventos gerados${isZeroMovement ? ' (Sem Movimento)' : ''}.`;
                        fileName = `ESOCIAL_LOTE_${selectedCompany.cnpj.replace(/\D/g, '')}_${selectedPeriod}.xml`;
                    } else if (selectedType === 'REINF') {
                        events = generateReinfBatch(
                            selectedCompany,
                            invoices || [],
                            selectedPeriod, // YYYY-MM
                            isZeroMovement
                        );
                        content = `Lote de ${events.length} eventos Reinf gerados${isZeroMovement ? ' (Sem Movimento)' : ''}.`;
                        fileName = `REINF_LOTE_${selectedCompany.cnpj.replace(/\D/g, '')}_${selectedPeriod}.xml`;
                    } else if (selectedType === 'SPED_CONTRIBUICOES') {
                        content = generateEFDContrib(invoices, selectedCompany, products || [], clients || [], isZeroMovement);
                        fileName = `SPED_CONTRIB_${selectedCompany.cnpj.replace(/\D/g, '')}_${year}${month}.txt`;
                    } else if (selectedType === 'SEFIP_84') {
                        const run = payrollRuns.find(r => r.competence === formattedPeriod);
                        if (run || isZeroMovement) {
                            // Combine employees and partners into a compatible format for the generator
                            const allPeople = [
                                ...(employees || []).map(e => ({ ...e, personType: 'employee' as const })),
                                ...(partners || []).map(p => ({
                                    ...p,
                                    personType: 'partner' as const,
                                    admissionDate: selectedCompany.openingDate || '2000-01-01', // Fallback for partners
                                    categorySEFIP: '11',
                                    registration: p.id.slice(-11), // Fake mapping if needed
                                } as any))
                            ];

                            const sefipOpts = {
                                isZeroMovement,
                                isRectification,
                                codigoRecolhimento,
                                modalidade: isRectification ? '9' : (isZeroMovement ? '1' : ' '),
                                dataRecolhimentoFGTS: dataFGTS
                            };

                            const errors = validateSEFIP84Data(selectedCompany, allPeople as any, run || null, sefipOpts);
                            if (errors.length > 0) {
                                const errorList = errors.map(e => `• ${e.name ? `[${e.name}] ` : ''}${e.field}: ${e.message}`).join('\n');
                                showError({
                                    code: 'SEFIP_VAL_001',
                                    title: 'Dados Incompletos para SEFIP',
                                    description: `Corrija os seguintes erros antes de gerar o arquivo:\n\n${errorList}`,
                                    origin: 'Validação SEFIP',
                                    suggestion: 'Acesse o cadastro da Empresa ou do Funcionário/Sócio para preencher os campos indicados.'
                                });
                                setIsProcessingObligation(false);
                                return;
                            }

                            content = generateSEFIP84(selectedCompany, allPeople, run || null, { 
                                name: selectedCompany.razaoSocial, 
                                phone: selectedCompany.telefone,
                                contact: 'ADMINISTRADOR'
                            }, sefipOpts);
                            fileName = 'SEFIP.RE';
                        } else {
                            throw new Error("Folha de pagamento não encontrada.");
                        }
                    } else {
                        content = `REQ_FEDERAL|${selectedType}|${formattedPeriod}|...`;
                        fileName = `${selectedType}_${selectedCompany.cnpj.replace(/\D/g, '')}.dec`;
                    }
                } else {
                    fileName = "Falha na Geração - Pendências Encontradas";
                }

                // Check if already exists to Update instead of Create
                const existingFiling = filings.find(f => f.companyId === selectedCompany.id && f.name === selectedType && f.competence === formattedPeriod);

                if (existingFiling) {
                    await updateFiling({
                        ...existingFiling,
                        status: validationErrors.length > 0 ? 'error' : 'generated',
                        content: content,
                        fileName: fileName,
                        esocialEvents: events.length > 0 ? events : undefined,
                        validationErrors: validationErrors,
                        priority: 'high',
                        updatedAt: new Date().toISOString()
                    });
                } else {
                    const newFiling: Filing = {
                        id: Math.random().toString(36).substr(2, 9),
                        companyId: selectedCompany.id,
                        name: selectedType,
                        category: selectedType === 'SPED_FISCAL' ? 'state' : 'federal',
                        competence: formattedPeriod,
                        deadline: new Date().toISOString(),
                        status: validationErrors.length > 0 ? 'error' : 'generated',
                        content: content,
                        priority: 'high',
                        createdAt: new Date().toISOString(),
                        validationErrors: validationErrors,
                        ...(validationErrors.length === 0 ? { fileName } : { fileName: "Falha na Geração - Pendências Encontradas" }),
                        ...(events.length > 0 ? { esocialEvents: events } : {})
                    };
                    await addFiling(newFiling);
                }

                if (validationErrors.length > 0) {
                    addToast('Foram encontradas pendências. Verifique a linha criada na tabela.', 'error');
                } else {
                    addToast('Declaração gerada e salva com sucesso.', 'success');
                }
            } catch (error: any) {
                console.error("Erro na geração:", error);
                // Enhanced Error Handling
                showError({
                    code: 'ERR_GEN_001',
                    title: 'Falha Crítica na Geração',
                    description: error.message || 'Ocorreu um erro inesperado durante o processamento dos dados.',
                    origin: `Módulo de Geração (${selectedType})`,
                    suggestion: 'Verifique se todos os cadastros obrigatórios (Empresa, Itens, Parceiros) estão completos. Tente reprocessar a obrigação.'
                });
            } finally {
                setIsProcessingObligation(false);
            }
        }, 1500);
    };

    // 2. REPROCESS (Regenerate)
    const handleReprocessObligation = (filing: Filing) => {
        if (confirm(`Deseja reprocessar a declaração ${filing.name} do período ${filing.competence}?`)) {
            setIsProcessingObligation(true);

            // Re-run validation
            const [month, year] = filing.competence.split('/');
            const isoPeriod = `${year}-${month}`;
            const validationErrors = validateObligationData(filing.name, isoPeriod);

            addToast(`Reprocessando ${filing.name}...`, 'info');

            setTimeout(async () => {
                let newContent = filing.content;
                let newEvents = filing.esocialEvents;
                let newFileName = filing.fileName;

                if (validationErrors.length === 0) {
                    // Logic to regenerate content if it was previously failed or needs update
                    const [year, month] = filing.competence.split('/');
                    if (filing.name === 'SPED_FISCAL') {
                        newContent = generateSPED(invoices, selectedCompany!, products || [], clients || []);
                    } else if (filing.name === 'ESOCIAL') {
                        const batch = generateEsocialBatch(selectedCompany!, employees || [], payrollRuns || [], payrollItems || [], filing.competence);
                        newEvents = batch;
                        newContent = `Lote de ${batch.length} eventos gerados.`;
                        newFileName = `ESOCIAL_LOTE_${selectedCompany!.cnpj.replace(/\D/g, '')}_${year}-${month}.xml`;
                    } else if (filing.name === 'REINF') {
                        const batch = generateReinfBatch(selectedCompany!, invoices || [], isoPeriod);
                        newEvents = batch;
                        newContent = `Lote de ${batch.length} eventos Reinf gerados.`;
                        newFileName = `REINF_LOTE_${selectedCompany!.cnpj.replace(/\D/g, '')}_${year}-${month}.xml`;
                    } else if (filing.name === 'SPED_CONTRIBUICOES') {
                        newContent = generateEFDContrib(invoices, selectedCompany!, products || [], clients || []);
                        newFileName = `SPED_CONTRIB_${selectedCompany!.cnpj.replace(/\D/g, '')}_${year}${month}.txt`;
                    } else if (filing.name === 'SEFIP_84') {
                        const run = payrollRuns.find(r => r.competence === filing.competence);
                        if (run || isZeroMovement) {
                            const allPeople = [
                                ...(employees || []).map(e => ({ ...e, personType: 'employee' as const })),
                                ...(partners || []).map(p => ({
                                    ...p,
                                    personType: 'partner' as const,
                                    admissionDate: selectedCompany!.openingDate || '2000-01-01',
                                    categorySEFIP: '11',
                                    registration: p.id.slice(-11),
                                } as any))
                            ];
                            newContent = generateSEFIP84(selectedCompany!, allPeople, run || null, { 
                                name: selectedCompany!.razaoSocial, 
                                phone: selectedCompany!.telefone,
                                contact: 'ADMINISTRADOR'
                            }, {
                                isZeroMovement,
                                isRectification,
                                codigoRecolhimento,
                                modalidade: isRectification ? '9' : (isZeroMovement ? '1' : ' '),
                                dataRecolhimentoFGTS: dataFGTS
                            });
                            newFileName = 'SEFIP.RE';
                        }
                    }
                } else {
                    newFileName = "Falha na Geração - Pendências Encontradas";
                }

                const updatedFiling: Filing = {
                    ...filing,
                    status: validationErrors.length > 0 ? 'error' : 'generated',
                    updatedAt: new Date().toISOString(),
                    validationErrors: validationErrors,
                    content: newContent,
                    fileName: newFileName,
                };

                // Dynamically handle optional fields to avoid undefined
                if (newEvents && newEvents.length > 0) {
                    updatedFiling.esocialEvents = newEvents;
                }
                // Clear receipt number if reprocessing (cannot send undefined, so use null if type allows or empty string, or delete logic?)
                // For now, we will NOT set it to undefined. If we want to clear it, we might need a specific 'clear' instruction or use null.
                delete updatedFiling.receiptNumber;

                await updateFiling(updatedFiling);

                setIsProcessingObligation(false);
                if (validationErrors.length > 0) {
                    addToast('Reprocessamento falhou devido a pendências.', 'error');
                } else {
                    addToast('Declaração reprocessada com sucesso.', 'success');
                }
            }, 1500);
        }
    };

    // 2.5 DELETE
    const handleDeleteObligation = (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta declaração?')) {
            deleteItem('filings', id);
            addToast('Declaração excluída com sucesso.', 'success');
        }
    };

    // 3. VALIDATE (Real Validation Logic)
    const validateContent = (type: string, content: string): string[] => {
        const errors: string[] = [];
        if (!content) return ["Conteúdo vazio."];

        const lines = content.split('\n').filter(l => l.trim().length > 0);

        if (lines.length < 2) {
            errors.push("Arquivo vazio ou com estrutura inválida (muito curto).");
            return errors;
        }

        if (type === 'SPED_FISCAL' || type === 'SPED_CONTRIBUICOES') {
            // Check Header
            if (!lines[0].startsWith('|0000|')) errors.push("Registro inicial 0000 não encontrado.");

            // Check Footer
            const lastLine = lines[lines.length - 1];
            if (!lastLine.startsWith('|9999|')) {
                errors.push("Registro final 9999 não encontrado.");
            } else {
                // Check Line Count match
                const fields = lastLine.split('|');
                const reportedCount = parseInt(fields[2]);
                // Count lines (SPED includes header and footer in count)
                if (reportedCount !== lines.length) {
                    errors.push(`Contagem de linhas incorreta (9999). Informado: ${reportedCount}, Encontrado: ${lines.length}.`);
                }
            }

            // Specific Checks
            if (type === 'SPED_CONTRIBUICOES') {
                // Validate Version 006
                const reg0000 = lines[0].split('|');
                if (reg0000[2] !== '006') {
                    errors.push(`Versão do Layout (0000.COD_VER) incorreta: ${reg0000[2]}. Esperado: 006.`);
                }

                // Validate Mandatory Blocks
                if (!lines.some(l => l.startsWith('|0000|'))) errors.push("Bloco 0 (Abertura) ausente.");
                if (!lines.some(l => l.startsWith('|0100|'))) errors.push("Registro 0100 (Dados do Contabilista) ausente.");
                if (!lines.some(l => l.startsWith('|0110|'))) errors.push("Registro 0110 (Regime de Apuração) ausente.");
                // Block M is mandatory for most, but maybe empty file (sem movimento) doesn't have it? 
                // Actually EFD Contribuições generally requires Block M (M200/M600) even if zero, or M210/M610. 
                // If "Sem Movimento" (Block C001/1/ etc), logic is different. 
                // Simple existence check:
                const hasMBlock = lines.some(l => l.startsWith('|M'));
                if (!hasMBlock && !lines.some(l => l.includes('|1001|1|'))) { // If not explicitly sem movimento block 1 check...
                    // Warning only?
                }

                // Check Block 9 (Control)
                if (!lines.some(l => l.startsWith('|9001|'))) errors.push("Bloco 9 (Controle) ausente.");
            }
        } else if (type === 'SPED_VALIDATOR') {
            // Generic checks if checking raw text
            if (!lines[0].startsWith('|')) errors.push("Formato SPED inválido. Linhas devem começar com '|'.");
        }

        return errors;
    };

    const handleValidateObligation = (filing: Filing) => {
        setIsProcessingObligation(true);
        addToast('Validando estrutura do arquivo...', 'info');

        setTimeout(async () => {
            let pvaErrors: string[] = [];

            if ((filing.name === 'ESOCIAL' || filing.name === 'REINF')) {
                if (!filing.esocialEvents || filing.esocialEvents.length === 0) {
                    pvaErrors.push('Arquivo XML vazio ou sem eventos.');
                }
            } else {
                // Run Content Validation
                pvaErrors = validateContent(filing.name, filing.content || '');
            }

            await updateFiling({
                ...filing,
                status: pvaErrors.length > 0 ? 'error' : 'validated',
                validationErrors: pvaErrors.length > 0 ? pvaErrors : []
            });

            setIsProcessingObligation(false);
            if (pvaErrors.length > 0) {
                addToast(`Validação falhou: ${pvaErrors.length} erros encontrados.`, 'error');
            } else {
                addToast('Arquivo validado com sucesso! Estrutura correta.', 'success');
            }
        }, 1000);
    };

    // 3. TOGGLE EVENT SELECTION (eSocial)
    const toggleEventSelection = (filing: Filing, eventId: string) => {
        if (!filing.esocialEvents) return;

        const updatedEvents = filing.esocialEvents.map((ev: EsocialEvent) =>
            ev.id === eventId
                ? { ...ev, status: (ev.status === 'selected' || ev.status === 'pending' ? (ev.status === 'selected' ? 'pending' : 'selected') : ev.status) as EsocialEvent['status'] }
                : ev
        );

        updateFiling({
            ...filing,
            esocialEvents: updatedEvents
        });
    };

    // 4. TRANSMIT (Simulate API)
    const handleTransmitObligation = (filing: Filing) => {
        setIsProcessingObligation(true);
        addToast('Conectando ao servidor da Receita Federal...', 'info');

        setTimeout(async () => {
            let updatedEvents = filing.esocialEvents;
            let newStatus = filing.status;
            let receipt = filing.receiptNumber;

            if ((filing.name === 'ESOCIAL' || filing.name === 'REINF') && filing.esocialEvents) {
                updatedEvents = filing.esocialEvents.map((ev: EsocialEvent) =>
                    ev.status === 'selected' ? { ...ev, status: 'sent' } : ev
                );
                const anySent = updatedEvents.some((ev: any) => ev.status === 'sent');
                if (anySent) {
                    newStatus = 'sent';
                    receipt = `REC.${Math.random().toString().slice(2, 14)}`;
                }
            } else {
                newStatus = 'sent';
                receipt = `REC.${Math.random().toString().slice(2, 14)}`;
            }

            await updateFiling({
                ...filing,
                status: newStatus,
                receiptNumber: receipt,
                esocialEvents: updatedEvents
            });

            setIsProcessingObligation(false);
            addToast('Transmissão concluída.', 'success');
        }, 3000);
    };

    const handleDownloadObligation = (filing: Filing) => {
        if (!filing.content) {
            addToast('Arquivo vazio ou não gerado.', 'error');
            return;
        }
        const blob = new Blob([filing.content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filing.fileName || 'declaracao.txt';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Filter obligations by the SELECTED TYPE + Filter Status
    const filteredObligations = filings.filter(o =>
        o.name === selectedType && (
            filterStatus === 'Todas' ? true :
                filterStatus === 'Pendentes' ? o.status === 'generated' || o.status === 'validated' || o.status === 'error' :
                    filterStatus === 'Transmitidas' ? o.status === 'sent' : true
        )
    ).sort((a, b) => parseDateSafe(b.createdAt || '').getTime() - parseDateSafe(a.createdAt || '').getTime());

    // Get current type config for UI
    const currentTypeConfig = DECLARATION_TYPES.find(t => t.id === selectedType);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 min-h-screen p-6 animate-in fade-in duration-500">
            {/* Header — Premium */}
            <div className="flex flex-col bg-white dark:bg-slate-900 px-6 py-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden mb-6">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-indigo-500" />
                <div className="flex justify-between items-center w-full ml-2">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-md shadow-purple-500/25">
                            <FileBarChart className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Declarações &amp; Obrigações</h1>
                            <p className="text-xs text-slate-400 font-medium">Central de inteligência fiscal, geração de arquivos e auditoria digital</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-6 h-full">
                {/* 1. SELECTION SIDEBAR (Types) */}
                <div className="xl:w-72 flex-shrink-0 flex flex-col gap-4">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4 px-2">Tipos de Declaração</h3>
                        <div className="flex flex-col gap-2">
                            {DECLARATION_TYPES.map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setSelectedType(type.id)}
                                    className={`text-left p-3 rounded-xl border transition-all relative overflow-hidden group ${selectedType === type.id
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-purple-900/20'
                                        : 'bg-white text-slate-600 dark:text-slate-300 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className={`p-2 rounded-lg ${selectedType === type.id
                                            ? 'bg-white/10 text-white'
                                            : `bg-${type.color}-50 text-${type.color}-600`
                                            }`}>
                                            <type.icon size={18} />
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold ${selectedType === type.id ? 'text-white' : 'text-slate-800'}`}>
                                                {type.label}
                                            </p>
                                            <p className={`text-[10px] truncate max-w-[140px] ${selectedType === type.id ? 'text-slate-400' : 'text-slate-400'}`}>
                                                {type.description}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedType === type.id && (
                                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-purple-500"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Security Badge */}
                    <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 mt-auto">
                        <h4 className="flex items-center gap-2 font-bold text-slate-600 dark:text-slate-300 text-xs mb-2">
                            <ActivitySquare size={14} /> Status ReceitaNet
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-green-600 font-bold bg-green-100 w-fit px-2 py-1 rounded-full">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                            OPERACIONAL
                        </div>
                        <p className="text-[9px] text-slate-400 mt-2">Ambiente de Produção Conectado</p>
                    </div>
                </div>

                {/* 2. MAIN CONTENT AREA */}
                <div className="flex-1 flex flex-col gap-6">

                    {/* CUSTOM RENDER FOR AUDIT (Malha Fina) */}
                    {selectedType === 'AUDIT_SPED' ? (
                        <div className="flex-1 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 animate-in fade-in duration-300">
                            <div className="mb-8">
                                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                    <ShieldCheck className="text-amber-500" size={32} />
                                    Auditoria Fiscal (Malha Fina)
                                </h2>
                                <p className="text-slate-500 mt-2 max-w-2xl">
                                    Este módulo cruza dados de Entradas, Saídas e Cadastros (Produtos, Clientes) para identificar inconsistências antes do envio oficial.
                                </p>
                            </div>

                            {/* Use the validator component logic inline here or refactor into reused component */}
                            {/* Reusing ValidationResults logic from FiscalBooks but inline for context access */}
                            <AuditValidator />
                        </div>
                    ) : selectedType === 'SPED_VALIDATOR' ? (
                        <div className="flex-1 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 animate-in fade-in duration-300">
                            <div className="mb-8">
                                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                    <CheckCircle className="text-emerald-500" size={32} />
                                    Validador de Estrutura (PVA Web)
                                </h2>
                                <p className="text-slate-500 mt-2">
                                    Cole o conteúdo do seu arquivo SPED (Fiscal ou Contribuições) abaixo para verificar a integridade estrutural, contagem de linhas e blocos obrigatórios antes de importar no PVA oficial.
                                </p>
                            </div>

                            <div className="flex flex-col gap-4">
                                <textarea
                                    className="w-full h-64 p-4 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="|0000|... Cole o conteúdo do arquivo aqui ..."
                                    id="validator-input"
                                ></textarea>

                                <div className="flex justify-end gap-3">
                                    <button
                                        className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center gap-2"
                                        onClick={() => {
                                            const content = (document.getElementById('validator-input') as HTMLTextAreaElement).value;
                                            const errors = validateContent('SPED_CONTRIBUICOES', content); // Defaulting to strictest check or generic

                                            if (errors.length === 0) {
                                                addToast('Arquivo VÁLIDO! Estrutura correta.', 'success');
                                                alert('Sucesso! O arquivo parece estruturalmente correto.');
                                            } else {
                                                addToast(`Encontrados ${errors.length} problemas.`, 'error');
                                                alert(`ERROS ENCONTRADOS:\n\n${errors.join('\n')}`);
                                            }
                                        }}
                                    >
                                        <CheckCircle size={18} /> Validar Conteúdo Agora
                                    </button>
                                </div>
                            </div>

                            <div className="mt-8 p-6 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-sm">
                                <h4 className="font-bold mb-2 flex items-center gap-2"><ActivitySquare size={16} /> O que é validado?</h4>
                                <ul className="list-disc pl-5 space-y-1 text-xs">
                                    <li>Integridade dos Blocos Iniciais (0000, 0001, 0100...)</li>
                                    <li>Sequencial de Linhas e Bloco 9 (Controle e Encerramento)</li>
                                    <li>Versão do Layout (006 para 2026+)</li>
                                    <li>Existência de blocos obrigatórios de apuração</li>
                                </ul>
                            </div>
                        </div>
                    ) : selectedType === 'TAX_CALENDAR' ? (
                        <div className="flex-1 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 animate-in fade-in duration-300">
                            <div className="mb-8">
                                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                    <Calendar className="text-red-500" size={32} />
                                    Agenda de Obrigações 2024
                                </h2>
                                <p className="text-slate-500 mt-2">
                                    Acompanhe os prazos de entrega das declarações federais, estaduais e municipais para evitar multas.
                                </p>
                            </div>

                            <div className="flex gap-2 mb-6">
                                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase">Vencendo Hoje (1)</span>
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase">Próximos 7 Dias (3)</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[
                                    { title: 'EFD ICMS/IPI', date: '2024-01-20', type: 'Federal', severity: 'high' },
                                    { title: 'DCTFWeb', date: '2024-01-15', type: 'Social', severity: 'high' },
                                    { title: 'GIA Mensal', date: '2024-01-18', type: 'Estadual', severity: 'medium' },
                                    { title: 'ISS Mensal', date: '2024-01-10', type: 'Municipal', severity: 'low' },
                                    { title: 'PGDAS-D', date: '2024-01-20', type: 'Federal', severity: 'high' },
                                    { title: 'DAE Doméstico', date: '2024-01-07', type: 'Social', severity: 'medium' },
                                ].map((event, i) => (
                                    <div key={i} className={`p-5 rounded-2xl border-l-4 bg-slate-50 ${event.severity === 'high' ? 'border-red-500' : event.severity === 'medium' ? 'border-blue-500' : 'border-green-500'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black uppercase text-slate-500">{event.type}</span>
                                            <Calendar size={14} className="text-slate-400" />
                                        </div>
                                        <h4 className="font-black text-slate-800 text-sm mb-1">{event.title}</h4>
                                        <p className={`text-xs font-bold ${event.severity === 'high' ? 'text-red-600' : 'text-slate-600'}`}>Vence em: {event.date}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* STANDARD VIEW FOR OTHER TYPES */
                        <>
                            {/* GOVERNMENT TABLES FOR SEFIP_84 */}
                            {selectedType === 'SEFIP_84' && (
                                <GovernmentTables />
                            )}
                            
                            {/* 2.1 GENERATION CARD (Top) */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                        {currentTypeConfig && <currentTypeConfig.icon className={`text-${currentTypeConfig.color}-600`} />}
                                        Gerenciar {currentTypeConfig?.label}
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">Selecione o período de apuração para gerar ou visualizar os arquivos.</p>
                                </div>

                                <div className="flex items-end gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block ml-1">
                                            <Calendar size={10} className="inline mr-1" /> Período de Apuração
                                        </label>
                                        <input
                                            type="month"
                                            value={selectedPeriod}
                                            onChange={(e) => setSelectedPeriod(e.target.value)}
                                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 w-48 shadow-sm h-[42px]"
                                        />
                                    </div>
                                    {selectedType === 'SEFIP_84' && (
                                        <div className="flex items-center gap-3 mr-2">
                                            <div className="flex flex-col">
                                                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block ml-1">Código Rec.</label>
                                                <select
                                                    value={codigoRecolhimento}
                                                    onChange={(e) => setCodigoRecolhimento(e.target.value)}
                                                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none h-[42px]"
                                                >
                                                    <option value="115">115 - Recolhimento ao FGTS</option>
                                                    <option value="150">150 - Recolhimento Empresa Prest. Serv.</option>
                                                    <option value="155">155 - Recolhimento Obra Construção Civil</option>
                                                    <option value="650">650 - Recolhimento Dissídio Coletivo</option>
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-1 justify-center h-full">
                                                <div className="flex items-center gap-2">
                                                    <input type="checkbox" id="rectification" checked={isRectification} onChange={(e) => setIsRectification(e.target.checked)} className="w-3 h-3 text-purple-600 rounded" />
                                                    <label htmlFor="rectification" className="text-[10px] font-bold text-slate-500 cursor-pointer">Retificadora</label>
                                                </div>
                                            </div>
                                            <div className="flex flex-col ml-2">
                                                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block ml-1">Data Rec. FGTS</label>
                                                <input
                                                    type="date"
                                                    value={dataFGTS}
                                                    onChange={(e) => setDataFGTS(e.target.value)}
                                                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none h-[42px]"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mr-2">
                                        <input
                                            type="checkbox"
                                            id="zeroMovement"
                                            checked={isZeroMovement}
                                            onChange={(e) => setIsZeroMovement(e.target.checked)}
                                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                        />
                                        <label htmlFor="zeroMovement" className="text-xs font-bold text-slate-500 cursor-pointer select-none">
                                            Gerar Zerada (Sem Movimento)
                                        </label>
                                    </div>
                                    <button
                                        onClick={handleGenerateObligation}
                                        disabled={isProcessingObligation}
                                        className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed h-[42px]"
                                    >
                                        {isProcessingObligation ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Processando...
                                            </>
                                        ) : (
                                            <>
                                                <Plus size={16} /> Gerar Arquivo
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* 2.2 HISTORY TABLE (Bottom) */}
                            <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50">
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                                        Histórico de Arquivos ({currentTypeConfig?.label})
                                    </h3>
                                    <div className="flex gap-2">
                                        <select
                                            value={filterStatus}
                                            onChange={(e) => setFilterStatus(e.target.value)}
                                            className="bg-white border border-slate-200 text-slate-600 dark:text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="Todas">Todas as Declarações</option>
                                            <option value="Pendentes">Pendentes</option>
                                            <option value="Transmitidas">Transmitidas</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto w-full">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 sticky top-0 z-10">
                                            <tr className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                                <th className="p-4 w-32">Período</th>
                                                <th className="p-4">Arquivo / Detalhes</th>
                                                <th className="p-4">Gerado Em</th>
                                                <th className="p-4">Status</th>
                                                <th className="p-4 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredObligations.length > 0 ? filteredObligations.map(obs => (
                                                <React.Fragment key={obs.id}>
                                                    <tr className="hover:bg-slate-50 transition-colors group border-b border-slate-50 relative">
                                                        <td className="p-4 text-sm font-bold text-slate-700 dark:text-slate-200">{obs.competence}</td>
                                                        <td className="p-4">
                                                            <div>
                                                                <p className={`text-xs font-medium ${obs.status === 'error' ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                                                                    {obs.status === 'error' ? 'Falha na Geração / Pendências' : (obs.fileName || 'Sem nome de arquivo')}
                                                                </p>
                                                                {obs.receiptNumber && <p className="text-[9px] text-slate-400 font-mono mt-0.5">Recibo: {obs.receiptNumber}</p>}
                                                                {/* Error Preview */}
                                                                {obs.validationErrors && obs.validationErrors.length > 0 && (
                                                                    <div className="flex items-center gap-1 mt-1 text-red-600">
                                                                        <AlertCircle size={10} />
                                                                        <span className="text-[9px] font-bold">{obs.validationErrors.length} pendências encontradas</span>
                                                                    </div>
                                                                )}
                                                                {(obs.name === 'ESOCIAL' || obs.name === 'REINF') && obs.esocialEvents && (
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
                                                                            {obs.esocialEvents.length} eventos
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-xs text-slate-500">
                                                            {formatDateBR(obs.createdAt)}
                                                            <span className="text-[10px] opacity-70 ml-1">{obs.createdAt && parseDateSafe(obs.createdAt).toLocaleTimeString('pt-BR')}</span>
                                                        </td>
                                                        <td className="p-4">
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${obs.status === 'sent' ? 'bg-green-50 text-green-600 border-green-100' :
                                                                obs.status === 'validated' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                                    obs.status === 'error' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                        'bg-gray-50 text-gray-500 dark:text-slate-400 border-gray-100'
                                                                }`}>
                                                                {obs.status === 'sent' && <CheckCircle size={10} className="mr-1" />}
                                                                {obs.status === 'validated' && <ShieldCheck size={10} className="mr-1" />}
                                                                {obs.status === 'error' && <AlertTriangle size={10} className="mr-1" />}
                                                                {obs.status === 'generated' ? 'Gerado' :
                                                                    obs.status === 'validated' ? 'Validado' :
                                                                        obs.status === 'sent' ? 'Transmitido' :
                                                                            'Erro'}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                {/* ACESSAR */}
                                                                <button
                                                                    onClick={() => ((obs.name === 'ESOCIAL' || obs.name === 'REINF') || (obs.validationErrors && obs.validationErrors.length > 0)) ? setActiveObligationId(activeObligationId === obs.id ? null : obs.id) : handleDownloadObligation(obs)}
                                                                    className={`p-1.5 rounded-lg transition-colors ${obs.validationErrors && obs.validationErrors.length > 0 ? 'text-red-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                                                    title={(obs.name === 'ESOCIAL' || obs.name === 'REINF') || obs.validationErrors?.length ? "Ver Detalhes/Pendências" : "Baixar Arquivo"}
                                                                >
                                                                    {(obs.name === 'ESOCIAL' || obs.name === 'REINF') || obs.validationErrors?.length ? <Eye size={14} /> : <Download size={14} />}
                                                                </button>

                                                                {/* REPROCESSAR */}
                                                                <button
                                                                    onClick={() => handleReprocessObligation(obs)}
                                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                    title="Reprocessar"
                                                                >
                                                                    <RefreshCw size={14} />
                                                                </button>

                                                                {/* ENVIAR (Only if validated or eSocial/Reinf) - Disable if errors */}
                                                                {(obs.status === 'validated' || ((obs.name === 'ESOCIAL' || obs.name === 'REINF') && obs.status !== 'sent')) && obs.status !== 'error' && (
                                                                    <button
                                                                        onClick={() => handleTransmitObligation(obs)}
                                                                        disabled={isProcessingObligation}
                                                                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                        title="Enviar / Transmitir"
                                                                    >
                                                                        <Send size={14} />
                                                                    </button>
                                                                )}

                                                                {/* EXCLUIR */}
                                                                <button
                                                                    onClick={() => handleDeleteObligation(obs.id)}
                                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Excluir"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>

                                                                {/* VALIDATE ACTION */}
                                                                {obs.status === 'generated' && obs.name !== 'ESOCIAL' && obs.name !== 'REINF' && (
                                                                    <button
                                                                        onClick={() => handleValidateObligation(obs)}
                                                                        disabled={isProcessingObligation}
                                                                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase hover:bg-blue-200 transition-colors ml-2"
                                                                    >
                                                                        Validar
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* EXPANDED ROW FOR DETAILS OR ERRORS */}
                                                    {activeObligationId === obs.id && (
                                                        <tr className="bg-slate-50 border-b border-slate-100 dark:border-slate-700">
                                                            <td colSpan={5} className="p-4">
                                                                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2">

                                                                    {/* SECTION: Validation Errors */}
                                                                    {obs.validationErrors && obs.validationErrors.length > 0 && (
                                                                        <div className="mb-4">
                                                                            <div className="flex items-center gap-2 mb-2 text-red-600 font-bold text-xs uppercase tracking-wide">
                                                                                <AlertTriangle size={14} /> Pendências de Validação
                                                                            </div>
                                                                            <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                                                                                <p className="text-xs text-red-800 mb-2 font-semibold">Os seguintes erros impedem a geração correta do arquivo:</p>
                                                                                <ul className="space-y-2">
                                                                                    {obs.validationErrors.map((err, idx) => (
                                                                                        <li key={idx} className="text-xs text-red-700 flex items-start gap-2">
                                                                                            <XCircle size={12} className="mt-0.5 flex-shrink-0" />
                                                                                            {err}
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                                <div className="mt-4 flex gap-2">
                                                                                    <button onClick={() => handleReprocessObligation(obs)} className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded transition-colors flex items-center gap-2">
                                                                                        <RefreshCw size={12} /> Tentar Gerar Novamente
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* SECTION: eSocial/Reinf Advanced Event Selection */}
                                                                    {obs.esocialEvents && (obs.name === 'ESOCIAL' || obs.name === 'REINF') && (
                                                                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden font-sans">
                                                                            {/* Header */}
                                                                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start bg-slate-50/50">
                                                                                <div>
                                                                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Seleção de Eventos</h2>
                                                                                    <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                                                                                        Gerencie o envio dos arquivos XML para o ambiente nacional do eSocial/Reinf. Selecione a fase, marque os eventos desejados e realize a transmissão.
                                                                                    </p>
                                                                                </div>
                                                                                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                                                                                    <Database size={14} />
                                                                                    Empresa: {selectedCompany?.razaoSocial} ({selectedCompany?.cnpj})
                                                                                </div>
                                                                            </div>

                                                                            {/* Tabs */}
                                                                            <div className="px-6 pt-6 border-b border-slate-200 bg-white">
                                                                                <div className="flex gap-6 overflow-x-auto">
                                                                                    {[
                                                                                        { id: '1', label: obs.name === 'REINF' ? 'R-1000 – Tabelas' : 'FASE 1 – Iniciais e Tabelas' },
                                                                                        { id: '2', label: obs.name === 'REINF' ? 'R-2000 – Serviços' : 'FASE 2 – Não Periódicos' },
                                                                                        { id: '3', label: obs.name === 'REINF' ? 'R-4000 – Retenções' : 'FASE 3 – Periódicos' },
                                                                                        { id: '4', label: obs.name === 'REINF' ? 'Fechamento' : 'FASE 4 – SST' },
                                                                                        { id: '5', label: 'Retificação / Outros' },
                                                                                    ].map(phase => (
                                                                                        <button
                                                                                            key={phase.id}
                                                                                            onClick={() => setActivePhaseTab(phase.id)}
                                                                                            className={`pb-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors whitespace-nowrap ${activePhaseTab === phase.id
                                                                                                ? 'border-blue-600 text-blue-600'
                                                                                                : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:border-slate-300'
                                                                                                }`}
                                                                                        >
                                                                                            {phase.label}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>


                                                                            {/* Toolbar (Search & Filter) */}
                                                                            <div className="p-6 flex flex-col md:flex-row gap-4 justify-between items-center bg-white">
                                                                                <div className="relative w-full md:w-96">
                                                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                                                    <input
                                                                                        type="text"
                                                                                        placeholder="Pesquisar código (ex: S-1000) ou nome..."
                                                                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700 dark:text-slate-200"
                                                                                    // Note: In a real app, bind this to a state variable. For now, we rely on browser native generic search or assume simple usage.
                                                                                    />
                                                                                </div>
                                                                                <div className="flex gap-3 w-full md:w-auto">
                                                                                    <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 transition-colors">
                                                                                        Status: Todos os status <ArrowDown size={12} />
                                                                                    </div>
                                                                                    <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors">
                                                                                        <RefreshCw size={14} /> Filtros
                                                                                    </button>
                                                                                </div>
                                                                            </div>

                                                                            {/* Table */}
                                                                            <div className="w-full overflow-x-auto">
                                                                                <table className="w-full text-left border-collapse">
                                                                                    <thead className="bg-slate-50 border-y border-slate-100/50">
                                                                                        <tr className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                                                                            <th className="p-4 w-12 text-center">
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                                                                                                    checked={obs.esocialEvents?.filter((e: any) => e.group === activePhaseTab).every((e: any) => e.status === 'selected' || e.status === 'sent') && (obs.esocialEvents?.filter((e: any) => e.group === activePhaseTab).length || 0) > 0}
                                                                                                    onChange={(e) => {
                                                                                                        const isChecked = e.target.checked;
                                                                                                        const updatedEvents = obs.esocialEvents?.map((ev: any) =>
                                                                                                            ev.group === activePhaseTab && ev.status !== 'sent'
                                                                                                                ? { ...ev, status: isChecked ? 'selected' : 'pending' }
                                                                                                                : ev
                                                                                                        );
                                                                                                        if (updatedEvents) {
                                                                                                            updateFiling({ ...obs, esocialEvents: updatedEvents });
                                                                                                        }
                                                                                                    }}
                                                                                                />
                                                                                            </th>
                                                                                            <th className="p-4 w-32">Código</th>
                                                                                            <th className="p-4">Descrição do Evento</th>
                                                                                            <th className="p-4 w-40 text-center">Status</th>
                                                                                            <th className="p-4 w-48 text-right">Última Atualização</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody className="divide-y divide-slate-100">
                                                                                        {obs.esocialEvents
                                                                                            ?.filter((ev: any) => ev.group === activePhaseTab)
                                                                                            .map((ev: EsocialEvent) => (
                                                                                                <tr key={ev.id} className="hover:bg-blue-50/30 transition-colors group">
                                                                                                    <td className="p-4 text-center">
                                                                                                        <input
                                                                                                            type="checkbox"
                                                                                                            checked={ev.status === 'selected' || ev.status === 'sent'}
                                                                                                            readOnly={ev.status === 'sent'}
                                                                                                            className={`rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4 ${ev.status === 'sent' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                                                            onChange={() => ev.status !== 'sent' && toggleEventSelection(obs, ev.id)}
                                                                                                        />
                                                                                                    </td>
                                                                                                    <td className="p-4">
                                                                                                        <span className="text-blue-600 font-bold text-sm hover:underline cursor-pointer">{ev.evtType}</span>
                                                                                                    </td>
                                                                                                    <td className="p-4">
                                                                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{ev.description.split(' - ')[0]}</p>
                                                                                                        <p className="text-xs text-slate-400 mt-0.5 font-medium">{ev.description.split(' - ')[1] || 'Detalhes do evento'}</p>
                                                                                                    </td>
                                                                                                    <td className="p-4 text-center">
                                                                                                        {ev.status === 'sent' ? (
                                                                                                            <span className="inline-flex py-1 px-3 rounded-full bg-green-100 text-green-700 text-xs font-bold shadow-sm border border-green-200">
                                                                                                                Enviado
                                                                                                            </span>
                                                                                                        ) : ev.status === 'selected' ? (
                                                                                                            <span className="inline-flex py-1 px-3 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shadow-sm border border-blue-200">
                                                                                                                Selecionado
                                                                                                            </span>
                                                                                                        ) : ev.status === 'error' ? (
                                                                                                            <span className="inline-flex py-1 px-3 rounded-full bg-red-100 text-red-700 text-xs font-bold shadow-sm border border-red-200">
                                                                                                                Erro Validação
                                                                                                            </span>
                                                                                                        ) : (
                                                                                                            <span className="inline-flex py-1 px-3 rounded-full bg-amber-50 text-amber-600 text-xs font-bold border border-amber-100">
                                                                                                                Pendente
                                                                                                            </span>
                                                                                                        )}
                                                                                                    </td>
                                                                                                    <td className="p-4 text-right text-xs font-medium text-slate-500 font-mono">
                                                                                                        {formatDateBR(new Date().toISOString())}
                                                                                                    </td>
                                                                                                </tr>
                                                                                            ))}
                                                                                        {obs.esocialEvents?.filter((ev: any) => ev.group === activePhaseTab).length === 0 && (
                                                                                            <tr>
                                                                                                <td colSpan={5} className="p-12 text-center text-slate-400">
                                                                                                    <div className="flex flex-col items-center gap-3 opacity-60">
                                                                                                        <Database size={32} />
                                                                                                        <p className="text-sm font-medium">Nenhum evento para esta fase.</p>
                                                                                                    </div>
                                                                                                </td>
                                                                                            </tr>
                                                                                        )}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>

                                                                            {/* Footer / Actions */}
                                                                            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="bg-blue-600 text-white rounded-full p-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                                                                                        <CheckCircle size={10} />
                                                                                    </div>
                                                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                                                        {obs.esocialEvents?.filter((ev: any) => ev.status === 'selected').length} eventos selecionados
                                                                                    </span>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            const updatedEvents = obs.esocialEvents?.map((ev: any) => ({ ...ev, status: ev.status === 'sent' ? 'sent' : 'pending' }));
                                                                                            updateFiling({ ...obs, esocialEvents: updatedEvents });
                                                                                        }}
                                                                                        className="text-xs text-slate-400 hover:text-red-500 font-bold ml-2 transition-colors"
                                                                                    >
                                                                                        • Limpar seleção
                                                                                    </button>
                                                                                </div>
                                                                                <div className="flex gap-3">
                                                                                    <button
                                                                                        onClick={() => setActiveObligationId(null)}
                                                                                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm"
                                                                                    >
                                                                                        Cancelar
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleTransmitObligation(obs)}
                                                                                        disabled={obs.esocialEvents?.filter((ev: any) => ev.status === 'selected').length === 0}
                                                                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                                                    >
                                                                                        Enviar Eventos <Send size={14} />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            )) : (
                                                <tr>
                                                    <td colSpan={5} className="p-12 text-center text-slate-400 text-sm">
                                                        Nenhuma declaração encontrada para este tipo.
                                                        <br />
                                                        <span className="text-xs opacity-70">Utilize o botão "Gerar Arquivo" acima.</span>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div >
    );
};

