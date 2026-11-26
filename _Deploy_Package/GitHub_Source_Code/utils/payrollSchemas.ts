import { z } from 'zod';

export const PayrollInputSchema = z.object({
    he50_qtde: z.number().min(0).default(0),
    he100_qtde: z.number().min(0).default(0),
    faltas_dias: z.number().min(0).max(31).default(0),
    atrasos_mins: z.number().min(0).default(0),
    comissao_valor: z.number().min(0).default(0),
    bonus_valor: z.number().min(0).default(0),
    adicional_periculosidade: z.boolean().default(false),
    adicional_insalubridade: z.enum(['nenhum', 'min', 'med', 'max']).default('nenhum'),
    desc_vt: z.boolean().default(false),
    desc_plano_saude: z.number().min(0).default(0),
    desc_adiantamento: z.number().min(0).default(0),
    desc_outros: z.number().min(0).default(0),
    proLaboreOverride: z.number().min(0).optional(),
    customEvents: z.array(z.any()).default([]),
    selectedRubrics: z.array(z.string()).default([]),
    calculationType: z.enum(['folha_mensal', 'decimo_terceiro', 'ferias', 'rescisao']).default('folha_mensal'),
    decimoTerceiroParcela: z.enum(['1', '2', 'unica']).optional(),
    media_variaveis_valor: z.number().min(0).default(0),
    feriasDias: z.number().min(1).max(30).optional(),
    feriasAbono: z.boolean().optional(),
    vacationStart: z.string().optional(),
    rescisaoReason: z.string().optional(),
    rescisaoNotice: z.enum(['indenizado', 'trabalhado']).optional(),
    rescisaoVacationBalance: z.number().min(0).optional(),
    rescisaoDate: z.string().optional(),
    rescisaoAfastamentoCode: z.string().optional(),
});

export type PayrollInputType = z.infer<typeof PayrollInputSchema>;
