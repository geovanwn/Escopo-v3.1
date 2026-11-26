const fs = require('fs');
const path = 'pages/Payroll.tsx';
let content = fs.readFileSync(path, 'utf8');

// Find the second pdf block (cockpit download button)
const START2 = "                                            const pdf = new jsPDF('p', 'mm', 'a4');\r\n                                            const pdfWidth = pdf.internal.pageSize.getWidth();\r\n                                            const pdfHeight = pdf.internal.pageSize.getHeight();\r\n                                            const margin = 5;\r\n                                            const printableWidth = pdfWidth - (margin * 2);\r\n                                            const viaHeight = (pdfHeight - 12) / 2;";

const END2 = "                                            await addPayslipPage();\r\n                                            pdf.save";

const sIdx = content.indexOf(START2);
const eIdx = content.indexOf(END2, sIdx);

if (sIdx === -1) { console.error('START2 not found'); process.exit(1); }
if (eIdx === -1) { console.error('END2 not found'); process.exit(1); }

console.log('Found cockpit block at', sIdx, '-', eIdx);

const newBlock = `                                            const pdf = new jsPDF('p', 'mm', 'a4');
                                            const pdfWidth = pdf.internal.pageSize.getWidth();
                                            const pdfHeight = pdf.internal.pageSize.getHeight();
                                            const margin = 5;
                                            const printableWidth = pdfWidth - (margin * 2);

                                            // Render element off-screen, return data + pixel dimensions
                                            const renderEl = async (element: React.ReactElement): Promise<{ dataUrl: string; pxW: number; pxH: number }> => {
                                                const d = document.createElement('div');
                                                d.style.position = 'fixed';
                                                d.style.left = '-9999px';
                                                d.style.top = '0';
                                                d.style.width = '794px';
                                                d.style.background = '#fff';
                                                d.style.overflow = 'visible';
                                                document.body.appendChild(d);
                                                const r = createRoot(d);
                                                r.render(element);
                                                await new Promise(res => setTimeout(res, 800));
                                                const c = await html2canvas(d, {
                                                    scale: 2, useCORS: true, logging: false,
                                                    backgroundColor: '#ffffff',
                                                    width: d.scrollWidth, height: d.scrollHeight,
                                                } as any);
                                                r.unmount();
                                                document.body.removeChild(d);
                                                return { dataUrl: c.toDataURL('image/jpeg', 0.95), pxW: c.width, pxH: c.height };
                                            };

                                            const placeTwoVias = (v1: { dataUrl: string; pxW: number; pxH: number }, v2?: { dataUrl: string; pxW: number; pxH: number }) => {
                                                const h1mm = (v1.pxH / v1.pxW) * printableWidth;
                                                pdf.addImage(v1.dataUrl, 'JPEG', margin, 2, printableWidth, h1mm);
                                                if (!v2) return;
                                                const h2mm = (v2.pxH / v2.pxW) * printableWidth;
                                                const sepGap = 6;
                                                const totalH = 2 + h1mm + sepGap + h2mm + 2;
                                                if (totalH <= pdfHeight) {
                                                    const yLine = 2 + h1mm + sepGap / 2;
                                                    (pdf as any).setLineDashPattern([2, 2], 0);
                                                    pdf.setDrawColor(160, 160, 160);
                                                    pdf.line(margin, yLine, pdfWidth - margin, yLine);
                                                    (pdf as any).setLineDashPattern([], 0);
                                                    pdf.addImage(v2.dataUrl, 'JPEG', margin, 2 + h1mm + sepGap, printableWidth, h2mm);
                                                } else {
                                                    pdf.addPage();
                                                    pdf.addImage(v2.dataUrl, 'JPEG', margin, 2, printableWidth, h2mm);
                                                }
                                            };

                                            const addPayslipPage = async () => {
                                                if (inputs.calculationType === 'rescisao') {
                                                    const v1 = await renderEl(<TRCTTemplate data={calculatedResult} company={selectedCompany} inputs={inputs} />);
                                                    placeTwoVias(v1);
                                                } else if (inputs.calculationType === 'decimo_terceiro') {
                                                    const v1 = await renderEl(<DecimoTerceiroTemplate data={calculatedResult} company={selectedCompany} label={\`1\xAA VIA - EMPREGADOR\`} id="v1" inputs={inputs} />);
                                                    const v2 = await renderEl(<DecimoTerceiroTemplate data={calculatedResult} company={selectedCompany} label={\`2\xAA VIA - COLABORADOR\`} id="v2" inputs={inputs} />);
                                                    placeTwoVias(v1, v2);
                                                } else if (inputs.calculationType === 'ferias') {
                                                    const v1 = await renderEl(<FeriasTemplate data={calculatedResult} company={selectedCompany} label={\`1\xAA VIA - EMPREGADOR\`} id="v1" inputs={inputs} />);
                                                    const v2 = await renderEl(<FeriasTemplate data={calculatedResult} company={selectedCompany} label={\`2\xAA VIA - COLABORADOR\`} id="v2" inputs={inputs} />);
                                                    placeTwoVias(v1, v2);
                                                } else {
                                                    const v1 = await renderEl(<PayslipTemplate data={calculatedResult} company={selectedCompany} label={\`1\xAA VIA - EMPREGADOR\`} id="v1" competence={currentCompetence} />);
                                                    const v2 = await renderEl(<PayslipTemplate data={calculatedResult} company={selectedCompany} label={\`2\xAA VIA - COLABORADOR\`} id="v2" competence={currentCompetence} />);
                                                    placeTwoVias(v1, v2);
                                                }
                                            };

                                            await addPayslipPage();
                                            pdf.save`;

const newContent = content.substring(0, sIdx) + newBlock + content.substring(eIdx + END2.length);
fs.writeFileSync(path, newContent, 'utf8');
console.log('Done! Cockpit block replaced.');
