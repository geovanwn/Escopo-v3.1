
// Core Entity Types
export interface Client {
    id: string;
    companyId?: string;
    name: string;
    type: 'client' | 'supplier' | 'carrier';
    email: string;
    phone: string;
    address: string;
    addressNumber?: string;
    addressDistrict?: string;
    city: string;
    uf: string;
    zip: string;
    cnpj: string;
    fantasyName?: string;
    mobilePhone?: string;
    ie?: string;
    im?: string;
    addressComp?: string;
    website?: string;
    activitySector?: string;
}

export interface Product {
    id: string;
    companyId?: string;
    code: string;
    name: string;
    ncm: string;
    price: number;
    costPrice?: number;
    unit: string;
    stock: number;
    status: 'ativo' | 'inativo';
    category?: string;
    minStock?: number;
    createdBy?: string;
    updatedBy?: string;
    createdAt?: string;
    updatedAt?: string;
    icmsRate?: number;
    ipiRate?: number;
    pisRate?: number;
    cofinsRate?: number;
    csllRate?: number;
    irrfRate?: number;
    inssRate?: number;
    difalInternalRate?: number;
    difalExternalRate?: number;
    origin?: string;
}

export interface Service {
    id: string;
    companyId?: string;
    code: string;
    name: string;
    serviceItem?: string;
    price: number;
    taxRate?: number; // ISS
    issRate?: number;
    pisRate?: number;
    cofinsRate?: number;
    csllRate?: number;
    irrfRate?: number;
    inssRate?: number;
    status: 'ativo' | 'inativo';
}

export interface Employee {
    id: string;
    companyId?: string;
    name: string;
    cpf: string;
    position: string;
    department: string;
    salary: number;
    admissionDate: string;
    status: 'ativo' | 'inativo' | 'ferias';
    type?: 'employee';
    dependents?: string;
    esocialRegistration?: string;
    cbo?: string;
    birthDate?: string;
    esocialCategory?: number;
    sstInfo?: {
        catDate?: string;
        catType?: 'inicial' | 'reabertura' | 'obito' | 'trajeto';
        examDate?: string;
        asoType?: string;
        asoResult?: 'apto' | 'inapto';
        riskFactor?: string;
    };
    transportVoucher?: boolean;
    healthPlan?: boolean;
    role?: string;
}

export interface SalaryHistory {
    id: string;
    value: number;
    startDate: string;
    endDate?: string;
    createdAt: string;
}

export interface Partner {
    id: string;
    companyId?: string;
    name: string;
    cnpj?: string;
    cpf?: string;
    type?: string;
    email?: string;
    phone?: string;
    role?: string;
    participation?: number;
    proLaboreValue?: number;
    admissionDate?: string;
    entryDate?: string;
    salaryHistory?: SalaryHistory[];
}

export interface InvoiceItem {
    id?: string;
    productId: string;
    code?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    // PIS/COFINS (EFD Contribuições)
    cstPis?: string;
    cstCofins?: string;
    // EFD-Reinf
    reinfNaturezaRendimento?: string; // Tabela 01 (ex: 10001, 15001) for R-4000
    reinfCodServico?: string; // LC 116 (ex: 17.05) for R-2000

    // Derived/Internal
    total: number;
    ncm?: string;
    cst?: string;
    cfop?: string;
    unit?: string;
    discount?: number;
    // Product taxes (NFe)
    bcIcms?: number;
    vIcms?: number;
    vIpi?: number;
    pIcms?: number;
    pIpi?: number;
    // Service taxes (NFSe)
    vIss?: number;
    pIss?: number;
    pPis?: number;
    pCofins?: number;
    pCsll?: number;
    pIrrf?: number;
    pInss?: number;
    vPis?: number;
    vCofins?: number;
    vCsll?: number;
    vIrrf?: number;
    vInss?: number;
}

