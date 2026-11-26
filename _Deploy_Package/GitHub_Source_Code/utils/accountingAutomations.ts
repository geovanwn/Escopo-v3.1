import { AccountingEntry, Invoice, Employee, Filing, CompanyEntity } from '../types';
import { parseDateSafe } from './formatters';
import { calculateComplexDas, RevenueSource } from './fiscalCalculations';

interface ClosingSummary {
    revenue: number;
    taxes: number;
    payroll: number;
    entries: Omit<AccountingEntry, 'id'>[];
}

/**
 * Calcula a Receita Bruta Total dos últimos 12 meses (RBT12)
 * @param currentPeriod Mês de competência atual (YYYY-MM)
 * @param invoices Lista de todas as notas fiscais
 * @param companyId ID da empresa
 */
const calculateRBT12 = (currentPeriod: string, invoices: Invoice[], companyId: string): number => {
    // Definir intervalo: 12 meses anteriores ao período atual
    // Ex: Se currentPeriod = 2024-01, intervalo = 2023-01 a 2023-12.
    const [year, month] = currentPeriod.split('-').map(Number);

    // Data limite superior (último dia do mês anterior)
    const endDate = new Date(year, month - 1, 0); // Dia 0 do mês atual = último dia do mês anterior

    // Data limite inferior (primeiro dia do 12º mês para trás)
    const startDate = new Date(endDate.getFullYear() - 1, endDate.getMonth() + 1, 1);

    // Converter para string YYYY-MM-DD para comparação fácil (ou usar timestamp)
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    return invoices
        .filter(inv => {
            if (inv.companyId !== companyId || inv.status === 'cancelada') return false;
            // Considerar apenas Receita (Vendas e Serviços)
            if (inv.type !== 'exit' && inv.type !== 'service') return false;

            const invDate = inv.date; // ASSUME YYYY-MM-DD
            return invDate >= startStr && invDate <= endStr;
        })
        .reduce((sum, inv) => sum + inv.value, 0);
};

