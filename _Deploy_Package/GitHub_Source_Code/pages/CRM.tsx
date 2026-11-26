import React, { useState, useEffect } from 'react';
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
    History, MessageCircle, Mail as MailIcon, Upload, Landmark, ArrowLeftRight, Layers, Activity, Bookmark, ArrowLeft, LayoutDashboard, List, X
} from 'lucide-react';
import { ImportModal } from '../components/ui/ImportModal';
import { useToast } from '../contexts/ToastContext';
import { parseCSV } from '../utils/csvParser';
import * as XLSX from 'xlsx';
import { Client, Product, Service, Employee, Partner, NCM, TaxRate, PayrollItem, OperationType } from '../types';
import { maskCNPJ, maskCPF, maskPhone, maskCEP, unmask, maskDate, maskCurrency, formatCurrency, formatDateBR } from '../utils/formatters';
import { UniversalList } from '../components/ui/UniversalList';
import { ClientForm } from '../components/crm/ClientForm';
import { ProductForm } from '../components/crm/ProductForm';
import { EmployeeForm } from '../components/crm/EmployeeForm';
import { ClientSchema, PartnerSchema, EmployeeSchema, ProductSchema, ServiceSchema } from '../utils/crmSchemas';
import { z } from 'zod';

type RegistryType = 'partners' | 'clients' | 'suppliers' | 'carriers' | 'employees' | 'products' | 'services' | 'ncms' | 'taxRates' | 'payrollItems' | 'bankAccounts' | 'csts' | 'cfops' | 'units' | 'operationTypes';

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
];


// Defined outside to prevent re-render focus loss
const CRMField = ({ label, name, value, onChange, required = false, type = "text", onBlur, isLoading, ...props }: any) => (
    <div className={`mb-4 ${props.className || ''}`}>
        <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>
        <div className="relative">
            <input
                type={type}
                name={name}
                required={required}
                className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm focus:border-green-500 focus:ring-4 focus:ring-green-500/10 focus:outline-none placeholder-[var(--text-secondary)]/30 transition-all disabled:bg-[var(--bg-secondary)]"
                value={value || ''}
                onChange={onChange}
                onBlur={onBlur}
                {...props}
            />
            {isLoading ? (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                </div>
            ) : null}
        </div>
    </div>
);

const CRMSelect = ({ label, name, value, onChange, required = false, children, ...props }: any) => (
    <div className={`mb-4 ${props.className || ''}`}>
        <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>
        <select name={name} required={required} className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm focus:border-green-500 focus:ring-4 focus:ring-green-500/10 focus:outline-none transition-all disabled:bg-[var(--bg-secondary)]" value={value || ''} onChange={onChange} {...props}>
            {children}
        </select>
    </div>
);

const CRMTextArea = ({ label, name, value, onChange, required = false, ...props }: any) => (
    <div className={`mb-4 ${props.className || ''}`}>
        <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>
        <textarea
            name={name}
            required={required}
            className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm focus:border-green-500 focus:ring-4 focus:ring-green-500/10 focus:outline-none placeholder-[var(--text-secondary)]/30 transition-all disabled:bg-[var(--bg-secondary)]"
            rows={4}
            value={value || ''}
            onChange={onChange}
            {...props}
        />
    </div>
);

const TabButton = ({ id, label, current, set, icon: Icon }: any) => (
    <button
        type="button"
        onClick={() => set(id)}
        className={`px-4 py-3 text-sm font-black border-b-2 transition-all uppercase tracking-wider whitespace-nowrap flex items-center ${current === id ? 'border-green-600 text-green-600' : 'border-transparent text-[var(--text-secondary)] hover:text-green-500'}`}
    >
        {Icon && <Icon size={16} className="mr-2 mb-0.5" />} {label}
    </button>
);

