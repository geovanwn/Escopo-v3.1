import { PayrollRun, CompanyEntity, Employee } from '../types';

/**
 * Normalizes strings for SEFIP (removing accents and special characters)
 */
const normalizeSefip = (str: string) => {
    if (!str) return '';
    return str.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Z0-9 ]/gi, "")
        .toUpperCase();
};

const cleanDoc = (str: string) => str.replace(/\D/g, '');

const fStr = (val: string | undefined, len: number) => {
    return normalizeSefip(val || '').padEnd(len, ' ').substring(0, len);
};

const fNum = (val: string | number | undefined, len: number) => {
    const clean = cleanDoc(String(val || ''));
    return clean.substring(Math.max(0, clean.length - len)).padStart(len, '0');
};

const fDate = (date: string | undefined) => {
    if (!date) return '00000000';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '00000000';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear());
    return `${day}${month}${year}`;
};

const fVal = (val: number | undefined, len: number) => {
    if (val === undefined || val === null) return '0'.padStart(len, '0');
    const s = Math.round(val * 100).toString();
    return s.substring(Math.max(0, s.length - len)).padStart(len, '0');
};

/**
 * Generates eSocial XML (Placeholder)
 * @todo Implement full eSocial S-1200 logic
 */
export const generateEsocial = (run: PayrollRun, company: CompanyEntity, employees: Employee[]): string => {
    // Basic placeholder XML for eSocial S-1200
    return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtRemun/v_S_01_00_00">
    <evtRemun Id="ID1${company.cnpj}${new Date().getTime()}">
        <ideEvento>
            <tpAmb>2</tpAmb>
            <procEmi>1</procEmi>
            <verProc>1.0</verProc>
        </ideEvento>
        <ideEmpregador>
            <tpInsc>1</tpInsc>
            <nrInsc>${company.cnpj}</nrInsc>
        </ideEmpregador>
        <ideTrabalhador>
            <cpfTrab>${employees[0]?.cpf || ''}</cpfTrab>
        </ideTrabalhador>
    </evtRemun>
</eSocial>`;
};

export const generateSEFIP = (run: PayrollRun, company: CompanyEntity, employees: Employee[]): string => {
    const records: string[] = [];
    const compParts = (run.competence || '').split('/');
    const aaaamm = compParts.length === 2 ? `${compParts[1]}${compParts[0]}` : String(run.competence || '').replace(/\D/g, '');
    
    const companyName = normalizeSefip(company.razaoSocial || 'EMPRESA');
    const cnpj = fNum(company.cnpj, 14);

    // build chunk of exactly 360 bytes ending in '*'
    const build = (str: string) => str.substring(0, 359).padEnd(359, ' ') + '*';

    // --- REGISTRO 00 ---
    let r00 = '00';
    r00 += ''.padEnd(51, ' ');
    r00 += '1'; // Remessa
    r00 += '1'; // Tipo Insc
    r00 += cnpj;
    r00 += fStr(companyName, 30);
    r00 += fStr('RESPONSAVEL', 20);
    r00 += fStr(company.address?.street, 50);
    r00 += fStr(company.address?.neighborhood, 20);
    r00 += fNum(company.address?.zip, 8);
    r00 += fStr(company.address?.city, 20);
    r00 += fStr(company.address?.uf, 2);
    r00 += fNum(company.telefone, 12);
    r00 += ''.padEnd(60, ' ');
    r00 += fNum(aaaamm, 6);
    r00 += '115';
    r00 += '1'; // No prazo
    r00 += ' '; // Modalidade
    r00 += '00000000';
    r00 += '1'; // Ind Prev
    records.push(build(r00));

    // --- REGISTRO 10 ---
    let r10 = '10';
    r10 += '1';
    r10 += cnpj;
    r10 += ''.padStart(36, '0');
    r10 += fStr(companyName, 40);
    r10 += fStr(company.address?.street, 50);
    r10 += fStr(company.address?.neighborhood, 20);
    r10 += fNum(company.address?.zip, 8);
    r10 += fStr(company.address?.city, 20);
    r10 += fStr(company.address?.uf, 2);
    r10 += fNum(company.telefone, 12);
    r10 += 'N';
    r10 += fNum(company.cnae, 7);
    r10 += 'N';
    r10 += '20'; // RAT
    r10 += '0'; // Central
    r10 += '1'; // Simples
    r10 += '515'; // FPAS
    r10 += '0000'; // Terceiros
    records.push(build(r10));

    // --- REGISTRO 30 ---
    (run.details || []).forEach(detail => {
        if (detail.personType !== 'employee') return;
        if (detail.isZeroed) return; // Skip zeroed records (Sem Movimento)
        const emp = employees.find(e => e.id === detail.employeeId);
        if (!emp) return;

        let r30 = '30';
        r30 += '1';
        r30 += cnpj;
        r30 += ''.padEnd(15, ' ');
        r30 += fNum(emp.pis, 11);
        r30 += fDate(emp.admissionDate);
        r30 += '01'; // Categoria
        r30 += fStr(emp.name, 70);
        r30 += fNum(emp.registration, 11);
        r30 += ''.padEnd(6, ' '); // 135-140 (CTPS empty)
        r30 += fNum(emp.cpf, 11); // 141-151 (CPF)
        r30 += ''.padEnd(3, ' '); // 152-154
        r30 += fDate(emp.birthDate || '1990-01-01'); // 155-162
        r30 += fNum(emp.cbo, 5); // 163-167
        r30 += fVal(detail.baseFGTS, 15); // 168-182
        r30 += fVal(0, 15); // 183-197
        r30 += '000000'; // 198-203
        r30 += fVal(0, 15); // 204-216
        r30 += fVal(detail.baseINSS, 15); // 217-231
        r30 += fVal(0, 15); // 232-246
        records.push(build(r30));
    });

    // --- REGISTRO 90 ---
    let r90 = '90';
    r90 += ''.padEnd(51, '9');
    r90 += ''.padEnd(306, ' ');
    records.push(build(r90));

    return records.join('');
};

export const generateSPED = (...args: any[]): string => "SPED STUB";
export const generateEsocialBatch = (...args: any[]): any[] => [];
export const generateReinfBatch = (...args: any[]): any[] => [];
export const generateEFDContrib = (...args: any[]): string => "EFD CONTRIB STUB";
