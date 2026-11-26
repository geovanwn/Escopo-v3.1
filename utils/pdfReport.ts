import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanyEntity } from '../types';

export interface ReportColumn {
    header: string;
    dataKey: string;
    halign?: 'left' | 'center' | 'right';
    format?: (value: any) => string;
}

export interface ReportTotalizer {
    label: string;
    value: string | number;
    icon?: 'hash' | 'percent' | 'dollar';
    color?: 'blue' | 'orange' | 'green';
}

export interface ReportOptions {
    fileName?: string;
    orientation?: 'p' | 'l'; // portrait | landscape
    title?: string;
    period?: string;
    reportId?: string;
    status?: string;
    signatureDate?: string;
}

const getBase64ImageFromURL = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } else {
                reject(new Error('Canvas context is null'));
            }
        };
        img.onerror = error => reject(error);
    });
};

export const generatePDFReport = async (
    company: CompanyEntity | undefined,
    columns: ReportColumn[],
    data: any[],
    totalizers: ReportTotalizer[] = [],
    options: ReportOptions = {},
    returnDoc: boolean = false
) => {
    const doc = new jsPDF(options.orientation || 'p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // --- Colors ---
    const colorPrimary: [number, number, number] = [37, 99, 235]; // Blue 600
    const colorText: [number, number, number] = [30, 41, 59]; // Slate 800
    const colorSubtext: [number, number, number] = [100, 116, 139]; // Slate 500
    const colorBorder: [number, number, number] = [226, 232, 240]; // Slate 200

    // --- Header Section ---
    // Company Logo
    if (company?.logo) {
        try {
            const logoData = await getBase64ImageFromURL(company.logo);
            doc.addImage(logoData, 'PNG', margin, 15, 12, 12);
        } catch (e) {
            console.error('Error loading logo:', e);
            // Fallback to placeholder
            doc.setFillColor(239, 246, 255); // Blue 50
            doc.roundedRect(margin, 15, 12, 12, 2, 2, 'F');
            doc.setTextColor(37, 99, 235);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(company?.razaoSocial?.substring(0, 1) || 'E', margin + 3.5, 22.5);
        }
    } else {
        // Placeholder
        doc.setFillColor(239, 246, 255); // Blue 50
        doc.roundedRect(margin, 15, 12, 12, 2, 2, 'F');
        doc.setTextColor(37, 99, 235);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(company?.razaoSocial?.substring(0, 1) || 'E', margin + 3.5, 22.5);
    }

    // Company Info
    doc.setTextColor(colorText[0], colorText[1], colorText[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    // Order: Nome Fantasia, Razão Social
    doc.text(company?.nomeFantasia || company?.razaoSocial || 'Empresa Não Identificada', margin + 16, 18);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(company?.razaoSocial || '', margin + 16, 22);

    doc.setFontSize(7);
    doc.setTextColor(colorSubtext[0], colorSubtext[1], colorSubtext[2]);

    // CNPJ, REGIME & RAMO
    const cnpjText = company?.cnpj ? `CNPJ: ${company.cnpj}` : '';
    const crtLabel = company?.regimeTributario ? ` | REGIME: ${company.regimeTributario.toUpperCase()}` : '';
    const ramoLabel = company?.ramoAtividade ? ` | RAMO: ${company.ramoAtividade.toUpperCase()}` : '';
    doc.text(`${cnpjText}${crtLabel}${ramoLabel}`, margin + 16, 26);

    // Address Order: Logradouro, Número, Complemento, Quadra, Lote, Bairro, Município, UF
    if (company?.address) {
        const { street, number, complemento, quadra, lote, neighborhood, city, uf } = company.address;
        const addrParts = [
            street,
            number ? `Nº ${number}` : '',
            complemento,
            quadra ? `QD ${quadra}` : '',
            lote ? `LT ${lote}` : '',
            neighborhood,
            city,
            uf
        ].filter(Boolean).join(', ');
        doc.text(addrParts, margin + 16, 30);
    }

    // Report Title & Status (Right Aligned)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    const title = options.title || 'Relatório Gerencial';
    doc.text(title.toUpperCase(), pageWidth - margin, 19, { align: 'right' });

    if (options.status) {
        doc.setFillColor(220, 252, 231); // Green 100
        doc.setTextColor(22, 101, 52); // Green 800
        doc.roundedRect(pageWidth - margin - 25, 23, 25, 6, 3, 3, 'F');
        doc.setFontSize(7);
        doc.text(options.status.toUpperCase(), pageWidth - margin - 12.5, 27, { align: 'center' });
    }

    // --- Sub-Header (Info Strip) ---
    const topStripY = 35;
    doc.setDrawColor(colorBorder[0], colorBorder[1], colorBorder[2]);
    (doc as any).setLineDash([1, 1], 0);
    doc.line(margin, topStripY, pageWidth - margin, topStripY);
    (doc as any).setLineDash([], 0);

    const infoY = topStripY + 8;

    // Col 1: Period
    if (options.period) {
        doc.setFontSize(6);
        doc.setTextColor(colorSubtext[0], colorSubtext[1], colorSubtext[2]);
        // Increase spacing slightly for label
        doc.text('PERÍODO DE APURAÇÃO', margin, infoY, { charSpace: 1.5 } as any);
        doc.setFontSize(8);
        doc.setTextColor(colorText[0], colorText[1], colorText[2]);
        doc.text(options.period.toUpperCase(), margin, infoY + 5);
    } // else ... can add icon placeholders

    // Col 2: Emission Date
    doc.setFontSize(6);
    doc.setTextColor(colorSubtext[0], colorSubtext[1], colorSubtext[2]);
    doc.text('DATA DE EMISSÃO', pageWidth / 2, infoY, { align: 'center' });
    doc.setFontSize(8);
    doc.setTextColor(colorText[0], colorText[1], colorText[2]);
    const emissionDate = options.signatureDate || new Date().toLocaleString('pt-BR');
    doc.text(emissionDate, pageWidth / 2, infoY + 5, { align: 'center' });

    // Col 3: Report ID
    const reportId = options.reportId || `REL-${Math.floor(Math.random() * 10000)}`;
    doc.setFontSize(6);
    doc.setTextColor(colorSubtext[0], colorSubtext[1], colorSubtext[2]);
    doc.text('ID DO RELATÓRIO', pageWidth - margin, infoY, { align: 'right' });
    doc.setFontSize(8);
    doc.setTextColor(colorText[0], colorText[1], colorText[2]);
    doc.text(reportId, pageWidth - margin, infoY + 5, { align: 'right' });


    // --- Table Section ---
    const tableStartY = 60;

    // "Detalhamento" Title
    doc.setFontSize(9);
    doc.setTextColor(colorText[0], colorText[1], colorText[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhamento das Notas', margin, tableStartY - 5);

    // Prepare AutoTable Data
    const tableHeaders = columns.map(c => c.header.toUpperCase());
    const tableBody = data.map(row => columns.map(c => {
        let val = row[c.dataKey];
        if (c.format) val = c.format(val);
        return val;
    }));

    // Column Styles mapping
    const colStyles: { [key: number]: any } = {};
    columns.forEach((c, idx) => {
        if (c.halign) colStyles[idx] = { halign: c.halign };
    });

    autoTable(doc, {
        head: [tableHeaders],
        body: tableBody,
        startY: tableStartY,
        theme: 'plain',
        headStyles: {
            fillColor: [248, 250, 252], // Slate 50
            textColor: [100, 116, 139], // Slate 500
            fontSize: 7,
            fontStyle: 'bold',
            halign: 'left'
        },
        styles: {
            fontSize: 8,
            cellPadding: 4,
            textColor: [51, 65, 85], // Slate 700
            lineColor: [241, 245, 249], // Slate 100
            lineWidth: { bottom: 0.1 }
        },
        columnStyles: colStyles,
        margin: { left: margin, right: margin, bottom: 40 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;

    // --- Totalizers Section ---
    if (totalizers.length > 0) {
        if (finalY > pageHeight - 80) { // Increased margin to avoid footer overlap
            doc.addPage();
            finalY = margin + 10;
        }

        doc.setFontSize(8);
        doc.setTextColor(colorSubtext[0], colorSubtext[1], colorSubtext[2]);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTALIZADORES', margin, finalY);

        finalY += 5;
        const cardWidth = (pageWidth - (margin * 2) - ((totalizers.length - 1) * 5)) / totalizers.length;
        const cardHeight = 24;

        totalizers.forEach((t, idx) => {
            const x = margin + (idx * (cardWidth + 5));
            const y = finalY;

            // Card Background
            doc.setDrawColor(colorBorder[0], colorBorder[1], colorBorder[2]);
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

            // Color accent bar (left edge)
            let accentColor: [number, number, number] = [59, 130, 246]; // Blue default
            if (t.color === 'green') accentColor = [34, 197, 94];
            if (t.color === 'orange') accentColor = [249, 115, 22];
            doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
            doc.roundedRect(x, y, 3, cardHeight, 2, 0, 'F');
            // Cover the right edge of the accent to make it flat
            doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
            doc.rect(x + 1.5, y, 1.5, cardHeight, 'F');

            // Label
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(colorSubtext[0], colorSubtext[1], colorSubtext[2]);
            doc.text(t.label.toUpperCase(), x + 6, y + 7);

            // Value
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(colorText[0], colorText[1], colorText[2]);
            let displayValue = String(t.value);
            if (typeof t.value === 'number') {
                const labelLower = String(t.label).toLowerCase();
                const isCurrency = t.icon === 'dollar' || (
                    t.icon !== 'hash' &&
                    t.icon !== 'percent' &&
                    (labelLower.includes('valor') || (labelLower.includes('total') && !labelLower.includes('registros') && !labelLower.includes('qtd') && !labelLower.includes('documentos')))
                );

                if (isCurrency) {
                    displayValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.value);
                }
            }
            doc.text(displayValue, x + 6, y + 16);

            // Subtle icon hint (small, bottom-right, won't overlap value)
            doc.setFontSize(7);
            doc.setTextColor(220, 220, 230);
            if (t.icon === 'percent') {
                doc.text('%', x + cardWidth - 5, y + cardHeight - 3, { align: 'center' });
            } else if (t.icon === 'dollar') {
                doc.text('$', x + cardWidth - 5, y + cardHeight - 3, { align: 'center' });
            } else if (t.icon === 'hash') {
                doc.text('#', x + cardWidth - 5, y + cardHeight - 3, { align: 'center' });
            }

        });
    }

    // --- Footer Section (Signatures & Disclaimer) ---
    // Disclaimer
    const footerY = pageHeight - 35;
    doc.setFontSize(6);
    doc.setTextColor(colorSubtext[0], colorSubtext[1], colorSubtext[2]);
    doc.setFont('helvetica', 'italic');
    doc.text('Este relatório foi gerado automaticamente pelo sistema e deve ser validado pelos responsáveis.', pageWidth / 2, footerY, { align: 'center' });

    // Signatures
    const sigY = footerY + 15;
    doc.setDrawColor(colorSubtext[0], colorSubtext[1], colorSubtext[2]);
    doc.setLineWidth(0.1);

    // Left Sig
    doc.line(margin + 10, sigY, pageWidth / 2 - 10, sigY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorText[0], colorText[1], colorText[2]);
    doc.text('Responsável Financeiro', margin + 10 + ((pageWidth / 2 - 20) / 2), sigY + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colorSubtext[0], colorSubtext[1], colorSubtext[2]);
    doc.text('Assinatura / Carimbo', margin + 10 + ((pageWidth / 2 - 20) / 2), sigY + 7, { align: 'center' });
    if (options.signatureDate) {
        doc.setFontSize(6);
        doc.text(`Data: ${options.signatureDate}`, margin + 10 + ((pageWidth / 2 - 20) / 2), sigY + 10, { align: 'center' });
    }

    // Right Sig
    doc.line(pageWidth / 2 + 10, sigY, pageWidth - margin - 10, sigY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorText[0], colorText[1], colorText[2]);
    doc.text('Contabilidade', pageWidth / 2 + 10 + ((pageWidth / 2 - 20 - margin) / 2), sigY + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colorSubtext[0], colorSubtext[1], colorSubtext[2]);
    doc.text('CRC / Assinatura', pageWidth / 2 + 10 + ((pageWidth / 2 - 20 - margin) / 2), sigY + 7, { align: 'center' });
    if (options.signatureDate) {
        doc.setFontSize(6);
        doc.text(`Data: ${options.signatureDate}`, pageWidth / 2 + 10 + ((pageWidth / 2 - 20 - margin) / 2), sigY + 10, { align: 'center' });
    }

    // Bottom Copy
    doc.setFillColor(248, 250, 252);
    doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
    doc.setFontSize(6);
    doc.setTextColor(colorSubtext[0], colorSubtext[1], colorSubtext[2]);
    doc.text(`© ${new Date().getFullYear()} ${company?.razaoSocial || 'Escopo V3'}. Todos os direitos reservados. | Gerado em ${options.signatureDate || new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 4, { align: 'center' });


    if (returnDoc) return doc as any;
    doc.save(options.fileName || 'relatorio.pdf');
};

export const generateDasReceipt = (company: CompanyEntity | undefined, filing: any) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const content = JSON.parse(filing.content || '{}');

    // Header mimicking official PGDAS
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, 15, pageWidth - (margin * 2), 20, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('RECIBO DE ENTREGA DA DECLARAÇÃO DO SIMPLES NACIONAL', pageWidth / 2, 23, { align: 'center' });
    doc.setFontSize(10);
    doc.text('PROGRAMA GERADOR DO DOCUMENTO DE ARRECADAÇÃO DO SIMPLES NACIONAL - PGDAS-D', pageWidth / 2, 28, { align: 'center' });

    // Protocol Box
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(margin, 40, pageWidth - (margin * 2), 15);
    doc.setFontSize(8);
    doc.text('NÚMERO DO RECIBO / PROTOCOLO', margin + 5, 45);
    doc.setFontSize(14);
    doc.text(content.protocol || '00.00.00.0000000.00', pageWidth / 2, 51, { align: 'center' });

    // Company Data
    let y = 65;
    doc.setFontSize(9);
    doc.text('IDENTIFICAÇÃO DO CONTRIBUINTE', margin, y);
    doc.setLineWidth(0.1);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);

    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.text(`NOME EMPRESARIAL: ${company?.razaoSocial || ''}`, margin, y);
    y += 5;
    doc.text(`CNPJ: ${company?.cnpj || ''}`, margin, y);
    y += 5;
    doc.text(`PERÍODO DE APURAÇÃO: ${filing.competence}`, margin, y);
    y += 5;
    doc.text(`DATA DA TRANSMISSÃO: ${new Date(filing.sentAt).toLocaleString('pt-BR')}`, margin, y);

    // Summary of Values
    y += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO DA APURAÇÃO', margin, y);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);

    y += 10;
    doc.setFont('helvetica', 'normal');
    const rows = [
        ['RECEITA BRUTA TOTAL DO PERÍODO (RPA)', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(content.revenue)],
        ['RECEITA ACUMULADA NOS 12 MESES ANTERIORES (RBT12)', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(content.rbt12)],
        ['ALÍQUOTA EFETIVA APLICADA', (content.effectiveRate * 100).toFixed(4) + '%'],
        ['ANEXO DE ENQUADRAMENTO', 'ANEXO ' + (content.annex || 'III')],
        ['VALOR TOTAL DO DAS A RECOLHER', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(content.taxValue)]
    ];

    rows.forEach(row => {
        doc.text(row[0], margin, y);
        doc.text(row[1], pageWidth - margin, y, { align: 'right' });
        y += 7;
    });

    // Hash and Legal Note
    y += 10;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text(`CÓDIGO DE CONTROLE / HASH: ${content.hash || ''}`, margin, y);

    y += 15;
    const note = 'Esta declaração foi transmitida via sistema de integração segura e as informações aqui contidas são de inteira responsabilidade do contribuinte, sujeitas à auditoria posterior pela Secretaria da Receita Federal do Brasil.';
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(note, pageWidth - (margin * 2)), margin, y);

    // Signature Area
    y = 250;
    doc.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y);
    doc.setFontSize(8);
    doc.text('AUTENTICAÇÃO ELETRÔNICA PGDAS-D', pageWidth / 2, y + 5, { align: 'center' });

    doc.save(`Recibo_PGDAS_${filing.competence.replace('-', '')}.pdf`);
};

export const generateComplianceCertificate = (company: CompanyEntity | undefined, score: number, issuesCount: number) => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // --- Decorative Border ---
    doc.setDrawColor(16, 185, 129); // Emerald 500
    doc.setLineWidth(3);
    doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2));

    doc.setDrawColor(20, 83, 45); // Emerald 900
    doc.setLineWidth(1);
    doc.rect(margin + 2, margin + 2, pageWidth - (margin * 2) - 4, pageHeight - (margin * 2) - 4);

    // --- Header ---
    let y = 50;
    doc.setTextColor(20, 83, 45); // Emerald 900
    doc.setFont('times', 'bold');
    doc.setFontSize(32);
    doc.text('CERTIFICADO DE CONFORMIDADE', pageWidth / 2, y, { align: 'center' });

    y += 15;
    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.setFont('helvetica', 'normal');
    doc.text('AUDITORIA DIGITAL E COMPLIANCE TRIBUTÁRIO', pageWidth / 2, y, { align: 'center' });

    // --- Body ---
    y += 30;
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59); // Slate 800
    const text1 = 'Certificamos para os devidos fins que a empresa:';
    doc.text(text1, pageWidth / 2, y, { align: 'center' });

    y += 15;
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text((company?.razaoSocial || 'EMPRESA NÃO IDENTIFICADA').toUpperCase(), pageWidth / 2, y, { align: 'center' });

    y += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`CNPJ: ${company?.cnpj || 'não informado'}`, pageWidth / 2, y, { align: 'center' });

    y += 20;
    const period = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const text2 = `Foi submetida aos procedimentos de auditoria digital relativos ao período de ${period}, apresentando índice de aderência às normas fiscais e contábeis vigentes.`;
    doc.text(doc.splitTextToSize(text2, pageWidth - 100), pageWidth / 2, y, { align: 'center' });

    // --- Score Badge ---
    y += 35;
    // Draw Badge Circle
    doc.setFillColor(236, 253, 245); // Emerald 50
    doc.circle(pageWidth / 2, y, 25, 'F');
    doc.setDrawColor(16, 185, 129); // Emerald 500
    doc.setLineWidth(2);
    doc.circle(pageWidth / 2, y, 25, 'S');

    doc.setFontSize(28);
    doc.setTextColor(16, 185, 129); // Emerald 500
    doc.setFont('helvetica', 'bold');
    doc.text(`${score.toFixed(1)}%`, pageWidth / 2, y + 2, { align: 'center' });

    doc.setFontSize(8);
    doc.text('ÍNDICE DE CONFORMIDADE', pageWidth / 2, y + 15, { align: 'center' });

    // --- Footer Info ---
    const bottomY = pageHeight - 40;

    // Hash
    const hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(`HASH DE VALIDAÇÃO: ${hash.toUpperCase()}`, margin + 10, bottomY);

    // Date
    doc.text(`EMITIDO EM: ${new Date().toLocaleString()}`, pageWidth - margin - 60, bottomY);

    // Signatures
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 80, bottomY - 10, pageWidth / 2 + 80, bottomY - 10);
    doc.text('ESCOPO V3 - INTEGRAÇÃO CONTÁBIL E TRIBUTÁRIA', pageWidth / 2, bottomY - 5, { align: 'center' });

    // Watermark
    doc.setTextColor(240, 240, 240);
    doc.setFontSize(120);
    doc.setFont('times', 'bold');
    doc.text('VALIDADO', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });

    doc.save(`Certificado_Compliance_${company?.cnpj?.replace(/\D/g, '') || 'company'}.pdf`);
};

export const generateAccountingBook = (
    company: CompanyEntity | undefined,
    data: {
        period: string,
        dre: any[],
        totalizers: ReportTotalizer[],
        balanceSheet: any,
        entries: any[],
        assets: any[],
        chartOfAccounts: any[]
    },
    options: ReportOptions = {},
    returnDoc: boolean = false
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const colorPrimary: [number, number, number] = [37, 99, 235];
    const colorText: [number, number, number] = [30, 41, 59];
    const colorSubtext: [number, number, number] = [100, 116, 139];
    const colorBorder: [number, number, number] = [241, 245, 249];

    const addHeader = (title: string, pageNum: number) => {
        // Simple Header
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, pageWidth, 25, 'F');

        doc.setFontSize(8);
        doc.setTextColor(colorSubtext[0], colorSubtext[1], colorSubtext[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(company?.nomeFantasia?.toUpperCase() || 'SISTEMA CONTÁBIL', margin, 12);

        doc.setFontSize(10);
        doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
        doc.text(title.toUpperCase(), pageWidth - margin, 12, { align: 'right' });

        doc.setDrawColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
        doc.setLineWidth(0.5);
        doc.line(margin, 18, pageWidth - margin, 18);

        doc.setFontSize(7);
        doc.setTextColor(colorSubtext[0], colorSubtext[1], colorSubtext[2]);
        doc.text(`Período: ${data.period} | Emissão: ${new Date().toLocaleDateString()}`, margin, 22);
        doc.text(`Página ${pageNum}`, pageWidth - margin, 22, { align: 'right' });
    };

    let pageCount = 1;

    // --- PAGE 1: COVER ---
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(40);
    doc.setFont('helvetica', 'bold');
    doc.text('LIVRO CONTÁBIL', pageWidth / 2, pageHeight / 3, { align: 'center' });

    doc.setFontSize(18);
    doc.setFont('helvetica', 'normal');
    doc.text('DEMONSTRATIVOS E REGISTROS', pageWidth / 2, pageHeight / 3 + 15, { align: 'center' });

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(1);
    doc.line(pageWidth / 2 - 40, pageHeight / 3 + 25, pageWidth / 2 + 40, pageHeight / 3 + 25);

    doc.setFontSize(14);
    doc.text(company?.razaoSocial || '', pageWidth / 2, pageHeight / 2, { align: 'center' });
    doc.text(`CNPJ: ${company?.cnpj || ''}`, pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`PERÍODO: ${data.period}`, pageWidth / 2, pageHeight - 40, { align: 'center' });
    doc.text(`DATA DE GERAÇÃO: ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 32, { align: 'center' });

    // --- PAGE 2: DRE ---
    doc.addPage();
    pageCount++;
    addHeader('Demonstrativo de Resultado (DRE)', pageCount);

    autoTable(doc, {
        head: [['ESTRUTURA DE RESULTADOS', 'VALOR (R$)', 'A.V. %']],
        body: data.dre.map(item => [item.desc, item.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), item.pct]),
        startY: 30,
        theme: 'striped',
        headStyles: { fillColor: colorPrimary, textColor: 255 },
        styles: { fontSize: 8 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } }
    });

    // --- PAGE 3: BALANÇO ---
    doc.addPage();
    pageCount++;
    addHeader('Balanço Patrimonial', pageCount);

    const bs = data.balanceSheet;
    const balancoRows = [
        ['ATIVO CIRCULANTE', bs.assets.currentAssets.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 'PASSIVO CIRCULANTE', bs.liabilities.currentLiabilities.toLocaleString('pt-BR', { minimumFractionDigits: 2 })],
        ['  Disponibilidades', bs.assets.cash.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), '  Fornecedores', bs.liabilities.suppliers.toLocaleString('pt-BR', { minimumFractionDigits: 2 })],
        ['  Clientes', bs.assets.receivables.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), '  Obrigações Trabalhistas', bs.liabilities.payroll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })],
        ['  Estoques', bs.assets.inventory.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), '  Obrigações Tributárias', bs.liabilities.taxes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })],
        ['', '', '', ''],
        ['ATIVO NÃO CIRCULANTE', bs.assets.fixedAssetsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 'PATRIMÔNIO LÍQUIDO', bs.equity.toLocaleString('pt-BR', { minimumFractionDigits: 2 })],
        ['  Imobilizado', bs.assets.fixedAssetsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), '  Capital/Lucros Acumulados', bs.equity.toLocaleString('pt-BR', { minimumFractionDigits: 2 })],
        ['', '', '', ''],
        ['TOTAL DO ATIVO', bs.assets.totalAssets.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 'TOTAL PASSIVO + PL', (bs.liabilities.totalLiabilities + bs.equity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })]
    ];

    autoTable(doc, {
        head: [['CONTA ATIVO', 'VALOR (R$)', 'CONTA PASSIVO', 'VALOR (R$)']],
        body: balancoRows,
        startY: 30,
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85], textColor: 255 },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: { 1: { halign: 'right' }, 3: { halign: 'right' } }
    });

    // --- PAGE 4: PLANO DE CONTAS ---
    doc.addPage();
    pageCount++;
    addHeader('Plano de Contas Simplificado', pageCount);

    autoTable(doc, {
        head: [['CÓDIGO', 'DESCRIÇÃO DA CONTA', 'TIPO', 'NATUREZA']],
        body: data.chartOfAccounts.map(c => [c.code, c.name, c.type, c.nature]),
        startY: 30,
        theme: 'plain',
        headStyles: { fontStyle: 'bold', lineWidth: { bottom: 0.5 } },
        styles: { fontSize: 7 }
    });

    // --- PAGE 5+: RAZÃO ANALÍTICO ---
    doc.addPage();
    pageCount++;
    addHeader('Razão Analítico (Lançamentos)', pageCount);

    autoTable(doc, {
        head: [['DATA', 'HISTÓRICO', 'DÉBITO', 'CRÉDITO', 'VALOR (R$)']],
        body: data.entries.map(e => [e.date, e.history, e.debitAccount, e.creditAccount, e.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })]),
        startY: 30,
        theme: 'striped',
        headStyles: { fillColor: [100, 116, 139], textColor: 255 },
        styles: { fontSize: 6.5 },
        columnStyles: { 4: { halign: 'right' } },
        margin: { top: 30 }
    });

    // --- PAGE X: ATIVOS ---
    if (data.assets.length > 0) {
        doc.addPage();
        pageCount++;
        addHeader('Relatório de Ativos Imobilizados', pageCount);

        autoTable(doc, {
            head: [['DESCRIÇÃO', 'AQUISIÇÃO', 'VALOR COMPRA', 'VIDA ÚTIL', 'AMORT. MÊS']],
            body: data.assets.map(a => [a.name, a.acquisitionDate, a.acquisitionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), `${a.usefulLifeMonths} Meses`, (a.acquisitionValue / a.usefulLifeMonths).toLocaleString('pt-BR', { minimumFractionDigits: 2 })]),
            startY: 30,
            theme: 'striped',
            styles: { fontSize: 7 },
            columnStyles: { 2: { halign: 'right' }, 3: { halign: 'center' }, 4: { halign: 'right' } }
        });
    }

    // --- FOOTER Watermark ---
    const totalPages = pageCount;
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(6);
        doc.setTextColor(200);
        doc.text(`Escopo V3 - Sistema Integrado de Gestão Contábil - ${company?.cnpj}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    if (returnDoc) return doc as any;
    doc.save(options.fileName || `Livro_Contabil_${company?.nomeFantasia}_${data.period.replace('/', '_')}.pdf`);
};
