
// Mock Parser for OFX Files (Bank Statements)
import { Invoice } from "../types";

export interface BankTransaction {
    id: string;
    checknum?: string;
    date: string;
    amount: number;
    description: string;
    type: 'DEBIT' | 'CREDIT';
}

export const parseOFX = (content: string): BankTransaction[] => {
    const transactions: BankTransaction[] = [];

    // Normalize content: Remove newlines to handle multiline tags strictly via regex
    // But some OFX files are purely line-based. 
    // Best approach: Global Regex match for <STMTTRN> blocks, ignoring whitespace structure.

    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;

    while ((match = stmtTrnRegex.exec(content)) !== null) {
        const block = match[1];

        // Helper to extract tag value safely (supporting missing closing tags common in SGML)
        const getTagValue = (tag: string) => {
            const rx = new RegExp(`<${tag}>([^<]*)`, 'i'); // Matches <TAG>Value... (until next <)
            const m = block.match(rx);
            return m ? m[1].trim() : null;
        };

        const fitid = getTagValue('FITID') || Math.random().toString(36).substr(2, 9);
        const checknum = getTagValue('CHECKNUM') || getTagValue('REFNUM');
        const amountStr = getTagValue('TRNAMT');
        const memo = getTagValue('MEMO') || 'Sem descrição';
        const dateStr = getTagValue('DTPOSTED'); // YYYYMMDDHHMMSS

        if (amountStr) {
            const amount = parseFloat(amountStr.replace(',', '.')); // Ensure dot decimal

            let dateFormatted = '';
            if (dateStr && dateStr.length >= 8) {
                const year = dateStr.substr(0, 4);
                const month = dateStr.substr(4, 2);
                const day = dateStr.substr(6, 2);
                dateFormatted = `${year}-${month}-${day}`;
            }

            // Correction for weird OFX descriptions (sometimes encoded)
            const cleanDescription = memo.replace(/&amp;/g, '&');

            transactions.push({
                id: fitid,
                checknum: checknum || undefined,
                date: dateFormatted || new Date().toISOString().split('T')[0],
                amount: amount,
                description: cleanDescription,
                type: amount < 0 ? 'DEBIT' : 'CREDIT'
            });
        }
    }

    return transactions;
};

export const MERCADO_PAGO_SAMPLE = `Data de geração: 20-12-2025
Você tem alguma dúvida? Conte com o nosso Portal de ajuda para encontrar informações sobre nossos produtos e serviços. Se deseja falar com
o nosso SAC, ligue para 0800 637 7246. Você precisará de um código de atendimento para nos contatar. Se já nos contatou e precisa de ajuda
da ouvidoria, ligue para 0800 688 4365 com o protocolo do primeiro atendimento.
Mercado Pago Instituição de Pagamento Ltda. CNPJ n.º 10.573.521/0001-91. Av. das Nações Unidas, nº 3.003, Bonfim, Osasco SP - CEP 06233-
903. Encontre nossos canais de consulta em:www.mercadopago.com.br
1/1
EXTRATO DE CONTA
60.035.939 MARILENE GOMES DA SILVA
CPF/CNPJ: 60035939000113 Agência: 1 Conta: 47520821380
Periodo: De 16-04-2025 al 30-04-2025
Saldo inicial: R$ 0,00
Entradas: R$ 698,00
Saidas: R$ -262,00
DETALHE DOS MOVIMENTOS
Data Descrição ID da operação Valor Saldo
19-04-2025
Transferência Pix recebida
Pedro Ferreira de Souza
108485590541 R$ 5,00 R$ 5,00
19-04-2025
Transferência Pix enviada
Pedro Ferreira de Souza
108947345882 R$ -2,00 R$ 3,00
29-04-2025
Transferência recebida
COPART DO BRASIL
ORGANIZACAO D
109439508641 R$ 420,00 R$ 423,00
29-04-2025
Transferência recebida
COPART DO BRASIL
ORGANIZACAO D
109439468947 R$ 273,00 R$ 696,00
29-04-2025
Transferência Pix enviada
Pedro Ferreira de Souza
109915739880 R$ -260,00 R$ 436,00
Saldo final: R$ 436,00`;

export const parseMercadoPagoText = (text: string) => {
    const matches: any[] = [];
    const normalized = text.replace(/\r\n/g, '\n');
    const parts = normalized.split('DETALHE DOS MOVIMENTOS');
    if (parts.length < 2) return [];

    const transactionSection = parts[1];
    const blockRegex = /(\d{2}-\d{2}-\d{4})([\s\S]*?)(\d{5,})\s+R\$\s+([-\d.,]+)\s+R\$\s+([-\d.,]+)/g;

    let match;
    while ((match = blockRegex.exec(transactionSection)) !== null) {
        const rawDate = match[1];
        const descRaw = match[2];
        const id = match[3];
        const valStr = match[4];

        const [d, m, y] = rawDate.split('-');
        const dateISO = `${y}-${m}-${d}`;
        const desc = descRaw.trim().replace(/\n/g, ' ');
        const value = parseFloat(valStr.replace(/\./g, '').replace(',', '.'));

        matches.push({
            id: id,
            date: dateISO,
            desc: desc + ' (MP)',
            amount: Math.abs(value),
            type: value < 0 ? 'entry' : 'exit',
            matchQuality: 'none',
            matchedInvoiceId: null,
            matchedInvoiceDesc: null
        });
    }
    return matches;
};
