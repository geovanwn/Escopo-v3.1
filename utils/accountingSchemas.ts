
import { z } from 'zod';

export const AssetSchema = z.object({
    name: z.string().min(3, "Nome do ativo deve ter pelo menos 3 caracteres"),
    acquisitionValue: z.number().positive("Valor de aquisição deve ser positivo"),
    acquisitionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (formato YYYY-MM-DD)"),
    usefulLifeMonths: z.number().int().positive("Vida útil deve ser um número inteiro positivo (em meses)"),
    category: z.enum(['maquinas', 'veiculos', 'imoveis', 'moveis', 'ti', 'outros']).default('outros')
});

export const AccountingEntrySchema = z.object({
    description: z.string().min(5, "Descrição deve ter pelo menos 5 caracteres"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (formato YYYY-MM-DD)"),
    value: z.number().positive("Valor deve ser maior que zero"),
    debitAccount: z.string().min(1, "Conta de Débito é obrigatória"),
    creditAccount: z.string().min(1, "Conta de Crédito é obrigatória"),
    history: z.string().optional()
}).refine(data => data.debitAccount !== data.creditAccount, {
    message: "Conta de Débito e Crédito não podem ser iguais",
    path: ["creditAccount"]
});

export type AssetInput = z.infer<typeof AssetSchema>;
export type AccountingEntryInput = z.infer<typeof AccountingEntrySchema>;
