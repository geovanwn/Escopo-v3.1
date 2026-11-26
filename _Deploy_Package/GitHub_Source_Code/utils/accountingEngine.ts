
// Motor Contábil Profissional (Accounting Engine)
// Baseado nas normas ITG 1000 / CPC para PME

export interface AccountPlanItem {
    code: string; // Ex: "1.1.01.0001"
    name: string; // Ex: "Caixa Geral"
    type: 'ativo' | 'passivo' | 'receita' | 'despesa' | 'patrimonio';
    nature: 'debt' | 'credit'; // Natureza do saldo (Devedora/Credora)
    level: number; // 1 (Grupo) a 5 (Analítica)
    parentCode?: string;
    isAnalytic: boolean; // Se aceita lançamentos
}

export interface JournalEntry {
    id: string;
    date: string;
    history: string; // Histórico do lançamento
    debitAccount: string; // Código da conta
    creditAccount: string;
    value: number;
    documentRef?: string; // ID da Invoice/Nota
    originModule: 'fiscal' | 'financial' | 'payroll' | 'inventory' | 'manual';
}

// Plano de Contas Padrão (Simplificado mas estruturado)
export const DEFAULT_CHART_OF_ACCOUNTS: AccountPlanItem[] = [
    // 1. ATIVO
    { code: '1', name: 'ATIVO', type: 'ativo', nature: 'debt', level: 1, isAnalytic: false },
    { code: '1.1', name: 'ATIVO CIRCULANTE', type: 'ativo', nature: 'debt', level: 2, parentCode: '1', isAnalytic: false },
    { code: '1.1.01', name: 'DISPONÍVEL', type: 'ativo', nature: 'debt', level: 3, parentCode: '1.1', isAnalytic: false },
    { code: '1.1.01.01', name: 'CAIXA E EQUIVALENTES', type: 'ativo', nature: 'debt', level: 4, parentCode: '1.1.01', isAnalytic: true },
    { code: '1.1.02', name: 'CLIENTES A RECEBER', type: 'ativo', nature: 'debt', level: 3, parentCode: '1.1', isAnalytic: true },
    { code: '1.1.03', name: 'ESTOQUES', type: 'ativo', nature: 'debt', level: 3, parentCode: '1.1', isAnalytic: true },
    { code: '1.2', name: 'ATIVO NÃO CIRCULANTE', type: 'ativo', nature: 'debt', level: 2, parentCode: '1', isAnalytic: false },
    { code: '1.2.01', name: 'IMOBILIZADO', type: 'ativo', nature: 'debt', level: 3, parentCode: '1.2', isAnalytic: true },

    // 2. PASSIVO
    { code: '2', name: 'PASSIVO', type: 'passivo', nature: 'credit', level: 1, isAnalytic: false },
    { code: '2.1', name: 'PASSIVO CIRCULANTE', type: 'passivo', nature: 'credit', level: 2, parentCode: '2', isAnalytic: false },
    { code: '2.1.01', name: 'FORNECEDORES', type: 'passivo', nature: 'credit', level: 3, parentCode: '2.1', isAnalytic: true },
    { code: '2.1.02', name: 'OBRIGAÇÕES TRABALHISTAS', type: 'passivo', nature: 'credit', level: 3, parentCode: '2.1', isAnalytic: true },
    { code: '2.1.03', name: 'OBRIGAÇÕES TRIBUTÁRIAS', type: 'passivo', nature: 'credit', level: 3, parentCode: '2.1', isAnalytic: true },
    { code: '2.3', name: 'PATRIMÔNIO LÍQUIDO', type: 'patrimonio', nature: 'credit', level: 2, parentCode: '2', isAnalytic: false },
    { code: '2.3.01', name: 'CAPITAL SOCIAL', type: 'patrimonio', nature: 'credit', level: 3, parentCode: '2.3', isAnalytic: true },
    { code: '2.3.04', name: 'LUCROS/PREJUÍZOS ACUMULADOS', type: 'patrimonio', nature: 'credit', level: 3, parentCode: '2.3', isAnalytic: true },

    // 3. RECEITAS (RESULTADO)
    { code: '3', name: 'RECEITAS', type: 'receita', nature: 'credit', level: 1, isAnalytic: false },
    { code: '3.1', name: 'RECEITA OPERACIONAL BRUTA', type: 'receita', nature: 'credit', level: 2, parentCode: '3', isAnalytic: true },
    { code: '3.2', name: 'OUTRAS RECEITAS', type: 'receita', nature: 'credit', level: 2, parentCode: '3', isAnalytic: true },

    // 4. DESPESAS (RESULTADO)
    { code: '4', name: 'CUSTOS E DESPESAS', type: 'despesa', nature: 'debt', level: 1, isAnalytic: false },
    { code: '4.1', name: 'CUSTOS DOS PRODUTOS/SERVIÇOS', type: 'despesa', nature: 'debt', level: 2, parentCode: '4', isAnalytic: true },
    { code: '4.2', name: 'DESPESAS OPERACIONAIS', type: 'despesa', nature: 'debt', level: 2, parentCode: '4', isAnalytic: false },
    { code: '4.2.01', name: 'DESPESAS COM PESSOAL', type: 'despesa', nature: 'debt', level: 3, parentCode: '4.2', isAnalytic: true },
    { code: '4.2.02', name: 'IMPOSTOS E TAXAS', type: 'despesa', nature: 'debt', level: 3, parentCode: '4.2', isAnalytic: true },
    { code: '4.2.03', name: 'DESPESAS GERAIS', type: 'despesa', nature: 'debt', level: 3, parentCode: '4.2', isAnalytic: true },
];

