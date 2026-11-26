const fs = require('fs');
const path = require('path');

const files = [
    'Balanco.tsx', 'Razao.tsx', 'Diario.tsx', 'Balancete.tsx', 'DMPL.tsx', 'DFC.tsx', 'PlanoContas.tsx'
];

const dir = path.join(__dirname, 'pages', 'Accounting');

for (const file of files) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf8');

    // Add imports
    if (!content.includes('import { exportElementToPdf }')) {
        content = content.replace("import { useNavigate } from 'react-router-dom';", "import { useNavigate } from 'react-router-dom';\nimport { exportElementToPdf } from '../../utils/exportPdf';");
    }
    if (!content.includes('useRef')) {
        content = content.replace("import React, { useMemo, useState } from 'react';", "import React, { useMemo, useState, useRef } from 'react';");
        content = content.replace("import React, { useState, useMemo } from 'react';", "import React, { useState, useMemo, useRef } from 'react';");
    }

    // Add ref definition
    if (!content.includes('const reportRef = useRef<HTMLDivElement>(null);')) {
        content = content.replace("const navigate = useNavigate();", "const navigate = useNavigate();\n    const reportRef = useRef<HTMLDivElement>(null);");
    }

    // Update button
    const fileName = file.replace('.tsx', '');
    content = content.replace(
        /<Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-lg">\s*<FileText size=\{16\} \/> Exportar PDF\s*<\/Button>/g,
        `<Button onClick={() => exportElementToPdf(reportRef.current, '${fileName}')} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-lg">\n                            <FileText size={16} /> Exportar PDF\n                        </Button>`
    );

    // Apply ref to the container
    if (!content.includes('ref={reportRef}')) {
        // Balanco.tsx uses grid
        if (file === 'Balanco.tsx') {
            content = content.replace('<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">', '<div ref={reportRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl">');
        } else {
            // Others use Card
            content = content.replace('<Card className="p-', '<Card ref={reportRef} className="p-');
        }
    }

    // Update ReportViewerModal if present
    content = content.replace(/onExportPdf=\{\(\) => \{[^}]*\}\}/g, `onExportPdf={() => exportElementToPdf(reportRef.current, '${fileName}')}`);

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
}