export interface Invoice {
    id: string;
    companyId?: string;
    type: 'entry' | 'exit' | 'service' | 'receipt' | 'payroll';
    status: 'pendente' | 'autorizada' | 'paga' | 'cancelada' | 'substituida' | 'anulada' | 'negada' | 'recusada';
    number: string;
    serie?: string;
    searchKey?: string;
    accessKey?: string;
    date: string;
    naturezaOperacao?: string;
    entityId: string;
    entityName: string;
    cnpj?: string;
    value: number;
    taxValue?: number;
    items?: InvoiceItem[];
    details?: string;
    xmlContent?: string;
    category?: string;
    kind?: 'taken' | 'given';
    paymentDate?: string;
    isReconciled?: boolean;
    createdBy?: string;
    createdAt?: string;
    updatedBy?: string;
    updatedAt?: string;
    approvedAt?: string;
    approvedBy?: string;
}

export interface NCM {
    id: string;
    code: string;
    description: string;
}

export interface TaxRate {
    id: string;
    companyId?: string;
    name: string;
    rate: number;
    type: string;
}

export interface PayrollItem {
    id: string;
    companyId?: string;
    name: string;
    code: string;
    type: 'provento' | 'desconto' | 'encargo' | 'base' | 'earnings' | 'deductions';
    value: number;
    eSocialNatureza?: string;
    eSocialIncidencia?: {
        inss?: string;
        irrf?: string;
        fgts?: string;
    };
    description?: string;
    status?: 'ativo' | 'inativo';
    natureza?: 'salarial' | 'indenizatoria' | 'outros';
    eventoFixo?: boolean;
    calcMethod?: 'fixo' | 'percentual' | 'formula' | 'quantidade';
    calcValue?: number;
    allowManualOverride?: boolean;
    incidesINSS?: boolean;
    incidesFGTS?: boolean;
    incidesIRRF?: boolean;
    incidesSindicato?: boolean;
    incidesOutros?: boolean;
    compoeSalarioBase?: boolean;
    compoeMedias13?: boolean;
    compoeMediasFerias?: boolean;
    compoeMediasRescisao?: boolean;
    compoeAvisoPrevio?: boolean;
    classification?: string;
    eSocialCode?: string;
    contaDebito?: string;
    contaCredito?: string;
    centroCusto?: string;
    rateioContabil?: string;
    validFrom?: string;
    validTo?: string;
    observacoes?: string;
    createdAt?: string;
    createdBy?: string;
    updatedAt?: string;
    updatedBy?: string;
}

export interface CompanyEntity {
    id: string;
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: string;
    inscricaoEstadual?: string;
    ie?: string; // Alias sometimes used
    inscricaoMunicipal?: string;
    im?: string; // Alias sometimes used
    telefone: string;
    email: string;
    address?: {
        street: string;
        number: string;
        complemento?: string;
        neighborhood?: string;
        bairro?: string; // Keeping for backward compat if any
        city: string;
        uf: string;
        zip: string;
        cep?: string; // Keeping for backward compat
        cityCode?: string;
        quadra?: string;
        lote?: string;
    };
    regime?: string;
    regimeTributario?: string;
    cnae?: string;
    ramoAtividade?: 'comercio' | 'servicos' | 'industria' | 'misto' | 'outros';

    // Configuration & Modules
    // Fiscal / SPED Fields
    codMunicipioIBGE?: string;
    suframa?: string;
    naturezaJuridica?: string;
    indicadorAtividade?: string;
    fiscalSettings?: {
        efdContrib?: { active: boolean; activity?: string };
        efdReinf?: { active: boolean; environment?: string };
        efdFiscal?: { active: boolean; profile?: string };
        esocial?: { active: boolean; environment?: string; group?: string; classificacaoTributaria?: string; indicativoCoop?: string; indicativoConstrurora?: string };
    };
    certificate?: {
        fileName?: string;
        pfxBase64?: string;
        password?: string;
        validity?: string;
        issuer?: string;
    };
    indDesoneracao?: string;
    anexoSimples?: string;

    // Custom Rates for Dashboard/Calculations
    taxEstimationRate?: number; // Default 6.0
    aliquotaISS?: number;       // Global ISS Rate for Service
    payrollOverheadFactor?: number; // Default 1.6

