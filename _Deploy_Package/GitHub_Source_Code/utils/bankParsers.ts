
// Mock Parser for OFX Files (Bank Statements)
import { Invoice } from "../types";

export interface BankTransaction {
    id: string;
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
                date: dateFormatted || new Date().toISOString().split('T')[0],
                amount: amount,
                description: cleanDescription,
                type: amount < 0 ? 'DEBIT' : 'CREDIT'
            });
        }
    }

    return transactions;
};
