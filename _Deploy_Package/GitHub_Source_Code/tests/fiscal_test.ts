
// Teste Unitário Manual do Motor Fiscal
import { calculateComplexDas, SIMPLES_ANNEXES } from '../utils/fiscalCalculations';
import { generateClosingEntries } from '../utils/accountingAutomations';
import { Invoice, CompanyEntity, Employee, Filing } from '../types';

// Mocks
const mockCompany: CompanyEntity = {
    id: 'COMP-123',
    cnpj: '12.345.678/0001-90',
    nomeFantasia: 'Empresa Teste Ltda',
    razaoSocial: 'Empresa Teste Ltda',
    regimeTributario: 'simples',
    anexoSimples: 'III',
    telefone: '11999999999',
    email: 'teste@empresa.com',
    cnae: '6200000',
    status: 'active',
    address: { street: 'Rua A', number: '1', neighborhood: 'B', city: 'C', uf: 'SP', zip: '00000-000' }
};

// Cenário: RBT12 de 1.000.000 (Faixa 4 do Anexo III ?)
// Faixa 4 Anexo III: 720k - 1.8M -> Aliq Nominal 16% -> Deducao 35.640
const mockInvoices: Invoice[] = [
    // Invoices antigas para compor RBT12 (Mês anterior)
    { id: '1', date: '2023-06-15', value: 500000, type: 'service', companyId: 'COMP-123', status: 'autorizada' } as Invoice,
    { id: '2', date: '2023-11-20', value: 500000, type: 'service', companyId: 'COMP-123', status: 'autorizada' } as Invoice,
    // Invoice do mês atual (Faturamento)
    { id: '3', date: '2024-01-10', value: 100000, type: 'service', companyId: 'COMP-123', status: 'autorizada' } as Invoice,
];

// 1. Teste RBT12 e DAS
console.log('--- TESTE MOTOR FISCAL ---');

// Simular fechamento de Janeiro/2024
const period = '2024-01';
const result = generateClosingEntries(
    mockCompany,
    period,
    mockInvoices,
    [], // sem employees
    [] // sem filings
);

console.log(`Período: ${period}`);
console.log(`Faturamento Mês: ${result.revenue}`);
console.log(`Imposto Calculado (DAS): ${result.taxes.toFixed(2)}`);

// Validação Manual
// RBT12 esperado: 1.000.000
// Anexo III Faixa 4: 1.000.000 está entre 720k e 1.8M
// Alíquota Nominal: 16.00%
// Dedução: 35.640,00
// Calculo Efetiva: ((1.000.000 * 0.16) - 35640) / 1.000.000
// (160.000 - 35.640) / 1kk = 124.360 / 1kk = 12,436%
// Imposto esperado sobre 100.000: 100k * 12,436% = 12.436,00

const expectedTax = 12436.00;
const diff = Math.abs(result.taxes - expectedTax);

if (diff < 1.0) {
    console.log('✅ SUCESSO: O cálculo do DAS bateu com a validação manual!');
} else {
    console.error(`❌ FALHA: Esperado ${expectedTax}, Recebido ${result.taxes}`);
}

console.log('Lançamentos Contábeis Gerados:', result.entries.length);
result.entries.forEach(e => console.log(` - ${e.date} | ${e.description} | R$ ${e.value.toFixed(2)}`));
