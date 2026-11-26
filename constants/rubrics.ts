export interface RubricDefinition {
    code: string;
    name: string;
    type: 'provento' | 'desconto';
    calcMethod: 'fixed' | 'input' | 'formula' | 'system';
    compatibleWith: ('folha_mensal' | 'ferias' | 'decimo_terceiro' | 'rescisao')[];
    description?: string;
    incidences?: {
        inss: boolean;
        fgts: boolean;
        irrf: boolean;
    };
}

export const RUBRICS: RubricDefinition[] = [
    // --- FOLHA MENSAL ---
    {
        code: '1001',
        name: 'Salário Base',
        type: 'provento',
        calcMethod: 'system', // Automatically from employee data
        compatibleWith: ['folha_mensal'],
        description: 'Salário contratual mensal',
        incidences: { inss: true, fgts: true, irrf: true }
    },
    {
        code: '1002',
        name: 'Pró-Labore',
        type: 'provento',
        calcMethod: 'input', // User override or partner default
        compatibleWith: ['folha_mensal'],
        description: 'Retirada de sócios',
        incidences: { inss: true, fgts: true, irrf: true }
    },
    {
        code: '1501',
        name: 'Hora Extra 50%',
        type: 'provento',
        calcMethod: 'input', // Requires Quantity Input
        compatibleWith: ['folha_mensal'],
        description: 'Horas adicionais com 50% de acréscimo'
    },
    {
        code: '1502',
        name: 'Hora Extra 100%',
        type: 'provento',
        calcMethod: 'input',
        compatibleWith: ['folha_mensal']
    },
    {
        code: '1601',
        name: 'Comissões',
        type: 'provento',
        calcMethod: 'input', // Value Input
        compatibleWith: ['folha_mensal']
    },
    {
        code: '1602',
        name: 'Bônus / Gratificação',
        type: 'provento',
        calcMethod: 'input',
        compatibleWith: ['folha_mensal', 'rescisao'] // Can be paid on termination too
    },
    {
        code: '1701',
        name: 'Adicional Periculosidade (30%)',
        type: 'provento',
        calcMethod: 'formula',
        compatibleWith: ['folha_mensal']
    },
    {
        code: '1702',
        name: 'Adicional Insalubridade',
        type: 'provento',
        calcMethod: 'input', // Requires degree selection
        compatibleWith: ['folha_mensal']
    },
    {
        code: '1801',
        name: 'DSR s/ Variáveis',
        type: 'provento',
        calcMethod: 'formula',
        compatibleWith: ['folha_mensal']
    },
    {
        code: '2001',
        name: 'Salário Família',
        type: 'provento',
        calcMethod: 'system',
        compatibleWith: ['folha_mensal']
    },
    // Descontos Mensais
    {
        code: '5001',
        name: 'INSS',
        type: 'desconto',
        calcMethod: 'system',
        compatibleWith: ['folha_mensal', 'decimo_terceiro', 'ferias', 'rescisao']
    },
    {
        code: '5002',
        name: 'IRRF',
        type: 'desconto',
        calcMethod: 'system',
        compatibleWith: ['folha_mensal', 'decimo_terceiro', 'ferias', 'rescisao']
    },
    {
        code: '5101',
        name: 'Faltas',
        type: 'desconto',
        calcMethod: 'input',
        compatibleWith: ['folha_mensal']
    },
    {
        code: '5102',
        name: 'Atrasos',
        type: 'desconto',
        calcMethod: 'input',
        compatibleWith: ['folha_mensal']
    },
    {
        code: '5201',
        name: 'Vale Transporte',
        type: 'desconto',
        calcMethod: 'formula', // 6% check
        compatibleWith: ['folha_mensal']
    },
    {
        code: '5202',
        name: 'Plano de Saúde',
        type: 'desconto',
        calcMethod: 'input',
        compatibleWith: ['folha_mensal']
    },
    {
        code: '5301',
        name: 'Adiantamento Salarial',
        type: 'desconto',
        calcMethod: 'input',
        compatibleWith: ['folha_mensal']
    },
    {
        code: '1901',
        name: 'Vale Alimentação',
        type: 'provento',
        calcMethod: 'input',
        compatibleWith: ['folha_mensal']
    },
    {
        code: '1902',
        name: 'Vale Refeição',
        type: 'provento',
        calcMethod: 'input',
        compatibleWith: ['folha_mensal']
    },
    {
        code: '1503',
        name: 'Adicional Noturno',
        type: 'provento',
        calcMethod: 'input',
        compatibleWith: ['folha_mensal'],
        description: 'Adicional de 20% sobre a hora normal'
    },

    // --- 13º SALÁRIO ---
    {
        code: '4001',
        name: '13º Salário - 1ª Parcela',
        type: 'provento',
        calcMethod: 'system',
        compatibleWith: ['decimo_terceiro']
    },
    {
        code: '4002',
        name: '13º Salário - Parcela Final',
        type: 'provento',
        calcMethod: 'system',
        compatibleWith: ['decimo_terceiro']
    },
    {
        code: '4003',
        name: 'Média de Variáveis (13º)',
        type: 'provento',
        calcMethod: 'input', // Usually auto calculates from history, but here we input
        compatibleWith: ['decimo_terceiro']
    },
    {
        code: '9001',
        name: 'Desconto Adiantamento 13º',
        type: 'desconto',
        calcMethod: 'system',
        compatibleWith: ['decimo_terceiro']
    },

    // --- FÉRIAS ---
    {
        code: '6001',
        name: 'Férias Gozadas',
        type: 'provento',
        calcMethod: 'system',
        compatibleWith: ['ferias']
    },
    {
        code: '6002',
        name: '1/3 Constitucional Férias',
        type: 'provento',
        calcMethod: 'system',
        compatibleWith: ['ferias']
    },
    {
        code: '6003',
        name: 'Abono Pecuniário',
        type: 'provento',
        calcMethod: 'input', // Toggle
        compatibleWith: ['ferias']
    },
    {
        code: '6004',
        name: '1/3 Abono Pecuniário',
        type: 'provento',
        calcMethod: 'formula',
        compatibleWith: ['ferias']
    },
    {
        code: '6005',
        name: 'Média de Variáveis (Férias)',
        type: 'provento',
        calcMethod: 'input',
        compatibleWith: ['ferias']
    },

    // --- RESCISÃO ---
    {
        code: '7001',
        name: 'Saldo de Salário',
        type: 'provento',
        calcMethod: 'system',
        compatibleWith: ['rescisao']
    },
    {
        code: '7002',
        name: 'Aviso Prévio Indenizado',
        type: 'provento',
        calcMethod: 'system',
        compatibleWith: ['rescisao']
    },
    {
        code: '7003',
        name: '13º Salário Proporcional',
        type: 'provento',
        calcMethod: 'system',
        compatibleWith: ['rescisao']
    },
    {
        code: '7004',
        name: '13º Salário (Aviso Indenizado)',
        type: 'provento',
        calcMethod: 'system',
        compatibleWith: ['rescisao']
    },
    {
        code: '7005',
        name: 'Férias Vencidas + 1/3',
        type: 'provento',
        calcMethod: 'input', // Days input
        compatibleWith: ['rescisao']
    },
    {
        code: '7006',
        name: 'Férias Proporcionais + 1/3',
        type: 'provento',
        calcMethod: 'system',
        compatibleWith: ['rescisao']
    },
    {
        code: '7007',
        name: 'Férias (Aviso Indenizado) + 1/3',
        type: 'provento',
        calcMethod: 'system',
        compatibleWith: ['rescisao']
    },
    {
        code: '9101',
        name: 'Desconto Aviso Prévio',
        type: 'desconto',
        calcMethod: 'system',
        compatibleWith: ['rescisao']
    }
];
