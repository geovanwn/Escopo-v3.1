import { SIMPLES_ANNEXES, PRESUMIDO_RATES, TAX_RATES } from '../constants/legal';

export interface AccountPlanItem {
    code: string;
    name: string;
    type: 'ativo' | 'passivo' | 'receita' | 'despesa' | 'patrimonio';
    nature: 'debt' | 'credit';
    level: number;
    parentCode?: string;
    isAnalytic: boolean;
}

export interface JournalEntry {
    id: string;
    date: string;
    history: string;
    debitAccount: string;
    creditAccount: string;
    value: number;
    documentRef?: string;
    originModule: 'fiscal' | 'financial' | 'payroll' | 'inventory' | 'manual';
    companyId?: string;
    status?: string;
}

export const DEFAULT_CHART_OF_ACCOUNTS: AccountPlanItem[] = [
    // 1. ATIVO
    { code: '1', name: 'ATIVO', type: 'ativo', nature: 'debt', level: 1, isAnalytic: false },
    { code: '1.1', name: 'ATIVO CIRCULANTE', type: 'ativo', nature: 'debt', level: 2, parentCode: '1', isAnalytic: false },
    { code: '1.1.01', name: 'DISPONÍVEL', type: 'ativo', nature: 'debt', level: 3, parentCode: '1.1', isAnalytic: false },
    { code: '1.1.01.01', name: 'CAIXA E EQUIVALENTES', type: 'ativo', nature: 'debt', level: 4, parentCode: '1.1.01', isAnalytic: true },
    { code: '1.1.01.02', name: 'BANCOS CONTA MOVIMENTO', type: 'ativo', nature: 'debt', level: 4, parentCode: '1.1.01', isAnalytic: true },
    { code: '1.1.02', name: 'CLIENTES A RECEBER', type: 'ativo', nature: 'debt', level: 3, parentCode: '1.1', isAnalytic: true },
    { code: '1.1.03', name: 'ESTOQUES', type: 'ativo', nature: 'debt', level: 3, parentCode: '1.1', isAnalytic: true },
    { code: '1.2', name: 'ATIVO NÃO CIRCULANTE', type: 'ativo', nature: 'debt', level: 2, parentCode: '1', isAnalytic: false },
    { code: '1.2.01', name: 'REALIZÁVEL A LONGO PRAZO', type: 'ativo', nature: 'debt', level: 3, parentCode: '1.2', isAnalytic: true },
    { code: '1.2.02', name: 'INVESTIMENTOS', type: 'ativo', nature: 'debt', level: 3, parentCode: '1.2', isAnalytic: true },
    { code: '1.2.03', name: 'IMOBILIZADO', type: 'ativo', nature: 'debt', level: 3, parentCode: '1.2', isAnalytic: true },
    { code: '1.2.04', name: 'INTANGÍVEL', type: 'ativo', nature: 'debt', level: 3, parentCode: '1.2', isAnalytic: true },

    // 2. PASSIVO
    { code: '2', name: 'PASSIVO', type: 'passivo', nature: 'credit', level: 1, isAnalytic: false },
    { code: '2.1', name: 'PASSIVO CIRCULANTE', type: 'passivo', nature: 'credit', level: 2, parentCode: '2', isAnalytic: false },
    { code: '2.1.01', name: 'FORNECEDORES A PAGAR', type: 'passivo', nature: 'credit', level: 3, parentCode: '2.1', isAnalytic: true },
    { code: '2.1.02', name: 'OBRIGAÇÕES TRABALHISTAS E PREVIDENCIÁRIAS', type: 'passivo', nature: 'credit', level: 3, parentCode: '2.1', isAnalytic: true },
    { code: '2.1.03', name: 'OBRIGAÇÕES TRIBUTÁRIAS A RECOLHER', type: 'passivo', nature: 'credit', level: 3, parentCode: '2.1', isAnalytic: true },
    { code: '2.1.04', name: 'SALÁRIOS E PROVENTOS A PAGAR', type: 'passivo', nature: 'credit', level: 3, parentCode: '2.1', isAnalytic: true },
    { code: '2.2', name: 'PASSIVO NÃO CIRCULANTE', type: 'passivo', nature: 'credit', level: 2, parentCode: '2', isAnalytic: false },
    { code: '2.2.01', name: 'EXIGÍVEL A LONGO PRAZO', type: 'passivo', nature: 'credit', level: 3, parentCode: '2.2', isAnalytic: true },
    { code: '2.3', name: 'PATRIMÔNIO LÍQUIDO', type: 'patrimonio', nature: 'credit', level: 2, parentCode: '2', isAnalytic: false },
    { code: '2.3.01', name: 'CAPITAL SOCIAL', type: 'patrimonio', nature: 'credit', level: 3, parentCode: '2.3', isAnalytic: true },
    { code: '2.3.02', name: 'RESERVAS', type: 'patrimonio', nature: 'credit', level: 3, parentCode: '2.3', isAnalytic: true },
    { code: '2.3.03', name: 'LUCROS OU PREJUÍZOS ACUMULADOS', type: 'patrimonio', nature: 'credit', level: 3, parentCode: '2.3', isAnalytic: true },

    // 3. RECEITAS (RESULTADO)
    { code: '3', name: 'RECEITAS', type: 'receita', nature: 'credit', level: 1, isAnalytic: false },
    { code: '3.1', name: 'RECEITA BRUTA OPERACIONAL', type: 'receita', nature: 'credit', level: 2, parentCode: '3', isAnalytic: false },
    { code: '3.1.01', name: 'RECEITA DE VENDAS DE MERCADORIAS', type: 'receita', nature: 'credit', level: 3, parentCode: '3.1', isAnalytic: true },
    { code: '3.1.02', name: 'RECEITA DE PRESTAÇÃO DE SERVIÇOS', type: 'receita', nature: 'credit', level: 3, parentCode: '3.1', isAnalytic: true },
    { code: '3.2', name: 'DEDUÇÕES DA RECEITA BRUTA', type: 'despesa', nature: 'debt', level: 2, parentCode: '3', isAnalytic: true },
    { code: '3.3', name: 'OUTRAS RECEITAS OPERACIONAIS', type: 'receita', nature: 'credit', level: 2, parentCode: '3', isAnalytic: true },
    { code: '3.4', name: 'RECEITAS FINANCEIRAS', type: 'receita', nature: 'credit', level: 2, parentCode: '3', isAnalytic: true },

    // 4. DESPESAS E CUSTOS (RESULTADO)
    { code: '4', name: 'CUSTOS E DESPESAS', type: 'despesa', nature: 'debt', level: 1, isAnalytic: false },
    { code: '4.1', name: 'CUSTOS OPERACIONAIS', type: 'despesa', nature: 'debt', level: 2, parentCode: '4', isAnalytic: false },
    { code: '4.1.01', name: 'CUSTO DAS MERCADORIAS VENDIDAS (CMV)', type: 'despesa', nature: 'debt', level: 3, parentCode: '4.1', isAnalytic: true },
    { code: '4.1.02', name: 'CUSTO DOS SERVIÇOS PRESTADOS (CSP)', type: 'despesa', nature: 'debt', level: 3, parentCode: '4.1', isAnalytic: true },
    { code: '4.2', name: 'DESPESAS OPERACIONAIS', type: 'despesa', nature: 'debt', level: 2, parentCode: '4', isAnalytic: false },
    { code: '4.2.01', name: 'DESPESAS COM PESSOAL', type: 'despesa', nature: 'debt', level: 3, parentCode: '4.2', isAnalytic: true },
    { code: '4.2.02', name: 'DESPESAS ADMINISTRATIVAS E GERAIS', type: 'despesa', nature: 'debt', level: 3, parentCode: '4.2', isAnalytic: true },
    { code: '4.2.03', name: 'DESPESAS TRIBUTÁRIAS', type: 'despesa', nature: 'debt', level: 3, parentCode: '4.2', isAnalytic: true },
    { code: '4.3', name: 'DESPESAS FINANCEIRAS', type: 'despesa', nature: 'debt', level: 2, parentCode: '4', isAnalytic: true },
    { code: '4.4', name: 'OUTRAS DESPESAS OPERACIONAIS', type: 'despesa', nature: 'debt', level: 2, parentCode: '4', isAnalytic: true },
    { code: '4.5', name: 'IRPJ E CSLL SOBRE O RESULTADO', type: 'despesa', nature: 'debt', level: 2, parentCode: '4', isAnalytic: true },
];

