const fs = require('fs');
const path = require('path');

const replacements = {
    'Ã£': 'ã',
    'Ã§': 'ç',
    'Ã¡': 'á',
    'Ã©': 'é',
    'Ã³': 'ó',
    'Ãº': 'ú',
    'Ã\xAD': 'í',
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
    'EmpregatÃ\xADcia': 'Empregatícia',
    'EmpregatÃcia': 'Empregatícia',
    'ANALÃTICO': 'ANALÍTICO',
    'DESCRIÃ‡ÃƒO': 'DESCRIÇÃO',
    'RESCISÃ“RIAS': 'RESCISÓRIAS',
    'PADRÃƒO': 'PADRÃO',
    'MÃŠS': 'MÊS',
    'MÃªs': 'Mês',
    'mÃªs': 'mês',
    'InÃcio': 'Início',
    'inÃcio': 'início',
    'TÃ\xADtulo': 'Título',
    'tÃ\xADtulo': 'título',
    'LÃ\xADquido': 'Líquido',
    'LÃquido': 'Líquido',
    'lÃquido': 'líquido',
    'UsuÃ¡rio': 'Usuário',
    'usuÃ¡rio': 'usuário',
    'AtenÃ§Ã£o': 'Atenção',
    'OpÃ§Ãµes': 'Opções',
    'Hollerith': 'Holerite',
    'Holeriths': 'Holerites',
    'Extrato de Pagamento': 'Recibo de Pagamento',
    'Simulação': 'Processamento', // To ensure consistency as per previous instructions
    'Simulador': 'Processamento',
    'Rascunho': 'Processado',
    'Processadoes': 'Simulações', // Undo any weird side effects

    // Spelling fixes
    'calegrafia': 'caligrafia',
    'conveção': 'convenção',
    'convensao': 'convenção',
    'excessão': 'exceção',
    'extrato das': 'extrato do DAS',
    'hollerite': 'holerite'
};

function processDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            for (const [mangled, fixed] of Object.entries(replacements)) {
                if (content.includes(mangled)) {
                    content = content.split(mangled).join(fixed);
                    modified = true;
                }
            }

            // Quick fix to ensure specific state stays correct
            if (fullPath.endsWith('Payroll.tsx') && modified) {
                content = content.replace(/useState<'list' \\| 'cockpit' \\| 'ferias' \\| 'Processamento' \\| 'documents'>/g, "useState<'list' | 'cockpit' | 'ferias' | 'simulador' | 'documents'>");
                content = content.replace(/setViewMode\\('Processamento'\\)/g, "setViewMode('simulador')");
                content = content.replace(/viewMode === 'Processamento'/g, "viewMode === 'simulador'");
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Fixed encoding/spelling in: ${fullPath}`);
            }
        }
    });
}

processDirectory(path.join(__dirname, 'pages'));
processDirectory(path.join(__dirname, 'components', 'payroll'));
processDirectory(path.join(__dirname, 'utils'));
