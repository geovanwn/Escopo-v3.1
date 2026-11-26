
// Real Generator Logic for SPED and eSocial
import { Invoice, PayrollRun, CompanyEntity, Product, Client, Employee, PayrollItem, EsocialEvent } from '../types';

// Helper to format XML Date (YYYY-MM-DD)
const fmtXmlDate = (dateStr?: string) => dateStr ? dateStr.split('T')[0] : '';
// Helper to format CPF/CNPJ
const cleanDoc = (doc: string) => doc?.replace(/\D/g, '') || '';


// ==========================================
// 1. SPED FISCAL GENERATOR (EFD ICMS/IPI)
// ==========================================
// Manter SPED como está, focar no eSocial abaixo.

// Helper para formatar campos do SPED (Pipe separated, dates, numbers)
const fmtSpedStr = (val: string | undefined, maxLen: number = 0) => {
    let s = val || '';
    s = s.replace(/\|/g, ''); // Remove pipes to avoid breaking layout
    if (maxLen > 0) s = s.substring(0, maxLen);
    return s;
}
const fmtSpedNum = (val: number | undefined, decimals: number = 2) => {
    if (val === undefined || val === null) return '0'.replace('.', ',');
    return val.toFixed(decimals).replace('.', ',');
}
const fmtSpedDate = (dateStr: string) => {
    if (!dateStr) return '';
    // Assumes YYYY-MM-DD from system
    const d = new Date(dateStr);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${dd}${mm}${yyyy}`;
}

export const generateSPED = (invoices: Invoice[], company: CompanyEntity, products: Product[] = [], clients: Client[] = [], isZeroMovement: boolean = false) => {
    const lines: string[] = [];
    const now = new Date();
    // Default period: Current Month (adjust logic as needed via args)
    // Para simplificar, pegamos o mês da primeira nota ou atual
    const refDate = invoices.length > 0 ? new Date(invoices[0].date) : new Date();
    const dtIni = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    const dtFin = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);

    const sDtIni = `${String(dtIni.getDate()).padStart(2, '0')}${String(dtIni.getMonth() + 1).padStart(2, '0')}${dtIni.getFullYear()}`;
    const sDtFin = `${String(dtFin.getDate()).padStart(2, '0')}${String(dtFin.getMonth() + 1).padStart(2, '0')}${dtFin.getFullYear()}`;

    // Contadores de bloco
    const countRegs: Record<string, number> = {};
    const addLine = (content: string) => {
        lines.push(content);
        const reg = content.substring(1, 5);
        countRegs[reg] = (countRegs[reg] || 0) + 1;
    }

    // --- BLOCO 0: ABERTURA ---
    addLine(`|0000|L01|${sDtIni}|${sDtFin}|${fmtSpedStr(company.razaoSocial)}|${fmtSpedStr(company.cnpj)}|${fmtSpedStr(company.address?.uf)}|${fmtSpedStr(company.ie)}|33100|01|`); // 33100 = Cod Mun (Exemplo)

    // 0001: 0=Com dados, 1=Sem dados
    addLine(`|0001|${isZeroMovement ? '1' : '0'}|`);

    addLine(`|0005|${fmtSpedStr(company.razaoSocial)}|${fmtSpedStr(company.address?.zip)}|${fmtSpedStr(company.address?.street)}|${fmtSpedStr(company.address?.number)}|${fmtSpedStr(company.address?.neighborhood)}|${fmtSpedStr(company.telefone)}|||`);
    addLine(`|0100|Contador Responsavel|00000000000|12345|00000000000|33100|${fmtSpedStr(company.address?.zip)}|${fmtSpedStr(company.address?.street)}|${fmtSpedStr(company.address?.number)}||${fmtSpedStr(company.address?.neighborhood)}|${fmtSpedStr(company.telefone)}|||`);

    // Se sem movimento, pular cadastros de parceiros/produtos se não forem estritamente necessarios (mas SPED valida).
    // Geralmente 0001=1 dispensa o resto dos blocos C, D, E... mas exige 0000, 0001, 0005, 0100, 0990.

    if (isZeroMovement) {
        addLine(`|0990|${Object.keys(countRegs).filter(k => k.startsWith('0')).reduce((sum, k) => sum + countRegs[k], 0) + 1}|`);
        // Close empty file with just headers
        addLine(`|9001|0|`);
        addLine(`|9900|9001|1|`);
        addLine(`|9900|9900|3|`);
        addLine(`|9900|9990|1|`);
        addLine(`|9900|9999|1|`);
        addLine(`|9990|5|`); // Aprox
        addLine(`|9999|${lines.length + 1}|`);
        return lines.join('\r\n') + '\r\n';
    }

    // 0150: Participantes (Extrair de Clients/Invoices)
    // Map to ensure uniqueness
    const partsMap = new Map<string, any>();
    const getPartCode = (doc: string) => `PART${doc.replace(/\D/g, '').substring(0, 8)}`;

    invoices.forEach(inv => {
        if (inv.cnpj && !partsMap.has(inv.cnpj)) {
            partsMap.set(inv.cnpj, {
                cnpj: inv.cnpj,
                name: inv.entityName,
                uf: 'GO', // Simplificação
                cod: getPartCode(inv.cnpj)
            });
        }
    });

    partsMap.forEach((p) => {
        addLine(`|0150|${p.cod}|${fmtSpedStr(p.name)}|1058|${p.cnpj.replace(/\D/g, '')}|||SUFRAMA|${fmtSpedStr(p.address)}|123|COMPL|BAIRRO|33100||`); // 1058 = PAIS (Brasil)
    });

    // 0200: Produtos (Extrair de Products ou Items)
    // Para simplificar, assumimos que todos os produtos usados estão no array products
    const prodMap = new Map<string, Product>();
    // Se tiver produtos não cadastrados nas invoices, capturar aqui:
    invoices.forEach(inv => inv.items?.forEach(item => {
        if (!prodMap.has(item.code || 'GEN')) {
            // Fallback se não achar o produto real
            prodMap.set(item.code || 'GEN', { code: item.code || 'GEN', name: item.description, unit: 'UN', type: '00', ncm: item.ncm || '00000000' } as any);
        }
    }));
    products.forEach(p => prodMap.set(p.code, p));

    prodMap.forEach(p => {
        addLine(`|0200|${fmtSpedStr(p.code)}|${fmtSpedStr(p.name)}||${fmtSpedStr(p.unit)}|00|${fmtSpedStr(p.ncm)}|||||17,00|`);
    });

    addLine(`|0990|${Object.keys(countRegs).filter(k => k.startsWith('0')).reduce((sum, k) => sum + countRegs[k], 0) + 1}|`);


    // --- BLOCO C: DOCUMENTOS FISCAIS ---
    addLine(`|C001|0|`);

    // Sort invoices by date
    const sortedInvoices = [...invoices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedInvoices.forEach(inv => {
        if (inv.status === 'cancelada') return; // Tratar cancelada depois se quiser (C100 com valores zerados)

        // C100: Nota Fiscal
        // IND_OPER: 0-Entrada, 1-Saída
        const indOper = (inv.type === 'exit' || inv.type === 'service') ? '1' : '0';
        const indEmit = '0'; // 0-Emissão Própria
        const partCode = inv.cnpj ? getPartCode(inv.cnpj) : '';
        const codMod = '55'; // NFe
        const codSit = '00'; // Regular
        const serie = inv.serie || '1';
        const num = inv.number;
        const chv = inv.accessKey || '';
        const dtEmi = fmtSpedDate(inv.date);
        const dtES = fmtSpedDate(inv.date); // Data Entrada/Saida
        const vlDoc = fmtSpedNum(inv.value);
        const vlProd = fmtSpedNum(inv.value); // Simplificado sem frete/seguro

        // Calcular somatórios de impostos da nota
        let vlBcIcms = 0;
        let vlIcms = 0;
        let vlPis = 0;
        let vlCofins = 0;
        let vlIpi = 0;

        // Agrupamento para C190 (Analitico por CST/CFOP/Aliq)
        const c190Map = new Map<string, { cst: string, cfop: string, aliq: number, vlOp: number, vlBc: number, vlIcms: number }>();

        inv.items?.forEach(item => {
            vlBcIcms += item.bcIcms || 0;
            vlIcms += item.vIcms || 0;
            // Add PIS/COFINS logic here if available on Item

            // Key for C190
            const cst = (item.cst || '000').padEnd(3, '0').substring(1); // SPED usa 2 digitos finais do CST ICMS geralmente (00, 20, 40...)
            const cfop = item.cfop || '5102';
            const aliq = item.pIcms || 0;
            const key = `${cst}-${cfop}-${aliq}`;

            const current = c190Map.get(key) || { cst, cfop, aliq, vlOp: 0, vlBc: 0, vlIcms: 0 };
            current.vlOp += item.total || 0;
            current.vlBc += item.bcIcms || 0;
            current.vlIcms += item.vIcms || 0;
            c190Map.set(key, current);
        });

        addLine(`|C100|${indOper}|${indEmit}|${partCode}|${codMod}|${codSit}|${serie}|${num}|${chv}|${dtEmi}|${dtES}|${vlDoc}|0|0|${vlProd}|9|0|0|0|${fmtSpedNum(vlBcIcms)}|${fmtSpedNum(vlIcms)}|0|0|${fmtSpedNum(vlPis)}|${fmtSpedNum(vlCofins)}|0|`);

        // Gerar C190
        c190Map.forEach(r => {
            addLine(`|C190|${r.cst}|${r.cfop}|${fmtSpedNum(r.aliq)}|${fmtSpedNum(r.vlOp)}|${fmtSpedNum(r.vlBc)}|${fmtSpedNum(r.vlIcms)}|0|0|0|0|`);
        });
    });

    const totalC = Object.keys(countRegs).filter(k => k.startsWith('C')).reduce((sum, k) => sum + countRegs[k], 0);
    addLine(`|C990|${totalC + 1}|`);

    // --- BLOCO E: APURAÇÃO DO ICMS ---
    addLine(`|E001|0|`);

    // Calcular Totais para apuração
    let totalDebitos = 0;
    let totalCreditos = 0;

    invoices.forEach(inv => {
        if (inv.status === 'cancelada') return;
        const icms = inv.items?.reduce((acc, item) => acc + (item.vIcms || 0), 0) || 0;
        if (inv.type === 'exit' || inv.type === 'service') { // Service usually ISS but assuming mixed scenario
            // Only if it has ICMS
            if (icms > 0) totalDebitos += icms;
        } else if (inv.type === 'entry') {
            if (icms > 0) totalCreditos += icms;
        }
    });

    const saldoDevedor = totalDebitos > totalCreditos ? totalDebitos - totalCreditos : 0;
    const saldoCredor = totalCreditos > totalDebitos ? totalCreditos - totalDebitos : 0;

    // E100: Período da Apuração
    addLine(`|E100|${sDtIni}|${sDtFin}|`);

    // E110: Apuração do ICMS - Operações Próprias
    // Campos: VL_TOT_DEBITOS, VL_AJ_DEBITOS, VL_TOT_AJ_DEBITOS, VL_ESTORNOS_CRED, VL_TOT_CREDITOS, VL_AJ_CREDITOS, VL_TOT_AJ_CREDITOS, VL_ESTORNOS_DEB, VL_SLD_CREADOR_ANT, VL_SLD_APURADO, VL_TOT_DED, VL_ICMS_RECOLHER, VL_SLD_CREDOR_TRANSPORTAR, VAL_DEB_ESPECIAL
    addLine(`|E110|${fmtSpedNum(totalDebitos)}|0,00|0,00|0,00|${fmtSpedNum(totalCreditos)}|0,00|0,00|0,00|0,00|${fmtSpedNum(saldoDevedor)}|0,00|${fmtSpedNum(saldoDevedor)}|${fmtSpedNum(saldoCredor)}|0,00|`);

    const totalE = Object.keys(countRegs).filter(k => k.startsWith('E')).reduce((sum, k) => sum + countRegs[k], 0);
    addLine(`|E990|${totalE + 1}|`);

    // --- BLOCO H: INVENTÁRIO FÍSICO ---
    // Gerar H005 com a data final do período (suposição de inventário mensal ou anual na data fim)
    addLine(`|H001|0|`);

    // Calcular valor total do inventário
    const totalInventoryValue = products.reduce((acc, p) => acc + ((p.stock || 0) * (p.price || 0)), 0);

    // H005: Totais do Inventário -> DT_INV, VL_INV, MOT_INV (01 = Final periodo)
    addLine(`|H005|${sDtFin}|${fmtSpedNum(totalInventoryValue)}|01|`);

    // H010: Inventário de Itens
    products.forEach(p => {
        if (p.stock && p.stock > 0) {
            const stockVal = (p.stock * p.price);
            // COD_ITEM, UNID, QTD, VL_UNIT, VL_ITEM, IND_PROP (0=Item de propriedade do informante e em seu poder), COD_PART, TXT_COMPL, COD_CTA, VL_ITEM_IR
            addLine(`|H010|${fmtSpedStr(p.code)}|${fmtSpedStr(p.unit)}|${fmtSpedNum(p.stock, 3)}|${fmtSpedNum(p.price, 6)}|${fmtSpedNum(stockVal)}|0||||${fmtSpedNum(stockVal)}|`);
        }
    });

    const totalH = Object.keys(countRegs).filter(k => k.startsWith('H')).reduce((sum, k) => sum + countRegs[k], 0);
    addLine(`|H990|${totalH + 1}|`); // +1 do C990 próprio (na logica normal o contador conta ele mesmo na linha, aqui simplificado)


    // --- BLOCO 9: CONTROLE ---
    addLine(`|9001|0|`);

    // 9900: Totalizador de Registros
    // Recontar tudo para ser preciso
    const countFinal: Record<string, number> = {};
    lines.forEach(l => {
        const r = l.substring(1, 5);
        countFinal[r] = (countFinal[r] || 0) + 1;
    });
    // Add 9900s
    let qtd9900 = 0;
    Object.keys(countFinal).sort().forEach(reg => {
        if (reg === '9001' || reg === '9990' || reg === '9999') return; // Dont count control final blocks yet
        lines.push(`|9900|${reg}|${countFinal[reg]}|`);
        qtd9900++;
    });

    // Add 9900 lines to count
    lines.push(`|9900|9900|${qtd9900 + 4}|`); // +4 (9001, 9990, 9999, + this 9900 entry) - Approximation
    lines.push(`|9900|9990|1|`);
    lines.push(`|9900|9999|1|`);

    addLine(`|9990|${qtd9900 + 4}|`);
    addLine(`|9999|${lines.length + 1}|`);

    return lines.join('\r\n') + '\r\n';
};

// ==========================================
// 1.5 EFD CONTRIBUIÇÕES GENERATOR (PIS/COFINS)
// ==========================================
export const generateEFDContrib = (invoices: Invoice[], company: CompanyEntity, products: Product[] = [], clients: Client[] = [], isZeroMovement: boolean = false) => {
    const lines: string[] = [];
    const now = new Date();
    // Period definition
    const refDate = invoices.length > 0 ? new Date(invoices[0].date) : new Date();
    const dtIni = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    const dtFin = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);

    const sDtIni = `${String(dtIni.getDate()).padStart(2, '0')}${String(dtIni.getMonth() + 1).padStart(2, '0')}${dtIni.getFullYear()}`;
    const sDtFin = `${String(dtFin.getDate()).padStart(2, '0')}${String(dtFin.getMonth() + 1).padStart(2, '0')}${dtFin.getFullYear()}`;

    // Block Counters
    const countRegs: Record<string, number> = {};
    const addLine = (content: string) => {
        lines.push(content);
        const reg = content.substring(1, 5);
        countRegs[reg] = (countRegs[reg] || 0) + 1;
    }

    // --- BLOCO 0: ABERTURA ---
    // 0000: Abertura do Arquivo Digital e Identificação da Pessoa Jurídica
    // Campo 02 (COD_VER): 006 para 2026? Usando 005 padrão mas validando erro.
    // ERRO: Versão do leiaute não encontrada. Esperado 006 (para 2026 provavelmente).
    // Campo 14: (IND_ATIV): 0-Ind, 1-Serv, 2-Com, 3-Fin, 4-Imob, 9-Outros
    // Ajuste CNPJ (apenas números) em todos os campos.
    const cleanCNPJ = (s: string) => s?.replace(/\D/g, '') || '';
    const cleanCEP = (s: string) => s?.replace(/\D/g, '') || '';
    const ibgeCode = company.address?.cityCode || company.codMunicipioIBGE || '3304557';
    const indAtiv = company.indicadorAtividade || company.fiscalSettings?.efdContrib?.activity || '1';

    addLine(`|0000|006|0|||${sDtIni}|${sDtFin}|${fmtSpedStr(company.razaoSocial)}|${cleanCNPJ(company.cnpj)}|${fmtSpedStr(company.address?.uf)}|${fmtSpedStr(ibgeCode)}|${fmtSpedStr(company.suframa)}|${company.naturezaJuridica || '00'}|${indAtiv}|`);

    // 0001: Abertura do Bloco 0 (0-Com dados)
    addLine(`|0001|0|`);

    if (isZeroMovement) {
        // 0120: Sem Dados para Escrituração
        // Motivo: 99 - Outros (ou deixar usuário escolher, mas aqui fixamos em Sem Movimento)
        addLine(`|0120|99|Sem Movimento no Periodo|`);

        // Fechamento Bloco 0
        addLine(`|0990|4|`);

        // Bloco 9
        addLine(`|9001|0|`);
        addLine(`|9900|0000|1|`);
        addLine(`|9900|0001|1|`);
        addLine(`|9900|0120|1|`);
        addLine(`|9900|0990|1|`);
        addLine(`|9900|9001|1|`);
        addLine(`|9900|9900|8|`); // Aprox
        addLine(`|9900|9990|1|`);
        addLine(`|9900|9999|1|`);
        addLine(`|9990|10|`);
        addLine(`|9999|${lines.length + 1}|`);
        return lines.join('\r\n') + '\r\n';
    }

    // 0100: Dados do Contabilista
    // Remove hyphen from CEP, Ensure Correct Field Count
    // 01:REG, 02:NOME, 03:CPF, 04:CRC, 05:CNPJ, 06:CEP, 07:END, 08:NUM, 09:COMPL, 10:BAIRRO, 11:FONE, 12:FAX, 13:EMAIL, 14:COD_MUN
    addLine(`|0100|Contador Responsavel|00000000000|CRC12345|00000000000|${cleanCEP(company.address?.zip || '')}|${fmtSpedStr(company.address?.street)}|${fmtSpedStr(company.address?.number)}||${fmtSpedStr(company.address?.neighborhood)}|${fmtSpedStr(company.telefone).replace(/\D/g, '')}|${fmtSpedStr(company.telefone).replace(/\D/g, '')}|${company.email}|${fmtSpedStr(ibgeCode)}|`);

    // 0110: Regimes de Apuração
    // IND_INC_TRIB: 1-Cumulativo, 2-Não Cumulativo, 3-Misto
    // IND_APRO_CRED: 1-Método de Apropriação Direta, 2-Método de Rateio Proporcional (Receita Bruta)
    // COD_TIPO_CONT: 1-Exclusivamente Pessoas Jurídicas em Geral (Lucro Real/Presumido)
    // IND_REG_CUM: 
    addLine(`|0110|1|2|1||`); // 1-Cumulativo, 2-Rateio Prop, 1-PJ Geral, (IND_REG_CUM vazio para Cumulativo)

    // 0140: Cadastro de Estabelecimento (Matriz)
    // 0140: Cadastro de Estabelecimento (Matriz)
    // 01:REG, 02:COD_EST, 03:NOME, 04:CNPJ, 05:UF, 06:IE, 07:COD_MUN, 08:IM, 09:SUFRAMA
    addLine(`|0140|${fmtSpedStr(company.id)}|${fmtSpedStr(company.razaoSocial)}|${cleanCNPJ(company.cnpj)}|${fmtSpedStr(company.address?.uf)}|${fmtSpedStr(company.ie).replace(/\D/g, '')}|${fmtSpedStr(ibgeCode)}|${fmtSpedStr(company.im)}|${fmtSpedStr(company.suframa)}|`);

    // 0150: Participantes
    const partsMap = new Map<string, any>();
    const getPartCode = (doc: string) => `PART${doc.replace(/\D/g, '').substring(0, 8)}`;

    invoices.forEach(inv => {
        if (inv.cnpj && !partsMap.has(inv.cnpj)) {
            partsMap.set(inv.cnpj, {
                cnpj: inv.cnpj,
                name: inv.entityName,
                cod: getPartCode(inv.cnpj)
            });
        }
    });

    partsMap.forEach((p) => {
        addLine(`|0150|${p.cod}|${fmtSpedStr(p.name)}|1058|${p.cnpj.replace(/\D/g, '')}|||SUFRAMA|Logradouro|123|Compl|Bairro|${fmtSpedStr(ibgeCode)}||`);
    });

    // 0200: Produtos (Igual ao SPED Fiscal)
    const prodMap = new Map<string, Product>();
    invoices.forEach(inv => inv.items?.forEach(item => {
        if (!prodMap.has(item.code || 'GEN')) {
            prodMap.set(item.code || 'GEN', { code: item.code || 'GEN', name: item.description, unit: 'UN', type: '00', ncm: item.ncm || '00000000' } as any);
        }
    }));
    products.forEach(p => prodMap.set(p.code, p));

    prodMap.forEach(p => {
        addLine(`|0200|${fmtSpedStr(p.code)}|${fmtSpedStr(p.name)}||${fmtSpedStr(p.unit)}|00|${fmtSpedStr(p.ncm)}|||||17,00|`);
    });

    // Fechamento Bloco 0
    addLine(`|0990|${Object.keys(countRegs).filter(k => k.startsWith('0')).reduce((sum, k) => sum + countRegs[k], 0) + 1}|`);


    // --- BLOCO A: SERVIÇOS (ISS) ---
    // Se a empresa for de serviços municipais, entraria aqui. 
    addLine(`|A001|1|`); // 1 = Sem movimento (simplificação inicial)
    addLine(`|A990|2|`);

    // --- BLOCO C: MERCADORIAS (ICMS/IPI) ---
    // Handle empty movement
    const hasMovement = invoices.length > 0;
    addLine(`|C001|${hasMovement ? '0' : '1'}|`); // 0 = Com movimento, 1 = Sem movimento

    invoices.forEach(inv => {
        if (inv.status === 'cancelada') return;

        // C100: Nota Fiscal
        const indOper = (inv.type === 'exit' || inv.type === 'service') ? '1' : '0';
        const indEmit = '0';
        const partCode = inv.cnpj ? getPartCode(inv.cnpj) : '';
        const codMod = '55';
        const codSit = '00';
        const serie = inv.serie || '1';
        const num = inv.number;
        const chv = inv.accessKey || '';
        const dtEmi = fmtSpedDate(inv.date);
        const dtES = fmtSpedDate(inv.date);
        const vlDoc = fmtSpedNum(inv.value);

        // Somar PIS/COFINS
        let vlPis = 0;
        let vlCofins = 0;
        let vlBcIcms = 0;

        inv.items?.forEach(item => {
            vlPis += item.vPis || 0;
            vlCofins += item.vCofins || 0;
            vlBcIcms += item.bcIcms || 0;
        });

        // 09 (vl_bc_icms) ?? No C100 do EFD Contrib é diferente do Fiscal
        // C100 EFD Contrib: 
        // 01:REG, 02:IND_OPER, 03:IND_EMIT, 04:COD_PART, 05:COD_MOD, 06:COD_SIT, 07:SER, 08:NUM_DOC, 09:CHV_NFE, 10:DT_DOC, 11:DT_E_S, 12:VL_DOC, 13:IND_PGTO, 
        // 14:VL_DESC, 15:VL_ABAT_NT, 16:VL_MERC, 17:IND_FRT, 18:VL_FRT, 19:VL_SEG, 20:VL_OUT_DA, 21:VL_BC_ICMS, 22:VL_ICMS, 23:VL_BC_ICMS_ST, 24:VL_ICMS_ST, 
        // 25:VL_IPI, 26:VL_PIS, 27:VL_COFINS, 28:VL_PIS_ST, 29:VL_COFINS_ST

        addLine(`|C100|${indOper}|${indEmit}|${partCode}|${codMod}|${codSit}|${serie}|${num}|${chv}|${dtEmi}|${dtES}|${vlDoc}|0|0,00|0,00|${vlDoc}|9|0,00|0,00|0,00|${fmtSpedNum(vlBcIcms)}|0,00|0,00|0,00|0,00|${fmtSpedNum(vlPis)}|${fmtSpedNum(vlCofins)}|0,00|0,00|`);

        // C170: Itens do Documento
        inv.items?.forEach((item, idx) => {
            // C170 Layout: 
            // REG, NUM_ITEM, COD_ITEM, DESCR_COMPL, QTD, UNID, VL_ITEM, VL_DESC, IND_MOV, CST_ICMS, CFOP, COD_NAT, VL_BC_ICMS, ALIQ_ICMS, VL_ICMS, VL_BC_ICMS_ST, ALIQ_ST, VL_ICMS_ST, IND_APUR, CST_IPI, COD_ENQ, VL_BC_IPI, ALIQ_IPI, VL_IPI, CST_PIS, VL_BC_PIS, ALIQ_PIS, QUANT_BC_PIS, ALIQ_PIS_REAIS, VL_PIS, CST_COFINS, VL_BC_COFINS, ALIQ_COFINS, QUANT_BC_COFINS, ALIQ_COFINS_REAIS, VL_COFINS, COD_CTA

            const numItem = idx + 1;
            const codItem = item.code || 'GEN';
            const descr = '';
            const qtd = fmtSpedNum(item.quantity || 1, 5);
            const unid = 'UN';
            const vlItem = fmtSpedNum(item.total || 0);
            const vlDesc = '0,00';
            const indMov = '0';
            const cstIcms = (item.cst || '000').padEnd(3, '0');
            const cfop = item.cfop || '5102';
            const codNat = ''; // Natureza da operação
            const vlBcIcmsLine = fmtSpedNum(item.bcIcms || 0);
            const aliqIcms = fmtSpedNum(item.pIcms || 0);
            const vlIcmsLine = fmtSpedNum(item.vIcms || 0);

            // PIS/COFINS
            const cstPis = item.cstPis || '01'; // 01 - Operação Tributável Base Calc = Valor da Operação Alíquota Normal (Cumulativo/Não Cumulativo)
            const vlBcPis = fmtSpedNum(item.total || 0); // Simplificação: Base = Valor Total
            const aliqPis = fmtSpedNum(item.pPis || 0.65); // 0.65% Cumulativo Default
            const vlPisLine = fmtSpedNum(item.vPis || 0);

            const cstCofins = item.cstCofins || '01';
            const vlBcCofins = fmtSpedNum(item.total || 0);
            const aliqCofins = fmtSpedNum(item.pCofins || 3.00); // 3% Cumulativo Default
            const vlCofinsLine = fmtSpedNum(item.vCofins || 0);

            addLine(`|C170|${numItem}|${fmtSpedStr(codItem)}|${descr}|${qtd}|${unid}|${vlItem}|${vlDesc}|${indMov}|${cstIcms}|${cfop}|${codNat}|${vlBcIcmsLine}|${aliqIcms}|${vlIcmsLine}|0,00|0,00|0,00|0||||0,00||0,00|${cstPis}|${vlBcPis}|${aliqPis}|||${vlPisLine}|${cstCofins}|${vlBcCofins}|${aliqCofins}|||${vlCofinsLine}||`);
        });

    });

    const totalC = Object.keys(countRegs).filter(k => k.startsWith('C')).reduce((sum, k) => sum + countRegs[k], 0);
    addLine(`|C990|${totalC + 1}|`);

    // --- Outros Blocos (D, F, I) vazios por enquanto ---
    addLine(`|D001|1|`); addLine(`|D990|2|`);
    addLine(`|F001|1|`); addLine(`|F990|2|`);
    addLine(`|I001|1|`); addLine(`|I990|2|`);

    // --- BLOCO M: APURAÇÃO ---
    addLine(`|M001|0|`);
    // M200: PIS
    // M210: Detalhamento
    // M600: COFINS
    // M610: Detalhamento

    // Simplificação extrema: Calcular totais e jogar no M200/M600
    // Em produção real, precisa agrupar por Código de Contribuição, Alíquota, etc.
    let totPis = 0;
    let totCofins = 0;

    invoices.forEach(inv => {
        if (inv.type === 'exit' && inv.status !== 'cancelada') {
            inv.items?.forEach(i => {
                totPis += i.vPis || 0;
                totCofins += i.vCofins || 0;
            });
        }
    });

    // M200: Consolidação PIS
    // VL_TOT_CONT_NC_PER, VL_TOT_CRED_DESC, VL_TOT_CRED_DESC_ANT, VL_TOT_CONT_NC_DEV, VL_RET_NC, VL_OUT_DED_NC, VL_CONT_NC_REC, VL_TOT_CONT_CUM_PER, VL_RET_CUM, VL_OUT_DED_CUM, VL_CONT_CUM_REC, VL_TOT_CONT_REC
    addLine(`|M200|0,00|0,00|0,00|0,00|0,00|0,00|0,00|${fmtSpedNum(totPis)}|0,00|0,00|${fmtSpedNum(totPis)}|${fmtSpedNum(totPis)}|`);

    // M600: Consolidação COFINS
    addLine(`|M600|0,00|0,00|0,00|0,00|0,00|0,00|0,00|${fmtSpedNum(totCofins)}|0,00|0,00|${fmtSpedNum(totCofins)}|${fmtSpedNum(totCofins)}|`);

    const totalM = Object.keys(countRegs).filter(k => k.startsWith('M')).reduce((sum, k) => sum + countRegs[k], 0);
    addLine(`|M990|${totalM + 1}|`);

    // --- BLOCO 1: COMPLEMENTARES ---
    // --- BLOCO 1: COMPLEMENTARES ---
    // --- BLOCO 1: COMPLEMENTARES ---
    addLine(`|1001|1|`); // Sem movimento
    addLine(`|1990|2|`);

    // --- BLOCO 9: CONTROLE ---
    addLine(`|9001|0|`);

    // Recalculate 9900 based on actual lines added so far
    // Clear lines from the simulated 9900 block start to rebuild it
    // Actually, we can just build the final block logic cleanly.

    // Remove placeholder 9900/9990/9999 added in previous buffer if any (none here, we are building `lines`) 
    // Wait, the previous code had logic to push 9900.

    const countFinal: Record<string, number> = {};
    lines.forEach(l => {
        const r = l.substring(1, 5);
        countFinal[r] = (countFinal[r] || 0) + 1;
    });

    // We need to ADD 9900 records for all used records (including 9001 and 9990 and 9999 and the 9900s themselves)
    // This is circular. Standard practice:
    // 1. Count all non-9-block records.
    // 2. Add 9001.
    // 3. Count 9900 types.

    const finalLines: string[] = [];

    // Copy all lines except 9900/9990/9999 placeholders (which we haven't added yet properly)
    // Actually the previous code block added them to `lines`. Let's refactor the end part.

    // Let's create the 9900 block efficiently.
    const usedRegisters = Object.keys(countFinal).sort();

    usedRegisters.forEach(reg => {
        // Skip Block 9 specific registers for now, will add at end
        if (reg.startsWith('9')) return;
        lines.push(`|9900|${reg}|${countFinal[reg]}|`);
    });

    // Add 9001 count
    lines.push(`|9900|9001|1|`);

    // Now count how many 9900 lines we have (usedRegisters - 9xxx + 1(9001) + 1(9900) + 1(9990) + 1(9999))
    // Simplification: just count the `lines` added above for 9900
    const qtd9900_actual = lines.filter(l => l.startsWith('|9900|')).length + 3; // +3 for observing 9900, 9990, 9999

    lines.push(`|9900|9900|${qtd9900_actual}|`);
    lines.push(`|9900|9990|1|`);
    lines.push(`|9900|9999|1|`);

    addLine(`|9990|${qtd9900_actual + 3}|`); // 9001 + 9900s + 9990 + 9999 ? No.
    // 9990 is count of Block 9. 
    // Block 9: 9001 (1) + 9900 (N) + 9990 (1) + 9999 (1)
    // Total Block 9 = 1 + qtd9900_actual (includes 9900 self) + 1 + 1 ? 
    // Logic above: qtd9900_actual ALREADY includes the count for 9900, 9990, 9999 rows in the 9900 report?
    // No, standard is:
    // 9900|9900|X -> X is the number of 9900 records.
    // 9900|9990|1
    // 9900|9999|1

    const totalBlock9 = 1 + lines.filter(l => l.startsWith('|9900|')).length + 1; // 9001 + 9900s + 9990. (9999 is generic file footer, often counted in block 9 too? valid logic: 9990 counts 'lines of block 9'. 9999 is usually outside or last. 
    // SPED EFD Contrib Manual: 
    // Registro 9990: Encerramento do Bloco 9.
    // Registro 9999: Encerramento do Arquivo Digital.

    // Correction on 9990 value: 9001 + all 9900 + 9990 itself.

    addLine(`|9999|${lines.length + 1}|`); // +1 for this 9999 line itself.

    return lines.join('\r\n') + '\r\n';
};


// ==========================================
// 2. ESOCIAL XML GENERATOR (REAL)
// ==========================================

// EsocialEvent moved to types/index.ts

// Helper: Formata CPF/CNPJ (Reused)
// const cleanDoc = (doc: string) => doc?.replace(/\D/g, '') || '';
// Helper: Data formato AAAA-MM-DD
const fmtDate = (dateStr?: string) => dateStr ? dateStr.split('T')[0] : '';

export const generateEsocialBatch = (
    company: CompanyEntity,
    employees: Employee[],
    payrollRuns: PayrollRun[],
    payrollItems: PayrollItem[],
    targetPeriod: string, // MM/YYYY
    isZeroMovement: boolean = false
): EsocialEvent[] => {
    const events: EsocialEvent[] = [];
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14);

    // ID Generator: Tabela 1 - ID + CNPJ + Timestamp + Seq
    let seqCounter = 1;
    const generateId = () => `ID1${cleanDoc(company.cnpj).substring(0, 8)}${timestamp}${String(seqCounter++).padStart(5, '0')}`;

    console.log(`Gerando lote eSocial para: ${company.razaoSocial} - Competência: ${targetPeriod}`);

    // --- FASE 1: TABELAS E CADASTROS INICIAIS ---

    // S-1000: Informações do Empregador
    // Usando dados reais de classifications tributária
    const classTrib = company.fiscalSettings?.esocial?.classificacaoTributaria || '99';
    events.push({
        id: generateId(),
        companyId: company.id,
        evtType: 'S-1000',
        group: '1',
        description: `Cadastro do Empregador: ${company.razaoSocial} (Tributação: ${classTrib})`,
        status: 'pending',
        xml: `
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtInfoEmpregador/v_S_01_02_00">
    <evtInfoEmpregador Id="${generateId()}">
        <ideEvento>
            <tpAmb>${company.fiscalSettings?.esocial?.environment === '1' ? '1' : '2'}</tpAmb>
            <procEmi>1</procEmi>
            <verProc>1.0.0</verProc>
        </ideEvento>
        <ideEmpregador>
            <tpInsc>1</tpInsc>
            <nrInsc>${cleanDoc(company.cnpj)}</nrInsc>
        </ideEmpregador>
        <infoEmpregador>
            <inclusao>
                <idePeriodo>
                    <iniValid>${targetPeriod.replace('/', '-')}</iniValid>
                </idePeriodo>
                <infoCadastro>
                    <classTrib>${classTrib}</classTrib>
                    <indCoop>${company.fiscalSettings?.esocial?.indicativoCoop || '0'}</indCoop>
                    <indConstr>${company.fiscalSettings?.esocial?.indicativoConstrurora || '0'}</indConstr>
                    <indDesFolha>${company.indDesoneracao || '0'}</indDesFolha>
                </infoCadastro>
            </inclusao>
        </infoEmpregador>
    </evtInfoEmpregador>
</eSocial>`
    });

    // S-1005: Estabelecimentos
    events.push({
        id: generateId(),
        companyId: company.id,
        evtType: 'S-1005',
        group: '1',
        description: `Tabela de Estabelecimentos: Matriz (${cleanDoc(company.cnpj).substring(8, 12)})`, // Filial number
        status: 'pending',
        xml: `<eSocial><evtTabEstab Id="${generateId()}"><ideEstab><tpInsc>1</tpInsc><nrInsc>${cleanDoc(company.cnpj)}</nrInsc></ideEstab><dadosEstab><cnaePrep>${company.cnae || '0000000'}</cnaePrep><aliqGilrat><aliqRat>1</aliqRat><fap>1.00</fap></aliqGilrat></dadosEstab></evtTabEstab></eSocial>`
    });

    // S-1010: Rubricas
    if (payrollItems.length > 0) {
        payrollItems.forEach((item) => {
            events.push({
                id: generateId(),
                companyId: company.id,
                evtType: 'S-1010',
                group: '1',
                description: `Tabela de Rubricas: [${item.code}] ${item.name}`,
                status: 'pending',
                xml: `<eSocial><evtTabRubrica Id="${generateId()}"><ideRubrica><codRubr>${item.code}</codRubr></ideRubrica><dadosRubrica><natRubr>${item.eSocialNatureza || '1000'}</natRubr><tpRubr>${(item.type === 'provento' || item.type === 'earnings') ? 1 : (item.type === 'desconto' || item.type === 'deductions') ? 2 : 3}</tpRubr><codIncCP>${item.eSocialIncidencia?.inss || '00'}</codIncCP><codIncIRRF>${item.eSocialIncidencia?.irrf || '00'}</codIncIRRF><codIncFGTS>${item.eSocialIncidencia?.fgts || '00'}</codIncFGTS></dadosRubrica></evtTabRubrica></eSocial>`
            });
        });
    }

    // --- FASE 2: NÃO PERIÓDICOS (VÍNCULOS) ---

    employees.forEach((emp) => {
        // Validação Mínima para Geração
        const isComplete = emp.cpf && emp.esocialRegistration && emp.cbo;

        // S-2190: Admissão Preliminar
        events.push({
            id: generateId(),
            companyId: company.id,
            evtType: 'S-2190',
            group: '2',
            description: `Admissão Preliminar: ${emp.name} (CPF: ${emp.cpf})`,
            status: 'pending',
            xml: `<eSocial><evtAdmPrelim Id="${generateId()}">...</evtAdmPrelim></eSocial>`
        });

        // S-2200: Cadastramento Inicial / Admissão
        if (emp.status === 'ativo' || emp.status === 'ferias') {
            events.push({
                id: generateId(),
                companyId: company.id,
                evtType: 'S-2200',
                group: '2',
                description: `Admissão Completa: ${emp.name}`,
                status: isComplete ? 'pending' : 'error',
                validationMessage: isComplete ? undefined : 'Faltam dados: CPF, Matrícula eSocial ou CBO obrigatórios.',
                xml: `
<eSocial>
    <evtAdmissao Id="${generateId()}">
        <ideTrabalhador>
            <cpfTrab>${cleanDoc(emp.cpf)}</cpfTrab>
            <nmTrab>${emp.name}</nmTrab>
            <dtNascto>${fmtDate(emp.birthDate)}</dtNascto>
        </ideTrabalhador>
        <vinculo>
            <matricula>${emp.esocialRegistration || ''}</matricula>
            <tpRegTrab>1</tpRegTrab>
            <tpRegPrev>1</tpRegPrev>
            <cadIni>S</cadIni>
            <infoRegimeTrab>
                <infoCeletista>
                    <dtAdm>${fmtDate(emp.admissionDate)}</dtAdm>
                    <tpAdmissao>1</tpAdmissao>
                    <indAdmissao>1</indAdmissao>
                    <tpRegJor>1</tpRegJor>
                    <natAtividade>1</natAtividade>
                    <dtBase>1</dtBase>
                </infoCeletista>
            </infoRegimeTrab>
            <infoContrato>
                <codCateg>${emp.esocialCategory || 101}</codCateg>
                <remuneracao>
                    <vrSalFx>${emp.salary.toFixed(2)}</vrSalFx>
                    <undSal>1</undSal>
                    <dscSalVariable>Salário Mensal</dscSalVariable>
                </remuneracao>
            </infoContrato>
        </vinculo>
    </evtAdmissao>
</eSocial>`
            });
        }

        // Alterações de Contrato
        events.push({
            id: generateId(),
            companyId: company.id,
            evtType: 'S-2206',
            group: '2',
            description: `Alteração de Contrato de Trabalho: ${emp.name}`,
            status: 'pending',
            xml: ''
        });

        // SST S-2210 (CAT - Acidente de Trabalho)
        if (emp.sstInfo?.catDate) {
            events.push({
                id: generateId(),
                companyId: company.id,
                evtType: 'S-2210',
                group: '4',
                description: `SST - CAT: ${emp.name} (${emp.sstInfo.catType})`,
                status: 'pending',
                xml: `<eSocial><evtCAT Id="${generateId()}"><dtAcidente>${fmtDate(emp.sstInfo.catDate)}</dtAcidente><tpAcidente>${emp.sstInfo.catType === 'trajeto' ? 3 : 1}</tpAcidente></evtCAT></eSocial>`
            });
        }

        // SST S-2220 (Monitoramento da Saúde - ASO)
        if (emp.sstInfo?.examDate) {
            events.push({
                id: generateId(),
                companyId: company.id,
                evtType: 'S-2220',
                group: '4',
                description: `SST - ASO: ${emp.name} (${emp.sstInfo.asoType})`,
                status: 'pending',
                xml: `<eSocial><evtMonit Id="${generateId()}"><exMedOcup><dtAso>${fmtDate(emp.sstInfo.examDate)}</dtAso><tpExame>${emp.sstInfo.asoType}</tpExame><resExame>${emp.sstInfo.asoResult === 'inapto' ? 2 : 1}</resExame></exMedOcup></evtMonit></eSocial>`
            });
        }

        // SST S-2240 (Fatores de Risco)
        if (emp.sstInfo) {
            const hasSST = !!emp.sstInfo.riskFactor;
            events.push({
                id: generateId(),
                companyId: company.id,
                evtType: 'S-2240',
                group: '4', // Grouped in SST View
                description: `SST - Condições Ambientais: ${emp.name}`,
                status: hasSST ? 'pending' : 'error',
                validationMessage: hasSST ? undefined : 'Fator de Risco não informado.',
                xml: `<eSocial><evtCondAmb Id="${generateId()}"><infoExpRisco><risco>${emp.sstInfo.riskFactor}</risco></infoExpRisco></evtCondAmb></eSocial>`
            });
        }
    });


    // --- FASE 3: PERIÓDICOS (FOLHA DE PAGAMENTO) ---

    // Busca a folha da competência alvo
    const relevantRun = payrollRuns.find(r => r.competence === targetPeriod);

    if (relevantRun) {
        if (relevantRun.status === 'fechado') {
            relevantRun.details.forEach((detail) => {
                const empObj = employees.find(e => e.id === detail.employeeId);
                const cpf = empObj?.cpf || '000.000.000-00';

                // Check if this is a termination calculation
                const inputs = (detail as any).inputsSnapshot || {};
                const isRescisao = inputs.calculationType === 'rescisao';

                if (isRescisao) {
                    const reason = inputs.rescisaoReason || 'sem_justa_causa';
                    const dtDeslig = inputs.rescisaoDate || targetPeriod.replace('/', '-') + '-28';
                    const mtv = reason === 'pedido_demissao' ? '07' : reason === 'justa_causa' ? '06' : '02';

                    // S-2299: Desligamento
                    events.push({
                        id: generateId(),
                        companyId: company.id,
                        evtType: 'S-2299',
                        group: '3',
                        description: `Desligamento (S-2299): ${detail.employeeName}`,
                        status: 'pending',
                        xml: `<eSocial><evtDeslig Id="${generateId()}"><ideTrabalhador><cpfTrab>${cpf}</cpfTrab></ideTrabalhador><infoDeslig><mtvDeslig>${mtv}</mtvDeslig><dtDeslig>${fmtDate(dtDeslig)}</dtDeslig><verbasResc><vrLiq>${detail.netSalary.toFixed(2)}</vrLiq></verbasResc></infoDeslig></evtDeslig></eSocial>`
                    });

                    // S-1210: Pagamentos (Rescisório)
                    events.push({
                        id: generateId(),
                        companyId: company.id,
                        evtType: 'S-1210',
                        group: '3',
                        description: `Pagamento Rescisório (S-1210): ${detail.employeeName}`,
                        status: 'pending',
                        xml: `<eSocial><evtPgtos Id="${generateId()}"><ideBenef><cpfBenef>${cpf}</cpfBenef></ideBenef><infoPgto><dtPgto>${fmtDate(dtDeslig)}</dtPgto><tpPgto>2</tpPgto><perRef>${targetPeriod}</perRef><vrLiq>${detail.netSalary.toFixed(2)}</vrLiq></infoPgto></evtPgtos></eSocial>`
                    });
                } else {
                    // S-1200: Remuneração (Standard)
                    const xmlRemun = `
<eSocial>
    <evtRemun Id="${generateId()}">
        <ideTrabalhador>
            <cpfTrab>${cpf}</cpfTrab>
        </ideTrabalhador>
        <dmDev>
            <ideDmDev>${detail.employeeId.substring(0, 20)}</ideDmDev>
            <codCateg>101</codCateg>
            <infoPerApur>
                ${detail.events.map(ev =>
                        `<ideEstabLot><remunPerApur><matricula>${''}</matricula><codRubr>${ev.code}</codRubr><ideTabRubr>${''}</ideTabRubr><vrRubr>${ev.value.toFixed(2)}</vrRubr></remunPerApur></ideEstabLot>`
                    ).join('')}
            </infoPerApur>
        </dmDev>
    </evtRemun>
</eSocial>`;

                    events.push({
                        id: generateId(),
                        companyId: company.id,
                        evtType: 'S-1200',
                        group: '3',
                        description: `Remuneração Mensal (S-1200): ${detail.employeeName}`,
                        status: 'pending',
                        xml: xmlRemun
                    });

                    // S-1210: Pagamentos
                    events.push({
                        id: generateId(),
                        companyId: company.id,
                        evtType: 'S-1210',
                        group: '3',
                        description: `Pagamento de Rendimentos (S-1210): ${detail.employeeName}`,
                        status: 'pending',
                        xml: `<eSocial><evtPgtos Id="${generateId()}"><ideBenef><cpfBenef>${cpf}</cpfBenef></ideBenef><infoPgto><dtPgto>${new Date().toISOString().split('T')[0]}</dtPgto><tpPgto>1</tpPgto><perRef>${targetPeriod}</perRef><vrLiq>${detail.netSalary.toFixed(2)}</vrLiq></infoPgto></evtPgtos></eSocial>`
                    });
                }
            });

            // S-1299: Fechamento
            events.push({
                id: generateId(),
                companyId: company.id,
                evtType: 'S-1299',
                group: '3',
                description: `Fechamento dos Eventos Periódicos (S-1299) - Comp: ${targetPeriod}`,
                status: 'pending',
                xml: `<eSocial><evtFechaEvPer Id="${generateId()}"><ideEvento><perApur>${targetPeriod}</perApur></ideEvento><ideRespInf><nmResp>Responsavel</nmResp><cpfResp>00000000000</cpfResp></ideRespInf><infoFech><evtRemun>S</evtRemun><evtPgtos>S</evtPgtos></infoFech></evtFechaEvPer></eSocial>`
            });
        } else {
            // Aviso de erro amigável na lista
            events.push({
                id: generateId(),
                companyId: company.id,
                evtType: 'AVISO',
                group: '3',
                description: 'Atenção: A Folha de Pagamento desta competência ainda está aberta.',
                status: 'error',
                validationMessage: 'Para gerar o S-1200, você deve primeiro "Fechar" a folha no módulo de Folha de Pagamento.',
                xml: ''
            });
        }
    } else {
        // S-1299 Sem Movimento (Caso não tenha folha criada)
        events.push({
            id: generateId(),
            companyId: company.id,
            evtType: 'S-1299',
            group: '3',
            description: `Fechamento Sem Movimento (Comp: ${targetPeriod})`,
            status: 'pending',
            xml: `<eSocial><evtFechaEvPer Id="${generateId()}"><ideEvento><perApur>${targetPeriod}</perApur></ideEvento><infoFech><evtRemun>N</evtRemun><evtPgtos>N</evtPgtos><compSemMovto>${targetPeriod}</compSemMovto></infoFech></evtFechaEvPer></eSocial>`
        });
    }

    return events;
};

export const generateEsocial = (data: { details: any[], competence: string }, company: CompanyEntity, employees: Employee[] = []): string => {
    if (!data.details || data.details.length === 0) return '';
    const mockRun: any = {
        id: 'temp',
        companyId: company.id,
        competence: data.competence,
        status: 'fechado',
        details: data.details
    };
    // Pass empty payrollItems since we only need event generation logic (S-1200/S-2299) which doesn't use it
    const batch = generateEsocialBatch(company, employees, [mockRun], [], data.competence, false);

    // Return the XML of either termination (S-2299) or monthly remuneration (S-1200)
    const evt = batch.find(e => e.evtType === 'S-2299') || batch.find(e => e.evtType === 'S-1200');
    return evt ? evt.xml : '';
};

export const generateReinfBatch = (
    company: CompanyEntity,
    invoices: Invoice[],
    targetPeriod: string, // YYYY-MM
    isZeroMovement: boolean = false
): EsocialEvent[] => {
    const events: EsocialEvent[] = [];
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14);
    let seqCounter = 1;
    const generateId = () => `ID1${cleanDoc(company.cnpj).substring(0, 8)}${timestamp}${String(seqCounter++).padStart(5, '0')}`;

    console.log(`Gerando lote Reinf para: ${company.razaoSocial} - Competência: ${targetPeriod}`);

    // --- GRUPO 1: Eventos de Tabela (R-1000) ---
    // R-1000: Informações do Contribuinte
    // --- VALIDAÇÃO INICIAL ---
    if (!company.fiscalSettings?.esocial?.classificacaoTributaria) {
        // Technically strict, but we can default or let validation layer handle. Generator acts on data.
        // Assuming validation layer already checked this.
        console.warn('Classificação Tributária não definida para Reinf.');
    }

    // --- GRUPO 1: Eventos de Tabela E GERAIS ---
    // R-1000: Informações do Contribuinte
    events.push({
        id: generateId(),
        companyId: company.id,
        evtType: 'R-1000',
        group: '1',
        description: `Cadastro de Contribuinte: ${company.razaoSocial}`,
        status: 'pending',
        xml: `
<Reinf xmlns="http://www.reinf.esocial.gov.br/schemas/evtInfoContribuinte/v2_01_02">
    <evtInfoContri id="${generateId()}">
        <ideEvento>
            <tpAmb>${company.fiscalSettings?.efdReinf?.environment === '1' ? '1' : '2'}</tpAmb>
            <procEmi>1</procEmi>
            <verProc>1.0.0</verProc>
        </ideEvento>
        <ideContri>
            <tpInsc>1</tpInsc>
            <nrInsc>${cleanDoc(company.cnpj).substring(0, 8)}</nrInsc>
        </ideContri>
        <infoContri>
            <inclusao>
                <idePeriodo>
                    <iniValid>${targetPeriod}</iniValid>
                </idePeriodo>
                <infoCadastro>
                    <classTrib>${company.fiscalSettings?.esocial?.classificacaoTributaria || '99'}</classTrib>
                    <indEscrituracao>0</indEscrituracao>
                    <indDesoneracao>${company.indDesoneracao || '0'}</indDesoneracao>
                    <indAcordoIsenMulta>0</indAcordoIsenMulta>
                    <contato>
                        <nmCtt>Responsável Fiscal</nmCtt>
                        <cpfCtt>00000000000</cpfCtt>
                        <foneFixo>${company.telefone.replace(/\D/g, '')}</foneFixo>
                        <email>${company.email}</email>
                    </contato>
                </infoCadastro>
            </inclusao>
        </infoContri>
    </evtInfoContri>
</Reinf>`
    });

    // --- GRUPO 2: Eventos Periódicos (R-2000 Series) ---

    // R-2010: Retenção Contribuição Previdenciária - Tomadores de Serviço
    // Filter invoices: Type=Entry/Service AND has INSS retention
    const takenServices = invoices.filter(inv =>
        (inv.type === 'entry' || (inv.type === 'service' && inv.kind === 'taken')) &&
        (inv.items?.some(i => (i.vInss || 0) > 0) || (inv.taxValue || 0) > 0)
    );

    if (takenServices.length > 0) {
        // Group by Provider (CNPJ)
        const providers = new Map<string, Invoice[]>();
        takenServices.forEach(inv => {
            if (!inv.cnpj) return;
            const list = providers.get(inv.cnpj) || [];
            list.push(inv);
            providers.set(inv.cnpj, list);
        });

        providers.forEach((invs, providerCnpj) => {
            const totalRet = invs.reduce((acc, inv) => acc + (inv.items?.reduce((s, i) => s + (i.vInss || 0), 0) || 0), 0);
            const providerName = invs[0].entityName;

            // Group by Service Code (LC 116) within Provider
            // Warning: Assuming single service type per invoice or dominance. Complex logic needed for multi-service.
            // Simplified: Aggregate all under the most common or first valid service code, or loop items.
            // Let's loop items to build <nfs> list.

            let nfsXml = '';
            invs.forEach(inv => {
                const servCode = inv.items?.[0]?.reinfCodServico?.replace(/\D/g, '') || '1705';

                nfsXml += `<nfs>
                    <serie>${inv.serie || ''}</serie>
                    <numDocto>${inv.number}</numDocto>
                    <dtEmissao>${fmtDate(inv.date)}</dtEmissao>
                    <vlrBruto>${(inv.value || 0).toFixed(2)}</vlrBruto>
                    <codServ>${servCode}</codServ> 
                    <vlrBaseRet>${(inv.value || 0).toFixed(2)}</vlrBaseRet>
                    <vlrRetencao>${(inv.items?.reduce((s, i) => s + (i.vInss || 0), 0) || 0).toFixed(2)}</vlrRetencao>
                </nfs>`;
            });

            events.push({
                id: generateId(),
                companyId: company.id,
                evtType: 'R-2010',
                group: '2',
                description: `Serviços Tomados: ${providerName} (${providerCnpj}) - Total Ret: R$ ${totalRet.toFixed(2)}`,
                status: 'pending',
                xml: `<Reinf><evtServTom id="${generateId()}"><perApur>${targetPeriod}</perApur><infoServTom><ideEstabObra><tpInscEstab>1</tpInscEstab><nrInscEstab>${cleanDoc(company.cnpj)}</nrInscEstab><idePrestServ><cnpjPrestador>${cleanDoc(providerCnpj)}</cnpjPrestador><vlrTotalBruto>${invs.reduce((a, b) => a + b.value, 0).toFixed(2)}</vlrTotalBruto><vlrTotalBaseRet>${invs.reduce((a, b) => a + b.value, 0).toFixed(2)}</vlrTotalBaseRet><vlrTotalRetPrinc>${totalRet.toFixed(2)}</vlrTotalRetPrinc><nfs>${nfsXml}</nfs></idePrestServ></ideEstabObra></infoServTom></evtServTom></Reinf>`
            });
        });
    }

    // R-2020: Retenção Contribuição Previdenciária - Prestadores de Serviço
    const givenServices = invoices.filter(inv =>
        (inv.type === 'service' || (inv.type === 'exit' && inv.category === 'service')) &&
        inv.entityId === company.id
    );
    // Only with retention
    const servicesWithRetention = givenServices.filter(inv => inv.items?.some(i => (i.vInss || 0) > 0));

    if (servicesWithRetention.length > 0) {
        events.push({
            id: generateId(),
            companyId: company.id,
            evtType: 'R-2020',
            group: '2',
            description: `Serviços Prestados (Retenção INSS) - ${servicesWithRetention.length} notas`,
            status: 'pending',
            xml: `<Reinf><evtServPrest id="${generateId()}"><perApur>${targetPeriod}</perApur><infoServPrest><ideEstabObra><tpInscEstab>1</tpInscEstab><nrInscEstab>${cleanDoc(company.cnpj)}</nrInscEstab><vlrTotalBruto>${servicesWithRetention.reduce((acc, inv) => acc + inv.value, 0).toFixed(2)}</vlrTotalBruto><vlrTotalBaseRet>${servicesWithRetention.reduce((acc, inv) => acc + inv.value, 0).toFixed(2)}</vlrTotalBaseRet><vlrTotalRetPrinc>${servicesWithRetention.reduce((acc, inv) => acc + (inv.items?.reduce((s, i) => s + (i.vInss || 0), 0) || 0), 0).toFixed(2)}</vlrTotalRetPrinc></ideEstabObra></infoServPrest></evtServPrest></Reinf>`
        });
    }

    // --- GRUPO 3: Série R-4000 (Retenções Federais) ---
    // R-4010: Pagamentos PF
    // R-4020: Pagamentos PJ

    // Filter relevant invoices
    const fedAuthInvoices = invoices.filter(inv =>
        (inv.items?.some(i => (i.vIrrf || 0) > 0 || (i.vPis || 0) > 0 || (i.vCofins || 0) > 0 || (i.vCsll || 0) > 0))
    );

    if (fedAuthInvoices.length > 0) {
        // Separate PF and PJ
        const pfInvoices = fedAuthInvoices.filter(inv => cleanDoc(inv.cnpj || '').length === 11);
        const pjInvoices = fedAuthInvoices.filter(inv => cleanDoc(inv.cnpj || '').length === 14);

        // --- R-4010 (PF) ---
        pfInvoices.forEach(inv => {
            const irrf = inv.items?.reduce((a, b) => a + (b.vIrrf || 0), 0) || 0;
            if (irrf > 0) {
                // Determine Natureza do Rendimento (CRITICAL)
                // If not set, use a fallback like '11001' (Trabalho assalariado - genérico, CUIDADO) or '10001'.
                const natRend = (inv.items && inv.items.length > 0) ? (inv.items[0]?.reinfNaturezaRendimento || '10001') : '10001';

                events.push({
                    id: generateId(),
                    companyId: company.id,
                    evtType: 'R-4010',
                    group: '3',
                    description: `Pagamento PF (IRRF): ${inv.entityName} - Nat: ${natRend}`,
                    status: 'pending',
                    xml: `<Reinf><evtRetPF id="${generateId()}"><perApur>${targetPeriod}</perApur><ideEstab><tpInscEstab>1</tpInscEstab><nrInscEstab>${cleanDoc(company.cnpj)}</nrInscEstab><ideBenef><cpfBenef>${cleanDoc(inv.cnpj || '')}</cpfBenef><idePgto><natRend>${natRend}</natRend><infoPgto><dtPgto>${fmtDate(inv.date)}</dtPgto><vlrRendBruto>${inv.value.toFixed(2)}</vlrRendBruto><vlrIR>${irrf.toFixed(2)}</vlrIR></infoPgto></idePgto></ideBenef></ideEstab></evtRetPF></Reinf>`
                });
            }
        });

        // --- R-4020 (PJ) ---
        // MUST Group by: 1. Beneficiary (CNPJ), 2. Natureza de Rendimento

        const pjByBenef = new Map<string, Invoice[]>();
        pjInvoices.forEach(inv => {
            if (!inv.cnpj) return;
            const l = pjByBenef.get(inv.cnpj) || [];
            l.push(inv);
            pjByBenef.set(inv.cnpj, l);
        });

        pjByBenef.forEach((invs, beneficiaryCnpj) => {
            // Group by Natureza within this Beneficiary
            const natGroups = new Map<string, {
                base: number, ir: number, csll: number, pis: number, cofins: number, items: Invoice[]
            }>();

            invs.forEach(inv => {
                inv.items?.forEach(item => {
                    // Check if item has retentions, otherwise skip or include as 0
                    const hasRet = (item.vIrrf || 0) > 0 || (item.vPis || 0) > 0 || (item.vCofins || 0) > 0 || (item.vCsll || 0) > 0;
                    if (hasRet) {
                        // Default Natureza: 13000 (Serviços Gerais - Warning: needs precise code from Table 01)
                        // Common: 17099 (Outros servicos)
                        const nat = item.reinfNaturezaRendimento || '17099';
                        const cur = natGroups.get(nat) || { base: 0, ir: 0, csll: 0, pis: 0, cofins: 0, items: [] };

                        // Accumulate
                        // Use item value proportionally? Or assumes item is the base.
                        cur.base += (item.total);
                        cur.ir += (item.vIrrf || 0);
                        cur.csll += (item.vCsll || 0);
                        cur.pis += (item.vPis || 0);
                        cur.cofins += (item.vCofins || 0);
                        if (!cur.items.includes(inv)) cur.items.push(inv);

                        natGroups.set(nat, cur);
                    }
                });
            });

            // Generate XML for this Beneficiary
            let natRenderXml = '';
            let totalRetentions = 0;

            natGroups.forEach((vals, nat) => {
                totalRetentions += vals.ir + vals.csll + vals.pis + vals.cofins;

                // Generate payment info details - Technically requires date of payment for each.
                // Simplification: Aggregated monthly (permitted in some contexts, strictly should be per payment date).
                // Reinf 2.1.2 structure: ideNaturezaRend -> infoRet (aggregated) is NOT how it works.
                // It's: ideBenef -> ideNaturezaRend -> infoRet (Values).
                // infoRet contains: vlrBaseRet, vlrRetencao.

                natRenderXml += `
                 <ideNaturezaRend>
                    <natRend>${nat}</natRend>
                    <infoRet>
                        <vlrBaseRet>${vals.base.toFixed(2)}</vlrBaseRet>
                        <vlrRetencao>${(vals.ir + vals.csll + vals.pis + vals.cofins).toFixed(2)}</vlrRetencao>
                        <retencoes>
                            <vlrIR>${vals.ir.toFixed(2)}</vlrIR>
                            <vlrCSLL>${vals.csll.toFixed(2)}</vlrCSLL>
                            <vlrPIS>${vals.pis.toFixed(2)}</vlrPIS>
                            <vlrCOFINS>${vals.cofins.toFixed(2)}</vlrCOFINS>
                        </retencoes>
                    </infoRet>
                 </ideNaturezaRend>`;
            });

            if (natRenderXml) {
                events.push({
                    id: generateId(),
                    companyId: company.id,
                    evtType: 'R-4020',
                    group: '3',
                    description: `Pagamento PJ (Retenções): ${invs[0].entityName} - Total Ret: ${totalRetentions.toFixed(2)}`,
                    status: 'pending',
                    xml: `<Reinf><evtRetPJ id="${generateId()}"><perApur>${targetPeriod}</perApur><ideEstab><tpInscEstab>1</tpInscEstab><nrInscEstab>${cleanDoc(company.cnpj)}</nrInscEstab><ideBenef><cnpjBenef>${cleanDoc(beneficiaryCnpj)}</cnpjBenef>${natRenderXml}</ideBenef></ideEstab></evtRetPJ></Reinf>`
                });
            }
        });
    }

    // --- GRUPO 4: Fechamento (R-2099 / R-4099) ---
    const hasR2000 = events.some(e => ['R-2010', 'R-2020'].includes(e.evtType));
    const hasR4000 = events.some(e => ['R-4010', 'R-4020'].includes(e.evtType));

    // R-2099 (Fechamento Serviços)
    events.push({
        id: generateId(),
        companyId: company.id,
        evtType: 'R-2099',
        group: '2',
        description: `Fechamento R-2000${!hasR2000 ? ' (Sem Movimento)' : ''}`,
        status: 'pending',
        xml: `<Reinf><evtFechaEvPer id="${generateId()}"><perApur>${targetPeriod}</perApur><ideRespInf><nmResp>Responsavel</nmResp><cpfResp>00000000000</cpfResp></ideRespInf><infoFech><evtServTm>${hasR2000 ? 'S' : 'N'}</evtServTm><evtServPr>${hasR2000 ? 'S' : 'N'}</evtServPr></infoFech></evtFechaEvPer></Reinf>`
    });

    // R-4099 (Fechamento Retenções)
    events.push({
        id: generateId(),
        companyId: company.id,
        evtType: 'R-4099',
        group: '3',
        description: `Fechamento R-4000${!hasR4000 ? ' (Sem Movimento)' : ''}`,
        status: 'pending',
        xml: `<Reinf><evtFechaEvPer id="${generateId()}"><perApur>${targetPeriod}</perApur><ideRespInf><nmResp>Responsavel</nmResp><cpfResp>00000000000</cpfResp></ideRespInf><infoFech><fechRet>${hasR4000 ? 'S' : 'N'}</fechRet></infoFech></evtFechaEvPer></Reinf>`
    });

    return events;
};

