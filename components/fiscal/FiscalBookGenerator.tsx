import React, { useState } from 'react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import { Printer, Download, Play, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface FiscalBookGeneratorProps {
    type: 'entry' | 'exit' | 'icms' | 'service' | 'inventory';
    title: string;
}

interface FiscalBookItem {
    type: 'entry' | 'exit'; // For ICMS segregation
    accessKey?: string; // For Model 9
    date: string; // Display string
    rawDate: Date; // For sorting
    species: string; // Used for Unit in Inventory
    series: string;
    invoiceNumber: string; // Used for Code in Inventory
    uf: string; // Used for NCM in Inventory
    customerName: string; // Used for Description in Inventory
    cnpj: string;
    cfop: string;
    value: number; // Valor Contabil or Total Value (Inv)
    icmsBase: number; // Used for QTY in Inventory
    icmsValue: number; // Used for Unit Price in Inventory
    icmsRate: number; // Aliquota
    isentas: number;
    outras: number;
    ipi: number;      // New for Entry Book
    stBase: number;   // New for Exit Book
    stValue: number;  // New for Exit Book
    cst: string;      // New field
    serviceItem?: string; // Item da Lista de Serviço (LC 116)
}

export const FiscalBookGenerator: React.FC<FiscalBookGeneratorProps> = ({ type, title }) => {
    const { selectedCompany, invoices, products } = useData();
    const { addToast } = useToast();
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-01'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [bookNumber, setBookNumber] = useState('001');
    const [initialPage, setInitialPage] = useState('2');

    const [isGenerating, setIsGenerating] = useState(false);
    const [previewData, setPreviewData] = useState<FiscalBookItem[]>([]);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Helper to parse "yyyy-MM-dd" to local date object at noon
    const parseLocal = (dateStr: string) => {
        if (!dateStr) return new Date();
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d, 12, 0, 0);
    };

    const validateCompanyData = () => {
        if (!selectedCompany) return "Selecione uma empresa para gerar o livro.";
        if (!selectedCompany.razaoSocial) return "Razão Social da empresa ausente. Preencha no cadastro.";
        if (!selectedCompany.cnpj) return "CNPJ da empresa ausente. Preencha no cadastro.";
        if (!selectedCompany.address?.city) return "Cidade da empresa ausente. Preencha no cadastro.";
        if (!selectedCompany.address?.uf) return "UF da empresa ausente. Preencha no cadastro.";
        return null;
    };

    const generatePreview = () => {
        setError(null);

        const validationError = validateCompanyData();
        if (validationError) {
            setError(validationError);
            addToast(validationError, 'error');
            return;
        }

        if (!startDate || !endDate) {
            setError("As datas inicial e final são obrigatórias.");
            addToast("Datas obrigatórias.", 'warning');
            return;
        }

        setIsGenerating(true);

        setTimeout(() => {
            const start = parseLocal(startDate);
            start.setHours(0, 0, 0, 0);
            const end = parseLocal(endDate);
            end.setHours(23, 59, 59, 999);

            let mappedData: FiscalBookItem[] = [];

            if (type === 'inventory') {
                // Inventory Calculation: Reconstruct stock based on Invoices (Bought vs Sold)
                const stockMap = new Map<string, {
                    qty: number,
                    unitPrice: number,
                    totalValue: number,
                    name: string,
                    ncm: string,
                    unit: string,
                    code: string
                }>();

                // 1. Filter Invoices up to the Position Date
                const historicalInvoices = invoices.filter(inv => {
                    const invDate = new Date(inv.date);
                    // Fix timezone offset for comparison
                    const localInvDate = new Date(invDate.getUTCFullYear(), invDate.getUTCMonth(), invDate.getUTCDate(), 12, 0, 0);
                    return localInvDate <= end && inv.status !== 'cancelada';
                });

                // 2. Process Entries (Adds) and Exits (Subtracts)
                historicalInvoices.forEach(inv => {
                    if (inv.items) {
                        inv.items.forEach(item => {
                            // Key by Product ID or Code or Description
                            const key = item.productId || item.code || item.description;
                            if (!key) return;

                            const current = stockMap.get(key) || {
                                qty: 0,
                                unitPrice: 0,
                                totalValue: 0,
                                name: item.description,
                                ncm: item.ncm || '',
                                unit: item.unit || 'UN',
                                code: item.code || 'GEN'
                            };

                            // Try to find master product data for better details (NCM, Code)
                            const masterProduct = products.find(p => p.id === item.productId || p.code === item.code);
                            if (masterProduct) {
                                if (!current.ncm) current.ncm = masterProduct.ncm;
                                if (!current.name) current.name = masterProduct.name;
                                if (current.code === 'GEN') current.code = masterProduct.code;
                                if (current.unit === 'UN') current.unit = masterProduct.unit;
                            }

                            if (inv.type === 'entry') {
                                current.qty = (current.qty || 0) + (item.quantity || 0);
                                // Update valuation to Last Entry Price
                                if (item.unitPrice && item.unitPrice > 0) {
                                    current.unitPrice = item.unitPrice;
                                }
                            } else if (inv.type === 'exit') {
                                current.qty = (current.qty || 0) - (item.quantity || 0);
                            }

                            stockMap.set(key, current);
                        });
                    }
                });

                mappedData = Array.from(stockMap.values())
                    .filter(item => item.qty > 0) // Only positive stock
                    .map(item => ({
                        date: format(end, 'dd/MM/yyyy'),
                        type: 'entry', // Dummy for Inventory
                        rawDate: end,
                        species: item.unit,
                        series: '',
                        invoiceNumber: item.code,
                        uf: item.ncm, // NCM
                        customerName: item.name,
                        cnpj: '',
                        cfop: '',
                        value: item.qty * item.unitPrice, // Total Value
                        icmsBase: item.qty, // Quantity
                        icmsValue: item.unitPrice, // Unit Price (Last Entry)
                        icmsRate: 0,
                        isentas: 0,
                        outras: 0,
                        ipi: 0,
                        stBase: 0,
                        stValue: 0,
                        cst: '000'
                    }));

                mappedData.sort((a, b) => a.customerName.localeCompare(b.customerName));

            } else {
                // Standard Books Logic (Entry/Exit/Service)
                let filteredInvoices = invoices.filter(inv => {
                    const invDate = new Date(inv.date);
                    const localInvDate = new Date(invDate.getUTCFullYear(), invDate.getUTCMonth(), invDate.getUTCDate(), 12, 0, 0);

                    // Exclude Non-Fiscal entries (Payroll, Taxes, Financial Fees, Rent, Loans, etc.)
                    // Only Products (Goods) and Services should appear in Fiscal Books.
                    const ignoredCategories = [
                        'Salários', 'Impostos - Trabalhista', 'Folha de Pagamento', 'Pró-Labore',
                        'Impostos - Federais', 'Impostos - Estaduais', 'Impostos - Municipais', 'Simples Nacional',
                        'Tarifas Bancárias', 'Empréstimos', 'Financiamentos',
                        'Retirada de Sócios', 'Lucros Distribuídos', 'Aporte de Capital',
                        'Aluguel', 'Condomínio', 'Seguros', 'Licenças e Taxas',
                        'Multas', 'Juros Passivos', 'Despesas Financeiras'
                    ];

                    if (ignoredCategories.some(c => inv.category === c || inv.category?.startsWith('Folha'))) {
                        return false;
                    }

                    return localInvDate >= start && localInvDate <= end;
                });

                if (type === 'entry') {
                    filteredInvoices = filteredInvoices.filter(inv => inv.type === 'entry');
                } else if (type === 'exit') {
                    filteredInvoices = filteredInvoices.filter(inv => inv.type === 'exit');
                } else if (type === 'icms') {
                    filteredInvoices = filteredInvoices.filter(inv => inv.type === 'entry' || inv.type === 'exit');
                } else if (type === 'service') {
                    // Include 'service' type OR 'exit' type that clearly has ISS components
                    filteredInvoices = filteredInvoices.filter(inv =>
                        inv.type === 'service' ||
                        (inv.type === 'exit' && inv.items?.some(i => (i.vIss || 0) > 0))
                    );
                }

                mappedData = filteredInvoices.map(inv => {
                    const isCanceled = inv.status === 'cancelada';
                    let totalBase = 0;
                    let totalVal = 0;
                    let mainCfop = '';
                    let maxRate = 0;

                    let vlrIsentas = 0;
                    let vlrOutras = 0;
                    let vlrIpi = 0;
                    let vlrStBase = 0;
                    let vlrStValue = 0;
                    let mainCst = '';
                    let mainServiceItem = '';

                    if (!isCanceled) {
                        if (inv.items && inv.items.length > 0) {
                            inv.items.forEach(item => {
                                if (type === 'service') {
                                    // Service Logic
                                    const itemVal = item.total || (item.quantity * item.unitPrice);
                                    totalBase += itemVal; // Usually Base = Total for Services
                                    totalVal += item.vIss || 0;
                                    if (item.pIss && item.pIss > maxRate) maxRate = item.pIss;

                                    // Try to find service item code
                                    const prod = products.find(p => p.id === item.productId || p.code === item.code);
                                    if (prod && 'serviceItem' in prod) {
                                        mainServiceItem = (prod as any).serviceItem;
                                    } else if (item.ncm) {
                                        mainServiceItem = item.ncm;
                                    }
                                } else {
                                    // ICMS Logic
                                    totalBase += item.bcIcms || 0;
                                    totalVal += item.vIcms || 0;
                                    vlrIpi += item.vIpi || 0;
                                    // ST Logic (if available in items, assuming standard field names or derived)
                                    // Note: InvoiceItem interface doesn't explicitly show vIcsmSt, assuming it might be added or we leave as 0 for now if not tracked
                                    // checking types.ts: InvoiceItem has vIpi. No explicit ST fields in the viewed types.ts.
                                    // We will assume 0 for ST unless we add it to types, but user asked for the Book Logic.
                                    // We'll set 0 effectively for now or use vIpi if mapped.

                                    if (item.cfop) mainCfop = item.cfop;
                                    if (item.cst) mainCst = item.cst;
                                    if (item.pIcms && item.pIcms > maxRate) maxRate = item.pIcms;
                                }
                            });
                        }

                        if (type === 'service') {
                            const residual = inv.value - totalBase;
                            vlrIsentas = residual > 0.01 ? residual : 0; // Tolerance for float
                        } else {
                            const residual = inv.value - totalBase;
                            vlrIsentas = residual > 0 ? residual : 0;
                        }

                        vlrOutras = 0;
                    }

                    const partnerUF = 'GO'; // Ideally from inv.entityAddress.uf

                    let partnerName = inv.entityName || 'Consumidor';
                    if (isCanceled) {
                        partnerName = '*** CANCELADA ***';
                    } else if (inv.cnpj) {
                        partnerName += ` (${inv.cnpj})`;
                    }

                    return {
                        type: (inv.type === 'entry' || inv.type === 'exit') ? inv.type : 'entry',
                        accessKey: inv.accessKey || '',
                        date: format(parseLocal(inv.date), 'dd/MM/yyyy'),
                        rawDate: parseLocal(inv.date),
                        species: type === 'service' ? 'NFS-e' : 'NF-e',
                        series: inv.serie || '1',
                        invoiceNumber: inv.number,
                        uf: partnerUF,
                        customerName: partnerName,
                        cnpj: inv.cnpj || '',
                        cfop: mainCfop || '5.102',
                        value: isCanceled ? 0 : inv.value,
                        icmsBase: totalBase,
                        icmsValue: totalVal,
                        icmsRate: maxRate,
                        isentas: vlrIsentas,
                        outras: vlrOutras,
                        ipi: vlrIpi,
                        stBase: vlrStBase,
                        stValue: vlrStValue,
                        cst: mainCst || '000',
                        serviceItem: mainServiceItem || ''
                    };
                });

                mappedData.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
            }

            setPreviewData(mappedData);
            setHasGenerated(true);
            setIsGenerating(false);
        }, 1000);
    };

    const generatePDF = (action: 'download' | 'print') => {
        const validationError = validateCompanyData();
        if (validationError) {
            addToast(validationError, 'error');
            return;
        }
        if (!selectedCompany) return; // TS guard

        const orientation = 'p'; // Always Portrait
        const doc = new jsPDF(orientation, 'mm', 'a4');
        doc.setFont('helvetica');

        const start = parseLocal(startDate);
        const end = parseLocal(endDate);
        const pageOffset = parseInt(initialPage) || 2;

        const primaryColor: [number, number, number] = [30, 58, 138];
        const secondaryColor: [number, number, number] = [240, 242, 245];

        const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
        const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(val);

        let months = [];
        if (type === 'inventory') {
            months = [end];
        } else {
            let dt = new Date(start);
            dt.setDate(1);
            while (dt <= end) {
                months.push(new Date(dt));
                dt.setMonth(dt.getMonth() + 1);
            }
        }

        let firstPage = true;
        let currentMonthLabel = "";

        const header = (data: any) => {
            const pageWidth = doc.internal.pageSize.getWidth();
            const centerX = pageWidth / 2;

            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.rect(0, 0, pageWidth, 4, 'F');

            // Company Info
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text(selectedCompany.razaoSocial || 'EMPRESA EXEMPLO LTDA', centerX, 12, { align: 'center' });

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            const cnpjIe = `CNPJ: ${selectedCompany.cnpj || '00.000.000/0001-00'}   |   IE: ${selectedCompany.ie || 'ISENTO'}`;
            doc.text(cnpjIe, centerX, 16, { align: 'center' });

            if (selectedCompany.address) {
                const { street, number, neighborhood, city, uf, zip } = selectedCompany.address;
                const addressText = `${street || ''}, ${number || 'S/N'} - ${neighborhood || ''}, ${city || ''} - ${uf || ''}, CEP: ${zip || ''}`;
                doc.text(addressText, centerX, 20, { align: 'center' });
            }

            // Title Bar
            doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
            doc.rect(10, 23, pageWidth - 20, 8, 'F');

            doc.setFontSize(11);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFont('helvetica', 'bold');
            const displayTitle = type === 'icms' ? 'LIVRO DE APURAÇÃO DO ICMS' : title.toUpperCase();
            doc.text(displayTitle, centerX, 28.5, { align: 'center' });

            // Sub-header Info
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            if (type === 'inventory') {
                doc.text(`Posição em: ${format(end, 'dd/MM/yyyy')}`, 10, 38);
            } else {
                doc.text(`Período: ${currentMonthLabel}`, 10, 38);
            }

            doc.text(`Livro Nº: ${bookNumber}`, pageWidth - 10, 38, { align: 'right' });

            doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setLineWidth(0.5);
            doc.line(10, 40, pageWidth - 10, 40);
        };

        const footer = (data: any) => {
            const pageWidth = doc.internal.pageSize.getWidth();
            const centerX = pageWidth / 2;
            const currentPageCount = (doc as any).getNumberOfPages();
            const displayPage = pageOffset + currentPageCount - 1;

            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.1);
            doc.line(10, doc.internal.pageSize.getHeight() - 15, pageWidth - 10, doc.internal.pageSize.getHeight() - 15);

            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);

            // Legal Basis
            let legalText = "";
            if (type === 'service') {
                legalText = "Este livro foi escriturado em conformidade com a Lei Complementar nº 116/2003 e legislação municipal vigente.";
            } else if (type === 'inventory') {
                legalText = "Este livro foi escriturado em conformidade com o Art. 221 do R-ICMS/GO (Dec. 4.852/97).";
            } else {
                legalText = "Este livro foi escriturado em conformidade com o Decreto nº 4.852/97 (RCTE-GO) e Instrução Normativa nº 467/00-GSF.";
            }

            doc.text(legalText, centerX, doc.internal.pageSize.getHeight() - 12, { align: 'center' });

            doc.text(`Sistema EscopoV3 - Emitido em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 10, doc.internal.pageSize.getHeight() - 8);
            doc.text(`Página ${displayPage}`, pageWidth - 10, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
        };

        months.forEach((monthDate, index) => {
            if (!firstPage) doc.addPage();
            firstPage = false;

            if (type !== 'inventory') {
                const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
                const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
                monthEnd.setHours(23, 59, 59, 999);
                const activeStart = monthStart < start ? start : monthStart;
                const activeEnd = monthEnd > end ? end : monthEnd;
                currentMonthLabel = `${format(activeStart, 'dd/MM/yyyy')} a ${format(activeEnd, 'dd/MM/yyyy')}`;
            }

            let head = [];
            let body = [];

            if (type === 'inventory') {
                head = [['CÓDIGO', 'DESCRIÇÃO COMPLETA', 'NCM', 'UN', 'QUANTIDADE', 'VALOR UNIT', 'VALOR TOTAL']];
                body = previewData.map(item => [
                    item.invoiceNumber,
                    item.customerName.substring(0, 45),
                    item.uf,
                    item.species,
                    formatNumber(item.icmsBase), // Qty
                    formatCurrency(item.icmsValue), // Unit Price
                    formatCurrency(item.value) // Total
                ]);

                const totalStockValue = previewData.reduce((acc, curr) => acc + curr.value, 0);
                body.push(['', '', '', '', '', 'TOTAL GERAL:', formatCurrency(totalStockValue)]);

                autoTable(doc, {
                    head: head,
                    body: body,
                    startY: 42,
                    margin: { top: 45, bottom: 20, left: 10, right: 10 },
                    styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.1 },
                    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', halign: 'center' },
                    alternateRowStyles: { fillColor: secondaryColor },
                    didDrawPage: (data) => {
                        header(data);
                        footer(data);
                    },
                    theme: 'grid'
                });

            } else if (type === 'service') {
                const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
                const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
                monthEnd.setHours(23, 59, 59, 999);
                const activeStart = monthStart < start ? start : monthStart;
                const activeEnd = monthEnd > end ? end : monthEnd;

                const monthData = previewData.filter(item => item.rawDate >= activeStart && item.rawDate <= activeEnd);

                head = [['Data', 'Espécie', 'Série', 'Número', 'Tomador/Prestador', 'UF', 'Item LC', 'Valor Serviço', 'Base Cálculo', 'Aliq %', 'ISS', 'Isentas']];
                body = monthData.map(item => [
                    item.date, item.species, item.series, item.invoiceNumber, item.customerName.substring(0, 20), item.uf,
                    item.serviceItem || '',
                    formatCurrency(item.value), formatCurrency(item.icmsBase), item.icmsRate.toFixed(2), formatCurrency(item.icmsValue), formatCurrency(item.isentas)
                ]);

                const mTotalValue = monthData.reduce((acc, curr) => acc + curr.value, 0);
                const mTotalBase = monthData.reduce((acc, curr) => acc + curr.icmsBase, 0);
                const mTotalICMS = monthData.reduce((acc, curr) => acc + curr.icmsValue, 0);
                const mTotalIsentas = monthData.reduce((acc, curr) => acc + curr.isentas, 0);
                body.push(['', '', '', '', 'TOTAIS:', '', '', formatCurrency(mTotalValue), formatCurrency(mTotalBase), '', formatCurrency(mTotalICMS), formatCurrency(mTotalIsentas)]);

                autoTable(doc, {
                    head: head,
                    body: body,
                    startY: 42,
                    margin: { top: 45, bottom: 20, left: 10, right: 10 },
                    styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.1 },
                    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', halign: 'center' },
                    alternateRowStyles: { fillColor: secondaryColor },
                    didDrawPage: (data) => {
                        header(data);
                        footer(data);
                    },
                    theme: 'grid'
                });

            } else if (type === 'icms') {
                // --- APURAÇÃO DO ICMS (MODELO 9 DETALHADO) ---

                const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
                const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
                monthEnd.setHours(23, 59, 59, 999);
                const activeStart = monthStart < start ? start : monthStart;
                const activeEnd = monthEnd > end ? end : monthEnd;

                const monthData = previewData.filter(item => item.rawDate >= activeStart && item.rawDate <= activeEnd);
                const entries = monthData.filter(i => i.type === 'entry');
                const exits = monthData.filter(i => i.type === 'exit');

                // 1. Table Entradas (Créditos)
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text('DEMONSTRATIVO DAS ENTRADAS (CRÉDITO DO IMPOSTO)', 10, 48);

                autoTable(doc, {
                    head: [['Data', 'Doc', 'Número', 'Chave Acesso', 'CFOP', 'Fornecedor', 'Base Calc.', 'Aliq', 'Crédito ICMS']],
                    body: entries.map(e => [
                        e.date, e.species, e.invoiceNumber, e.accessKey || '-', e.cfop, e.customerName.substring(0, 15),
                        formatCurrency(e.icmsBase), e.icmsRate.toFixed(0), formatCurrency(e.icmsValue)
                    ]),
                    startY: 50,
                    margin: { top: 45, bottom: 20, left: 10, right: 10 },
                    styles: { fontSize: 6, cellPadding: 1 },
                    headStyles: { fillColor: [40, 100, 40] }, // Greenish for entries
                    didDrawPage: (data) => {
                        header(data);
                        footer(data);
                    },
                    theme: 'grid'
                });

                let lastY = (doc as any).lastAutoTable.finalY + 10;

                // Check if we need a new page for Exits
                if (lastY > doc.internal.pageSize.getHeight() - 40) {
                    doc.addPage();
                    header(null);
                    footer(null);
                    lastY = 50;
                }

                // 2. Table Saídas (Débitos)
                doc.text('DEMONSTRATIVO DAS SAÍDAS (DÉBITO DO IMPOSTO)', 10, lastY - 2);

                autoTable(doc, {
                    head: [['Data', 'Doc', 'Número', 'Chave Acesso', 'CFOP', 'Cliente', 'Base Calc.', 'Aliq', 'Débito ICMS']],
                    body: exits.map(e => [
                        e.date, e.species, e.invoiceNumber, e.accessKey || '-', e.cfop, e.customerName.substring(0, 15),
                        formatCurrency(e.icmsBase), e.icmsRate.toFixed(0), formatCurrency(e.icmsValue)
                    ]),
                    startY: lastY,
                    margin: { top: 45, bottom: 20, left: 10, right: 10 },
                    styles: { fontSize: 6, cellPadding: 1 },
                    headStyles: { fillColor: [150, 40, 40] }, // Reddish for exits
                    didDrawPage: (data) => {
                        header(data);
                        footer(data);
                    },
                    theme: 'grid'
                });

                // 3. APURAÇÃO SINTÉTICA
                doc.addPage();
                header(null);
                footer(null);

                const totalCredits = entries.reduce((acc, curr) => acc + curr.icmsValue, 0);
                const totalDebits = exits.reduce((acc, curr) => acc + curr.icmsValue, 0);
                const balance = totalDebits - totalCredits;

                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('RESUMO DA APURAÇÃO DO ICMS (MODELO 9)', 105, 50, { align: 'center' }); // Center ~105mm in A4

                const boxY = 60;

                // Debits Box
                doc.setFillColor(240, 240, 240);
                doc.rect(20, boxY, 170, 60, 'F');
                doc.setDrawColor(0);
                doc.rect(20, boxY, 170, 60);

                doc.setFontSize(10);
                doc.text('DÉBITOS DO IMPOSTO', 30, boxY + 10);
                doc.setFont('helvetica', 'normal');
                doc.text('001 - Por Saídas com Débito:', 30, boxY + 20);
                doc.text(formatCurrency(totalDebits), 180, boxY + 20, { align: 'right' });

                doc.text('002 - Outros Débitos:', 30, boxY + 30);
                doc.text(formatCurrency(0), 180, boxY + 30, { align: 'right' });

                doc.setFont('helvetica', 'bold');
                doc.text('005 - TOTAL DE DÉBITOS:', 30, boxY + 50);
                doc.text(formatCurrency(totalDebits), 180, boxY + 50, { align: 'right' });

                // Credits Box
                const credY = boxY + 70;
                doc.setFillColor(240, 240, 240);
                doc.rect(20, credY, 170, 60, 'F');
                doc.setDrawColor(0);
                doc.rect(20, credY, 170, 60);

                doc.setFontSize(10);
                doc.text('CRÉDITOS DO IMPOSTO', 30, credY + 10);
                doc.setFont('helvetica', 'normal');
                doc.text('006 - Por Entradas com Crédito:', 30, credY + 20);
                doc.text(formatCurrency(totalCredits), 180, credY + 20, { align: 'right' });

                doc.text('007 - Outros Créditos:', 30, credY + 30);
                doc.text(formatCurrency(0), 180, credY + 30, { align: 'right' });

                doc.text('009 - Saldo Credor Anterior:', 30, credY + 40);
                doc.text(formatCurrency(0), 180, credY + 40, { align: 'right' });

                doc.setFont('helvetica', 'bold');
                doc.text('010 - TOTAL DE CRÉDITOS:', 30, credY + 50);
                doc.text(formatCurrency(totalCredits), 180, credY + 50, { align: 'right' });

                // Result Box
                const resY = credY + 70;
                doc.setDrawColor(0);
                doc.rect(20, resY, 170, 30);

                doc.setFontSize(11);
                doc.text('SALDO DEVEDOR (A RECOLHER):', 30, resY + 12);
                doc.text('SALDO CREDOR (A TRANSPORTAR):', 30, resY + 22);

                const finalVal = Math.abs(balance);

                if (balance > 0) {
                    doc.text(formatCurrency(balance), 180, resY + 12, { align: 'right' });
                    doc.text(formatCurrency(0), 180, resY + 22, { align: 'right' });
                } else {
                    doc.text(formatCurrency(0), 180, resY + 12, { align: 'right' });
                    doc.text(formatCurrency(finalVal), 180, resY + 22, { align: 'right' });
                }

            } else {
                // --- LIVROS DE ENTRADA (MODELO 1) E SAÍDA (MODELO 2A) ---
                // Layout conforme STD SEFAZ-GO

                const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
                const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
                monthEnd.setHours(23, 59, 59, 999);
                const activeStart = monthStart < start ? start : monthStart;
                const activeEnd = monthEnd > end ? end : monthEnd;

                const monthData = previewData.filter(item => item.rawDate >= activeStart && item.rawDate <= activeEnd);

                // --- COLUNAS E DADOS ESPECÍFICOS POR TIPO ---
                let head = [];
                let body = [];

                if (type === 'entry') {
                    head = [[
                        'Data', 'Doc', 'Sér', 'Num', 'Chave Acesso', 'Fornecedor', 'UF', 'CFOP', 'CST',
                        'Vlr Contábil', 'Base ICMS', 'Aliq', 'ICMS', 'IPI', 'Outras'
                    ]];
                    body = monthData.map(item => [
                        item.date, item.species, item.series, item.invoiceNumber,
                        item.accessKey ? item.accessKey.substring(0, 22) + '...' : '',
                        item.customerName.substring(0, 15), item.uf,
                        item.cfop, item.cst,
                        formatCurrency(item.value), formatCurrency(item.icmsBase), item.icmsRate.toFixed(0),
                        formatCurrency(item.icmsValue), formatCurrency(item.ipi), formatCurrency(item.outras)
                    ]);
                } else {
                    // EXIT
                    head = [[
                        'Data', 'Doc', 'Sér', 'Num', 'Chave Acesso', 'Cliente', 'UF', 'CFOP', 'CST',
                        'Vlr Contábil', 'Base ICMS', 'Aliq', 'ICMS', 'Subst. Trib.', 'Outras'
                    ]];
                    body = monthData.map(item => [
                        item.date, item.species, item.series, item.invoiceNumber,
                        item.accessKey ? item.accessKey.substring(0, 22) + '...' : '',
                        item.customerName.substring(0, 15), item.uf,
                        item.cfop, item.cst,
                        formatCurrency(item.value), formatCurrency(item.icmsBase), item.icmsRate.toFixed(0),
                        formatCurrency(item.icmsValue), formatCurrency(item.stValue), formatCurrency(item.outras)
                    ]);
                }

                // --- TOTALIZAÇÕES (SUMMARIES) ---
                const mTotalValue = monthData.reduce((acc, curr) => acc + curr.value, 0);
                const mTotalBase = monthData.reduce((acc, curr) => acc + curr.icmsBase, 0);
                const mTotalICMS = monthData.reduce((acc, curr) => acc + curr.icmsValue, 0);
                const mTotalIPI = monthData.reduce((acc, curr) => acc + curr.ipi, 0);
                const mTotalST = monthData.reduce((acc, curr) => acc + curr.stValue, 0);
                const mTotalOutras = monthData.reduce((acc, curr) => acc + curr.outras, 0);

                const totalRow = ['', '', '', '', '', '', '', '', 'TOTAIS:', formatCurrency(mTotalValue), formatCurrency(mTotalBase), '', formatCurrency(mTotalICMS)];
                if (type === 'entry') totalRow.push(formatCurrency(mTotalIPI));
                else totalRow.push(formatCurrency(mTotalST));
                totalRow.push(formatCurrency(mTotalOutras));

                body.push(totalRow);

                autoTable(doc, {
                    head: head,
                    body: body,
                    startY: 42,
                    margin: { top: 45, bottom: 20, left: 10, right: 10 },
                    styles: { fontSize: 5, cellPadding: 1, overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.1 },
                    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', halign: 'center' },
                    alternateRowStyles: { fillColor: secondaryColor },
                    didDrawPage: (data) => {
                        header(data);
                        footer(data);
                    },
                    theme: 'grid'
                });

                // --- SUMMARY BY CFOP AND RATE (REQUIRED BY STD) ---
                if (type === 'entry' || type === 'exit') {
                    doc.addPage();
                    header(null);
                    footer(null);

                    const activeMStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
                    const activeMEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
                    activeMEnd.setHours(23, 59, 59, 999);
                    const mData = previewData.filter(item => item.rawDate >= activeMStart && item.rawDate <= activeMEnd);

                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(0, 0, 0);
                    doc.text(`RESUMO ANALÍTICO - ${format(monthDate, 'MM/yyyy')}`, 10, 50);

                    // Group By CFOP
                    const cfopSummary = mData.reduce((acc, item) => {
                        const key = item.cfop || 'S/ CFOP';
                        if (!acc[key]) acc[key] = { base: 0, icms: 0, val: 0, ipi: 0 };
                        acc[key].base += item.icmsBase;
                        acc[key].icms += item.icmsValue;
                        acc[key].val += item.value;
                        acc[key].ipi += item.ipi;
                        return acc;
                    }, {} as any);

                    // Group By Rate
                    const rateSummary = mData.reduce((acc, item) => {
                        const key = item.icmsRate > 0 ? `${item.icmsRate.toFixed(0)}%` : 'Isento/Outros';
                        if (!acc[key]) acc[key] = { base: 0, icms: 0 };
                        acc[key].base += item.icmsBase;
                        acc[key].icms += item.icmsValue;
                        return acc;
                    }, {} as any);

                    // CFOP Table
                    doc.setFontSize(10);
                    doc.text('Totalização por CFOP', 10, 60);
                    autoTable(doc, {
                        head: [['CFOP', 'Vlr Contábil', 'Base Calc.', 'ICMS', type === 'entry' ? 'IPI' : 'ST']],
                        body: Object.entries(cfopSummary).map(([k, v]: [string, any]) => [
                            k, formatCurrency(v.val), formatCurrency(v.base), formatCurrency(v.icms), formatCurrency(v.ipi)
                        ]),
                        startY: 65,
                        theme: 'striped',
                        styles: { fontSize: 8 }
                    });

                    // Rate Table
                    const lastY = (doc as any).lastAutoTable.finalY + 10;
                    doc.text('Totalização por Alíquota', 10, lastY);
                    autoTable(doc, {
                        head: [['Alíquota', 'Base de Cálculo', 'Valor ICMS']],
                        body: Object.entries(rateSummary).map(([k, v]: [string, any]) => [
                            k, formatCurrency(v.base), formatCurrency(v.icms)
                        ]),
                        startY: lastY + 5,
                        theme: 'striped',
                        styles: { fontSize: 8 }
                    });
                }
            }
        });

        if (action === 'download') {
            doc.save(`livro_${type}_${endDate}.pdf`);
        } else {
            doc.autoPrint();
            window.open(doc.output('bloburl'), '_blank');
        }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(val);

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center mb-4 border border-red-200">
                    <AlertTriangle size={20} className="mr-2" />
                    {error}
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-color)]">
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                        {type === 'inventory' ? 'Data da Posição *' : 'Data Inicial *'}
                    </label>
                    <input
                        type="date"
                        value={type === 'inventory' ? endDate : startDate}
                        onChange={(e) => {
                            if (type === 'inventory') setEndDate(e.target.value);
                            else setStartDate(e.target.value);
                        }}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                    />
                </div>

                {type !== 'inventory' && (
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Data Final *</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Número do Livro</label>
                    <input
                        type="text"
                        value={bookNumber}
                        onChange={(e) => setBookNumber(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Página Inicial</label>
                    <input
                        type="number"
                        value={initialPage}
                        onChange={(e) => setInitialPage(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                    />
                </div>
                <div className="flex items-end">
                    <Button onClick={generatePreview} className="w-full" disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="mr-2 animate-spin" size={18} /> : <Play size={18} className="mr-2" />}
                        Gerar Visualização
                    </Button>
                </div>
            </div>

            {(hasGenerated || previewData.length > 0) ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold">Pré-visualização {previewData.length === 0 ? '(Sem Movimento)' : `(${previewData.length} registros)`}</h3>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => generatePDF('print')}>
                                <Printer size={18} className="mr-2" />
                                Imprimir
                            </Button>
                            <Button onClick={() => generatePDF('download')}>
                                <Download size={18} className="mr-2" />
                                Download PDF
                            </Button>
                        </div>
                    </div>

                    <div className="bg-white text-black p-8 rounded-xl shadow-lg border border-gray-200 min-h-[500px] overflow-x-auto" style={{ fontFamily: 'Aptos, sans-serif' }}>
                        <div className="text-center mb-6 border-b pb-4">
                            <h2 className="text-xl font-bold uppercase">{selectedCompany?.razaoSocial || 'EMPRESA EXEMPLO LTDA'}</h2>
                            <p className="text-sm text-gray-600">{selectedCompany?.cnpj || '00.000.000/0001-00'}</p>
                            <h3 className="text-lg font-bold mt-2 uppercase">{title}</h3>
                            <div className="flex justify-between text-sm mt-2 font-medium">
                                {type === 'inventory' ? (
                                    <span>Posição em: {format(parseLocal(endDate), 'dd/MM/yyyy')}</span>
                                ) : (
                                    <span>Período: {format(parseLocal(startDate), 'dd/MM/yyyy')} a {format(parseLocal(endDate), 'dd/MM/yyyy')}</span>
                                )}
                                <span>Livro Nº: {bookNumber}</span>
                            </div>
                        </div>

                        <table className="w-full text-xs text-left">
                            <thead className="text-gray-700 bg-gray-100 uppercase font-bold border-b-2 border-gray-300">
                                <tr>
                                    {type === 'inventory' ? (
                                        <>
                                            <th className="px-2 py-2">Código</th>
                                            <th className="px-2 py-2">Descrição</th>
                                            <th className="px-2 py-2">NCM</th>
                                            <th className="px-2 py-2">Unid</th>
                                            <th className="px-2 py-2 text-right">Qtde</th>
                                            <th className="px-2 py-2 text-right">Vlr Unit</th>
                                            <th className="px-2 py-2 text-right">Vlr Total</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-2 py-2">Data</th>
                                            <th className="px-2 py-2">Esp</th>
                                            <th className="px-2 py-2">Série</th>
                                            <th className="px-2 py-2">Número</th>
                                            <th className="px-2 py-2">UF</th>
                                            <th className="px-2 py-2">Parceiro</th>
                                            {type !== 'service' && <th className="px-2 py-2">CFOP</th>}
                                            <th className="px-2 py-2 text-right">Vlr Contábil</th>
                                            <th className="px-2 py-2 text-right">Base Calc.</th>
                                            {type !== 'service' && <th className="px-2 py-2 text-right">Aliq%</th>}
                                            <th className="px-2 py-2 text-right">{type === 'service' ? 'ISS' : 'ICMS'}</th>
                                            <th className="px-2 py-2 text-right">Isentas</th>
                                            {type !== 'service' && <th className="px-2 py-2 text-right">Outras</th>}
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {previewData.length > 0 ? (
                                    previewData.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            {type === 'inventory' ? (
                                                <>
                                                    <td className="px-2 py-1.5">{item.invoiceNumber}</td>
                                                    <td className="px-2 py-1.5 truncate max-w-[200px]">{item.customerName}</td>
                                                    <td className="px-2 py-1.5">{item.uf}</td>
                                                    <td className="px-2 py-1.5">{item.species}</td>
                                                    <td className="px-2 py-1.5 text-right font-medium">{formatNumber(item.icmsBase)}</td>
                                                    <td className="px-2 py-1.5 text-right">{formatCurrency(item.icmsValue)}</td>
                                                    <td className="px-2 py-1.5 text-right font-bold">{formatCurrency(item.value)}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-2 py-1.5">{item.date}</td>
                                                    <td className="px-2 py-1.5">{item.species}</td>
                                                    <td className="px-2 py-1.5">{item.series}</td>
                                                    <td className="px-2 py-1.5">{item.invoiceNumber}</td>
                                                    <td className="px-2 py-1.5">{item.uf}</td>
                                                    <td className="px-2 py-1.5 truncate max-w-[150px]">{item.customerName}</td>
                                                    {type !== 'service' && <td className="px-2 py-1.5">{item.cfop}</td>}
                                                    <td className="px-2 py-1.5 text-right font-medium">{formatCurrency(item.value)}</td>
                                                    <td className="px-2 py-1.5 text-right">{formatCurrency(item.icmsBase)}</td>
                                                    {type !== 'service' && <td className="px-2 py-1.5 text-right">{item.icmsRate.toFixed(0)}</td>}
                                                    <td className="px-2 py-1.5 text-right">{formatCurrency(item.icmsValue)}</td>
                                                    <td className="px-2 py-1.5 text-right">{formatCurrency(item.isentas)}</td>
                                                    {type !== 'service' && <td className="px-2 py-1.5 text-right">{formatCurrency(item.outras)}</td>}
                                                </>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr className="bg-gray-50">
                                        <td colSpan={13} className="px-2 py-8 text-center text-gray-400 italic">
                                            SEM MOVIMENTO NO PERÍODO - REGISTROS ZERADOS
                                        </td>
                                    </tr>
                                )}

                                {/* Totals Row */}
                                <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                                    {type === 'inventory' ? (
                                        <>
                                            <td colSpan={6} className="px-2 py-2 text-right">TOTAL DO INVENTÁRIO:</td>
                                            <td className="px-2 py-2 text-right">{formatCurrency(previewData.reduce((acc, curr) => acc + curr.value, 0))}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td colSpan={type === 'service' ? 6 : 7} className="px-2 py-2 text-right">TOTAIS DA PÁGINA:</td>
                                            <td className="px-2 py-2 text-right">{formatCurrency(previewData.reduce((acc, curr) => acc + curr.value, 0))}</td>
                                            <td className="px-2 py-2 text-right">{formatCurrency(previewData.reduce((acc, curr) => acc + curr.icmsBase, 0))}</td>
                                            {type !== 'service' && <td className="px-2 py-2"></td>}
                                            <td className="px-2 py-2 text-right">{formatCurrency(previewData.reduce((acc, curr) => acc + curr.icmsValue, 0))}</td>
                                            <td className="px-2 py-2 text-right">{formatCurrency(previewData.reduce((acc, curr) => acc + curr.isentas, 0))}</td>
                                            {type !== 'service' && <td className="px-2 py-2 text-right">{formatCurrency(previewData.reduce((acc, curr) => acc + curr.outras, 0))}</td>}
                                        </>
                                    )}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="p-8 border-2 border-dashed border-[var(--border-color)] rounded-xl flex flex-col items-center justify-center text-[var(--text-secondary)] min-h-[300px]">
                    <Play size={48} className="mb-4 text-green-600 opacity-50" />
                    <p className="font-medium">Nenhum livro gerado</p>
                    <p className="text-sm opacity-70">Selecione os parâmetros e clique em "Gerar Visualização"</p>
                </div>
            )}
        </div>
    );
};
