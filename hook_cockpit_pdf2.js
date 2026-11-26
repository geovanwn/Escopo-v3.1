const fs = require('fs');
const path = 'pages/Payroll.tsx';
let c = fs.readFileSync(path, 'utf8');

// Start: the button's async handler
const START = "\n                                            if (!calculatedResult) return;\r\n\r\n                                            const pdf = new jsPDF('p', 'mm', 'a4');\n";
// End: save line 
const END_SEARCH = "                                            await addPayslipPage();\n                                            pdf.save(";
const AFTER_SAVE = ".pdf`);\r\n";

const si = c.indexOf(START);
const ei = c.indexOf(END_SEARCH, si);
const saveEnd = c.indexOf(AFTER_SAVE, ei) + AFTER_SAVE.length;

if (si === -1) { console.error('START not found'); process.exit(1); }
if (ei === -1) { console.error('END_SEARCH not found'); process.exit(1); }

console.log('Found cockpit block at', si, '-', saveEnd);

const newBlock = `
                                            if (!calculatedResult) return;

                                            // Use native jsPDF generator (no clipping)
                                            const pData = {
                                                person: calculatedResult.person,
                                                events: calculatedResult.events || [],
                                                totalProventos: calculatedResult.totalProventos,
                                                totalDescontos: calculatedResult.totalDescontos,
                                                netSalary: calculatedResult.netSalary,
                                                baseINSS: calculatedResult.baseINSS,
                                                baseIRRF: calculatedResult.baseIRRF,
                                                baseFGTS: calculatedResult.baseFGTS,
                                                fgtsValue: calculatedResult.fgtsValue,
                                                baseSalary: calculatedResult.baseSalary,
                                            };
                                            const pdfDoc = generatePayslipPDF(pData, selectedCompany, currentCompetence);
                                            pdfDoc.save('Holerite_' + calculatedResult.person.name.replace(/\s+/g, '_') + '_' + currentCompetence.replace('/', '-') + '.pdf');
`;

const newContent = c.substring(0, si) + newBlock + c.substring(saveEnd);
fs.writeFileSync(path, newContent, 'utf8');
console.log('Done! Cockpit download now uses native generator.');
console.log('New length:', newContent.length);
