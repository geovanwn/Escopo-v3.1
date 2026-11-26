import { PayrollInputState, Employee, Partner, PayrollRunDetail } from '../types';
import { RUBRICS } from '../constants/rubrics';

export const CONSTANTS = {
    // 2024 Values (Reference)
    2024: {
        SALARIO_MINIMO: 1412.00,
        TETO_INSS: 7786.02,
        DEDUCAO_DEP_IRRF: 189.59,
        DESC_SIMPLIFICADO_IRRF: 564.80,
        SALARIO_FAMILIA_COTA: 62.04, // Até 1819.26
        SALARIO_FAMILIA_LIMITE: 1819.26,
        INSS_FAIXAS: [1412.00, 2666.68, 4000.03, 7786.02],
        IRRF_FAIXAS: [2259.20, 2826.65, 3751.05, 4664.68]
    },
    // 2025 Predicted Values (To be updated with official ordinance)
    2025: {
        SALARIO_MINIMO: 1518.00, // Valor Oficial Sancionado
        TETO_INSS: 8157.41, // Projetado com INPC ~4.7%
        DEDUCAO_DEP_IRRF: 189.59,
        DESC_SIMPLIFICADO_IRRF: 564.80,
        SALARIO_FAMILIA_COTA: 66.50, // Projetado
        SALARIO_FAMILIA_LIMITE: 1945.00, // Projetado
        INSS_FAIXAS: [1518.00, 2900.00, 4300.00, 8157.41], // Faixas ajustadas
        IRRF_FAIXAS: [2259.20, 2826.65, 3751.05, 4664.68]
    }
};

const getConstants = (year = 2025) => {
    return (CONSTANTS as any)[year] || CONSTANTS[2024];
}

// --- HELPER FUNCTIONS ---
// --- HELPER FUNCTIONS ---
const calculateINSS = (base: number, type: 'CLT' | 'Partner', year = 2025): { value: number, effectiveRate: number } => {
    const C = getConstants(year);

    if (type === 'Partner') {
        const contributionBase = Math.min(base, C.TETO_INSS);
        const tax = contributionBase * 0.11;
        return { value: Number(tax.toFixed(2)), effectiveRate: base > 0 ? (tax / base) : 0 };
    }

    // CLT Progressivo
    let tax = 0;
    let remainder = base;
    if (base > C.TETO_INSS) remainder = C.TETO_INSS;

    // Faixa 1 (7.5%)
    const f1 = C.INSS_FAIXAS[0];
    if (remainder > 0) tax += Math.min(remainder, f1) * 0.075;

    // Faixa 2 (9%)
    const f2 = C.INSS_FAIXAS[1];
    if (remainder > f1) tax += (Math.min(remainder, f2) - f1) * 0.09;

    // Faixa 3 (12%)
    const f3 = C.INSS_FAIXAS[2];
    if (remainder > f2) tax += (Math.min(remainder, f3) - f2) * 0.12;

    // Faixa 4 (14%)
    const f4 = C.INSS_FAIXAS[3]; // Teto
    if (remainder > f3) tax += (Math.min(remainder, f4) - f3) * 0.14;

    return { value: Number(tax.toFixed(2)), effectiveRate: base > 0 ? (tax / base) : 0 };
};

const calculateIRRF = (gross: number, legalDeductions: number, dependents: number, year = 2025): { value: number, type: 'Simples' | 'Legal', effectiveBase: number } => {
    const C = getConstants(year);

    // Legal Logic
    // Base = Gross - INSS - (Dependents * Ded)
    const legalBase = gross - legalDeductions - (dependents * C.DEDUCAO_DEP_IRRF);

    const calcTax = (v: number) => {
        const F = C.IRRF_FAIXAS;
        if (v <= F[0]) return 0;
        if (v <= F[1]) return (v * 0.075) - 169.44;
        if (v <= F[2]) return (v * 0.15) - 381.44;
        if (v <= F[3]) return (v * 0.225) - 662.77;
        return (v * 0.275) - 896.00;
    };

    const legalTax = Math.max(0, calcTax(legalBase));

    // Simplificado Logic
    // Base = Gross - SimplifiedDiscount
    const simpleBase = gross - C.DESC_SIMPLIFICADO_IRRF;
    const simpleTax = Math.max(0, calcTax(simpleBase));

    if (simpleTax < legalTax) return { value: Number(simpleTax.toFixed(2)), type: 'Simples', effectiveBase: simpleBase };
    return { value: Number(legalTax.toFixed(2)), type: 'Legal', effectiveBase: legalBase };
};

// --- MAIN ENGINE ---

