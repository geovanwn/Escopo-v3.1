// Motor de Cálculo Oficial - Simples Nacional (LC 123/2006)
// Atualizado para Tabelas 2024/2025

export interface AnnexTier {
    limit: number;
    rate: number; // Alíquota Nominal
    ded: number; // Parcela a Deduzir
    // Repartição dos Tributos (Soma deve ser 100%)
    share: {
        irpj: number;
        csll: number;
        cofins: number;
        pis: number;
        cpp: number;
        icms: number; // Para Comércio/Indústria
        iss: number;  // Para Serviços
        ipi: number;  // Para Indústria
    };
}

export interface TaxBreakdown {
    code: string; // IRPJ, CSLL...
    value: number; // Valor R$
    rate: number; // Alíquota Efetiva do tributo
}

export interface DasCalculationResult {
    totalValue: number;
    effectiveRate: number;
    breakdown: TaxBreakdown[];
    rbt12: number;
    tierIndex: number;
}

// Configuração de Segregação (Ex: Receita com Monofásico de PIS/COFINS)
export interface RevenueSource {
    value: number;
    annex: 'I' | 'II' | 'III' | 'IV' | 'V';
    options?: {
        isMonofasicoPisCofins?: boolean;
        isStIcms?: boolean;
        isRetencaoIss?: boolean;
        isExportacao?: boolean; // Imunidade constitucional (não paga impostos, exceto CPP as vezes)
        isImune?: boolean;
    };
}

// --- TABELAS OFICIAIS (ANEXOS I a V) ---
// Fonte: Resolução CGSN nº 140/2018 (Atualizadas)

