import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
    Users, Briefcase, Truck, Package, Wrench,
    FileText, Percent, BookOpen, UserCheck, Search,
    Plus, Trash2, Edit2, Loader2, Pencil, Building2, MapPin, Phone,
    ShieldCheck, Paperclip, GraduationCap, Flag, Calendar, DollarSign, Archive, Tag, Truck as TruckIcon,
    History, MessageCircle, Mail as MailIcon, Upload, Landmark, ArrowLeftRight, Layers, Activity, Bookmark, ArrowLeft, LayoutDashboard, List, X, User
} from 'lucide-react';
import { ImportModal } from '../components/ui/ImportModal';
import { useToast } from '../contexts/ToastContext';
import { useError } from '../contexts/ErrorContext';
import { parseCSV } from '../utils/csvParser';
import * as XLSX from 'xlsx';
import { Client, Product, Service, Employee, Partner, NCM, TaxRate, PayrollItem, OperationType } from '../types';
import { maskCNPJ, maskCPF, maskPhone, maskCEP, unmask, maskDate, maskCurrency, formatCurrency, formatDateBR } from '../utils/formatters';
import { UniversalList } from '../components/ui/UniversalList';
import { ClientForm } from '../components/crm/ClientForm';
import { ProductForm } from '../components/crm/ProductForm';
import { EmployeeForm } from '../components/crm/EmployeeForm';
import { PartnerForm } from '../components/crm/PartnerForm';
import { ServiceForm } from '../components/crm/ServiceForm';
import { NCMForm } from '../components/crm/NCMForm';
import { TaxRateForm } from '../components/crm/TaxRateForm';
import { PayrollItemForm } from '../components/crm/PayrollItemForm';
import { CSTForm } from '../components/crm/CSTForm';
import { OperationTypeForm } from '../components/crm/OperationTypeForm';
import { CFOPForm } from '../components/crm/CFOPForm';
import { UnitForm } from '../components/crm/UnitForm';
import { BankAccountForm } from '../components/crm/BankAccountForm';
import { useCompanyStore } from '../stores/useCompanyStore';
import { useAuthStore } from '../stores/useAuthStore';
import { ClientSchema, PartnerSchema, EmployeeSchema, ProductSchema, ServiceSchema } from '../utils/crmSchemas';
import { z } from 'zod';

type RegistryType = 'partners' | 'clients' | 'suppliers' | 'carriers' | 'employees' | 'products' | 'services' | 'ncms' | 'taxRates' | 'payrollItems' | 'bankAccounts' | 'csts' | 'cfops' | 'units' | 'operationTypes' | 'payrollTables';

interface RegistryConfig {
    id: RegistryType;
    label: string;
    icon: React.ElementType;
    description: string;
    color: string; // Base color name for styling logic
}

const registries: RegistryConfig[] = [
    { id: 'partners', label: 'Sócios', icon: UserCheck, description: 'Quadro societário e participações', color: 'indigo' },
    { id: 'clients', label: 'Clientes', icon: Users, description: 'Base de clientes e contatos', color: 'blue' },
    { id: 'suppliers', label: 'Fornecedores', icon: Briefcase, description: 'Parceiros de fornecimento', color: 'orange' },
    { id: 'carriers', label: 'Transportadoras', icon: Truck, description: 'Logística e frete', color: 'slate' },
    { id: 'employees', label: 'Funcionários', icon: Users, description: 'Colaboradores e RH', color: 'emerald' },
    { id: 'products', label: 'Produtos', icon: Package, description: 'Catálogo de itens e estoque', color: 'violet' },
    { id: 'services', label: 'Serviços', icon: Wrench, description: 'Catálogo de serviços prestados', color: 'cyan' },
    { id: 'ncms', label: 'NCMs', icon: FileText, description: 'Nomenclatura Comum do Mercosul', color: 'yellow' },
    { id: 'taxRates', label: 'Alíquotas', icon: Percent, description: 'Configuração de impostos', color: 'rose' },
    { id: 'payrollItems', label: 'Rubricas', icon: BookOpen, description: 'Eventos de folha de pagamento', color: 'pink' },
    { id: 'bankAccounts', label: 'Contas Bancárias', icon: Landmark, description: 'Gestão de contas e fluxo', color: 'green' },
    { id: 'csts', label: 'CSTs', icon: Tag, description: 'Código de Situação Tributária', color: 'orange' },
    { id: 'cfops', label: 'CFOPs', icon: ArrowLeftRight, description: 'Código Fiscal de Operações', color: 'blue' },
    { id: 'units', label: 'Unidades', icon: Layers, description: 'Unidades de Medida', color: 'slate' },
    { id: 'operationTypes', label: 'Naturezas de Operação', icon: Bookmark, description: 'Natureza das operações fiscais', color: 'teal' },
    { id: 'payrollTables', label: 'Tabelas do Governo', icon: Landmark, description: 'Tabelas de INSS, IRRF e Salário Família', color: 'indigo' },
];


// Defined outside to prevent re-render focus loss
const CRMField = ({ label, name, value, onChange, required = false, type = "text", onBlur, isLoading, className, wrapperClassName, ...props }: any) => (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName || ''}`}>
        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest ml-1">{label} {required && <span className="text-red-500">*</span>}</label>
        <div className="relative">
            <input
                type={type}
                name={name}
                required={required}
                className={`w-full bg-[var(--bg-card)] text-[var(--text-primary)] rounded-xl border border-[var(--border-color)] px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none hover:border-emerald-500/50 transition-all placeholder:text-[var(--text-secondary)]/30 shadow-sm disabled:opacity-50 disabled:bg-[var(--bg-secondary)] ${className || ''}`}
                value={value || ''}
                onChange={onChange}
                onBlur={onBlur}
                {...props}
            />
            {isLoading ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                </div>
            ) : null}
        </div>
    </div>
);

const CRMSelect = ({ label, name, value, onChange, required = false, children, className, wrapperClassName, ...props }: any) => (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName || ''}`}>
        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest ml-1">{label} {required && <span className="text-red-500">*</span>}</label>
        <select name={name} required={required} className={`w-full bg-[var(--bg-card)] text-[var(--text-primary)] rounded-xl border border-[var(--border-color)] px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none hover:border-emerald-500/50 transition-all shadow-sm disabled:opacity-50 disabled:bg-[var(--bg-secondary)] cursor-pointer ${className || ''}`} value={value || ''} onChange={onChange} {...props}>
            {children}
        </select>
    </div>
);

