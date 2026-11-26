import { parseDateSafe } from '../utils/formatters';

export const generateDRE = (
    invoices: any[],
    bankTransactions: any[],
    companyId: string,
    startDate: string,
    endDate: string
) => {
    const periodInvoices = invoices.filter(i =>
        i.companyId === companyId &&
        i.date >= startDate &&
        i.date <= endDate &&
        i.status !== 'cancelada'
    );

    const receitaBruta = periodInvoices
        .filter(i => i.type === 'exit' || i.type === 'service')
        .reduce((sum, i) => sum + i.value, 0);

    const impostos = periodInvoices
        .filter(i => i.type === 'exit' || i.type === 'service')
        .reduce((sum, i) => sum + (i.taxValue || 0), 0);

    const cmv = periodInvoices
        .filter(i => i.type === 'entry')
        .reduce((sum, i) => sum + i.value, 0);

    const despesas = bankTransactions
        .filter(t => t.companyId === companyId && t.date >= startDate && t.date <= endDate && t.type === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);

    return {
        receitaBruta,
        receitaLiquida: receitaBruta - impostos,
        lucroBruto: (receitaBruta - impostos) - cmv,
        despesasOperacionais: despesas,
        lucroLiquido: (receitaBruta - impostos) - cmv - despesas
    };
};

export const calculateProductTaxes = (
    product: any,
    companyUF: string | undefined,
    destinationState: string
) => {
    if (!product) return { totalTax: 0, details: [] };

    const price = product.price || 0;
    const icms = price * ((product.icmsRate || 18) / 100);
    const pis = price * ((product.pisRate || 1.65) / 100);
    const cofins = price * ((product.cofinsRate || 7.6) / 100);

    // Simple DIFAL Simulation
    let difal = 0;
    if (companyUF && companyUF !== destinationState) {
        const internal = product.difalInternalRate || 18;
        const external = product.difalExternalRate || 12;
        difal = price * ((internal - external) / 100);
    }

    return {
        totalTax: icms + pis + cofins + difal,
        breakdown: { icms, pis, cofins, difal }
    };
};
