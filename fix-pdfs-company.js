const fs = require('fs');
const path = require('path');

const files = [
    'Balanco.tsx', 'Razao.tsx', 'Diario.tsx', 'Balancete.tsx', 'DMPL.tsx', 'DFC.tsx', 'PlanoContas.tsx', 'DRE.tsx'
];

const dir = path.join(__dirname, 'pages', 'Accounting');

for (const file of files) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf8');

    // Make sure we pass selectedCompany
    const fileName = file.replace('.tsx', '');
    content = content.replace(
        `exportElementToPdf(reportRef.current, '${fileName}')`,
        `exportElementToPdf(reportRef.current, '${fileName}', selectedCompany)`
    );

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
}
