import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Building2, Plus, ArrowRight, Settings, MapPin, Briefcase, Search, Loader2, Trash2, LogOut } from 'lucide-react';
import { CompanyEntity } from '../types';
import { maskCNPJ, maskCEP, unmask } from '../utils/formatters';

export const CompanySelection: React.FC = () => {
    const { companies, selectCompany, saveCompany, deleteCompany, logout } = useData();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Partial<CompanyEntity>>({});
    const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);
    const [isLoadingCEP, setIsLoadingCEP] = useState(false);

    const handleSelect = (id: string) => {
        selectCompany(id);
        navigate('/app');
    };

    const handleOpenNew = () => {
        setEditingCompany({
            id: Math.random().toString(36).substr(2, 9),
            razaoSocial: '',
            nomeFantasia: '',
            cnpj: '',
            address: { street: '', number: '', city: '', uf: '', zip: '' }
        });
        setIsModalOpen(true);
    };

    const handleEdit = (e: React.MouseEvent, company: CompanyEntity) => {
        e.stopPropagation();
        setEditingCompany({ ...company });
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCompany.id && editingCompany.razaoSocial) {
            saveCompany(editingCompany as CompanyEntity);
            setIsModalOpen(false);
        }
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja apagar esta empresa? Esta ação não pode ser desfeita.')) {
            deleteCompany(id);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        let formattedValue = value;

        // Apply Masks
        if (name === 'cnpj') formattedValue = maskCNPJ(value);
        if (name === 'address.zip') formattedValue = maskCEP(value);

        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setEditingCompany(prev => ({
                ...prev,
                [parent]: {
                    ...(prev as any)[parent],
                    [child]: formattedValue
                }
            }));
        } else {
            setEditingCompany(prev => ({ ...prev, [name]: formattedValue }));
        }
    };

    const handleFetchCNPJ = async () => {
        const cleanCNPJ = unmask(editingCompany.cnpj || '');
        if (cleanCNPJ.length !== 14) {
            alert("Por favor, insira um CNPJ válido (14 dígitos) para pesquisar.");
            return;
        }

        setIsLoadingCNPJ(true);
        try {
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
            if (!response.ok) throw new Error('Erro ao buscar CNPJ');

            const data = await response.json();

            setEditingCompany(prev => ({
                ...prev,
                razaoSocial: data.razao_social,
                nomeFantasia: data.nome_fantasia || data.razao_social,
                cnpj: maskCNPJ(data.cnpj),
                address: {
                    street: data.logradouro,
                    number: data.numero,
                    city: data.municipio,
                    uf: data.uf,
                    zip: maskCEP(data.cep),
                }
            }));
        } catch (error) {
            console.error(error);
            alert("Não foi possível buscar os dados deste CNPJ. Verifique se está correto.");
        } finally {
            setIsLoadingCNPJ(false);
        }
    };

    const [statusFilter, setStatusFilter] = useState('All');
    const [locationFilter, setLocationFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'newest'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    // Filter and Sort Logic
    const filteredCompanies = React.useMemo(() => {
        return companies
            .filter(c => {
                const search = searchTerm.toLowerCase();
                const matchesSearch =
                    c.nomeFantasia.toLowerCase().includes(search) ||
                    c.razaoSocial.toLowerCase().includes(search) ||
                    c.cnpj.includes(search);

                const matchesStatus = statusFilter === 'All'
                    ? true
                    : statusFilter === 'Active'
                        ? c.status === 'active' || !c.status // Default to active if undefined
                        : c.status === 'inactive';

                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => {
                if (sortOrder === 'newest') return 0; // Natural order (or specific Date logic if available)
                if (sortOrder === 'asc') return a.nomeFantasia.localeCompare(b.nomeFantasia);
                return b.nomeFantasia.localeCompare(a.nomeFantasia);
            });
    }, [companies, searchTerm, sortOrder, statusFilter]);

    // Reset page on filter change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, locationFilter]);

    const totalPages = Math.ceil(filteredCompanies.length / ITEMS_PER_PAGE);
    const paginatedCompanies = filteredCompanies.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleFetchCEP = async () => {
        const cleanCEP = unmask(editingCompany.address?.zip || '');
        if (cleanCEP.length !== 8) return;

        setIsLoadingCEP(true);
        try {
            const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCEP}`);
            if (!response.ok) throw new Error('CEP não encontrado');
            const data = await response.json();

            setEditingCompany(prev => ({
                ...prev,
                address: {
                    ...prev.address,
                    street: data.street,
                    city: data.city,
                    uf: data.state,
                    zip: maskCEP(data.cep),
                    neighborhood: data.neighborhood
                }
            } as any));
        } catch (error) {
            console.error(error);
            // Silent fail or small toast in real app
        } finally {
            setIsLoadingCEP(false);
        }
    };

    const inputClass = "w-full bg-white text-gray-900 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none placeholder-gray-400 transition-all";

    return (
        <div className="min-h-screen bg-slate-50 relative selection:bg-indigo-100 selection:text-indigo-900 font-sans text-slate-900 overflow-x-hidden">
            {/* Background Decoration */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl mix-blend-multiply opacity-50 animate-blob"></div>
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl mix-blend-multiply opacity-50 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl mix-blend-multiply opacity-50 animate-blob animation-delay-4000"></div>
            </div>

            <button
                onClick={async () => {
                    try {
                        await logout();
                    } catch (error) {
                        console.error('Erro ao fazer logout:', error);
                    }
                }}
                className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-red-600 bg-white/80 backdrop-blur-md border border-slate-200/60 hover:bg-red-50 rounded-full transition-all text-sm font-medium shadow-sm hover:shadow-md active:scale-95 group"
            >
                <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                Sair
            </button>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col min-h-screen">

                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-xl shadow-indigo-100 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white">
                            <Building2 size={24} />
                        </div>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900">
                        Escopo.V3
                    </h1>
                    <p className="text-slate-500 text-lg max-w-xl mx-auto leading-relaxed">
                        Selecione seu espaço de trabalho para começar.
                    </p>
                </div>

                {/* Controls Bar */}
                <div className="bg-white/70 backdrop-blur-xl p-2 rounded-[2rem] shadow-xl shadow-indigo-100/50 border border-white/50 flex flex-col md:flex-row gap-2 mb-12 max-w-4xl mx-auto w-full transition-all hover:shadow-2xl hover:shadow-indigo-100/40">
                    <div className="relative flex-1 group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                            <Search size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar empresa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-transparent border-none rounded-[1.5rem] focus:outline-none focus:bg-white/50 transition-all text-base placeholder-slate-400 font-medium"
                        />
                    </div>

                    <div className="flex gap-2 p-1 overflow-x-auto">
                        <select
                            className="bg-slate-50 hover:bg-white focus:bg-white text-sm font-semibold text-slate-600 px-6 py-3 rounded-[1.2rem] border-none outline-none cursor-pointer transition-all hover:shadow-md appearance-none"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="All">Todos Status</option>
                            <option value="Active">Ativos</option>
                            <option value="Inactive">Inativos</option>
                        </select>
                        <select
                            className="bg-slate-50 hover:bg-white focus:bg-white text-sm font-semibold text-slate-600 px-6 py-3 rounded-[1.2rem] border-none outline-none cursor-pointer transition-all hover:shadow-md appearance-none"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as any)}
                        >
                            <option value="asc">A-Z</option>
                            <option value="desc">Z-A</option>
                            <option value="newest">Recentes</option>
                        </select>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-12">

                    {/* New Company Card */}
                    <button
                        onClick={handleOpenNew}
                        className="group relative flex flex-col items-center justify-center p-8 h-[360px] rounded-[2.5rem] border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50 transition-all duration-300"
                    >
                        <div className="w-20 h-20 rounded-full bg-white shadow-lg shadow-indigo-100 flex items-center justify-center text-indigo-500 mb-6 group-hover:scale-110 group-hover:rotate-90 transition-all duration-300">
                            <Plus size={32} strokeWidth={2.5} />
                        </div>
                        <span className="font-bold text-lg text-slate-700 group-hover:text-indigo-600 transition-colors">Nova Empresa</span>
                        <span className="text-sm text-slate-400 mt-2 text-center max-w-[150px]">Configurar uma nova entidade jurídica</span>
                    </button>

                    {/* Company Cards */}
                    {paginatedCompanies.map(company => (
                        <div
                            key={company.id}
                            className="group relative bg-white rounded-[2.5rem] p-6 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 border border-slate-100 flex flex-col items-center"
                        >
                            {/* Status Badge */}
                            <div className="absolute top-6 right-6">
                                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${company.status === 'inactive'
                                    ? 'bg-slate-100 text-slate-400'
                                    : 'bg-emerald-50 text-emerald-600'
                                    }`}>
                                    {company.status === 'inactive' ? 'Inativo' : 'Ativo'}
                                </span>
                            </div>

                            {/* Logo */}
                            <div className="w-24 h-24 mt-6 rounded-[2rem] bg-slate-50 text-slate-400 flex items-center justify-center text-4xl font-black mb-6 group-hover:scale-105 transition-transform duration-300">
                                {company.logo ? (
                                    <img src={company.logo} alt={company.nomeFantasia} className="w-full h-full object-contain p-4 rounded-[2rem]" />
                                ) : (
                                    company.nomeFantasia.charAt(0).toUpperCase()
                                )}
                            </div>

                            {/* Info */}
                            <h3 className="font-bold text-xl text-slate-900 text-center line-clamp-1 w-full px-2" title={company.nomeFantasia}>
                                {company.nomeFantasia}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 mb-8 text-center line-clamp-1 w-full px-4">
                                {company.razaoSocial}
                            </p>

                            {/* Details Box */}
                            <div className="w-full bg-slate-50/80 rounded-[1.5rem] p-4 flex flex-col gap-3 mb-8 group-hover:bg-slate-50 transition-colors border border-transparent group-hover:border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-indigo-500 shrink-0 border border-slate-100">
                                        <Briefcase size={14} strokeWidth={2.5} />
                                    </div>
                                    <span className="text-xs font-mono font-bold text-slate-600 truncate">{company.cnpj}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-orange-400 shrink-0 border border-slate-100">
                                        <MapPin size={14} strokeWidth={2.5} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 truncate">{company.address?.city || 'Localização não definida'}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="w-full flex items-center gap-2 mt-auto">
                                <button
                                    onClick={() => handleSelect(company.id)}
                                    className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-2 group/btn"
                                >
                                    Acessar <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                </button>

                                <button
                                    onClick={(e) => handleEdit(e, company)}
                                    className="w-12 h-12 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-2xl transition-all flex items-center justify-center shadow-sm active:scale-95"
                                    title="Configurações"
                                >
                                    <Settings size={18} />
                                </button>

                                <button
                                    onClick={(e) => handleDelete(e, company.id)}
                                    className="w-12 h-12 bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-2xl transition-all flex items-center justify-center shadow-sm active:scale-95"
                                    title="Excluir"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer simple pagination bullets style */}
                {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-auto pb-8">
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`w-2.5 h-2.5 rounded-full transition-all ${currentPage === i + 1 ? 'bg-indigo-600 w-8' : 'bg-slate-300 hover:bg-indigo-400'}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCompany.id && companies.find(c => c.id === editingCompany.id) ? "Editar Empresa" : "Nova Empresa"}
            >
                <form onSubmit={handleSave} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">CNPJ</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="cnpj"
                                    value={editingCompany.cnpj || ''}
                                    onChange={handleChange}
                                    className={`${inputClass} font-mono pl-4 pr-12 text-lg font-bold tracking-wide`}
                                    required
                                    maxLength={18}
                                    placeholder="00.000.000/0000-00"
                                />
                                <button
                                    type="button"
                                    onClick={handleFetchCNPJ}
                                    disabled={isLoadingCNPJ || !editingCompany.cnpj}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isLoadingCNPJ ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="col-span-2">
                            <div className="h-px bg-slate-100 my-2"></div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Razão Social</label>
                            <input type="text" name="razaoSocial" value={editingCompany.razaoSocial || ''} onChange={handleChange} className={inputClass} required />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome Fantasia</label>
                            <input type="text" name="nomeFantasia" value={editingCompany.nomeFantasia || ''} onChange={handleChange} className={inputClass} required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                            <select
                                name="status"
                                value={editingCompany.status || 'active'}
                                onChange={(e) => setEditingCompany(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                                className={inputClass}
                            >
                                <option value="active">Ativa</option>
                                <option value="inactive">Inativa</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <h4 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
                            <MapPin size={12} /> Endereço
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">CEP</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="address.zip"
                                        value={editingCompany.address?.zip || ''}
                                        onChange={handleChange}
                                        onBlur={handleFetchCEP}
                                        className={inputClass}
                                        placeholder="00000-000"
                                    />
                                    {isLoadingCEP && <div className="absolute right-3 top-3"><Loader2 className="w-4 h-4 animate-spin text-indigo-500" /></div>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">UF</label>
                                <input type="text" name="address.uf" value={editingCompany.address?.uf || ''} onChange={handleChange} className={inputClass} maxLength={2} />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cidade</label>
                                <input type="text" name="address.city" value={editingCompany.address?.city || ''} onChange={handleChange} className={inputClass} />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Logradouro</label>
                                <input type="text" name="address.street" value={editingCompany.address?.street || ''} onChange={handleChange} className={inputClass} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <h4 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
                            <Briefcase size={12} /> Configurações Fiscais
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Regime Tributário</label>
                                <select
                                    name="regimeTributario"
                                    value={editingCompany.regimeTributario || ''}
                                    onChange={(e) => setEditingCompany(prev => ({ ...prev, regimeTributario: e.target.value }))}
                                    className={inputClass}
                                >
                                    <option value="">Selecione...</option>
                                    <option value="1">Simples Nacional</option>
                                    <option value="3">Regime Normal</option>
                                </select>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Alíquota ISS (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="aliquotaISS"
                                    value={editingCompany.aliquotaISS || ''}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
                            {editingCompany.id && companies.find(c => c.id === editingCompany.id) ? 'Salvar Alterações' : 'Criar Empresa'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};