    openingDate?: string;
    fatorR?: boolean;

    status?: 'active' | 'inactive';
    logo?: string;

    createdBy?: string;
    createdAt?: string;
    updatedBy?: string;
    updatedAt?: string;
    approvedAt?: string;
}

export interface FiscalAlert {
    id: string;
    companyId?: string;
    title: string;
    message: string;
    severity: 'high' | 'medium' | 'low';
    date: string;
    isRead: boolean;
    type: 'system' | 'xml_inconsistency' | 'financial' | 'tax_deadline' | 'workflow' | 'compliance' | 'hr';
}

export interface PayrollRunDetail {
    employeeId: string;
    employeeName: string;
    personType?: 'employee' | 'partner';
    role?: string;
    competence: string;
    baseSalary: number;
    events: Array<{
        code?: string;
        description: string;
        type: 'provento' | 'desconto';
        value: number;
        reference?: string;
    }>;
    totalProventos: number;
    totalDescontos: number;
    netSalary: number;
    baseINSS: number;
    baseFGTS: number;
    baseIRRF: number;
    fgtsValue: number;
    inssValue: number;
    irrfValue: number;
    inputsSnapshot?: any;
}

export interface PayrollInputState {
    he50_qtde: number;
    he100_qtde: number;
    faltas_dias: number;
    atrasos_mins: number;
    comissao_valor: number;
    bonus_valor: number;
    adicional_periculosidade: boolean;
    adicional_insalubridade: 'nenhum' | 'min' | 'med' | 'max';
    desc_vt: boolean;
    desc_plano_saude: number;
    desc_adiantamento: number;
    desc_outros: number;
    proLaboreOverride?: number;
    customEvents?: any[];
    calculationType?: 'folha_mensal' | 'decimo_terceiro' | 'ferias' | 'rescisao';
    rescisaoReason?: string;
    rescisaoNotice?: 'indenizado' | 'trabalhado';
    rescisaoVacationBalance?: number;
    decimoTerceiroParcela?: '1' | '2' | 'unica';
    feriasDias?: number;
    feriasAbono?: boolean;
    rescisaoDate?: string;
    rescisaoAfastamentoCode?: string;
    media_variaveis_valor?: number;
    vacationStart?: string;
    selectedRubrics?: string[];
    month?: string;
    year?: string;
    workedDays?: number;
}

export interface PayrollRun {
    id: string;
    companyId?: string;
    competence: string;
    status: 'draft' | 'completed' | 'paid' | 'fechado' | 'simulacao';
    calculationType?: string;
    totalGross: number;
    totalDeductions?: number;
    totalNet: number;
    totalTaxes?: number;
    employeeCount?: number;
    details: PayrollRunDetail[];
    closedAt?: string;
    createdAt?: string;
    createdBy?: string;
}

export interface BankAccount {
    id: string;
    companyId?: string;
    bankName: string;
    accountNumber: string;
    agency: string;
    balance: number;
    type: 'checking' | 'savings';
}

export interface BankTransaction {
    id: string;
    companyId?: string;
    date: string;
    description: string;
    amount: number;
    type: 'credit' | 'debit';
    status: 'pending' | 'reconciled';
    bankName?: string;
    reconciledWith?: string;
    userId?: string;
    createdAt?: string;
    createdBy?: string;
}

export interface EsocialEvent {
    id: string;
    companyId: string;
    evtType: string;
    description: string;
    xml: string;
    status: 'pending' | 'signed' | 'sending' | 'sent' | 'error' | 'rejected' | 'selected';
    group: '1' | '2' | '3' | '4' | '5';
    validationMessage?: string;
    receiptNumber?: string;
    protocol?: string;
    sentAt?: string;
}

