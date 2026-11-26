
import { z } from 'zod';

export const ClientSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(3, "Razão Social é obrigatória e deve ter no mínimo 3 caracteres"),
    fantasyName: z.string().optional(),
    cnpj: z.string().min(11, "CNPJ/CPF inválido"), // Simplified validation
    ie: z.string().optional(),
    im: z.string().optional(),
    address: z.string().optional(),
    addressNumber: z.string().optional(),
    addressComp: z.string().optional(),
    addressDistrict: z.string().optional(),
    city: z.string().optional(),
    uf: z.string().optional(),
    zip: z.string().optional(),
    phone: z.string().optional(),
    mobilePhone: z.string().optional(),
    email: z.string().email("E-mail inválido").optional().or(z.literal('')),
    website: z.string().optional(),
    type: z.enum(['client', 'supplier', 'carrier']).default('client'),
    companyId: z.string().optional(),
    activitySector: z.string().optional(),
    foundationDate: z.string().optional(),
    // Billing Address
    billingAddressStreet: z.string().optional(),
    billingAddressNumber: z.string().optional(),
    billingAddressComp: z.string().optional(),
    billingAddressDistrict: z.string().optional(),
    billingAddressCity: z.string().optional(),
    billingAddressState: z.string().optional(),
    billingAddressZip: z.string().optional(),
    emailBilling: z.string().email("E-mail de faturamento inválido").optional().or(z.literal(''))
});

export const PartnerSchema = z.object({
    id: z.string().optional(),
    companyId: z.string().optional(),
    name: z.string().min(3, "Nome completo é obrigatório"),
    cpf: z.string().min(11, "CPF inválido"),
    rg: z.string().optional(),
    rgIssuer: z.string().optional(),
    rgIssueDate: z.string().optional(),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento inválida (YYYY-MM-DD)").optional(),
    nationality: z.string().optional(),
    maritalStatus: z.string().optional(),
    profession: z.string().optional(),
    educationLevel: z.string().optional(),
    pis: z.string().optional(),
    role: z.string().min(2, "Cargo é obrigatório"),
    participation: z.number().min(0, "Participação não pode ser negativa").max(100, "Participação máxima é 100%"),
    proLaboreValue: z.number().min(0).optional(),
    entryDate: z.string().optional(),
    admissionDate: z.string().optional(),
    capitalIntegralized: z.number().optional(),
    isPEP: z.string().optional(), // 'true' | 'false' strings from select
    lgpdConsent: z.boolean().refine(val => val === true, "Consentimento LGPD é obrigatório"),
    // Address & Contact
    zip: z.string().optional(),
    address: z.string().optional(),
    addressNumber: z.string().optional(),
    addressComp: z.string().optional(),
    addressDistrict: z.string().optional(),
    addressQuadra: z.string().optional(),
    addressLote: z.string().optional(),
    city: z.string().optional(),
    uf: z.string().optional(),
    mobilePhone: z.string().optional(),
    email: z.string().email("E-mail inválido").optional().or(z.literal(''))
});

export const EmployeeSchema = z.object({
    id: z.string().optional(),
    companyId: z.string().optional(),
    // Personal
    name: z.string().min(3, "Nome completo é obrigatório"),
    birthDate: z.string().optional(),
    gender: z.string().optional(),
    nationality: z.string().optional(),
    birthPlace: z.string().optional(),
    motherName: z.string().optional(),
    fatherName: z.string().optional(),
    // Docs
    cpf: z.string().min(11, "CPF é obrigatório"),
    rg: z.string().optional(),
    rgIssuer: z.string().optional(),
    pis: z.string().optional(),
    cnh: z.string().optional(),
    voterTitle: z.string().optional(),
    ctpsNum: z.string().optional(),
    ctpsSeries: z.string().optional(),
    // Functional
    role: z.string().min(2, "Cargo é obrigatório"),
    department: z.string().optional(),
    salary: z.number().min(0, "Salário deve ser maior ou igual a zero"),
    admissionDate: z.string().min(10, "Data de Admissão é obrigatória"),
    contractType: z.string().optional(),
    supervisor: z.string().optional(),
    transportVoucher: z.boolean().optional(),
    mealVoucher: z.boolean().optional(),
    healthPlan: z.boolean().optional(),
    status: z.enum(['ativo', 'inativo', 'ferias', 'afastado']).default('ativo'),
    // Contact & Address
    zip: z.string().optional(),
    address: z.string().optional(),
    addressNumber: z.string().optional(),
    addressDistrict: z.string().optional(),
    city: z.string().optional(),
    uf: z.string().optional(),
    mobilePhone: z.string().optional(),
    email: z.string().email("E-mail inválido").optional().or(z.literal('')),
    emergencyContact: z.string().optional(),
    // Banking
    bank: z.string().optional(),
    agency: z.string().optional(),
    account: z.string().optional(),
    pix: z.string().optional()
});

export const ProductSchema = z.object({
    id: z.string().optional(),
    companyId: z.string().optional(),
    code: z.string().min(1, "Código SKU é obrigatório"),
    ean: z.string().optional(),
    name: z.string().min(3, "Nome do produto é obrigatório"),
    description: z.string().optional(),
    category: z.string().optional(),
    subCategory: z.string().optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    manufacturer: z.string().optional(),
    supplierId: z.string().optional(),
    warranty: z.string().optional(),
    unit: z.string().min(1, "Unidade é obrigatória"),
    stock: z.number().min(0),
    minStock: z.number().optional(),
    maxStock: z.number().optional(),
    location: z.string().optional(),
    costPrice: z.number().min(0).optional(),
    price: z.number().min(0, "Preço de venda é obrigatório"),
    margin: z.number().optional(),
    // Taxes
    ncm: z.string().length(8, "NCM deve ter 8 dígitos").optional().or(z.literal('')),
    origin: z.string().optional(),
    icmsRate: z.number().optional(),
    ipiRate: z.number().optional(),
    pisRate: z.number().optional(),
    cofinsRate: z.number().optional(),
    // Logistics
    weightGross: z.number().optional(),
    weightNet: z.number().optional(),
    status: z.enum(['ativo', 'inativo']).default('ativo')
});

export const ServiceSchema = z.object({
    id: z.string().optional(),
    companyId: z.string().optional(),
    code: z.string().optional(),
    name: z.string().min(3, "Nome do serviço é obrigatório"),
    serviceItem: z.string().optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    scope: z.string().optional(),
    exclusions: z.string().optional(),
    method: z.string().optional(),
    executionTime: z.string().optional(),
    price: z.number().min(0, "Preço é obrigatório"),
    pricingModel: z.string().optional(),
    issRate: z.number().min(0).optional(),
    pisRate: z.number().optional(),
    cofinsRate: z.number().optional(),
    csllRate: z.number().optional(),
    irrfRate: z.number().optional(),
    inssRate: z.number().optional(),
    cnae: z.string().optional(),
    status: z.string().default('ativo')
});

export type ClientInput = z.infer<typeof ClientSchema>;
export type PartnerInput = z.infer<typeof PartnerSchema>;
export type EmployeeInput = z.infer<typeof EmployeeSchema>;
export type ProductInput = z.infer<typeof ProductSchema>;
export type ServiceInput = z.infer<typeof ServiceSchema>;
