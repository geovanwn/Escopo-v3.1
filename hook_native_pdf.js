const fs = require('fs');
const path = 'pages/Payroll.tsx';
let c = fs.readFileSync(path, 'utf8');

// Replace the entire block from "const pdf = new jsPDF" to "await addPayslipPage();"
// in the generateSinglePayslipPDF function, with a simple call to generatePayslipPDF
const startMark = "            const pdf = new jsPDF('p', 'mm', 'a4');\n            const pdfWidth = pdf.internal.pageSize.getWidth();";
const endMark = "            await addPayslipPage();\r\n\r\n            if (action === 'print') {\r\n                pdf.autoPrint();\r\n                window.open(pdf.output('bloburl'), '_blank');\r\n            } else {\r\n                pdf.save(`Holerite_${detail.employeeName.replace(/\\s+/g, '_')}_${detail.competence || 'Folha'}.pdf`);\r\n            }";

const si = c.indexOf(startMark);
const ei = c.indexOf(endMark, si);

if (si === -1) { console.error('START not found'); process.exit(1); }
if (ei === -1) { console.error('END not found'); process.exit(1); }

console.log('Found at', si, '-', ei);

const newBlock = `            // Use native jsPDF generator (no html2canvas = no clipping issues)
            const pdf = generatePayslipPDF(templateData, selectedCompany, detail.competence || currentCompetence);

            if (action === 'print') {
                pdf.autoPrint();
                window.open(pdf.output('bloburl'), '_blank');
            } else {
                pdf.save('Holerite_' + detail.employeeName.replace(/\\s+/g, '_') + '_' + (detail.competence || 'Folha').replace('/', '-') + '.pdf');
            }`;

const newContent = c.substring(0, si) + newBlock + c.substring(ei + endMark.length);
fs.writeFileSync(path, newContent, 'utf8');
console.log('Done! generateSinglePayslipPDF now uses native generator.');
