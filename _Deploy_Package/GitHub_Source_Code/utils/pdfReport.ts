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
}

export const generatePDFReport = (
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
    const colorPrimary = [37, 99, 235]; // Blue 600
    const colorText = [30, 41, 59]; // Slate 800
    const colorSubtext = [100, 116, 139]; // Slate 500
    const colorBorder = [226, 232, 240]; // Slate 200

    // --- Header Section ---
    // Company Logo Placeholder
    doc.setFillColor(239, 246, 255); // Blue 50
    doc.roundedRect(margin, 15, 12, 12, 2, 2, 'F');
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(company?.razaoSocial?.substring(0, 1) || 'E', margin + 3.5, 22.5);

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
    doc.text(new Date().toLocaleString('pt-BR'), pageWidth / 2, infoY + 5, { align: 'center' });

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
        margin: { left: margin, right: margin }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;

    // --- Totalizers Section ---
    if (totalizers.length > 0) {
        if (finalY > pageHeight - 50) {
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

            // Card Border
            doc.setDrawColor(colorBorder[0], colorBorder[1], colorBorder[2]);
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

            // Label
            doc.setFontSize(7);
            doc.setTextColor(colorSubtext[0], colorSubtext[1], colorSubtext[2]);
            doc.text(t.label, x + 4, y + 8);

            // Value
            doc.setFontSize(12);
            doc.setTextColor(colorText[0], colorText[1], colorText[2]);
            let displayValue = String(t.value);
            if (typeof t.value === 'number') {
                const labelLower = String(t.label).toLowerCase();
                // Format as currency if icon is dollar OR (icon is not specific AND label implies money but not count)
                const isCurrency = t.icon === 'dollar' || (
                    t.icon !== 'hash' &&
                    t.icon !== 'percent' &&
                    (labelLower.includes('valor') || (labelLower.includes('total') && !labelLower.includes('registros') && !labelLower.includes('qtd') && !labelLower.includes('documentos')))
                );

                if (isCurrency) {
                    displayValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.value);
                }
            }
            doc.text(displayValue, x + 4, y + 18);

            // Icon Placeholder (Right side)
            let iconColor = [59, 130, 246]; // Blue default
            if (t.color === 'green') iconColor = [34, 197, 94];
            if (t.color === 'orange') iconColor = [249, 115, 22];

            // Draw a small colored circle
            doc.setFillColor(iconColor[0], iconColor[1], iconColor[2]);
            // doc.circle(x + cardWidth - 10, y + 12, 4, 'F'); // too generic

            // Draw visual hint based on icon type
            if (t.icon === 'percent') {
                doc.setTextColor(iconColor[0], iconColor[1], iconColor[2]);
                doc.setFontSize(14);
                doc.text('%', x + cardWidth - 8, y + 16, { align: 'center' });
            } else if (t.icon === 'dollar') {
                // Simple circle with $
                doc.setFillColor(239, 246, 255);
                doc.circle(x + cardWidth - 10, y + 12, 6, 'F');
                doc.setTextColor(37, 99, 235);
                doc.setFontSize(10);
                doc.text('$', x + cardWidth - 10, y + 13.5, { align: 'center' });
            } else {
                // Generic List icon
                doc.setFillColor(241, 245, 249);
                doc.circle(x + cardWidth - 10, y + 12, 6, 'F');
                doc.setDrawColor(colorSubtext[0], colorSubtext[1], colorSubtext[2]);
                doc.line(x + cardWidth - 12, y + 10, x + cardWidth - 8, y + 10);
                doc.line(x + cardWidth - 12, y + 12, x + cardWidth - 8, y + 12);
                doc.line(x + cardWidth - 12, y + 14, x + cardWidth - 8, y + 14);
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

    // Right Sig
    doc.line(pageWidth / 2 + 10, sigY, pageWidth - margin - 10, sigY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorText[0], colorText[1], colorText[2]);
    doc.text('Contabilidade', pageWidth / 2 + 10 + ((pageWidth / 2 - 20 - margin) / 2), sigY + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colorSubtext[0], colorSubtext[1], colorSubtext[2]);
    doc.text('CRC / Assinatura', pageWidth / 2 + 10 + ((pageWidth / 2 - 20 - margin) / 2), sigY + 7, { align: 'center' });

    // Bottom Copy
    doc.setFillColor(248, 250, 252);
    doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
    doc.setFontSize(6);
    doc.setTextColor(colorSubtext[0], colorSubtext[1], colorSubtext[2]);
    doc.text(`© ${new Date().getFullYear()} ${company?.razaoSocial || 'Escopo V3'}. Todos os direitos reservados. | Gerado em ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 4, { align: 'center' });


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
