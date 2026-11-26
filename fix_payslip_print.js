const fs = require('fs');
const path = 'pages/Payroll.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: Completely replace the addPayslipPage function (lines 761-810)
// Find the block from "const pdf = new jsPDF" to "root.unmount()" in the first occurrence
const oldBlock = `            const pdf = new jsPDF('p', 'mm', 'a4');
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
                        <PayslipTemplate
                            data={templateData}
                            company={selectedCompany}
                            label="1\xC2\xAA VIA - EMPREGADOR"
                            id="temp-payslip-1"
                        />
                        <div style={{ borderBottom: '1px dashed #ccc', margin: '0 5mm' }}></div>
                        <PayslipTemplate
                            data={templateData}
                            company={selectedCompany}
                            label="2\xC2\xAA VIA - COLABORADOR"
                            id="temp-payslip-2"
                        />
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
                document.body.removeChild(tempDiv);`;

const newBlock = `            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 5;
            const printableWidth = pdfWidth - (margin * 2);
            const viaHeight = (pdfHeight - 12) / 2; // ~142.5mm per via

            // Renders a single via into a canvas and returns base64 png
            const renderVia = async (label: string): Promise<string> => {
                const tempDiv = document.createElement('div');
                tempDiv.style.position = 'fixed';
                tempDiv.style.left = '-9999px';
                tempDiv.style.top = '0';
                tempDiv.style.width = '200mm';
                tempDiv.style.background = '#ffffff';
                document.body.appendChild(tempDiv);

                const vRoot = createRoot(tempDiv);
                vRoot.render(
                    <PayslipTemplate
                        data={templateData}
                        company={selectedCompany}
                        label={label}
                        id={"payslip-" + label.substring(0,1)}
                        competence={detail.competence}
                    />
                );

                await new Promise(resolve => setTimeout(resolve, 700));

                const c = await html2canvas(tempDiv, {
                    scale: 2.5,
                    useCORS: true,
                    logging: false,
                    windowWidth: 756,
                    backgroundColor: '#ffffff',
                } as any);

                vRoot.unmount();
                document.body.removeChild(tempDiv);
                return c.toDataURL('image/png');
            };

            const addPayslipPage = async () => {
                const img1 = await renderVia('1\xAA VIA - EMPREGADOR');
                const img2 = await renderVia('2\xAA VIA - COLABORADOR');

                pdf.addImage(img1, 'PNG', margin, 2, printableWidth, viaHeight);

                // Dashed separator
                pdf.setLineDashPattern([2, 2], 0);
                pdf.setDrawColor(180, 180, 180);
                pdf.line(margin, viaHeight + 4.5, pdfWidth - margin, viaHeight + 4.5);
                pdf.setLineDashPattern([], 0);

                pdf.addImage(img2, 'PNG', margin, viaHeight + 7, printableWidth, viaHeight);`;

const idx = content.indexOf(oldBlock);
if (idx === -1) {
    // Try to find it differently - just find and replace the key parts
    console.log('Block not found exactly, trying alternative...');

    // Find the start
    const startSearch = "            const pdf = new jsPDF('p', 'mm', 'a4');\r\n            const pdfWidth = pdf.internal.pageSize.getWidth();\r\n            const margin = 5;";
    const endSearch = "                document.body.removeChild(tempDiv);";

    const sIdx = content.indexOf(startSearch);
    const eIdx = content.indexOf(endSearch, sIdx);

    if (sIdx !== -1 && eIdx !== -1) {
        const after = content.substring(eIdx + endSearch.length);
        // Find closing };
        const closeIdx = after.indexOf('            };');
        const fullEnd = eIdx + endSearch.length + closeIdx + '            };'.length;

        console.log('Found at', sIdx, '-', fullEnd);
        const newContent = content.substring(0, sIdx) + newBlock + content.substring(eIdx + endSearch.length);
        fs.writeFileSync(path, newContent, 'utf8');
        console.log('Done alternative replacement!');
    } else {
        console.error('Could not find block. sIdx:', sIdx, 'eIdx:', eIdx);
        process.exit(1);
    }
} else {
    const newContent = content.substring(0, idx) + newBlock + content.substring(idx + oldBlock.length);
    fs.writeFileSync(path, newContent, 'utf8');
    console.log('Done! Block replaced successfully.');
}

// Fix 2: Fix mojibake labels in ALL occurrences
content = fs.readFileSync(path, 'utf8');
let fixed = content
    .split('1\xC2\xAA VIA').join('1\xAA VIA')
    .split('2\xC2\xAA VIA').join('2\xAA VIA')
    .split('1Âª VIA').join('1ª VIA')
    .split('2Âª VIA').join('2ª VIA')
    .split('VISUALIZAÃ\x87ÃƒO').join('VISUALIZAÇÃO')
    .split('HIST\xC3"RICO').join('HISTÓRICO');

fs.writeFileSync(path, fixed, 'utf8');
console.log('Labels fixed!');
