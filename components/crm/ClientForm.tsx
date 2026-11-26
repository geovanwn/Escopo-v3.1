import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Phone, Loader2, Save, X, BookOpen } from 'lucide-react';
import { Client } from '../../types';
import { maskCNPJ, maskCPF, maskPhone, maskCEP, unmask } from '../../utils/formatters';
import { Button } from '../ui/Button';

interface ClientFormProps {
    initialData?: Partial<Client>;
    type: 'client' | 'supplier' | 'carrier';
    onSave: (data: Client) => void;
    onCancel: () => void;
}

const TABS = [
    { id: 'dados', label: 'Dados Principais', icon: Building2 },
    { id: 'endereco', label: 'Endereço', icon: MapPin },
    { id: 'contatos', label: 'Contatos', icon: Phone },
    { id: 'contabil', label: 'Contábil', icon: BookOpen },
];

export const ClientForm: React.FC<ClientFormProps> = ({ initialData, type, onSave, onCancel }) => {
    const [activeTab, setActiveTab] = useState('dados');
    const [formData, setFormData] = useState<Partial<Client>>(initialData || { type });
    const [isLoadingCEP, setIsLoadingCEP] = useState(false);
    const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Reset form when type changes or new data comes in
    useEffect(() => {
        setFormData(prev => ({ ...prev, ...(initialData || {}), type }));
    }, [initialData, type]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let formattedValue = value;

        // Apply masks on fly
        const clean = unmask(value);
        if (name === 'cnpj') {
            formattedValue = clean.length > 11 ? maskCNPJ(value) : maskCPF(value);
        }
        if (name === 'phone' || name === 'mobilePhone') formattedValue = maskPhone(value);
        if (name === 'zip') formattedValue = maskCEP(value);

        setFormData(prev => ({ ...prev, [name]: formattedValue }));
        // Clear error
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleFetchCEP = async () => {
        const cleanCEP = unmask(formData.zip || '');
        if (cleanCEP.length !== 8) return;

        setIsLoadingCEP(true);
        try {
            const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCEP}`);
            if (!res.ok) throw new Error('CEP Inválido');
            const data = await res.json();
            setFormData(prev => ({
                ...prev,
                address: data.street,
                addressDistrict: data.neighborhood,
                city: data.city,
                uf: data.state,
                zip: maskCEP(data.cep)
            }));
        } catch (err) {
            setErrors(prev => ({ ...prev, zip: 'CEP não encontrado' }));
        } finally {
            setIsLoadingCEP(false);
        }
    };

    const handleFetchCNPJ = async () => {
        const cleanCNPJ = unmask(formData.cnpj || '');
        if (cleanCNPJ.length !== 14) return;

        setIsLoadingCNPJ(true);
        try {
            const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
            if (!res.ok) throw new Error('CNPJ Inválido');
            const data = await res.json();
            setFormData(prev => ({
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
                activitySector: data.cnae_fiscal_descricao
            }));
        } catch (err) {
            setErrors(prev => ({ ...prev, cnpj: 'CNPJ não encontrado' }));
        } finally {
            setIsLoadingCNPJ(false);
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.name) newErrors.name = 'Razão Social é obrigatória';
        if (!formData.cnpj) newErrors.cnpj = 'Documento é obrigatório';
        if (!formData.zip) newErrors.zip = 'CEP é obrigatório';
        if (!formData.email) newErrors.email = 'Email principal é obrigatório';
        if (!formData.accountingAccount) {
            newErrors.accountingAccount = 'Conta Contábil é obrigatória';
            setActiveTab('contabil');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSave(formData as Client);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-card)]">
            {/* Tabs Header */}
            <div className="flex border-b border-[var(--border-color)] px-6 pt-4 space-x-6">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === tab.id
                            ? 'text-green-600 border-green-600'
                            : 'text-gray-400 border-transparent hover:text-green-500'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                {activeTab === 'dados' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="col-span-2 bg-green-50/50 dark:bg-green-900/10 p-4 rounded-2xl border border-green-100 dark:border-green-800/30 mb-2">
                            <p className="text-[10px] font-black uppercase text-green-600 tracking-[0.2em] mb-1">Tipo de Registro</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                {type === 'supplier' ? 'Fornecedor' : type === 'carrier' ? 'Transportadora' : 'Cliente'}
                            </p>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Razão Social *</label>
                            <input
                                name="name"
                                value={formData.name || ''}
                                onChange={handleChange}
                                placeholder="Nome completo ou Razão Social"
                                className={`w-full p-3 rounded-xl border bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all ${errors.name ? 'border-red-500' : 'border-[var(--border-color)]'}`}
                            />
                            {errors.name && <span className="text-xs text-red-500 mt-1 font-bold">{errors.name}</span>}
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Nome Fantasia</label>
                            <input
                                name="fantasyName"
                                value={formData.fantasyName || ''}
                                onChange={handleChange}
                                placeholder="Como a empresa é conhecida"
                                className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all"
                            />
                        </div>

                        <div className="col-span-2 md:col-span-1 relative">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">CNPJ / CPF *</label>
                            <div className="relative">
                                <input
                                    name="cnpj"
                                    value={formData.cnpj || ''}
                                    onChange={handleChange}
                                    onBlur={handleFetchCNPJ}
                                    maxLength={18}
                                    placeholder="00.000.000/0000-00"
                                    className={`w-full p-3 rounded-xl border bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all ${errors.cnpj ? 'border-red-500' : 'border-[var(--border-color)]'}`}
                                />
                                {isLoadingCNPJ && <Loader2 className="absolute right-3 top-3.5 w-5 h-5 animate-spin text-green-600" />}
                            </div>
                            {errors.cnpj && <span className="text-xs text-red-500 mt-1 font-bold">{errors.cnpj}</span>}
                        </div>

                        <div className="col-span-1">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Inscrição Estadual</label>
                            <input
                                name="ie"
                                value={formData.ie || ''}
                                onChange={handleChange}
                                placeholder="Nº ou ISENTO"
                                className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all outline-none"
                            />
                        </div>

                        <div className="col-span-1">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Inscrição Municipal</label>
                            <input
                                name="im"
                                value={(formData as any).im || ''}
                                onChange={handleChange}
                                placeholder="Nº de registro municipal"
                                className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all outline-none"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Ramo de Atividade</label>
                            <input
                                name="activitySector"
                                value={formData.activitySector || ''}
                                onChange={handleChange}
                                placeholder="Ex: Serviços Médicos, Comércio de Alimentos"
                                className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all outline-none"
                            />
                        </div>

                        <div className="col-span-1">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Inscrição SUFRAMA</label>
                            <input
                                name="suframa"
                                value={(formData as any).suframa || ''}
                                onChange={handleChange}
                                placeholder="Apenas Zona Franca"
                                className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all outline-none"
                            />
                        </div>

                        <div className="col-span-1">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Indicador ICMS</label>
                            <select
                                name="indicadorContribuinte"
                                value={(formData as any).indicadorContribuinte || ''}
                                onChange={handleChange as any}
                                className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all outline-none cursor-pointer"
                            >
                                <option value="">Sem Preenchimento</option>
                                <option value="contribuinte">1 - Contribuinte ICMS</option>
                                <option value="isento">2 - Contribuinte Isento</option>
                                <option value="nao_contribuinte">9 - Não Contribuinte (Consumidor Final)</option>
                            </select>
                        </div>
                    </div>
                )}

                {activeTab === 'endereco' && (
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="md:col-span-2 relative">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">CEP *</label>
                            <div className="relative">
                                <input
                                    name="zip"
                                    value={formData.zip || ''}
                                    onChange={handleChange}
                                    onBlur={handleFetchCEP}
                                    maxLength={9}
                                    className={`w-full p-3 rounded-lg border bg-[var(--bg-input)] text-[var(--text-primary)] md:text-sm ${errors.zip ? 'border-red-500' : 'border-[var(--border-color)]'}`}
                                />
                                {isLoadingCEP && <Loader2 className="absolute right-3 top-3 w-5 h-5 animate-spin text-green-600" />}
                            </div>
                            {errors.zip && <span className="text-xs text-red-500 mt-1">{errors.zip}</span>}
                        </div>

                        <div className="md:col-span-4">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Logradouro</label>
                            <input name="address" value={formData.address || ''} onChange={handleChange} className="w-full p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)]" />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Número</label>
                            <input name="addressNumber" value={formData.addressNumber || ''} onChange={handleChange} className="w-full p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)]" />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Bairro</label>
                            <input name="addressDistrict" value={formData.addressDistrict || ''} onChange={handleChange} className="w-full p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)]" />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Cidade</label>
                            <input name="city" value={formData.city || ''} onChange={handleChange} className="w-full p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)]" />
                        </div>
                        <div className="md:col-span-1 border-t border-[var(--border-color)] pt-4 mt-2">
                            <label className="block text-xs font-black text-green-600 uppercase tracking-wider mb-2">Cód. Município IBGE *</label>
                            <input name="codMunicipioIBGE" value={(formData as any).codMunicipioIBGE || ''} onChange={handleChange} placeholder="Ex: 3550308" className="w-full p-3 font-mono rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] focus:border-green-500" />
                            <p className="text-[9px] text-gray-400 mt-1 uppercase tracking-widest">Obrigatório para NF-e/NFS-e</p>
                        </div>
                    </div>
                )}

                {activeTab === 'contatos' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Email Principal *</label>
                            <input
                                name="email"
                                type="email"
                                value={formData.email || ''}
                                onChange={handleChange}
                                className={`w-full p-3 rounded-lg border bg-[var(--bg-input)] text-[var(--text-primary)] ${errors.email ? 'border-red-500' : 'border-[var(--border-color)]'}`}
                            />
                            {errors.email && <span className="text-xs text-red-500 mt-1">{errors.email}</span>}
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Telefone / WhatsApp</label>
                            <input name="mobilePhone" value={formData.mobilePhone || ''} onChange={handleChange} className="w-full p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)]" />
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Telefone Fixo</label>
                            <input name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)]" />
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Website</label>
                            <input name="website" value={formData.website || ''} onChange={handleChange} className="w-full p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)]" />
                        </div>
                    </div>
                )}

                {activeTab === 'contabil' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
                                {type === 'supplier' ? 'Conta Contábil Fornecedor / Despesa *' : type === 'carrier' ? 'Conta Contábil Transportadora / Despesa *' : 'Conta Contábil Cliente / Receita *'}
                            </label>
                            <div className="space-y-2">
                                <input
                                    name="accountingAccount"
                                    value={formData.accountingAccount || ''}
                                    readOnly
                                    placeholder="Gerada automaticamente pelo sistema"
                                    className={`w-full p-3 rounded-xl border bg-[var(--bg-input)] text-[var(--text-primary)] cursor-not-allowed opacity-80 ${errors.accountingAccount ? 'border-red-500' : 'border-[var(--border-color)]'}`}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full text-xs font-bold border-dashed border-2 hover:border-green-500 hover:text-green-600 transition-colors"
                                    onClick={() => {
                                        const prefix = type === 'supplier' || type === 'carrier' ? '2.1.01' : '1.1.02';
                                        const suffix = Math.floor(1000 + Math.random() * 9000);
                                        setFormData(prev => ({ ...prev, accountingAccount: `${prefix}.${suffix}` }));
                                        setErrors(prev => ({ ...prev, accountingAccount: '' }));
                                    }}
                                >
                                    Gerar Conta Contábil
                                </Button>
                                {errors.accountingAccount && <p className="text-xs text-red-500 font-bold">{errors.accountingAccount}</p>}
                            </div>
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Centro de Custo</label>
                            <input
                                name="costCenter"
                                value={formData.costCenter || ''}
                                onChange={handleChange}
                                placeholder="Ex: Comercial, Operacional"
                                className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                )}
            </form>

            <div className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/50 flex justify-end gap-3 rounded-b-xl">
                <Button variant="outline" onClick={onCancel} icon={X} type="button">Cancelar</Button>
                <Button onClick={(e) => handleSubmit(e as any)} icon={Save} className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20 px-8">
                    Salvar Registro
                </Button>
            </div>
        </div>
    );
};