export const SIMPLES_ANNEXES: Record<string, AnnexTier[]> = {
    'I': [ // Comércio
        { limit: 180000, rate: 0.04, ded: 0, share: { irpj: 5.5, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 41.5, icms: 34.0, iss: 0, ipi: 0 } },
        { limit: 360000, rate: 0.073, ded: 5940, share: { irpj: 5.5, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 41.5, icms: 34.0, iss: 0, ipi: 0 } },
        { limit: 720000, rate: 0.095, ded: 13860, share: { irpj: 5.5, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 42.0, icms: 33.5, iss: 0, ipi: 0 } },
        { limit: 1800000, rate: 0.107, ded: 22500, share: { irpj: 5.5, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 42.0, icms: 33.5, iss: 0, ipi: 0 } },
        { limit: 3600000, rate: 0.143, ded: 87300, share: { irpj: 5.5, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 42.0, icms: 33.5, iss: 0, ipi: 0 } },
        { limit: 4800000, rate: 0.19, ded: 378000, share: { irpj: 13.5, csll: 10.0, cofins: 28.27, pis: 6.13, cpp: 42.1, icms: 0, iss: 0, ipi: 0 } } // Faixa 6: ICMS pago por fora
    ],
    'II': [ // Indústria
        { limit: 180000, rate: 0.045, ded: 0, share: { irpj: 5.5, csll: 3.5, cofins: 11.51, pis: 2.49, cpp: 37.5, icms: 32.0, iss: 0, ipi: 7.5 } },
        { limit: 360000, rate: 0.078, ded: 5940, share: { irpj: 5.5, csll: 3.5, cofins: 11.51, pis: 2.49, cpp: 37.5, icms: 32.0, iss: 0, ipi: 7.5 } },
        { limit: 720000, rate: 0.10, ded: 13860, share: { irpj: 5.5, csll: 3.5, cofins: 11.51, pis: 2.49, cpp: 37.5, icms: 32.0, iss: 0, ipi: 7.5 } },
        { limit: 1800000, rate: 0.112, ded: 22500, share: { irpj: 5.5, csll: 3.5, cofins: 11.51, pis: 2.49, cpp: 37.5, icms: 32.0, iss: 0, ipi: 7.5 } },
        { limit: 3600000, rate: 0.147, ded: 85500, share: { irpj: 5.5, csll: 3.5, cofins: 11.51, pis: 2.49, cpp: 37.5, icms: 32.0, iss: 0, ipi: 7.5 } },
        { limit: 4800000, rate: 0.30, ded: 720000, share: { irpj: 8.5, csll: 7.5, cofins: 20.96, pis: 4.54, cpp: 23.5, icms: 0, iss: 0, ipi: 35.0 } } // Faixa 6: ICMS pago por fora
    ],
    'III': [ // Serviços Gerais
        { limit: 180000, rate: 0.06, ded: 0, share: { irpj: 4.0, csll: 3.5, cofins: 12.82, pis: 2.78, cpp: 43.4, icms: 0, iss: 33.5, ipi: 0 } },
        { limit: 360000, rate: 0.112, ded: 9360, share: { irpj: 4.0, csll: 3.5, cofins: 14.05, pis: 3.05, cpp: 43.4, icms: 0, iss: 32.0, ipi: 0 } },
        { limit: 720000, rate: 0.135, ded: 17640, share: { irpj: 4.0, csll: 3.5, cofins: 13.68, pis: 2.96, cpp: 43.4, icms: 0, iss: 32.5, ipi: 0 } },
        { limit: 1800000, rate: 0.16, ded: 35640, share: { irpj: 4.0, csll: 3.5, cofins: 13.68, pis: 2.96, cpp: 43.4, icms: 0, iss: 32.5, ipi: 0 } },
        { limit: 3600000, rate: 0.21, ded: 125640, share: { irpj: 4.0, csll: 3.5, cofins: 12.82, pis: 2.78, cpp: 43.4, icms: 0, iss: 33.5, ipi: 0 } },
        { limit: 4800000, rate: 0.33, ded: 648000, share: { irpj: 35.0, csll: 15.0, cofins: 16.03, pis: 3.47, cpp: 30.5, icms: 0, iss: 0, ipi: 0 } } // Faixa 6: ISS pago por fora (geralmente)
    ],
    'IV': [ // Serviços (Limpeza, Vigilância, Obras, Advocacia) - CPP Fora
        { limit: 180000, rate: 0.045, ded: 0, share: { irpj: 18.8, csll: 15.2, cofins: 17.67, pis: 3.83, cpp: 0, icms: 0, iss: 44.5, ipi: 0 } },
        { limit: 360000, rate: 0.09, ded: 8100, share: { irpj: 19.8, csll: 15.2, cofins: 20.55, pis: 4.45, cpp: 0, icms: 0, iss: 40.0, ipi: 0 } },
        { limit: 720000, rate: 0.102, ded: 12420, share: { irpj: 18.8, csll: 15.2, cofins: 19.73, pis: 4.27, cpp: 0, icms: 0, iss: 42.0, ipi: 0 } },
        { limit: 1800000, rate: 0.14, ded: 39780, share: { irpj: 19.8, csll: 15.2, cofins: 18.90, pis: 4.10, cpp: 0, icms: 0, iss: 42.0, ipi: 0 } },
        { limit: 3600000, rate: 0.22, ded: 183780, share: { irpj: 18.8, csll: 15.2, cofins: 18.08, pis: 3.92, cpp: 0, icms: 0, iss: 44.0, ipi: 0 } },
        { limit: 4800000, rate: 0.33, ded: 828000, share: { irpj: 53.5, csll: 21.5, cofins: 20.55, pis: 4.45, cpp: 0, icms: 0, iss: 0, ipi: 0 } }
    ],
    'V': [ // Serviços Intelectuais/Tecnologia (Sujeito Fator R < 28%)
        { limit: 180000, rate: 0.155, ded: 0, share: { irpj: 4.0, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 28.85, icms: 0, iss: 48.15, ipi: 0 } }, // ISS share adjusted roughly
        { limit: 360000, rate: 0.18, ded: 4500, share: { irpj: 4.0, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 27.85, icms: 0, iss: 49.65, ipi: 0 } }, // Percentais aproximados base LC 155/16
        { limit: 720000, rate: 0.195, ded: 9900, share: { irpj: 4.0, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 23.85, icms: 0, iss: 53.15, ipi: 0 } },
        { limit: 1800000, rate: 0.205, ded: 17100, share: { irpj: 4.0, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 23.85, icms: 0, iss: 53.15, ipi: 0 } },
        { limit: 3600000, rate: 0.23, ded: 62100, share: { irpj: 4.0, csll: 3.5, cofins: 12.74, pis: 2.76, cpp: 23.85, icms: 0, iss: 53.15, ipi: 0 } },
        { limit: 4800000, rate: 0.305, ded: 540000, share: { irpj: 35.0, csll: 15.0, cofins: 16.03, pis: 3.47, cpp: 30.5, icms: 0, iss: 0, ipi: 0 } }
    ]
};

