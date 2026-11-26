const fs = require('fs');
const path = 'pages/Payroll.tsx';
let content = fs.readFileSync(path, 'utf8');

// Find the first pdf/renderVia block (the one inside handlePayslipAction function)
const START_MARKER = "            const pdf = new jsPDF('p', 'mm', 'a4');\r\n            const pdfWidth = pdf.internal.pageSize.getWidth();\r\n            const pdfHeight = pdf.internal.pageSize.getHeight();\r\n            const margin = 5;\r\n            const printableWidth = pdfWidth - (margin * 2);\r\n            const viaHeight = (pdfHeight - 12) / 2; // ~142.5mm per via";
const END_MARKER = "            };\r\n\r\n            await addPayslipPage();";

const sIdx = content.indexOf(START_MARKER);
const eIdx = content.indexOf(END_MARKER, sIdx) + END_MARKER.length;

if (sIdx === -1) { console.error('START not found'); process.exit(1); }
if (eIdx < END_MARKER.length) { console.error('END not found'); process.exit(1); }

console.log('Found block at', sIdx, '-', eIdx);

const newBlock = `            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 5;
            const printableWidth = pdfWidth - (margin * 2);

            // Returns actual canvas { dataUrl, pxW, pxH } - no fixed heights
            const renderVia = async (label: string): Promise<{ dataUrl: string; pxW: number; pxH: number }> => {
                const tempDiv = document.createElement('div');
                tempDiv.style.position = 'fixed';
                tempDiv.style.left = '-9999px';
                tempDiv.style.top = '0';
                tempDiv.style.width = '794px';
                tempDiv.style.background = '#ffffff';
                tempDiv.style.overflow = 'visible';
                document.body.appendChild(tempDiv);

                const vRoot = createRoot(tempDiv);
                vRoot.render(
                    <PayslipTemplate
                        data={templateData}
                        company={selectedCompany}
                        label={label}
                        id={'payslip-' + label.charAt(0)}
                        competence={detail.competence}
                    />
                );

                await new Promise(resolve => setTimeout(resolve, 800));

                const canvas = await html2canvas(tempDiv, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    width: tempDiv.scrollWidth,
                    height: tempDiv.scrollHeight,
                } as any);

                vRoot.unmount();
                document.body.removeChild(tempDiv);
                return { dataUrl: canvas.toDataURL('image/jpeg', 0.95), pxW: canvas.width, pxH: canvas.height };
            };

            const addPayslipPage = async () => {
                const via1 = await renderVia('1\xAA VIA - EMPREGADOR');
                const via2 = await renderVia('2\xAA VIA - COLABORADOR');

                // Real mm height computed from pixel aspect ratio
                const h1mm = (via1.pxH / via1.pxW) * printableWidth;
                const h2mm = (via2.pxH / via2.pxW) * printableWidth;
                const sepGap = 6;
                const totalH = 2 + h1mm + sepGap + h2mm + 2;

                if (totalH <= pdfHeight) {
                    const y1 = 2;
                    pdf.addImage(via1.dataUrl, 'JPEG', margin, y1, printableWidth, h1mm);
                    const yLine = y1 + h1mm + (sepGap / 2);
                    (pdf as any).setLineDashPattern([2, 2], 0);
                    pdf.setDrawColor(160, 160, 160);
                    pdf.line(margin, yLine, pdfWidth - margin, yLine);
                    (pdf as any).setLineDashPattern([], 0);
                    pdf.addImage(via2.dataUrl, 'JPEG', margin, y1 + h1mm + sepGap, printableWidth, h2mm);
                } else {
                    pdf.addImage(via1.dataUrl, 'JPEG', margin, 2, printableWidth, h1mm);
                    pdf.addPage();
                    pdf.addImage(via2.dataUrl, 'JPEG', margin, 2, printableWidth, h2mm);
                }
            };

            await addPayslipPage();`;

const newContent = content.substring(0, sIdx) + newBlock + content.substring(eIdx);
fs.writeFileSync(path, newContent, 'utf8');
console.log('Done! First renderVia block replaced.');
console.log('New file length:', newContent.length);
