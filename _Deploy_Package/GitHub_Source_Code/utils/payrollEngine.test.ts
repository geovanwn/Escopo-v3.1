
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
});