export interface SimulationResult {
    person: Employee | Partner;
    events: { code?: string, description: string, type: 'provento' | 'desconto', value: number, reference?: string }[];
    totalProventos: number;
    totalDescontos: number;
    netSalary: number;
    baseINSS: number;
    baseIRRF: number;
    fgtsVal: number;
    rescisaoDate?: string;
    rescisaoReason?: string;
    rescisaoAfastamentoCode?: string;
    rescisaoReasonLabel?: string;
}

export const calculatePayroll = (
    person: Employee | Partner,
    inputs: PayrollInputState & { proLaboreOverride?: number },
    customRubrics: any[] = []
): SimulationResult => {
    const selectedCodes = inputs.selectedRubrics || [];
    const year = inputs.year ? parseInt(inputs.year) : 2025;

    // VALIDATION: Must have rubrics selected
    if (selectedCodes.length === 0) {
        throw new Error("Nenhuma rubrica selecionada. Por favor, adicione rubricas para realizar o cálculo.");
    }

    const events: any[] = [];
    let totalProventos = 0;
    let totalDescontos = 0;

    // --- CONTEXT PREPARATION ---
    const calcType = inputs.calculationType || 'folha_mensal';
    const isEmployee = person.type === 'employee';
    const emp = isEmployee ? (person as Employee) : null;
    const part = !isEmployee ? (person as Partner) : null;

    const salary = emp ? emp.salary : 0;
    const proLabore = part ? (inputs.proLaboreOverride || part.proLaboreValue || 0) : 0;

    const hourlyRate = salary / 220;
    const dailyRate = salary / 30;

    // --- PROVENTOS PROCESSING ---

    // 1. Salário Base / Pró-Labore
    if (selectedCodes.includes('1001') && isEmployee) {
        totalProventos += salary;
        events.push({ code: '1001', description: 'Salário Base', type: 'provento', value: salary, reference: '30d' });
    }
    if (selectedCodes.includes('1002') && !isEmployee) {
        totalProventos += proLabore;
        events.push({ code: '1002', description: 'Pró-Labore', type: 'provento', value: proLabore });
    }

    // 2. Horas Extras
    if (selectedCodes.includes('1501') && inputs.he50_qtde > 0) {
        const v = inputs.he50_qtde * hourlyRate * 1.5;
        totalProventos += v;
        events.push({ code: '1501', description: 'H.E. 50%', type: 'provento', value: v, reference: `${inputs.he50_qtde}h` });
    }
    if (selectedCodes.includes('1502') && inputs.he100_qtde > 0) {
        const v = inputs.he100_qtde * hourlyRate * 2;
        totalProventos += v;
        events.push({ code: '1502', description: 'H.E. 100%', type: 'provento', value: v, reference: `${inputs.he100_qtde}h` });
    }

    // 3. Comissões & Bônus
    if (selectedCodes.includes('1601') && inputs.comissao_valor > 0) {
        totalProventos += inputs.comissao_valor;
        events.push({ code: '1601', description: 'Comissões', type: 'provento', value: inputs.comissao_valor });
    }
    if (selectedCodes.includes('1602') && inputs.bonus_valor > 0) {
        totalProventos += inputs.bonus_valor;
        events.push({ code: '1602', description: 'Bônus / Gratificação', type: 'provento', value: inputs.bonus_valor });
    }

    // 4. Adicionais
    if (selectedCodes.includes('1701')) { // Periculosidade
        const v = salary * 0.30;
        totalProventos += v;
        events.push({ code: '1701', description: 'Adicional Periculosidade', type: 'provento', value: v, reference: '30%' });
    }
    if (selectedCodes.includes('1702') && inputs.adicional_insalubridade !== 'nenhum') {
        const pct = inputs.adicional_insalubridade === 'min' ? 0.1 : inputs.adicional_insalubridade === 'med' ? 0.2 : 0.4;
        const v = getConstants(year).SALARIO_MINIMO * pct;
        totalProventos += v;
        events.push({ code: '1702', description: 'Adicional Insalubridade', type: 'provento', value: v, reference: `${pct * 100}%` });
    }

    // 5. DSR (Simulado)
    if (selectedCodes.includes('1801')) {
        // Need variable sum
        const vars = (events.find(e => e.code === '1501')?.value || 0) +
            (events.find(e => e.code === '1502')?.value || 0) +
            (events.find(e => e.code === '1601')?.value || 0);
        if (vars > 0) {
            const dsr = (vars / 25) * 5;
            totalProventos += dsr;
            events.push({ code: '1801', description: 'DSR s/ Variáveis', type: 'provento', value: dsr });
        }
    }

    // 6. Salário Família
    if (selectedCodes.includes('2001') && emp) {
        if (salary <= getConstants(year).SALARIO_FAMILIA_LIMITE) {
            const numDep = emp.dependents ? parseInt(emp.dependents) : 0;
            if (numDep > 0) {
                const v = numDep * getConstants(year).SALARIO_FAMILIA_COTA;
                totalProventos += v;
                events.push({ code: '2001', description: 'Salário Família', type: 'provento', value: v, reference: `${numDep} cotas` });
            }
        }
    }

    // --- 13º SALÁRIO ---
    let base13 = 0;
    if (calcType === 'decimo_terceiro') {
        base13 = salary + (inputs.media_variaveis_valor || 0);

        if (selectedCodes.includes('4001')) { // 1a Parcela
            const val = base13 / 2;
            totalProventos += val;
            events.push({ code: '4001', description: '1ª Parcela 13º Salário', type: 'provento', value: val, reference: '50%' });
        }
        if (selectedCodes.includes('4002')) { // Parcela Final
            totalProventos += base13;
            events.push({ code: '4002', description: '13º Salário Integral', type: 'provento', value: base13 });
        }
        // Discount Advance
        if (selectedCodes.includes('9001')) {
            const adv = base13 / 2;
            totalDescontos += adv;
            events.push({ code: '9001', description: 'Desc. Adiantamento 13º', type: 'desconto', value: adv });
        }
    }

    // --- FÉRIAS ---
    if (calcType === 'ferias') {
        const days = inputs.feriasDias || 30;
        const baseVacation = salary + (inputs.media_variaveis_valor || 0);
        const vacationVal = (baseVacation / 30) * days;
        const oneThird = vacationVal / 3;

        if (selectedCodes.includes('6001')) {
            totalProventos += vacationVal;
            events.push({ code: '6001', description: `Férias Gozadas`, type: 'provento', value: vacationVal, reference: `${days}d` });
        }
        if (selectedCodes.includes('6002')) {
            totalProventos += oneThird;
            events.push({ code: '6002', description: '1/3 Constitucional', type: 'provento', value: oneThird });
        }
        if (selectedCodes.includes('6003') && inputs.feriasAbono) {
            const abonoVal = (baseVacation / 30) * 10;
            totalProventos += abonoVal;
            events.push({ code: '6003', description: 'Abono Pecuniário', type: 'provento', value: abonoVal, reference: '10d' });

            if (selectedCodes.includes('6004')) {
                const abono13 = abonoVal / 3;
                totalProventos += abono13;
                events.push({ code: '6004', description: '1/3 Abono Pecuniário', type: 'provento', value: abono13 });
            }
        }
    }

    // --- RESCISÃO ---
    if (calcType === 'rescisao') {
        // Fix timezone issue by appending time or taking components
        const separationDate = inputs.rescisaoDate ? new Date(inputs.rescisaoDate + 'T12:00:00') : new Date();
        const lastWorkedDay = separationDate.getDate();
        const baseRescisao = salary + (inputs.media_variaveis_valor || 0);

        if (selectedCodes.includes('7001')) {
            const val = (baseRescisao / 30) * lastWorkedDay;
            totalProventos += val;
            events.push({ code: '7001', description: 'Saldo de Salário', type: 'provento', value: val, reference: `${lastWorkedDay}d` });
        }
        if (selectedCodes.includes('7002')) { // Aviso Indenizado
            const val = baseRescisao; // Simplified
            totalProventos += val;
            events.push({ code: '7002', description: 'Aviso Prévio Indenizado', type: 'provento', value: val });
        }
        // ... (Other rescisao items logic would go here, simplified for this phase)
        if (selectedCodes.includes('7005') && inputs.rescisaoVacationBalance) {
            const val = (baseRescisao / 30) * inputs.rescisaoVacationBalance;
            totalProventos += val + (val / 3);
            events.push({ code: '7005', description: 'Férias Vencidas + 1/3', type: 'provento', value: val + (val / 3), reference: `${inputs.rescisaoVacationBalance}d` });
        }
    }

    // --- DESCONTOS GERAIS ---

    // Faltas/Atrasos
    if (selectedCodes.includes('5101') && inputs.faltas_dias > 0) {
        const v = inputs.faltas_dias * dailyRate;
        totalDescontos += v;
        events.push({ code: '5101', description: 'Faltas', type: 'desconto', value: v, reference: `${inputs.faltas_dias}d` });
    }
    if (selectedCodes.includes('5102') && inputs.atrasos_mins > 0) {
        const v = (inputs.atrasos_mins / 60) * hourlyRate;
        totalDescontos += v;
        events.push({ code: '5102', description: 'Atrasos', type: 'desconto', value: v, reference: `${inputs.atrasos_mins}min` });
    }

    // Beneficios
    if (selectedCodes.includes('5201')) { // VT
        const v = Math.min(salary * 0.06, salary); // 6%
        totalDescontos += v;
        events.push({ code: '5201', description: 'Vale Transporte', type: 'desconto', value: v, reference: '6%' });
    }
    if (selectedCodes.includes('5202') && inputs.desc_plano_saude > 0) {
        totalDescontos += inputs.desc_plano_saude;
        events.push({ code: '5202', description: 'Plano de Saúde', type: 'desconto', value: inputs.desc_plano_saude });
    }

    // Custom Events (Manual entries)
    inputs.customEvents?.forEach(evt => {
        if (evt.type === 'provento') {
            totalProventos += evt.value;
            events.push({ code: evt.code || 'MAN', description: evt.description, type: 'provento', value: evt.value });
        } else {
            totalDescontos += evt.value;
            events.push({ code: evt.code || 'MAN', description: evt.description, type: 'desconto', value: evt.value });
        }
    });

    // DYNAMIC CUSTOM RUBRICS (From RubricManager selection)
    selectedCodes.forEach(code => {
        // Skip system codes that we already handled above
        // System codes start with 1, 2, 4, 5, 6, 7, 8, 9 usually.
        // But we can just check if it was likely handled or simplisticly check if it exists in customRubrics list

        const customItem = customRubrics.find(r => r.code === code);
        if (customItem) {
            let val = 0;
            // Parse calcValue
            const ruleValue = parseFloat(customItem.calcValue || '0');

            if (customItem.calcMethod === 'fixo') {
                val = ruleValue;
            } else if (customItem.calcMethod === 'percentual') {
                val = salary * (ruleValue / 100);
            }

            if (val > 0) {
                if (customItem.type === 'provento') {
                    totalProventos += val;
                } else if (customItem.type === 'desconto') {
                    totalDescontos += val;
                }

                // Add to events if not already added (some logic might have added it if it matched a system code, but custom rubrics usually have unique codes)
                // We assume unique codes for custom rubrics.
                events.push({
                    code: customItem.code,
                    description: customItem.name,
                    type: customItem.type,
                    value: val,
                    reference: customItem.calcMethod === 'percentual' ? `${ruleValue}%` : undefined
                });
            }
        }
    });

    // --- IMPOSTOS (INSS/IRRF) ---
    // Calculate Base
    // INSS Base = Total Proventos - Non-Taxable (Salario Familia, Indenizações)
    // Simplified: All proventos taxable unless specified (Indenizacoes in Rescisao usually exempt)

    let baseINSS = totalProventos;
    // Remove exclusions
    const sf = events.find(e => e.code === '2001');
    if (sf) baseINSS -= sf.value;
    // Remove Aviso Indenizado/Ferias Indenizadas from INSS Base (Check legislation validity)
    // For now keeping simple

    // Calculate INSS
    let inssValue = 0;
    if (selectedCodes.includes('5001') || selectedCodes.includes('201') || selectedCodes.includes('80.01')) { // 5001 is our new code
        const inssRes = calculateINSS(baseINSS, isEmployee ? 'CLT' : 'Partner', year);
        inssValue = inssRes.value;
        totalDescontos += inssValue;
        events.push({ code: '5001', description: 'INSS', type: 'desconto', value: inssValue, reference: `${(inssRes.effectiveRate * 100).toFixed(2)}%` });
    }

    // Calculate IRRF
    // Base = Total Proventos - INSS - Dependents - Simplificado
    // Note: Usually uses separate base if using Simplificado
    // FIXED: calculateIRRF now handles the choice between Simplified vs Legal correctly using Gross Base

    let baseIRRF = baseINSS; // Gross Base for IRRF (approx. same as INSS Base usually)

    if (selectedCodes.includes('5002')) {
        const dependentsCount = emp?.dependents ? parseInt(emp.dependents) : 0;
        const irrfRes = calculateIRRF(baseIRRF, inssValue, dependentsCount, year);

        if (irrfRes.value > 0) {
            totalDescontos += irrfRes.value;
            events.push({
                code: '5002',
                description: 'IRRF',
                type: 'desconto',
                value: irrfRes.value,
                reference: irrfRes.type
            });
        }
    }

    const netSalary = totalProventos - totalDescontos;
    const fgtsVal = isEmployee ? (baseINSS * 0.08) : 0;

    return {
        person,
        events,
        totalProventos,
        totalDescontos,
        netSalary,
        baseINSS,
        baseIRRF,
        fgtsVal,
        rescisaoDate: inputs.rescisaoDate,
        rescisaoReason: inputs.rescisaoReason,
        rescisaoReasonLabel: inputs.rescisaoReason === 'sem_justa_causa' ? 'Dispensa sem Justa Causa' : 'Outros'
    };
};
