import { PayrollInputState, Employee, Partner, PayrollRunDetail } from '../types';
import { RUBRICS } from '../constants/rubrics';

export const CONSTANTS = {
    // 2024 Values (Reference)
    2024: {
        SALARIO_MINIMO: 1412.00,
        TETO_INSS: 7786.02,
        DEDUCAO_DEP_IRRF: 189.59,
        DESC_SIMPLIFICADO_IRRF: 564.80,
        SALARIO_FAMILIA_COTA: 62.04,
        SALARIO_FAMILIA_LIMITE: 1819.26,
        INSS_FAIXAS: [1412.00, 2666.68, 4000.03, 7786.02],
        IRRF_FAIXAS: [2259.20, 2826.65, 3751.05, 4664.68],
        IRRF_DEDUCOES: [169.44, 381.44, 662.77, 896.00]
    },
    // 2025 Official Values
    2025: {
        SALARIO_MINIMO: 1518.00,
        TETO_INSS: 8157.41,
        DEDUCAO_DEP_IRRF: 189.59,
        DESC_SIMPLIFICADO_IRRF: 607.20,
        SALARIO_FAMILIA_COTA: 66.50,
        SALARIO_FAMILIA_LIMITE: 1945.00,
        INSS_FAIXAS: [1518.00, 2793.88, 4190.83, 8157.41],
        IRRF_FAIXAS: [2428.80, 2826.65, 3751.05, 4664.68],
        IRRF_DEDUCOES: [182.16, 394.16, 675.49, 908.73]
    },
    // 2026 Official Values (Current Legislation)
    2026: {
        SALARIO_MINIMO: 1621.00,
        TETO_INSS: 8475.55,
        DEDUCAO_DEP_IRRF: 189.59,
        DESC_SIMPLIFICADO_IRRF: 607.20,
        SALARIO_FAMILIA_COTA: 67.54,
        SALARIO_FAMILIA_LIMITE: 1980.38,
        INSS_FAIXAS: [1621.00, 2902.84, 4354.27, 8475.55],
        IRRF_FAIXAS: [2428.80, 2826.65, 3751.05, 4664.68],
        IRRF_DEDUCOES: [182.16, 394.16, 675.49, 908.73]
    }
};

const getConstants = (year = new Date().getFullYear()) => {
    // Cast to any to access dynamic key, fallback to 2025 if year not found
    return (CONSTANTS as any)[year] || CONSTANTS[2026] || CONSTANTS[2025];
}

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

    const calcTax = (v: number) => {
        const F = C.IRRF_FAIXAS;
        const D = C.IRRF_DEDUCOES;
        if (v <= F[0]) return 0;
        if (v <= F[1]) return (v * 0.075) - D[0];
        if (v <= F[2]) return (v * 0.15) - D[1];
        if (v <= F[3]) return (v * 0.225) - D[2];
        return (v * 0.275) - D[3];
    };

    // Legal Logic
    const legalBase = gross - legalDeductions - (dependents * C.DEDUCAO_DEP_IRRF);
    let legalTax = Math.max(0, calcTax(legalBase));

    // Simplificado Logic
    const simpleBase = gross - C.DESC_SIMPLIFICADO_IRRF;
    let simpleTax = Math.max(0, calcTax(simpleBase));

    // --- 2026 Special Reduction (Reforma da Renda) ---
    if (year === 2026) {
        // Apply Redutor rules based on Gross Revenue
        let redutor = 0;
        if (gross <= 5000) {
            redutor = 900; // Large enough to zero it out completely as per law
        } else if (gross <= 7350) {
            redutor = 978.62 - (0.133145 * gross);
        }

        legalTax = Math.max(0, legalTax - redutor);
        simpleTax = Math.max(0, simpleTax - redutor);
    }

    if (simpleTax < legalTax) return { value: Number(simpleTax.toFixed(2)), type: 'Simples', effectiveBase: simpleBase };
    return { value: Number(legalTax.toFixed(2)), type: 'Legal', effectiveBase: legalBase };
};


// --- MAIN ENGINE ---

// --- MAIN ENGINE ---

export interface PayrollEvent {
    code: string;
    description: string;
    type: 'provento' | 'desconto';
    value: number;
    reference?: string;
}