/**
 * Motor de Categorização Automática
 * Transforma uma Invoice/Nota em um Lançamento Contábil
 */
export const generateJournalEntries = (invoice: any, company?: any): JournalEntry[] => {
    if (['cancelada', 'substituida', 'anulada', 'negada', 'recusada'].includes(invoice.status)) {
        return [];
    }

    const entries: JournalEntry[] = [];
    const idBase = invoice.id || Date.now().toString();
    const ramo = company?.ramoAtividade;

    // Lógica simples de DE-PARA (Partida Dobrada)

    if (invoice.type === 'exit' || invoice.type === 'service') {
        // VENDA:
        // D - Clientes a Receber (1.1.02) ou Caixa (1.1.01.01) se à vista
        // C - Receita de Vendas (3.1)

        const isCash = invoice.status === 'paga'; // Simplificação

        // Customizing History based on sector
        let history = `Venda ${invoice.number} - ${invoice.entityName}`;
        if (ramo === 'servicos' || invoice.type === 'service') {
            history = `Serviço ${invoice.number} - ${invoice.entityName}`;
        } else if (ramo === 'industria') {
            history = `Venda Industrial ${invoice.number} - ${invoice.entityName}`;
        }

        entries.push({
            id: `${idBase}-rev`,
            date: invoice.date,
            history,
            debitAccount: isCash ? '1.1.01.01' : '1.1.02',
            creditAccount: '3.1',
            value: invoice.value,
            documentRef: invoice.id,
            originModule: 'fiscal'
        });

        // IMPOSTOS S/ VENDA (Provisão)
        // D - Despesa com Impostos (4.2.02)
        // C - Impostos a Recolher (2.1.03)
        if (invoice.taxValue > 0) {
            entries.push({
                id: `${idBase}-tax`,
                date: invoice.date,
                history: `Provisão Impostos NF ${invoice.number}`,
                debitAccount: '4.2.02',
                creditAccount: '2.1.03',
                value: invoice.taxValue,
                documentRef: invoice.id,
                originModule: 'fiscal'
            });
        }
    }

    if (invoice.type === 'entry') {
        // COMPRA:
        // D - Estoque (1.1.03) ou Despesa (4.2.03)
        // C - Fornecedores (2.1.01) ou Caixa

        // Se o ramo for comércio/indústria, a chance de ser estoque é maior. 
        // Se for serviço, geralmente é despesa (4.2.03) a menos que explicitamente marcado.
        let isStock = invoice.naturezaOperacao?.toLowerCase().includes('revenda') ||
            invoice.naturezaOperacao?.toLowerCase().includes('compra') ||
            invoice.naturezaOperacao?.toLowerCase().includes('industrialização');

        if (ramo === 'servicos' && !isStock) {
            isStock = false; // Services mostly buy for use/consumption
        }

        entries.push({
            id: `${idBase}-cost`,
            date: invoice.date,
            history: `Compra ${invoice.number} - ${invoice.entityName}`,
            debitAccount: isStock ? '1.1.03' : '4.2.03',
            creditAccount: invoice.status === 'paga' ? '1.1.01.01' : '2.1.01',
            value: invoice.value,
            documentRef: invoice.id,
            originModule: 'financial'
        });
    }

    if (invoice.type === 'payroll') {
        // FOLHA:
        // D - Despesa com Pessoal (4.2.01)
        // C - Obrigações Trabalhistas (2.1.02)
        entries.push({
            id: `${idBase}-pay`,
            date: invoice.date,
            history: `Folha Pagamento - ${invoice.date.substring(0, 7)}`,
            debitAccount: '4.2.01',
            creditAccount: '2.1.02',
            value: invoice.value,
            documentRef: invoice.id,
            originModule: 'payroll'
        });
    }

    return entries;
};

