import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generatePayslipPDF } from '../utils/payslipPdfGenerator';
import { PayrollRun, PayrollRunDetail, CompanyEntity } from '../types';
import { formatDateBR } from '../utils/formatters';

export const generatePayrollSummaryPDF = async (
    run: PayrollRun,
    selectedCompany: CompanyEntity | null,
    onStatusChange: (isProcessing: boolean) => void,
    showError: (err: any) => void,
    setPdfPreview: (url: string, doc: jsPDF, name: string) => void
) => {
    onStatusChange(true);
    try {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;
        const colors = {
            primary: [23, 37, 84] as [number, number, number],
            accent: [249, 115, 22] as [number, number, number],
            white: [255, 255, 255] as [number, number, number],
            textDark: [51, 65, 85] as [number, number, number]
        };

        const fmtMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

        const drawHeader = (doc: jsPDF) => {
            doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            doc.rect(0, 0, pageWidth, 25, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(selectedCompany?.razaoSocial || 'EMPRESA NÃO IDENTIFICADA', margin, 10);

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`${selectedCompany?.cnpj || 'CNPJ NÃO INFORMADO'} | ${selectedCompany?.address?.city || ''} - ${selectedCompany?.address?.uf || ''}`, margin, 14);

            doc.setFontSize(16);
            doc.text('RESUMO DE FOLHA DE PAGAMENTO', pageWidth - margin, 12, { align: 'right' });
            doc.setFontSize(10);
            doc.text(`COMPETÊNCIA: ${run.competence}`, pageWidth - margin, 18, { align: 'right' });
        };

        const drawFooter = (doc: jsPDF) => {
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`EscopoV3 Sistema Contábil - Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
                doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, pageHeight - 5);
            }
        };

        // Calculate Totals per Employee and Company
        let totalBruto = 0;
        let totalLiq = 0;
        let totalINSS = 0;
        let totalIRRF = 0;
        let totalFGTS = 0;
        let totalDesc = 0;

        const tableData = (run.details || []).map(d => {
            const inss = d.inssValue || d.events.find(e => e.description.includes('INSS'))?.value || 0;
            const irrf = d.irrfValue || d.events.find(e => e.description.includes('IRRF'))?.value || 0;
            const fgts = d.fgtsValue || 0;

            totalBruto += d.totalProventos;
            totalLiq += d.netSalary;
            totalINSS += inss;
            totalIRRF += irrf;
            totalFGTS += fgts;
            totalDesc += d.totalDescontos;

            return [
                d.employeeName.toUpperCase(),
                d.role || '-',
                d.personType === 'partner' ? 'SÓCIO' : 'CLT',
                fmtMoney(d.baseSalary),
                fmtMoney(d.totalProventos),
                fmtMoney(inss),
                fmtMoney(irrf),
                fmtMoney(fgts),
                fmtMoney(d.totalDescontos),
                { content: fmtMoney(d.netSalary), styles: { fontStyle: 'bold' as const, textColor: [22, 163, 74] as [number, number, number] } }
            ];
        });

        // Grand Total Row
        const totalRow = [
            { content: 'TOTAL GERAL', colSpan: 3, styles: { fontStyle: 'bold' as const, halign: 'right' as const, fillColor: [241, 245, 249] as [number, number, number] } },
            { content: fmtMoney((run.details || []).reduce((a, b) => a + b.baseSalary, 0)), styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
            { content: fmtMoney(totalBruto), styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
            { content: fmtMoney(totalINSS), styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
            { content: fmtMoney(totalIRRF), styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
            { content: fmtMoney(totalFGTS), styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
            { content: fmtMoney(totalDesc), styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
            { content: fmtMoney(totalLiq), styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } }
        ];

        tableData.push(totalRow as any);

        autoTable(doc, {
            startY: 35,
            head: [['Funcionário', 'Cargo', 'Tipo', 'Sal. Base', 'Proventos', 'INSS', 'IRRF', 'FGTS', 'Descontos', 'Líquido']],
            body: tableData,
            styles: { fontSize: 7, cellPadding: 2, lineColor: [240, 240, 240], lineWidth: 0.1 },
            headStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: 'bold', halign: 'center' },
            columnStyles: {
                0: { cellWidth: 35 }, 1: { cellWidth: 20 }, 2: { cellWidth: 12, halign: 'center' },
                3: { halign: 'right' }, 4: { halign: 'right', textColor: [44, 62, 80] },
                5: { halign: 'right', textColor: [192, 57, 43] }, 6: { halign: 'right', textColor: [192, 57, 43] },
                7: { halign: 'right', textColor: [127, 140, 141] }, 8: { halign: 'right', textColor: [192, 57, 43] },
                9: { halign: 'right', fontStyle: 'bold' }
            },
            alternateRowStyles: { fillColor: [250, 250, 250] },
            didDrawPage: (data) => { drawHeader(doc); }
        });

        let currentY = (doc as any).lastAutoTable.finalY + 15;
        if (currentY + 35 > pageHeight - 20) {
            doc.addPage();
            drawHeader(doc);
            currentY = 35;
        }

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 25, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 25, 2, 2, 'S');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
        doc.text('RESUMO DE ENCARGOS DA COMPETÊNCIA', margin + 5, currentY + 7);

        const startYBox = currentY + 12;
        const colWidth = (pageWidth - (margin * 2) - 10) / 4;

        const drawSummaryItem = (label: string, value: number, x: number) => {
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(label.toUpperCase(), x, startYBox);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(44, 62, 80);
            doc.text(fmtMoney(value), x, startYBox + 5);
        };

        drawSummaryItem('Total INSS (Recolher)', totalINSS, margin + 5);
        drawSummaryItem('Total FGTS (Depositar)', totalFGTS, margin + 5 + colWidth);
        drawSummaryItem('Total IRRF (Recolher)', totalIRRF, margin + 5 + (colWidth * 2));
        drawSummaryItem('Custo Total Folha', totalBruto + totalFGTS, margin + 5 + (colWidth * 3));

        currentY += 40;
        if (currentY + 50 > pageHeight - 20) {
            doc.addPage();
            drawHeader(doc);
            currentY = 40;
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
        const city = selectedCompany?.address?.city || 'Local Indefinido';
        const dateStr = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
        doc.text(`${city}, ${dateStr}`, margin, currentY);

        currentY += 20;
        doc.setDrawColor(100, 100, 100);
        doc.line(margin, currentY, margin + 80, currentY);
        doc.line(pageWidth - margin - 80, currentY, pageWidth - margin, currentY);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(selectedCompany?.razaoSocial || 'EMPRESA', margin + 40, currentY + 5, { align: 'center' });
        doc.text('RESPONSÁVEL TÉCNICO / RH', pageWidth - margin - 40, currentY + 5, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('Assinatura do Empregador', margin + 40, currentY + 9, { align: 'center' });
        doc.text('Departamento Pessoal', pageWidth - margin - 40, currentY + 9, { align: 'center' });

        currentY += 15;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        const legalText = 'FUNDAMENTAÇÃO LEGAL: Documento auxiliar de conferência de folha de pagamento. Os valores de INSS e IRRF devem ser conferidos com as guias de recolhimento oficiais (DAE/DARF) geradas pelo eSocial/DCTFWeb.';
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 12, 2, 2, 'FD');
        doc.setTextColor(100, 110, 120);
        doc.text(legalText, margin + 3, currentY + 5, { maxWidth: pageWidth - (margin * 2) - 6 });

        drawFooter(doc);

        const pdfBlob = doc.output('bloburl');
        setPdfPreview(pdfBlob.toString(), doc, `Resumo_Folha_${run.competence.replace(/\//g, '-')}.pdf`);

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
        onStatusChange(false);
    }
};

export const generateSinglePayslipPDF = async (
    detail: PayrollRunDetail,
    people: any[],
    selectedCompany: CompanyEntity | null,
    currentCompetence: string,
    action: 'print' | 'download',
    onStatusChange: (isProcessing: boolean) => void,
    showError: (err: any) => void
) => {
    onStatusChange(true);
    try {
        const person = people.find(p => p.id === detail.employeeId) || {
            id: detail.employeeId,
            name: detail.employeeName,
            type: detail.personType,
            role: detail.role,
            pis: '', admissionDate: '', cbo: ''
        };

        const templateData = {
            person: { ...person, name: detail.employeeName, role: detail.role, type: detail.personType },
            events: detail.events,
            totalProventos: detail.totalProventos,
            totalDescontos: detail.totalDescontos,
            netSalary: detail.netSalary,
            baseINSS: detail.baseINSS,
            baseIRRF: detail.baseIRRF,
            baseFGTS: detail.baseFGTS,
            fgtsValue: detail.fgtsValue,
            proLaboreOverride: detail.personType === 'partner' ? detail.baseSalary : 0,
        };

        const pdf = generatePayslipPDF(templateData, selectedCompany, detail.competence || currentCompetence);

        if (action === 'print') {
            pdf.autoPrint();
            window.open(pdf.output('bloburl'), '_blank');
        } else {
            pdf.save('Holerite_' + detail.employeeName.replace(/\s+/g, '_') + '_' + (detail.competence || 'Folha').replace('/', '-') + '.pdf');
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
        onStatusChange(false);
    }
};
