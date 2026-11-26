const fs = require('fs');

let content = fs.readFileSync('pages/Payroll.tsx', 'utf8');

// Fix mangled UTF-8 characters caused by PowerShell's Get-Content without encoding
const replacements = {
    'Ã£': 'ã',
    'Ã§': 'ç',
    'Ã¡': 'á',
    'Ã©': 'é',
    'Ã³': 'ó',
    'Ãº': 'ú',
    'Ã\xAD': 'í',  // Ã followed by soft hyphen or char 173 usually -> í
    'Ã¢': 'â',
    'Ãª': 'ê',
    'Ãµ': 'õ',
    'Ã§Ã£': 'çã',
    'Ã£o': 'ão',
    'Ã³r': 'ór',
    'Ã§Ãµes': 'ções',
    'RescisÃ£o': 'Rescisão',
    'SimulaÃ§Ã£o': 'Simulação',
    'ConfiguraÃ§Ã£o': 'Configuração',
    'ConfiguraÃ§Ãµes': 'Configurações',
    'INÃ\\x8Dcio': 'INÍcio',
    'FÃ©rias': 'Férias',
    'PrÃ³-Labore': 'Pró-Labore',
    'SalÃ¡rio': 'Salário',
    'GeraÃ§Ã£o': 'Geração',
    'LiquidaÃ§Ã£o': 'Liquidação',
    'EmpregatÃ\xADcia': 'Empregatícia', // Empregatícia
    'EmpregatÃcia': 'Empregatícia',
    // Replace all generic Ã followed by whitespace with a warning.
};

for (const [mangled, fixed] of Object.entries(replacements)) {
    content = content.split(mangled).join(fixed);
}

// Fix generic Ã replacing remaining ones with generic 'í' if it was part of 'í' (like Líquido)
content = content.replace(/LÃquido/g, 'Líquido');
content = content.replace(/lÃquido/g, 'líquido');
content = content.replace(/inÃcio/g, 'início');
content = content.replace(/InÃcio/g, 'Início');
content = content.replace(/fÃsica/g, 'física');
content = content.replace(/FÃsica/g, 'Física');
content = content.replace(/jurÃdica/g, 'jurídica');
content = content.replace(/JurÃdica/g, 'Jurídica');
content = content.replace(/UsuÃ¡rio/g, 'Usuário');
content = content.replace(/AtenÃ§Ã£o/g, 'Atenção');
content = content.replace(/OpÃ§Ãµes/g, 'Opções');


// Fix viewMode variables I messed up with the generic replace
content = content.replace(/useState<'list' \| 'cockpit' \| 'ferias' \| 'Processamento' \| 'documents'>/g, "useState<'list' | 'cockpit' | 'ferias' | 'simulador' | 'documents'>");

// Replace back the literal strings "Processamento" that I replaced when I meant "Simulador" (if they are routing paths or button values instead of display labels)
content = content.replace(/setViewMode\('Processamento'\)/g, "setViewMode('simulador')");
content = content.replace(/viewMode === 'Processamento'/g, "viewMode === 'simulador'");

fs.writeFileSync('pages/Payroll.tsx', content, 'utf8');

console.log("Payroll.tsx encoding and state fixed!");
