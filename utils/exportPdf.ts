import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CompanyEntity } from '../types';

const INDIGO     = [79,  70,  229] as const;
const DARK_BG    = [30,  41,  59]  as const;
const SLATE_600  = [71,  85,  105] as const;
const SLATE_400  = [148, 163, 184] as const;
const SLATE_200  = [226, 232, 240] as const;
const WHITE      = [255, 255, 255] as const;

export const exportElementToPdf = async (
    element: HTMLElement | null,
    fileName: string,
    company?: CompanyEntity | any
) => {
    if (!element) return;

    try {
        document.body.classList.add('exporting-pdf');
        await new Promise(r => setTimeout(r, 150));

        const canvas = await html2canvas(element, { scale: 2.5, useCORS: true } as any);
        document.body.classList.remove('exporting-pdf');

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const PW = pdf.internal.pageSize.getWidth();   // 210
        const PH = pdf.internal.pageSize.getHeight();  // 297

        const HEADER_H    = 42;
        const FOOTER_H    = 14;
        const SIDE_MARGIN = 12;
        const contentH    = PH - HEADER_H - FOOTER_H;
        const imgW        = PW - SIDE_MARGIN * 2;
        const imgH        = (canvas.height * imgW) / canvas.width;

        let heightLeft  = imgH;
        let page        = 1;
        const totalPages = Math.ceil(imgH / contentH);

        // ─── HEADER ───────────────────────────────────────────────────────────
        const drawHeader = () => {
            // Dark gradient band
            pdf.setFillColor(...DARK_BG);
            pdf.rect(0, 0, PW, HEADER_H, 'F');

            // Indigo accent strip on left
            pdf.setFillColor(...INDIGO);
            pdf.rect(0, 0, 6, HEADER_H, 'F');

            // Logo box
            const LOGO_X = 14, LOGO_Y = 7, LOGO_W = 22, LOGO_H = 22;
            if (company?.logo) {
                pdf.addImage(company.logo, 'PNG', LOGO_X, LOGO_Y, LOGO_W, LOGO_H);
            } else {
                pdf.setFillColor(255, 255, 255, 0.15);
                // Rounded box simulation
                pdf.setFillColor(50, 55, 75);
                pdf.roundedRect(LOGO_X, LOGO_Y, LOGO_W, LOGO_H, 3, 3, 'F');
                pdf.setFillColor(...INDIGO);
                pdf.roundedRect(LOGO_X + 1, LOGO_Y + 1, LOGO_W - 2, LOGO_H - 2, 2, 2, 'F');
                pdf.setTextColor(...WHITE);
                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'bold');
                const initials = (company?.nomeFantasia || company?.razaoSocial || 'CO')
                    .split(' ')
                    .slice(0, 2)
                    .map((w: string) => w[0])
                    .join('')
                    .toUpperCase();
                pdf.text(initials, LOGO_X + LOGO_W / 2, LOGO_Y + LOGO_H / 2 + 1.5, { align: 'center' });
            }

            // Company name
            const nameX = LOGO_X + LOGO_W + 5;
            pdf.setTextColor(...WHITE);
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text(company?.razaoSocial || company?.nomeFantasia || 'Empresa', nameX, 15);

            // CNPJ + address
            pdf.setTextColor(...SLATE_400);
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            let infoLine = `CNPJ: ${company?.cnpj || '-'}`;
            if (company?.address?.city) {
                infoLine += `  ·  ${company.address.city}${company.address.state ? '/' + company.address.state : ''}`;
            }
            pdf.text(infoLine, nameX, 21);

            // Divider line inside header
            pdf.setDrawColor(255, 255, 255, 0.12);
            pdf.setLineWidth(0.3);
            pdf.line(LOGO_X, 30, PW - 14, 30);

            // Report title (bottom of header)
            const reportTitle = fileName.replace(/_/g, ' ').toUpperCase();
            pdf.setTextColor(...WHITE);
            pdf.setFontSize(13);
            pdf.setFont('helvetica', 'bold');
            pdf.text(reportTitle, nameX, 38);

            // Right-side badge
            const BADGE_W = 46, BADGE_H = 8, BADGE_X = PW - BADGE_W - 10, BADGE_Y = 10;
            pdf.setFillColor(99, 102, 241);
            pdf.roundedRect(BADGE_X, BADGE_Y, BADGE_W, BADGE_H, 2, 2, 'F');
            pdf.setTextColor(...WHITE);
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'bold');
            pdf.text('RELATÓRIO CONTÁBIL', BADGE_X + BADGE_W / 2, BADGE_Y + 5.3, { align: 'center' });

            // Date
            const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
            const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            pdf.setTextColor(...SLATE_400);
            pdf.setFontSize(7.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`${date} · ${time}`, PW - 10, 22, { align: 'right' });

            // Page indicator top right
            pdf.setTextColor(...SLATE_400);
            pdf.setFontSize(7);
            pdf.text(`Pág. ${page} de ${totalPages}`, PW - 10, 38, { align: 'right' });
        };

        // ─── FOOTER ───────────────────────────────────────────────────────────
        const drawFooter = () => {
            const Y = PH - FOOTER_H;

            // Top line
            pdf.setDrawColor(...SLATE_200);
            pdf.setLineWidth(0.4);
            pdf.line(SIDE_MARGIN, Y, PW - SIDE_MARGIN, Y);

            // Left: company name
            pdf.setTextColor(...SLATE_600);
            pdf.setFontSize(7.5);
            pdf.setFont('helvetica', 'bold');
            pdf.text(company?.nomeFantasia || company?.razaoSocial || 'Sistema', SIDE_MARGIN, Y + 5);

            // Center: system label
            pdf.setTextColor(...SLATE_400);
            pdf.setFont('helvetica', 'normal');
            pdf.text('Documento gerado automaticamente — Confidencial', PW / 2, Y + 5, { align: 'center' });

            // Right: CNPJ
            pdf.setTextColor(...SLATE_600);
            pdf.text(`CNPJ: ${company?.cnpj || '-'}`, PW - SIDE_MARGIN, Y + 5, { align: 'right' });
        };

        // ─── PAGE 1 ───────────────────────────────────────────────────────────
        drawHeader();
        pdf.addImage(imgData, 'PNG', SIDE_MARGIN, HEADER_H, imgW, imgH);
        drawFooter();
        heightLeft -= contentH;

        // ─── EXTRA PAGES ─────────────────────────────────────────────────────
        while (heightLeft > 0) {
            const shift = heightLeft - imgH;
            pdf.addPage();
            page++;

            pdf.addImage(imgData, 'PNG', SIDE_MARGIN, shift + HEADER_H, imgW, imgH);

            // White mask over header area
            pdf.setFillColor(...WHITE);
            pdf.rect(0, 0, PW, HEADER_H, 'F');

            drawHeader();
            drawFooter();
            heightLeft -= contentH;
        }

        pdf.save(`${fileName}.pdf`);

    } catch (error) {
        document.body.classList.remove('exporting-pdf');
        console.error('Erro ao exportar PDF:', error);
        alert('Ocorreu um erro ao gerar o PDF. Tente novamente.');
    }
};