/**
 * Calcula saldo de uma conta específica baseado nos lançamentos
 */
export const calculateAccountBalance = (accountCode: string, entries: any[]): number => {
    return entries.reduce((acc, entry) => {
        if (entry.debitAccount === accountCode || entry.debitAccount.startsWith(accountCode + '.')) {
            return acc + entry.value;
        }
        if (entry.creditAccount === accountCode || entry.creditAccount.startsWith(accountCode + '.')) {
            return acc - entry.value;
        }
        return acc;
    }, 0);
};

// --- DRE CALCULATION ENGINE ---

export interface DREResult {
    grossRevenue: number;
    deductions: number;
    netRevenue: number;
    cpv: number;
    grossProfit: number;
    personnel: number;
    otherExpenses: number;
    depreciation: number;
    ebitda: number;
    netProfit: number;
    netMargin: number;
    grossMargin: number;
    taxesOnSales: number;
    dailyDre: any[];
}

export const calculateDRE = (
    entries: any[],
    invoices: any[],
    payrollRuns: any[],
    assets: any[],
    startDate: string,
    endDate: string,
    companyId?: string
): DREResult => {
    // Filter Entries for Period
    const periodoEntries = entries.filter(e => e.date >= startDate && e.date <= endDate);
    // Fallback: If no accounting entries, use invoices/payroll for estimation (Hybrid Mode)
    const useEstimation = periodoEntries.length === 0;

    const getSum = (account: string) => Math.abs(calculateAccountBalance(account, periodoEntries));

    // 1. Receita Bruta
    let grossRevenue = 0;
    if (useEstimation) {
        grossRevenue = invoices
            .filter(i =>
                (i.type === 'exit' || i.type === 'service') &&
                !['cancelada', 'substituida', 'anulada', 'negada', 'recusada'].includes(i.status) &&
                i.date >= startDate &&
                i.date <= endDate
            )
            .reduce((s: number, i: any) => s + i.value, 0);
    } else {
        grossRevenue = getSum('3.1');
    }

    // 2. Deduções (Impostos s/ Venda)
    let taxesOnSales = 0;
    if (useEstimation) {
        taxesOnSales = invoices.reduce((s: number, i: any) => {
            if (i.date >= startDate && i.date <= endDate && (i.type === 'exit' || i.type === 'service')) {
                return s + (i.taxValue || 0);
            }
            return s;
        }, 0);
    } else {
        taxesOnSales = getSum('4.2.02') + getSum('3.1.02'); // Example logic
    }
    const deductions = taxesOnSales;

    // 3. Receita Líquida
    const netRevenue = grossRevenue - deductions;

    // 4. Custos (CPV/CMV)
    let cpv = 0;
    if (useEstimation) {
        cpv = invoices
            .filter(i => i.type === 'entry' && i.category === 'Compras' && i.date >= startDate && i.date <= endDate)
            .reduce((s: number, i: any) => s + i.value, 0);
    } else {
        cpv = getSum('4.1');
    }

    // 5. Lucro Bruto
    const grossProfit = netRevenue - cpv;

    // 6. Despesas Operacionais
    let personnel = 0;
    let otherExpenses = 0;

    if (useEstimation) {
        personnel = payrollRuns
            .filter(r => (r.closedAt ? r.closedAt.split('T')[0] : '') >= startDate && (r.closedAt ? r.closedAt.split('T')[0] : '') <= endDate)
            .reduce((s: number, r: any) => s + r.totalGross, 0);

        otherExpenses = invoices
            .filter(i => i.type === 'entry' && i.category !== 'Compras' && i.date >= startDate && i.date <= endDate)
            .reduce((s: number, i: any) => s + i.value, 0);
    } else {
        personnel = getSum('4.2.01');
        otherExpenses = getSum('4.2.03');
    }

    // 7. Depreciação (Estimated from Assets Register)
    // Assets Depreciation is usually calculated regardless of Journal Entries unless posted explicitly to 4.2.XX
    // Defaulting to asset register calculation for accuracy
    const depreciationAnnual = assets.reduce((sum: number, a: any) => {
        const aqDate = new Date(a.acquisitionDate); // Assuming YYYY-MM-DD
        const now = new Date();
        const monthly = a.acquisitionValue / a.usefulLifeMonths;
        return sum + monthly;
    }, 0) * 12;

    const periodDays = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24);
    const depreciation = (depreciationAnnual / 365) * periodDays;

    // 8. EBITDA & Net Profit
    const ebitda = grossProfit - personnel - otherExpenses;
    const taxes = ebitda > 0 ? ebitda * 0.15 : 0; // Simplified
    const netProfit = ebitda - depreciation - taxes;

    const netMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
    const grossMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

    // Daily Breakdown Logic (Simplified)
    const dailyDre: any[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    // Optimization: Pre-group entries by date to avoid O(N^2) in loop if many days
    // Not implementing full optimization now to keep code simple, but noteworthy.

    return {
        grossRevenue,
        deductions,
        taxesOnSales,
        netRevenue,
        cpv,
        grossProfit,
        personnel,
        otherExpenses,
        depreciation,
        ebitda,
        netProfit,
        netMargin,
        grossMargin,
        dailyDre
    };
};