export const getChartOfAccounts = (companyId: string): AccountPlanItem[] => {
    const local = localStorage.getItem(`escopov3_custom_accounts_${companyId}`);
    if (!local) return DEFAULT_CHART_OF_ACCOUNTS;
    try {
        const custom = JSON.parse(local);
        return [...DEFAULT_CHART_OF_ACCOUNTS, ...custom].sort((a, b) => a.code.localeCompare(b.code));
    } catch {
        return DEFAULT_CHART_OF_ACCOUNTS;
    }
};

export const saveCustomAccount = (companyId: string, account: AccountPlanItem) => {
    const local = localStorage.getItem(`escopov3_custom_accounts_${companyId}`);
    let custom: AccountPlanItem[] = [];
    if (local) {
        try {
            custom = JSON.parse(local);
        } catch {
            custom = [];
        }
    }
    custom.push(account);
    localStorage.setItem(`escopov3_custom_accounts_${companyId}`, JSON.stringify(custom));
};

export const getMergedChartOfAccounts = (
    companyId: string,
    entries: any[] = [],
    clients: any[] = [],
    employees: any[] = [],
    bankAccounts: any[] = [],
    partners: any[] = []
): AccountPlanItem[] => {
    const baseChart = getChartOfAccounts(companyId);
    
    const uniqueAccounts = new Set<string>();
    entries.forEach(e => {
        if (e.companyId === companyId) {
            uniqueAccounts.add(e.debitAccount);
            uniqueAccounts.add(e.creditAccount);
        }
    });

    const baseCodes = new Set(baseChart.map(a => a.code));
    const dynamicCodes = Array.from(uniqueAccounts).filter(c => c && !baseCodes.has(c));

    const dynamicAccounts: AccountPlanItem[] = dynamicCodes.map(code => {
        const cleanCode = code.split(' - ')[0].trim();
        let name = code.includes(' - ') ? code.substring(code.indexOf(' - ') + 3) : `Conta Analítica ${code}`;
        
        const client = clients?.find(c => c.accountingAccount === code || c.accountingAccount === cleanCode);
        const emp = employees?.find(e => (e as any).accountingAccount === code || (e as any).accountingAccount === cleanCode);
        const bank = bankAccounts?.find(b => (b as any).accountingAccount === code || (b as any).accountingAccount === cleanCode);
        const partner = partners?.find(p => p.accountingAccount === code || p.accountingAccount === cleanCode);

        if (client) name = client.nomeFantasia || client.razaoSocial || name;
        else if (emp) name = emp.name || name;
        else if (bank) name = bank.name || name;
        else if (partner) name = partner.nomeFantasia || partner.razaoSocial || name;

        const parentCode = cleanCode.substring(0, cleanCode.lastIndexOf('.'));
        const parent = baseChart.find(a => a.code === parentCode);
        
        return {
            code,
            name,
            type: parent?.type || 'ativo',
            nature: parent?.nature || 'debt',
            level: (parent?.level || 3) + 1,
            isAnalytic: true
        };
    });

    return [...baseChart.map(a => ({ ...a })), ...dynamicAccounts].sort((a, b) => a.code.localeCompare(b.code));
};