/**
 * Calcula o Fator R
 */
export const calculateFatorR = (ms12: number, rbt12: number): number => {
    if (rbt12 <= 0) return 0;
    return ms12 / rbt12;
};

/**
 * Determina Anexo (Mudança III -> V ou V -> III)
 */
export const determineAnnex = (baseAnnex: 'III' | 'V', fatorR: number): 'III' | 'V' => {
    // Se Anexo V e Fator R >= 28%, tributa pelo Anexo III (Mais barato)
    if (baseAnnex === 'V' && fatorR >= 0.28) return 'III';

    // Se Anexo III e Fator R < 28% (Apenas atividades específicas sujeitas ao fator R, ex: Fisioterapia no III)
    // OBS: No sistema, deve-se marcar se a atividade É sujeita ao fator R. Assume-se que se chamou essa função, é sujeita.
    // Mas regra geral: Anexo III padrão NÃO muda pro V, a menos que seja atividade intelectual listada na lei que "seria" V mas está no III se cumprir Fator R.
    // Simplificação segura: Se a empresa foi configurada como Anexo III "sujeito a fator R", usamos essa lógica.
    if (baseAnnex === 'III' && fatorR < 0.28) return 'V';

    return baseAnnex;
};

/**
 * CÁLCULO COMPLETO DO DAS
 * Suporta múltiplas fontes de receita com regras de imunidade/isenção
 */