// --- BALANCE SHEET ENGINE ---

export interface BalanceSheetResult {
    assets: {
        cash: number;
        receivables: number;
        inventory: number;
        currentAssets: number;
        fixedAssetsValue: number;
        totalAssets: number;
    };
    liabilities: {
        suppliers: number;
        payroll: number;
        taxes: number;
        currentLiabilities: number;
        totalLiabilities: number;
    };
    equity: number;
    liquidity: number;
}

export const calculateBalanceSheet = (
    entries: any[],
    assetsRegister: any[],
    endDate: string
): BalanceSheetResult => {
    // Balance Sheet is Cumulative (all entries <= endDate)
    const closingEntries = entries.filter(e => e.date <= endDate);
    const getBalance = (code: string) => calculateAccountBalance(code, closingEntries);

    const cash = getBalance('1.1.01');
    const receivables = getBalance('1.1.02');
    const inventory = getBalance('1.1.03');
    const currentAssets = cash + receivables + inventory;

    const fixedAssetsValue = assetsRegister.reduce((s: number, a: any) => s + a.acquisitionValue, 0);
    const totalAssets = currentAssets + fixedAssetsValue;

    const suppliers = Math.abs(getBalance('2.1.01'));
    const payroll = Math.abs(getBalance('2.1.02'));
    const taxes = Math.abs(getBalance('2.1.03'));
    const currentLiabilities = suppliers + payroll + taxes;

    const equity = totalAssets - currentLiabilities;
    const liquidity = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;

    return {
        assets: { cash, receivables, inventory, currentAssets, fixedAssetsValue, totalAssets },
        liabilities: { suppliers, payroll, taxes, currentLiabilities, totalLiabilities: currentLiabilities },
        equity,
        liquidity
    };
};


// --- SYNC ENGINE ---

export const syncAccountingData = async (
    invoices: any[],
    payrollRuns: any[],
    existingEntries: any[],
    selectedCompany: any,
    actions: {
        addEntry: (entry: any) => Promise<void>;
        deleteEntry: (table: string, id: string) => Promise<void>;
    }
) => {
    let count = 0;
    let updatedCount = 0;
    const companyId = selectedCompany?.id || '';

    // 1. Sync Invoices
    for (const inv of invoices) {
        if (['cancelada', 'substituida', 'anulada', 'negada', 'recusada'].includes(inv.status)) continue;

        const entriesForInv = existingEntries.filter((e: any) => e.documentRef === inv.id);

        if (entriesForInv.length === 0) { // Only add if missing to avoid dupes/complexity
            const newEntries = generateJournalEntries(inv, selectedCompany);
            for (const je of newEntries) {
                await actions.addEntry({
                    ...je,
                    companyId,
                    status: 'posted'
                });
            }
            count++;
        }
    }

    // 2. Sync Payroll
    for (const run of payrollRuns) {
        const existingEntry = existingEntries.find((e: any) => e.documentRef === run.id);
        if (!existingEntry) {
            await actions.addEntry({
                id: Math.random().toString(36).substr(2, 9),
                companyId,
                date: run.closedAt ? run.closedAt.split('T')[0] : new Date().toISOString().split('T')[0],
                history: `Folha de Pagamento - Competência ${run.competence}`,
                debitAccount: '4.2.01',
                creditAccount: '2.1.02',
                value: run.totalGross,
                documentRef: run.id,
                originModule: 'payroll',
                status: 'posted'
            });
            count++;
        }
    }

    return { count, updatedCount };
};
