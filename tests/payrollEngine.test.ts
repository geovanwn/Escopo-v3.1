import { describe, it, expect } from 'vitest';
import { calculatePayroll } from '../utils/payrollEngine';
import { Employee } from '../types';

describe('Payroll Engine (Recommendation 4)', () => {

    const mockEmployee: Employee = {
        id: '123',
        name: 'John Doe',
        type: 'employee',
        salary: 5000,
        weeklyHours: '44',
        role: 'Developer',
        position: 'Developer',
        admissionDate: '2024-01-01',
        dependents: '0',
        status: 'ativo',
        cpf: '123.456.789-00',
        registration: '001',
        pis: '12345678901',
        ctpsNum: '123',
        ctpsSeries: 'AB',
        cbo: '2124-05',
        department: 'TECH'
    };

    describe('Basic Salary Calculations', () => {
        it('should calculate full salary for 30 worked days', () => {
            const result = calculatePayroll(mockEmployee, {
                workedDays: 30,
                selectedRubrics: ['1001'],
                calculationType: 'folha_mensal'
            });
            expect(result.totalProventos).toBe(5000);
            expect(result.events.find(e => e.code === '1001')?.value).toBe(5000);
        });

        it('should calculate proportional salary for 15 worked days', () => {
            const result = calculatePayroll(mockEmployee, {
                workedDays: 15,
                selectedRubrics: ['1001'],
                calculationType: 'folha_mensal'
            });
            expect(result.totalProventos).toBe(2500);
            expect(result.events.find(e => e.code === '1001')?.value).toBe(2500);
        });
    });

    describe('INSS Calculations (2025)', () => {
        it('should calculate correct progressive INSS for R$ 5.000,00', () => {
            // 2025 Faixas: [1518, 2793.88, 4190.83, 8157.41]
            // F1: 1518 * 0.075 = 113.85
            // F2: (2793.88 - 1518) * 0.09 = 114.83
            // F3: (4190.83 - 2793.88) * 0.12 = 167.63
            // F4: (5000 - 4190.83) * 0.14 = 113.28
            // Total: 113.85 + 114.83 + 167.63 + 113.28 = 509.59
            const result = calculatePayroll(mockEmployee, {
                workedDays: 30,
                selectedRubrics: ['1001'],
                calculationType: 'folha_mensal',
                year: '2025'
            });
            expect(result.events.find(e => e.code === '5001')?.value).toBeCloseTo(509.59, 1);
        });
    });

    describe('IRRF Calculations (Simplified vs Legal)', () => {
        it('should choose simplified discount if more beneficial', () => {
            // With 5000 gross and 0 dependents, simplified usually wins
            const result = calculatePayroll(mockEmployee, {
                workedDays: 30,
                selectedRubrics: ['1001'],
                calculationType: 'folha_mensal',
                year: '2025'
            });
            const irrfEvent = result.events.find(e => e.code === '5002');
            expect(irrfEvent?.reference).toBe('Simples');
        });
    });

    describe('13th Salary', () => {
        it('should calculate 50% for first installment', () => {
            const result = calculatePayroll(mockEmployee, {
                calculationType: 'decimo_terceiro',
                selectedRubrics: ['4001'],
                year: '2025'
            });
            expect(result.events.find(e => e.code === '4001')?.value).toBe(2500);
        });
    });

    describe('Termination', () => {
        it('should calculate salary balance correctly', () => {
            const result = calculatePayroll(mockEmployee, {
                calculationType: 'rescisao',
                rescisaoDate: '2025-01-10', // 10 days
                selectedRubrics: ['7001'],
                year: '2025'
            });
            // 5000 / 30 * 10 = 1666.67
            expect(result.events.find(e => e.code === '7001')?.value).toBeCloseTo(1666.67, 1);
        });
    });
});
