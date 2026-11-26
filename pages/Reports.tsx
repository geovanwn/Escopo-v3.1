import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
    FileBarChart, Calendar, Printer,
    TrendingUp, Users, Package, FileText,
    FileSpreadsheet, ArrowDownLeft, ArrowUpRight, Wrench, Receipt, Calculator, Filter, Loader2, Search, Save, History, Eye, Trash2, ArrowRight,
    SlidersHorizontal, ArrowDownCircle, ArrowUpCircle, Briefcase, CheckCircle2, Circle
} from 'lucide-react';
import { formatDateBR, parseDateSafe, maskDate } from '../utils/formatters';
import { Modal } from '../components/ui/Modal';
import * as XLSX from 'xlsx';
import type { ReportTotalizer } from '../utils/pdfReport';
import { jsPDF } from 'jspdf';
import { SIMPLES_ANNEXES } from '../utils/fiscalCalculations';

// Tab Definitions
type TabType = 'entries' | 'outputs' | 'services' | 'receipts' | 'taxes' | 'mei_revenue';

export const Reports: React.FC = () => {
    const { invoices, employees, products, selectedCompany, savedReports, addSavedReport, deleteItem } = useData();

    // Global State
    const [activeTab, setActiveTab] = useState<TabType>('entries');
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toLocaleDateString('pt-BR');
    });
    const [endDate, setEndDate] = useState(() => new Date().toLocaleDateString('pt-BR'));
    const [signatureDate, setSignatureDate] = useState(() => new Date().toLocaleDateString('pt-BR'));
    const [generatedData, setGeneratedData] = useState<any[] | null>(null);
    const [reportTitle, setReportTitle] = useState('');

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [globalFilter, setGlobalFilter] = useState('');
    const [meiSubTab, setMeiSubTab] = useState<'calc' | 'history'>('calc');
    const [isGenerating, setIsGenerating] = useState(false);

    // Specific Filters (Flags)
    const [filters, setFilters] = useState({
        entries: { purchase: true, return: true },
        outputs: { sale: true, returnIn: true },
        services: { provided: true, taken: true },
        receipts: { in: true, out: true }
    });

    const handleFilterChange = (tab: keyof typeof filters, key: string) => {
        setFilters(prev => ({
            ...prev,
            [tab]: {
                ...prev[tab],
                [key as any]: !prev[tab][key as keyof typeof prev[typeof tab]]
            }
        }));
    };

    // Auto-clear data when tab changes to avoid confusion
    useEffect(() => {
        setGeneratedData(null);
        setReportTitle('');
        setColumnFilters({});
        setGlobalFilter('');
    }, [activeTab]);

    const filteredData = React.useMemo(() => {
        if (!generatedData) return null;
        return generatedData.filter(row => {
            // Check Global Filter
            const searchStr = globalFilter.toLowerCase();
            const matchesGlobal = !globalFilter || Object.values(row).some(val =>
                String(val || '').toLowerCase().includes(searchStr)
            );

            if (!matchesGlobal) return false;

            // Check Column Filters
            return Object.entries(columnFilters).every(([col, value]) => {
                if (!value) return true;
                const cellValue = String(row[col] || '').toLowerCase();
                return cellValue.includes(value.toLowerCase());
            });
        });
    }, [generatedData, columnFilters, globalFilter]);

    const CANCELLED_STATUSES = ['CANCELADA', 'CANCELADO', 'REPROVADO', 'SUBSTITUIDA', 'ANULADA', 'NEGADA', 'RECUSADA'];

    const reportTotals = React.useMemo(() => {
        if (!filteredData || filteredData.length === 0) return null;

        // Valor Total Bruto (todas as notas do relatório)
        const totalValue = filteredData.reduce((acc, row) => {
            const valKey = Object.keys(row).find(h => ['valor total', 'valor', 'saldo'].some(k => h.toLowerCase().includes(k)));
            return acc + (valKey ? (Number(row[valKey]) || 0) : 0);
        }, 0);

        // Filtrar apenas notas NÃO canceladas para cálculo de Valor Líquido e Impostos
        const activeRows = filteredData.filter(row => {
            const statusKey = Object.keys(row).find(h => h.toLowerCase() === 'status');
            if (!statusKey) return true;
            const statusVal = String(row[statusKey] || '').toUpperCase().trim();
            return !CANCELLED_STATUSES.includes(statusVal);
        });

        const cancelledRows = filteredData.filter(row => {
            const statusKey = Object.keys(row).find(h => h.toLowerCase() === 'status');
            if (!statusKey) return false;
            const statusVal = String(row[statusKey] || '').toUpperCase().trim();
            return CANCELLED_STATUSES.includes(statusVal);
        });

        // Valor das notas canceladas
        const totalCancelado = cancelledRows.reduce((acc, row) => {
            const valKey = Object.keys(row).find(h => ['valor total', 'valor', 'saldo'].some(k => h.toLowerCase().includes(k)));
            return acc + (valKey ? (Number(row[valKey]) || 0) : 0);
        }, 0);

        // Valor Líquido = Total Bruto - Canceladas
        const valorLiquido = totalValue - totalCancelado;

        // Total de Impostos calculado APENAS sobre notas ativas (não canceladas)
        const totalTax = activeRows.reduce((acc, row) => {
            const taxKey = Object.keys(row).find(h => ['impostos', 'iss', 'icms', 'retenções'].some(k => h.toLowerCase().includes(k)));
            return acc + (taxKey ? (Number(row[taxKey]) || 0) : 0);
        }, 0);

        return { totalValue, totalTax, valorLiquido, totalCancelado };
    }, [filteredData]);

    const handleGenerate = async () => {
        if (!selectedCompany) {
            alert('Por favor, selecione uma empresa antes de gerar relatórios.');
            return;
        }

        if (startDate.length < 10 || endDate.length < 10) {
            alert('Por favor, preencha as datas de início e fim corretamente (DD/MM/AAAA).');
            return;
        }

        const start = parseDateSafe(startDate);
        const end = parseDateSafe(endDate);
        end.setHours(23, 59, 59, 999);

        if (start > end) {
            alert('A data de início não pode ser maior que a data de fim.');
            return;
        }

        setIsGenerating(true);

        // Small timeout to show loading and ensure smooth UI
        await new Promise(r => setTimeout(r, 600));

        try {
            let data: any[] = [];

            // Helper for Date filtering
            const dateMatch = (dateStr: string) => {
                const d = parseDateSafe(dateStr);
                return d >= start && d <= end;
            };

            // Simples Nacional Rate Logic (Cálculo Progressivo com RBT12)
            const isSimples = selectedCompany?.regimeTributario === '1' || selectedCompany?.regimeTributario === 'simples';
            let simplesRate = 0;
            if (isSimples && selectedCompany) {
                // Calcular RBT12
                const twelveMonthsAgo = new Date(start);
                twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
                const validStatuses = ['autorizada', 'paga', 'recebida', 'pendente'];
                const invalidStatuses = ['cancelada', 'substituida', 'anulada', 'negada', 'recusada'];
                const rbt12 = invoices
                    .filter(i => i.companyId === selectedCompany.id)
                    .filter(i => (i.type === 'exit' || i.type === 'service') && validStatuses.includes(i.status) && !invalidStatuses.includes(i.status as any))
                    .filter(i => {
                        const d = parseDateSafe(i.date);
                        return d >= twelveMonthsAgo && d < start;
                    })
                    .reduce((sum, i) => sum + i.value, 0);

                // Proporcionalizar se empresa tem menos de 12 meses
                const openingDateStr = selectedCompany.openingDate || '2025-03-22';
                const openingDate = parseDateSafe(openingDateStr);
                const diffMonths = (start.getFullYear() - openingDate.getFullYear()) * 12 + (start.getMonth() - openingDate.getMonth());
                let rbt12Calc = rbt12;
                if (diffMonths < 12 && diffMonths > 0) {
                    rbt12Calc = (rbt12 / diffMonths) * 12;
                } else if (diffMonths === 0) {
                    rbt12Calc = 180000; // Fallback 1ª faixa
                }

                // Determinar Anexo
                let annexKey = 'III';
                if (selectedCompany.ramoAtividade === 'comercio') annexKey = 'I';
                else if (selectedCompany.ramoAtividade === 'industria') annexKey = 'II';
                else annexKey = (selectedCompany as any).anexoSimples || 'III';

                const annexTable = SIMPLES_ANNEXES[annexKey] || SIMPLES_ANNEXES['III'];
                const tierIndex = annexTable.findIndex(t => rbt12Calc <= t.limit);
                const tier = tierIndex !== -1 ? annexTable[tierIndex] : annexTable[annexTable.length - 1];

                // Alíquota Efetiva = ((RBT12 × Aliq.Nom.) – Parcela a Deduzir) / RBT12
                simplesRate = rbt12Calc > 0 ? ((rbt12Calc * tier.rate) - tier.ded) / rbt12Calc : tier.rate;
                if (simplesRate < 0) simplesRate = 0;
            }

            switch (activeTab) {
                case 'entries':
                    data = invoices.filter(i => {
                        if (!dateMatch(i.date)) return false;
                        if (i.type !== 'entry') return false;

                        const natOp = (i.naturezaOperacao || '').toLowerCase();
                        const isDevolucao = natOp.includes('devol') || natOp.includes('retorno') || natOp.includes('saída');

                        if (filters.entries.purchase && !isDevolucao) return true;
                        if (filters.entries.return && isDevolucao) return true;
                        return false;
                    }).map(i => ({
                        'Data': formatDateBR(i.date),
                        'Número': i.number,
                        'Tipo': i.naturezaOperacao || 'Compra',
                        'Parceiro': i.entityName,
                        'Valor': i.value,
                        'ISS / Retenções': isSimples ? (i.value * simplesRate) : (i.taxValue || 0),
                        'Status': (i.status || 'pendente').toUpperCase()
                    }));
                    setReportTitle('Relatório de Entradas');
                    break;

                case 'outputs':
                    data = invoices.filter(i => {
                        if (!dateMatch(i.date)) return false;
                        if (i.type !== 'exit') return false;

                        const natOp = (i.naturezaOperacao || '').toLowerCase();
                        const isDevolucao = natOp.includes('devol') || natOp.includes('retorno') || natOp.includes('entrada');

                        if (filters.outputs.sale && !isDevolucao) return true;
                        if (filters.outputs.returnIn && isDevolucao) return true;
                        return false;
                    }).map(i => ({
                        'Data': formatDateBR(i.date),
                        'Número': i.number,
                        'Tipo': i.naturezaOperacao || 'Venda',
                        'Parceiro': i.entityName,
                        'Valor': i.value,
                        'ISS / Retenções': isSimples ? (i.value * simplesRate) : (i.taxValue || 0),
                        'Status': (i.status || 'pendente').toUpperCase()
                    }));
                    setReportTitle('Relatório de Saídas');
                    break;

                case 'services':
                    data = invoices.filter(i => {
                        if (!dateMatch(i.date)) return false;

                        const natOp = (i.naturezaOperacao || '').toLowerCase();
                        let valid = false;
                        if (filters.services.provided) {
                            if (i.type === 'service' && !natOp.includes('toma')) valid = true;
                        }
                        if (filters.services.taken) {
                            if (natOp.includes('toma') || (i.type === 'entry' && natOp.includes('servi'))) valid = true;
                        }

                        return valid;
                    }).map(i => ({
                        'Data': formatDateBR(i.date),
                        'Número': i.number,
                        'Tipo': (i.naturezaOperacao || '').includes('Tomada') ? 'Tomado' : 'Prestado',
                        'Parceiro': i.entityName,
                        'Valor': i.value,
                        'ISS / Retenções': isSimples && !((i.naturezaOperacao || '').includes('Tomada')) ? (i.value * 0.06) : (i.taxValue || 0),
                        'Status': (i.status || 'pendente').toUpperCase()
                    }));
                    setReportTitle('Relatório de Serviços');
                    break;

                case 'receipts':
                    data = invoices.filter(i => {
                        if (!dateMatch(i.date)) return false;
                        if (i.type !== 'receipt') return false;

                        const natOp = (i.naturezaOperacao || '').toLowerCase();
                        const isOut = natOp.includes('pagamento') || natOp.includes('saída');
                        const isIn = !isOut;

                        if (filters.receipts.in && isIn) return true;
                        if (filters.receipts.out && isOut) return true;
                        return false;
                    }).map(i => ({
                        'Data': formatDateBR(i.date),
                        'Fluxo': (i.naturezaOperacao || '').toLowerCase().includes('pagamento') ? 'Saída' : 'Entrada',
                        'Número': i.number,
                        'Parceiro': i.entityName,
                        'Histórico': i.naturezaOperacao,
                        'Valor': i.value
                    }));
                    setReportTitle('Relatório de Recibos');
                    break;

                case 'mei_revenue':
                    const meiInvoices = invoices.filter(i => {
                        if (!dateMatch(i.date)) return false;
                        const status = (i.status || '').toLowerCase();
                        if (status === 'cancelada') return false;

                        // Filtro específico para serviços (ISS) conforme solicitado: apenas Autorizada e Extemporânea
                        if (i.type === 'service') {
                            return status === 'autorizada' || status === 'extemporanea';
                        }

                        return true;
                    });

                    // I - Revenda (Comércio) - Sem NF (Receipts or manual without doc)
                    const commerceWithoutNF = meiInvoices
                        .filter(i => i.type === 'exit' && !i.number && !i.accessKey)
                        .reduce((sum, i) => sum + i.value, 0);

                    // II - Revenda (Comércio) - Com NF (Invoices with number)
                    const commerceWithNF = meiInvoices
                        .filter(i => i.type === 'exit' && (i.number || i.accessKey))
                        .reduce((sum, i) => sum + i.value, 0);

                    // IV - Indústria - Sem NF
                    const industryWithoutNF = meiInvoices
                        .filter(i => i.type === 'entry' && !i.number && i.naturezaOperacao?.toLowerCase().includes('indústria'))
                        .reduce((sum, i) => sum + i.value, 0); // Usually MEI Indústria is rare, but let's check NATUREZA

                    // V - Indústria - Com NF
                    const industryWithNF = meiInvoices
                        .filter(i => i.type === 'exit' && (i.number || i.accessKey) && i.naturezaOperacao?.toLowerCase().includes('indústria'))
                        .reduce((sum, i) => sum + i.value, 0);

                    // VII - Serviços - Sem NF
                    const servicesWithoutNF = meiInvoices
                        .filter(i => (i.type === 'service' || i.type === 'receipt') && !i.number && !i.accessKey && (i.type === 'service' || i.naturezaOperacao?.toLowerCase().includes('serviço')))
                        .reduce((sum, i) => sum + i.value, 0);

                    // VIII - Serviços - Com NF
                    const servicesWithNF = meiInvoices
                        .filter(i => i.type === 'service' && (i.number || i.accessKey))
                        .reduce((sum, i) => sum + i.value, 0);

                    data = [{
                        'razaoSocial': selectedCompany?.razaoSocial || 'NÃO IDENTIFICADA',
                        'cnpj': selectedCompany?.cnpj || '00.000.000/0000-00',
                        'periodo': `${startDate.split('/')[1]}/${startDate.split('/')[2]}`,
                        'commerceWithoutNF': commerceWithoutNF,
                        'commerceWithNF': commerceWithNF,
                        'commerceTotal': commerceWithoutNF + commerceWithNF,
                        'industryWithoutNF': industryWithoutNF,
                        'industryWithNF': industryWithNF,
                        'industryTotal': industryWithoutNF + industryWithNF,
                        'servicesWithoutNF': servicesWithoutNF,
                        'servicesWithNF': servicesWithNF,
                        'servicesTotal': servicesWithoutNF + servicesWithNF,
                        'grandTotal': (commerceWithoutNF + commerceWithNF) + (industryWithoutNF + industryWithNF) + (servicesWithoutNF + servicesWithNF),
                        'city': selectedCompany?.address?.city || '',
                        'uf': selectedCompany?.address?.uf || ''
                    }];
                    setReportTitle('Relatório Mensal de Receitas Brutas (MEI)');
                    break;
            }

            if (data.length === 0) {
                alert('Nenhum dado encontrado para o período e filtros selecionados.');
            }

            setGeneratedData(data);
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            alert('Ocorreu um erro ao processar os dados do relatório.');
        } finally {
            setIsGenerating(false);
        }
    };

    const formatValue = (header: string, value: any): string => {
        const numericKeywords = ['valor', 'custo', 'total', 'líquido', 'base', 'imposto', 'unitário', 'salário', 'proventos', 'descontos'];
        if (numericKeywords.some(k => header.toLowerCase().includes(k)) && typeof value === 'number') {
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
        }
        return String(value);
    };

    const handlePrint = () => {
        const dataToExport = filteredData || [];
        
        if (activeTab === 'mei_revenue' && dataToExport.length > 0) {
            const mei = dataToExport[0];
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 15;
            const contentWidth = pageWidth - (margin * 2);

            // Hex to RGB for jsPDF
            const colors = {
                slate800: [30, 41, 59],
                slate200: [226, 232, 240],
                slate100: [241, 245, 249],
                slate50: [248, 250, 252],
                blue50: [239, 246, 255]
            };

            let y = 15;

            // Header
            doc.setFillColor(colors.slate200[0], colors.slate200[1], colors.slate200[2]);
            doc.rect(margin, y, contentWidth, 12, 'F');
            doc.setDrawColor(colors.slate800[0], colors.slate800[1], colors.slate800[2]);
            doc.setLineWidth(0.5);
            doc.rect(margin, y, contentWidth, 12);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(colors.slate800[0], colors.slate800[1], colors.slate800[2]);
            doc.text('RELATÓRIO MENSAL DAS RECEITAS BRUTAS', pageWidth / 2, y + 7.5, { align: 'center' });
            y += 12;

            // Company Info Rows
            const drawGridRow = (label: string, value: string) => {
                const rowH = 8;
                doc.setDrawColor(colors.slate800[0], colors.slate800[1], colors.slate800[2]);
                doc.setLineWidth(0.3);
                doc.rect(margin, y, contentWidth, rowH);

                // Label Box (col-span-4)
                doc.setFillColor(colors.slate50[0], colors.slate50[1], colors.slate50[2]);
                doc.rect(margin, y, contentWidth * 0.33, rowH, 'F');
                doc.rect(margin, y, contentWidth * 0.33, rowH);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(colors.slate800[0], colors.slate800[1], colors.slate800[2]);
                doc.text(label, margin + 2, y + 5);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.text(value, margin + (contentWidth * 0.33) + 2, y + 5);
                y += rowH;
            };

            drawGridRow('EMPRESA:', String(mei.razaoSocial || ''));
            drawGridRow('CNPJ:', String(mei.cnpj || ''));

            // Period Row
            doc.setDrawColor(colors.slate800[0], colors.slate800[1], colors.slate800[2]);
            doc.rect(margin, y, contentWidth, 12);
            doc.setFillColor(colors.slate50[0], colors.slate50[1], colors.slate50[2]);
            doc.rect(margin, y, contentWidth * 0.33, 12, 'F');
            doc.rect(margin, y, contentWidth * 0.33, 12);
            doc.setFontSize(8);
            doc.text('PERÍODO DE APURAÇÃO:', margin + 2, y + 7);

            const cellW = (contentWidth * 0.67) / 2;
            doc.rect(margin + (contentWidth * 0.33), y, cellW, 12);
            doc.setFontSize(6);
            doc.setTextColor(100, 100, 100);
            doc.text('MÊS', margin + (contentWidth * 0.33) + (cellW / 2), y + 4, { align: 'center' });
            doc.setFontSize(9);
            doc.setTextColor(colors.slate800[0], colors.slate800[1], colors.slate800[2]);
            doc.text(mei.periodo.split('/')[0], margin + (contentWidth * 0.33) + (cellW / 2), y + 9, { align: 'center' });

            doc.rect(margin + (contentWidth * 0.33) + cellW, y, cellW, 12);
            doc.setFontSize(6);
            doc.setTextColor(100, 100, 100);
            doc.text('ANO', margin + (contentWidth * 0.33) + cellW + (cellW / 2), y + 4, { align: 'center' });
            doc.setFontSize(9);
            doc.setTextColor(colors.slate800[0], colors.slate800[1], colors.slate800[2]);
            doc.text(mei.periodo.split('/')[1], margin + (contentWidth * 0.33) + cellW + (cellW / 2), y + 9, { align: 'center' });
            y += 12;

            // Revenue Sections
            const drawSectionHeader = (title: string) => {
                doc.setFillColor(colors.slate200[0], colors.slate200[1], colors.slate200[2]);
                doc.rect(margin, y, contentWidth, 8, 'F');
                doc.setDrawColor(colors.slate800[0], colors.slate800[1], colors.slate800[2]);
                doc.rect(margin, y, contentWidth, 8);
                doc.setFontSize(7.5);
                doc.setTextColor(colors.slate800[0], colors.slate800[1], colors.slate800[2]);
                doc.text(title, pageWidth / 2, y + 5, { align: 'center' });
                y += 8;
            };

            const drawRevenueRow = (label: string, val: number, isTotal = false) => {
                const rowH = 8;
                if (isTotal) {
                    doc.setFillColor(colors.blue50[0], colors.blue50[1], colors.blue50[2]);
                    doc.rect(margin, y, contentWidth, rowH, 'F');
                }
                doc.setDrawColor(colors.slate800[0], colors.slate800[1], colors.slate800[2]);
                doc.rect(margin, y, contentWidth, rowH);
                doc.line(margin + (contentWidth * 0.8), y, margin + (contentWidth * 0.8), y + rowH);

                doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
                doc.setFontSize(7);
                doc.text(label, margin + 2, y + 5, { maxWidth: contentWidth * 0.75 });

                doc.setFont('courier', 'bold');
                doc.text(formatValue('valor', val), pageWidth - margin - 2, y + 5, { align: 'right' });
                y += rowH;
            };

            drawSectionHeader('RECEITA BRUTA MENSAL – REVENDA DE MERCADORIAS (COMÉRCIO)');
            drawRevenueRow('I – Revenda de mercadorias com dispensa de emissão de documento fiscal', mei.commerceWithoutNF);
            drawRevenueRow('II – Revenda de mercadorias com documento fiscal emitido', mei.commerceWithNF);
            drawRevenueRow('III – Total das receitas com revenda de mercadorias (I + II)', mei.commerceTotal, true);

            drawSectionHeader('RECEITA BRUTA MENSAL – VENDA DE PRODUTOS INDUSTRIALIZADOS (INDÚSTRIA)');
            drawRevenueRow('IV – Venda de produtos industrializados com dispensa de emissão de documento fiscal', mei.industryWithoutNF);
            drawRevenueRow('V – Venda de produtos industrializados com documento fiscal emitido', mei.industryWithNF);
            drawRevenueRow('VI – Total das receitas com venda de produtos industrializados (IV + V)', mei.industryTotal, true);

            drawSectionHeader('RECEITA BRUTA MENSAL – PRESTAÇÃO DE SERVIÇOS');
            drawRevenueRow('VII – Receita com prestação de serviços com dispensa de emissão de documento fiscal', mei.servicesWithoutNF);
            drawRevenueRow('VIII – Receita com prestação de serviços com documento fiscal emitido', mei.servicesWithNF);
            drawRevenueRow('IX – Total das receitas com prestação de serviços (VII + VIII)', mei.servicesTotal, true);

            // Grand Total Row
            doc.setFillColor(colors.slate100[0], colors.slate100[1], colors.slate100[2]);
            doc.rect(margin, y, contentWidth, 10, 'F');
            doc.rect(margin, y, contentWidth, 10);
            doc.line(margin + (contentWidth * 0.8), y, margin + (contentWidth * 0.8), y + 10);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('X - TOTAL GERAL DAS RECEITAS BRUTAS NO MÊS (III + VI + IX)', margin + 2, y + 6.5);
            doc.setFont('courier', 'bold');
            doc.text(formatValue('valor', mei.grandTotal), pageWidth - margin - 2, y + 6.5, { align: 'right' });
            y += 10;

            // Footer Signature
            doc.rect(margin, y, contentWidth * 0.6, 20);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6);
            doc.setTextColor(100, 100, 100);
            doc.text('LOCAL E DATA:', margin + 2, y + 5);
            doc.setFontSize(8);
            doc.setTextColor(0);
            const locationStr = `${mei.city || 'CIDADE'}${mei.uf ? ' - ' + mei.uf : ''}`;
            const sigDateObj = parseDateSafe(signatureDate);
            const dateStr = sigDateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
            doc.text(`${locationStr}, ${dateStr}`, margin + 2, y + 12);

            doc.setFillColor(252, 252, 252);
            doc.rect(margin + (contentWidth * 0.6), y, contentWidth * 0.4, 20, 'F');
            doc.rect(margin + (contentWidth * 0.6), y, contentWidth * 0.4, 20);
            doc.setLineDashPattern([1, 1], 0);
            doc.line(margin + (contentWidth * 0.6) + 10, y + 14, margin + contentWidth - 10, y + 14);
            doc.setLineDashPattern([], 0);
            doc.text('ASSINATURA', margin + (contentWidth * 0.6) + (contentWidth * 0.2), y + 17, { align: 'center' });
            y += 20;

            // Legal Basis Box
            y += 5;
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, y, contentWidth, 20, 'F');
            doc.setDrawColor(200, 200, 200);
            doc.rect(margin, y, contentWidth, 20);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.text('DOCUMENTAÇÃO COMPROBATÓRIA:', margin + 2, y + 5);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(6);
            const legalDisc = 'Deverão ser anexados a este relatório os documentos fiscais comprobatórios das entradas de mercadorias e serviços tomados referentes ao período, bem como as notas fiscais relativas às operações ou prestações realizadas eventualmente emitidas, mantendo-os em poder do contribuinte pelo prazo de 5 (cinco) anos.';
            doc.text(legalDisc, margin + 2, y + 8, { maxWidth: contentWidth - 4 });

            y += 13;
            doc.setFillColor(colors.slate200[0], colors.slate200[1], colors.slate200[2]);
            doc.rect(margin + 2, y, contentWidth - 4, 5, 'F');
            doc.setDrawColor(180, 180, 180);
            doc.rect(margin + 2, y, contentWidth - 4, 5);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.text('EMBASAMENTO LEGAL: Art. 106, § 1º, da Resolução CGSN nº 140, de 2018.', margin + contentWidth / 2, y + 3.5, { align: 'center' });

            setPreviewUrl(doc.output('bloburl').toString());
            setIsPreviewOpen(true);
            return;
        }

        import('../utils/pdfReport').then(async ({ generatePDFReport }) => {
            let headers: string[] = [];
            if (dataToExport.length > 0) {
                headers = Object.keys(dataToExport[0]);
            } else {
                switch (activeTab) {
                    case 'entries': headers = ['Data', 'Número', 'Tipo', 'Parceiro', 'Valor', 'ISS / Retenções', 'Status']; break;
                    case 'outputs': headers = ['Data', 'Número', 'Tipo', 'Parceiro', 'Valor', 'ISS / Retenções', 'Status']; break;
                    case 'services': headers = ['Data', 'Número', 'Tipo', 'Parceiro', 'Valor', 'ISS / Retenções', 'Status']; break;
                    case 'receipts': headers = ['Data', 'Fluxo', 'Número', 'Parceiro', 'Histórico', 'Valor']; break;
                    case 'taxes': headers = ['Data', 'Imposto', 'Período', 'Vencimento', 'Valor', 'Status']; break;
                    default: headers = ['Data', 'Número', 'Parceiro', 'Natureza', 'Valor', 'Status']; break;
                }
            }

            const columns = headers.map(h => ({
                header: h,
                dataKey: h,
                halign: ['valor', 'total', 'imposto', 'saldo', 'custo'].some(k => h.toLowerCase().includes(k)) ? 'right' as const : 'left' as const,
                format: (val: any) => formatValue(h, val)
            }));

            // If empty, we can provide a dummy row to indicate no movement, or just let it generate empty
            const dataToRender = dataToExport.length > 0 ? dataToExport : [{ [headers[0]]: 'SEM MOVIMENTO NO PERÍODO' }];

            const count = dataToExport.length;
            const totalValue = dataToExport.reduce((acc, row) => {
                const valKey = headers.find(h => ['valor total', 'valor', 'saldo'].some(k => h.toLowerCase().includes(k)));
                return acc + (valKey ? (Number(row[valKey]) || 0) : 0);
            }, 0);

            // Filtrar notas ativas (não canceladas) para cálculos líquidos
            const activeExportRows = dataToExport.filter(row => {
                const statusKey = headers.find(h => h.toLowerCase() === 'status');
                if (!statusKey) return true;
                const statusVal = String(row[statusKey] || '').toUpperCase().trim();
                return !CANCELLED_STATUSES.includes(statusVal);
            });

            const cancelledExportRows = dataToExport.filter(row => {
                const statusKey = headers.find(h => h.toLowerCase() === 'status');
                if (!statusKey) return false;
                const statusVal = String(row[statusKey] || '').toUpperCase().trim();
                return CANCELLED_STATUSES.includes(statusVal);
            });

            const totalCanceladoPdf = cancelledExportRows.reduce((acc, row) => {
                const valKey = headers.find(h => ['valor total', 'valor', 'saldo'].some(k => h.toLowerCase().includes(k)));
                return acc + (valKey ? (Number(row[valKey]) || 0) : 0);
            }, 0);

            const valorLiquidoPdf = totalValue - totalCanceladoPdf;

            // Total de Impostos apenas sobre notas ativas
            const totalTax = activeExportRows.reduce((acc, row) => {
                const taxKey = headers.find(h => ['impostos', 'iss', 'icms', 'retenções'].some(k => h.toLowerCase().includes(k)));
                return acc + (taxKey ? (Number(row[taxKey]) || 0) : 0);
            }, 0);

            const totalizers: ReportTotalizer[] = [
                { label: 'Total de Registros', value: count, icon: 'hash' },
                { label: 'Valor Líquido', value: valorLiquidoPdf, icon: 'dollar', color: 'green' as const },
                { label: 'Valor Total Bruto', value: totalValue, icon: 'dollar', color: 'blue' },
            ];

            if (['outputs', 'services', 'taxes'].includes(activeTab)) {
                totalizers.splice(2, 0, { label: 'Total de Impostos', value: totalTax, icon: 'percent' as const, color: 'orange' as const });
            }

            const doc = await generatePDFReport(
                selectedCompany || undefined,
                columns,
                dataToRender,
                totalizers,
                {
                    title: reportTitle,
                    period: `${formatDateBR(startDate)} - ${formatDateBR(endDate)}`,
                    signatureDate: signatureDate,
                    status: 'FINALIZADO',
                    fileName: `${reportTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`
                },
                true
            );

            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            setIsPreviewOpen(true);
        });
    };
    const handleSaveReport = async () => {
        if (!generatedData || generatedData.length === 0 || !selectedCompany) {
            alert('Gere um relatório antes de salvar.');
            return;
        }

        try {
            const report = {
                id: Math.random().toString(36).substr(2, 9),
                companyId: selectedCompany.id,
                type: activeTab,
                title: reportTitle,
                period: `${startDate} - ${endDate}`,
                data: generatedData[0],
                createdAt: new Date().toISOString(),
                createdBy: 'Sistema'
            };

            await addSavedReport(report as any);
            alert('Relatório de apuração salvo com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar relatório:', error);
            alert('Erro ao salvar o relatório.');
        }
    };

    const handleExportExcel = () => {
        const dataToExport = filteredData || [];
        if (dataToExport.length === 0) return;
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
        XLSX.writeFile(workbook, `${reportTitle.toLowerCase().replace(/\s+/g, '_')}.xlsx`);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-1rem)] bg-slate-50 -m-6 p-6 overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-2.5 rounded-xl shadow-lg border border-slate-700/50">
                        <FileBarChart className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Relatórios Gerenciais</h1>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest opacity-70">Business Intelligence & Analytics</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {filteredData && (
                        <div className="flex gap-2 animate-in fade-in slide-in-from-right-4">
                            <Button variant="outline" onClick={handleExportExcel} icon={FileSpreadsheet} className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 bg-white dark:bg-slate-800 shadow-sm font-bold">EXCEL</Button>
                            <Button variant="secondary" onClick={handlePrint} icon={Printer} className="bg-white text-slate-700 dark:text-slate-200 border-slate-200 shadow-sm font-bold">PDF PREVIEW</Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">

                {/* Modern Colorful Tabs */}
                <div className="flex flex-wrap gap-4 shrink-0 overflow-x-auto pb-2">
                    <TabButton
                        id="entries"
                        label="Entradas"
                        icon={ArrowDownLeft}
                        activeTab={activeTab}
                        onClick={setActiveTab}
                        colorClass="emerald"
                    />
                    <TabButton
                        id="outputs"
                        label="Saídas"
                        icon={ArrowUpRight}
                        activeTab={activeTab}
                        onClick={setActiveTab}
                        colorClass="rose"
                    />
                    <TabButton
                        id="services"
                        label="Serviços"
                        icon={Wrench}
                        activeTab={activeTab}
                        onClick={setActiveTab}
                        colorClass="blue"
                    />
                    <TabButton
                        id="receipts"
                        label="Recibos"
                        icon={Receipt}
                        activeTab={activeTab}
                        onClick={setActiveTab}
                        colorClass="amber"
                    />
                    <TabButton
                        id="taxes"
                        label="Impostos"
                        icon={Calculator}
                        activeTab={activeTab}
                        onClick={setActiveTab}
                        colorClass="purple"
                    />
                    <TabButton
                        id="mei_revenue"
                        label="Receita MEI"
                        icon={FileText}
                        activeTab={activeTab}
                        onClick={setActiveTab}
                        colorClass="indigo"
                    />
                </div>

                {activeTab === 'mei_revenue' && (
                    <div className="max-w-7xl mx-auto px-6 mb-4 flex gap-2">
                        <button
                            onClick={() => setMeiSubTab('calc')}
                            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${meiSubTab === 'calc' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 -translate-y-0.5' : 'bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-100'}`}
                        >
                            Nova Apuração
                        </button>
                        <button
                            onClick={() => setMeiSubTab('history')}
                            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${meiSubTab === 'history' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 -translate-y-0.5' : 'bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-100'}`}
                        >
                            Histórico de Lançamentos
                        </button>
                    </div>
                )}

                <div className="flex-1 flex flex-col p-0 overflow-hidden border-0 shadow-2xl bg-white dark:bg-slate-800 ring-1 ring-slate-200/50 rounded-2xl">
                    {/* Tab Body */}
                    <div className="flex-1 flex flex-col p-6 overflow-hidden">

                        {/* Vibrant Filter Section */}
                        <div className={`mb-8 p-1 rounded-[2rem] border shadow-2xl shadow-slate-200/50 flex flex-wrap items-center gap-4 active-in-zoom
                            ${activeTab === 'entries' ? 'bg-emerald-50/50 border-emerald-100' :
                                activeTab === 'outputs' ? 'bg-rose-50/50 border-rose-100' :
                                    activeTab === 'services' ? 'bg-blue-50/50 border-blue-100' :
                                        activeTab === 'receipts' ? 'bg-amber-50/50 border-amber-100' :
                                            'bg-white border-slate-200'
                            }`}>

                            {/* Title Block */}
                            <div className="pl-8 pr-6 py-6 flex flex-col justify-center border-r border-slate-200/50 hidden md:flex min-w-[240px]">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2 flex items-center gap-2">
                                    <SlidersHorizontal size={12} />
                                    Configuração
                                </span>
                                <h2 className={`text-2xl font-black tracking-tight flex items-center gap-3
                                    ${activeTab === 'entries' ? 'text-emerald-900' :
                                        activeTab === 'outputs' ? 'text-rose-900' :
                                            activeTab === 'services' ? 'text-blue-900' :
                                                activeTab === 'receipts' ? 'text-amber-900' : 'text-slate-800'
                                    }`}>
                                    {activeTab === 'entries' && <ArrowDownCircle size={24} className="text-emerald-500" />}
                                    {activeTab === 'outputs' && <ArrowUpCircle size={24} className="text-rose-500" />}
                                    {activeTab === 'services' && <Briefcase size={24} className="text-blue-500" />}
                                    {activeTab === 'receipts' && <FileText size={24} className="text-amber-500" />}

                                    {activeTab === 'entries' && 'Entradas'}
                                    {activeTab === 'outputs' && 'Saídas'}
                                    {activeTab === 'services' && 'Serviços'}
                                    {activeTab === 'receipts' && 'Recibos'}
                                    {activeTab === 'taxes' && 'Impostos'}
                                    {activeTab === 'mei_revenue' && 'Receita MEI'}
                                </h2>
                            </div>

                            {/* Controls Container */}
                            <div className="flex-1 flex items-center gap-6 px-4 py-3 overflow-x-auto custom-scrollbar">

                                {/* Date Filters */}
                                {['entries', 'outputs', 'services', 'receipts', 'taxes', 'mei_revenue'].includes(activeTab) && (
                                    <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                                        {activeTab === 'mei_revenue' && (
                                            <>
                                                <div className="px-4 py-1 hover:bg-slate-50 rounded-xl transition-colors group cursor-text" onClick={() => document.getElementById('sig-date')?.focus()}>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5 group-hover:text-blue-500">Assinatura</span>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            id="sig-date"
                                                            type="text"
                                                            value={signatureDate}
                                                            onChange={e => setSignatureDate(maskDate(e.target.value))}
                                                            placeholder="DD/MM/AAAA"
                                                            maxLength={10}
                                                            className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none w-24 p-0 focus:ring-0 placeholder:text-slate-300"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="w-px h-8 bg-slate-100"></div>
                                            </>
                                        )}
                                        <div className="px-4 py-1 hover:bg-slate-50 rounded-xl transition-colors group cursor-text" onClick={() => document.getElementById('start-date')?.focus()}>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5 group-hover:text-blue-500">De</span>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    id="start-date"
                                                    type="text"
                                                    value={startDate}
                                                    onChange={e => setStartDate(maskDate(e.target.value))}
                                                    placeholder="DD/MM/AAAA"
                                                    maxLength={10}
                                                    className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none w-24 p-0 focus:ring-0 placeholder:text-slate-300"
                                                />
                                            </div>
                                        </div>
                                        <div className="w-px h-8 bg-slate-100"></div>
                                        <div className="px-4 py-1 hover:bg-slate-50 rounded-xl transition-colors group cursor-text" onClick={() => document.getElementById('end-date')?.focus()}>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5 group-hover:text-blue-500">Até</span>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    id="end-date"
                                                    type="text"
                                                    value={endDate}
                                                    onChange={e => setEndDate(maskDate(e.target.value))}
                                                    placeholder="DD/MM/AAAA"
                                                    maxLength={10}
                                                    className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none w-24 p-0 focus:ring-0 placeholder:text-slate-300"
                                                />
                                            </div>
                                        </div>
                                        <div className="pr-2 text-slate-300">
                                            <Calendar size={18} />
                                        </div>
                                    </div>
                                )}

                                {/* Search Bar */}
                                <div className="group flex-1 min-w-[240px]">
                                    <div className="relative transform transition-all duration-300 group-hover:scale-[1.02]">
                                        <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            type="text"
                                            value={globalFilter}
                                            onChange={e => setGlobalFilter(e.target.value)}
                                            placeholder="O que você procura?"
                                            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>

                                {/* Modern Toggle Filters (Chips) */}
                                <div className="flex gap-3 shrink-0">
                                    {activeTab === 'entries' && (
                                        <>
                                            <button
                                                onClick={() => handleFilterChange('entries', 'purchase')}
                                                className={`px-5 py-3 rounded-xl border flex items-center gap-2 transition-all active:scale-95 ${filters.entries.purchase ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-500'}`}
                                            >
                                                {filters.entries.purchase ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                                <span className="text-xs font-black uppercase tracking-wide">Compras</span>
                                            </button>
                                            <button
                                                onClick={() => handleFilterChange('entries', 'return')}
                                                className={`px-5 py-3 rounded-xl border flex items-center gap-2 transition-all active:scale-95 ${filters.entries.return ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-white border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-500'}`}
                                            >
                                                {filters.entries.return ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                                <span className="text-xs font-black uppercase tracking-wide">Devoluções</span>
                                            </button>
                                        </>
                                    )}
                                    {activeTab === 'outputs' && (
                                        <>
                                            <button
                                                onClick={() => handleFilterChange('outputs', 'sale')}
                                                className={`px-5 py-3 rounded-xl border flex items-center gap-2 transition-all active:scale-95 ${filters.outputs.sale ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-500'}`}
                                            >
                                                {filters.outputs.sale ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                                <span className="text-xs font-black uppercase tracking-wide">Vendas</span>
                                            </button>
                                            <button
                                                onClick={() => handleFilterChange('outputs', 'returnIn')}
                                                className={`px-5 py-3 rounded-xl border flex items-center gap-2 transition-all active:scale-95 ${filters.outputs.returnIn ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-500'}`}
                                            >
                                                {filters.outputs.returnIn ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                                <span className="text-xs font-black uppercase tracking-wide">Devoluções</span>
                                            </button>
                                        </>
                                    )}
                                    {/* Add similar chips for services/receipts if needed, utilizing standard styles */}
                                    {activeTab === 'services' && (
                                        <>
                                            <button
                                                onClick={() => handleFilterChange('services', 'provided')}
                                                className={`px-5 py-3 rounded-xl border flex items-center gap-2 transition-all active:scale-95 ${filters.services.provided ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-200' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-500'}`}
                                            >
                                                {filters.services.provided ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                                <span className="text-xs font-black uppercase tracking-wide">Prestados</span>
                                            </button>
                                            <button
                                                onClick={() => handleFilterChange('services', 'taken')}
                                                className={`px-5 py-3 rounded-xl border flex items-center gap-2 transition-all active:scale-95 ${filters.services.taken ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-white border-slate-200 text-slate-500 hover:border-orange-300 hover:text-orange-500'}`}
                                            >
                                                {filters.services.taken ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                                <span className="text-xs font-black uppercase tracking-wide">Tomados</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 p-2 pl-6 border-l border-slate-200/50">
                                {generatedData && activeTab === 'mei_revenue' && (
                                    <>
                                        <Button onClick={handleSaveReport} variant="secondary" icon={Save} className="h-14 w-14 !p-0 rounded-2xl bg-white text-emerald-600 hover:bg-emerald-50 border-2 border-slate-100 hover:border-emerald-200 items-center justify-center flex shadow-sm hover:shadow-md transition-all" />
                                        <Button onClick={handlePrint} variant="secondary" icon={Printer} className="h-14 w-14 !p-0 rounded-2xl bg-white text-indigo-600 hover:bg-indigo-50 border-2 border-slate-100 hover:border-indigo-200 items-center justify-center flex shadow-sm hover:shadow-md transition-all" />
                                    </>
                                )}
                                <Button
                                    onClick={handleGenerate}
                                    icon={Filter}
                                    loading={isGenerating}
                                    className="bg-slate-900 text-white hover:bg-black shadow-xl shadow-slate-900/20 h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                                >
                                    Gerar Dados
                                </Button>
                            </div>
                        </div>

                        {activeTab === 'mei_revenue' && meiSubTab === 'history' ? (
                            <div className="flex-1 p-8 bg-slate-50/30 overflow-auto">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="space-y-1">
                                        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                                            <History size={32} className="text-indigo-600" />
                                            Histórico de Apurações
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Registros salvos: <span className="text-slate-900">{savedReports.filter(r => r.type === 'mei_revenue' && r.companyId === selectedCompany?.id).length}</span></p>
                                        </div>
                                    </div>
                                </div>

                                {savedReports.filter(r => r.type === 'mei_revenue' && r.companyId === selectedCompany?.id).length > 0 ? (
                                    <div className="flex flex-col gap-4">
                                        {savedReports
                                            .filter(r => r.type === 'mei_revenue' && r.companyId === selectedCompany?.id)
                                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                            .map((report, idx) => (
                                                <div
                                                    key={report.id}
                                                    className="group relative bg-white dark:bg-slate-800 rounded-3xl p-5 flex items-center gap-8 transition-all duration-300 hover:bg-indigo-50/20 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 ring-1 ring-slate-200/50"
                                                    style={{ animationDelay: `${idx * 50}ms` }}
                                                >
                                                    <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform duration-500">
                                                        <FileText size={20} className="text-white" />
                                                    </div>

                                                    <div className="flex-1 grid grid-cols-12 items-center gap-4">
                                                        <div className="col-span-3">
                                                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Período</h4>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-black text-slate-800 tracking-tight">{report.period.split(' - ')[0]}</span>
                                                                <ArrowRight size={12} className="text-slate-300" />
                                                                <span className="text-sm font-black text-slate-800 tracking-tight">{report.period.split(' - ')[1]}</span>
                                                            </div>
                                                        </div>

                                                        <div className="col-span-3">
                                                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Bruto</h4>
                                                            <p className="text-lg font-black text-emerald-600 tracking-tighter">
                                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(report.data.grandTotal)}
                                                            </p>
                                                        </div>

                                                        <div className="col-span-3">
                                                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Criado em</h4>
                                                            <div className="flex flex-col">
                                                                <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">{new Date(report.createdAt).toLocaleDateString('pt-BR')}</span>
                                                                <span className="text-[9px] font-bold text-slate-400 font-mono italic">{new Date(report.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                        </div>

                                                        <div className="col-span-3 flex justify-end gap-3 px-2">
                                                            <button
                                                                onClick={() => {
                                                                    setGeneratedData([report.data]);
                                                                    setReportTitle(report.title);
                                                                    setMeiSubTab('calc');
                                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                }}
                                                                className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-indigo-600 shadow-md active:scale-95"
                                                            >
                                                                <Eye size={14} />
                                                                Visualizar
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (confirm('Deseja realmente excluir esta apuração?')) {
                                                                        deleteItem('savedReports', report.id);
                                                                    }
                                                                }}
                                                                className="flex items-center justify-center w-11 h-11 bg-white dark:bg-slate-800 text-rose-500 border border-rose-100 rounded-xl transition-all hover:bg-rose-600 hover:text-white group/del"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <div className="py-32 bg-white dark:bg-slate-800 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center px-6">
                                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner animate-bounce duration-[3000ms]">
                                            <History size={40} className="text-slate-200" />
                                        </div>
                                        <h4 className="text-xl font-black text-slate-400 uppercase tracking-tighter mb-2">Sem Histórico Disponível</h4>
                                        <p className="text-sm text-slate-300 font-bold max-w-xs leading-relaxed uppercase">
                                            Gere sua primeira apuração e clique em <span className="text-emerald-500">Salvar</span> para iniciar seu histórico.
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>

                                {/* Results Table / MEI Report View */}
                                <div className="flex-1 overflow-auto bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner relative">
                                    {activeTab === 'mei_revenue' && generatedData && generatedData.length > 0 ? (
                                        <MEIReportView data={generatedData[0]} signatureDate={signatureDate} />
                                    ) : (
                                        <table className="w-full text-sm text-left border-collapse">
                                            <thead className="sticky top-0 bg-white z-10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] text-slate-500">
                                                <tr>
                                                    {generatedData && generatedData.length > 0 ? Object.keys(generatedData[0]).map(k => (
                                                        <th key={k} className="px-5 py-4 border-b border-slate-100 bg-white">
                                                            <div className="flex flex-col gap-2 min-w-[140px]">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-black uppercase text-[10px] tracking-[0.2em]">{k}</span>
                                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <SlidersHorizontal size={10} className="text-slate-300" />
                                                                    </div>
                                                                </div>
                                                                <div className="relative group/input">
                                                                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                                                                    <input
                                                                        type="text"
                                                                        value={columnFilters[k] || ''}
                                                                        onChange={e => setColumnFilters(prev => ({ ...prev, [k]: e.target.value }))}
                                                                        placeholder="Filtrar..."
                                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-[10px] font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 hover:bg-white"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </th>
                                                    )) : (
                                                        ['DATA', 'NÚMERO', 'PARCEIRO', 'NATUREZA', 'VALOR', 'STATUS'].map(k => (
                                                            <th key={k} className="px-5 py-5 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] border-b border-slate-100 text-center">{k}</th>
                                                        ))
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {filteredData && filteredData.length > 0 ? filteredData.map((row, i) => (
                                                    <tr key={i} className="group hover:bg-slate-50/80 transition-all duration-200">
                                                        {Object.keys(row).map(k => (
                                                            <td key={k} className={`px-5 py-5 text-slate-600 font-bold text-xs ${k.toLowerCase().includes('valor') || k.toLowerCase().includes('total') ? 'font-mono text-slate-900 tracking-tight' : ''}`}>
                                                                {k === 'Status' || k === 'STATUS' ? (
                                                                    <div className="flex">
                                                                        <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase border shadow-sm flex items-center gap-1.5 ${String(row[k] || '').toLowerCase() === 'paga' || String(row[k] || '').toLowerCase() === 'autorizada' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                            String(row[k] || '').toLowerCase() === 'pendente' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                                                                            }`}>
                                                                            <span className={`w-1.5 h-1.5 rounded-full ${String(row[k] || '').toLowerCase() === 'paga' || String(row[k] || '').toLowerCase() === 'autorizada' ? 'bg-emerald-500' :
                                                                                String(row[k] || '').toLowerCase() === 'pendente' ? 'bg-amber-500' : 'bg-slate-400'
                                                                                }`} />
                                                                            {formatValue(k, row[k])}
                                                                        </span>
                                                                    </div>
                                                                ) : formatValue(k, row[k])}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan={10} className="p-24 text-center align-middle">
                                                            <div className="flex flex-col items-center justify-center text-slate-300 gap-6 animate-in fade-in zoom-in duration-500">
                                                                <div className="p-6 bg-slate-50 rounded-[2rem] border-4 border-white shadow-xl shadow-slate-100">
                                                                    <FileBarChart size={48} className="text-slate-300" />
                                                                </div>
                                                                <div className="max-w-xs space-y-2">
                                                                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                                                                        {generatedData ? 'Nenhum lançamento encontrado' : 'Aguardando Geração'}
                                                                    </p>
                                                                    <p className="text-[11px] text-slate-400 font-bold leading-relaxed">
                                                                        {generatedData ? 'Tente ajustar os filtros ou o período de busca.' : 'Selecione o período e clique em "Gerar Dados" para visualizar o relatório.'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                            {reportTotals && (
                                                <tfoot className="sticky bottom-0 bg-slate-900 border-t-4 border-slate-900 shadow-2xl z-30">
                                                    <tr>
                                                        {Object.keys(generatedData?.[0] || {}).map((k, idx) => {
                                                            const isValue = ['valor', 'total', 'saldo'].some(x => k.toLowerCase().includes(x));
                                                            const isTax = ['impostos', 'iss', 'icms', 'retenções'].some(x => k.toLowerCase().includes(x));

                                                            // Skip columns 1 and 2 as they are merged into column 0
                                                            if (idx === 1 || idx === 2) return null;

                                                            if (isValue) {
                                                                return <td key={k} className="px-5 py-6 text-emerald-400 font-black font-mono text-sm bg-slate-800/50">{formatValue(k, reportTotals.totalValue)}</td>;
                                                            }
                                                            if (isTax) {
                                                                return <td key={k} className="px-5 py-6 text-rose-400 font-black font-mono text-sm">{formatValue(k, reportTotals.totalTax)}</td>;
                                                            }
                                                            if (idx === 0) {
                                                                return (
                                                                    <td key={k} colSpan={3} className="px-8 py-6 text-left font-black uppercase text-xs tracking-[0.2em] text-slate-400">
                                                                        TOTAIS GERAIS
                                                                    </td>
                                                                );
                                                            }
                                                            return <td key={k} className="px-5 py-6"></td>;
                                                        })}
                                                    </tr>
                                                </tfoot>
                                            )}
                                        </table>
                                    )}
                                </div>

                                {/* TOTALIZADORES VISUAIS */}
                                {reportTotals && (
                                    <div className="mt-6 shrink-0">
                                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3 pl-1">TOTALIZADORES</p>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            {/* Total de Registros */}
                                            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total de Registros</p>
                                                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 truncate">{filteredData?.length || 0}</p>
                                                </div>
                                                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl shrink-0">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
                                                </div>
                                            </div>

                                            {/* Total de Impostos (sobre notas ativas) */}
                                            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-orange-100 dark:border-orange-700/40 shadow-sm flex items-center gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total de Impostos</p>
                                                    <p className="text-xl font-black text-orange-600 dark:text-orange-400 mt-1 truncate">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reportTotals.totalTax)}</p>
                                                    <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Sobre notas ativas</p>
                                                </div>
                                                <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-xl shrink-0">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-500"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
                                                </div>
                                            </div>

                                            {/* Valor Líquido (desconta canceladas) */}
                                            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-700/40 shadow-sm flex items-center gap-3 ring-1 ring-emerald-200/50 dark:ring-emerald-700/30">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest">Valor Líquido</p>
                                                    <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1 truncate">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reportTotals.valorLiquido)}</p>
                                                    {reportTotals.totalCancelado > 0 && (
                                                        <p className="text-[9px] text-red-400 font-semibold mt-0.5 truncate">-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reportTotals.totalCancelado)} canceladas</p>
                                                    )}
                                                </div>
                                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl shrink-0">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                                </div>
                                            </div>

                                            {/* Valor Total Bruto */}
                                            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-blue-100 dark:border-blue-700/40 shadow-sm flex items-center gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor Total Bruto</p>
                                                    <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1 truncate">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reportTotals.totalValue)}</p>
                                                </div>
                                                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl shrink-0">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </>
                        )}
                    </div>
                </div>
            </div>


            {/* PDF Preview Modal */}
            <Modal
                isOpen={isPreviewOpen}
                onClose={() => {
                    setIsPreviewOpen(false);
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                }}
                title="Pré-visualização do Relatório"
                maxWidth="max-w-6xl"
            >
                <div className="flex flex-col h-[80vh]">
                    {previewUrl ? (
                        <iframe
                            src={previewUrl}
                            className="w-full h-full border-none rounded-lg"
                            title="Preview PDF"
                        />
                    ) : (
                        <div className="flex items-center justify-center flex-1">
                            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                        </div>
                    )}
                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                        <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Fechar</Button>
                        <Button variant="primary" onClick={() => {
                            const link = document.createElement('a');
                            link.href = previewUrl!;
                            link.download = `${reportTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`;
                            link.click();
                        }}>Download PDF</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

// --- UI COMPONENTS ---

const TabButton = ({ id, label, icon: Icon, activeTab, onClick, colorClass }: { id: TabType, label: string, icon: any, activeTab: TabType, onClick: (id: TabType) => void, colorClass: string }) => {
    const isActive = activeTab === id;

    const colors: Record<string, string> = {
        emerald: isActive ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50',
        rose: isActive ? 'bg-rose-600 text-white shadow-rose-200' : 'bg-white text-rose-600 border-rose-100 hover:bg-rose-50',
        blue: isActive ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-blue-600 border-blue-100 hover:bg-blue-50',
        amber: isActive ? 'bg-amber-500 text-white shadow-amber-200' : 'bg-white text-amber-500 border-amber-100 hover:bg-amber-50',
        purple: isActive ? 'bg-purple-600 text-white shadow-purple-200' : 'bg-white text-purple-600 border-purple-100 hover:bg-purple-50',
        indigo: isActive ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50',
    };

    return (
        <button
            onClick={() => onClick(id)}
            className={`flex flex-col items-center justify-center gap-3 p-5 rounded-2xl transition-all border-2 group relative overflow-hidden ${colors[colorClass]} ${isActive ? 'shadow-2xl -translate-y-1' : 'shadow-sm hover:-translate-y-0.5'}`}
        >
            {isActive && <div className="absolute top-0 right-0 p-1 opacity-20"><Icon size={48} className="-mr-4 -mt-4" /></div>}
            <Icon size={isActive ? 24 : 20} className={isActive ? 'animate-in zoom-in duration-300' : 'opacity-70 group-hover:scale-110 transition-transform'} />
            <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${isActive ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
        </button>
    );
};

const FilterCheckbox = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: () => void }) => (
    <label className={`flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer select-none border-2 px-4 py-2.5 rounded-xl transition-all shadow-sm ${checked ? 'bg-slate-900 border-slate-900 text-white shadow-slate-200' : 'bg-white border-slate-100 dark:border-slate-700 text-slate-500 hover:border-slate-300'}`}>
        <div className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center transition-all ${checked ? 'bg-blue-500 border-blue-500' : 'border-slate-300 bg-white'}`}>
            {checked && <div className="w-1.5 h-1.5 bg-white dark:bg-slate-800 rounded-[1px]" />}
        </div>
        <input type="checkbox" checked={checked} onChange={onChange} className="hidden" />
        <span>{label}</span>
    </label>
);

const MEIReportView = ({ data, signatureDate }: { data: any, signatureDate: string }) => {
    const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const sigDateObj = parseDateSafe(signatureDate);
    const longDate = sigDateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="w-full flex justify-center py-8 bg-slate-50 min-h-full">
            <div className="p-4 sm:p-8 w-full max-w-3xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 my-4">
                <div className="border-2 border-slate-800">
                    {/* Header */}
                    <div className="bg-slate-200 p-4 text-center border-b-2 border-slate-800">
                        <h2 className="text-lg font-black uppercase tracking-tighter">RELATÓRIO MENSAL DAS RECEITAS BRUTAS</h2>
                    </div>

                    {/* Company Info */}
                    <div className="grid grid-cols-12 border-b-2 border-slate-800">
                        <div className="col-span-4 p-2 border-r-2 border-slate-800 font-black text-xs uppercase bg-slate-50">EMPRESA:</div>
                        <div className="col-span-8 p-2 font-bold text-xs uppercase">{data.razaoSocial}</div>
                    </div>
                    <div className="grid grid-cols-12 border-b-2 border-slate-800">
                        <div className="col-span-4 p-2 border-r-2 border-slate-800 font-black text-xs uppercase bg-slate-50">CNPJ:</div>
                        <div className="col-span-8 p-2 font-bold text-xs uppercase font-mono">{data.cnpj}</div>
                    </div>

                    {/* Period */}
                    <div className="grid grid-cols-12 border-b-2 border-slate-800">
                        <div className="col-span-4 p-2 border-r-2 border-slate-800 font-black text-xs uppercase bg-slate-50">Período de apuração:</div>
                        <div className="col-span-4 p-2 border-r-2 border-slate-800 text-center">
                            <p className="text-[10px] font-black uppercase text-slate-500">MÊS</p>
                            <p className="font-bold uppercase text-xs">{data.periodo.split('/')[0]}</p>
                        </div>
                        <div className="col-span-4 p-2 text-center">
                            <p className="text-[10px] font-black uppercase text-slate-500">ANO</p>
                            <p className="font-bold uppercase text-xs">{data.periodo.split('/')[1]}</p>
                        </div>
                    </div>

                    {/* Section 1: Commerce */}
                    <div className="bg-slate-200 p-2 text-center border-b-2 border-slate-800">
                        <h3 className="text-xs font-black uppercase">RECEITA BRUTA MENSAL – REVENDA DE MERCADORIAS (COMÉRCIO)</h3>
                    </div>
                    <div className="grid grid-cols-12 border-b-2 border-slate-800">
                        <div className="col-span-10 p-2 border-r-2 border-slate-800 text-xs font-bold leading-tight">
                            I – Revenda de mercadorias com dispensa de emissão de documento fiscal
                        </div>
                        <div className="col-span-2 p-2 text-right font-mono text-xs font-black">{currency(data.commerceWithoutNF)}</div>
                    </div>
                    <div className="grid grid-cols-12 border-b-2 border-slate-800">
                        <div className="col-span-10 p-2 border-r-2 border-slate-800 text-xs font-bold leading-tight">
                            II – Revenda de mercadorias com documento fiscal emitido
                        </div>
                        <div className="col-span-2 p-2 text-right font-mono text-xs font-black">{currency(data.commerceWithNF)}</div>
                    </div>
                    <div className="grid grid-cols-12 border-b-2 border-slate-800 bg-blue-50/50">
                        <div className="col-span-10 p-2 border-r-2 border-slate-800 text-xs font-black leading-tight uppercase">
                            III – Total das receitas com revenda de mercadorias (I + II)
                        </div>
                        <div className="col-span-2 p-2 text-right font-mono text-xs font-black">{currency(data.commerceTotal)}</div>
                    </div>

                    {/* Section 2: Industry */}
                    <div className="bg-slate-200 p-2 text-center border-b-2 border-slate-800">
                        <h3 className="text-xs font-black uppercase">RECEITA BRUTA MENSAL – VENDA DE PRODUTOS INDUSTRIALIZADOS (INDÚSTRIA)</h3>
                    </div>
                    <div className="grid grid-cols-12 border-b-2 border-slate-800">
                        <div className="col-span-10 p-2 border-r-2 border-slate-800 text-xs font-bold leading-tight">
                            IV – Venda de produtos industrializados com dispensa de emissão de documento fiscal
                        </div>
                        <div className="col-span-2 p-2 text-right font-mono text-xs font-black">{currency(data.industryWithoutNF)}</div>
                    </div>
                    <div className="grid grid-cols-12 border-b-2 border-slate-800">
                        <div className="col-span-10 p-2 border-r-2 border-slate-800 text-xs font-bold leading-tight">
                            V – Venda de produtos industrializados com documento fiscal emitido
                        </div>
                        <div className="col-span-2 p-2 text-right font-mono text-xs font-black">{currency(data.industryWithNF)}</div>
                    </div>
                    <div className="grid grid-cols-12 border-b-2 border-slate-800 bg-blue-50/50">
                        <div className="col-span-10 p-2 border-r-2 border-slate-800 text-xs font-black leading-tight uppercase">
                            VI – Total das receitas com venda de produtos industrializ. (IV + V)
                        </div>
                        <div className="col-span-2 p-2 text-right font-mono text-xs font-black">{currency(data.industryTotal)}</div>
                    </div>

                    {/* Section 3: Services */}
                    <div className="bg-slate-200 p-2 text-center border-b-2 border-slate-800">
                        <h3 className="text-xs font-black uppercase">RECEITA BRUTA MENSAL – PRESTAÇÃO DE SERVIÇOS</h3>
                    </div>
                    <div className="grid grid-cols-12 border-b-2 border-slate-800">
                        <div className="col-span-10 p-2 border-r-2 border-slate-800 text-xs font-bold leading-tight">
                            VII – Receita com prestação de serviços com dispensa de emissão de documento fiscal
                        </div>
                        <div className="col-span-2 p-2 text-right font-mono text-xs font-black">{currency(data.servicesWithoutNF)}</div>
                    </div>
                    <div className="grid grid-cols-12 border-b-2 border-slate-800">
                        <div className="col-span-10 p-2 border-r-2 border-slate-800 text-xs font-bold leading-tight">
                            VIII – Receita com prestação de serviços com documento fiscal emitido
                        </div>
                        <div className="col-span-2 p-2 text-right font-mono text-xs font-black">{currency(data.servicesWithNF)}</div>
                    </div>
                    <div className="grid grid-cols-12 border-b-2 border-slate-800 bg-blue-50/50">
                        <div className="col-span-10 p-2 border-r-2 border-slate-800 text-xs font-black leading-tight uppercase">
                            IX – Total das receitas com prestação de serviços (VII + VIII)
                        </div>
                        <div className="col-span-2 p-2 text-right font-mono text-xs font-black">{currency(data.servicesTotal)}</div>
                    </div>

                    {/* Grand Total */}
                    <div className="grid grid-cols-12 border-b-2 border-slate-800 bg-slate-100">
                        <div className="col-span-10 p-3 border-r-2 border-slate-800 text-sm font-black leading-tight uppercase">
                            X - Total geral das receitas brutas no mês (III + VI + IX)
                        </div>
                        <div className="col-span-2 p-3 text-right font-mono text-sm font-black bg-white">{currency(data.grandTotal)}</div>
                    </div>

                    {/* Footer Signature */}
                    <div className="grid grid-cols-12 border-b-2 border-slate-800">
                        <div className="col-span-7 p-2 border-r-2 border-slate-800">
                            <p className="text-[10px] font-black uppercase text-slate-500 mb-1">LOCAL E DATA:</p>
                            <p className="text-xs font-bold uppercase">
                                {data.city}{data.uf ? ` - ${data.uf}` : ''}, {longDate}
                            </p>
                        </div>
                        <div className="col-span-5 p-2 bg-slate-50 text-center flex flex-col justify-end min-h-[80px]">
                            <div className="border-t border-dotted border-slate-800 mt-2 mx-4"></div>
                            <p className="text-[8px] font-black uppercase tracking-widest mt-1">ASSINATURA</p>
                        </div>
                    </div>

                    <div className="p-3 text-[9px] leading-relaxed border-t-2 border-slate-100 dark:border-slate-700 bg-slate-50/30">
                        <p className="font-bold text-slate-800">DOCUMENTAÇÃO COMPROBATÓRIA:</p>
                        <p className="text-slate-600 dark:text-slate-300 italic">Deverão ser anexados a este relatório os documentos fiscais comprobatórios das entradas de mercadorias e serviços tomados referentes ao período, bem como as notas fiscais relativas às operações ou prestações realizadas eventualmente emitidas, mantendo-os em poder do contribuinte pelo prazo de 5 (cinco) anos.</p>
                        <div className="mt-2 flex justify-between items-center bg-slate-200/50 p-2 rounded border border-slate-300">
                            <span className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter">Embasamento Legal:</span>
                            <span className="font-mono font-bold text-slate-900">Art. 106, § 1º, da Resolução CGSN nº 140, de 2018.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};