export const generateJournalEntries = (invoice: any, company?: any): JournalEntry[] => {
    if (['cancelada', 'substituida', 'anulada', 'negada', 'recusada'].includes(invoice.status)) {
        return [];
    }

    const entries: JournalEntry[] = [];
    const idBase = invoice.id || Date.now().toString();
    const isCash = invoice.status === 'paga';
    const companyId = company?.id || invoice.companyId || '';

    if (invoice.type === 'exit' || invoice.type === 'service') {
        const contaDebito = isCash 
            ? (invoice.bankAccountingAccount || '1.1.01.01') 
            : (invoice.entityAccountingAccount || '1.1.02');
        const contaCredito = invoice.accountingAccount || (invoice.type === 'exit' ? '3.1.01' : '3.1.02');

        entries.push({
            id: `${idBase}-rev`,
            date: invoice.date,
            history: `Receita Bruta - Doc ${invoice.number} - ${invoice.entityName || 'Cliente'}`,
            debitAccount: contaDebito,
            creditAccount: contaCredito,
            value: invoice.value,
            documentRef: invoice.id,
            originModule: 'fiscal',
            companyId
        });

        if (invoice.taxValue > 0) {
            entries.push({
                id: `${idBase}-tax`,
                date: invoice.date,
                history: `Deduções da Receita (Impostos) s/ Doc ${invoice.number}`,
                debitAccount: '3.2',
                creditAccount: '2.1.03',
                value: invoice.taxValue,
                documentRef: invoice.id,
                originModule: 'fiscal',
                companyId
            });
        }
    }

    if (invoice.type === 'entry') {
        const isCost = invoice.category === 'Compras' || 
                       invoice.naturezaOperacao?.toLowerCase().includes('revenda') || 
                       invoice.naturezaOperacao?.toLowerCase().includes('industrialização');
        
        const contaDebito = invoice.accountingAccount || (isCost ? '1.1.03' : '4.2.02');
        const contaCredito = isCash 
            ? (invoice.bankAccountingAccount || '1.1.01.01') 
            : (invoice.entityAccountingAccount || '2.1.01');

        entries.push({
            id: `${idBase}-cost`,
            date: invoice.date,
            history: `Compra/Despesa - Doc ${invoice.number} - ${invoice.entityName || 'Fornecedor'}`,
            debitAccount: contaDebito,
            creditAccount: contaCredito,
            value: invoice.value,
            documentRef: invoice.id,
            originModule: 'financial',
            companyId
        });
    }

    if (invoice.type === 'payroll') {
        entries.push({
            id: `${idBase}-pay`,
            date: invoice.date,
            history: `Folha Pagamento - ${invoice.date.substring(0, 7)}`,
            debitAccount: invoice.accountingAccount || '4.2.01',
            creditAccount: invoice.entityAccountingAccount || '2.1.02',
            value: invoice.value,
            documentRef: invoice.id,
            originModule: 'payroll',
            companyId
        });
    }

    if (invoice.type === 'tax') {
        entries.push({
            id: `${idBase}-tax-issue`,
            date: invoice.date,
            history: invoice.naturezaOperacao || `Imposto a Recolher ${invoice.number}`,
            debitAccount: invoice.accountingAccount || '4.2.03',
            creditAccount: '2.1.03',
            value: invoice.value,
            documentRef: invoice.id,
            originModule: 'fiscal',
            companyId
        });
    }

    return entries;
};

