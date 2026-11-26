import { CompanyEntity, Employee, PayrollRun } from '../types';

// Normalizes strings for SEFIP (ANSI/ASCII, no accents, no special chars)
const normalizeSefip = (str: string) => {
    if (!str) return '';
    return str.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9 ]/gi, '')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim();
};

const cleanDoc = (str: string) => str.replace(/\D/g, '');

// Alfanumérico: preenche à direita com espaços, trunca no tamanho
const fStr = (val: string | undefined, len: number) =>
    normalizeSefip(val || '').padEnd(len, ' ').substring(0, len);

// Nome do trabalhador: garante que começa com letra A-Z (requisito SEFIP)
const fNome = (val: string | undefined, len: number): string => {
    const normalized = normalizeSefip(val || '');
    // Remove caracteres não-letra do início até encontrar uma letra
    const fixed = normalized.replace(/^[^A-Z]+/, '');
    if (!fixed) return ''.padEnd(len, ' ');
    return fixed.padEnd(len, ' ').substring(0, len);
};

// Numérico: preenche à esquerda com zeros, trunca no tamanho
const fNum = (val: string | number | undefined, len: number) => {
    const clean = cleanDoc(String(val || ''));
    return clean.padStart(len, '0').slice(-len);
};

// Data no formato DDMMAAAA
const fDate = (date: string | undefined) => {
    if (!date) return '00000000';
    const parts = date.split('-');
    if (parts.length !== 3) return '00000000';
    const [y, m, d] = parts;
    if (!y || !m || !d || y === '0000') return '00000000';
    return `${d.padStart(2, '0')}${m.padStart(2, '0')}${y.padStart(4, '0')}`;
};

// Valor monetário em centavos, sem vírgula
const fVal = (val: number | undefined, len: number) => {
    const v = Math.round((val || 0) * 100);
    return v.toString().padStart(len, '0').slice(-len);
};

// Alíquota RAT: 2 dígitos (1% = "10", 2% = "20", 3% = "30")
const fRAT = (aliquota: string | number | undefined): string => {
    const pct = parseFloat(String(aliquota || '1'));
    const val = Math.round(pct * 10);
    return val.toString().padStart(2, '0').slice(-2);
};

class SEFIPRecord {
    private data: string[] = [];

    add(val: string) {
        this.data.push(val);
        return this;
    }

    build() {
        // Cada registro SEFIP tem 360 bytes (359 chars + '*')
        const content = this.data.join('');
        return content.padEnd(359, ' ').substring(0, 359) + '*';
    }
}

export interface SefipOptions {
    isZeroMovement?: boolean;
    isRectification?: boolean;
    isRescission?: boolean;
    modalidade?: string;
    codigoRecolhimento?: string;
    dataRecolhimentoFGTS?: string;
    dataRecolhimentoPrevidencia?: string;
}

export interface SefipValidationError {
    type: 'company' | 'employee' | 'general';
    id?: string;
    name?: string;
    field: string;
    message: string;
}

export const validateSEFIP84Data = (
    company: CompanyEntity,
    employees: Employee[],
    payrollRun: PayrollRun | null,
    options: SefipOptions = {}
): SefipValidationError[] => {
    const errors: SefipValidationError[] = [];

    if (!company.cnpj) errors.push({ type: 'company', field: 'CNPJ', message: 'CNPJ da empresa nao informado.' });
    if (!company.cnae) errors.push({ type: 'company', field: 'CNAE', message: 'CNAE Preponderante nao informado (Aba Fiscal).' });
    if (!company.fpas) errors.push({ type: 'company', field: 'FPAS', message: 'Codigo FPAS nao informado (Aba Fiscal).' });
    if (!company.address?.street) errors.push({ type: 'company', field: 'Endereco', message: 'Logradouro da empresa nao informado.' });
    if (!company.address?.zip) errors.push({ type: 'company', field: 'CEP', message: 'CEP da empresa nao informado.' });

    if (!options.isZeroMovement && !payrollRun) {
        errors.push({ type: 'general', field: 'Folha', message: 'Folha de pagamento nao selecionada.' });
        return errors;
    }

    if (!options.isZeroMovement && payrollRun?.details) {
        payrollRun.details.forEach(detail => {
            const person = employees.find(e => e.id === detail.employeeId);
            if (!person) return;
            const base = { type: 'employee' as const, id: person.id, name: person.name };
            if (!person.pis) errors.push({ ...base, field: 'PIS/NIT', message: 'PIS/NIT obrigatorio nao informado.' });
            if (!person.cpf) errors.push({ ...base, field: 'CPF', message: 'CPF nao informado.' });
            if (!(person as any).birthDate) errors.push({ ...base, field: 'Data de Nascimento', message: 'Data de nascimento nao informada.' });
            if (!(person as any).admissionDate && !(person as any).entryDate)
                errors.push({ ...base, field: 'Data de Admissao', message: 'Data de admissao/entrada nao informada.' });
        });
    }

    return errors;
};

