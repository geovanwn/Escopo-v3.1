const fs = require('fs');
const path = 'pages/Payroll.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the cockpit PDF generation block (lines 1570-1664)
const oldCockpit = `                                            const pdf = new jsPDF('p', 'mm', 'a4');
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
                                                            <TRCTTemplate data={calculatedResult} company={selectedCompany} inputs={inputs} />
                                                        ) : inputs.calculationType === 'decimo_terceiro' ? (
                                                            <>
                                                                <DecimoTerceiroTemplate
                                                                    data={calculatedResult}
                                                                    company={selectedCompany}
                                                                    label="1ª VIA - EMPREGADOR"
                                                                    id="temp-payslip-1"
                                                                    inputs={inputs}
                                                                />
                                                                <div style={{ borderBottom: '1px dashed #ccc', margin: '0 5mm' }}></div>
                                                                <DecimoTerceiroTemplate
                                                                    data={calculatedResult}
                                                                    company={selectedCompany}
                                                                    label="2ª VIA - COLABORADOR"
                                                                    id="temp-payslip-2"
                                                                    inputs={inputs}
                                                                />
                                                            </>
                                                        ) : inputs.calculationType === 'ferias' ? (
                                                            <>
                                                                <FeriasTemplate
                                                                    data={calculatedResult}
                                                                    company={selectedCompany}
                                                                    label="1ª VIA - EMPREGADOR"
                                                                    id="temp-payslip-1"
                                                                    inputs={inputs}
                                                                />
                                                                <div style={{ borderBottom: '1px dashed #ccc', margin: '0 5mm' }}></div>
                                                                <FeriasTemplate
                                                                    data={calculatedResult}
                                                                    company={selectedCompany}
                                                                    label="2ª VIA - COLABORADOR"
                                                                    id="temp-payslip-2"
                                                                    inputs={inputs}
                                                                />
                                                            </>
                                                        ) : (
                                                            <>
                                                                <PayslipTemplate
                                                                    data={calculatedResult}
                                                                    company={selectedCompany}
                                                                    label="1ª VIA - EMPREGADOR"
                                                                    id="temp-payslip-1"
                                                                    inputs={inputs}
                                                                />
                                                                <div style={{ borderBottom: '1px dashed #ccc', margin: '0 5mm' }}></div>
                                                                <PayslipTemplate
                                                                    data={calculatedResult}
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
                                            };`;

const newCockpit = `                                            const pdf = new jsPDF('p', 'mm', 'a4');
                                            const pdfWidth = pdf.internal.pageSize.getWidth();
                                            const pdfHeight = pdf.internal.pageSize.getHeight();
                                            const margin = 5;
                                            const printableWidth = pdfWidth - (margin * 2);
                                            const viaHeight = (pdfHeight - 12) / 2;

                                            const renderViaEl = async (element: JSX.Element, viaLabel: string): Promise<string> => {
                                                const d = document.createElement('div');
                                                d.style.position = 'fixed';
                                                d.style.left = '-9999px';
                                                d.style.top = '0';
                                                d.style.width = '200mm';
                                                d.style.background = '#fff';
                                                document.body.appendChild(d);
                                                const r = createRoot(d);
                                                r.render(element);
                                                await new Promise(res => setTimeout(res, 700));
                                                const c = await html2canvas(d, {
                                                    scale: 2.5, useCORS: true, logging: false,
                                                    windowWidth: 756, backgroundColor: '#ffffff',
                                                } as any);
                                                r.unmount();
                                                document.body.removeChild(d);
                                                return c.toDataURL('image/png');
                                            };

                                            const addPayslipPage = async () => {
                                                let img1: string, img2: string;
                                                if (inputs.calculationType === 'rescisao') {
                                                    img1 = await renderViaEl(<TRCTTemplate data={calculatedResult} company={selectedCompany} inputs={inputs} />, '1');
                                                    img2 = img1;
                                                } else if (inputs.calculationType === 'decimo_terceiro') {
                                                    img1 = await renderViaEl(<DecimoTerceiroTemplate data={calculatedResult} company={selectedCompany} label="1ª VIA - EMPREGADOR" id="v1" inputs={inputs} />, '1');
                                                    img2 = await renderViaEl(<DecimoTerceiroTemplate data={calculatedResult} company={selectedCompany} label="2ª VIA - COLABORADOR" id="v2" inputs={inputs} />, '2');
                                                } else if (inputs.calculationType === 'ferias') {
                                                    img1 = await renderViaEl(<FeriasTemplate data={calculatedResult} company={selectedCompany} label="1ª VIA - EMPREGADOR" id="v1" inputs={inputs} />, '1');
                                                    img2 = await renderViaEl(<FeriasTemplate data={calculatedResult} company={selectedCompany} label="2ª VIA - COLABORADOR" id="v2" inputs={inputs} />, '2');
                                                } else {
                                                    img1 = await renderViaEl(<PayslipTemplate data={calculatedResult} company={selectedCompany} label="1ª VIA - EMPREGADOR" id="v1" competence={currentCompetence} />, '1');
                                                    img2 = await renderViaEl(<PayslipTemplate data={calculatedResult} company={selectedCompany} label="2ª VIA - COLABORADOR" id="v2" competence={currentCompetence} />, '2');
                                                }

                                                pdf.addImage(img1, 'PNG', margin, 2, printableWidth, viaHeight);
                                                pdf.setLineDashPattern([2, 2], 0);
                                                pdf.setDrawColor(180, 180, 180);
                                                pdf.line(margin, viaHeight + 4.5, pdfWidth - margin, viaHeight + 4.5);
                                                pdf.setLineDashPattern([], 0);
                                                if (inputs.calculationType !== 'rescisao') {
                                                    pdf.addImage(img2, 'PNG', margin, viaHeight + 7, printableWidth, viaHeight);
                                                }
                                            };`;

const idx = content.indexOf(oldCockpit);
if (idx === -1) {
    // Try with \r\n
    const normalized = oldCockpit.replace(/\n/g, '\r\n');
    const idx2 = content.indexOf(normalized);
    if (idx2 !== -1) {
        const newContent = content.substring(0, idx2) + newCockpit + content.substring(idx2 + normalized.length);
        fs.writeFileSync(path, newContent, 'utf8');
        console.log('Done (CRLF match)!');
    } else {
        // Find by key markers
        const startMark = "                                            const pdf = new jsPDF('p', 'mm', 'a4');\r\n                                            const pdfWidth = pdf.internal.pageSize.getWidth();\r\n                                            const margin = 5;";
        const endMark = "                                                document.body.removeChild(tempDiv);\r\n                                            };";
        const s = content.indexOf(startMark);
        const e = content.indexOf(endMark, s) + endMark.length;
        if (s !== -1 && e > endMark.length) {
            console.log('Found by markers at', s, '-', e);
            const newContent = content.substring(0, s) + newCockpit + content.substring(e);
            fs.writeFileSync(path, newContent, 'utf8');
            console.log('Done (marker match)!');
        } else {
            console.error('Block not found! s:', s, 'e:', e);
            process.exit(1);
        }
    }
} else {
    const newContent = content.substring(0, idx) + newCockpit + content.substring(idx + oldCockpit.length);
    fs.writeFileSync(path, newContent, 'utf8');
    console.log('Done!');
}