export const generatePayrollEntries = (payroll: any, company?: any): JournalEntry[] => {
    if (payroll.status === 'rascunho' || payroll.status === 'simulacao') return [];
    
    const entries: JournalEntry[] = [];
    const idBase = payroll.id || Date.now().toString();
    const date = payroll.closedAt || new Date().toISOString().split('T')[0];
    const companyId = company?.id || payroll.companyId || '';

    if (payroll.totalGross > 0) {
        entries.push({
            id: `${idBase}-gross`,
            date,
            history: `Apropriação de Folha de Pagamento - Competência ${payroll.competence}`,
            debitAccount: payroll.accountingAccount || '4.2.01',
            creditAccount: '2.1.04',
            value: payroll.totalGross,
            documentRef: payroll.id,
            originModule: 'payroll',
            companyId
        });
    }

    if (payroll.totalDeductions > 0) {
        entries.push({
            id: `${idBase}-deductions`,
            date,
            history: `Retenções sobre Folha (INSS/IRRF) - Competência ${payroll.competence}`,
            debitAccount: '2.1.04',
            creditAccount: '2.1.03',
            value: payroll.totalDeductions,
            documentRef: payroll.id,
            originModule: 'payroll',
            companyId
        });
    }

    return entries;
};

export const generateBankEntries = (transaction: any, company?: any): JournalEntry[] => {
    if (transaction.reconciledWith) return []; 

    const entries: JournalEntry[] = [];
    const idBase = transaction.id || Date.now().toString();
    const companyId = company?.id || transaction.companyId || '';
    
    const mappingsStr = localStorage.getItem(`escopov3_category_mappings_${companyId}`);
    let mappedAccount = '';
    if (mappingsStr) {
        try {
            const mappings = JSON.parse(mappingsStr);
            mappedAccount = mappings[transaction.category] || '';
        } catch {}
    }

    const defaultDebit = mappedAccount || '4.2.02';
    const defaultCredit = mappedAccount || '3.1.02';

    if (transaction.type === 'debit') {
        entries.push({
            id: `${idBase}-bank-debit`,
            date: transaction.date,
            history: `Saída Bancária: ${transaction.description}`,
            debitAccount: defaultDebit,
            creditAccount: transaction.bankAccountingAccount || '1.1.01.02',
            value: transaction.amount,
            documentRef: transaction.id,
            originModule: 'financial',
            companyId
        });
    } else {
        entries.push({
            id: `${idBase}-bank-credit`,
            date: transaction.date,
            history: `Entrada Bancária: ${transaction.description}`,
            debitAccount: transaction.bankAccountingAccount || '1.1.01.02',
            creditAccount: defaultCredit,
            value: transaction.amount,
            documentRef: transaction.id,
            originModule: 'financial',
            companyId
        });
    }
    
    return entries;
};

export const calculateAccountBalance = (accountCode: string, entries: any[]): number => {
    return entries.reduce((acc, entry) => {
        if (entry.debitAccount === accountCode || entry.debitAccount?.startsWith(accountCode + '.')) {
            return acc + entry.value;
        }
        if (entry.creditAccount === accountCode || entry.creditAccount?.startsWith(accountCode + '.')) {
            return acc - entry.value;
        }
        return acc;
    }, 0);
};

