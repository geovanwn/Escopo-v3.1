import { describe, it, expect } from 'vitest';

// Example calculation to test
const calculateTax = (value: number, rate: number) => value * (rate / 100);

describe('Tax Calculations', () => {
    it('should calculate 18% ICMS correctly', () => {
        expect(calculateTax(1000, 18)).toBe(180);
    });

    it('should return 0 for zero rate', () => {
        expect(calculateTax(500, 0)).toBe(0);
    });
});

describe('Payroll Logic', () => {
    it('should calculate net salary after 8% INSS', () => {
        const salary = 2000;
        const inss = salary * 0.08;
        const net = salary - inss;
        expect(net).toBe(1840);
    });
});