export const generateClosingEntries = (
    company: CompanyEntity,
    period: string, // YYYY-MM
    invoices: Invoice[],
    employees: Employee[],
    filings: Filing[],
    closingDate?: string, // YYYY-MM-DD
    payrollRuns: any[] = [] // Default empty for compatibility
): ClosingSummary => {
    const entries: Omit<AccountingEntry, 'id'>[] = [];
    const companyId = company.id;
    const entryDate = closingDate || `${period}-28`;

    // 1. Process Revenue (Faturamento - Saídas e Serviços)
    const revenueInvoices = invoices.filter(inv => {
        if (inv.companyId !== companyId || inv.status === 'cancelada') return false;
        const d = parseDateSafe(inv.date);
        const invPeriod = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        return invPeriod === period && (inv.type === 'service' || inv.type === 'exit');
    });

    const totalRevenue = revenueInvoices.reduce((acc, inv) => acc + inv.value, 0);

    if (totalRevenue > 0) {
        entries.push({
            date: entryDate,
            description: `VVR - FATURAMENTO MENSAL COMP. ${period}`,
            debitAccount: '1.1.02.01 - Clientes Nacionais',
            creditAccount: '3.1.01.01 - Receita de Serviços',
            value: totalRevenue,
            companyId,
            category: 'Receitas',
            history: `Ref. ${revenueInvoices.length} notas fiscais emitidas na competência ${period}`,
            originModule: 'fiscal',
            status: 'draft'
        });
    }

    // 2. Process Expenses (Entradas)
    const expenseInvoices = invoices.filter(inv => {
        if (inv.companyId !== companyId || inv.status === 'cancelada') return false;
        const d = parseDateSafe(inv.date);
        const invPeriod = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        return invPeriod === period && (inv.type === 'entry');
    });

    const totalExpenses = expenseInvoices.reduce((acc, inv) => acc + inv.value, 0);
    if (totalExpenses > 0) {
        entries.push({
            date: entryDate,
            description: `VVR - COMPRAS/DESPESAS MENSAL COMP. ${period}`,
            debitAccount: '4.1.01.01 - Custos e Despesas Operacionais', // Simplificado, ideal seria mapear por categoria
            creditAccount: '2.1.01.01 - Fornecedores Nacionais',
            value: totalExpenses,
            companyId,
            category: 'Despesas',
            history: `Ref. ${expenseInvoices.length} notas de entrada lançadas na competência ${period}`,
            originModule: 'fiscal',
            status: 'draft'
        });
    }

    // 3. Process Taxes (Impostos)
    let taxValue = 0;

    // 3a. Retidos na Fonte (Analítico por nota)
    revenueInvoices.forEach(inv => {
        // Exemplo: Se tiver IRRF retido
        if (inv.items) {
            const vIrrf = inv.items.reduce((sum, item) => sum + (item.vIrrf || 0), 0);
            if (vIrrf > 0) {
                entries.push({
                    date: entryDate,
                    description: `IRRF A RECUPERAR - NF ${inv.number}`,
                    debitAccount: '1.1.03.01 - IRRF a Recuperar',
                    creditAccount: '1.1.02.01 - Clientes Nacionais', // Abate do recebível
                    value: vIrrf,
                    companyId,
                    category: 'Impostos',
                    documentRef: inv.id,
                    originModule: 'fiscal',
                    status: 'draft'
                });
            }
            // Similar para PIS/COFINS/CSLL/INSS retidos...
        }
    });

    // 3b. Impostos Devidos (Simples Nacional / Presumido)
    if (totalRevenue > 0) {
        if (company.regimeTributario === 'simples' || company.regimeTributario === '1') {
            const rbt12 = calculateRBT12(period, invoices, companyId);
            const revenueSource: RevenueSource = {
                value: totalRevenue,
                annex: (company.anexoSimples || 'III') as any,
                options: {}
            };

            const dasResult = calculateComplexDas(rbt12, [revenueSource]);
            taxValue = dasResult.totalValue;

            entries.push({
                date: entryDate,
                description: `PROVISÃO SIMPLES NACIONAL COMP. ${period}`,
                debitAccount: '3.1.02.01 - Simples Nacional',
                creditAccount: '2.1.04.01 - Simples a Recolher',
                value: taxValue,
                companyId,
                category: 'Impostos',
                history: `Apuração DAS s/ Fat. R$ ${totalRevenue.toFixed(2)} (RBT12: R$ ${rbt12.toFixed(2)} - Aliq. Efetiva: ${(dasResult.effectiveRate * 100).toFixed(2)}%)`,
                originModule: 'fiscal',
                status: 'draft'
            });
        } else {
            // Lucro Presumido (Estimativa Fixa)
            taxValue = totalRevenue * 0.1633;
            entries.push({
                date: entryDate,
                description: `PROVISÃO IMPOSTOS (PRESUMIDO) - ESTIMATIVA`,
                debitAccount: '3.1.02.02 - Impostos sobre Vendas',
                creditAccount: '2.1.04.02 - Impostos a Recolher',
                value: taxValue,
                companyId,
                category: 'Impostos',
                history: 'Provisão estimada Lucro Presumido',
                originModule: 'fiscal',
                status: 'draft'
            });
        }
    }

    // 4. Process Real Payroll Data (Folha de Pagamento)
    // Filter runs for this competence
    const periodRuns = payrollRuns.filter(r => r.competence === period && r.companyId === companyId);

    let totalPayroll = 0;

    if (periodRuns.length > 0) {
        periodRuns.forEach(run => {
            const runVal = run.totalGross || 0;
            totalPayroll += runVal;

            let desc = `PROVISÃO FOLHA DE PAGAMENTO ${period}`;
            let debAcc = '3.2.01.01 - Salários e Ordenados';
            let credAcc = '2.1.05.01 - Salários a Pagar';

            // Handle Specific Types
            if (run.calculationType === 'decimo_terceiro') {
                desc = `PROVISÃO 13º SALÁRIO (REALIZADO) ${period}`;
                debAcc = '2.1.05.05 - Provisão de 13º'; // Baixa a provisão
            } else if (run.calculationType === 'ferias') {
                desc = `FÉRIAS A PAGAR ${period}`;
                debAcc = '2.1.05.04 - Provisão de Férias'; // Baixa a provisão
            } else if (run.calculationType === 'rescisao') {
                desc = `RESCISÃO CONTRATUAL ${period}`;
                debAcc = '3.2.01.06 - Rescisões';
            }

            entries.push({
                date: entryDate,
                description: desc,
                debitAccount: debAcc,
                creditAccount: credAcc,
                value: runVal,
                companyId,
                category: 'Despesas com Pessoal',
                history: `Ref. ${run.calculationType || 'folha'} - Competência ${period}`,
                originModule: 'payroll',
                documentRef: run.id,
                status: 'draft'
            });

            // Encargos (Simplificado se não vier no run)
            if (run.calculationType === 'folha_mensal') {
                entries.push({
                    date: entryDate,
                    description: `PROVISÃO FGTS COMP. ${period}`,
                    debitAccount: '3.2.01.03 - FGTS',
                    creditAccount: '2.1.05.03 - FGTS a Recolher',
                    value: runVal * 0.08,
                    companyId,
                    category: 'Despesas com Pessoal',
                    history: 'FGTS Mensal (8%)',
                    originModule: 'payroll',
                    status: 'draft'
                });
            }
        });
    } else {
        // Fallback: If no payroll run found, use Employee Registry Estimation
        // (Isso mantém compatibilidade se o usuário não usou o módulo de folha ainda)
        const activeEmployees = employees.filter(e => e.companyId === companyId && e.status === 'ativo');
        const estPayroll = activeEmployees.reduce((acc, e) => acc + e.salary, 0);

        if (estPayroll > 0) {
            entries.push({
                date: entryDate,
                description: `PROVISÃO FOLHA ESTIMADA ${period}`,
                debitAccount: '3.2.01.01 - Salários e Ordenados',
                creditAccount: '2.1.05.01 - Salários a Pagar',
                value: estPayroll,
                companyId,
                category: 'Despesas com Pessoal',
                history: 'Estimativa baseada no cadastro (Sem folha processada)',
                originModule: 'payroll',
                status: 'draft'
            });
            // Provisions standard
            entries.push({
                date: entryDate,
                description: `PROVISÃO FGTS (EST) ${period}`,
                debitAccount: '3.2.01.03 - FGTS',
                creditAccount: '2.1.05.03 - FGTS a Recolher',
                value: estPayroll * 0.08,
                companyId,
                category: 'Despesas com Pessoal',
                originModule: 'payroll',
                status: 'draft'
            });
            entries.push({
                date: entryDate,
                description: `PROVISÃO FÉRIAS (EST) ${period}`,
                debitAccount: '3.2.01.04 - Férias',
                creditAccount: '2.1.05.04 - Provisão de Férias',
                value: (estPayroll * 1.33) / 12, // 1/12 avos + 1/3
                companyId,
                category: 'Despesas com Pessoal',
                originModule: 'payroll',
                status: 'draft'
            });
            entries.push({
                date: entryDate,
                description: `PROVISÃO 13º (EST) ${period}`,
                debitAccount: '3.2.01.05 - 13º Salário',
                creditAccount: '2.1.05.05 - Provisão de 13º',
                value: estPayroll / 12,
                companyId,
                category: 'Despesas com Pessoal',
                originModule: 'payroll',
                status: 'draft'
            });
        }
        totalPayroll = estPayroll;
    }

    return {
        revenue: totalRevenue,
        taxes: taxValue,
        payroll: totalPayroll,
        entries
    };
};