export const generateSEFIP84 = (
    company: CompanyEntity,
    employees: Employee[],
    payrollRun: PayrollRun | null,
    responsible: { name: string; phone: string; contact: string },
    options: SefipOptions = {}
): string => {
    const records: string[] = [];
    const compParts = payrollRun
        ? payrollRun.competence.split('/')
        : new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }).split('/');
    const compAAAAMM = `${compParts[1]}${compParts[0]}`;
    const codRec = options.codigoRecolhimento || company.codigoRecolhimento || '115';
    const modalidade = options.modalidade || (options.isZeroMovement ? '1' : company.modalidade || ' ');

    // Indicador Simples: valores validos = '1','2','3','4','6'. '6' = Nao optante.
    // '0' e invalido. Default '6' para empresa nao Simples.
    const indicadorSimples = ['1', '2', '3', '4', '6'].includes(company.indicadorSimples || '')
        ? company.indicadorSimples!
        : '6';

    // ─── REGISTRO 00 (Header do Arquivo) ────────────────────────────────────
    const r00 = new SEFIPRecord();
    r00.add('00')                                                // 01-02 Tipo Registro
       .add(''.padEnd(51, ' '))                                  // 03-53 Brancos
       .add('1')                                                 // 54 Tipo Remessa (1=Normal)
       .add('1')                                                 // 55 Tipo Inscricao (1=CNPJ)
       .add(fNum(company.cnpj, 14))                              // 56-69 Inscricao
       .add(fStr(responsible.name || company.razaoSocial, 30))  // 70-99 Nome Responsavel
       .add(fStr(responsible.contact || 'ADMINISTRADOR', 20))   // 100-119 Contato
       .add(fStr(company.address?.street, 50))                  // 120-169 Endereco
       .add(fStr((company.address as any)?.neighborhood || (company.address as any)?.bairro, 20)) // 170-189 Bairro
       .add(fNum(company.address?.zip, 8))                      // 190-197 CEP
       .add(fStr(company.address?.city, 20))                    // 198-217 Cidade
       .add(fStr(company.address?.uf, 2))                       // 218-219 UF
       .add(fNum(responsible.phone || company.telefone, 12))    // 220-231 Telefone
       .add(''.padEnd(60, ' '))                                  // 232-291 Brancos
       .add(fNum(compAAAAMM, 6))                                 // 292-297 Competencia AAAAMM
       .add(fNum(codRec, 3))                                     // 298-300 Codigo Recolhimento
       .add(options.dataRecolhimentoFGTS ? '2' : '1')           // 301 Ind. Recolhimento FGTS
       .add(fStr(modalidade, 1))                                 // 302 Modalidade
       .add(options.dataRecolhimentoFGTS ? fDate(options.dataRecolhimentoFGTS) : '        ') // 303-310
       .add(options.dataRecolhimentoPrevidencia ? '2' : '1')    // 311 Ind. Recolhimento Prev.
       .add(options.dataRecolhimentoPrevidencia ? fDate(options.dataRecolhimentoPrevidencia) : '        ') // 312-319
       .add('0000000')                                           // 320-326 Indice Atraso FGTS
       .add(company.tipoInscricaoFornecedor || '1')             // 327 Tipo Insc. Fornecedor
       .add(fNum(company.inscricaoFornecedor || company.cnpj, 14)); // 328-341 Insc. Fornecedor
    records.push(r00.build());

    // ─── REGISTRO 10 (Informacoes da Empresa) ───────────────────────────────
    // Posicoes conforme Manual CAIXA SEFIP 8.4
    const r10 = new SEFIPRecord();
    r10.add('10')                                                // 01-02 Tipo Registro
       .add('1')                                                 // 03 Tipo Inscricao (1=CNPJ)
       .add(fNum(company.cnpj, 14))                             // 04-17 CNPJ
       .add('0'.repeat(8))                                      // 18-25 Inscricao CEI (zeros)
       .add('000')                                              // 26-28 Sequencial CNPJ (zeros)
       .add('0000')                                             // 29-32 Zeros
       .add('0'.repeat(14))                                     // 33-46 Insc. Tomador (zeros = sem tomador)
       .add('0000000')                                          // 47-53 Zeros
       .add(fStr(company.razaoSocial, 40))                      // 54-93 Razao Social
       .add(fStr(company.address?.street, 50))                  // 94-143 Logradouro
       .add(fStr((company.address as any)?.neighborhood || (company.address as any)?.bairro, 20)) // 144-163 Bairro
       .add(fNum(company.address?.zip, 8))                      // 164-171 CEP
       .add(fStr(company.address?.city, 20))                    // 172-191 Cidade
       .add(fStr(company.address?.uf, 2))                       // 192-193 UF
       .add(fNum(company.telefone, 12))                         // 194-205 Telefone
       .add(fStr((company as any).indicadorAlteracaoEndereco || 'N', 1)) // 206 Ind. Alt. Endereco (S/N)
       .add(fNum(company.cnae, 7))                              // 207-213 CNAE (7 digitos)
       .add(fStr((company as any).indicadorAlteracaoCnae || 'N', 1)) // 214 Ind. Alt. CNAE (S/N)
       .add(fRAT(company.aliquotaRAT))                          // 215-216 Aliquota RAT (2 dig: 10=1%)
       .add(indicadorSimples)                                    // 217 Ind. Simples (1-4 ou 6)
       .add(fNum(company.fpas || '515', 4))                     // 218-221 FPAS (4 digitos)
       .add(fNum(company.codigoTerceiros || '0000', 4))         // 222-225 Cod. Outras Entidades
       .add(company.centralizacao ? fStr(company.centralizacao, 1) : '0') // 226 Centralizacao
       .add('000000000000000')                                   // 227-241 Val. Remuneracao s/ 13 (zeros)
       .add('0')                                                 // 242 Sinal (0)
       .add('000000000000000')                                   // 243-257 Base Calculo 13 (zeros)
       .add('000000000000000')                                   // 258-272 Contrib. 13 (zeros)
       .add(''.padEnd(83, ' '));                                 // 273-355 Brancos
    records.push(r10.build());

    // ─── REGISTRO 30 (Dados do Trabalhador) ─────────────────────────────────
    if (!options.isZeroMovement && payrollRun?.details) {
        payrollRun.details.forEach(detail => {
            const person = employees.find(e => e.id === detail.employeeId);
            if (!person) return;

            const isCI = detail.personType === 'partner' ||
                ['11', '13', '15'].includes(person.categorySEFIP || '');
            const cat = person.categorySEFIP || (isCI ? '11' : '01');
            const admDate = (person as any).admissionDate || (person as any).entryDate || '';
            const birthDate = (person as any).birthDate || '';

            // Para CI (cat 11/13/15): nao informar matricula nem CBO
            const matricula = isCI ? '00000000000' : fNum(person.registration || '', 11);
            const cbo = isCI ? '00000' : fNum(person.cbo || '00000', 5);

            // Valores financeiros
            const baseFGTS = isCI ? 0 : (detail.baseFGTS || 0);
            const fgtsVal = isCI ? 0 : Math.round(baseFGTS * 0.08 * 100) / 100;
            const inssBase = detail.baseINSS || (detail as any).totalProventos || 0;
            const inssVal = detail.inssValue || 0;

            // Ocorrencia: '01' = Normal CLT, '05' = Sem Ocorrencia para CI
            const ocorrencia = isCI ? '05' : '01';

            const r30 = new SEFIPRecord();
            r30.add('30')                             // 01-02 Tipo Registro
               .add('1')                              // 03 Tipo Inscricao Empregador
               .add(fNum(company.cnpj, 14))           // 04-17 CNPJ
               .add(''.padEnd(15, ' '))               // 18-32 Tomador (brancos = sem tomador para cod 115)
               .add(fNum(person.pis, 11))             // 33-43 PIS/PASEP/NIT (11 digitos)
               .add(fDate(admDate))                   // 44-51 Data Admissao (DDMMAAAA)
               .add(fStr(cat, 2))                     // 52-53 Categoria
               .add(fNome(person.name, 40))            // 54-93 Nome (deve comecar com letra A-Z)
               .add(matricula)                        // 94-104 Matricula (zeros para CI)
               .add(fNum(person.cpf, 11))             // 105-115 CPF
               .add(fDate(birthDate))                 // 116-123 Data Nascimento (DDMMAAAA)
               .add(cbo)                              // 124-128 CBO (espacos para CI)
               .add(fVal(baseFGTS, 15))               // 129-143 Base Calculo FGTS
               .add(fVal(fgtsVal, 15))                // 144-158 Valor FGTS do Periodo
               .add(ocorrencia)                       // 159-160 Ocorrencia
               .add(fVal(inssVal, 15))                // 161-175 Valor INSS Descontado
               .add(fVal(inssBase, 15))               // 176-190 Remuneracao/Base INSS
               .add('000000000000000')                // 191-205 Base 13 (zeros)
               .add('000000000000000')                // 206-220 Valor GPS 13 (zeros)
               .add('0')                              // 221 Sinal (0)
               .add('000000000000000')                // 222-236 Base GPS 13 (zeros)
               .add('000000000000000')                // 237-251 Contrib. Empregado 13 (zeros)
               .add('000000000000000')                // 252-266 Remuneracao Base Contrib. (zeros)
               .add('000000000000000')                // 267-281 Zeros
               .add(''.padEnd(74, ' '));              // 282-355 Brancos
            records.push(r30.build());
        });
    }

    // ─── REGISTRO 90 (Trailer do Arquivo) ───────────────────────────────────
    // ATENCAO: campo destinado a BRANCOS - NAO preencher com '9'
    const r90 = new SEFIPRecord();
    r90.add('90')
       .add(''.padEnd(357, ' '));
    records.push(r90.build());

    return records.join('\r\n');
};
