import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Button } from '../components/ui/Button';
import {
    Upload, Settings, Save, Pencil, Search, Loader2, X, ExternalLink, CreditCard, Building2, FileText, User, ShieldCheck, FileKey, Calendar, Lock, Unlock, Landmark, Plus, Trash2, ArrowUp, ArrowDown
} from 'lucide-react';
import { maskCNPJ, maskCEP, unmask, formatDateBR } from '../utils/formatters';
import * as forge from 'node-forge';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig';

// Component defined OUTSIDE to prevent re-mounting on every render
const CompanyInput = ({ label, name, value, onChange, type = "text", required = false, numericOnly = false, className = '', onBlur, rightIcon, isLoading, ...props }: any) => {
    return (
        <div className={`flex flex-col relative ${className}`}>
            <label className="text-xs font-semibold text-gray-600 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
            <div className="relative">
                <input
                    type={type}
                    name={name}
                    required={required}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none placeholder-gray-400 disabled:bg-gray-50"
                    onChange={onChange}
                    onBlur={onBlur}
                    value={value || ''}
                    {...props}
                />
                {rightIcon && <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightIcon}</div>}
                {isLoading && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                    </div>
                )}
            </div>
        </div>
    );
};

export const Company: React.FC = () => {

    const { selectedCompany, saveCompany, partners, bankAccounts, addBankAccount, deleteBankAccount, accountingClosures, updateAccountingClosure } = useData();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'cadastral');
    const [isEditing, setIsEditing] = useState(false);
    const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);
    const [isLoadingCEP, setIsLoadingCEP] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [showAccountForm, setShowAccountForm] = useState(false);
    const [newAccount, setNewAccount] = useState({ bankName: '', agency: '', accountNumber: '', balance: 0, type: 'checking' });

    // Auth Modal State
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authPassword, setAuthPassword] = useState('');
    const [pendingClosureReopen, setPendingClosureReopen] = useState<any>(null);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'period', direction: 'desc' });

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Filter partners belonging to this company
    const companyPartners = partners.filter(p => !p.companyId || p.companyId === selectedCompany?.id);
    const companyAccounts = bankAccounts.filter(b => !b.companyId || b.companyId === selectedCompany?.id);

    const handleAddAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addBankAccount({
                ...newAccount,
                id: '', // let backend generate
                companyId: selectedCompany?.id || '1'
            } as any);
            setShowAccountForm(false);
            setNewAccount({ bankName: '', agency: '', accountNumber: '', balance: 0, type: 'checking' });
            alert("Conta bancária adicionada com sucesso!");
        } catch (error) {
            console.error(error);
            alert("Erro ao adicionar conta.");
        }
    };

    const handleReopenClick = (closure: any) => {
        setPendingClosureReopen(closure);
        setAuthPassword('');
        setIsAuthModalOpen(true);
    };

    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (authPassword === '3830') {
            if (pendingClosureReopen) {
                await updateAccountingClosure({
                    ...pendingClosureReopen,
                    status: 'open',
                    notes: (pendingClosureReopen.notes || '') + `\n[${new Date().toLocaleString()}] Reaberto por usuário (Senha Admin).`,
                    lastUpdated: new Date().toISOString()
                });
                alert(`Período ${pendingClosureReopen.period} reaberto com sucesso!`);
                setIsAuthModalOpen(false);
                setPendingClosureReopen(null);
            }
        } else {
            alert('Senha incorreta! Acesso negado.');
        }
    };

    // Local Form Data initialized with selected company
    const [formData, setFormData] = useState<any>({
        razaoSocial: '',
        nomeFantasia: '',
        cnpj: '',
        ie: '',
        regimeJuridico: 'ltda',
        dataAbertura: '',
        porte: 'demais',
        address: {
            street: '',
            number: '',
            city: '',
            uf: '',
            zip: '',
            neighborhood: ''
        },
        ...selectedCompany || {}
    });

    useEffect(() => {
        if (selectedCompany) {
            setFormData({
                ...selectedCompany,
                cnpj: maskCNPJ(selectedCompany.cnpj || ''),
                address: selectedCompany.address ? {
                    ...selectedCompany.address,
                    zip: maskCEP(selectedCompany.address.zip || '')
                } : { street: '', number: '', city: '', uf: '', zip: '', neighborhood: '', quadra: '', lote: '', complemento: '' }
            });
        }
    }, [selectedCompany]);

    const handleFetchCNPJ = async () => {
        const cleanCNPJ = unmask(formData.cnpj);
        if (cleanCNPJ.length !== 14) {
            alert("Por favor, insira um CNPJ válido (14 dígitos) para pesquisar.");
            return;
        }
        setIsLoadingCNPJ(true);

        // Helper para normalizar dados de diferentes APIs
        const normalizeData = (data: any, source: string) => {
            if (source === 'brasilapi') {
                return {
                    razaoSocial: data.razao_social || '',
                    nomeFantasia: data.nome_fantasia || '',
                    dataAbertura: data.data_inicio_atividade || '',
                    logradouro: data.logradouro || '',
                    numero: data.numero || '',
                    bairro: data.bairro || '',
                    municipio: data.municipio || '',
                    uf: data.uf || '',
                    cep: data.cep || '',
                    cityCode: data.municipio_id || '',
                    email: data.email || '',
                    telefone: data.ddd_telefone_1 || '',
                };
            } else if (source === 'receitaws') {
                return {
                    razaoSocial: data.nome || '',
                    nomeFantasia: data.fantasia || '',
                    dataAbertura: data.abertura || '',
                    logradouro: data.logradouro || '',
                    numero: data.numero || '',
                    bairro: data.bairro || '',
                    municipio: data.municipio || '',
                    uf: data.uf || '',
                    cep: data.cep || '',
                    cityCode: '',
                    email: data.email || '',
                    telefone: data.telefone || '',
                };
            } else { // cnpj.ws
                return {
                    razaoSocial: data.razao_social || '',
                    nomeFantasia: data.estabelecimento?.nome_fantasia || '',
                    dataAbertura: data.estabelecimento?.data_inicio_atividade || '',
                    logradouro: data.estabelecimento?.logradouro || '',
                    numero: data.estabelecimento?.numero || '',
                    bairro: data.estabelecimento?.bairro || '',
                    municipio: data.estabelecimento?.cidade?.nome || '',
                    uf: data.estabelecimento?.estado?.sigla || '',
                    cep: data.estabelecimento?.cep || '',
                    cityCode: '',
                    email: data.estabelecimento?.email || '',
                    telefone: data.estabelecimento?.ddd1 && data.estabelecimento?.telefone1
                        ? `(${data.estabelecimento.ddd1}) ${data.estabelecimento.telefone1}` : '',
                };
            }
        };

        const apis = [
            { url: `https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`, source: 'brasilapi' },
            { url: `https://receitaws.com.br/v1/cnpj/${cleanCNPJ}`, source: 'receitaws' },
            { url: `https://publica.cnpj.ws/cnpj/${cleanCNPJ}`, source: 'cnpjws' },
        ];

        let success = false;
        for (const api of apis) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 8000);
                const response = await fetch(api.url, { signal: controller.signal });
                clearTimeout(timeout);

                if (!response.ok) continue;
                const data = await response.json();
                if (data.status === 'ERROR' || data.message === 'CNPJ inválido') continue;

                const norm = normalizeData(data, api.source);
                setFormData((prev: any) => ({
                    ...prev,
                    razaoSocial: norm.razaoSocial,
                    nomeFantasia: norm.nomeFantasia,
                    dataAbertura: norm.dataAbertura,
                    email: norm.email,
                    telefone: norm.telefone,
                    address: {
                        ...prev.address,
                        street: norm.logradouro,
                        number: norm.numero,
                        neighborhood: norm.bairro,
                        city: norm.municipio,
                        uf: norm.uf,
                        zip: maskCEP(norm.cep.replace(/\D/g, '')),
                        cityCode: norm.cityCode,
                    },
                }));
                success = true;
                break;
            } catch (err) {
                console.warn(`[CNPJ] Falha na API ${api.source}:`, err);
                continue;
            }
        }

        if (success) {
            alert("Dados encontrados e preenchidos com sucesso!");
        } else {
            alert("Não foi possível buscar os dados deste CNPJ. Verifique a conexão com a internet ou tente novamente.");
        }

        setIsLoadingCNPJ(false);
    };

    const handleFetchCEP = async () => {
        const cleanCEP = unmask(formData.address?.zip || '');
        if (cleanCEP.length !== 8) return;

        setIsLoadingCEP(true);
        try {
            const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCEP}`);
            if (!response.ok) throw new Error('CEP não encontrado');
            const data = await response.json();

            setFormData((prev: any) => ({
                ...prev,
                address: {
                    ...prev.address,
                    street: data.street,
                    city: data.city,
                    uf: data.state,
                    neighborhood: data.neighborhood,
                    cityCode: data.ibge,
                    zip: maskCEP(data.cep) // Ensure mask is applied
                }
            }));
        } catch (error) {
            console.error(error);
            alert('Erro ao buscar CEP. Verifique se o código está correto.');
        } finally {
            setIsLoadingCEP(false);
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limit initial file size check to 5MB, we will compress it anyway
        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxSize = 250; // Max dimension 250px ensures small string size (~20-50KB)

                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    // Compress to JPEG at 0.7 quality
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    setFormData((prev: any) => ({ ...prev, logo: dataUrl }));
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);

        // Reset uploading state just in case, though we don't use async upload anymore
        setIsUploadingLogo(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedCompany) {
            try {
                await saveCompany({
                    ...selectedCompany,
                    ...formData
                });
                setIsEditing(false);
                alert("Dados da empresa salvos com sucesso!");
            } catch (error) {
                console.error(error);
                alert(`Erro ao salvar dados da empresa: ${(error as any).message || 'Erro desconhecido'}`);
            }
        }
    }

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        let formattedValue = type === 'checkbox' ? checked : value;

        if (name === 'cnpj') formattedValue = maskCNPJ(value);
        if (name === 'address.zip') formattedValue = maskCEP(value);
        if (name === 'nire') formattedValue = value.replace(/\D/g, '');

        // Auto-fill Anexo do Simples based on Ramo de Atividade
        if (name === 'ramoAtividade') {
            const anexoMap: Record<string, string> = {
                'comercio': 'I',
                'industria': 'II',
                'servicos': 'III'
            };
            const defaultAnexo = anexoMap[value];
            if (defaultAnexo) {
                setFormData((prev: any) => ({
                    ...prev,
                    ramoAtividade: value,
                    anexoSimples: defaultAnexo
                }));
                return;
            }
        }

        if (name.includes('.')) {
            const keys = name.split('.');
            setFormData((prev: any) => {
                const newState = { ...prev };
                let current = newState;
                for (let i = 0; i < keys.length - 1; i++) {
                    current[keys[i]] = { ...current[keys[i]] };
                    current = current[keys[i]];
                }
                current[keys[keys.length - 1]] = formattedValue;
                return newState;
            });
        } else {
            setFormData((prev: any) => ({ ...prev, [name]: formattedValue }));
        }
    }

    // Helper to safely get nested values
    const getValue = (path: string) => {
        return path.includes('.') ? path.split('.').reduce((o: any, i: any) => o?.[i], formData) : formData[path];
    };

    return (
        <div className="space-y-6 pb-12">
            <form onSubmit={handleSave}>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Minha Empresa</h1>
                        <p className="text-gray-500">Editando: {selectedCompany?.nomeFantasia}</p>
                    </div>
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <Button type="button" variant="secondary" onClick={() => setIsEditing(false)} icon={X}>Cancelar</Button>
                                <Button type="submit" icon={Save}>Salvar Alterações</Button>
                            </>
                        ) : (
                            <Button type="button" variant="outline" icon={Pencil} onClick={() => setIsEditing(true)}>Editar Dados</Button>
                        )}
                    </div>
                </div>

                <div className="bg-white border-b border-gray-200 flex overflow-x-auto rounded-t-xl">
                    {[
                        { id: 'cadastral', label: 'Dados Cadastrais', icon: Building2 },
                        { id: 'fiscal', label: 'Fiscal & Contábil', icon: FileText },
                        { id: 'certificate', label: 'Certificado Digital', icon: ShieldCheck },
                        { id: 'socios', label: 'Sócios e Responsáveis', icon: User },
                        { id: 'config', label: 'Arquivos & Config', icon: Settings },
                        { id: 'accounts', label: 'Contas Bancárias', icon: CreditCard },
                        { id: 'fechamentos', label: 'Fechamentos', icon: Lock },
                    ].map(tab => (
                        <button type="button" key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-orange-500 text-orange-600 bg-orange-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                            <tab.icon className="w-4 h-4 mr-2" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 border-t-0 p-6">
                    {activeTab === 'cadastral' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            {/* Logo Section */}
                            <div className="flex flex-col sm:flex-row gap-6 items-start border-b border-gray-100 pb-6">
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Logotipo</span>
                                    <div className="relative group w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
                                        {formData.logo ? (
                                            <img src={formData.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <div className="text-center p-4">
                                                {isUploadingLogo ? (
                                                    <Loader2 className="w-8 h-8 mx-auto text-orange-500 animate-spin mb-2" />
                                                ) : (
                                                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                                )}
                                                <span className="text-xs text-gray-400">{isUploadingLogo ? 'Enviando...' : 'Sem Logo'}</span>
                                            </div>
                                        )}
                                        {isEditing && !isUploadingLogo && (
                                            <label className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                                                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                                                <span className="text-white text-xs font-medium">Alterar</span>
                                            </label>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 w-full">
                                    <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-4 border-b pb-2">1. Dados Básicos</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="flex flex-col relative ">
                                            <label className="text-xs font-semibold text-gray-600 mb-1">Status  <span className="text-red-500">*</span></label>
                                            <select
                                                name="status"
                                                value={getValue('status') || 'active'}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none disabled:bg-gray-50"
                                            >
                                                <option value="active">Ativa</option>
                                                <option value="inactive">Inativa</option>
                                            </select>
                                        </div>
                                        <CompanyInput label="CNPJ" name="cnpj" value={getValue('cnpj')} onChange={handleChange} disabled={!isEditing} placeholder="00.000.000/0000-00" maxLength={18} required rightIcon={<button onClick={handleFetchCNPJ} disabled={!isEditing || isLoadingCNPJ || !formData.cnpj} className="p-1.5 bg-orange-100 text-orange-600 rounded hover:bg-orange-200 disabled:opacity-50 transition-colors" type="button">{isLoadingCNPJ ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}</button>} />
                                        <CompanyInput label="NIRE" name="nire" value={getValue('nire')} onChange={handleChange} disabled={!isEditing} placeholder="Apenas números" maxLength={11} />
                                        <CompanyInput label="Razão Social" name="razaoSocial" value={getValue('razaoSocial')} onChange={handleChange} disabled={!isEditing} />
                                        <CompanyInput label="Nome Fantasia" name="nomeFantasia" value={getValue('nomeFantasia')} onChange={handleChange} disabled={!isEditing} required />
                                        <CompanyInput label="Inscrição Estadual (IE)" name="ie" value={getValue('ie')} onChange={handleChange} disabled={!isEditing} />
                                        <CompanyInput label="Data de Abertura" name="dataAbertura" value={getValue('dataAbertura')} onChange={handleChange} disabled={!isEditing} type="date" />
                                        <CompanyInput label="E-mail" name="email" value={getValue('email')} onChange={handleChange} disabled={!isEditing} type="email" />
                                        <CompanyInput label="Telefone" name="telefone" value={getValue('telefone')} onChange={handleChange} disabled={!isEditing} />
                                    </div>
                                </div>
                            </div>
                            <section>
                                <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-4 border-b pb-2">2. Endereço Completo</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <CompanyInput label="CEP" name="address.zip" value={getValue('address.zip')} onChange={handleChange} disabled={!isEditing} placeholder="00000-000" maxLength={9} required onBlur={handleFetchCEP} isLoading={isLoadingCEP} />
                                    <CompanyInput label="Logradouro" name="address.street" value={getValue('address.street')} onChange={handleChange} disabled={!isEditing} className="md:col-span-2" required />
                                    <CompanyInput label="Número" name="address.number" value={getValue('address.number')} onChange={handleChange} disabled={!isEditing} required />
                                    <CompanyInput label="Complemento" name="address.complemento" value={getValue('address.complemento')} onChange={handleChange} disabled={!isEditing} />
                                    <CompanyInput label="Quadra" name="address.quadra" value={getValue('address.quadra')} onChange={handleChange} disabled={!isEditing} />
                                    <CompanyInput label="Lote" name="address.lote" value={getValue('address.lote')} onChange={handleChange} disabled={!isEditing} />
                                    <CompanyInput label="Bairro" name="address.neighborhood" value={getValue('address.neighborhood')} onChange={handleChange} disabled={!isEditing} />
                                    <CompanyInput label="Município" name="address.city" value={getValue('address.city')} onChange={handleChange} disabled={!isEditing} required />
                                    <CompanyInput label="Cód. Município" name="address.cityCode" value={getValue('address.cityCode')} onChange={handleChange} disabled={!isEditing} placeholder="0000000" maxLength={7} />
                                    <CompanyInput label="UF" name="address.uf" value={getValue('address.uf')} onChange={handleChange} disabled={!isEditing} maxLength={2} className="w-20" required />
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'socios' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <section>
                                <div className="flex justify-between items-center mb-4 border-b pb-2">
                                    <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider">5. Quadro Societário</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">Gerenciado no menu Cadastros</span>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/app/crm')}
                                            className="text-xs text-orange-600 hover:underline flex items-center font-medium"
                                        >
                                            Gerenciar Sócios <ExternalLink size={12} className="ml-1" />
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 text-gray-600 text-xs uppercase"><th className="p-3">Nome</th><th className="p-3">CPF</th><th className="p-3">Cargo</th><th className="p-3 text-right">Participação</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {companyPartners.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="p-8 text-center text-gray-400">
                                                        <div className="flex flex-col items-center">
                                                            <User className="w-8 h-8 mb-2 opacity-50" />
                                                            <p className="text-sm font-medium">Nenhum sócio vinculado a esta empresa.</p>
                                                            <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate('/app/crm')}>Cadastrar Sócio</Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                companyPartners.map(p => (
                                                    <tr key={p.id}>
                                                        <td className="p-3 font-medium">{p.name}</td>
                                                        <td className="p-3 text-gray-500">{p.cpf}</td>
                                                        <td className="p-3 text-gray-500">{p.role}</td>
                                                        <td className="p-3 text-right">{p.participation}%</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'fiscal' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-sm">
                                <h4 className="font-bold mb-1">Regime Tributário</h4>
                                <p>Configurações usadas para cálculo de impostos.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Regime Tributário (CRT) {isEditing && <span className="text-red-500">*</span>}</label>
                                    <select
                                        name="regimeTributario"
                                        value={getValue('regimeTributario') || ''}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none disabled:bg-gray-50"
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="1">1 - Simples Nacional</option>
                                        <option value="2">2 - Simples Nacional (Excesso de Sublimite)</option>
                                        <option value="3">3 - Regime Normal (Lucro Presumido/Real)</option>
                                        <option value="4">4 - Microempreendedor Individual (MEI)</option>
                                        <option value="5">5 - Imune / Isenta (Igrejas e Entidades Sem Fins Lucrativos)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Ramo de Atividade</label>
                                    <select
                                        name="ramoAtividade"
                                        value={getValue('ramoAtividade') || ''}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none disabled:bg-gray-50"
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="comercio">Comércio</option>
                                        <option value="servicos">Serviços</option>
                                        <option value="industria">Indústria</option>
                                        <option value="misto">Misto (Comércio e Serviços)</option>
                                        <option value="outros">Outros</option>
                                    </select>
                                </div>

                                <CompanyInput label="CNAE Principal" name="cnae" value={getValue('cnae')} onChange={handleChange} disabled={!isEditing} placeholder="00000-00" />
                                <CompanyInput label="Inscrição Municipal" name="im" value={getValue('im')} onChange={handleChange} disabled={!isEditing} />
                                <CompanyInput label="Inscrição Estadual" name="ie" value={getValue('ie')} onChange={handleChange} disabled={!isEditing} />
                                {getValue('ramoAtividade') !== 'comercio' && (
                                    <CompanyInput label="Alíquota ISS (%)" name="aliquotaISS" value={getValue('aliquotaISS')} onChange={handleChange} disabled={!isEditing} type="number" step="0.01" />
                                )}
                                <CompanyInput label="Est. Imposto Médio (%)" name="taxEstimationRate" value={getValue('taxEstimationRate')} onChange={handleChange} disabled={!isEditing} type="number" step="0.01" placeholder="6.0" />
                                <CompanyInput label="Fator Encargos Folha" name="payrollOverheadFactor" value={getValue('payrollOverheadFactor')} onChange={handleChange} disabled={!isEditing} type="number" step="0.01" placeholder="1.6" />
                                <div className="md:col-span-2">
                                    <CompanyInput label="Token IBPT (Imposto na Nota)" name="tokenIBPT" value={getValue('tokenIBPT')} onChange={handleChange} disabled={!isEditing} placeholder="Chave da API De Olho No Imposto" />
                                </div>

                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm md:col-span-2">
                                    <h4 className="font-bold mb-1">Configurações SEFIP 8.4</h4>
                                    <p>Informações necessárias para a geração do arquivo GFIP/SEFIP.</p>
                                </div>

                                <CompanyInput label="Código FPAS" name="fpas" value={getValue('fpas')} onChange={handleChange} disabled={!isEditing} placeholder="Ex: 515" maxLength={4} />
                                <CompanyInput label="Cód. Terceiros" name="codigoTerceiros" value={getValue('codigoTerceiros')} onChange={handleChange} disabled={!isEditing} placeholder="Ex: 0000" maxLength={4} />
                                <CompanyInput label="Alíquota FAP (%)" name="fap" value={getValue('fap')} onChange={handleChange} disabled={!isEditing} placeholder="Ex: 1.0" type="number" step="0.0001" />
                                <CompanyInput label="Alíquota RAT (%)" name="aliquotaRAT" value={getValue('aliquotaRAT')} onChange={handleChange} disabled={!isEditing} placeholder="Ex: 2.0" type="number" step="0.1" />
                                <div className="flex flex-col relative">
                                    <label className="text-xs font-semibold text-gray-600 mb-1">Indicador Simples</label>
                                    <select
                                        name="indicadorSimples"
                                        value={getValue('indicadorSimples') || '1'}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none disabled:bg-gray-50"
                                    >
                                        <option value="1">1 - Não Optante</option>
                                        <option value="2">2 - Optante (Exceto Anexos IV e V)</option>
                                        <option value="3">3 - Optante (Atividades Concorrentes)</option>
                                        <option value="4">4 - MEI</option>
                                        <option value="6">6 - Optante (Excesso de Sublimite)</option>
                                    </select>
                                </div>
                                <div className="flex flex-col relative">
                                    <label className="text-xs font-semibold text-gray-600 mb-1">Centralização</label>
                                    <select
                                        name="centralizacao"
                                        value={getValue('centralizacao') || '0'}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none disabled:bg-gray-50"
                                    >
                                        <option value="0">0 - Sem Centralização</option>
                                        <option value="1">1 - Centralizadora</option>
                                        <option value="2">2 - Centralizada</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border border-orange-200 p-4 rounded-xl bg-orange-50/50">
                                    <div className="md:col-span-2 border-b border-orange-200 pb-2 mb-2">
                                        <h4 className="text-sm font-bold text-orange-800">Campos Obrigatórios SEFIP 8.4</h4>
                                    </div>
                                    <CompanyInput label="CNAE Preponderante" name="cnae" value={getValue('cnae')} onChange={handleChange} disabled={!isEditing} placeholder="7 dígitos" maxLength={7} />
                                    <CompanyInput label="FPAS" name="fpas" value={getValue('fpas')} onChange={handleChange} disabled={!isEditing} placeholder="4 dígitos" maxLength={4} />
                                    
                                     <div className="flex flex-col relative">
                                        <label className="text-xs font-semibold text-gray-600 mb-1">Alteração de Endereço</label>
                                        <select
                                            name="indicadorAlteracaoEndereco"
                                            value={getValue('indicadorAlteracaoEndereco') || 'N'}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none disabled:bg-gray-50"
                                        >
                                            <option value="N">N - Não</option>
                                            <option value="S">S - Sim</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col relative">
                                        <label className="text-xs font-semibold text-gray-600 mb-1">Alteração de CNAE</label>
                                        <select
                                            name="indicadorAlteracaoCnae"
                                            value={getValue('indicadorAlteracaoCnae') || 'N'}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none disabled:bg-gray-50"
                                        >
                                            <option value="N">N - Não</option>
                                            <option value="S">S - Sim</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col relative">
                                        <label className="text-xs font-semibold text-gray-600 mb-1">Alíquota RAT (%)</label>
                                        <select
                                            name="aliquotaRAT"
                                            value={getValue('aliquotaRAT') || '1'}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none disabled:bg-gray-50"
                                        >
                                            <option value="0">0% - Doméstico / Simples isento</option>
                                            <option value="1">1% - Risco Leve</option>
                                            <option value="2">2% - Risco Médio</option>
                                            <option value="3">3% - Risco Grave</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col relative">
                                        <label className="text-xs font-semibold text-gray-600 mb-1">Indicador Simples (SEFIP)</label>
                                        <select
                                            name="indicadorSimples"
                                            value={getValue('indicadorSimples') || '6'}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none disabled:bg-gray-50"
                                        >
                                            <option value="6">6 - Não Optante pelo Simples</option>
                                            <option value="1">1 - Optante pelo Simples Nacional</option>
                                            <option value="2">2 - CI / Empregador Doméstico Simples</option>
                                            <option value="3">3 - Simples sem Movimento</option>
                                            <option value="4">4 - Empresa c/ Parte dos Resultados</option>
                                        </select>
                                    </div>
                                    <CompanyInput label="Código Recolhimento" name="codigoRecolhimento" value={getValue('codigoRecolhimento')} onChange={handleChange} disabled={!isEditing} placeholder="Ex: 115" maxLength={3} />
                                    <CompanyInput label="Modalidade SEFIP" name="modalidade" value={getValue('modalidade')} onChange={handleChange} disabled={!isEditing} placeholder="Ex: ' '" maxLength={1} />
                                </div>
                                <div className="flex flex-col relative">
                                    <label className="text-xs font-semibold text-gray-600 mb-1">Tipo de Inscrição Tomador</label>
                                    <select
                                        name="tipoInscricaoTomador"
                                        value={getValue('tipoInscricaoTomador') || '0'}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none disabled:bg-gray-50"
                                    >
                                        <option value="0">0 - Sem Tomador</option>
                                        <option value="1">1 - CNPJ</option>
                                        <option value="2">2 - CEI</option>
                                    </select>
                                </div>
                                <CompanyInput label="Inscrição do Tomador/Obra" name="inscricaoTomador" value={getValue('inscricaoTomador')} onChange={handleChange} disabled={!isEditing} placeholder="CNPJ/CEI do tomador" />
                                <div className="flex flex-col relative">
                                    <label className="text-xs font-semibold text-gray-600 mb-1">Tipo Inscrição Fornecedor</label>
                                    <select
                                        name="tipoInscricaoFornecedor"
                                        value={getValue('tipoInscricaoFornecedor') || '1'}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none disabled:bg-gray-50"
                                    >
                                        <option value="1">1 - CNPJ</option>
                                        <option value="2">2 - CEI</option>
                                        <option value="3">3 - CPF</option>
                                    </select>
                                </div>
                                <CompanyInput label="Inscrição do Fornecedor" name="inscricaoFornecedor" value={getValue('inscricaoFornecedor')} onChange={handleChange} disabled={!isEditing} placeholder="CNPJ/CEI/CPF" />

                                {getValue('regimeTributario') === '1' && (
                                    <>
                                        <CompanyInput label="Alíquota Simples (%)" name="aliquotaSimples" value={getValue('aliquotaSimples')} onChange={handleChange} disabled={!isEditing} type="number" step="0.01" />
                                        <CompanyInput label="Anexo do Simples" name="anexoSimples" value={getValue('anexoSimples')} onChange={handleChange} disabled={!isEditing} placeholder="I, II, III..." />
                                    </>
                                )}

                                {getValue('regimeTributario') === '3' && (
                                    <>
                                        <CompanyInput label="Alíquota PIS (%)" name="aliquotaPIS" value={getValue('aliquotaPIS')} onChange={handleChange} disabled={!isEditing} type="number" step="0.01" />
                                        <CompanyInput label="Alíquota COFINS (%)" name="aliquotaCOFINS" value={getValue('aliquotaCOFINS')} onChange={handleChange} disabled={!isEditing} type="number" step="0.01" />
                                    </>
                                )}
                            </div>

                            <hr className="my-6 border-gray-200" />

                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
                                <h4 className="font-bold mb-1">Obrigações Acessórias (SPED & eSocial)</h4>
                                <p>Configure quais módulos devem ser ativos para esta empresa.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {/* EFD Contribuições */}
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <input
                                            type="checkbox"
                                            id="efdContrib"
                                            name="fiscalSettings.efdContrib.active"
                                            checked={getValue('fiscalSettings.efdContrib.active') || false}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                        />
                                        <label htmlFor="efdContrib" className="font-bold text-gray-700">EFD Contribuições (PIS/COFINS)</label>
                                    </div>
                                    {getValue('fiscalSettings.efdContrib.active') && (
                                        <div className="pl-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <CompanyInput label="Atividade (0-Ind, 1-Fin...)" name="fiscalSettings.efdContrib.activity" value={getValue('fiscalSettings.efdContrib.activity')} onChange={handleChange} disabled={!isEditing} />
                                        </div>
                                    )}
                                </div>

                                {/* EFD Reinf */}
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <input
                                            type="checkbox"
                                            id="efdReinf"
                                            name="fiscalSettings.efdReinf.active"
                                            checked={getValue('fiscalSettings.efdReinf.active') || false}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                        />
                                        <label htmlFor="efdReinf" className="font-bold text-gray-700">EFD Reinf</label>
                                    </div>
                                    {getValue('fiscalSettings.efdReinf.active') && (
                                        <div className="pl-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Ambiente</label>
                                                <select name="fiscalSettings.efdReinf.environment" value={getValue('fiscalSettings.efdReinf.environment') || ''} onChange={handleChange} disabled={!isEditing} className="w-full bg-white border border-gray-300 rounded px-2 py-2 text-sm">
                                                    <option value="2">Homologação</option>
                                                    <option value="1">Produção</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* EFD Fiscal */}
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <input
                                            type="checkbox"
                                            id="efdFiscal"
                                            name="fiscalSettings.efdFiscal.active"
                                            checked={getValue('fiscalSettings.efdFiscal.active') || false}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                        />
                                        <label htmlFor="efdFiscal" className="font-bold text-gray-700">EFD ICMS-IPI (Sped Fiscal)</label>
                                    </div>
                                    {getValue('fiscalSettings.efdFiscal.active') && (
                                        <div className="pl-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <CompanyInput label="Perfil (A, B, C...)" name="fiscalSettings.efdFiscal.profile" value={getValue('fiscalSettings.efdFiscal.profile')} onChange={handleChange} disabled={!isEditing} />
                                        </div>
                                    )}
                                </div>

                                {/* eSocial */}
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <input
                                            type="checkbox"
                                            id="esocial"
                                            name="fiscalSettings.esocial.active"
                                            checked={getValue('fiscalSettings.esocial.active') || false}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                        />
                                        <label htmlFor="esocial" className="font-bold text-gray-700">eSocial</label>
                                    </div>
                                    {getValue('fiscalSettings.esocial.active') && (
                                        <div className="pl-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Ambiente</label>
                                                <select name="fiscalSettings.esocial.environment" value={getValue('fiscalSettings.esocial.environment') || ''} onChange={handleChange} disabled={!isEditing} className="w-full bg-white border border-gray-300 rounded px-2 py-2 text-sm">
                                                    <option value="2">Homologação</option>
                                                    <option value="1">Produção</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Grupo</label>
                                                <select name="fiscalSettings.esocial.group" value={getValue('fiscalSettings.esocial.group') || ''} onChange={handleChange} disabled={!isEditing} className="w-full bg-white border border-gray-300 rounded px-2 py-2 text-sm">
                                                    <option value="">Selecione...</option>
                                                    <option value="1">Grupo 1</option>
                                                    <option value="2">Grupo 2</option>
                                                    <option value="3">Grupo 3</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Classificação Tributária</label>
                                                <select name="fiscalSettings.esocial.classificacaoTributaria" value={getValue('fiscalSettings.esocial.classificacaoTributaria') || ''} onChange={handleChange} disabled={!isEditing} className="w-full bg-white border border-gray-300 rounded px-2 py-2 text-sm">
                                                    <option value="">Selecione...</option>
                                                    <option value="99">99 - Pessoas Jurídicas em Geral</option>
                                                    <option value="01">01 - Simples Nacional (Substituída)</option>
                                                    <option value="02">02 - Simples Nacional (Não Substituída)</option>
                                                    <option value="03">03 - Simples Nacional (Subs. e Não Subs.)</option>
                                                    <option value="04">04 - MEI</option>
                                                    <option value="06">06 - Agroindústria</option>
                                                    <option value="07">07 - Produtor Rural PJ</option>
                                                    <option value="11">11 - Entidade Beneficente Isenta</option>
                                                    <option value="21">21 - Pessoa Física (Exceto Segurado Especial)</option>
                                                    <option value="22">22 - Segurado Especial</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}


                    {activeTab === 'certificate' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-green-50 text-green-600 rounded-xl border border-green-100">
                                            <ShieldCheck size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-lg">Certificado Digital</h4>
                                            <p className="text-xs text-gray-500 font-medium">Modelos A1 (Arquivo) ou A3 (Cartão/Token)</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getValue('certificate.validity') ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                            {getValue('certificate.validity') ? 'Certificado Ativo' : 'Não Configurado'}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer group relative">
                                            <FileKey size={32} className="text-gray-300 group-hover:text-green-500 mb-3 transition-colors" />
                                            {getValue('certificate.fileName') ? (
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-gray-800">{getValue('certificate.fileName')}</p>
                                                    <p className="text-xs text-gray-400">Clique para substituir</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-gray-600">Upload Arquivo .PFX ou .P12</p>
                                                    <p className="text-xs text-gray-400">Arraste ou clique para selecionar</p>
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                accept=".pfx,.p12"
                                                disabled={!isEditing}
                                                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = (e) => {
                                                            const arrayBuffer = e.target?.result as ArrayBuffer;
                                                            const base64 = forge.util.encode64(String.fromCharCode.apply(null, Array.from(new Uint8Array(arrayBuffer))));

                                                            setFormData((prev: any) => ({
                                                                ...prev,
                                                                certificate: {
                                                                    ...prev.certificate,
                                                                    fileName: file.name,
                                                                    pfxBase64: base64,
                                                                    // Clear validity until validated with password
                                                                    validity: '',
                                                                    issuer: ''
                                                                }
                                                            }));
                                                        };
                                                        reader.readAsArrayBuffer(file);
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className="relative">
                                            <CompanyInput
                                                label="Senha do Certificado"
                                                name="certificate.password"
                                                type="password"
                                                value={getValue('certificate.password')}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const pfxBase64 = getValue('certificate.pfxBase64');
                                                    const password = getValue('certificate.password');

                                                    if (!pfxBase64 || !password) {
                                                        alert("Por favor, faça upload do arquivo e informe a senha.");
                                                        return;
                                                    }

                                                    try {
                                                        const pfxDer = forge.util.decode64(pfxBase64);
                                                        const pfxAsn1 = forge.asn1.fromDer(pfxDer);
                                                        const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, password);

                                                        // Get certificate bags
                                                        const bags = pfx.getBags({ bagType: forge.pki.oids.certBag });
                                                        const certBag = bags[forge.pki.oids.certBag]?.[0];

                                                        if (certBag && certBag.cert) {
                                                            const cert = certBag.cert;
                                                            const notAfter = cert.validity.notAfter;
                                                            const issuer = cert.issuer.attributes.find((a: any) => a.name === 'commonName')?.value || 'Desconhecido';

                                                            setFormData((prev: any) => ({
                                                                ...prev,
                                                                certificate: {
                                                                    ...prev.certificate,
                                                                    validity: notAfter.toISOString(),
                                                                    issuer: issuer
                                                                }
                                                            }));
                                                            alert("Certificado validado com sucesso!");
                                                        } else {
                                                            throw new Error("Nenhum certificado encontrado no arquivo.");
                                                        }
                                                    } catch (err) {
                                                        console.error(err);
                                                        alert("Erro ao ler certificado. Verifique a senha e o arquivo.");
                                                    }
                                                }}
                                                className="mt-2 w-full py-2 bg-green-100 text-green-700 rounded-lg text-sm font-bold hover:bg-green-200 transition-colors"
                                            >
                                                Validar Certificado Real
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 flex flex-col justify-center space-y-4">
                                        <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Validade</span>
                                            <span className="text-sm font-black text-gray-800 flex items-center gap-2">
                                                <Calendar size={14} className="text-orange-500" />
                                                {getValue('certificate.validity') ? formatDateBR(getValue('certificate.validity')) : '--/--/----'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Emissor</span>
                                            <span className="text-sm font-bold text-gray-800">{getValue('certificate.issuer') || '---'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Tipo</span>
                                            <span className="text-sm font-bold text-gray-800">e-CNPJ A1</span>
                                        </div>

                                        {getValue('certificate.validity') && (
                                            <div className="mt-2 pt-2">
                                                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                                                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '85%' }}></div>
                                                </div>
                                                <p className="text-[10px] text-center text-gray-400 font-medium">Certificado Válido</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'config' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider border-b pb-2">Preferências de Sistema</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <span className="text-sm font-medium text-gray-700">Notificações por Email</span>
                                    <input type="checkbox" className="toggle" disabled={!isEditing} />
                                </div>
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <span className="text-sm font-medium text-gray-700">Backup Automático (Diário)</span>
                                    <input type="checkbox" className="toggle" disabled={!isEditing} defaultChecked />
                                </div>
                            </div>
                        </div>
                    )}
                </div>



                {activeTab === 'fechamentos' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center border-b pb-4">
                            <div>
                                <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider">Histórico de Fechamentos</h3>
                                <p className="text-xs text-gray-500 mt-1">Gerencie os períodos contábeis encerrados e bloqueios de edição</p>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                                    <tr>
                                        <th className="p-4 border-b cursor-pointer hover:bg-gray-100 transition-colors select-none" onClick={() => handleSort('period')}>
                                            <div className="flex items-center gap-1">
                                                Competência
                                                {sortConfig.key === 'period' && (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </div>
                                        </th>
                                        <th className="p-4 border-b cursor-pointer hover:bg-gray-100 transition-colors select-none" onClick={() => handleSort('closingDate')}>
                                            <div className="flex items-center gap-1">
                                                Data Fechamento
                                                {sortConfig.key === 'closingDate' && (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </div>
                                        </th>
                                        <th className="p-4 border-b cursor-pointer hover:bg-gray-100 transition-colors select-none" onClick={() => handleSort('lastUpdated')}>
                                            <div className="flex items-center gap-1">
                                                Data Alteração
                                                {sortConfig.key === 'lastUpdated' && (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </div>
                                        </th>
                                        <th className="p-4 border-b cursor-pointer hover:bg-gray-100 transition-colors select-none" onClick={() => handleSort('closedBy')}>
                                            <div className="flex items-center gap-1">
                                                Responsável
                                                {sortConfig.key === 'closedBy' && (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </div>
                                        </th>
                                        <th className="p-4 border-b text-center cursor-pointer hover:bg-gray-100 transition-colors select-none" onClick={() => handleSort('status')}>
                                            <div className="flex items-center justify-center gap-1">
                                                Status
                                                {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </div>
                                        </th>
                                        <th className="p-4 border-b text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {Object.values(
                                        accountingClosures
                                            .filter(c => c.companyId === selectedCompany?.id)
                                            .reduce((acc, curr) => {
                                                if (!acc[curr.period]) {
                                                    acc[curr.period] = curr;
                                                } else {
                                                    const existing = acc[curr.period];
                                                    let replace = false;
                                                    if (curr.status === 'closed' && existing.status !== 'closed') replace = true;
                                                    else if (curr.status === existing.status) {
                                                        const d1 = new Date(curr.lastUpdated || curr.closedAt).getTime();
                                                        const d2 = new Date(existing.lastUpdated || existing.closedAt).getTime();
                                                        if (d1 > d2) replace = true;
                                                    }
                                                    if (replace) acc[curr.period] = curr;
                                                }
                                                return acc;
                                            }, {} as Record<string, any>)
                                    )
                                        .sort((a: any, b: any) => {
                                            if (a[sortConfig.key] < b[sortConfig.key]) {
                                                return sortConfig.direction === 'asc' ? -1 : 1;
                                            }
                                            if (a[sortConfig.key] > b[sortConfig.key]) {
                                                return sortConfig.direction === 'asc' ? 1 : -1;
                                            }
                                            return 0;
                                        })
                                        .map((closure: any) => (
                                            <tr key={closure.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4 font-bold text-gray-900">{closure.period}</td>
                                                <td className="p-4 text-gray-600">{formatDateBR(closure.closingDate)}</td>
                                                <td className="p-4 text-gray-600 text-xs">
                                                    {closure.lastUpdated ? new Date(closure.lastUpdated).toLocaleString('pt-BR') : '-'}
                                                </td>
                                                <td className="p-4 text-gray-600">{closure.closedBy}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${closure.status === 'closed' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                        {closure.status === 'closed' ? 'Fechado' : 'Aberto'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    {closure.status === 'closed' && (
                                                        <button
                                                            onClick={() => handleReopenClick(closure)}
                                                            className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold hover:bg-orange-100 transition-colors flex items-center gap-2 ml-auto"
                                                        >
                                                            <Unlock size={14} /> Reabrir Período
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    {accountingClosures.filter(c => c.companyId === selectedCompany?.id).length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-gray-400">
                                                <Lock size={48} className="mx-auto mb-3 opacity-20" />
                                                <p className="font-medium">Nenhum fechamento registrado.</p>
                                                <p className="text-xs mt-1">Realize o fechamento express na aba de Contabilidade.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}


                {activeTab === 'accounts' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center border-b pb-4">
                            <div>
                                <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider">Gestão de Contas Bancárias</h3>
                                <p className="text-xs text-gray-500 mt-1">Contas integradas automaticamente ao módulo Financeiro</p>
                            </div>
                            <Button type="button" icon={Plus} onClick={() => setShowAccountForm(!showAccountForm)}>
                                Nova Conta
                            </Button>
                        </div>

                        {showAccountForm && (
                            <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl mb-6 shadow-inner">
                                <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Landmark size={16} className="text-orange-500" /> Cadastrar Nova Conta
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                                    <div className="lg:col-span-2">
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Nome do Banco</label>
                                        <input
                                            value={newAccount.bankName}
                                            onChange={e => setNewAccount(p => ({ ...p, bankName: e.target.value }))}
                                            placeholder="Ex: Banco do Brasil"
                                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Agência</label>
                                        <input
                                            value={newAccount.agency}
                                            onChange={e => setNewAccount(p => ({ ...p, agency: e.target.value }))}
                                            placeholder="0000"
                                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Conta</label>
                                        <input
                                            value={newAccount.accountNumber}
                                            onChange={e => setNewAccount(p => ({ ...p, accountNumber: e.target.value }))}
                                            placeholder="00000-0"
                                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Saldo Inicial (R$)</label>
                                        <input
                                            type="number"
                                            value={newAccount.balance}
                                            onChange={e => setNewAccount(p => ({ ...p, balance: parseFloat(e.target.value) }))}
                                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <Button type="button" variant="secondary" onClick={() => setShowAccountForm(false)}>Cancelar</Button>
                                    <Button type="button" onClick={handleAddAccount}>Confirmar Cadastro</Button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {companyAccounts.map(account => (
                                <div key={account.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                            <Landmark size={24} />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => deleteBankAccount(account.id)}
                                            className="text-gray-300 hover:text-red-500 transition-colors p-2"
                                            title="Remover conta"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-lg">{account.bankName}</h4>
                                    <p className="text-xs text-gray-500 mb-4">Ag: {account.agency} | CC: {account.accountNumber}</p>
                                    <div className="pt-4 border-t border-gray-100 flex justify-between items-end">
                                        <span className="text-xs font-semibold text-gray-400 uppercase">Saldo Atual</span>
                                        <span className={`text-xl font-bold ${account.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.balance)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {companyAccounts.length === 0 && !showAccountForm && (
                                <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                    <Landmark className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p className="font-medium">Nenhuma conta bancária cadastrada.</p>
                                    <p className="text-sm mt-1">Cadastre uma conta para gerenciar seu fluxo de caixa.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </form >

            {/* AUTH MODAL */}
            {isAuthModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Lock size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Acesso Restrito</h3>
                            <p className="text-slate-500 font-medium mt-2">Digite a senha de administrador para reabrir o período contábil <strong>{pendingClosureReopen?.period}</strong>.</p>
                        </div>

                        <form onSubmit={handleAuthSubmit} className="space-y-6">
                            <div>
                                <input
                                    type="password"
                                    autoFocus
                                    placeholder="Senha de Acesso"
                                    value={authPassword}
                                    onChange={e => setAuthPassword(e.target.value)}
                                    className="w-full text-center text-3xl font-black tracking-widest p-4 border-2 border-slate-200 rounded-2xl focus:border-red-500 focus:outline-none transition-colors"
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button type="button" variant="secondary" onClick={() => setIsAuthModalOpen(false)} className="flex-1">Cancelar</Button>
                                <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white">Confirmar</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div >
    );
};