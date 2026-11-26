import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Employee, Partner } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../contexts/ToastContext';
import { maskCPF, maskPhone, maskCEP, unmask, formatCurrency } from '../../utils/formatters';
import {
    User, Briefcase, HeartHandshake, MapPin, Landmark,
    CheckCircle2, AlertCircle, Search, Loader2, Calendar, DollarSign
} from 'lucide-react';

interface EmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeToEdit?: (Employee | Partner) & { type?: 'employee' | 'partner' } | null;
    defaultType?: 'employee' | 'partner';
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
    isOpen,
    onClose,
    employeeToEdit,
    defaultType = 'employee'
}) => {
    const { selectedCompany, addEmployee, updateEmployee, addPartner, updatePartner } = useData();
    const { addToast } = useToast();

    const [activeTab, setActiveTab] = useState<'pessoal' | 'contrato' | 'beneficios' | 'endereco' | 'bancario'>('pessoal');
    const [isSaving, setIsSaving] = useState(false);
    const [isSearchingCep, setIsSearchingCep] = useState(false);

    // Form state
    const [collabType, setCollabType] = useState<'employee' | 'partner'>('employee');
    const [formData, setFormData] = useState<any>({
        name: '',
        cpf: '',
        rg: '',
        rgIssuer: 'SSP',
        birthDate: '',
        gender: 'Masculino',
        maritalStatus: 'Solteiro(a)',
        motherName: '',
        fatherName: '',

        // Contrato
        position: '',
        role: '',
        department: 'Operacional',
        salary: 1518, // Salário Mínimo 2025/2026
        proLaboreValue: 1518,
        admissionDate: new Date().toISOString().slice(0, 10),
        status: 'ativo',
        contractType: 'indeterminado',
        weeklyHours: '44',
        cbo: '',
        pis: '',
        ctpsNum: '',
        ctpsSeries: '',

        // Beneficios
        dependents: '0',
        transportVoucher: false,
        transportVoucherDailyValue: 9.60,
        healthPlan: false,
        healthPlanValue: 180,
        mealVoucher: false,

        // Endereço
        zip: '',
        address: '',
        addressNumber: '',
        addressDistrict: '',
        city: '',
        uf: 'SP',
        mobilePhone: '',
        email: '',
        emergencyContact: '',

        // Bancário
        bank: '',
        agency: '',
        account: '',
        pix: ''
    });

    useEffect(() => {
        if (employeeToEdit) {
            const isPart = employeeToEdit.type === 'partner' || ('proLaboreValue' in employeeToEdit && !('salary' in employeeToEdit));
            setCollabType(isPart ? 'partner' : 'employee');
            setFormData({
                ...employeeToEdit,
                position: (employeeToEdit as any).position || employeeToEdit.role || '',
                role: employeeToEdit.role || (employeeToEdit as any).position || '',
                salary: (employeeToEdit as any).salary || (employeeToEdit as any).proLaboreValue || 1518,
                proLaboreValue: (employeeToEdit as any).proLaboreValue || (employeeToEdit as any).salary || 1518,
                dependents: (employeeToEdit as any).dependents?.toString() || '0'
            });
        } else {
            setCollabType(defaultType);
            setFormData({
                name: '',
                cpf: '',
                rg: '',
                rgIssuer: 'SSP',
                birthDate: '',
                gender: 'Masculino',
                maritalStatus: 'Solteiro(a)',
                motherName: '',
                fatherName: '',
                position: '',
                role: '',
                department: 'Operacional',
                salary: 1518,
                proLaboreValue: 1518,
                admissionDate: new Date().toISOString().slice(0, 10),
                status: 'ativo',
                contractType: 'indeterminado',
                weeklyHours: '44',
                cbo: '',
                pis: '',
                ctpsNum: '',
                ctpsSeries: '',
                dependents: '0',
                transportVoucher: false,
                transportVoucherDailyValue: 9.60,
                healthPlan: false,
                healthPlanValue: 180,
                mealVoucher: false,
                zip: '',
                address: '',
                addressNumber: '',
                addressDistrict: '',
                city: '',
                uf: 'SP',
                mobilePhone: '',
                email: '',
                emergencyContact: '',
                bank: '',
                agency: '',
                account: '',
                pix: ''
            });
        }
        setActiveTab('pessoal');
    }, [employeeToEdit, defaultType, isOpen]);

    const handleInputChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleCepLookup = async () => {
        const cleanCep = unmask(formData.zip);
        if (cleanCep.length !== 8) return;

        setIsSearchingCep(true);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await res.json();
            if (!data.erro) {
                setFormData((prev: any) => ({
                    ...prev,
                    address: data.logradouro || prev.address,
                    addressDistrict: data.bairro || prev.addressDistrict,
                    city: data.localidade || prev.city,
                    uf: data.uf || prev.uf
                }));
                addToast('Endereço preenchido via CEP!', 'success');
            } else {
                addToast('CEP não encontrado.', 'warning');
            }
        } catch {
            addToast('Erro ao consultar CEP.', 'error');
        } finally {
            setIsSearchingCep(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            addToast('Informe o nome completo.', 'warning');
            setActiveTab('pessoal');
            return;
        }

        if (!formData.cpf.trim() || unmask(formData.cpf).length !== 11) {
            addToast('Informe um CPF válido com 11 dígitos.', 'warning');
            setActiveTab('pessoal');
            return;
        }

        if (!selectedCompany?.id) {
            addToast('Nenhuma empresa ativa selecionada.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const cleanCpf = unmask(formData.cpf);
            const roleName = formData.position || formData.role || (collabType === 'employee' ? 'Colaborador CLT' : 'Sócio Diretor');
            const salaryVal = Number(formData.salary) || 1518;
            const proLaboreVal = Number(formData.proLaboreValue) || salaryVal;

            if (collabType === 'employee') {
                const employeePayload: Employee = {
                    id: employeeToEdit?.id || `emp_${Date.now()}`,
                    companyId: selectedCompany.id,
                    name: formData.name.trim(),
                    cpf: cleanCpf,
                    position: roleName,
                    role: roleName,
                    department: formData.department || 'Operacional',
                    salary: salaryVal,
                    admissionDate: formData.admissionDate || new Date().toISOString().slice(0, 10),
                    status: formData.status || 'ativo',
                    type: 'employee',
                    dependents: formData.dependents || '0',
                    cbo: formData.cbo || '',
                    pis: unmask(formData.pis || ''),
                    rg: formData.rg || '',
                    rgIssuer: formData.rgIssuer || 'SSP',
                    gender: formData.gender,
                    maritalStatus: formData.maritalStatus,
                    birthDate: formData.birthDate,
                    motherName: formData.motherName,
                    fatherName: formData.fatherName,
                    ctpsNum: formData.ctpsNum,
                    ctpsSeries: formData.ctpsSeries,
                    contractType: formData.contractType,
                    weeklyHours: formData.weeklyHours,
                    transportVoucher: Boolean(formData.transportVoucher),
                    healthPlan: Boolean(formData.healthPlan),
                    mealVoucher: Boolean(formData.mealVoucher),
                    zip: formData.zip,
                    address: formData.address,
                    addressNumber: formData.addressNumber,
                    addressDistrict: formData.addressDistrict,
                    city: formData.city,
                    uf: formData.uf,
                    mobilePhone: formData.mobilePhone,
                    email: formData.email,
                    emergencyContact: formData.emergencyContact,
                    bank: formData.bank,
                    agency: formData.agency,
                    account: formData.account,
                    pix: formData.pix
                };

                if (employeeToEdit && employeeToEdit.id) {
                    await updateEmployee(employeePayload);
                    addToast('Colaborador atualizado com sucesso!', 'success');
                } else {
                    await addEmployee(employeePayload);
                    addToast('Colaborador admitido com sucesso!', 'success');
                }
            } else {
                const partnerPayload: Partner = {
                    id: employeeToEdit?.id || `part_${Date.now()}`,
                    companyId: selectedCompany.id,
                    name: formData.name.trim(),
                    cpf: cleanCpf,
                    rg: formData.rg || '',
                    role: roleName,
                    proLaboreValue: proLaboreVal,
                    admissionDate: formData.admissionDate || new Date().toISOString().slice(0, 10),
                    cbo: formData.cbo || '1210-10', // Diretor Geral
                    mobilePhone: formData.mobilePhone,
                    email: formData.email,
                    zip: formData.zip,
                    address: formData.address,
                    addressNumber: formData.addressNumber,
                    addressDistrict: formData.addressDistrict,
                    city: formData.city,
                    uf: formData.uf
                };

                if (employeeToEdit && employeeToEdit.id) {
                    await updatePartner(partnerPayload);
                    addToast('Sócio atualizado com sucesso!', 'success');
                } else {
                    await addPartner(partnerPayload);
                    addToast('Sócio cadastrado com sucesso!', 'success');
                }
            }

            onClose();
        } catch (err: any) {
            addToast(`Erro ao salvar: ${err.message || 'Falha na operação'}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={employeeToEdit ? `Editar ${collabType === 'employee' ? 'Colaborador' : 'Sócio'}` : 'Novo Cadastro no DP'}
            maxWidth="4xl"
        >
            <form onSubmit={handleSubmit} className="flex flex-col h-[75vh] max-h-[750px]">
                {/* Header Sub-bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                        <button
                            type="button"
                            disabled={!!employeeToEdit}
                            onClick={() => setCollabType('employee')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                collabType === 'employee'
                                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            Empregado CLT
                        </button>
                        <button
                            type="button"
                            disabled={!!employeeToEdit}
                            onClick={() => setCollabType('partner')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                collabType === 'partner'
                                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            Sócio / Pró-Labore
                        </button>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                        {[
                            { id: 'pessoal', label: 'Dados Pessoais', icon: User },
                            { id: 'contrato', label: 'Contrato & Cargo', icon: Briefcase },
                            ...(collabType === 'employee' ? [{ id: 'beneficios', label: 'Benefícios', icon: HeartHandshake }] : []),
                            { id: 'endereco', label: 'Endereço & Contato', icon: MapPin },
                            { id: 'bancario', label: 'Dados Bancários', icon: Landmark }
                        ].map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold transition-all ${
                                        activeTab === tab.id
                                            ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60'
                                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <Icon size={15} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Form Body Scrollable */}
                <div className="flex-1 overflow-y-auto px-1 pr-3 space-y-6">
                    {/* TAB 1: DADOS PESSOAIS */}
                    {activeTab === 'pessoal' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-200">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Nome Completo <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Carlos Eduardo de Oliveira"
                                    value={formData.name}
                                    onChange={e => handleInputChange('name', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/30 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    CPF <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="000.000.000-00"
                                    maxLength={14}
                                    value={maskCPF(formData.cpf || '')}
                                    onChange={e => handleInputChange('cpf', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/30 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    RG / Documento
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: 12.345.678-9"
                                    value={formData.rg || ''}
                                    onChange={e => handleInputChange('rg', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Órgão Emissor
                                </label>
                                <input
                                    type="text"
                                    placeholder="SSP / DETRAN"
                                    value={formData.rgIssuer || 'SSP'}
                                    onChange={e => handleInputChange('rgIssuer', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Data de Nascimento
                                </label>
                                <input
                                    type="date"
                                    value={formData.birthDate || ''}
                                    onChange={e => handleInputChange('birthDate', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Gênero
                                </label>
                                <select
                                    value={formData.gender || 'Masculino'}
                                    onChange={e => handleInputChange('gender', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all cursor-pointer"
                                >
                                    <option value="Masculino">Masculino</option>
                                    <option value="Feminino">Feminino</option>
                                    <option value="Outro">Outro / Prefere não informar</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Estado Civil
                                </label>
                                <select
                                    value={formData.maritalStatus || 'Solteiro(a)'}
                                    onChange={e => handleInputChange('maritalStatus', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all cursor-pointer"
                                >
                                    <option value="Solteiro(a)">Solteiro(a)</option>
                                    <option value="Casado(a)">Casado(a)</option>
                                    <option value="União Estável">União Estável</option>
                                    <option value="Divorciado(a)">Divorciado(a)</option>
                                    <option value="Viúvo(a)">Viúvo(a)</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Nome da Mãe
                                </label>
                                <input
                                    type="text"
                                    placeholder="Nome completo da mãe"
                                    value={formData.motherName || ''}
                                    onChange={e => handleInputChange('motherName', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                />
                            </div>
                        </div>
                    )}

                    {/* TAB 2: CONTRATO & CARGO */}
                    {activeTab === 'contrato' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-200">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Cargo / Função <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Analista Contábil Pleno"
                                    value={formData.position || formData.role || ''}
                                    onChange={e => {
                                        handleInputChange('position', e.target.value);
                                        handleInputChange('role', e.target.value);
                                    }}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Departamento / Setor
                                </label>
                                <select
                                    value={formData.department || 'Operacional'}
                                    onChange={e => handleInputChange('department', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all cursor-pointer"
                                >
                                    <option value="Administrativo">Administrativo</option>
                                    <option value="Contábil / Fiscal">Contábil / Fiscal</option>
                                    <option value="Departamento Pessoal">Departamento Pessoal</option>
                                    <option value="Comercial / Vendas">Comercial / Vendas</option>
                                    <option value="Financeiro">Financeiro</option>
                                    <option value="Operacional">Operacional</option>
                                    <option value="Tecnologia / TI">Tecnologia / TI</option>
                                    <option value="Diretoria">Diretoria</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    {collabType === 'employee' ? 'Salário Base Contratual (R$)' : 'Valor do Pró-Labore (R$)'} <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        min="0"
                                        value={collabType === 'employee' ? formData.salary : formData.proLaboreValue}
                                        onChange={e => {
                                            const val = parseFloat(e.target.value) || 0;
                                            handleInputChange('salary', val);
                                            handleInputChange('proLaboreValue', val);
                                        }}
                                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-emerald-600 dark:text-emerald-400 outline-none focus:border-sky-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Data de Admissão / Início <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.admissionDate || ''}
                                    onChange={e => handleInputChange('admissionDate', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Status Atual
                                </label>
                                <select
                                    value={formData.status || 'ativo'}
                                    onChange={e => handleInputChange('status', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all cursor-pointer"
                                >
                                    <option value="ativo">Ativo</option>
                                    <option value="ferias">Em Férias</option>
                                    <option value="afastado">Afastado (INSS / Licença)</option>
                                    <option value="inativo">Inativo / Desligado</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Código CBO
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: 4110-10"
                                    value={formData.cbo || ''}
                                    onChange={e => handleInputChange('cbo', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                />
                            </div>

                            {collabType === 'employee' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Tipo de Contrato CLT
                                        </label>
                                        <select
                                            value={formData.contractType || 'indeterminado'}
                                            onChange={e => handleInputChange('contractType', e.target.value)}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all cursor-pointer"
                                        >
                                            <option value="indeterminado">Prazo Indeterminado</option>
                                            <option value="experiencia_45">Experiência (45 + 45 dias)</option>
                                            <option value="experiencia_30">Experiência (30 + 60 dias)</option>
                                            <option value="determinado">Prazo Determinado</option>
                                            <option value="estagio">Termo de Estágio (Lei 11.788)</option>
                                            <option value="jovem_aprendiz">Jovem Aprendiz</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Jornada Semanal (Horas)
                                        </label>
                                        <select
                                            value={formData.weeklyHours || '44'}
                                            onChange={e => handleInputChange('weeklyHours', e.target.value)}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all cursor-pointer"
                                        >
                                            <option value="44">44h Semanais (Padrão 220h/mês)</option>
                                            <option value="40">40h Semanais (200h/mês)</option>
                                            <option value="36">36h Semanais (180h/mês - 12x36)</option>
                                            <option value="30">30h Semanais (150h/mês)</option>
                                            <option value="20">20h Semanais (100h/mês - Parcial)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Número PIS / NIS / PASEP
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="000.00000.00-0"
                                            value={formData.pis || ''}
                                            onChange={e => handleInputChange('pis', e.target.value)}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            CTPS Número
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ex: 1234567"
                                            value={formData.ctpsNum || ''}
                                            onChange={e => handleInputChange('ctpsNum', e.target.value)}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            CTPS Série / UF
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ex: 001-0 / SP"
                                            value={formData.ctpsSeries || ''}
                                            onChange={e => handleInputChange('ctpsSeries', e.target.value)}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* TAB 3: BENEFÍCIOS (SOMENTE CLT) */}
                    {activeTab === 'beneficios' && collabType === 'employee' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Dependentes */}
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                                            Dependentes Legais (IRRF / Sal. Família)
                                        </h4>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-3">
                                        Dedução legal de R$ 189,59 por dependente na base de cálculo do Imposto de Renda Retido na Fonte.
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Quantidade:</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="15"
                                            value={formData.dependents || '0'}
                                            onChange={e => handleInputChange('dependents', e.target.value)}
                                            className="w-24 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-black text-center outline-none focus:border-sky-500"
                                        />
                                    </div>
                                </div>

                                {/* Vale Transporte */}
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                                                Vale Transporte (VT)
                                            </h4>
                                            <input
                                                type="checkbox"
                                                id="vt-check"
                                                checked={Boolean(formData.transportVoucher)}
                                                onChange={e => handleInputChange('transportVoucher', e.target.checked)}
                                                className="w-5 h-5 accent-sky-600 rounded cursor-pointer"
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Desconto em folha limitado a 6% do salário base contratual do colaborador.
                                        </p>
                                    </div>
                                    {formData.transportVoucher && (
                                        <div className="mt-3 text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 p-2 rounded-xl">
                                            Desconto estimado: até {formatCurrency(formData.salary * 0.06)}
                                        </div>
                                    )}
                                </div>

                                {/* Plano de Saúde */}
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                                            Assistência Médica / Plano de Saúde
                                        </h4>
                                        <input
                                            type="checkbox"
                                            checked={Boolean(formData.healthPlan)}
                                            onChange={e => handleInputChange('healthPlan', e.target.checked)}
                                            className="w-5 h-5 accent-sky-600 rounded cursor-pointer"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mb-3">
                                        Coparticipação ou mensalidade debitada mensalmente do colaborador.
                                    </p>
                                    {formData.healthPlan && (
                                        <div className="flex items-center gap-3">
                                            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Valor Desconto (R$):</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.healthPlanValue || 180}
                                                onChange={e => handleInputChange('healthPlanValue', parseFloat(e.target.value) || 0)}
                                                className="w-32 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold outline-none focus:border-sky-500"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Vale Refeição / Alimentação */}
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                                                Vale Refeição / Alimentação (PAT)
                                            </h4>
                                            <input
                                                type="checkbox"
                                                checked={Boolean(formData.mealVoucher)}
                                                onChange={e => handleInputChange('mealVoucher', e.target.checked)}
                                                className="w-5 h-5 accent-sky-600 rounded cursor-pointer"
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Benefício de alimentação fornecido ao empregado vinculado ou não ao PAT.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: ENDEREÇO & CONTATO */}
                    {activeTab === 'endereco' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-200">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    CEP
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="00000-000"
                                        maxLength={9}
                                        value={maskCEP(formData.zip || '')}
                                        onChange={e => handleInputChange('zip', e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCepLookup}
                                        disabled={isSearchingCep}
                                        className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-slate-700 dark:text-slate-200 transition-colors"
                                        title="Buscar CEP"
                                    >
                                        {isSearchingCep ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Logradouro (Rua, Av., Alameda)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: Av. Paulista"
                                    value={formData.address || ''}
                                    onChange={e => handleInputChange('address', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Número
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: 1000, Apto 42"
                                    value={formData.addressNumber || ''}
                                    onChange={e => handleInputChange('addressNumber', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Bairro
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: Bela Vista"
                                    value={formData.addressDistrict || ''}
                                    onChange={e => handleInputChange('addressDistrict', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                />
                            </div>

                            <div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Cidade
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="São Paulo"
                                            value={formData.city || ''}
                                            onChange={e => handleInputChange('city', e.target.value)}
                                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            UF
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={2}
                                            placeholder="SP"
                                            value={formData.uf || 'SP'}
                                            onChange={e => handleInputChange('uf', e.target.value.toUpperCase())}
                                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-center uppercase outline-none focus:border-sky-500 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Telefone / Celular
                                </label>
                                <input
                                    type="text"
                                    placeholder="(11) 99999-9999"
                                    value={maskPhone(formData.mobilePhone || '')}
                                    onChange={e => handleInputChange('mobilePhone', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    E-mail Profissional / Pessoal
                                </label>
                                <input
                                    type="email"
                                    placeholder="colaborador@empresa.com.br"
                                    value={formData.email || ''}
                                    onChange={e => handleInputChange('email', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Contato de Emergência
                                </label>
                                <input
                                    type="text"
                                    placeholder="Nome / Parentesco / Tel"
                                    value={formData.emergencyContact || ''}
                                    onChange={e => handleInputChange('emergencyContact', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                />
                            </div>
                        </div>
                    )}

                    {/* TAB 5: DADOS BANCÁRIOS */}
                    {activeTab === 'bancario' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Instituição Bancária
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: 260 - Nu Pagamentos / 001 - Banco do Brasil"
                                    value={formData.bank || ''}
                                    onChange={e => handleInputChange('bank', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Chave PIX
                                </label>
                                <input
                                    type="text"
                                    placeholder="CPF, E-mail, Celular ou Aleatória"
                                    value={formData.pix || ''}
                                    onChange={e => handleInputChange('pix', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Agência
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: 0001"
                                    value={formData.agency || ''}
                                    onChange={e => handleInputChange('agency', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Conta Corrente / Salário
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: 1234567-8"
                                    value={formData.account || ''}
                                    onChange={e => handleInputChange('account', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-sky-500 transition-all"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <div className="flex items-center gap-3">
                        <Button
                            type="submit"
                            disabled={isSaving}
                            className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-md shadow-sky-500/20"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 size={16} className="animate-spin mr-2" />
                                    Gravando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={16} className="mr-2" />
                                    {employeeToEdit ? 'Atualizar Cadastro' : 'Confirmar Admissão'}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};