export interface DREResult {
    receitaBruta: number;
    deducoes: number;
    receitaLiquida: number;
    custos: number;
    lucroBruto: number;
    despPessoal: number;
    despAdmin: number;
    despTributaria: number;
    despesasOperacionais: number;
    receitasFinanceiras: number;
    despesasFinanceiras: number;
    resultadoFinanceiro: number;
    outrasReceitas: number;
    outrasDespesas: number;
    outrasReceitasDespesas: number;
    lucroAntesIR: number;
    irpj: number;
    csll: number;
    lucroLiquido: number;
}

export const calculateDRE = (
    entries: any[],
    startDate: string,
    endDate: string,
    company?: any
): DREResult => {
    const companyId = company?.id || '';
    const periodoEntries = entries.filter(e => e.companyId === companyId && e.date >= startDate && e.date <= endDate);

    const getCreditoTotal = (code: string) => -calculateAccountBalance(code, periodoEntries);
    const getDebitoTotal = (code: string) => calculateAccountBalance(code, periodoEntries);

    const receitaBruta = getCreditoTotal('3.1');
    const deducoes = getDebitoTotal('3.2');
    const receitaLiquida = receitaBruta - deducoes;

    const custos = getDebitoTotal('4.1');
    const lucroBruto = receitaLiquida - custos;

    const despPessoal = getDebitoTotal('4.2.01');
    const despAdmin = getDebitoTotal('4.2.02');
    const despTributaria = getDebitoTotal('4.2.03');
    const despesasOperacionais = despPessoal + despAdmin + despTributaria;

    const receitasFinanceiras = getCreditoTotal('3.4');
    const despesasFinanceiras = getDebitoTotal('4.3');
    const resultadoFinanceiro = receitasFinanceiras - despesasFinanceiras;

    const outrasReceitas = getCreditoTotal('3.3');
    const outrasDespesas = getDebitoTotal('4.4');
    const outrasReceitasDespesas = outrasReceitas - outrasDespesas;

    const lucroAntesIR = lucroBruto - despesasOperacionais + resultadoFinanceiro + outrasReceitasDespesas;
    const impostosLucro = getDebitoTotal('4.5');
    
    const irpj = impostosLucro;
    const csll = 0; 

    const lucroLiquido = lucroAntesIR - impostosLucro;

    return {
        receitaBruta,
        deducoes,
        receitaLiquida,
        custos,
        lucroBruto,
        despPessoal,
        despAdmin,
        despTributaria,
        despesasOperacionais,
        receitasFinanceiras,
        despesasFinanceiras,
        resultadoFinanceiro,
        outrasReceitas,
        outrasDespesas,
        outrasReceitasDespesas,
        lucroAntesIR,
        irpj,
        csll,
        lucroLiquido
    };
};

export interface BalanceSheetResult {
    ativo: {
        circulante: number;
        disponivel: number;
        clientes: number;
        estoques: number;
        naoCirculante: number;
        rlp: number;
        investimentos: number;
        imobilizado: number;
        intangivel: number;
        total: number;
    };
    passivo: {
        circulante: number;
        fornecedores: number;
        trabalhistas: number;
        tributarias: number;
        naoCirculante: number;
        elp: number;
        total: number;
    };
    patrimonioLiquido: {
        capitalSocial: number;
        reservas: number;
        lucrosAcumulados: number;
        resultadoExercicio: number;
        total: number;
    };
    isBalanced: boolean;
    difference: number;
}

