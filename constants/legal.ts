// Resolução CGSN nº 140/2018 - Simples Nacional Tier Tabela
export const SIMPLES_ANNEXES = {
    'I': [ // Comércio
        { limit: 180000, rate: 0.04, ded: 0 },
        { limit: 360000, rate: 0.073, ded: 5940 },
        { limit: 720000, rate: 0.095, ded: 13860 },
        { limit: 1800000, rate: 0.107, ded: 22500 },
        { limit: 3600000, rate: 0.143, ded: 87300 },
        { limit: 4800000, rate: 0.19, ded: 378000 }
    ],
    'II': [ // Indústria
        { limit: 180000, rate: 0.045, ded: 0 },
        { limit: 360000, rate: 0.078, ded: 5940 },
        { limit: 720000, rate: 0.10, ded: 13860 },
        { limit: 1800000, rate: 0.112, ded: 22500 },
        { limit: 3600000, rate: 0.147, ded: 85500 },
        { limit: 4800000, rate: 0.30, ded: 720000 }
    ],
    'III': [ // Serviços
        { limit: 180000, rate: 0.06, ded: 0 },
        { limit: 360000, rate: 0.112, ded: 9360 },
        { limit: 720000, rate: 0.135, ded: 17640 },
        { limit: 1800000, rate: 0.16, ded: 35640 },
        { limit: 3600000, rate: 0.21, ded: 125640 },
        { limit: 4800000, rate: 0.33, ded: 648000 }
    ],
    'IV': [ // Serviços (Construção, Advocacia, etc)
        { limit: 180000, rate: 0.045, ded: 0 },
        { limit: 360000, rate: 0.09, ded: 8100 },
        { limit: 720000, rate: 0.102, ded: 12420 },
        { limit: 1800000, rate: 0.14, ded: 39780 },
        { limit: 3600000, rate: 0.22, ded: 183780 },
        { limit: 4800000, rate: 0.33, ded: 828000 }
    ],
    'V': [ // Serviços (Fator R)
        { limit: 180000, rate: 0.155, ded: 0 },
        { limit: 360000, rate: 0.18, ded: 4500 },
        { limit: 720000, rate: 0.195, ded: 9900 },
        { limit: 1800000, rate: 0.205, ded: 17100 },
        { limit: 3600000, rate: 0.23, ded: 62100 },
        { limit: 4800000, rate: 0.305, ded: 540000 }
    ]
};

// Lucro Presumido Presumption Rates (Art. 15 da Lei 9.249/95)
export const PRESUMIDO_RATES = {
    TRADE: 0.08, // 8% para comércio
    SERVICE: 0.32, // 32% para serviços em geral
    TRANSPORT: 0.16, // 16% transporte cargas
};

// Corporate Tax Rates
export const TAX_RATES = {
    IRPJ: 0.15,
    IRPJ_EXCESS: 0.10, // Adicional de 10% sobre o que exceder 20k/mes
    CSLL_GENERAL: 0.09,
    PIS_CUMULATIVE: 0.0065,
    COFINS_CUMULATIVE: 0.03,
    PIS_NON_CUMULATIVE: 0.0165,
    COFINS_NON_CUMULATIVE: 0.076,
    ISS_AVERAGE: 0.05,
    CPP_PATRONAL: 0.20
};
