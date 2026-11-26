import { describe, it, expect } from 'vitest';
import { calculateDRE, generateJournalEntries, calculateAccountBalance, calculateBalanceSheet } from './accountingEngine';

const mockInvoices = [
    { id: '1', type: 'exit', value: 1000, taxValue: 100, date: '2025-01-10', status: 'paga', entityName: 'Client A' },
    { id: '2', type: 'entry', value: 500, date: '2025-01-15', status: 'paga', category: 'Compras', entityName: 'Supplier A', naturezaOperacao: 'Compra para revenda' }
];

describe('Accounting Engine', () => {
    describe('Journal Entry Generation', () => {
        it('should generate balanced entries for sales', () => {
            const entries = generateJournalEntries(mockInvoices[0]);
            expect(entries).toHaveLength(2); // Revenue + Taxes
            expect(entries[0].debitAccount).toBe('1.1.01.01'); // Cash because status is 'paga'
            expect(entries[0].creditAccount).toBe('3.1');
            expect(entries[0].value).toBe(1000);
            
            // Tax deduções
            expect(entries[1].debitAccount).toBe('3.2');
            expect(entries[1].creditAccount).toBe('2.1.03');
            expect(entries[1].value).toBe(100);
        });

        it('should generate correct entries for purchases', () => {
            const entries = generateJournalEntries(mockInvoices[1]);
            expect(entries).toHaveLength(1);
            expect(entries[0].debitAccount).toBe('1.1.03'); // Stock
            expect(entries[0].value).toBe(500);
        });
    });

    describe('calculateAccountBalance', () => {
        it('should sum debits and subtract credits correctly', () => {
            const entries = [
                { debitAccount: '1.1.01.01', creditAccount: '3.1', value: 100 },
                { debitAccount: '1.1.01.01', creditAccount: '3.1', value: 200 },
                { debitAccount: '4.1', creditAccount: '1.1.01.01', value: 50 }
            ];
            const balance = calculateAccountBalance('1.1.01.01', entries);
            expect(balance).toBe(250); // 100 + 200 - 50
        });
    });

    describe('calculateDRE', () => {
        it('should calculate net profit correctly with accounting entries', () => {
            const entries = [
                { companyId: '123', date: '2025-01-15', debitAccount: '1.1.01.01', creditAccount: '3.1', value: 1000 },
                { companyId: '123', date: '2025-01-15', debitAccount: '3.2', creditAccount: '2.1.03', value: 100 }, // Deduções
                { companyId: '123', date: '2025-01-15', debitAccount: '4.1', creditAccount: '1.1.03', value: 500 }, // CPV
                { companyId: '123', date: '2025-01-15', debitAccount: '4.2.01', creditAccount: '1.1.01.01', value: 200 }, // Pessoal
            ];

            const result = calculateDRE(
                entries,
                '2025-01-01',
                '2025-01-31',
                { id: '123' }
            );

            expect(result.receitaBruta).toBe(1000);
            expect(result.deducoes).toBe(100);
            expect(result.receitaLiquida).toBe(900);
            expect(result.custos).toBe(500);
            expect(result.lucroBruto).toBe(400); // 900 - 500
            expect(result.despesasOperacionais).toBe(200); // 200
            expect(result.lucroLiquido).toBe(200); // 400 - 200
        });
    });
    
    describe('calculateBalanceSheet', () => {
        it('should balance Ativo and Passivo+PL', () => {
            const entries = [
                // Integralização capital 10000 Caixa
                { companyId: '123', date: '2025-01-01', debitAccount: '1.1.01.01', creditAccount: '2.3.01', value: 10000 },
                // Venda 1000 à vista (Custo 500) - gera lucro de 500
                { companyId: '123', date: '2025-01-15', debitAccount: '1.1.01.01', creditAccount: '3.1', value: 1000 },
                { companyId: '123', date: '2025-01-15', debitAccount: '4.1', creditAccount: '1.1.01.01', value: 500 },
            ];
            
            const balanco = calculateBalanceSheet(
                entries,
                '2025-01-31',
                '123'
            );
            
            expect(balanco.isBalanced).toBe(true);
            expect(balanco.ativo.disponivel).toBe(10500); // 10000 + 1000 - 500
            expect(balanco.patrimonioLiquido.capitalSocial).toBe(10000);
            expect(balanco.patrimonioLiquido.resultadoExercicio).toBe(500); // Receita 1000 - Custo 500
        });
    });
});