export const calculateBalanceSheet = (
    entries: any[],
    endDate: string,
    companyId?: string
): BalanceSheetResult => {
    const closingEntries = entries.filter(e => e.companyId === companyId && e.date <= endDate);
    
    const getBalDebito = (code: string) => calculateAccountBalance(code, closingEntries);
    const getBalCredito = (code: string) => -calculateAccountBalance(code, closingEntries);

    const disponivel = getBalDebito('1.1.01');
    const clientes = getBalDebito('1.1.02');
    const estoques = getBalDebito('1.1.03');
    const ativoCirculante = disponivel + clientes + estoques;

    const rlp = getBalDebito('1.2.01');
    const investimentos = getBalDebito('1.2.02');
    const imobilizado = getBalDebito('1.2.03');
    const intangivel = getBalDebito('1.2.04');
    const ativoNaoCirculante = rlp + investimentos + imobilizado + intangivel;

    const totalAtivo = ativoCirculante + ativoNaoCirculante;

    const fornecedores = getBalCredito('2.1.01');
    const trabalhistas = getBalCredito('2.1.02');
    const tributarias = getBalCredito('2.1.03');
    const passivoCirculante = fornecedores + trabalhistas + tributarias;

    const elp = getBalCredito('2.2.01');
    const passivoNaoCirculante = elp;
    
    const totalPassivo = passivoCirculante + passivoNaoCirculante;

    const capitalSocial = getBalCredito('2.3.01');
    const reservas = getBalCredito('2.3.02');
    let lucrosAcumulados = getBalCredito('2.3.03');

    const receitas = getBalCredito('3');
    const despesas = getBalDebito('4');
    const resultadoExercicio = receitas - despesas;

    const totalPL = capitalSocial + reservas + lucrosAcumulados + resultadoExercicio;
    const passivoEPL = totalPassivo + totalPL;

    const difference = Math.abs(totalAtivo - passivoEPL);
    const isBalanced = difference < 0.01;

    return {
        ativo: {
            circulante: ativoCirculante, disponivel, clientes, estoques,
            naoCirculante: ativoNaoCirculante, rlp, investimentos, imobilizado, intangivel,
            total: totalAtivo
        },
        passivo: {
            circulante: passivoCirculante, fornecedores, trabalhistas, tributarias,
            naoCirculante: passivoNaoCirculante, elp,
            total: totalPassivo
        },
        patrimonioLiquido: {
            capitalSocial, reservas, lucrosAcumulados, resultadoExercicio,
            total: totalPL
        },
        isBalanced,
        difference
    };
};

export interface DMPLResult {
    capitalSocial: { saldoInicial: number; mutacoes: number; saldoFinal: number };
    reservas: { saldoInicial: number; mutacoes: number; saldoFinal: number };
    lucrosAcumulados: { saldoInicial: number; mutacoes: number; saldoFinal: number };
    total: { saldoInicial: number; mutacoes: number; saldoFinal: number };
}

export const calculateDMPL = (
    entries: any[],
    startDate: string,
    endDate: string,
    companyId?: string
): DMPLResult => {
    const initialEntries = entries.filter(e => e.companyId === companyId && e.date < startDate);
    const periodEntries = entries.filter(e => e.companyId === companyId && e.date >= startDate && e.date <= endDate);

    const getSaldoInicial = (code: string) => -calculateAccountBalance(code, initialEntries);
    const getMutacao = (code: string) => -calculateAccountBalance(code, periodEntries);

    const capInicial = getSaldoInicial('2.3.01');
    const capMutacao = getMutacao('2.3.01');
    
    const resInicial = getSaldoInicial('2.3.02');
    const resMutacao = getMutacao('2.3.02');

    let lucrosInicial = getSaldoInicial('2.3.03');
    const recAnteriores = -calculateAccountBalance('3', initialEntries);
    const despAnteriores = calculateAccountBalance('4', initialEntries);
    lucrosInicial += (recAnteriores - despAnteriores);

    let lucrosMutacao = getMutacao('2.3.03');
    const recPeriodo = -calculateAccountBalance('3', periodEntries);
    const despPeriodo = calculateAccountBalance('4', periodEntries);
    lucrosMutacao += (recPeriodo - despPeriodo);

    const capFinal = capInicial + capMutacao;
    const resFinal = resInicial + resMutacao;
    const lucrosFinal = lucrosInicial + lucrosMutacao;

    return {
        capitalSocial: { saldoInicial: capInicial, mutacoes: capMutacao, saldoFinal: capFinal },
        reservas: { saldoInicial: resInicial, mutacoes: resMutacao, saldoFinal: resFinal },
        lucrosAcumulados: { saldoInicial: lucrosInicial, mutacoes: lucrosMutacao, saldoFinal: lucrosFinal },
        total: {
            saldoInicial: capInicial + resInicial + lucrosInicial,
            mutacoes: capMutacao + resMutacao + lucrosMutacao,
            saldoFinal: capFinal + resFinal + lucrosFinal
        }
    };
};

export interface DFCResult {
    saldoInicialCaixa: number;
    atividadesOperacionais: {
        recebimentosClientes: number;
        pagamentosFornecedores: number;
        pagamentosEmpregados: number;
        pagamentosTributos: number;
        outros: number;
        caixaLiquido: number;
    };
    atividadesInvestimento: {
        aquisicaoImobilizado: number;
        vendaImobilizado: number;
        outros: number;
        caixaLiquido: number;
    };
    atividadesFinanciamento: {
        aumentoCapital: number;
        emprestimosRecebidos: number;
        amortizacaoEmprestimos: number;
        pagamentoDividendos: number;
        caixaLiquido: number;
    };
    geracaoLiquidaCaixa: number;
    saldoFinalCaixa: number;
}

