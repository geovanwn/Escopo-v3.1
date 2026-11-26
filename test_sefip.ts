import { generateSEFIP84 } from './utils/sefip84Generator';
import { CompanyEntity, Employee, PayrollRun, PayrollRunDetail } from './types';

const mockCompany: CompanyEntity = {
    id: '1',
    cnpj: '61754960000131',
    razaoSocial: 'ILENE SOARES DA SILVA LTDA',
    nomeFantasia: 'ILENE SOARES',
    telefone: '11999999999',
    email: 'teste@teste.com',
    address: {
        street: 'RUA TESTE',
        number: '123',
        neighborhood: 'CENTRO',
        city: 'SAO PAULO',
        uf: 'SP',
        zip: '01001000'
    },
    cnae: '6201500',
    fpas: '515',
    codigoTerceiros: '0000',
    aliquotaRAT: '20'
};

const mockEmployees: Employee[] = [
    {
        id: 'emp1',
        name: 'JOAO DA SILVA',
        cpf: '12345678901',
        pis: '16277790537',
        admissionDate: '2000-01-01',
        status: 'ativo',
        salary: 5000,
        position: 'ANALISTA',
        department: 'TI'
    }
];

const mockPayrollRun: PayrollRun = {
    id: 'run1',
    competence: '02/2026',
    status: 'fechado',
    totalGross: 5000,
    totalNet: 4000,
    totalTaxes: 1000,
    details: [
        {
            employeeId: 'emp1',
            employeeName: 'JOAO DA SILVA',
            competence: '02/2026',
            baseSalary: 5000,
            totalProventos: 5000,
            totalDescontos: 1000,
            netSalary: 4000,
            baseFGTS: 5000,
            baseINSS: 5000,
            inssValue: 500,
            baseIRRF: 5000,
            fgtsValue: 400,
            irrfValue: 0,
            events: []
        }
    ]
};

const responsible = {
    name: 'JOSE RESPONSAVEL',
    phone: '11888888888',
    contact: 'CONTATO'
};

const sefip = generateSEFIP84(mockCompany, mockEmployees, mockPayrollRun, responsible);
const lines = sefip.split('\r\n');

console.log('--- SEFIP VALIDATION ---');
lines.forEach((line, index) => {
    console.log(`Line ${index + 1}: Length = ${line.length}, Ends with '*' = ${line.endsWith('*')}`);
    if (line.length !== 360) {
        console.error(`ERROR: Line ${index + 1} has incorrect length ${line.length}`);
    }
});

// Check R00 competence at 292
const r00 = lines[0];
console.log('R00 Competence (292-297):', r00.substring(291, 297));
console.log('R00 Cod Recolhimento (298-300):', r00.substring(297, 300));
console.log('R00 Modalidade (304):', r00.substring(303, 304)); // Wait, 304 is Data Arquivo? No, Modalidade is at 303 (index 302).
console.log('R30 PIS (33-43):', lines[2].substring(32, 43));