export interface Filing {
    id: string;
    companyId?: string;
    name: string;
    competence: string;
    deadline: string;
    status: 'not_started' | 'pending' | 'completed' | 'sent' | 'generated' | 'validated' | 'error' | 'cancelled';
    priority: 'high' | 'medium' | 'low';
    type?: string;
    category?: 'state' | 'federal' | 'municipal' | 'social';
    content?: string;
    fileName?: string;
    validationErrors?: string[];
    esocialEvents?: EsocialEvent[];
    receiptNumber?: string;
    sentAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CST {
    id: string;
    companyId?: string;
    code: string;
    description: string;
}

export interface CFOP {
    id: string;
    companyId?: string;
    code: string;
    description: string;
    type: 'entry' | 'exit';
}

export interface UnitOfMeasure {
    id: string;
    companyId?: string;
    code: string;
    description: string;
}

export interface OperationType {
    id: string;
    companyId?: string;
    name: string;
    description: string;
}

export interface SystemUser {
    id: string;
    companyId?: string;
    name: string;
    email: string;
    role: 'Admin' | 'Operador' | 'Cliente';
    status: 'active' | 'inactive';
    permissions?: {
        fiscal?: 'full' | 'read' | 'none';
        financial?: 'full' | 'read' | 'none';
        hr?: 'full' | 'read' | 'none';
        crm?: 'full' | 'read' | 'none';
        admin?: 'full' | 'read' | 'none';
        inventory?: 'full' | 'read' | 'none';
    };
}

export interface CostCenter {
    id: string;
    companyId?: string;
    code: string;
    name: string;
    description?: string;
    status: 'active' | 'inactive';
}

export interface TaxCalendarEvent {
    id: string;
    companyId?: string;
    title: string;
    date: string;
    severity: 'high' | 'medium' | 'low';
    isDone: boolean;
    description?: string;
}

export interface PreSpedValidationLog {
    id: string;
    companyId?: string;
    date: string;
    type: string;
    status: 'success' | 'error' | 'warning';
    message: string;
}

export interface AccountingEntry {
    id: string;
    companyId?: string;
    date: string;
    description: string;
    debitAccount: string;
    creditAccount: string;
    value: number;
    documentRef?: string;
    documentNumber?: string;
    history?: string;
    category?: string;
    originModule?: 'fiscal' | 'financial' | 'payroll' | 'inventory' | 'manual';
    status?: 'draft' | 'posted' | 'archived';
    createdAt?: string;
}

export interface AccountingClosure {
    id: string;
    companyId: string;
    period: string; // YYYY-MM
    closingDate: string; // YYYY-MM-DD
    status: 'closed' | 'open';
    closedBy: string;
    closedAt: string;
    notes?: string;
}

export interface FixedAsset {
    id: string;
    companyId?: string;
    code?: string;
    name: string;
    acquisitionDate: string;
    acquisitionValue: number;
    depreciationRate: number;
    currentValue?: number;
    usefulLifeMonths: number;
    accumulatedDepreciation: number;
    category: string;
    status: 'active' | 'disposed';
}

export interface AuditLogEntry {
    id: string;
    userId: string;
    userName: string;
    userEmail?: string;
    action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'edit';
    entity: string;
    entityId: string;
    details: string;
    timestamp: string;
    ip?: string;
    geo?: string;
    userAgent?: string;
}

export interface NavItem {
    label: string;
    path: string;
    icon: any;
}

export interface Notification {
    id: string;
    userId?: string;
    companyId?: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'alert' | 'tax_deadline' | 'xml_inconsistency';
    priority: 'high' | 'medium' | 'low';
    date: string;
    isRead: boolean;
    whatsappSent?: boolean;
    emailSent?: boolean;
    createdAt?: string;
    createdBy?: string;
}

export interface SavedReport {
    id: string;
    companyId: string;
    type: string;
    title: string;
    period: string;
    data: any;
    createdAt: string;
    createdBy: string;
}

export interface WorkflowTask {
    id: string;
    companyId: string;
    title: string;
    description: string;
    status: 'todo' | 'doing' | 'done' | 'blocked';
    priority: 'urgent' | 'high' | 'medium' | 'low';
    dueDate: string;
    assignedTo?: string;
    tags?: string[];
    createdAt?: string;
    createdBy?: string;
    updatedAt?: string;
}