export const calculateDFC = (
    entries: any[],
    startDate: string,
    endDate: string,
    companyId?: string
): DFCResult => {
    const CAIXA_CODE = '1.1.01';

    const initialEntries = entries.filter(e => e.companyId === companyId && e.date < startDate);
    const periodEntries = entries.filter(e => e.companyId === companyId && e.date >= startDate && e.date <= endDate);

    const saldoInicialCaixa = calculateAccountBalance(CAIXA_CODE, initialEntries);
    const saldoFinalCaixa = calculateAccountBalance(CAIXA_CODE, [...initialEntries, ...periodEntries]);

    let recebimentosClientes = 0;
    let pagamentosFornecedores = 0;
    let pagamentosEmpregados = 0;
    let pagamentosTributos = 0;
    let operacionaisOutros = 0;

    let aquisicaoImobilizado = 0;
    let vendaImobilizado = 0;
    let investimentoOutros = 0;

    let aumentoCapital = 0;
    let emprestimosRecebidos = 0;
    let amortizacaoEmprestimos = 0;
    let pagamentoDividendos = 0;

    for (const entry of periodEntries) {
        const debitIsCaixa = entry.debitAccount?.startsWith(CAIXA_CODE);
        const creditIsCaixa = entry.creditAccount?.startsWith(CAIXA_CODE);
        
        if (!debitIsCaixa && !creditIsCaixa) continue;
        if (debitIsCaixa && creditIsCaixa) continue;

        const contrapartida = debitIsCaixa ? entry.creditAccount : entry.debitAccount;
        const valorFluxo = debitIsCaixa ? entry.value : -entry.value;

        if (contrapartida.startsWith('1.1.02') || contrapartida.startsWith('3.')) {
            recebimentosClientes += (valorFluxo > 0 ? valorFluxo : 0);
        } else if (contrapartida.startsWith('2.1.01') || contrapartida.startsWith('1.1.03')) {
            pagamentosFornecedores += (valorFluxo < 0 ? valorFluxo : 0);
        } else if (contrapartida.startsWith('2.1.02') || contrapartida.startsWith('4.2.01')) {
            pagamentosEmpregados += (valorFluxo < 0 ? valorFluxo : 0);
        } else if (contrapartida.startsWith('2.1.03') || contrapartida.startsWith('4.2.03') || contrapartida.startsWith('4.5')) {
            pagamentosTributos += (valorFluxo < 0 ? valorFluxo : 0);
        } else if (contrapartida.startsWith('4.') || contrapartida.startsWith('1.1.') || contrapartida.startsWith('2.1.')) {
            operacionaisOutros += valorFluxo;
        }
        else if (contrapartida.startsWith('1.2.03') || contrapartida.startsWith('1.2.04')) {
            if (valorFluxo < 0) aquisicaoImobilizado += valorFluxo;
            else vendaImobilizado += valorFluxo;
        } else if (contrapartida.startsWith('1.2.')) {
            investimentoOutros += valorFluxo;
        }
        else if (contrapartida.startsWith('2.3.01')) {
            aumentoCapital += valorFluxo;
        } else if (contrapartida.startsWith('2.3.03') || contrapartida.startsWith('2.3.02')) {
            if (valorFluxo < 0) pagamentoDividendos += valorFluxo;
        } else if (contrapartida.startsWith('2.2.')) {
            if (valorFluxo > 0) emprestimosRecebidos += valorFluxo;
            else amortizacaoEmprestimos += valorFluxo;
        }
    }

    const cxOperacional = recebimentosClientes + pagamentosFornecedores + pagamentosEmpregados + pagamentosTributos + operacionaisOutros;
    const cxInvestimento = aquisicaoImobilizado + vendaImobilizado + investimentoOutros;
    const cxFinanciamento = aumentoCapital + emprestimosRecebidos + amortizacaoEmprestimos + pagamentoDividendos;

    return {
        saldoInicialCaixa,
        atividadesOperacionais: {
            recebimentosClientes,
            pagamentosFornecedores,
            pagamentosEmpregados,
            pagamentosTributos,
            outros: operacionaisOutros,
            caixaLiquido: cxOperacional
        },
        atividadesInvestimento: {
            aquisicaoImobilizado,
            vendaImobilizado,
            outros: investimentoOutros,
            caixaLiquido: cxInvestimento
        },
        atividadesFinanciamento: {
            aumentoCapital,
            emprestimosRecebidos,
            amortizacaoEmprestimos,
            pagamentoDividendos,
            caixaLiquido: cxFinanciamento
        },
        geracaoLiquidaCaixa: cxOperacional + cxInvestimento + cxFinanciamento,
        saldoFinalCaixa
    };
};

