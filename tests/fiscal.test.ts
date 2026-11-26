/*
import { describe, it, expect } from 'vitest';
import {
    calculateFatorR,
    shouldShiftAnnex,
    calculateEffectiveRate,
    calculateDasValue
} from '../utils/fiscalCalculations';

describe('Fiscal Calculations (Recommendation 10)', () => {

    describe('Fator R', () => {
        it('should calculate correct Fator R', () => {
            expect(calculateFatorR(2800, 10000)).toBe(0.28);
            expect(calculateFatorR(2799, 10000)).toBeLessThan(0.28);
            expect(calculateFatorR(0, 5000)).toBe(0);
            expect(calculateFatorR(1000, 0)).toBe(0);
        });
    });

    describe('Annex Shifting (Fator R Logic)', () => {
        it('should shift from Annex III to V if Fator R < 0.28', () => {
            expect(shouldShiftAnnex('III', 0.25)).toBe('V');
        });

        it('should keep Annex III if Fator R >= 0.28', () => {
            expect(shouldShiftAnnex('III', 0.28)).toBe('III');
            expect(shouldShiftAnnex('III', 0.30)).toBe('III');
        });

        it('should shift from Annex V to III if Fator R >= 0.28', () => {
            expect(shouldShiftAnnex('V', 0.28)).toBe('III');
            expect(shouldShiftAnnex('V', 0.35)).toBe('III');
        });

        it('should keep Annex V if Fator R < 0.28', () => {
            expect(shouldShiftAnnex('V', 0.27)).toBe('V');
        });
    });

    describe('Effective Rate and DAS Value', () => {
        it('should calculate correct effective rate for Annex III - 1st Tier', () => {
            // RBT12 = 100,000 (Tier 1: limit 180,000, rate 6%, ded 0)
            const rate = calculateEffectiveRate(100000, 'III');
            expect(rate).toBeCloseTo(0.06, 4);

            const das = calculateDasValue(10000, rate);
            expect(das).toBe(600);
        });

        it('should calculate correct effective rate for Annex III - 2nd Tier', () => {
            // RBT12 = 200,000 (Tier 2: limit 360,000, rate 11.2%, ded 9360)
            // ((200000 * 0.112) - 9360) / 200000 = (22400 - 9360) / 200000 = 13040 / 200000 = 0.0652
            const rate = calculateEffectiveRate(200000, 'III');
            expect(rate).toBeCloseTo(0.0652, 4);

            const das = calculateDasValue(10000, rate);
            expect(das).toBe(652);
        });

        it('should handle zero RBT12 by returning base rate of first tier', () => {
            expect(calculateEffectiveRate(0, 'I')).toBe(0.04);
            expect(calculateEffectiveRate(0, 'III')).toBe(0.06);
        });
    });
});
*/
