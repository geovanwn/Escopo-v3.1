const fs = require('fs');
let c = fs.readFileSync('pages/Payroll.tsx', 'utf8');
const search = "import html2canvas from 'html2canvas';";
const replacement = "import html2canvas from 'html2canvas';\nimport { generatePayslipPDF } from '../utils/payslipPdfGenerator';";
c = c.split(search).join(replacement);
fs.writeFileSync('pages/Payroll.tsx', c, 'utf8');
console.log('Import added. Has it:', c.includes('generatePayslipPDF'));