export const syncAccountingData = async (
    allData: any,
    selectedCompany: any,
    actions: {
        addEntry: (entry: any) => Promise<void>;
        deleteEntry: (table: string, id: string) => Promise<void>;
        updateItem: (table: string, item: any, idField?: string) => Promise<void>;
    },
    startDate?: string,
    endDate?: string,
    onProgress?: (msg: string, percent: number) => void
) => {
    let count = 0;
    let deletedCount = 0;
    let sanitizedCount = 0;
    const companyId = selectedCompany?.id || '';

    // 1. Saneamento de Cadastros (Auto Account Generation with dynamic indexes)
    onProgress?.("Saneando cadastros e contas...", 5);
    const tablesToSanitize = [
        { key: 'clients', prefix: '1.1.02.', default: '1.1.02.01' },
        { key: 'partners', prefix: '2.1.01.', default: '2.1.01.01' },
        { key: 'products', prefix: '3.1.01.', default: '3.1.01.01' },
        { key: 'services', prefix: '3.1.02.', default: '3.1.02.01' },
        { key: 'employees', prefix: '2.1.04.', default: '2.1.04.01' },
        { key: 'bankAccounts', prefix: '1.1.01.', default: '1.1.01.02' }
    ];

    for (const tableConf of tablesToSanitize) {
        const items = allData[tableConf.key] || [];
        let index = 1;
        for (const item of items) {
            if (item.companyId === companyId && !item.accountingAccount) {
                // Auto generate sequential analytic accounts
                const codeSuffix = index.toString().padStart(2, '0');
                const finalAccount = `${tableConf.prefix}${codeSuffix}`;
                const updatedItem = { 
                    ...item, 
                    accountingAccount: finalAccount
                };
                await actions.updateItem(tableConf.key, updatedItem, tableConf.key === 'ncms' ? 'code' : 'id');
                sanitizedCount++;
                index++;
            }
        }
    }

    // 2. Limpeza Automática do período
    onProgress?.("Limpando base automática...", 15);
    const existingEntries = allData.accountingEntries || [];
    const autoEntries = existingEntries.filter((e: any) =>
        e.companyId === companyId &&
        e.originModule !== 'manual' &&
        (!startDate || e.date >= startDate) &&
        (!endDate || e.date <= endDate)
    );

    for (let i = 0; i < autoEntries.length; i++) {
        await actions.deleteEntry('accountingEntries', autoEntries[i].id);
        deletedCount++;
    }

    // 3. Faturamento (Notas Fiscais)
    onProgress?.("Processando Notas Fiscais...", 30);
    const invoices = allData.invoices || [];
    const filteredInvoices = invoices.filter((inv: any) => 
        inv.companyId === companyId && 
        !['cancelada'].includes(inv.status) && 
        (!startDate || inv.date >= startDate) && 
        (!endDate || inv.date <= endDate)
    );
    
    for (const inv of filteredInvoices) {
        const newEntries = generateJournalEntries(inv, selectedCompany);
        for (const je of newEntries) {
            await actions.addEntry({ ...je, companyId, status: 'posted' });
            count++;
        }
    }

    // 4. Folha de Pagamento
    onProgress?.("Processando Folha de Pagamento...", 60);
    const payrollRuns = allData.payrollRuns || [];
    const filteredPayroll = payrollRuns.filter((pr: any) => {
        const prDate = pr.closedAt || pr.createdAt || pr.competence + '-01';
        return pr.companyId === companyId && (!startDate || prDate >= startDate) && (!endDate || prDate <= endDate);
    });

    for (const pr of filteredPayroll) {
        const newEntries = generatePayrollEntries(pr, selectedCompany);
        for (const je of newEntries) {
            await actions.addEntry({ ...je, companyId, status: 'posted' });
            count++;
        }
    }

    // 5. Movimentação Bancária Avulsa
    onProgress?.("Processando Extrato Bancário...", 80);
    const bankTransactions = allData.bankTransactions || [];
    const filteredBanks = bankTransactions.filter((tx: any) => 
        tx.companyId === companyId && 
        (!startDate || tx.date >= startDate) && 
        (!endDate || tx.date <= endDate)
    );

    for (const tx of filteredBanks) {
        const newEntries = generateBankEntries(tx, selectedCompany);
        for (const je of newEntries) {
            await actions.addEntry({ ...je, companyId, status: 'posted' });
            count++;
        }
    }

    onProgress?.("Concluído!", 100);
    return { count, deletedCount, updatedCount: sanitizedCount };
};
