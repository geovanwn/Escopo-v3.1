import { Invoice } from '../types';

export interface ValidationResult {
    invoiceId: string;
    invoiceNumber: string;
    errors: string[];
    warnings: string[];
    isValid: boolean;
}

export const validateInvoiceBatch = (invoices: Invoice[]): ValidationResult[] => {
    return invoices.map(invoice => {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 1. Validar CNPJ do Destinatário/Emitente
        const cnpj = invoice.cnpj?.replace(/\D/g, '');
        if (!cnpj || cnpj.length !== 14) {
            // Aceitar CPF (11) também
            if (cnpj && cnpj.length !== 11) {
                errors.push(`Documento (CNPJ/CPF) inválido: ${invoice.cnpj || 'Vazio'}`);
            }
        }

        // 2. Validar Consistência Numérica Global
        const totalItems = invoice.items?.reduce((acc, i) => acc + (i.total || 0), 0) || 0;
        if (Math.abs(totalItems - invoice.value) > 0.05) {
            errors.push(`Divergência de valores: Total da Nota (R$ ${invoice.value.toFixed(2)}) difere da soma dos itens (R$ ${totalItems.toFixed(2)})`);
        }

        // 3. Validar Itens
        if (invoice.items && invoice.items.length > 0) {
            invoice.items.forEach((item, idx) => {
                const prefix = `Item ${idx + 1} (${item.code || 'S/C'})`;

                // Validar NCM (8 dígitos numéricos)
                const ncm = item.ncm?.replace(/\D/g, '');
                if (ncm && ncm.length !== 8) {
                    errors.push(`${prefix}: NCM inválido (${item.ncm})`);
                }

                // Validar CFOP (4 dígitos)
                const cfop = item.cfop?.replace(/\D/g, '');
                if (!cfop || cfop.length !== 4) {
                    errors.push(`${prefix}: CFOP inválido (${item.cfop})`);
                }

                // Validação Cruzada: CFOP vs Tipo de Nota
                if (cfop) {
                    const firstDigit = cfop.charAt(0);
                    if (invoice.type === 'entry' && (firstDigit === '5' || firstDigit === '6' || firstDigit === '7')) {
                        warnings.push(`${prefix}: CFOP de Saída (${item.cfop}) em Nota de Entrada`);
                    }
                    if (invoice.type === 'exit' && (firstDigit === '1' || firstDigit === '2' || firstDigit === '3')) {
                        warnings.push(`${prefix}: CFOP de Entrada (${item.cfop}) em Nota de Saída`);
                    }
                }

                // --- MALHA FINA: Cruzamento CST x CFOP ---
                // CST ICMS: 3 dígitos (Origem + Tributação). Ex: 000, 060, 200...
                // SPED usa Tabela B (00, 10, 20...)
                // Vamos normalizar pegando os 2 ultimos digitos se for tamanho 3
                let startCST = 0;
                if (item.cst && item.cst.length === 3) startCST = 1;
                const cstTrib = item.cst ? item.cst.substring(startCST) : '';

                if (cstTrib === '00' || cstTrib === '20') { // 00: Tributada Integralmente
                    if (cfop && (cfop.endsWith('40') || cfop.endsWith('41') || cfop.endsWith('30') || cfop.endsWith('60'))) {
                        warnings.push(`${prefix}: CST ${cstTrib} (Tributado) incompatível com CFOP ${cfop} (Isento/ST).`);
                    }
                    if (!((item.vIcms || 0) > 0) && !((item.pIcms || 0) > 0)) {
                        warnings.push(`${prefix}: CST ${cstTrib} exige destaque de ICMS.`);
                    }
                }

                if (cstTrib === '60' || cstTrib === '10' || cstTrib === '30' || cstTrib === '70') { // ST
                    if (cfop && !cfop.endsWith('01') && !cfop.endsWith('02') && !cfop.endsWith('03') && !cfop.endsWith('05') && !cfop.endsWith('00')) {
                        // Regra Genérica: Operações com ST geralmente usam CFOPs específicos ou venda normal se for substituído
                    }
                    // Check if vBCST exists if needed (not in interface yet, assuming safe skip)
                }

                if (cstTrib === '40' || cstTrib === '41' || cstTrib === '50') { // Isento/Não Tributado
                    if ((item.vIcms || 0) > 0) {
                        errors.push(`${prefix}: CST ${cstTrib} não deve ter destaque de ICMS.`);
                    }
                }

                // Validação Matemática de ICMS
                if (item.bcIcms && item.pIcms) {
                    const calcIcms = item.bcIcms * (item.pIcms / 100);
                    if (Math.abs(calcIcms - (item.vIcms || 0)) > 0.10) { // Tolerância de 10 centavos
                        warnings.push(`${prefix}: Divergência de Cálculo ICMS. Base: ${item.bcIcms} * Aliq: ${item.pIcms}% = ${calcIcms.toFixed(2)}, mas Valor é ${item.vIcms?.toFixed(2)}`);
                    }
                }

            });
        } else {
            warnings.push('Nota sem itens detalhados');
        }

        // 4. Validar Datas
        const date = new Date(invoice.date);
        if (isNaN(date.getTime())) {
            errors.push('Data de emissão inválida');
        } else {
            // Alerta se data muito antiga (> 60 dias)
            const diffTime = Math.abs(new Date().getTime() - date.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 60) {
                warnings.push(`Data de emissão antiga (${diffDays} dias atrás)`);
            }
        }

        return {
            invoiceId: invoice.id,
            invoiceNumber: invoice.number,
            errors,
            warnings,
            isValid: errors.length === 0
        };
    });
};

export const getBatchValidationSummary = (results: ValidationResult[]) => {
    const total = results.length;
    const invalid = results.filter(r => !r.isValid).length;
    const withWarnings = results.filter(r => r.warnings.length > 0).length;

    return {
        total,
        invalid,
        withWarnings,
        valid: total - invalid
    };
};