export const CRM: React.FC = () => {
    const data = useData();
    const navigate = useNavigate();
    const location = useLocation();
    const { selectedCompany } = data;
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

    const handleDownloadTemplate = () => {
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

    const { addToast } = useToast();

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
                            // Generic mapping fallback
                            else {
                                if (cleanKey.toLowerCase().includes('nome')) cleanKey = 'name';
                                else if (cleanKey.toLowerCase().includes('descri')) cleanKey = 'description';
                                else if (cleanKey.toLowerCase().includes('preço')) cleanKey = 'price';
                                else if (cleanKey.toLowerCase().includes('código')) cleanKey = 'code';
                            }
                            record[cleanKey] = rawRecord[k];
                        });

                        // Value Parsing / Cleaning
                        if (record.price && typeof record.price === 'string') {
                            // "R$ 1,00" -> 1.00
                            record.price = parseFloat(record.price.replace(/[^\d,.-]/g, '').replace(',', '.'));
                        }
                        if (record.taxRate && typeof record.taxRate === 'string') {
                            // "3%" -> 3
                            record.taxRate = parseFloat(record.taxRate.replace('%', '').replace(',', '.'));
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
        } catch (error) {
            console.error('Erro ao salvar cadastro:', error);
            addToast('Erro ao salvar cadastro. Verifique a conexão e tente novamente.', 'error');
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
        try {
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
            if (!response.ok) throw new Error('CNPJ não encontrado');
            const data = await response.json();

            setFormData((prev: any) => ({
                ...prev,
                name: data.razao_social,
                fantasyName: data.nome_fantasia || prev.fantasyName,
                zip: maskCEP(data.cep),
                address: data.logradouro,
                addressNumber: data.numero,
                addressComp: data.complemento,
                addressDistrict: data.bairro,
                city: data.municipio,
                uf: data.uf,
                phone: maskPhone(data.ddd_telefone_1 || ''),
                email: data.email,
                foundationDate: data.data_inicio_atividade,
                activitySector: data.cnae_fiscal_descricao
            }));
        } catch (error) {
            console.error(error);
            // Optional: alert('CNPJ não encontrado ou erro na busca.');
        } finally {
            setIsLoadingCNPJ(false);
        }
    };

    const getList = () => {
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
            baseList = baseList.filter(item => {
                if (!item) return false;
                return (
                    (item.name && item.name.toLowerCase().includes(lowTerm)) ||
                    (item.description && item.description.toLowerCase().includes(lowTerm)) ||
                    (item.code && String(item.code).includes(searchTerm)) ||
                    (item.cnpj && (item.cnpj.includes(searchTerm) || item.cnpj.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, '')))) ||
                    (item.cpf && (item.cpf.includes(searchTerm) || item.cpf.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''))))
                );
            });
        }

        // Apply Sort
        baseList.sort((a, b) => {
            if (!a || !b) return 0;
            let aVal = a[sortField];
            let bVal = b[sortField];

            // Handle numeric values
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return baseList;
    };

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
                                    <CRMField label="Código" name="orderNumber" value={formData.orderNumber || 'Auto'} readOnly disabled className="bg-[var(--bg-secondary)] font-mono text-center" />
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
                                <label className="ml-2 text-sm text-gray-700">Endereço de Cobrança é o mesmo do principal</label>
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
                <div className="min-h-[400px]">
                    <div className="flex border-b border-[var(--border-color)] mb-6 space-x-1 overflow-x-auto">
                        <TabButton id="pessoais" label="1. Pessoais" current={activePartnerTab} set={setActivePartnerTab} icon={UserCheck} />
                        <TabButton id="docs" label="2. Documentos" current={activePartnerTab} set={setActivePartnerTab} icon={FileText} />
                        <TabButton id="endereco" label="3. Endereço" current={activePartnerTab} set={setActivePartnerTab} icon={MapPin} />
                        <TabButton id="contatos" label="4. Contatos" current={activePartnerTab} set={setActivePartnerTab} icon={Phone} />
                        <TabButton id="societario" label="5. Sociedade" current={activePartnerTab} set={setActivePartnerTab} icon={Briefcase} />
                        <TabButton id="compliance" label="6. Compliance" current={activePartnerTab} set={setActivePartnerTab} icon={ShieldCheck} />
                    </div>

                    {activePartnerTab === 'pessoais' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                            <div className="md:col-span-2 grid grid-cols-4 gap-4">
                                <div className="col-span-1">
                                    <CRMField label="Código" name="orderNumber" value={formData.orderNumber || 'Automático'} readOnly disabled className="bg-[var(--bg-secondary)] font-mono text-center" />
                                </div>
                                <div className="col-span-3">
                                    <CRMField label="Nome Completo" name="name" required value={formData.name} onChange={handleInputChange} />
                                </div>
                            </div>
                            <CRMField label="Data de Nascimento" name="birthDate" type="date" required value={formData.birthDate} onChange={handleInputChange} />
                            <CRMField label="Nacionalidade" name="nationality" required placeholder="Brasileiro(a)" value={formData.nationality} onChange={handleInputChange} />
                            <CRMSelect label="Estado Civil" name="maritalStatus" required value={formData.maritalStatus} onChange={handleInputChange}>
                                <option value="">Selecione...</option>
                                <option value="solteiro">Solteiro(a)</option>
                                <option value="casado">Casado(a)</option>
                                <option value="divorciado">Divorciado(a)</option>
                            </CRMSelect>
                            <CRMField label="Profissão" name="profession" value={formData.profession} onChange={handleInputChange} />
                            <CRMSelect label="Grau de Instrução" name="educationLevel" value={formData.educationLevel} onChange={handleInputChange}>
                                <option value="">Selecione...</option>
                                <option value="superior">Superior</option>
                                <option value="medio">Médio</option>
                            </CRMSelect>
                        </div>
                    )}
                    {activePartnerTab === 'docs' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                            <CRMField label="CPF" name="cpf" required maxLength={14} value={formData.cpf} onChange={handleInputChange} />
                            <CRMField label="RG / RNE / CNH" name="rg" required value={formData.rg} onChange={handleInputChange} />
                            <CRMField label="Órgão Emissor" name="rgIssuer" value={formData.rgIssuer} onChange={handleInputChange} />
                            <CRMField label="Data de Emissão" name="rgIssueDate" type="date" value={formData.rgIssueDate} onChange={handleInputChange} />
                            <CRMField label="NIT / PIS" name="pis" required value={formData.pis} onChange={handleInputChange} />
                        </div>
                    )}
                    {activePartnerTab === 'endereco' && (
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 animate-in fade-in duration-300">
                            <div className="md:col-span-2"><CRMField label="CEP" name="zip" required maxLength={9} onBlur={() => handleFetchCEP('main')} value={formData.zip} onChange={handleInputChange} /></div>
                            <div className="md:col-span-4"><CRMField label="Logradouro" name="address" required value={formData.address} onChange={handleInputChange} /></div>
                            <div className="md:col-span-2"><CRMField label="Número" name="addressNumber" required value={formData.addressNumber} onChange={handleInputChange} /></div>
                            <div className="md:col-span-2"><CRMField label="Qd" name="addressQuadra" value={formData.addressQuadra} onChange={handleInputChange} /></div>
                            <div className="md:col-span-2"><CRMField label="Lote" name="addressLote" value={formData.addressLote} onChange={handleInputChange} /></div>
                            <div className="md:col-span-2"><CRMField label="Complemento" name="addressComp" value={formData.addressComp} onChange={handleInputChange} /></div>
                            <div className="md:col-span-4"><CRMField label="Cidade" name="city" required value={formData.city} onChange={handleInputChange} /></div>
                        </div>
                    )}
                    {activePartnerTab === 'contatos' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                            <CRMField label="Celular" name="mobilePhone" required maxLength={15} value={formData.mobilePhone} onChange={handleInputChange} />
                            <CRMField label="E-mail Pessoal" name="email" required type="email" value={formData.email} onChange={handleInputChange} />
                        </div>
                    )}
                    {activePartnerTab === 'societario' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                            <CRMField label="Participação (%)" name="participation" type="number" step="0.01" required value={formData.participation} onChange={handleInputChange} />
                            <CRMField label="Cargo" name="role" required value={formData.role} onChange={handleInputChange} />
                            <CRMField label="Data Ingresso" name="entryDate" type="date" required value={formData.entryDate} onChange={handleInputChange} />
                            <CRMField label="Data de Admissão" name="admissionDate" type="date" required value={formData.admissionDate} onChange={handleInputChange} />
                            <CRMField label="Capital Integralizado" name="capitalIntegralized" type="number" value={formData.capitalIntegralized} onChange={handleInputChange} />
                            <div className="md:col-span-2">
                                <div className="flex justify-between items-end mb-1.5">
                                    <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider">Valor do Salário (Pró-Labore)</label>
                                    {!showSalaryAdjustment && formData.id && (
                                        <button
                                            type="button"
                                            onClick={() => setShowSalaryAdjustment(true)}
                                            className="text-[10px] font-black text-green-600 hover:text-green-700 flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800 transition-all active:scale-95"
                                        >
                                            <Plus size={12} /> Ajustar Salário
                                        </button>
                                    )}
                                </div>

                                {!showSalaryAdjustment ? (
                                    <div className="space-y-3">
                                        <div className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl border border-[var(--border-color)] px-4 py-3 text-sm font-bold flex justify-between items-center group relative">
                                            <span>{formatCurrency(formData.proLaboreValue || 0)}</span>
                                            {formData.id && (
                                                <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">Valor Atual</span>
                                            )}
                                            {!formData.id && (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    name="proLaboreValue"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    value={formData.proLaboreValue}
                                                    onChange={handleInputChange}
                                                />
                                            )}
                                        </div>

                                        {/* Pending Adjustment Alert */}
                                        {formData.newProLaboreValue && (
                                            <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl animate-in zoom-in-95 duration-300">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center">
                                                        <ArrowLeftRight size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 leading-none mb-1">Ajuste Pendente</p>
                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                            Alterar para {formatCurrency(formData.newProLaboreValue)} em {formatDateBR(formData.newProLaboreDate)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData((prev: any) => ({ ...prev, newProLaboreValue: undefined, newProLaboreDate: undefined }))}
                                                    className="p-1.5 text-indigo-400 hover:text-red-500 transition-colors"
                                                    title="Descartar alteração"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-2xl animate-in slide-in-from-top-2 duration-300 shadow-sm">
                                        <CRMField label="Novo Valor (R$)" name="newProLaboreValue" type="number" step="0.01" required value={formData.newProLaboreValue} onChange={handleInputChange} autoFocus />
                                        <CRMField label="Vigência a partir de" name="newProLaboreDate" type="date" required value={formData.newProLaboreDate} onChange={handleInputChange} />
                                        <div className="col-span-2 flex justify-end gap-2 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowSalaryAdjustment(false);
                                                    setFormData((prev: any) => ({ ...prev, newProLaboreValue: undefined, newProLaboreDate: undefined }));
                                                }}
                                                className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest px-3 py-1.5 transition-colors"
                                            >
                                                Descartar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowSalaryAdjustment(false)}
                                                className="text-[10px] font-black bg-green-600 text-white hover:bg-green-700 uppercase tracking-widest px-4 py-1.5 rounded-lg shadow-sm transition-all active:scale-95"
                                            >
                                                Confirmar Ajuste
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Fallback for new partner creation where adjustment modal isn't needed yet */}
                                {!formData.id && (
                                    <div className="mt-2">
                                        <CRMField label="Salário Inicial (Pró-Labore)" name="proLaboreValue" type="number" step="0.01" required value={formData.proLaboreValue} onChange={handleInputChange} />
                                    </div>
                                )}
                            </div>

                            {/* Salary History Section */}
                            <div className="md:col-span-2 mt-2 bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 mb-3 tracking-widest">
                                    <History size={14} className="text-indigo-500" /> Histórico de Pró-Labore
                                </h4>
                                <div className="space-y-2">
                                    {/* Current Value (Virtual Entry) */}
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-green-600 dark:text-green-400">{formatCurrency(formData.proLaboreValue || 0)}</span>
                                            <span className="text-[9px] text-slate-400 font-medium tracking-tight">
                                                Vigente desde: {(() => {
                                                    const hist = formData.salaryHistory || [];
                                                    const last = hist.length > 0 ? [...hist].sort((a: any, b: any) => new Date(b.endDate || 0).getTime() - new Date(a.endDate || 0).getTime())[0] : null;
                                                    return formatDateBR(last ? last.endDate : (formData.admissionDate || formData.entryDate || new Date().toISOString().split('T')[0]));
                                                })()}
                                            </span>
                                        </div>
                                        <span className="px-2 py-0.5 bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-md text-[9px] font-black text-green-600 uppercase">
                                            Atual
                                        </span>
                                    </div>

                                    {/* Historical Entries */}
                                    {formData.salaryHistory && [...formData.salaryHistory].sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map((h: any) => (
                                        <div key={h.id} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 opacity-70">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatCurrency(h.value)}</span>
                                                <span className="text-[9px] text-slate-400 font-medium">
                                                    Período: {formatDateBR(h.startDate)} até {formatDateBR(h.endDate)}
                                                </span>
                                            </div>
                                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[9px] font-bold text-slate-500 uppercase">
                                                Encerrado
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    {activePartnerTab === 'compliance' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="grid grid-cols-2 gap-4">
                                <CRMSelect label="PEP?" name="isPEP" value={formData.isPEP} onChange={handleInputChange}><option value="false">Não</option><option value="true">Sim</option></CRMSelect>
                            </div>
                            <div className="pt-4 border-t">
                                <label className="flex items-center text-sm font-semibold text-gray-700">
                                    <input type="checkbox" name="lgpdConsent" checked={formData.lgpdConsent} onChange={handleInputChange} className="mr-2 w-4 h-4 text-orange-600 rounded focus:ring-orange-500" />
                                    Consentimento LGPD <span className="text-red-500 ml-1">*</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // --- EMPLOYEES FORM ---
        if (activeRegistry === 'employees') {
            return (
                <EmployeeForm
                    formData={formData}
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
                    handleInputChange={handleInputChange}
                    formTab={productTab}
                    setFormTab={setProductTab}
                />
            );
        }

        // --- SERVICES FORM ---
        if (activeRegistry === 'services') {
            return (
                <div className="min-h-[400px]">
                    <div className="flex border-b border-gray-200 mb-6 space-x-1 overflow-x-auto">
                        <TabButton id="geral" label="1. Geral" current={serviceTab} set={setServiceTab} icon={FileText} />
                        <TabButton id="execucao" label="2. Execução" current={serviceTab} set={setServiceTab} icon={Wrench} />
                        <TabButton id="comercial" label="3. Comercial" current={serviceTab} set={setServiceTab} icon={DollarSign} />
                        <TabButton id="tributacao" label="4. Tributação" current={serviceTab} set={setServiceTab} icon={Percent} />
                    </div>

                    {serviceTab === 'geral' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                            <div className="md:col-span-2 grid grid-cols-4 gap-4">
                                <div className="col-span-1">
                                    <CRMField label="Código" name="orderNumber" value={formData.orderNumber || 'Automático'} readOnly disabled className="bg-gray-100 font-mono text-center" />
                                </div>
                                <div className="col-span-3">
                                    <CRMField label="Nome do Serviço" name="name" required value={formData.name} onChange={handleInputChange} />
                                </div>
                            </div>
                            <CRMField label="Código Interno" name="code" value={formData.code} onChange={handleInputChange} />
                            <CRMField label="Item do Serviço (Ex: 14.01)" name="serviceItem" value={formData.serviceItem} onChange={handleInputChange} placeholder="00.00" />
                            <CRMField label="Categoria" name="category" value={formData.category} onChange={handleInputChange} />
                            <div className="md:col-span-2"><CRMTextArea label="Descrição Detalhada" name="description" value={formData.description} onChange={handleInputChange} /></div>
                        </div>
                    )}
                    {serviceTab === 'execucao' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                            <div className="md:col-span-2"><CRMTextArea label="Escopo" name="scope" value={formData.scope} onChange={handleInputChange} /></div>
                            <div className="md:col-span-2"><CRMTextArea label="O que NÃO está incluso" name="exclusions" value={formData.exclusions} onChange={handleInputChange} /></div>
                            <CRMSelect label="Método" name="method" value={formData.method} onChange={handleInputChange}><option value="presencial">Presencial</option><option value="remoto">Remoto</option><option value="hibrido">Híbrido</option></CRMSelect>
                            <CRMField label="Tempo Estimado" name="executionTime" value={formData.executionTime} onChange={handleInputChange} />
                        </div>
                    )}
                    {serviceTab === 'comercial' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                            <CRMField label="Preço" name="price" type="number" step="0.01" required value={formData.price} onChange={handleInputChange} />
                            <CRMSelect label="Modelo Cobrança" name="pricingModel" value={formData.pricingModel} onChange={handleInputChange}><option value="fixo">Preço Fixo</option><option value="hora">Por Hora</option><option value="pacote">Pacote</option></CRMSelect>
                            <CRMField label="Condições Pagamento" name="paymentTerms" placeholder="Ex: 50% entrada" value={formData.paymentTerms} onChange={handleInputChange} />
                        </div>
                    )}
                    {serviceTab === 'tributacao' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                            <CRMField label="ISS (%)" name="issRate" type="number" required value={formData.issRate} onChange={handleInputChange} />
                            <CRMField label="CNAE" name="cnae" value={formData.cnae} onChange={handleInputChange} />
                            <div className="md:col-span-2 pt-2 border-t mt-2">
                                <h5 className="font-bold text-slate-700 text-[10px] mb-2 uppercase tracking-wide">Retenções (NFSe)</h5>
                            </div>
                            <CRMField label="PIS (%)" name="pisRate" type="number" value={formData.pisRate} onChange={handleInputChange} />
                            <CRMField label="COFINS (%)" name="cofinsRate" type="number" value={formData.cofinsRate} onChange={handleInputChange} />
                            <CRMField label="CSLL (%)" name="csllRate" type="number" value={formData.csllRate} onChange={handleInputChange} />
                            <CRMField label="IRRF (%)" name="irrfRate" type="number" value={formData.irrfRate} onChange={handleInputChange} />
                            <CRMField label="INSS (%)" name="inssRate" type="number" value={formData.inssRate} onChange={handleInputChange} />
                            <div className="md:col-span-2 bg-slate-50 border border-slate-100 p-3 rounded-xl text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                Configure as alíquotas de retenção que serão sugeridas no faturamento de serviços.
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // --- NCM FORM ---
        if (activeRegistry === 'ncms') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CRMField label="Código NCM (8 Dígitos)" name="code" required maxLength={8} value={formData.code} onChange={handleInputChange} />
                    <CRMField label="Descrição" name="description" required value={formData.description} onChange={handleInputChange} />
                    <CRMField label="Categoria" name="category" value={formData.category} onChange={handleInputChange} />
                    <CRMSelect label="Origem" name="origin" value={formData.origin} onChange={handleInputChange}><option value="nacional">Nacional</option><option value="importado">Importado</option></CRMSelect>

                    <div className="md:col-span-2 pt-4 border-t border-gray-100"><h4 className="font-bold text-gray-700 text-sm mb-2">Alíquotas Padrão (%)</h4></div>
                    <CRMField label="IPI" name="aliquotaIPI" type="number" value={formData.aliquotaIPI} onChange={handleInputChange} />
                    <CRMField label="ICMS (Estadual)" name="aliquotaICMS" type="number" value={formData.aliquotaICMS} onChange={handleInputChange} />
                    <CRMField label="PIS" name="aliquotaPIS" type="number" value={formData.aliquotaPIS} onChange={handleInputChange} />
                    <CRMField label="COFINS" name="aliquotaCOFINS" type="number" value={formData.aliquotaCOFINS} onChange={handleInputChange} />
                </div>
            );
        }

        // --- TAX RATES (Aliquotas) ---
        if (activeRegistry === 'taxRates') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2"><CRMField label="Nome da Alíquota" name="name" required placeholder="Ex: ICMS SP Intra" value={formData.name} onChange={handleInputChange} /></div>
                    <CRMSelect label="Tipo de Imposto" name="type" required value={formData.type} onChange={handleInputChange}>
                        <option value="">Selecione...</option>
                        <option value="ICMS">ICMS</option>
                        <option value="ISS">ISS</option>
                        <option value="PIS">PIS</option>
                        <option value="COFINS">COFINS</option>
                        <option value="IPI">IPI</option>
                        <option value="IRPJ">IRPJ</option>
                        <option value="CSLL">CSLL</option>
                    </CRMSelect>
                    <CRMField label="Valor / Percentual (%)" name="rate" type="number" step="0.01" required value={formData.rate} onChange={handleInputChange} />
                    <CRMSelect label="Aplicação" name="applicationScope" value={formData.applicationScope} onChange={handleInputChange}>
                        <option value="produto">Produto</option>
                        <option value="servico">Serviço</option>
                        <option value="funcionario">Funcionário</option>
                    </CRMSelect>
                    <CRMField label="Base de Cálculo" name="baseCalculation" placeholder="Ex: Valor Total da Nota" value={formData.baseCalculation} onChange={handleInputChange} />
                </div>
            );
        }

        // --- PAYROLL ITEMS (Rubricas) ---
        if (activeRegistry === 'payrollItems') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CRMField label="Código Interno" name="code" required value={formData.code} onChange={handleInputChange} />
                    <CRMField label="Nome da Rubrica" name="name" required value={formData.name} onChange={handleInputChange} />
                    <CRMSelect label="Tipo" name="type" required value={formData.type} onChange={handleInputChange}>
                        <option value="provento">Provento (Crédito)</option>
                        <option value="desconto">Desconto (Débito)</option>
                        <option value="encargo">Encargo (Empresa)</option>
                    </CRMSelect>
                    <CRMSelect label="Forma de Cálculo" name="valueType" value={formData.valueType} onChange={handleInputChange}>
                        <option value="percentual">Percentual</option>
                        <option value="fixo">Valor Fixo</option>
                    </CRMSelect>
                    <CRMField label="Valor Padrão" name="value" type="number" step="0.01" value={formData.value} onChange={handleInputChange} />

                    <div className="md:col-span-2 pt-4 border-t border-gray-100"><h4 className="font-bold text-gray-700 text-sm mb-2">Incidências</h4></div>
                    <div className="flex gap-4">
                        <label className="flex items-center"><input type="checkbox" name="incidesFGTS" checked={formData.incidesFGTS} onChange={handleInputChange} className="mr-2" /> FGTS</label>
                        <label className="flex items-center"><input type="checkbox" name="incidesINSS" checked={formData.incidesINSS} onChange={handleInputChange} className="mr-2" /> INSS</label>
                        <label className="flex items-center"><input type="checkbox" name="incidesIR" checked={formData.incidesIR} onChange={handleInputChange} className="mr-2" /> IRRF</label>
                    </div>
                </div>
            );
        }

        // --- CST FORM ---
        if (activeRegistry === 'csts') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CRMField label="Código CST" name="code" required value={formData.code} onChange={handleInputChange} placeholder="Ex: 00" />
                    <CRMSelect label="Tipo de Imposto" name="taxType" required value={formData.taxType} onChange={handleInputChange}>
                        <option value="">Selecione...</option>
                        <option value="ICMS">ICMS</option>
                        <option value="IPI">IPI</option>
                        <option value="PIS">PIS</option>
                        <option value="COFINS">COFINS</option>
                    </CRMSelect>
                    <div className="md:col-span-2">
                        <CRMField label="Descrição" name="description" required value={formData.description} onChange={handleInputChange} placeholder="Ex: Tributada Integralmente" />
                    </div>
                </div>
            );
        }

        // --- OPERATION TYPE FORM ---
        if (activeRegistry === 'operationTypes') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <CRMField label="Descrição da Natureza" name="name" required value={formData.name} onChange={handleInputChange} placeholder="Ex: Venda, Compra, Devolução, Remessa" />
                    </div>
                    <div className="md:col-span-2">
                        <CRMField label="Observação / Detalhes" name="description" value={formData.description} onChange={handleInputChange} placeholder="Ex: Operações relativas à venda de mercadorias" />
                    </div>
                </div>
            );
        }

        // --- CFOP FORM ---
        if (activeRegistry === 'cfops') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CRMField label="Código CFOP" name="code" required maxLength={4} value={formData.code} onChange={handleInputChange} placeholder="Ex: 5102" />
                    <CRMSelect label="Tipo de Operação" name="operationTypeId" required value={formData.operationTypeId} onChange={handleInputChange}>
                        <option value="">Selecione...</option>
                        {data.operationTypes?.map(ot => (
                            <option key={ot.id} value={ot.id}>{ot.name}</option>
                        ))}
                        <option value="entry">Entrada (Legado)</option>
                        <option value="exit">Saída (Legado)</option>
                    </CRMSelect>
                    <div className="md:col-span-2">
                        <CRMField label="Descrição" name="description" required value={formData.description} onChange={handleInputChange} placeholder="Ex: Venda de Mercadoria" />
                    </div>
                </div>
            );
        }

        // --- UNIT FORM ---
        if (activeRegistry === 'units') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CRMField label="Sigla (Código)" name="code" required value={formData.code} onChange={handleInputChange} placeholder="Ex: UN" className="uppercase" />
                    <div className="md:col-span-2">
                        <CRMField label="Descrição" name="description" required value={formData.description} onChange={handleInputChange} placeholder="Ex: Unidade" />
                    </div>
                </div>
            );
        }

        // --- BANK ACCOUNTS FORM ---
        if (activeRegistry === 'bankAccounts') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <CRMField label="Nome do Banco" name="bankName" required value={formData.bankName} onChange={handleInputChange} placeholder="Ex: Banco do Brasil" />
                    </div>
                    <CRMField label="Agência" name="agency" required value={formData.agency} onChange={handleInputChange} placeholder="0000-0" />
                    <CRMField label="Conta" name="accountNumber" required value={formData.accountNumber} onChange={handleInputChange} placeholder="00000-0" />
                    <CRMSelect label="Tipo de Conta" name="type" required value={formData.type} onChange={handleInputChange}>
                        <option value="">Selecione...</option>
                        <option value="corrente">Conta Corrente</option>
                        <option value="poupanca">Conta Poupança</option>
                        <option value="investimento">Conta Investimento</option>
                    </CRMSelect>
                    <CRMField label="Saldo Inicial (R$)" name="balance" type="number" step="0.01" required value={formData.balance} onChange={handleInputChange} />
                </div>
            );
        }

        return <div className="text-gray-500">Formulário em construção para este módulo.</div>;
    };

    // Render Dashboard View
    if (!activeRegistry) {
        return (
            <div className="flex flex-col h-[calc(100vh-2rem)] bg-slate-50 -m-6 p-6 overflow-hidden">
                {/* TOP HEADER BAR */}
                <header className="flex justify-between items-center mb-6 shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200">
                            <Users className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">CRM & Cadastros</h1>
                            <p className="text-xs text-gray-500 font-medium">Gestão centralizada de entidades e parceiros</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => { handleOpenRegistry('operationTypes'); handleAdd(); }}
                            variant="secondary"
                            icon={Bookmark}
                            className="text-teal-600 bg-teal-50 border-teal-200"
                        >
                            Nova Natureza
                        </Button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {registries.map(reg => {
                            const colorMap: any = {
                                indigo: 'text-indigo-600 bg-indigo-50 group-hover:bg-indigo-600 border-indigo-200',
                                blue: 'text-blue-600 bg-blue-50 group-hover:bg-blue-600 border-blue-200',
                                orange: 'text-orange-600 bg-orange-50 group-hover:bg-orange-600 border-orange-200',
                                slate: 'text-slate-600 bg-slate-50 group-hover:bg-slate-600 border-slate-200',
                                emerald: 'text-emerald-600 bg-emerald-50 group-hover:bg-emerald-600 border-emerald-200',
                                violet: 'text-violet-600 bg-violet-50 group-hover:bg-violet-600 border-violet-200',
                                cyan: 'text-cyan-600 bg-cyan-50 group-hover:bg-cyan-600 border-cyan-200',
                                yellow: 'text-yellow-600 bg-yellow-50 group-hover:bg-yellow-600 border-yellow-200',
                                rose: 'text-rose-600 bg-rose-50 group-hover:bg-rose-600 border-rose-200',
                                pink: 'text-pink-600 bg-pink-50 group-hover:bg-pink-600 border-pink-200',
                                green: 'text-green-600 bg-green-50 group-hover:bg-green-600 border-green-200',
                                teal: 'text-teal-600 bg-teal-50 group-hover:bg-teal-600 border-teal-200',
                            };
                            const theme = colorMap[reg.color] || colorMap['green'];
                            const [textColor, bgColor, hoverBg, borderColor] = theme.split(' ');

                            return (
                                <Card
                                    key={reg.id}
                                    className={`cursor-pointer hover:-translate-y-2 transition-all duration-300 group bg-white border border-gray-100 overflow-hidden relative shadow-sm hover:shadow-xl`}
                                    glow
                                >
                                    <div className={`absolute top-0 left-0 w-1 h-full ${bgColor.replace('50', '500')} transform scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom`}></div>
                                    <div className="flex items-center space-x-5 p-2" onClick={() => handleOpenRegistry(reg.id)}>
                                        <div className={`p-4 rounded-2xl transition-all shadow-sm ${bgColor} ${textColor} group-hover:text-white ${hoverBg}`}>
                                            <reg.icon size={28} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">{reg.label}</h3>
                                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">{reg.description}</p>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // Render List View
    const list = getList();
    const currentConfig = registries.find(r => r.id === activeRegistry);

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] bg-slate-50 -m-6 p-6 overflow-hidden">
            {/* LIST HEADER */}
            <header className="flex justify-between items-center mb-6 shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors"
                        title="Voltar"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">{currentConfig?.label}</h1>
                        <p className="text-xs text-gray-500 font-medium">Gerenciamento de {currentConfig?.label}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
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

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="pl-9 pr-4 py-1.5 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none w-48 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="h-6 w-px bg-gray-200 mx-1"></div>
                    <Button icon={Plus} className="rounded-lg shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAdd}>Novo</Button>
                    <Button variant="ghost" icon={Upload} onClick={() => setIsImportModalOpen(true)}>Importar</Button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-4">

                {viewMode === 'kanban' && activeRegistry === 'clients' ? (
                    <div className="flex gap-4 p-6 overflow-x-auto min-h-[600px] bg-slate-50 dark:bg-slate-900/50">
                        {['Lead / Prospecção', 'Em Negociação', 'Cliente Fechado'].map((stage, idx) => (
                            <div key={stage} className="flex-1 min-w-[300px] bg-slate-100 dark:bg-slate-800 rounded-3xl p-4 flex flex-col gap-4">
                                <div className="flex justify-between items-center text-xs font-black uppercase text-slate-500 tracking-wider mb-2">
                                    <span>{stage}</span>
                                    <span className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-lg">
                                        {list.filter((_, i) => i % 3 === idx).length}
                                    </span>
                                </div>
                                {list.filter((_, i) => i % 3 === idx).map(item => (
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
                                                {formatCurrency(Math.random() * 5000)}
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
                            data={getList()}
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
                                        { header: 'Preço Venda', accessor: (item: any) => formatCurrency(item.price || 0), className: "text-right font-bold text-slate-700" },
                                        { header: 'Estoque', accessor: (item: any) => item.stock || 0, className: "text-center" },
                                        { header: 'Unidade', accessor: 'unit', className: "text-center text-xs uppercase" }
                                    ] :
                                        activeRegistry === 'services' ? [
                                            { header: 'Serviço', accessor: 'name', sortable: true, className: "font-bold text-slate-800" },
                                            { header: 'Código', accessor: 'serviceItem', className: "font-mono text-xs" },
                                            { header: 'Preço', accessor: (item: any) => formatCurrency(item.price || 0), className: "text-right font-bold text-slate-700" },
                                            { header: 'Alíquota ISS', accessor: (item: any) => `${item.issRate || 0}%`, className: "text-center" }
                                        ] :
                                            activeRegistry === 'employees' ? [
                                                { header: 'Nome', accessor: 'name', sortable: true, className: "font-bold text-slate-800" },
                                                { header: 'CPF', accessor: (item: any) => maskCPF(item.cpf || ''), className: "font-mono text-xs" },
                                                { header: 'Cargo', accessor: 'role', className: "text-slate-600 font-medium" },
                                                { header: 'Salário', accessor: (item: any) => formatCurrency(item.salary || 0), className: "text-right font-bold text-slate-700" },
                                                { header: 'Admissão', accessor: (item: any) => item.admissionDate ? formatDateBR(item.admissionDate) : '-', className: "text-center text-xs" }
                                            ] :
                                                activeRegistry === 'partners' ? [
                                                    { header: 'Sócio', accessor: 'name', sortable: true, className: "font-bold text-slate-800" },
                                                    { header: 'CPF', accessor: (item: any) => maskCPF(item.cpf || ''), className: "font-mono text-xs" },
                                                    { header: 'Participação', accessor: (item: any) => `${item.participation || 0}%`, className: "text-center font-bold" },
                                                    { header: 'Pró-Labore', accessor: (item: any) => formatCurrency(item.proLaboreValue || 0), className: "text-right font-bold text-slate-700" }
                                                ] :
                                                    activeRegistry === 'ncms' ? [
                                                        { header: 'Código NCM', accessor: 'code', sortable: true, className: "font-mono font-bold text-slate-800" },
                                                        { header: 'Descrição', accessor: 'description', className: "text-xs text-slate-600 truncate max-w-xs" },
                                                        { header: 'IPI', accessor: (item: any) => `${item.ipiRate || 0}%`, className: "text-center font-bold" }
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
                                        className="p-2 text-slate-500 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-all"
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
                            onExport={handleDownloadTemplate}
                            idAccessor={activeRegistry === 'ncms' ? 'code' : 'id'}
                        />
                    </div>
                )}

                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={formData.id || (formData.code && activeRegistry === 'ncms') ? `Editar: ${currentConfig?.label}` : `Novo Cadastro: ${currentConfig?.label}`}
                    maxWidth="max-w-2xl"
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
                            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
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
                    onDownloadTemplate={handleDownloadTemplate}
                    title={`Importar ${currentConfig?.label || 'Dados'}`}
                />
            </div>
        </div >
    );
};