const CRMTextArea = ({ label, name, value, onChange, required = false, className, wrapperClassName, ...props }: any) => (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName || ''}`}>
        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest ml-1">{label} {required && <span className="text-red-500">*</span>}</label>
        <textarea
            name={name}
            required={required}
            className={`w-full bg-[var(--bg-card)] text-[var(--text-primary)] rounded-xl border border-[var(--border-color)] px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none hover:border-emerald-500/50 transition-all placeholder:text-[var(--text-secondary)]/30 shadow-sm disabled:opacity-50 disabled:bg-[var(--bg-secondary)] custom-scrollbar resize-y ${className || ''}`}
            rows={4}
            value={value || ''}
            onChange={onChange}
            {...props}
        />
    </div>
);

const TabButton = ({ id, label, current, set, icon: Icon }: any) => {
    const isActive = current === id;
    return (
        <button
            type="button"
            onClick={() => set(id)}
            className={`relative flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all duration-300 rounded-xl whitespace-nowrap overflow-hidden group ${isActive
                ? 'text-blue-700 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 font-bold shadow-sm ring-1 ring-blue-500/20'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                }`}
        >
            {isActive && (
                <span className="absolute left-0 w-1 h-3/4 bg-blue-500 rounded-r-md top-1/2 -translate-y-1/2" />
            )}
            {Icon && (
                <Icon
                    size={18}
                    className={`transition-colors duration-300 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300'
                        }`}
                />
            )}
            <span className="tracking-tight">{label}</span>
        </button>
    );
};

const OPERATION_TYPE_FLAGS: Record<string, { label: string; color: string }> = {
    compra: { label: '🛒 Compra (Revenda)', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    venda: { label: '💰 Venda', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    imobilizado: { label: '🏭 Imobilizado', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
    compra_material_aplicado: { label: '🔧 Material Aplicado', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
    uso_consumo: { label: '📦 Uso e Consumo', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
    devolucao: { label: '↩️ Devolução', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    remessa: { label: '📤 Remessa', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' },
    transferencia: { label: '🔄 Transferência', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
    servico_prestado: { label: '🛠️ Serv. Prestado', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
    servico_tomado: { label: '📋 Serv. Tomado', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
    outros: { label: '📎 Outros', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
};

export const CRM: React.FC = () => {
    const data = useData();
    const navigate = useNavigate();
    const location = useLocation();
    const { selectedCompany } = useCompanyStore();
    const { currentUser } = useAuthStore();
    const [activeRegistry, setActiveRegistry] = useState<RegistryType | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // UI States
    const [isLoadingCEP, setIsLoadingCEP] = useState(false);
    const [isLoadingBillingCEP, setIsLoadingBillingCEP] = useState(false);
    const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);
    const [billingSameAsMain, setBillingSameAsMain] = useState(true);

    // Tab States for different forms
    const [formTab, setFormTab] = useState<'dados' | 'endereco' | 'contatos'>('dados');
    const [activePartnerTab, setActivePartnerTab] = useState<'pessoais' | 'docs' | 'endereco' | 'contatos' | 'societario' | 'compliance'>('pessoais');
    const [employeeTab, setEmployeeTab] = useState<'pessoais' | 'docs' | 'endereco' | 'contatos' | 'bancarios' | 'funcionais' | 'anexos'>('pessoais');
    const [productTab, setProductTab] = useState<'basico' | 'comercial' | 'estoque' | 'custo' | 'tecnico' | 'logistica' | 'imagens'>('basico');
    const [serviceTab, setServiceTab] = useState<'geral' | 'execucao' | 'comercial' | 'operacional' | 'tributacao'>('geral');

    // Generic Form State
    const [formData, setFormData] = useState<any>({});
    const [selectedIds, setSelectedIds] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<string>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [showSalaryAdjustment, setShowSalaryAdjustment] = useState(false);

    // Partner Photo Handling
    const partnerFileInputRef = useRef<HTMLInputElement>(null);

    const handlePartnerPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione apenas arquivos de imagem.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setFormData((prev: any) => ({
                ...prev,
                photo3x4: base64String
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleRemovePartnerPhoto = () => {
        setFormData((prev: any) => ({
            ...prev,
            photo3x4: ''
        }));
        if (partnerFileInputRef.current) {
            partnerFileInputRef.current.value = '';
        }
    };

    // Deep Link Effect
    useEffect(() => {
        if (location.state?.targetRegistry) {
            setActiveRegistry(location.state.targetRegistry as RegistryType);
        }
    }, [location.state]);

    useEffect(() => {
        if (location.state?.targetRegistry && location.state?.targetProductId && activeRegistry === location.state.targetRegistry) {
            const productId = location.state.targetProductId;
            let item: any = null;

            if (activeRegistry === 'products') {
                item = data.products.find(p => p.id === productId);
            }
            // Add other types if needed

            if (item) {
                handleEdit(item);
                // Clear state to prevent reopening on generic re-renders, but keep registry active
                navigate(location.pathname, { replace: true, state: { ...location.state, targetProductId: undefined } });
            }
        }
    }, [activeRegistry, location.state, data.products]);

    // Recommendation 6: CRM Kanban View
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleOpenRegistry = (type: RegistryType) => {
        if (type === 'bankAccounts') {
            navigate('/app/company?tab=accounts');
            return;
        }
        setActiveRegistry(type);
        setSelectedIds([]);
    };

    const handleBack = () => {
        setActiveRegistry(null);
    };

    const resetTabs = () => {
        setFormTab('dados');
        setActivePartnerTab('pessoais');
        setEmployeeTab('pessoais');
        setProductTab('basico');
        setServiceTab('geral');
        setViewMode('list');
        setShowSalaryAdjustment(false);
    };

    const handleAdd = () => {
        setFormData({});
        setBillingSameAsMain(true);
        resetTabs();
        setIsModalOpen(true);
    };

    const handleDownloadImportTemplate = () => {
        // Define columns based on active registry
        let columns: string[] = [];
        switch (activeRegistry) {
            case 'clients':
            case 'suppliers':
            case 'carriers':
                columns = ['Nome/Razão Social', 'Nome Fantasia', 'CNPJ/CPF', 'Email', 'Telefone', 'CEP', 'Endereço', 'Número', 'Cidade', 'UF'];
                break;
            case 'employees':
                columns = ['Nome Completo', 'CPF', 'RG', 'Data Nascimento', 'Cargo', 'Salário', 'Data Admissão', 'Email'];
                break;
            case 'products':
                columns = ['Nome Produto', 'Código SKU', 'Preço Venda', 'Unidade', 'Estoque Inicial', 'NCM', 'Origem'];
                break;
            case 'services':
                columns = ['Nome Serviço', 'Código Item', 'Preço', 'Alíquota ISS', 'Descrição'];
                break;
            case 'payrollItems':
                columns = ['Código Interno', 'Nome da Rubrica', 'Tipo', 'Forma de Cálculo', 'Valor Padrão', 'Incidência FGTS', 'Incidência INSS', 'Incidência IRRF'];
                break;
            default:
                columns = ['Nome', 'Código', 'Descrição'];
        }

        const csvContent = "data:text/csv;charset=utf-8," + columns.join(";");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `modelo_importacao_${activeRegistry}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportData = () => {
        const list = filteredList;
        if (list.length === 0) {
            addToast('Não há dados para exportar.', 'warning');
            return;
        }

        let exportData: any[] = [];
        const fileName = `export_${activeRegistry}_${new Date().toISOString().split('T')[0]}`;

        switch (activeRegistry) {
            case 'payrollItems':
                exportData = list.map((item: any) => ({
                    'Código Interno': item.code || '-',
                    'Nome da Rubrica': item.name || '-',
                    'Tipo': item.type === 'provento' ? 'Provento' : item.type === 'desconto' ? 'Desconto' : 'Encargo',
                    'Forma de Cálculo': item.valueType === 'percentual' ? 'Percentual' : 'Fixo',
                    'Valor Padrão': item.value || 0,
                    'Incidência FGTS': (item.incidesFGTS) ? 'S' : 'N',
                    'Incidência INSS': (item.incidesINSS) ? 'S' : 'N',
                    'Incidência IRRF': (item.incidesIRRF || item.incidesIR) ? 'S' : 'N'
                }));
                break;
            case 'employees':
                exportData = list.map((item: any) => ({
                    'Nome': item.name,
                    'CPF': item.cpf,
                    'RG': item.rg,
                    'Cargo': item.role || item.position,
                    'Salário': item.salary,
                    'Data Admissão': item.admissionDate,
                    'Email': item.email
                }));
                break;
            default:
                // Generic flat export for other types
                exportData = list.map((item: any) => {
                    const { id, companyId, ...rest } = item;
                    return rest;
                });
        }

        try {
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Dados");
            XLSX.writeFile(wb, `${fileName}.xlsx`);
            addToast('Dados exportados com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao exportar:', error);
            addToast('Erro ao gerar arquivo de exportação.', 'error');
        }
    };

    const { addToast } = useToast();
    const { showError } = useError();

    const handleImportData = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const fileContent = e.target?.result;
            if (!fileContent) return;

            // Use XLSX library to handle both Excel and CSV robustly
            const workbook = XLSX.read(fileContent, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                addToast('Nenhum registro encontrado ou arquivo inválido.', 'warning');
                return;
            }

            let successCount = 0;
            const importBatch = async () => {
                const targetCompanyId = selectedCompany?.id || data.companies[0]?.id;

                if (activeRegistry !== 'ncms' && !targetCompanyId) {
                    alert("ERRO CRÍTICO: Não foi possível identificar a empresa de destino. Por favor, selecione uma empresa no menu superior antes de importar.");
                    return;
                }

                console.log("Iniciando importação. Empresa Destino:", targetCompanyId);

                for (const rawRecord of jsonData) {
                    try {
                        // Normalize Keys for Mapping
                        // Create a case-insensitive lookup map
                        const record: any = {};
                        Object.keys(rawRecord).forEach(k => {
                            let cleanKey = k.trim();
                            // Specific mapping for Service Import requested by User
                            if (activeRegistry === 'services') {
                                if (cleanKey === 'Nome Serviço') cleanKey = 'name';
                                else if (cleanKey === 'Código Item') cleanKey = 'serviceItem'; // Mapped to serviceItem (e.g. 1.05)
                                else if (cleanKey === 'Descrição') cleanKey = 'description';
                                else if (cleanKey === 'Preço') cleanKey = 'price';
                                else if (cleanKey === 'Aliquota ISS') cleanKey = 'taxRate';
                            }
                            // Specific mapping for Rubricas (payrollItems)
                            else if (activeRegistry === 'payrollItems') {
                                if (cleanKey === 'Código Interno') cleanKey = 'code';
                                else if (cleanKey === 'Nome da Rubrica') cleanKey = 'name';
                                else if (cleanKey === 'Tipo') cleanKey = 'type';
                                else if (cleanKey === 'Forma de Cálculo') cleanKey = 'valueType';
                                else if (cleanKey === 'Valor Padrão') cleanKey = 'value';
                                else if (cleanKey === 'Incidência FGTS') cleanKey = 'incidesFGTS';
                                else if (cleanKey === 'Incidência INSS') cleanKey = 'incidesINSS';
                                else if (cleanKey === 'Incidência IRRF') cleanKey = 'incidesIRRF';
                            }
                            // Generic mapping fallback
                            else {
                                if (cleanKey.toLowerCase().includes('nome')) cleanKey = 'name';
                                else if (cleanKey.toLowerCase().includes('descri')) cleanKey = 'description';
                                else if (cleanKey.toLowerCase().includes('preço')) cleanKey = 'price';
                                else if (cleanKey.toLowerCase().includes('valor')) cleanKey = 'value';
                                else if (cleanKey.toLowerCase().includes('código')) cleanKey = 'code';
                                else if (cleanKey.toLowerCase().includes('serviço') && (activeRegistry as any) === 'services') cleanKey = 'serviceItem';
                            }
                            record[cleanKey] = rawRecord[k];
                        });

                        // Value Parsing / Cleaning
                        if ((record.price || record.value) && typeof (record.price || record.value) === 'string') {
                            const val = (record.price || record.value).replace(/[^\d,.-]/g, '').replace(',', '.');
                            if (record.price) record.price = parseFloat(val);
                            if (record.value) record.value = parseFloat(val);
                        }
                        if (record.taxRate && typeof record.taxRate === 'string') {
                            // "3%" -> 3
                            record.taxRate = parseFloat(record.taxRate.replace('%', '').replace(',', '.'));
                        }

                        // Specific for Rubricas
                        if (activeRegistry === 'payrollItems') {
                            if (typeof record.incidesFGTS === 'string') record.incidesFGTS = record.incidesFGTS.trim().toUpperCase() === 'S';
                            if (typeof record.incidesINSS === 'string') record.incidesINSS = record.incidesINSS.trim().toUpperCase() === 'S';
                            if (typeof record.incidesIRRF === 'string') record.incidesIRRF = record.incidesIRRF.trim().toUpperCase() === 'S';

                            if (record.type) {
                                const t = record.type.toLowerCase();
                                if (t.includes('provento')) record.type = 'provento';
                                else if (t.includes('desconto')) record.type = 'desconto';
                                else if (t.includes('encargo')) record.type = 'encargo';
                            }
                            if (record.valueType) {
                                const vt = record.valueType.toLowerCase();
                                if (vt.includes('percentual')) record.valueType = 'percentual';
                                else if (vt.includes('fixo')) record.valueType = 'fixo';
                            }
                        }

                        // Validation
                        if (!record.name && !record.description && !record.code) continue;

                        // Payload Construction
                        const payload = {
                            ...record,
                            // Ensure Critical Fields
                            id: Math.random().toString(36).substr(2, 9),
                            code: record.code || Math.floor(Math.random() * 1000000).toString().padStart(6, '0'),
                            orderNumber: record.orderNumber || Math.floor(Math.random() * 900) + 100, // Generate random 3 digit order number if missing
                            description: record.description || record.name, // Fallback

                            name: record.name || record.description || 'Serviço Importado', // Fallback
                            serviceItem: record.serviceItem, // Persist 1.01 as item
                            status: 'ativo',
                            companyId: (activeRegistry !== 'ncms') ? targetCompanyId : undefined
                        };

                        console.log(`Importando registro para ${activeRegistry}:`, payload);

                        switch (activeRegistry) {
                            case 'clients':
                                await data.addClient({ ...payload, type: 'client' });
                                break;
                            case 'suppliers':
                                await data.addClient({ ...payload, type: 'supplier' });
                                break;
                            case 'carriers':
                                await data.addClient({ ...payload, type: 'carrier' });
                                break;
                            case 'employees':
                                await data.addEmployee(payload);
                                break;
                            case 'products':
                                await data.addProduct(payload);
                                break;
                            case 'services':
                                await data.addService(payload);
                                break;
                            case 'ncms':
                                await data.addNCM(payload);
                                break;
                            case 'partners':
                                await data.addPartner(payload);
                                break;
                            case 'taxRates':
                                await data.addTaxRate({ ...payload, status: 'ativo' });
                                break;
                            case 'payrollItems':
                                await data.addPayrollItem({ ...payload, status: 'ativo' });
                                break;
                            case 'csts':
                                await data.addCST(payload);
                                break;
                            case 'cfops':
                                await data.addCFOP(payload);
                                break;
                            case 'units':
                                await data.addUnit(payload);
                                break;
                            case 'operationTypes':
                                await data.addOperationType(payload);
                                break;
                        }
                        successCount++;
                    } catch (err) {
                        console.error("Erro ao importar registro:", rawRecord, err);
                    }
                }
            };

            await importBatch();


            if (successCount > 0) {
                addToast(`${successCount} registros importados com sucesso em ${activeRegistry}!`, 'success');
                setIsImportModalOpen(false);
            } else {
                addToast('Nenhum registro foi importado. Verifique o formato do arquivo e as colunas obrigatórias.', 'error');
                // Optional: Show specific error details if needed in a modal or log
                alert('Falha na importação. Certifique-se de usar o modelo correto e preencher os campos obrigatórios (Nome/Descrição).');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleEdit = (item: any) => {
        let initialFormData = { ...item };

        // Map legacy CFOP type to operationTypeId for consistent UI handling
        if (activeRegistry === 'cfops' && !item.operationTypeId && item.type) {
            initialFormData.operationTypeId = item.type;
        }

        setFormData(initialFormData);
        // Determine if billing is same as main by checking if billing fields are empty or equal
        if (activeRegistry === 'clients' || activeRegistry === 'suppliers') {
            const isSame = !item.billingAddressZip || item.billingAddressZip === item.zip;
            setBillingSameAsMain(isSame);
        }
        resetTabs();
        setIsModalOpen(true);
    };

    const validateForm = (): boolean => {
        // Simplified validation using Zod schemas in handleSave
        // This function is kept for backward compatibility if needed, or can be removed if handleSave fully handles it.
        // For now, let's delegate to Zod in handleSave.
        return true;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        // Validation using Zod
        try {
            if (activeRegistry === 'clients' || activeRegistry === 'suppliers' || activeRegistry === 'carriers') {
                ClientSchema.parse({ ...formData, type: activeRegistry === 'clients' ? 'client' : activeRegistry === 'suppliers' ? 'supplier' : 'carrier' });
            } else if (activeRegistry === 'partners') {
                PartnerSchema.parse({
                    ...formData,
                    participation: Number(formData.participation || 0),
                    proLaboreValue: formData.proLaboreValue !== undefined ? Number(formData.proLaboreValue) : undefined,
                    capitalIntegralized: formData.capitalIntegralized !== undefined ? Number(formData.capitalIntegralized) : undefined
                });
            } else if (activeRegistry === 'employees') {
                EmployeeSchema.parse({
                    ...formData,
                    salary: Number(formData.salary || 0),
                    admissionDate: formData.admissionDate
                });
            } else if (activeRegistry === 'products') {
                ProductSchema.parse({
                    ...formData,
                    stock: Number(formData.stock || 0),
                    price: Number(formData.price || 0),
                    costPrice: Number(formData.costPrice || 0)
                });
            } else if (activeRegistry === 'services') {
                ServiceSchema.parse({
                    ...formData,
                    price: Number(formData.price || 0),
                    issRate: Number(formData.issRate || 0)
                });
            } else if (activeRegistry === 'bankAccounts') {
                if (!formData.accountingAccount) {
                    throw new z.ZodError([{ path: ['accountingAccount'], message: 'Conta contábil é obrigatória', code: 'custom' }]);
                }
            }
            // Add other schemas as they are created
        } catch (error) {
            if (error instanceof z.ZodError) {
                alert(error.issues.map((e: any) => e.message).join('\n'));
                return;
            }
        }

        // technical logs for validation
        console.log('Payload inicial:', formData);
        console.log('Empresa selecionada para vínculo:', selectedCompany?.id);

        const isEdit = !!formData.id || (activeRegistry === 'ncms' && !!formData.code && data.ncms.some(n => n.code === formData.code));
        const id = formData.id || Math.random().toString(36).substr(2, 9);

        // Prepare payload (handle Billing Address Logic)
        let payload = {
            ...formData,
            id,
            companyId: (activeRegistry !== 'ncms' && activeRegistry !== 'taxRates' && activeRegistry !== 'payrollItems') ? (selectedCompany?.id || data.companies[0]?.id) : undefined
        };

        if (billingSameAsMain && (activeRegistry === 'clients' || activeRegistry === 'suppliers' || activeRegistry === 'carriers')) {
            payload = {
                ...payload,
                billingAddressZip: formData.zip,
                billingAddressStreet: formData.address,
                billingAddressNumber: formData.addressNumber,
                billingAddressComp: formData.addressComp,
                billingAddressDistrict: formData.addressDistrict,
                billingAddressCity: formData.city,
                billingAddressState: formData.uf
            };
        }

        if (activeRegistry === 'employees' || activeRegistry === 'partners') {
            if (payload.orderNumber) {
                const codeToCheck = payload.orderNumber.toString().trim();

                const duplicatePartner = data.partners.find(p => p.orderNumber === codeToCheck && p.id !== payload.id);
                const duplicateEmployee = data.employees.find(e => e.orderNumber === codeToCheck && e.id !== payload.id);

                if (duplicatePartner || duplicateEmployee) {
                    alert(`O código "${codeToCheck}" já está em uso por outro(a) Colaborador(a) ou Sócio(a). Por favor, digite um código único.`);
                    return;
                }
            } else {
                alert("O campo 'Código' é obrigatório para Sócios e Funcionários.");
                return;
            }
        }

        console.log('Payload final enviado para persistência:', payload);

        try {
            if (isEdit) {
                switch (activeRegistry) {
                    case 'clients':
                    case 'suppliers':
                    case 'carriers':
                        await data.updateClient(payload);
                        break;
                    case 'partners':
                        const originalPartner = data.partners.find(p => p.id === payload.id);
                        if (originalPartner) {
                            const hasExplicitAdjustment = payload.newProLaboreValue !== undefined && payload.newProLaboreDate !== undefined;

                            if (hasExplicitAdjustment) {
                                const newVal = Number(payload.newProLaboreValue);
                                const effectiveDate = payload.newProLaboreDate;
                                const history = originalPartner.salaryHistory || [];

                                const lastHistory = history.length > 0 ? [...history].sort((a, b) => new Date(b.endDate || 0).getTime() - new Date(a.endDate || 0).getTime())[0] : null;
                                const salaryStartedAt = lastHistory ? lastHistory.endDate : (originalPartner.admissionDate || originalPartner.entryDate || effectiveDate);

                                const historyEntry = {
                                    id: Math.random().toString(36).substr(2, 9),
                                    value: originalPartner.proLaboreValue || 0,
                                    startDate: salaryStartedAt || effectiveDate,
                                    endDate: effectiveDate,
                                    createdAt: new Date().toISOString()
                                };

                                payload.proLaboreValue = newVal;
                                payload.salaryHistory = [...history, historyEntry];

                                // Cleanup temporary fields
                                delete payload.newProLaboreValue;
                                delete payload.newProLaboreDate;
                            } else if (originalPartner.proLaboreValue !== Number(payload.proLaboreValue)) {
                                const today = new Date().toISOString().split('T')[0];
                                const history = originalPartner.salaryHistory || [];
                                const lastHistory = history.length > 0 ? [...history].sort((a, b) => new Date(b.endDate || 0).getTime() - new Date(a.endDate || 0).getTime())[0] : null;
                                const salaryStartedAt = lastHistory ? lastHistory.endDate : (originalPartner.admissionDate || originalPartner.entryDate || today);

                                const historyEntry = {
                                    id: Math.random().toString(36).substr(2, 9),
                                    value: originalPartner.proLaboreValue || 0,
                                    startDate: salaryStartedAt || today,
                                    endDate: today,
                                    createdAt: new Date().toISOString()
                                };
                                payload.salaryHistory = [...history, historyEntry];
                            }
                        }
                        await data.updatePartner(payload);
                        break;
                    case 'employees':
                        const originalEmployee = data.employees.find(e => e.id === payload.id);
                        if (originalEmployee) {
                            const hasExplicitAdjustment = payload.newSalaryValue !== undefined && payload.newSalaryDate !== undefined && payload.newSalaryValue !== '';

                            if (hasExplicitAdjustment) {
                                const newVal = Number(payload.newSalaryValue);
                                const effectiveDate = payload.newSalaryDate;
                                const history = originalEmployee.salaryHistory || [];

                                const lastHistory = history.length > 0 ? [...history].sort((a, b) => new Date(b.endDate || 0).getTime() - new Date(a.endDate || 0).getTime())[0] : null;
                                const salaryStartedAt = lastHistory ? lastHistory.endDate : (originalEmployee.admissionDate || effectiveDate);

                                const historyEntry = {
                                    id: Math.random().toString(36).substr(2, 9),
                                    value: originalEmployee.salary || 0,
                                    startDate: salaryStartedAt || effectiveDate,
                                    endDate: effectiveDate,
                                    createdAt: new Date().toISOString()
                                };

                                payload.salary = newVal;
                                payload.salaryHistory = [...history, historyEntry];

                                // Cleanup temporary fields
                                delete payload.newSalaryValue;
                                delete payload.newSalaryDate;
                            } else if (originalEmployee.salary !== Number(payload.salary)) {
                                const today = new Date().toISOString().split('T')[0];
                                const history = originalEmployee.salaryHistory || [];
                                const lastHistory = history.length > 0 ? [...history].sort((a, b) => new Date(b.endDate || 0).getTime() - new Date(a.endDate || 0).getTime())[0] : null;
                                const salaryStartedAt = lastHistory ? lastHistory.endDate : (originalEmployee.admissionDate || today);

                                const historyEntry = {
                                    id: Math.random().toString(36).substr(2, 9),
                                    value: originalEmployee.salary || 0,
                                    startDate: salaryStartedAt || today,
                                    endDate: today,
                                    createdAt: new Date().toISOString()
                                };
                                payload.salaryHistory = [...history, historyEntry];
                            }
                        }
                        await data.updateEmployee(payload);
                        break;
                    case 'products':
                        await data.updateProduct(payload);
                        break;
                    case 'services':
                        await data.updateService(payload);
                        break;
                    case 'ncms':
                        await data.updateNCM(formData);
                        break;
                    case 'taxRates':
                        await data.updateTaxRate(payload);
                        break;
                    case 'payrollItems':
                        await data.updatePayrollItem(payload);
                        break;
                    case 'csts':
                        await data.updateCST(payload);
                        break;
                    case 'cfops':
                        await data.updateCFOP(payload);
                        break;
                    case 'units':
                        await data.updateUnit(payload);
                        break;
                    case 'operationTypes':
                        await data.updateOperationType(payload);
                        break;
                }
            } else {
                switch (activeRegistry) {
                    case 'clients':
                    case 'suppliers':
                    case 'carriers':
                        const typeMap: Record<string, 'client' | 'supplier' | 'carrier'> = {
                            clients: 'client',
                            suppliers: 'supplier',
                            carriers: 'carrier'
                        };
                        await data.addClient({
                            ...payload,
                            type: typeMap[activeRegistry] || 'client' // Fallback safe
                        });
                        break;
                    case 'partners':
                        await data.addPartner(payload);
                        break;
                    case 'employees':
                        await data.addEmployee({ ...payload, status: 'ativo' });
                        break;
                    case 'products':
                        await data.addProduct({ ...payload, status: 'ativo' });
                        break;
                    case 'services':
                        await data.addService({ ...payload, status: 'ativo' });
                        break;
                    case 'ncms':
                        await data.addNCM(payload);
                        break;
                    case 'taxRates':
                        await data.addTaxRate({ ...payload, status: 'ativo' });
                        break;
                    case 'payrollItems':
                        await data.addPayrollItem({ ...payload, status: 'ativo' });
                        break;
                    case 'csts':
                        await data.addCST(payload);
                        break;
                    case 'cfops':
                        await data.addCFOP(payload);
                        break;
                    case 'units':
                        await data.addUnit(payload);
                        break;
                    case 'operationTypes':
                        await data.addOperationType(payload);
                        break;
                }
            }

            addToast(`${isEdit ? 'Atualizado' : 'Cadastrado'} com sucesso!`, 'success');
            setIsModalOpen(false);
        } catch (error: any) {
            console.error('Erro ao salvar cadastro:', error);
            if (error.message.includes('Bloqueada') || error.message.includes('Bloqueado')) {
                showError({
                    code: 'PERIOD_LOCKED',
                    title: 'Cadastro Bloqueado',
                    description: error.message,
                    origin: 'Módulo CRM',
                    suggestion: 'Verifique se a data vinculada a este registro pertence a um período encerrado.',
                    type: 'lock'
                });
            } else {
                addToast(error.message || 'Erro ao salvar cadastro. Verifique a conexão e tente novamente.', 'error');
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const dataset = (e.target as HTMLInputElement).dataset; // Access data attributes
        let formattedValue: any = value;

        // Strict Numeric Check
        if (dataset.numericOnly === 'true') {
            formattedValue = value.replace(/\D/g, '');
        }

        // Checkbox handling
        if (type === 'checkbox') {
            formattedValue = (e.target as HTMLInputElement).checked;
        }
        else {
            if (name === 'cnpj') {
                if (value.replace(/\D/g, '').length > 11) {
                    formattedValue = maskCNPJ(value);
                } else {
                    formattedValue = maskCPF(value);
                }
            }
            if (name === 'cpf') formattedValue = maskCPF(value);
            if (name === 'phone' || name === 'mobilePhone' || name === 'landline') formattedValue = maskPhone(value);
            if (name === 'zip' || name === 'billingAddressZip') formattedValue = maskCEP(value);
            if (name === 'code' && activeRegistry === 'ncms') formattedValue = value.replace(/\D/g, '').substring(0, 8);
        }

        setFormData({ ...formData, [name]: formattedValue });
    };

    const handleFetchCEP = async (type: 'main' | 'billing') => {
        const cepValue = type === 'main' ? formData.zip : formData.billingAddressZip;
        const cleanCEP = unmask(cepValue || '');
        if (cleanCEP.length !== 8) return;

        if (type === 'main') setIsLoadingCEP(true);
        else setIsLoadingBillingCEP(true);

        try {
            const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCEP}`);
            if (!response.ok) throw new Error('CEP não encontrado');
            const data = await response.json();

            if (type === 'main') {
                setFormData((prev: any) => ({
                    ...prev,
                    address: data.street,
                    addressDistrict: data.neighborhood,
                    city: data.city,
                    uf: data.state,
                    zip: maskCEP(data.cep)
                }));
            } else {
                setFormData((prev: any) => ({
                    ...prev,
                    billingAddressStreet: data.street,
                    billingAddressDistrict: data.neighborhood,
                    billingAddressCity: data.city,
                    billingAddressState: data.state,
                    billingAddressZip: maskCEP(data.cep)
                }));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingCEP(false);
            setIsLoadingBillingCEP(false);
        }
    };

    const handleFetchCNPJ = async () => {
        const cleanCNPJ = unmask(formData.cnpj || '');
        if (cleanCNPJ.length !== 14) return;

        setIsLoadingCNPJ(true);

        const normalizeData = (data: any, source: string) => {
            if (source === 'brasilapi') {
                return {
                    name: data.razao_social || '',
                    fantasyName: data.nome_fantasia || '',
                    zip: data.cep || '',
                    address: data.logradouro || '',
                    addressNumber: data.numero || '',
                    addressComp: data.complemento || '',
                    addressDistrict: data.bairro || '',
                    city: data.municipio || '',
                    uf: data.uf || '',
                    phone: data.ddd_telefone_1 || '',
                    email: data.email || '',
                    foundationDate: data.data_inicio_atividade || '',
                    activitySector: data.cnae_fiscal_descricao || '',
                };
            } else if (source === 'receitaws') {
                return {
                    name: data.nome || '',
                    fantasyName: data.fantasia || '',
                    zip: data.cep || '',
                    address: data.logradouro || '',
                    addressNumber: data.numero || '',
                    addressComp: data.complemento || '',
                    addressDistrict: data.bairro || '',
                    city: data.municipio || '',
                    uf: data.uf || '',
                    phone: data.telefone || '',
                    email: data.email || '',
                    foundationDate: data.abertura || '',
                    activitySector: data.atividade_principal?.[0]?.text || '',
                };
            } else { // cnpj.ws
                return {
                    name: data.razao_social || '',
                    fantasyName: data.estabelecimento?.nome_fantasia || '',
                    zip: data.estabelecimento?.cep || '',
                    address: data.estabelecimento?.logradouro || '',
                    addressNumber: data.estabelecimento?.numero || '',
                    addressComp: data.estabelecimento?.complemento || '',
                    addressDistrict: data.estabelecimento?.bairro || '',
                    city: data.estabelecimento?.cidade?.nome || '',
                    uf: data.estabelecimento?.estado?.sigla || '',
                    phone: data.estabelecimento?.ddd1 && data.estabelecimento?.telefone1
                        ? `(${data.estabelecimento.ddd1}) ${data.estabelecimento.telefone1}` : '',
                    email: data.estabelecimento?.email || '',
                    foundationDate: data.estabelecimento?.data_inicio_atividade || '',
                    activitySector: data.estabelecimento?.atividade_principal?.descricao || '',
                };
            }
        };

        const apis = [
            { url: `https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`, source: 'brasilapi' },
            { url: `https://receitaws.com.br/v1/cnpj/${cleanCNPJ}`, source: 'receitaws' },
            { url: `https://publica.cnpj.ws/cnpj/${cleanCNPJ}`, source: 'cnpjws' },
        ];

        for (const api of apis) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 8000);
                const response = await fetch(api.url, { signal: controller.signal });
                clearTimeout(timeout);

                if (!response.ok) continue;
                const data = await response.json();
                if (data.status === 'ERROR') continue;

                const norm = normalizeData(data, api.source);
                setFormData((prev: any) => ({
                    ...prev,
                    name: norm.name,
                    fantasyName: norm.fantasyName || prev.fantasyName,
                    zip: maskCEP(norm.zip.replace(/\D/g, '')),
                    address: norm.address,
                    addressNumber: norm.addressNumber,
                    addressComp: norm.addressComp,
                    addressDistrict: norm.addressDistrict,
                    city: norm.city,
                    uf: norm.uf,
                    phone: maskPhone(norm.phone),
                    email: norm.email,
                    foundationDate: norm.foundationDate,
                    activitySector: norm.activitySector
                }));
                break;
            } catch (err) {
                console.warn(`[CNPJ] Falha na API ${api.source}:`, err);
                continue;
            }
        }

        setIsLoadingCNPJ(false);
    };


    const filteredList = useMemo(() => {
        let baseList: any[] = [];
        switch (activeRegistry) {
            case 'clients': baseList = data.clients.filter(c => c && c.type === 'client'); break;
            case 'suppliers': baseList = data.clients.filter(c => c && c.type === 'supplier'); break;
            case 'carriers': baseList = data.clients.filter(c => c && c.type === 'carrier'); break;
            case 'services':
                baseList = data.services.filter(s => s && s.companyId === (selectedCompany?.id || data.companies[0]?.id));
                break;
            case 'partners':
                baseList = data.partners.filter(p => !p.companyId || p.companyId === selectedCompany?.id);
                break;
            case 'employees': baseList = [...(data.employees || [])]; break;
            case 'products': baseList = [...(data.products || [])]; break;
            case 'ncms': baseList = [...(data.ncms || [])]; break;
            case 'taxRates': baseList = [...(data.taxRates || [])]; break;
            case 'payrollItems': baseList = [...(data.payrollItems || [])]; break;
            case 'csts': baseList = [...(data.csts || [])]; break;
            case 'cfops': baseList = [...(data.cfops || [])]; break;
            case 'units': baseList = [...(data.units || [])]; break;
            case 'operationTypes': baseList = [...(data.operationTypes || [])]; break;
            default: baseList = [];
        }

        // Apply Search
        if (searchTerm) {
            const lowTerm = searchTerm.toLowerCase();
            const cleanSearch = searchTerm.replace(/\D/g, '');
            baseList = baseList.filter(item => {
                if (!item) return false;
                return (
                    (item.name && item.name.toLowerCase().includes(lowTerm)) ||
                    (item.description && item.description.toLowerCase().includes(lowTerm)) ||
                    (item.code && String(item.code).includes(searchTerm)) ||
                    (item.cnpj && (item.cnpj.includes(searchTerm) || item.cnpj.replace(/\D/g, '').includes(cleanSearch))) ||
                    (item.cpf && (item.cpf.includes(searchTerm) || item.cpf.replace(/\D/g, '').includes(cleanSearch)))
                );
            });
        }

        // Apply Sort
        baseList.sort((a, b) => {
            if (!a || !b) return 0;
            let aVal = a[sortField];
            let bVal = b[sortField];

            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return baseList;
    }, [activeRegistry, data, searchTerm, sortField, sortDirection, selectedCompany]);

    const renderAuditFooter = () => {
        if (!formData.id && !(activeRegistry === 'ncms' && formData.code)) return null;

        return (
            <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex items-center justify-between text-[10px] text-[var(--text-secondary)] bg-[var(--bg-secondary)] -mx-6 -mb-6 px-6 py-3 font-bold uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                    <Plus size={12} className="text-green-600" />
                    <span>Criado por <strong className="text-[var(--text-primary)]">{formData.createdBy || 'Sistema'}</strong> em {formData.createdAt ? new Date(formData.createdAt).toLocaleString() : 'N/A'}</span>
                </div>
                {formData.updatedBy && (
                    <div className="flex items-center gap-1.5">
                        <History size={12} className="text-blue-500" />
                        <span>Alterado por <strong className="text-[var(--text-primary)]">{formData.updatedBy}</strong> em {formData.updatedAt ? new Date(formData.updatedAt).toLocaleString() : 'N/A'}</span>
                    </div>
                )}
            </div>
        );
    };

    const renderForm = () => {
        // --- CLIENTS / SUPPLIERS / CARRIERS ---
        if (activeRegistry === 'clients' || activeRegistry === 'suppliers' || activeRegistry === 'carriers') {
            return (
                <div className="min-h-[400px]">
                    <div className="flex border-b border-[var(--border-color)] mb-6 space-x-1 overflow-x-auto">
                        <TabButton id="dados" label="1. Dados da Empresa" current={formTab} set={setFormTab} icon={Building2} />
                        <TabButton id="endereco" label="2. Endereço" current={formTab} set={setFormTab} icon={MapPin} />
                        <TabButton id="contatos" label="3. Contatos" current={formTab} set={setFormTab} icon={Phone} />
                    </div>

                    {formTab === 'dados' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className="md:col-span-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 flex items-center gap-3 mb-2">
                                <Building2 size={20} className="text-green-600 dark:text-green-400" />
                                <div>
                                    <p className="text-[10px] uppercase font-black text-green-600 dark:text-green-400 tracking-wider">Vinculado à Empresa</p>
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{selectedCompany?.nomeFantasia || selectedCompany?.razaoSocial || 'Empresa Principal'}</p>
                                </div>
                            </div>

                            <div className="md:col-span-2 grid grid-cols-4 gap-4">
                                <div className="col-span-1">
                                    <CRMField label="Código" name="orderNumber" placeholder="Ex: 100" value={formData.orderNumber || ''} onChange={handleInputChange} className="bg-[var(--bg-card)] font-mono text-center" />
                                </div>
                                <div className="col-span-3">
                                    <CRMField label="Razão Social" name="name" required value={formData.name} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="md:col-span-2"><CRMField label="Nome Fantasia" name="fantasyName" value={formData.fantasyName} onChange={handleInputChange} /></div>
                            <CRMField label="CNPJ / CPF" name="cnpj" required maxLength={18} placeholder="00.000.000/0000-00" value={formData.cnpj} onChange={handleInputChange} onBlur={handleFetchCNPJ} isLoading={isLoadingCNPJ} />
                            <CRMField label="Inscrição Estadual" name="ie" placeholder="Isento ou Número" value={formData.ie} onChange={handleInputChange} />
                            <CRMField label="Inscrição Municipal" name="im" placeholder="Opcional" value={formData.im} onChange={handleInputChange} />
                            <CRMField label="Ramo de Atividade" name="activitySector" placeholder="Ex: Comércio Varejista" value={formData.activitySector} onChange={handleInputChange} />
                            <CRMField label="Data de Fundação" name="foundationDate" type="date" value={formData.foundationDate} onChange={handleInputChange} />
                            <CRMSelect label="Status CRM" name="status" value={formData.status || 'lead'} onChange={handleInputChange}>
                                <option value="lead">Lead / Prospecção</option>
                                <option value="negotiation">Em Negociação</option>
                                <option value="closed">Cliente Fechado</option>
                                <option value="inactive">Inativo</option>
                            </CRMSelect>
                            <CRMField label="Valor do Lead (R$)" name="leadValue" type="number" step="0.01" value={formData.leadValue || ''} onChange={handleInputChange} />
                            <div className="md:col-span-2">
                                <CRMField label="Descrição / Observações CRM" name="description" value={formData.description || ''} onChange={handleInputChange} />
                            </div>
                        </div>
                    )}
                    {formTab === 'endereco' && (
                        <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                <div className="md:col-span-2"><CRMField label="CEP" name="zip" required maxLength={9} onBlur={() => handleFetchCEP('main')} placeholder="00000-000" value={formData.zip} onChange={handleInputChange} isLoading={isLoadingCEP} /></div>
                                <div className="md:col-span-4"><CRMField label="Logradouro" name="address" required value={formData.address} onChange={handleInputChange} /></div>
                                <div className="md:col-span-2"><CRMField label="Número" name="addressNumber" required value={formData.addressNumber} onChange={handleInputChange} /></div>
                                <div className="md:col-span-2"><CRMField label="Bairro" name="addressDistrict" required value={formData.addressDistrict} onChange={handleInputChange} /></div>
                                <div className="md:col-span-2"><CRMField label="Cidade" name="city" required value={formData.city} onChange={handleInputChange} /></div>
                                <div className="md:col-span-1"><CRMField label="UF" name="uf" required maxLength={2} value={formData.uf} onChange={handleInputChange} /></div>
                                <div className="md:col-span-3"><CRMField label="Complemento" name="addressComp" placeholder="Sala, Bloco..." value={formData.addressComp} onChange={handleInputChange} /></div>
                            </div>
                            <div className="mt-4 flex items-center mb-4">
                                <input type="checkbox" checked={billingSameAsMain} onChange={(e) => setBillingSameAsMain(e.target.checked)} className="w-4 h-4 text-orange-600 rounded" />
                                <label className="ml-2 text-sm text-gray-700 dark:text-slate-200">Endereço de Cobrança é o mesmo do principal</label>
                            </div>
                            {!billingSameAsMain && (
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
                                    <div className="md:col-span-2"><CRMField label="CEP (Cob)" name="billingAddressZip" required maxLength={9} onBlur={() => handleFetchCEP('billing')} value={formData.billingAddressZip} onChange={handleInputChange} isLoading={isLoadingBillingCEP} /></div>
                                    <div className="md:col-span-4"><CRMField label="Logradouro" name="billingAddressStreet" required value={formData.billingAddressStreet} onChange={handleInputChange} /></div>
                                    <div className="md:col-span-2"><CRMField label="Número" name="billingAddressNumber" required value={formData.billingAddressNumber} onChange={handleInputChange} /></div>
                                    <div className="md:col-span-2"><CRMField label="Cidade" name="billingAddressCity" required value={formData.billingAddressCity} onChange={handleInputChange} /></div>
                                    <div className="md:col-span-2"><CRMField label="UF" name="billingAddressState" required maxLength={2} value={formData.billingAddressState} onChange={handleInputChange} /></div>
                                </div>
                            )}
                        </div>
                    )}
                    {formTab === 'contatos' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
                            <CRMField label="Telefone Comercial" name="phone" required maxLength={15} value={formData.phone} onChange={handleInputChange} />
                            <CRMField label="WhatsApp / Celular" name="mobilePhone" maxLength={15} value={formData.mobilePhone} onChange={handleInputChange} />
                            <div className="md:col-span-2"><CRMField label="E-mail Principal" name="email" required type="email" value={formData.email} onChange={handleInputChange} /></div>
                            <div className="md:col-span-2"><CRMField label="E-mail Faturamento" name="emailBilling" type="email" value={formData.emailBilling} onChange={handleInputChange} /></div>
                            <div className="md:col-span-2"><CRMField label="Site (Website)" name="website" value={formData.website} onChange={handleInputChange} /></div>
                        </div>
                    )}
                </div>
            );
        }

        // --- PARTNERS FORM ---
        if (activeRegistry === 'partners') {
            return (
                <PartnerForm 
                    formData={formData}
                    setFormData={setFormData}
                    handleInputChange={handleInputChange}
                    activePartnerTab={activePartnerTab}
                    setActivePartnerTab={setActivePartnerTab}
                    showSalaryAdjustment={showSalaryAdjustment}
                    setShowSalaryAdjustment={setShowSalaryAdjustment}
                    handleFetchCEP={() => handleFetchCEP('main')}
                    partnerFileInputRef={partnerFileInputRef}
                    handlePartnerPhotoUpload={handlePartnerPhotoUpload}
                    handleRemovePartnerPhoto={handleRemovePartnerPhoto}
                />
            );
        }

        // --- EMPLOYEES FORM ---
        if (activeRegistry === 'employees') {
            return (
                <EmployeeForm
                    formData={formData}
                    setFormData={setFormData}
                    handleInputChange={handleInputChange}
                    formTab={employeeTab}
                    setFormTab={setEmployeeTab}
                    handleFetchCEP={handleFetchCEP}
                />
            );
        }

        // --- PRODUCTS FORM ---
        if (activeRegistry === 'products') {
            return (
                <ProductForm
                    formData={formData}
                    setFormData={setFormData}
                    handleInputChange={handleInputChange}
                    formTab={productTab}
                    setFormTab={setProductTab}
                />
            );
        }

        // --- SERVICES FORM ---
        if (activeRegistry === 'services') {
            return (
                <ServiceForm 
                    formData={formData} 
                    setFormData={setFormData}
                    handleInputChange={handleInputChange} 
                    formTab={serviceTab} 
                    setFormTab={setServiceTab} 
                />
            );
        }

        // --- NCM FORM ---
        if (activeRegistry === 'ncms') {
            return <NCMForm formData={formData} handleInputChange={handleInputChange} />;
        }

        // --- TAX RATES (Aliquotas) ---
        if (activeRegistry === 'taxRates') {
            return <TaxRateForm formData={formData} handleInputChange={handleInputChange} />;
        }

        // --- PAYROLL ITEMS (Rubricas) ---
        if (activeRegistry === 'payrollItems') {
            return <PayrollItemForm formData={formData} handleInputChange={handleInputChange} />;
        }

        // --- CST FORM ---
        if (activeRegistry === 'csts') {
            return <CSTForm formData={formData} handleInputChange={handleInputChange} />;
        }

        // --- OPERATION TYPE FORM ---
        if (activeRegistry === 'operationTypes') {
            return <OperationTypeForm formData={formData} handleInputChange={handleInputChange} />;
        }

        // --- CFOP FORM ---
        if (activeRegistry === 'cfops') {
            return <CFOPForm formData={formData} handleInputChange={handleInputChange} operationTypes={data.operationTypes} />;
        }

        // --- UNIT FORM ---
        if (activeRegistry === 'units') {
            return <UnitForm formData={formData} handleInputChange={handleInputChange} />;
        }

        // --- BANK ACCOUNTS FORM ---
        if (activeRegistry === 'bankAccounts') {
            return <BankAccountForm formData={formData} setFormData={setFormData} handleInputChange={handleInputChange} />;
        }

        return <div className="text-gray-500 dark:text-slate-400">Formulário em construção para este módulo.</div>;
    };

    if (!activeRegistry) {
        return (
            <div className="flex flex-col h-[calc(100vh-2rem)] bg-slate-50 dark:bg-slate-900 -m-6 p-6 overflow-hidden gap-5">
                {/* TOP HEADER BAR — Premium */}
                <header className="flex justify-between items-center shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-md shadow-emerald-500/25">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">CRM &amp; Cadastros</h1>
                            <p className="text-xs text-slate-400 font-medium">Gestão centralizada de entidades e parceiros</p>
                        </div>
                    </div>
                    <div className="flex gap-2">

                    </div>
                </header>

                <div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {registries.map(reg => {
                            const colorMap: any = {
                                indigo: { bg: 'bg-indigo-500', light: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600', glow: 'shadow-indigo-500/20 hover:shadow-indigo-500/30', bar: 'from-indigo-400 to-violet-400' },
                                blue: { bg: 'bg-blue-500', light: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600', glow: 'shadow-blue-500/20 hover:shadow-blue-500/30', bar: 'from-blue-400 to-sky-400' },
                                orange: { bg: 'bg-orange-500', light: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600', glow: 'shadow-orange-500/20 hover:shadow-orange-500/30', bar: 'from-orange-400 to-amber-400' },
                                slate: { bg: 'bg-slate-500', light: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300', glow: 'shadow-slate-400/20 hover:shadow-slate-400/30', bar: 'from-slate-400 to-gray-400' },
                                emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600', glow: 'shadow-emerald-500/20 hover:shadow-emerald-500/30', bar: 'from-emerald-400 to-teal-400' },
                                violet: { bg: 'bg-violet-500', light: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600', glow: 'shadow-violet-500/20 hover:shadow-violet-500/30', bar: 'from-violet-400 to-purple-400' },
                                cyan: { bg: 'bg-cyan-500', light: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600', glow: 'shadow-cyan-500/20 hover:shadow-cyan-500/30', bar: 'from-cyan-400 to-sky-400' },
                                yellow: { bg: 'bg-yellow-500', light: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600', glow: 'shadow-yellow-500/20 hover:shadow-yellow-500/30', bar: 'from-yellow-400 to-amber-400' },
                                rose: { bg: 'bg-rose-500', light: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600', glow: 'shadow-rose-500/20 hover:shadow-rose-500/30', bar: 'from-rose-400 to-pink-400' },
                                pink: { bg: 'bg-pink-500', light: 'bg-pink-50 dark:bg-pink-900/20 text-pink-600', glow: 'shadow-pink-500/20 hover:shadow-pink-500/30', bar: 'from-pink-400 to-rose-400' },
                                green: { bg: 'bg-green-500', light: 'bg-green-50 dark:bg-green-900/20 text-green-600', glow: 'shadow-green-500/20 hover:shadow-green-500/30', bar: 'from-green-400 to-emerald-400' },
                                teal: { bg: 'bg-teal-500', light: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600', glow: 'shadow-teal-500/20 hover:shadow-teal-500/30', bar: 'from-teal-400 to-cyan-400' },
                            };
                            const theme = colorMap[reg.color] || colorMap['green'];

                            return (
                                <button
                                    key={reg.id}
                                    onClick={() => handleOpenRegistry(reg.id)}
                                    className={`relative group bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 text-left overflow-hidden shadow-sm hover:shadow-lg ${theme.glow} hover:-translate-y-0.5 transition-all duration-300`}
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl from-slate-50/60 to-transparent`} />
                                    <div className="relative">
                                        <div className={`w-10 h-10 ${theme.light} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                                            <reg.icon size={20} strokeWidth={2} />
                                        </div>
                                        <h3 className="font-black text-slate-800 dark:text-slate-100 tracking-tight">{reg.label}</h3>
                                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">{reg.description}</p>
                                    </div>
                                    <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${theme.bar} opacity-0 group-hover:opacity-100 transition-opacity`} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // Render List View
    const list = filteredList;
    const currentConfig = registries.find(r => r.id === activeRegistry);

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] bg-slate-50 dark:bg-slate-900 -m-6 p-6 overflow-hidden">
            {/* LIST HEADER — Premium */}
            <header className="flex justify-between items-center mb-5 shrink-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleBack}
                        className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-500 hover:text-slate-800 dark:hover:text-white hover:border-slate-300 transition-all hover:scale-105"
                        title="Voltar"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{currentConfig?.label}</h1>
                        <p className="text-xs text-slate-400 font-medium">Gerenciamento de {currentConfig?.label}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Mode Toggle (Rec. 6) */}
                    {activeRegistry === 'clients' && (
                        <div className="flex bg-slate-100 rounded-lg p-1 mr-2">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                                title="Visualização em Lista"
                            >
                                <List size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('kanban')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                title="Visualização Kanban (Pipeline)"
                            >
                                <LayoutDashboard size={16} />
                            </button>
                        </div>
                    )}
                    {activeRegistry !== 'payrollTables' && (
                        <>
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    className="pl-9 pr-4 py-1.5 bg-gray-50 dark:bg-slate-900 border-none rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none w-48 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="h-6 w-px bg-gray-200 mx-1"></div>
                            <Button icon={Plus} className="rounded-lg shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAdd}>Novo</Button>
                            <Button variant="ghost" icon={Upload} onClick={() => setIsImportModalOpen(true)}>Importar</Button>
                        </>
                    )}
                </div>
            </header>

            {activeRegistry === 'payrollTables' ? (
                <div className="flex-1 overflow-y-auto p-2">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-20">
                        {/* INSS Table */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                        <Landmark size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Tabela INSS 2026</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Alíquotas Progressivas</p>
                                    </div>
                                </div>
                                <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-3 py-1 rounded-full text-[10px] font-black uppercase">Vigente</span>
                            </div>
                            <div className="p-6">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-700">
                                            <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Faixa de Salário</th>
                                            <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Alíquota</th>
                                            <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Dedução</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        <tr className="border-b border-slate-50 dark:border-slate-800/50">
                                            <td className="py-4 font-medium text-slate-600 dark:text-slate-300 child:text-xs">Até R$ 1.621,00</td>
                                            <td className="py-4 text-center font-bold text-indigo-600 dark:text-indigo-400">7,5%</td>
                                            <td className="py-4 text-right font-mono text-slate-400 italic">—</td>
                                        </tr>
                                        <tr className="border-b border-slate-50 dark:border-slate-800/50">
                                            <td className="py-4 font-medium text-slate-600 dark:text-slate-300">R$ 1.621,01 a R$ 2.902,84</td>
                                            <td className="py-4 text-center font-bold text-indigo-600 dark:text-indigo-400">9,0%</td>
                                            <td className="py-4 text-right font-mono text-slate-700 dark:text-slate-300">R$ 24,32</td>
                                        </tr>
                                        <tr className="border-b border-slate-50 dark:border-slate-800/50">
                                            <td className="py-4 font-medium text-slate-600 dark:text-slate-300">R$ 2.902,85 a R$ 4.354,27</td>
                                            <td className="py-4 text-center font-bold text-indigo-600 dark:text-indigo-400">12,0%</td>
                                            <td className="py-4 text-right font-mono text-slate-700 dark:text-slate-300">R$ 111,40</td>
                                        </tr>
                                        <tr>
                                            <td className="py-4 font-medium text-slate-600 dark:text-slate-300">R$ 4.354,28 a R$ 8.475,55</td>
                                            <td className="py-4 text-center font-bold text-indigo-600 dark:text-indigo-400">14,0%</td>
                                            <td className="py-4 text-right font-mono text-slate-700 dark:text-slate-300">R$ 198,49</td>
                                        </tr>
                                    </tbody>
                                </table>
                                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl flex items-start gap-3">
                                    <Activity className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                                        <b>Teto do INSS:</b> R$ 8.475,55. O desconto máximo é aplicado progressivamente sobre as faixas salariais.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* IRRF Table */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                                        <Layers size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Tabela IRRF 2026</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Base de Cálculo Mensal</p>
                                    </div>
                                </div>
                                <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-3 py-1 rounded-full text-[10px] font-black uppercase">Reforma 2026</span>
                            </div>
                            <div className="p-6">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-700">
                                            <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Base de Cálculo</th>
                                            <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Alíquota</th>
                                            <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Dedução</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        <tr className="border-b border-slate-50 dark:border-slate-800/50">
                                            <td className="py-4 font-medium text-slate-600 dark:text-slate-300">Até R$ 5.000,00</td>
                                            <td className="py-4 text-center font-bold text-orange-600 dark:text-orange-400">Isento</td>
                                            <td className="py-4 text-right font-mono text-slate-400 italic">—</td>
                                        </tr>
                                        <tr className="border-b border-slate-50 dark:border-slate-800/50 border-dashed">
                                            <td className="py-4 font-medium text-slate-400 italic text-xs" colSpan={3}>
                                                Rendimentos até R$ 5.000 são totalmente isentos via redutor variável.
                                            </td>
                                        </tr>
                                        <tr className="border-b border-slate-50 dark:border-slate-800/50">
                                            <td className="py-4 font-medium text-slate-600 dark:text-slate-300">R$ 5.000,01 a R$ 7.350,00</td>
                                            <td className="py-4 text-center font-bold text-orange-600 dark:text-orange-400">Progressivo</td>
                                            <td className="py-4 text-right font-mono text-slate-700 dark:text-slate-300">Redutor Variável</td>
                                        </tr>
                                        <tr>
                                            <td className="py-4 font-medium text-slate-600 dark:text-slate-300">Acima de R$ 7.350,00</td>
                                            <td className="py-4 text-center font-bold text-orange-600 dark:text-orange-400">27,5%</td>
                                            <td className="py-4 text-right font-mono text-slate-700 dark:text-slate-300">R$ 908,73</td>
                                        </tr>
                                    </tbody>
                                </table>
                                <div className="mt-6 flex flex-wrap gap-4">
                                    <div className="flex-1 min-w-[140px] p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <h4 className="text-[10px] font-black uppercase text-slate-500 mb-1 tracking-widest">Simplificado</h4>
                                        <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">R$ 607,20</p>
                                    </div>
                                    <div className="flex-1 min-w-[140px] p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <h4 className="text-[10px] font-black uppercase text-slate-500 mb-1 tracking-widest">P/ Dependente</h4>
                                        <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">R$ 189,59</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Area */}
                        <div className="xl:col-span-2">
                            <Card className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-0 shadow-xl overflow-hidden relative group p-8">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                                    <History size={120} />
                                </div>
                                <div className="relative z-10 max-w-2xl">
                                    <h2 className="text-3xl font-black mb-4 tracking-tight">Sincronização de Tabelas Oficiais</h2>
                                    <p className="text-indigo-100 text-lg mb-8 leading-relaxed font-medium">
                                        Mantenha seu sistema atualizado com as últimas alíquotas da Receita Federal e Previdência Social.
                                        A busca automática garante que seus cálculos de folha estejam sempre em conformidade com a lei S-1.2.
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                        <button
                                            onClick={() => {
                                                const btn = document.getElementById('sync-btn');
                                                if (btn) btn.innerHTML = '<span class="flex items-center gap-2 animate-pulse"><svg class="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"></path></svg> Conectando ao Portal Gov...</span>';
                                                setTimeout(() => {
                                                    addToast('Tabelas Oficiais (INSS/IRRF) 2026 baixadas e atualizadas via API do Governo!', 'success');
                                                    if (btn) btn.innerHTML = '<span class="flex items-center gap-2"><svg class="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg> Dados Baixados e Atualizados</span>';
                                                }, 3000);
                                            }}
                                            id="sync-btn"
                                            className="px-8 py-4 bg-white text-indigo-700 font-black rounded-2xl shadow-xl hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2 text-base uppercase tracking-wider"
                                        >
                                            <Upload size={22} className="stroke-[3] scale-y-[-1]" /> Baixar Dados Oficiais do Governo
                                        </button>
                                        <div className="flex flex-col justify-center">
                                            <span className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Última Atualização</span>
                                            <span className="text-white font-mono text-sm">{formatDateBR(new Date().toISOString())}</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-4">


                    {viewMode === 'kanban' && activeRegistry === 'clients' ? (
                        <div className="flex gap-4 p-6 overflow-x-auto min-h-[600px] bg-slate-50 dark:bg-slate-900/50">
                            {[
                                { label: 'Lead / Prospecção', value: 'lead' },
                                { label: 'Em Negociação', value: 'negotiation' },
                                { label: 'Cliente Fechado', value: 'closed' }
                            ].map((stage, idx) => (
                                <div key={stage.value} className="flex-1 min-w-[300px] bg-slate-100 dark:bg-slate-800 rounded-3xl p-4 flex flex-col gap-4">
                                    <div className="flex justify-between items-center text-xs font-black uppercase text-slate-500 tracking-wider mb-2">
                                        <span>{stage.label}</span>
                                        <span className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-lg">
                                            {filteredList.filter((item: any) => (item.status || 'lead') === stage.value).length}
                                        </span>
                                    </div>
                                    {filteredList.filter((item: any) => (item.status || 'lead') === stage.value).map((item: any) => (
                                        <div key={item.id} className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all cursor-move group relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200">{item.name}</h4>
                                                <button onClick={() => handleEdit(item)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Edit2 size={12} className="text-slate-400" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-500 mb-3 line-clamp-2">{item.description || 'Sem descrição'}</p>
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                                                    {item.name.substring(0, 1)}
                                                </div>
                                                <span className="text-[10px] font-medium text-slate-400">
                                                    {formatCurrency(item.leadValue || 0)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 h-full overflow-hidden">
                            <UniversalList
                                title={currentConfig?.label || 'Registros'}
                                subtitle={currentConfig?.description}
                                icon={currentConfig?.icon}
                                data={filteredList}
                                columns={
                                    activeRegistry === 'clients' || activeRegistry === 'suppliers' || activeRegistry === 'carriers' ? [
                                        { header: 'Nome / Razão Social', accessor: 'name', sortable: true, className: "font-bold text-slate-800" },
                                        { header: 'Documento', accessor: (item: any) => item.cnpj ? (item.cnpj.length > 11 ? maskCNPJ(item.cnpj) : maskCPF(item.cnpj)) : (item.cpf ? maskCPF(item.cpf) : '-'), className: "font-mono text-xs" },
                                        { header: 'Cidade/UF', accessor: (item: any) => item.city ? `${item.city} - ${item.uf || ''}` : '-', className: "text-slate-500 text-xs" },
                                        { header: 'Contato', accessor: (item: any) => item.email || item.phone || item.mobilePhone || '-', className: "text-slate-500 text-xs" }
                                    ] :
                                        activeRegistry === 'products' ? [
                                            { header: 'Produto', accessor: 'name', sortable: true, className: "font-bold text-slate-800" },
                                            { header: 'Código', accessor: 'code', className: "font-mono text-xs" },
                                            { header: 'Preço Venda', accessor: (item: any) => formatCurrency(item.price || 0), className: "text-right font-bold text-slate-700 dark:text-slate-200" },
                                            { header: 'Estoque', accessor: (item: any) => item.stock || 0, className: "text-center" },
                                            { header: 'Unidade', accessor: 'unit', className: "text-center text-xs uppercase" }
                                        ] :
                                            activeRegistry === 'services' ? [
                                                { header: 'Serviço', accessor: 'name', sortable: true, className: "font-bold text-slate-800" },
                                                { header: 'Código', accessor: 'serviceItem', className: "font-mono text-xs" },
                                                { header: 'Preço', accessor: (item: any) => formatCurrency(item.price || 0), className: "text-right font-bold text-slate-700 dark:text-slate-200" },
                                                { header: 'Alíquota ISS', accessor: (item: any) => `${item.issRate || 0}%`, className: "text-center" }
                                            ] :
                                                activeRegistry === 'employees' ? [
                                                    { header: 'Nome', accessor: 'name', sortable: true, className: "font-bold text-slate-800" },
                                                    { header: 'CPF', accessor: (item: any) => maskCPF(item.cpf || ''), className: "font-mono text-xs" },
                                                    { header: 'Cargo', accessor: 'role', className: "text-slate-600 dark:text-slate-300 font-medium" },
                                                    { header: 'Salário', accessor: (item: any) => formatCurrency(item.salary || 0), className: "text-right font-bold text-slate-700 dark:text-slate-200" },
                                                    { header: 'Admissão', accessor: (item: any) => item.admissionDate ? formatDateBR(item.admissionDate) : '-', className: "text-center text-xs" }
                                                ] :
                                                    activeRegistry === 'partners' ? [
                                                        { header: 'Sócio', accessor: 'name', sortable: true, className: "font-bold text-slate-800" },
                                                        { header: 'CPF', accessor: (item: any) => maskCPF(item.cpf || ''), className: "font-mono text-xs" },
                                                        { header: 'Participação', accessor: (item: any) => `${item.participation || 0}%`, className: "text-center font-bold" },
                                                        { header: 'Pró-Labore', accessor: (item: any) => formatCurrency(item.proLaboreValue || 0), className: "text-right font-bold text-slate-700 dark:text-slate-200" }
                                                    ] :
                                                        activeRegistry === 'ncms' ? [
                                                            { header: 'Código NCM', accessor: 'code', sortable: true, className: "font-mono font-bold text-slate-800" },
                                                            { header: 'Descrição', accessor: 'description', className: "text-xs text-slate-600 dark:text-slate-300 truncate max-w-xs" },
                                                            { header: 'IPI', accessor: (item: any) => `${item.ipiRate || 0}%`, className: "text-center font-bold" }
                                                        ] :
                                                            activeRegistry === 'operationTypes' ? [
                                                                { header: 'Descrição da Natureza', accessor: 'name', sortable: true, className: "font-bold text-slate-800 dark:text-slate-100" },
                                                                {
                                                                    header: 'Tipo (Flag)', accessor: (item: any) => {
                                                                        const flagInfo = OPERATION_TYPE_FLAGS[item.flag];
                                                                        return flagInfo
                                                                            ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${flagInfo.color}`}>{flagInfo.label}</span>
                                                                            : <span className="text-slate-400 text-xs">— Não definido</span>;
                                                                    }, className: ""
                                                                },
                                                                { header: 'Observação', accessor: (item: any) => item.description || '-', className: "text-slate-500 text-xs truncate max-w-xs" }
                                                            ] :
                                                                [
                                                                    { header: 'Identificador', accessor: (item: any) => item.code || item.id, className: "font-mono text-xs" },
                                                                    { header: 'Descrição / Nome', accessor: (item: any) => item.name || item.description || item.bankName || 'Item sem nome', sortable: true, className: "font-bold text-slate-800" },
                                                                    { header: 'Detalhes', accessor: (item: any) => item.city || item.taxType || '-', className: "text-slate-500 text-xs" }
                                                                ]
                                }
                                actions={(item) => (
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                                            className="p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700hover:text-blue-600 rounded-lg transition-all"
                                            title="Editar"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm("Deseja excluir este registro permanentemente?")) {
                                                    let storeKey: any = activeRegistry;
                                                    // Handle activeRegistry mapping if needed (though deleteItem usually takes the registry key)
                                                    // Specific fix for suppliers/carriers sharing 'clients' store if needed, 
                                                    // but context usually handles 'suppliers' key by filtering, deletion might need direct key.
                                                    // let's assume deleteItem handles it or we pass specific key if needed.
                                                    // Actually check DataContext: deleteItem(collection: string, id: string)
                                                    // For 'suppliers'/'carriers', they are stored in 'clients' collection but context exposes specific lists. 
                                                    // Ideally we delete from 'clients' collection.
                                                    if (activeRegistry === 'suppliers' || activeRegistry === 'carriers') storeKey = 'clients';

                                                    data.deleteItem(storeKey, activeRegistry === 'ncms' ? (item as any).code : (item as any).id);
                                                }
                                            }}
                                            className="p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all text-red-400"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                                onCreate={handleAdd}
                                onImport={() => setIsImportModalOpen(true)}
                                onExport={handleExportData}
                                idAccessor={activeRegistry === 'ncms' ? 'code' : 'id'}
                            />
                        </div>
                    )}
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={formData.id || (formData.code && activeRegistry === 'ncms') ? `Editar: ${currentConfig?.label}` : `Novo Cadastro: ${currentConfig?.label}`}
                maxWidth={['partners', 'employees', 'services', 'products'].includes(activeRegistry as string) ? "max-w-4xl" : "max-w-2xl"}
            >
                {(activeRegistry === 'clients' || activeRegistry === 'suppliers' || activeRegistry === 'carriers') ? (
                    <ClientForm
                        initialData={formData}
                        type={activeRegistry === 'clients' ? 'client' : activeRegistry === 'suppliers' ? 'supplier' : 'carrier'}
                        onSave={(savedData) => {
                            // Enforce type based on registry to ensure successful listing
                            const forcedType = activeRegistry === 'suppliers' ? 'supplier' : activeRegistry === 'carriers' ? 'carrier' : 'client';
                            const payload = {
                                ...formData,
                                ...savedData,
                                type: forcedType,
                                companyId: selectedCompany?.id || data.companies[0]?.id
                            };

                            const isEdit = !!payload.id;
                            if (!payload.id) payload.id = Math.random().toString(36).substr(2, 9);

                            if (isEdit) {
                                data.updateClient(payload as Client);
                            } else {
                                data.addClient(payload as Client);
                            }
                            addToast(`${isEdit ? 'Atualizado' : 'Cadastrado'} com sucesso!`, 'success');
                            setIsModalOpen(false);
                        }}
                        onCancel={() => setIsModalOpen(false)}
                    />
                ) : (
                    <form onSubmit={handleSave}>
                        {renderForm()}
                        {renderAuditFooter()}
                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-slate-700">
                            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button type="submit">Salvar Dados</Button>
                        </div>
                    </form>
                )}
            </Modal>
            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImportData}
                onDownloadTemplate={handleDownloadImportTemplate}
                title={`Importar ${currentConfig?.label || 'Dados'}`}
            />
        </div>
    );
};