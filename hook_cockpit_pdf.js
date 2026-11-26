const fs = require('fs');
const path = 'pages/Payroll.tsx';
let c = fs.readFileSync(path, 'utf8');

// Find and replace the cockpit download block 
const START_MARK = "                                            const pdf = new jsPDF('p', 'mm', 'a4');\r\n                                            const pdfWidth = pdf.internal.pageSize.getWidth();\r\n                                            const pdfHeight = pdf.internal.pageSize.getHeight();";
const END_MARK = "                                            await addPayslipPage();\r\n                                            pdf.save(";

const si = c.indexOf(START_MARK);
const ei = c.indexOf(END_MARK, si);

if (si === -1) { console.error('START not found'); process.exit(1); }
if (ei === -1) { console.error('END not found'); process.exit(1); }

// Find the end of the pdf.save(...); line
const saveEnd = c.indexOf(');', ei + END_MARK.length) + 2;
console.log('Found cockpit block at', si, '-', saveEnd);

const newBlock = `                                            // Use native jsPDF generator for payslip types
                                            const personData = {
                                                person: calculatedResult.person,
                                                events: calculatedResult.events,
                                                totalProventos: calculatedResult.totalProventos,
                                                totalDescontos: calculatedResult.totalDescontos,
                                                netSalary: calculatedResult.netSalary,
                                                baseINSS: calculatedResult.baseINSS,
                                                baseIRRF: calculatedResult.baseIRRF,
                                                baseFGTS: calculatedResult.baseFGTS,
                                                fgtsValue: calculatedResult.fgtsValue,
                                                baseSalary: calculatedResult.baseSalary,
                                            };
                                            const pdfDoc = generatePayslipPDF(personData, selectedCompany, currentCompetence);
                                            pdfDoc.save('Holerite_' + calculatedResult.person.name.replace(/\\s+/g, '_') + '_' + currentCompetence.replace('/', '-') + '.pdf')`;

const newContent = c.substring(0, si) + newBlock + c.substring(saveEnd);
fs.writeFileSync(path, newContent, 'utf8');
console.log('Done! Cockpit download now uses native generator.');
