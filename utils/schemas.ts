import { z } from 'zod';

export const ClientSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(3, "Nome muito curto"),
    cnpj: z.string().min(11, "CPF/CNPJ inválido"),
    email: z.string().email("E-mail inválido").optional().or(z.literal('')),
    phone: z.string().optional(),
    zip: z.string().min(8, "CEP inválido"),
    address: z.string(),
    addressNumber: z.string(),
    city: z.string(),
    uf: z.string().length(2, "UF deve ter 2 caracteres"),
    type: z.enum(['client', 'supplier', 'carrier']),
    companyId: z.string().optional()
});

export const ProductSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(2, "Nome do produto é obrigatório"),
    code: z.string().min(1, "Código SKU é obrigatório"),
    price: z.coerce.number().min(0, "Preço inválido"),
    unit: z.string().min(1, "Unidade é obrigatória"),
    stock: z.coerce.number().default(0),
    companyId: z.string().optional()
});

export const EmployeeSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(3, "Nome completo é obrigatório"),
    cpf: z.string().min(11, "CPF inválido"),
    role: z.string().min(1, "Cargo é obrigatório"),
    salary: z.coerce.number().min(0, "Salário inválido"),
    admissionDate: z.string(),
    companyId: z.string().optional()
});

export const PartnerSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(3, "Nome completo é obrigatório"),
    cpf: z.string().min(11, "CPF inválido"),
    birthDate: z.string().min(1, "Data de nascimento obrigatória"),
    participation: z.coerce.number().min(0).max(100),
    lgpdConsent: z.boolean().refine(v => v === true, "Consentimento LGPD é obrigatório"),
    companyId: z.string().optional()
});

export type ClientInput = z.infer<typeof ClientSchema>;
export type ProductInput = z.infer<typeof ProductSchema>;
export type EmployeeInput = z.infer<typeof EmployeeSchema>;
export type PartnerInput = z.infer<typeof PartnerSchema>;
