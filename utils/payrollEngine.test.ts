
import { describe, it, expect } from 'vitest';
import { calculatePayroll, CONSTANTS } from './payrollEngine';
import { Employee, PayrollInputState } from '../types';

describe('Payroll Engine', () => {
    const mockEmployee: Employee = {
        id: '1',
        name: 'Test Employee',
        position: 'Developer',
        salary: 3000,
        admissionDate: '2023-01-01',
        department: 'Development',
        status: 'ativo',
        dependents: '0',
        cpf: '000.000.000-00',
        type: 'employee'
    };

    const defaultInputs: PayrollInputState = {
        month: '05',
        year: '2025',
        workedDays: 30,
        selectedRubrics: ['1001', '5001', '5002'], // Salary, INSS, IRRF
        calculationType: 'folha_mensal',
        // default values
        faltas_dias: 0,
        atrasos_mins: 0,
        he50_qtde: 0,
        he100_qtde: 0,
        comissao_valor: 0,
        bonus_valor: 0,
        adicional_insalubridade: 'nenhum',
        adicional_periculosidade: false,
        desc_plano_saude: 0,
        desc_outros: 0,
        customEvents: [],
        rescisaoReason: 'sem_justa_causa',
        rescisaoNotice: 'indenizado',
        rescisaoVacationBalance: 0,
        decimoTerceiroParcela: 'unica',
        desc_vt: false,
        desc_adiantamento: 0
    };

    it('should calculate basic monthly payroll correctly', () => {
        const result = calculatePayroll(mockEmployee, defaultInputs);

        expect(result.totalProventos).toBe(3000);
        // Validate INSS (2025 table in code)
        // 3000 falls in 12% bracket but progressive
        // Logic: 
        // 1518 * 0.075 = 113.85
        // (2900 - 1518) * 0.09 = 1382 * 0.09 = 124.38
        // (3000 - 2900) * 0.12 = 100 * 0.12 = 12.00
        // Total INSS = 113.85 + 124.38 + 12.00 = 250.23
        const inssEvent = result.events.find(e => e.code === '5001');
        expect(inssEvent).toBeDefined();
        // Allow small rounding diffs
        expect(inssEvent?.value).toBeCloseTo(250.23, 1);

        // Validate IRRF
        // Base = 3000 - 250.23 = 2749.77
        // Simplificado Discount = 564.80. Base Simpl = 3000 - 564.80 = 2435.20
        // 2435.20 falls in 7.5% bracket (up to 2826.65)
        // (2435.20 * 0.075) - 169.44 = 182.64 - 169.44 = 13.20
        // Legal Base = 2749.77 (No dependents)
        // (2749.77 * 0.075) - 169.44 = 206.23 - 169.44 = 36.79
        // Should choose simplified if lower? Logic says: if simpleTax < legalTax return Simple.
        // 13.20 < 36.79, so it should be 13.20
        const irrfEvent = result.events.find(e => e.code === '5002');
        expect(irrfEvent?.value).toBeCloseTo(13.20, 1);
    });

    it('should calculate 13th salary first installment', () => {
        const inputs = {
            ...defaultInputs,
            calculationType: 'decimo_terceiro' as const,
            selectedRubrics: ['4001'], // Adiantamento 13o
            decimoTerceiroParcela: '1' as const
        };

        const result = calculatePayroll(mockEmployee, inputs);

        expect(result.totalProventos).toBe(1500); // 50% of 3000
        expect(result.totalDescontos).toBe(0); // No discount on first installment usually
    });

    it('should calculate vacation with 1/3', () => {
        const inputs = {
            ...defaultInputs,
            calculationType: 'ferias' as const,
            selectedRubrics: ['6001', '6002'], // Gozo + 1/3
            feriasDias: 30
        };

        const result = calculatePayroll(mockEmployee, inputs);

        expect(result.totalProventos).toBe(3000 + 1000); // 3000 + 1000(1/3)
    });

    it('should handle termination calculations', () => {
        const inputs = {
            ...defaultInputs,
            calculationType: 'rescisao' as const,
            selectedRubrics: ['7001', '7002'], // Saldo Salario + Aviso Indenizado
            rescisaoDate: '2025-05-15' // 15 days worked
        };

        const result = calculatePayroll(mockEmployee, inputs);

        // Saldo Salario: 3000 / 30 * 15 = 1500
        const saldoSalario = result.events.find(e => e.code === '7001');
        expect(saldoSalario?.value).toBe(1500);

        // Aviso Indenizado: 3000
        const aviso = result.events.find(e => e.code === '7002');
        expect(aviso?.value).toBe(3000);
    });

    it('should throw error if no rubrics selected', () => {
        const inputs = { ...defaultInputs, selectedRubrics: [] };
        expect(() => calculatePayroll(mockEmployee, inputs)).toThrow();
    });

    it('should calculate vacation with abono and handle tax exemptions', () => {
        const inputs = {
            ...defaultInputs,
            calculationType: 'ferias' as const,
            selectedRubrics: ['6001', '6002', '6003', '5001'], // Gozo, 1/3, Abono, INSS
            feriasDias: 20,
            feriasAbono: true // Vende 10 dias
        };

        const result = calculatePayroll(mockEmployee, inputs);

        // Gozo: 3000 / 30 * 20 = 2000
        // 1/3 Gozo: 2000 / 3 = 666.67
        // Abono: 3000 / 30 * 10 = 1000
        expect(result.totalProventos).toBeCloseTo(2000 + 666.67 + 1000, 1);

        // Tax Base INSS: Should only be Gozo + 1/3 = 2666.67. Abono is exempt.
        expect(result.baseINSS).toBeCloseTo(2666.67, 1);

        // FGTS Base: Should also be 2666.67
        expect(result.fgtsValue).toBeCloseTo(2666.67 * 0.08, 1);
    });

    it('should handle full termination with proportional items', () => {

        const inputs = {
            ...defaultInputs,
            calculationType: 'rescisao' as const,
            selectedRubrics: ['7001', '7003', '7006'], // Saldo Salario + 13o Prop + Ferias Prop
            rescisaoDate: '2025-06-30' // 6 months worked in year
        };

        const result = calculatePayroll(mockEmployee, inputs);

        // 13o Proporcional: June 30 is end of month, so 6/12. 3000 / 12 * 6 = 1500
        const d13Prop = result.events.find(e => e.code === '7003');
        expect(d13Prop?.value).toBe(1500);

        // Ferias Proporcionais: Admission 2023-01-01, Rescisao 2025-06-30. 
        // 2025-01-01 to 2025-06-30 is exactly 6 months in that cycle.
        // 3000 / 12 * 6 = 1500. Plus 1/3 = 1500 + 500 = 2000
        const feriasProp = result.events.find(e => e.code === '7006');
        expect(feriasProp?.value).toBe(2000);
    });

    it('should use 2026 constants for year 2026', () => {

        const inputs = {
            ...defaultInputs,
            year: '2026',
            selectedRubrics: ['5001', '1001']
        };
        // 2026 Min Wage = 1593.00
        // INSS first bracket 7.5% limit is 1593.00
        // Employee Salary 3000.
        // 1593 * 0.075 = 119.475
        // Next bracket top 3045.
        // Remainder = 3000 - 1593 = 1407.
        // 1407 * 0.09 = 126.63
        // Total INSS = 119.475 + 126.63 = 246.105 ~ 246.11

        const result = calculatePayroll(mockEmployee, inputs);
        const inss = result.events.find(e => e.code === '5001');

        expect(inss?.value).toBeCloseTo(246.11, 1);
    });
});