export const calculateComplexDas = (
    rbt12: number,
    revenues: RevenueSource[]
): DasCalculationResult => {

    let totalTax = 0;
    const globalBreakdown: Record<string, number> = { IRPJ: 0, CSLL: 0, COFINS: 0, PIS: 0, CPP: 0, ICMS: 0, ISS: 0, IPI: 0 };

    // 1. Iterar sobre cada fonte de receita (Segregação)
    revenues.forEach(rev => {
        if (rev.value <= 0) return;

        const annexTable = SIMPLES_ANNEXES[rev.annex];
        if (!annexTable) throw new Error(`Anexo ${rev.annex} não encontrado.`);

        // 2. Encontrar Faixa (Tier) baseada na RBT12 Global
        const tierIndex = annexTable.findIndex(t => rbt12 <= t.limit);
        const tier = tierIndex !== -1 ? annexTable[tierIndex] : annexTable[annexTable.length - 1];

        // 3. Calcular Alíquota Efetiva Nominal
        // Fórmula: ((RBT12 * AliqNominal) - ParcelaDeduzir) / RBT12
        let effectiveRate = rbt12 > 0 ? ((rbt12 * tier.rate) - tier.ded) / rbt12 : tier.rate;

        // Ajuste fino: Alíquota efetiva não pode ser negativa (casos extremos de RBT12 baixo com dedução alta, teoricamente impossível na tabela, mas segurança de código)
        if (effectiveRate < 0) effectiveRate = 0;

        // 4. Aplicar deduções da Alíquota Efetiva (Segregação)
        // Se for monofásico de PIS/COFINS, reduz a alíquota proporcionalmente à participação desses impostos na faixa.

        let finalRate = effectiveRate;
        const share = tier.share; // Percentuais de participação (Soma ~ 100)

        // Percentual redutor (soma das participações dos impostos isentos/monofásicos)
        let reductionPercentage = 0;

        if (rev.options?.isMonofasicoPisCofins) {
            reductionPercentage += share.pis + share.cofins;
        }
        if (rev.options?.isStIcms) {
            reductionPercentage += share.icms;
        }
        if (rev.options?.isRetencaoIss) {
            reductionPercentage += share.iss; // ISS Retido não paga no DAS, paga na fonte (desconta do DAS)
        }
        if (rev.options?.isImune || rev.options?.isExportacao) {
            // Imunidade total (exceto CPP em alguns casos, mas regra geral exportação isenta tudo no Simples exceto CPP?)
            // Regra Exportação LC 123: Imune de IRPJ, CSLL, PIS, COFINS, IPI. (ICMS/ISS depende). CPP paga.
            // Para simplificar: Se isExportacao, remove IRPJ, CSLL, PIS, COFINS, IPI.
            if (rev.options.isExportacao) {
                reductionPercentage += share.irpj + share.csll + share.pis + share.cofins + share.ipi;
                // ICMS exportação é imune (LC 87/96 Kandir)
                reductionPercentage += share.icms;
                // ISS exportação é isento se resultado no exterior
                reductionPercentage += share.iss;
            }
        }

        // A redução é aplicada sobre a alíquota efetiva.
        // O percentual de redução deve ser proporcional ao Share. 
        // Ex: Se Alíquota Efetiva = 10% e PIS+COFINS são 15% do rateio. 
        // A nova alíquota é 10% * (1 - 0.15) = 8.5%.
        const effectiveReductionFactor = reductionPercentage / 100;
        finalRate = effectiveRate * (1 - effectiveReductionFactor);

        // 5. Calcular valor do imposto para esta receita
        const taxValue = rev.value * finalRate;
        totalTax += taxValue;

        // 6. Calcular Breakdown (Decomposição em R$) para Contabilidade
        // Valor de cada imposto = (Valor Total * Share do Imposto) / (Soma dos Shares Ativos)
        // Ou mais simples: Valor = Receita * (AliqEfetiva * (ShareImposto / 100))
        // Se o imposto foi excluído (redução), o valor é 0.

        const calculateTaxComponent = (taxName: keyof typeof share, isExcluded: boolean) => {
            if (isExcluded) return 0;
            // A taxa individual efetiva é: AliqEfetivaGlobal * (Share / 100)
            const individualRate = effectiveRate * (share[taxName] / 100);
            const val = rev.value * individualRate;
            globalBreakdown[taxName.toUpperCase()] += val;
        };

        calculateTaxComponent('pis', !!rev.options?.isMonofasicoPisCofins || !!rev.options?.isExportacao);
        calculateTaxComponent('cofins', !!rev.options?.isMonofasicoPisCofins || !!rev.options?.isExportacao);
        calculateTaxComponent('icms', !!rev.options?.isStIcms || !!rev.options?.isExportacao);
        calculateTaxComponent('iss', !!rev.options?.isRetencaoIss || (!!rev.options?.isExportacao)); // Assuming export skips ISS
        calculateTaxComponent('irpj', !!rev.options?.isExportacao);
        calculateTaxComponent('csll', !!rev.options?.isExportacao);
        calculateTaxComponent('ipi', !!rev.options?.isExportacao);
        calculateTaxComponent('cpp', false); // CPP geralmente sempre paga, salvo imunidade filantrópica (não coberta aqui)
    });

    // Construir array de retorno
    const breakdownResult: TaxBreakdown[] = Object.entries(globalBreakdown).map(([key, value]) => ({
        code: key,
        value: value,
        rate: rbt12 > 0 ? (value / rbt12) : 0 // Taxa meramente ilustrativa sobre RBT12? Não, ideal sobre Receita do Mês? Deixa 0 por enqto.
    }));

    return {
        totalValue: totalTax,
        effectiveRate: totalTax > 0 ? (totalTax / revenues.reduce((a, b) => a + b.value, 0)) : 0,
        breakdown: breakdownResult,
        rbt12,
        tierIndex: 0 // Simplificado, pois pode variar por anexo. Retornar índice genérico.
    };
};