export interface PayrollResult {
    person: Employee | Partner;
    events: PayrollEvent[];
    totalProventos: number;
    totalDescontos: number;
    netSalary: number;
    baseINSS: number;
    baseIRRF: number;
    baseFGTS: number;
    fgtsValue: number;
    rescisaoDate?: string;
    rescisaoReason?: string;
    rescisaoAfastamentoCode?: string;
    rescisaoReasonLabel?: string;
    calculationType: string;
    isZeroed?: boolean;
}

export const calculatePayroll = (
    person: Employee | Partner,
    inputs: PayrollInputState & { proLaboreOverride?: number },
    customRubrics: any[] = []
): PayrollResult => {
    const calcType = inputs.calculationType || 'folha_mensal';

    // FOlHA ZERADA (No movement check)
    if (inputs.isZeroed) {
        return {
            person,
            events: [],
            totalProventos: 0,
            totalDescontos: 0,
            netSalary: 0,
            baseINSS: 0,
            baseIRRF: 0,
            baseFGTS: 0,
            fgtsValue: 0,
            calculationType: calcType,
            isZeroed: true
        };
    }

    const selectedCodes = inputs.selectedRubrics || [];
    const year = inputs.year ? parseInt(inputs.year) : 2025;
    const constants = getConstants(year);

    const isEmployee = person.type === 'employee';
    const emp = isEmployee ? (person as Employee) : null;
    const part = !isEmployee ? (person as Partner) : null;

    const events: PayrollEvent[] = [];
    // Custom Rubrics that are "Fixed Events" (eventoFixo) should be automatically selected
    const fixedCustomCodes = (customRubrics || []).filter(r => r.eventoFixo).map(r => r.code);
    const effectiveSelectedCodes = Array.from(new Set([...selectedCodes, ...fixedCustomCodes]));

    // Basic income rubrics (1001 for Salary, 1002 for Pro-Labore) should be auto-selected if not present
    if (effectiveSelectedCodes.length === 0) {
        if (isEmployee) effectiveSelectedCodes.push('1001');
        else effectiveSelectedCodes.push('1002');
    }
    let totalProventos = 0;
    let totalDescontos = 0;

    const salary = Number(emp ? emp.salary : 0);
    const proLabore = Number(part ? (inputs.proLaboreOverride || part.proLaboreValue || 0) : 0);

    // Basic rates
    const weeklyHours = emp?.weeklyHours ? parseInt(emp.weeklyHours) : 44;
    const monthlyDivisor = ((weeklyHours || 44) / 44) * 220;
    const hourlyRate = (salary || 0) / (monthlyDivisor || 220);

    const calcDate = inputs.rescisaoDate ? new Date(inputs.rescisaoDate + 'T12:00:00') : new Date();
    const daysInMonth = new Date(calcDate.getFullYear(), calcDate.getMonth() + 1, 0).getDate() || 30;
    const dailyRate = (salary || 0) / daysInMonth;

    // --- 1. PROVENTOS ---

    // 1.1 Fixed Remuneration
    if (isEmployee && effectiveSelectedCodes.includes('1001')) {
        const workedDays = inputs.workedDays !== undefined ? inputs.workedDays : 30;
        const value = (salary / 30) * workedDays;
        events.push({ code: '1001', description: 'Salário Base', type: 'provento', value: Number(value.toFixed(2)), reference: `${workedDays}d` });
    } else if (!isEmployee && effectiveSelectedCodes.includes('1002')) {
        events.push({ code: '1002', description: 'Pró-Labore', type: 'provento', value: Number(proLabore.toFixed(2)), reference: 'Mês' });
    }

    // 1.2 Overtime
    if (selectedCodes.includes('1501') && (inputs.he50_qtde || 0) > 0) {
        const val = (inputs.he50_qtde || 0) * hourlyRate * 1.5;
        events.push({ code: '1501', description: 'H.E. 50%', type: 'provento', value: Number(val.toFixed(2)), reference: `${inputs.he50_qtde || 0}h` });
    }
    if (selectedCodes.includes('1502') && (inputs.he100_qtde || 0) > 0) {
        const val = (inputs.he100_qtde || 0) * hourlyRate * 2.0;
        events.push({ code: '1502', description: 'H.E. 100%', type: 'provento', value: Number(val.toFixed(2)), reference: `${inputs.he100_qtde || 0}h` });
    }

    // 1.3 Comis/Bonus
    if (selectedCodes.includes('1601') && (inputs.comissao_valor || 0) > 0) {
        events.push({ code: '1601', description: 'Comissões', type: 'provento', value: Number(Number(inputs.comissao_valor || 0).toFixed(2)) });
    }
    if (selectedCodes.includes('1602') && (inputs.bonus_valor || 0) > 0) {
        events.push({ code: '1602', description: 'Bônus / Gratificação', type: 'provento', value: Number(Number(inputs.bonus_valor || 0).toFixed(2)) });
    }


    // 1.4 Adicionais
    if (selectedCodes.includes('1701')) { // Periculosis
        const val = salary * 0.30;
        events.push({ code: '1701', description: 'Adicional Periculosidade', type: 'provento', value: Number(val.toFixed(2)), reference: '30%' });
    }
    if (selectedCodes.includes('1702') && inputs.adicional_insalubridade && inputs.adicional_insalubridade !== 'nenhum') {
        const pct = inputs.adicional_insalubridade === 'min' ? 0.1 : inputs.adicional_insalubridade === 'med' ? 0.2 : 0.4;
        const val = constants.SALARIO_MINIMO * pct;
        events.push({ code: '1702', description: 'Adicional Insalubridade', type: 'provento', value: Number(val.toFixed(2)), reference: `${pct * 100}%` });
    }

    // 1.5 DSR
    if (selectedCodes.includes('1801')) {
        const dUteis = inputs.diasUteis || 25;
        const dDescanso = inputs.diasDescanso || 5;
        const baseDSR = events.filter(e => ['1501', '1502', '1601'].includes(e.code)).reduce((acc, e) => acc + e.value, 0);
        if (baseDSR > 0) {
            const val = (baseDSR / dUteis) * dDescanso;
            events.push({ code: '1801', description: 'DSR s/ Variáveis', type: 'provento', value: Number(val.toFixed(2)), reference: `${dDescanso}/${dUteis}` });
        }
    }

    // 1.6 Salário Família
    if (effectiveSelectedCodes.includes('2001') && emp) {
        if (salary <= constants.SALARIO_FAMILIA_LIMITE) {
            const cotas = Number(emp.dependents) || 0;
            if (cotas > 0) {
                const val = cotas * constants.SALARIO_FAMILIA_COTA;
                events.push({ code: '2001', description: 'Salário Família', type: 'provento', value: Number(val.toFixed(2)), reference: `${cotas} cotas` });
            }
        }
    }

    // --- 2. SPECIAL TYPES (13th, Vacation, Termination) ---

    // 13º Salário
    if (calcType === 'decimo_terceiro') {
        const base13 = salary + (inputs.media_variaveis_valor || 0);
        if (selectedCodes.includes('4001')) { // 1st installment
            const val = base13 / 2;
            events.push({ code: '4001', description: '13º Salário (1ª Parcela)', type: 'provento', value: Number(val.toFixed(2)), reference: '50%' });
        }
        if (selectedCodes.includes('4002')) { // 2nd installment/Full
            events.push({ code: '4002', description: '13º Salário Integral', type: 'provento', value: Number(base13.toFixed(2)) });
        }
        if (selectedCodes.includes('9001')) { // Discount 1st installment
            events.push({ code: '9001', description: 'Desc. Adiantamento 13º', type: 'desconto', value: Number((base13 / 2).toFixed(2)) });
        }
    }

    // Férias
    if (calcType === 'ferias') {
        const days = inputs.feriasDias || 30;
        const baseVacation = salary + (inputs.media_variaveis_valor || 0);
        const val = (baseVacation / 30) * days;
        const extraThird = val / 3;

        if (selectedCodes.includes('6001')) {
            events.push({ code: '6001', description: 'Férias Gozadas', type: 'provento', value: Number(val.toFixed(2)), reference: `${days}d` });
        }
        if (selectedCodes.includes('6002')) {
            events.push({ code: '6002', description: '1/3 Constitucional de Férias', type: 'provento', value: Number(extraThird.toFixed(2)) });
        }
        if (selectedCodes.includes('6003') && inputs.feriasAbono) {
            const abono = (baseVacation / 30) * 10;
            events.push({ code: '6003', description: 'Abono Pecuniário', type: 'provento', value: Number(abono.toFixed(2)), reference: '10d' });
            if (selectedCodes.includes('6004')) {
                events.push({ code: '6004', description: '1/3 Abono Pecuniário', type: 'provento', value: Number((abono / 3).toFixed(2)) });
            }
        }
    }

    // Rescisão
    if (calcType === 'rescisao') {
        const baseResc = salary + (inputs.media_variaveis_valor || 0);
        const termDate = inputs.rescisaoDate ? new Date(inputs.rescisaoDate + 'T12:00:00') : new Date();
        const admDateStr = person.admissionDate || (person as any).entryDate || new Date().toISOString().split('T')[0];
        const admDate = new Date(admDateStr + 'T12:00:00');

        // 7.1 Salary Balance
        if (selectedCodes.includes('7001')) {
            const daysToPay = termDate.getDate();
            const val = (baseResc / 30) * daysToPay;
            events.push({ code: '7001', description: 'Saldo de Salário', type: 'provento', value: Number(val.toFixed(2)), reference: `${daysToPay}d` });
        }

        // 7.2 Indemnities
        if (selectedCodes.includes('7002')) {
            events.push({ code: '7002', description: 'Aviso Prévio Indenizado', type: 'provento', value: Number(baseResc.toFixed(2)) });
        }
        if (selectedCodes.includes('7003')) {
            const startYear = new Date(termDate.getFullYear(), 0, 1);
            const refDate = admDate > startYear ? admDate : startYear;
            const months = termDate.getMonth() - refDate.getMonth() + (termDate.getDate() >= 15 ? 1 : 0);
            const val = (baseResc / 12) * months;
            events.push({ code: '7003', description: '13º Salário Proporcional', type: 'provento', value: Number(val.toFixed(2)), reference: `${months}/12` });
        }
        if (selectedCodes.includes('7006')) {
            const diffTime = Math.abs(termDate.getTime() - admDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const months = Math.floor(diffDays / 30) % 12 + (diffDays % 30 >= 15 ? 1 : 0);
            const val = (baseResc / 12) * months;
            events.push({ code: '7006', description: 'Férias Proporcionais + 1/3', type: 'provento', value: Number((val * 1.3333).toFixed(2)), reference: `${months}/12` });
        }
        if (selectedCodes.includes('7005')) {
            const days = inputs.rescisaoVacationBalance || 30;
            const val = (baseResc / 30) * days;
            events.push({ code: '7005', description: 'Férias Vencidas + 1/3', type: 'provento', value: Number((val * 1.3333).toFixed(2)), reference: `${days}d` });
        }
    }

    // --- 3. DESCONTOS ---

    // 3.1 Absences
    if (selectedCodes.includes('5101') && (inputs.faltas_dias || 0) > 0) {
        const val = (inputs.faltas_dias || 0) * dailyRate;
        events.push({ code: '5101', description: 'Faltas', type: 'desconto', value: Number(val.toFixed(2)), reference: `${inputs.faltas_dias || 0}d` });
    }
    if (selectedCodes.includes('5102') && (inputs.atrasos_mins || 0) > 0) {
        const val = ((inputs.atrasos_mins || 0) / 60) * hourlyRate;
        events.push({ code: '5102', description: 'Atrasos', type: 'desconto', value: Number(val.toFixed(2)), reference: `${inputs.atrasos_mins || 0}min` });
    }

    // 3.2 Benefits
    if (selectedCodes.includes('5201') && inputs.desc_vt) {
        const transportCost = inputs.transportVoucherValue || 0;
        const discount6Percent = salary * 0.06;
        const value = Math.min(discount6Percent, transportCost > 0 ? transportCost : discount6Percent);
        events.push({ code: '5201', description: 'Vale Transporte', type: 'desconto', value: Number(value.toFixed(2)), reference: '6%' });
    }
    if (selectedCodes.includes('5202') && (inputs.desc_plano_saude || 0) > 0) {
        events.push({ code: '5202', description: 'Plano de Saúde', type: 'desconto', value: Number(Number(inputs.desc_plano_saude).toFixed(2)) });
    }

    // 3.3 Custom Rubrics (from RubricManager)
    effectiveSelectedCodes.forEach(code => {
        const customItem = customRubrics.find(r => r.code === code);
        if (customItem) {
            if (events.some(e => e.code === code)) return;

            let val = 0;
            const ruleValue = parseFloat(customItem.calcValue || '0');

            if (customItem.calcMethod === 'fixo') {
                val = ruleValue;
            } else if (customItem.calcMethod === 'percentual') {
                val = (emp ? salary : proLabore) * (ruleValue / 100);
            }

            if (val > 0) {
                events.push({
                    code: customItem.code,
                    description: customItem.name,
                    type: customItem.type === 'earnings' || customItem.type === 'provento' ? 'provento' : 'desconto',
                    value: Number(val.toFixed(2)),
                    reference: customItem.calcMethod === 'percentual' ? `${ruleValue}%` : undefined
                });
            }
        }
    });

    // 3.4 Custom Events (Manual entries)
    inputs.customEvents?.forEach(evt => {
        events.push({ code: evt.code || 'MAN', description: evt.description, type: evt.type, value: Number(Number(evt.value).toFixed(2)) });
    });

    // --- 4. TAXES (INSS / IRRF) ---

    totalProventos = events.filter(e => e.type === 'provento').reduce((acc, e) => acc + e.value, 0);

    // INSS Base
    const nonTaxableCodes = ['2001', '6003', '6004', '7005', '7006']; // Family wage, abono, rescision vacations
    let baseINSS = events.filter(e => e.type === 'provento' && !nonTaxableCodes.includes(e.code)).reduce((acc, e) => acc + e.value, 0);

    // Calculate INSS
    let inssVal = 0;
    // Always calculate INSS (5001) automatically if it results in a non-zero value, unless it's already in the events
    const resINSS = calculateINSS(Math.max(0, baseINSS), isEmployee ? 'CLT' : 'Partner', year);
    inssVal = resINSS.value;
    if (inssVal > 0 && !events.some(e => e.code === '5001')) {
        events.push({
            code: '5001',
            description: isEmployee ? 'INSS' : 'INSS Pró-Labore',
            type: 'desconto',
            value: inssVal,
            reference: `${(resINSS.effectiveRate * 100).toFixed(2)}%`
        });
    }

    // IRRF Base
    let baseIRRF = baseINSS - inssVal;
    // Always calculate IRRF (5002) automatically, unless it's already in the events
    const deps = Number(emp?.dependents) || 0;
    const resIRRF = calculateIRRF(Math.max(0, baseIRRF), 0, deps, year);
    if (resIRRF.value > 0 && !events.some(e => e.code === '5002') && (effectiveSelectedCodes.includes('5002') || true)) {
        events.push({ code: '5002', description: 'IRRF', type: 'desconto', value: resIRRF.value, reference: resIRRF.type });
    }

    // Totals
    totalProventos = events.filter(e => e.type === 'provento').reduce((acc, e) => acc + e.value, 0);
    totalDescontos = events.filter(e => e.type === 'desconto').reduce((acc, e) => acc + e.value, 0);
    const netSalary = totalProventos - totalDescontos;

    // FGTS (8%)
    const baseFGTS = events.filter(e => e.type === 'provento' && !['2001', '7002', '7005', '7006'].includes(e.code)).reduce((acc, e) => acc + e.value, 0);
    const fgtsValue = isEmployee ? Math.max(0, baseFGTS) * 0.08 : 0;

    return {
        person,
        events,
        totalProventos: Number(totalProventos.toFixed(2)),
        totalDescontos: Number(totalDescontos.toFixed(2)),
        netSalary: Number(netSalary.toFixed(2)),
        baseINSS: Number(baseINSS.toFixed(2)),
        baseIRRF: Number(baseIRRF.toFixed(2)),
        baseFGTS: Number(baseFGTS.toFixed(2)),
        fgtsValue: Number(fgtsValue.toFixed(2)),
        rescisaoDate: inputs.rescisaoDate,
        rescisaoReason: inputs.rescisaoReason,
        rescisaoReasonLabel: inputs.rescisaoReason === 'sem_justa_causa' ? 'Dispensa sem Justa Causa' :
            inputs.rescisaoReason === 'pedido_demissao' ? 'Pedido de Demissão' :
                inputs.rescisaoReason === 'justa_causa' ? 'Justa Causa' : 'Acordo',
        calculationType: calcType
    };
};

