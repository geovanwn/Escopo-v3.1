import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuthStore } from '../stores/useAuthStore';
import { useCompanyStore } from '../stores/useCompanyStore';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
    Building2, Plus, ArrowRight, Settings, MapPin, Briefcase, Search,
    Loader2, Trash2, LogOut, Filter, Grid, List, MoreVertical, LayoutGrid,
    Menu, X, RotateCcw, Upload, AlertTriangle, CheckCircle2
} from 'lucide-react';

import { CompanyEntity } from '../types';
import { maskCNPJ, maskCEP, unmask } from '../utils/formatters';

export const CompanySelection: React.FC = () => {
    const { saveCompany, deleteCompany, logout, loadBackup } = useData();
    const { companies, selectCompany } = useCompanyStore();
    const { currentUser, userEmail, userPhotoURL } = useAuthStore();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Partial<CompanyEntity>>({});

    // Canvas animation for Liquid Background and Water Ripples
    useEffect(() => {
        let fluidFrameId: number;
        let waterFrameId: number;
        let handleFluidResize: () => void = () => {};
        let handleWaterResize: () => void = () => {};
        let handleMouseMove: (e: MouseEvent) => void = () => {};

        const timer = setTimeout(() => {
            // --- 1. LIQUID GRADIENT EFFECT ---
            const fluidCanvas = document.getElementById('company-fluid') as HTMLCanvasElement;
            const fluidCtx = fluidCanvas?.getContext('2d');

            if (fluidCanvas && fluidCtx) {
                let fWidth = (fluidCanvas.width = window.innerWidth / 4);
                let fHeight = (fluidCanvas.height = window.innerHeight / 4);

                handleFluidResize = () => {
                    if (fluidCanvas) {
                        fWidth = fluidCanvas.width = window.innerWidth / 4;
                        fHeight = fluidCanvas.height = window.innerHeight / 4;
                    }
                };
                window.addEventListener('resize', handleFluidResize);

                const orbs = [
                    { x: fWidth * 0.2, y: fHeight * 0.2, vx: 0.05, vy: 0.04, r: fWidth * 0.45, color: '#0ea5e9' }, // Cyan
                    { x: fWidth * 0.8, y: fHeight * 0.3, vx: -0.04, vy: 0.05, r: fWidth * 0.5, color: '#10b981' }, // Emerald
                    { x: fWidth * 0.3, y: fHeight * 0.8, vx: 0.03, vy: -0.03, r: fWidth * 0.4, color: '#bef264' }, // Lime
                    { x: fWidth * 0.7, y: fHeight * 0.7, vx: -0.04, vy: -0.05, r: fWidth * 0.55, color: '#3b82f6' } // Royal Blue
                ];

                const drawFluid = () => {
                    fluidCtx.fillStyle = '#f8fafc';
                    fluidCtx.fillRect(0, 0, fWidth, fHeight);

                    orbs.forEach((orb) => {
                        orb.x += orb.vx;
                        orb.y += orb.vy;

                        if (orb.x - orb.r < -fWidth * 0.1 || orb.x + orb.r > fWidth * 1.1) orb.vx *= -1;
                        if (orb.y - orb.r < -fHeight * 0.1 || orb.y + orb.r > fHeight * 1.1) orb.vy *= -1;

                        fluidCtx.beginPath();
                        fluidCtx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
                        fluidCtx.fillStyle = orb.color;
                        fluidCtx.fill();
                    });

                    fluidFrameId = requestAnimationFrame(drawFluid);
                };
                drawFluid();
            }

            // --- 2. INTERACTIVE 3D WATER SURFACE MESH ---
            const waterCanvas = document.getElementById('company-water') as HTMLCanvasElement;
            const waterCtx = waterCanvas?.getContext('2d');

            if (waterCanvas && waterCtx) {
                let width = (waterCanvas.width = window.innerWidth);
                let height = (waterCanvas.height = window.innerHeight);

                const cols = 35;
                const rows = 25;
                let spacingX = width / (cols - 1);
                let spacingY = height / (rows - 1);

                let grid: Array<Array<{ x: number; y: number; z: number; v: number }>> = [];
                
                const initGrid = () => {
                    grid = [];
                    spacingX = width / (cols - 1);
                    spacingY = height / (rows - 1);
                    for (let i = 0; i < cols; i++) {
                        grid[i] = [];
                        for (let j = 0; j < rows; j++) {
                            grid[i][j] = {
                                x: i * spacingX,
                                y: j * spacingY,
                                z: 0,
                                v: 0
                            };
                        }
                    }
                };
                initGrid();

                handleWaterResize = () => {
                    if (waterCanvas) {
                        width = waterCanvas.width = window.innerWidth;
                        height = waterCanvas.height = window.innerHeight;
                        initGrid();
                    }
                };
                window.addEventListener('resize', handleWaterResize);

                let mx = -1000;
                let my = -1000;
                let pmx = -1000;
                let pmy = -1000;

                handleMouseMove = (e: MouseEvent) => {
                    pmx = mx;
                    pmy = my;
                    mx = e.clientX;
                    my = e.clientY;

                    const speed = Math.sqrt((mx - pmx) ** 2 + (my - pmy) ** 2);
                    if (speed > 1) {
                        for (let i = 1; i < cols - 1; i++) {
                            for (let j = 1; j < rows - 1; j++) {
                                const p = grid[i][j];
                                const dist = Math.sqrt((p.x - mx) ** 2 + (p.y - my) ** 2);
                                if (dist < 150) {
                                    const force = (1 - dist / 150) * Math.min(speed * 0.7, 16);
                                    p.v += force;
                                }
                            }
                        }
                    }
                };
                window.addEventListener('mousemove', handleMouseMove);

                const updateWaves = () => {
                    const springStiffness = 0.05;
                    const damping = 0.97;

                    for (let i = 1; i < cols - 1; i++) {
                        for (let j = 1; j < rows - 1; j++) {
                            const left = grid[i - 1][j].z;
                            const right = grid[i + 1][j].z;
                            const up = grid[i][j - 1].z;
                            const down = grid[i][j + 1].z;

                            const avg = (left + right + up + down) / 4;
                            const a = (avg - grid[i][j].z) * springStiffness;
                            grid[i][j].v = (grid[i][j].v + a) * damping;
                        }
                    }

                    for (let i = 1; i < cols - 1; i++) {
                        for (let j = 1; j < rows - 1; j++) {
                            grid[i][j].z += grid[i][j].v;
                        }
                    }
                };

                const drawWater = () => {
                    waterCtx.clearRect(0, 0, width, height);
                    updateWaves();

                    // Horizontal lines
                    for (let j = 1; j < rows - 1; j++) {
                        for (let i = 0; i < cols - 1; i++) {
                            const p1 = grid[i][j];
                            const p2 = grid[i + 1][j];
                            const avgZ = (Math.abs(p1.z) + Math.abs(p2.z)) / 2;

                            waterCtx.beginPath();
                            waterCtx.moveTo(p1.x, p1.y + p1.z);
                            waterCtx.lineTo(p2.x, p2.y + p2.z);

                            const intensity = Math.min(avgZ / 10, 0.7);
                            waterCtx.strokeStyle = `rgba(20, 184, 166, ${0.08 + intensity})`;
                            waterCtx.lineWidth = 0.6 + intensity * 1.5;
                            waterCtx.stroke();
                        }
                    }

                    // Vertical lines
                    for (let i = 1; i < cols - 1; i++) {
                        for (let j = 0; j < rows - 1; j++) {
                            const p1 = grid[i][j];
                            const p2 = grid[i][j + 1];
                            const avgZ = (Math.abs(p1.z) + Math.abs(p2.z)) / 2;

                            waterCtx.beginPath();
                            waterCtx.moveTo(p1.x + p1.z, p1.y);
                            waterCtx.lineTo(p2.x + p2.z, p2.y);

                            const intensity = Math.min(avgZ / 10, 0.7);
                            waterCtx.strokeStyle = `rgba(14, 165, 233, ${0.08 + intensity})`;
                            waterCtx.lineWidth = 0.6 + intensity * 1.5;
                            waterCtx.stroke();
                        }
                    }

                    waterFrameId = requestAnimationFrame(drawWater);
                };
                drawWater();
            }
        }, 150);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleFluidResize);
            window.removeEventListener('resize', handleWaterResize);
            window.removeEventListener('mousemove', handleMouseMove);
            if (fluidFrameId) cancelAnimationFrame(fluidFrameId);
            if (waterFrameId) cancelAnimationFrame(waterFrameId);
        };
    }, []);
    const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);
    const [isLoadingCEP, setIsLoadingCEP] = useState(false);

    // Restore System State
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreStatus, setRestoreStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [restoreError, setRestoreError] = useState('');

    const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setRestoreFile(file);
        setRestoreStatus('idle');
        setRestoreError('');
    };

    const handleRestoreConfirm = async () => {
        if (!restoreFile) return;
        setIsRestoring(true);
        setRestoreStatus('idle');
        try {
            const text = await restoreFile.text();
            const data = JSON.parse(text);
            if (!data.companies || !Array.isArray(data.companies)) {
                throw new Error('Arquivo de backup inválido ou corrompido. Certifique-se de usar um arquivo .json exportado pelo EscopoV3.');
            }
            await loadBackup(data);
            setRestoreStatus('success');
        } catch (err: any) {
            setRestoreStatus('error');
            setRestoreError(err.message || 'Erro desconhecido ao restaurar o backup.');
        } finally {
            setIsRestoring(false);
        }
    };

    // View State
    const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid');
    const [sidebarOpen, setSidebarOpen] = useState(false);


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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

        // Helper para normalizar dados de diferentes APIs
        const normalizeData = (data: any, source: string) => {
            if (source === 'brasilapi') {
                return {
                    razaoSocial: data.razao_social || '',
                    nomeFantasia: data.nome_fantasia || data.razao_social || '',
                    cnpj: maskCNPJ(data.cnpj || cleanCNPJ),
                    logradouro: data.logradouro || '',
                    numero: data.numero || '',
                    bairro: data.bairro || '',
                    municipio: data.municipio || '',
                    uf: data.uf || '',
                    cep: data.cep || '',
                };
            } else if (source === 'receitaws') {
                return {
                    razaoSocial: data.nome || '',
                    nomeFantasia: data.fantasia || data.nome || '',
                    cnpj: maskCNPJ(cleanCNPJ),
                    logradouro: data.logradouro || '',
                    numero: data.numero || '',
                    bairro: data.bairro || '',
                    municipio: data.municipio || '',
                    uf: data.uf || '',
                    cep: data.cep || '',
                };
            } else { // cnpj.ws
                return {
                    razaoSocial: data.razao_social || '',
                    nomeFantasia: data.estabelecimento?.nome_fantasia || data.razao_social || '',
                    cnpj: maskCNPJ(cleanCNPJ),
                    logradouro: data.estabelecimento?.logradouro || '',
                    numero: data.estabelecimento?.numero || '',
                    bairro: data.estabelecimento?.bairro || '',
                    municipio: data.estabelecimento?.cidade?.nome || '',
                    uf: data.estabelecimento?.estado?.sigla || '',
                    cep: data.estabelecimento?.cep || '',
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
                setEditingCompany(prev => ({
                    ...prev,
                    razaoSocial: norm.razaoSocial,
                    nomeFantasia: norm.nomeFantasia,
                    cnpj: norm.cnpj,
                    address: {
                        ...prev.address,
                        street: norm.logradouro,
                        number: norm.numero,
                        neighborhood: norm.bairro,
                        city: norm.municipio,
                        uf: norm.uf,
                        zip: maskCEP(norm.cep.replace(/\D/g, '')),
                    }
                }));
                success = true;
                break;
            } catch (err) {
                console.warn(`[CNPJ] Falha na API ${api.source}:`, err);
                continue;
            }
        }

        if (!success) {
            alert("Não foi possível buscar os dados deste CNPJ. Verifique a conexão com a internet ou tente novamente.");
        }

        setIsLoadingCNPJ(false);
    };

    const [statusFilter, setStatusFilter] = useState('All');
    const [regimeFilter, setRegimeFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'newest'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Filter and Sort Logic
    const filteredCompanies = useMemo(() => {
        return companies
            .filter(c => {
                const search = searchTerm.toLowerCase();
                const matchesSearch =
                    (c.nomeFantasia || '').toLowerCase().includes(search) ||
                    (c.razaoSocial || '').toLowerCase().includes(search) ||
                    (c.cnpj || '').includes(search);

                const matchesStatus = statusFilter === 'All'
                    ? true
                    : statusFilter === 'Active'
                        ? c.status === 'active' || !c.status // Default to active if undefined
                        : c.status === 'inactive';

                const matchesRegime = regimeFilter === 'All'
                    ? true
                    : regimeFilter === '1'
                        ? c.regimeTributario === '1'
                        : regimeFilter === '3'
                            ? c.regimeTributario === '3'
                            : !c.regimeTributario || c.regimeTributario === '';

                return matchesSearch && matchesStatus && matchesRegime;
            })
            .sort((a, b) => {
                if (sortOrder === 'newest') return 0; // Natural order (or specific Date logic if available)
                const nameA = a.nomeFantasia || a.razaoSocial || '';
                const nameB = b.nomeFantasia || b.razaoSocial || '';
                if (sortOrder === 'asc') return nameA.localeCompare(nameB);
                return nameB.localeCompare(nameA);
            });
    }, [companies, searchTerm, sortOrder, statusFilter, regimeFilter]);

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, regimeFilter, itemsPerPage]);

    const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
    const paginatedCompanies = filteredCompanies.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
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
        } finally {
            setIsLoadingCEP(false);
        }
    };

    const inputClass = "w-full bg-[#f1f5f9]/70 text-slate-900 rounded-full border border-slate-200/50 px-5 py-3 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 focus:bg-white transition-all outline-none font-medium placeholder-slate-400 shadow-sm";
    const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1";

    return (
        <div className="flex h-screen bg-[#f8fafc] text-slate-900 font-sans overflow-hidden selection:bg-cyan-100 selection:text-cyan-900 relative">
            {/* Layer 1: Blurred Liquid Canvas (Slow colorful morphing) */}
            <canvas id="company-fluid" className="absolute inset-0 w-full h-full pointer-events-none z-0 filter blur-[80px] md:blur-[120px] opacity-65" />

            {/* Layer 2: Interactive 3D Water Surface Mesh (Ripples on hover) */}
            <canvas id="company-water" className="absolute inset-0 w-full h-full pointer-events-none z-10 opacity-55" />

            {/* Backdrop for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar / Filters Panel */}
            <div className={`fixed inset-y-0 left-0 z-30 w-80 bg-white/80 backdrop-blur-md border-r border-slate-200/40 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 shadow-lg md:shadow-none flex flex-col`}>

                {/* Mobile Close Button */}
                <div className="md:hidden absolute top-4 right-4">
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full"
                    >
                        <X size={20} />
                    </button>
                </div>


                {/* User Profile Header */}
                <div className="p-6 border-b border-slate-200/40">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-[#10b981] to-emerald-500 p-0.5 shadow-lg shadow-emerald-100/50">
                            <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center overflow-hidden">
                                {userPhotoURL ? (
                                    <img src={userPhotoURL} alt="User" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="font-extrabold text-cyan-600 text-lg">{currentUser?.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-sm font-extrabold text-slate-900 truncate">{currentUser}</h2>
                            <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                        </div>
                    </div>

                    <button
                        onClick={async () => {
                           try {
                               await logout();
                           } catch (error) {
                               console.error('Erro ao fazer logout:', error);
                           }
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-full text-xs font-bold transition-all border border-slate-200 hover:border-red-200"
                    >
                        <LogOut size={14} /> Sair da Conta
                    </button>
                </div>

                {/* Filters Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    <div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Filter size={12} /> Filtros
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Status</label>
                                <select
                                    className={inputClass}
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value)}
                                >
                                    <option value="All">Todas as Empresas</option>
                                    <option value="Active">Apenas Ativas</option>
                                    <option value="Inactive">Apenas Inativas</option>
                                </select>
                            </div>

                            <div>
                                <label className={labelClass}>Regime Tributário</label>
                                <select
                                    className={inputClass}
                                    value={regimeFilter}
                                    onChange={e => setRegimeFilter(e.target.value)}
                                >
                                    <option value="All">Todos os Regimes</option>
                                    <option value="1">Simples Nacional</option>
                                    <option value="3">Regime Normal</option>
                                    <option value="None">Não Informado</option>
                                </select>
                            </div>

                            <div>
                                <label className={labelClass}>Ordenação</label>
                                <select
                                    className={inputClass}
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as any)}
                                >
                                    <option value="asc">Nome (A-Z)</option>
                                    <option value="desc">Nome (Z-A)</option>
                                    <option value="newest">Data de Criação</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#ecfdf5] rounded-3xl p-5 border border-emerald-100/50">
                        <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-white rounded-2xl text-emerald-600 shadow-sm border border-emerald-50">
                                <Building2 size={18} />
                            </div>
                            <div>
                                <h4 className="font-extrabold text-emerald-900 text-sm">Escopo.V3 Workspace</h4>
                                <p className="text-xs text-emerald-700/80 mt-1 leading-relaxed">
                                    Gerencie múltiplas empresas em um único painel integrado.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Stats */}
                <div className="p-6 border-t border-slate-200/40 bg-slate-50/20">
                    <div className="flex justify-between items-center text-xs font-medium text-slate-500">
                        <span>Empresas Ativas</span>
                        <span className="bg-white px-2 py-1 rounded-md border border-slate-200 text-slate-900 font-bold shadow-sm">
                            {companies.filter(c => c.status !== 'inactive').length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-transparent z-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-cyan-100/20 to-transparent pointer-events-none" />

                {/* Top Bar */}
                <header className="px-4 md:px-8 py-6 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-full md:hidden shadow-sm active:scale-95 transition-all"
                        >
                            <Menu size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Seleção de Empresa</h1>
                            <p className="text-slate-500 text-xs md:text-sm mt-1">Selecione para onde deseja navegar hoje.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                        {/* Search Bar - Hidden on small mobile or narrowed */}
                        <div className="relative group hidden sm:block">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-500 transition-colors">
                                <Search size={16} />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-40 md:w-64 pl-10 pr-5 py-2.5 bg-white border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-sm"
                            />
                        </div>

                        {/* View Toggle */}
                        <div className="flex bg-white p-1 rounded-full border border-slate-200 shadow-sm">
                            <button
                                onClick={() => setViewLayout('grid')}
                                className={`p-2 rounded-full transition-all ${viewLayout === 'grid' ? 'bg-cyan-50 text-cyan-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewLayout('list')}
                                className={`p-2 rounded-full transition-all ${viewLayout === 'list' ? 'bg-cyan-50 text-cyan-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <List size={18} />
                            </button>
                        </div>

                        <button
                            onClick={handleOpenNew}
                            className="flex items-center justify-center w-10 md:w-auto md:px-5 py-2.5 bg-gradient-to-r from-[#0ea5e9] to-[#10b981] text-white rounded-full text-sm font-bold shadow-lg shadow-emerald-500/10 hover:opacity-95 active:scale-95 transition-all"
                            title="Nova Empresa"
                        >
                            <Plus size={18} strokeWidth={2.5} />
                            <span className="hidden md:inline ml-2">Nova Empresa</span>
                        </button>

                        <button
                            onClick={() => { setIsRestoreModalOpen(true); setRestoreFile(null); setRestoreStatus('idle'); setRestoreError(''); }}
                            className="flex items-center justify-center w-10 md:w-auto md:px-5 py-2.5 bg-gradient-to-r from-[#f59e0b] to-[#ea580c] text-white rounded-full text-sm font-bold shadow-lg shadow-amber-500/10 hover:opacity-95 active:scale-95 transition-all"
                            title="Restaurar Sistema"
                        >
                            <RotateCcw size={18} strokeWidth={2.5} />
                            <span className="hidden md:inline ml-2">Restaurar Sistema</span>
                        </button>
                    </div>
                </header>


                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-8 pb-12 relative z-10">

                    {paginatedCompanies.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                            <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                                <Building2 size={40} className="text-slate-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Nenhuma empresa encontrada</h3>
                            <p className="text-slate-500 max-w-sm mt-2">Tente ajustar seus filtros ou crie uma nova empresa para começar.</p>
                            <Button onClick={handleOpenNew} className="mt-6 bg-gradient-to-r from-[#0ea5e9] to-[#10b981] text-white rounded-full font-bold shadow-lg shadow-emerald-500/10">
                                Criar Primeira Empresa
                            </Button>
                        </div>
                    ) : (
                        <div className={`${viewLayout === 'grid'
                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
                            : "flex flex-col gap-3"
                            }`}>
                            {paginatedCompanies.map(company => (
                                <div
                                    key={company.id}
                                    onClick={() => handleSelect(company.id)}
                                    className={`group relative bg-white border border-slate-200/70 hover:border-cyan-300 hover:shadow-[0_15px_35px_rgba(14,165,233,0.08)] hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_20px_45px_rgba(14,165,233,0.12)] transition-all duration-300 cursor-pointer ${viewLayout === 'grid'
                                        ? "rounded-3xl p-5 flex flex-col justify-between h-[215px]"
                                        : "rounded-2xl p-4 flex items-center gap-6"
                                        }`}
                                >
                                    {/* Action Menu (Top Right) */}
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2" onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={(e) => handleEdit(e, company)}
                                            className="p-2 bg-white text-slate-400 hover:text-cyan-600 rounded-lg border border-slate-100 hover:border-cyan-200 hover:bg-cyan-50 transition-colors shadow-sm"
                                        >
                                            <Settings size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, company.id)}
                                            className="p-2 bg-white text-slate-400 hover:text-red-600 rounded-lg border border-slate-100 hover:border-red-200 hover:bg-red-50 transition-colors shadow-sm"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Layout Config */}
                                    {viewLayout === 'grid' ? (
                                        <>
                                            <div className="flex items-start justify-between">
                                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-100 flex items-center justify-center text-xl font-black text-slate-300 group-hover:text-cyan-500 group-hover:scale-105 transition-all shadow-sm">
                                                    {company.logo ? (
                                                        <img src={company.logo} alt={company.nomeFantasia || company.razaoSocial} className="w-full h-full object-contain p-1.5 rounded-xl" />
                                                    ) : (
                                                        (company.nomeFantasia || company.razaoSocial || 'E').charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm transition-all duration-300 border ${company.status === 'inactive'
                                                    ? 'bg-rose-500 text-white border-rose-500 shadow-rose-500/10'
                                                    : 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-500/10'
                                                    }`}>
                                                    {company.status === 'inactive' ? 'Inativo' : 'Ativo'}
                                                </span>
                                            </div>

                                            <div className="flex-1 mt-3">
                                                <h3 className="font-extrabold text-base text-slate-900 group-hover:text-cyan-600 transition-colors line-clamp-1">
                                                    {company.nomeFantasia}
                                                </h3>
                                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider line-clamp-1 mb-2">
                                                    {company.razaoSocial}
                                                </p>

                                                <div className="space-y-1 text-[11px] text-slate-500 font-semibold">
                                                    <div className="flex items-center gap-1.5">
                                                        <Briefcase size={12} className="text-slate-300 flex-shrink-0" />
                                                        <span className="font-mono truncate">{company.cnpj}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin size={12} className="text-slate-300 flex-shrink-0" />
                                                        <span className="truncate">{company.address?.city ? `${company.address.city}, ${company.address.uf || ''}` : 'Localização n/d'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100/50 mt-1">
                                                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${company.regimeTributario === '1' ? 'bg-cyan-50 text-cyan-700' : company.regimeTributario === '3' ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'}`}>
                                                            {company.regimeTributario === '1' ? 'Simples Nacional' : company.regimeTributario === '3' ? 'Regime Normal' : 'Regime n/d'}
                                                        </span>
                                                        {company.aliquotaISS !== undefined && company.aliquotaISS !== null && (company.aliquotaISS as any) !== '' && (
                                                            <span className="text-[9px] text-slate-400 font-bold">
                                                                ISS: {company.aliquotaISS}%
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-cyan-600 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0 duration-200">
                                                <span>Acessar Painel</span>
                                                <ArrowRight size={13} />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-slate-400 group-hover:text-cyan-600 group-hover:bg-cyan-50 transition-colors">
                                                {(company.nomeFantasia || company.razaoSocial || 'E').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                                                <div className="col-span-1 min-w-0">
                                                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-cyan-600 truncate">{company.nomeFantasia}</h3>
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate">{company.razaoSocial}</p>
                                                </div>
                                                <div className="col-span-1 flex items-center gap-2 text-xs text-slate-500">
                                                    <Briefcase size={14} className="text-slate-300 flex-shrink-0" />
                                                    <span className="font-mono truncate">{company.cnpj}</span>
                                                </div>
                                                <div className="col-span-1 flex items-center gap-2 text-xs text-slate-500">
                                                    <MapPin size={14} className="text-slate-300 flex-shrink-0" />
                                                    <span className="truncate">{company.address?.city ? `${company.address.city}, ${company.address.uf || ''}` : '-'}</span>
                                                </div>
                                                <div className="col-span-1 flex items-center gap-2 text-xs text-slate-500">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${company.regimeTributario === '1' ? 'bg-cyan-50 text-cyan-700' : company.regimeTributario === '3' ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'}`}>
                                                        {company.regimeTributario === '1' ? 'Simples Nacional' : company.regimeTributario === '3' ? 'Regime Normal' : 'Regime N/D'}
                                                    </span>
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm ${company.status === 'inactive'
                                                        ? 'bg-rose-500 text-white border-rose-500 shadow-rose-500/10'
                                                        : 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-500/10'
                                                        }`}>
                                                        {company.status === 'inactive' ? 'Inativo' : 'Ativo'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-8 flex items-center justify-center text-slate-300 group-hover:text-cyan-600 opacity-0 group-hover:opacity-100">
                                                <ArrowRight size={16} />
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination Bar */}
                <div className="py-3 px-8 border-t border-slate-200/80 bg-white/90 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
                    <div className="flex items-center gap-2">
                        <span>Exibindo <strong>{filteredCompanies.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredCompanies.length)}</strong> de <strong>{filteredCompanies.length}</strong> empresas</span>
                        <span className="text-slate-300">|</span>
                        <div className="flex items-center gap-1">
                            <span>Por página:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                            >
                                <option value={20}>20</option>
                                <option value={40}>40</option>
                                <option value={60}>60</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-1.5">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold disabled:opacity-40 disabled:hover:bg-slate-100 transition-all"
                            >
                                Anterior
                            </button>
                            {Array.from({ length: totalPages }).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === i + 1
                                        ? 'bg-gradient-to-r from-[#0ea5e9] to-[#10b981] text-white shadow-md shadow-emerald-500/10'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold disabled:opacity-40 disabled:hover:bg-slate-100 transition-all"
                            >
                                Próxima
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal - Reused existing functional logic but updated styles */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCompany.id && companies.find(c => c.id === editingCompany.id) ? "Editar Empresa" : "Nova Empresa"}
            >
                <form onSubmit={handleSave} className="space-y-6">
                    {/* Header Section */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className={labelClass}>CNPJ</label>
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
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-cyan-600 hover:bg-cyan-50 rounded-full transition-colors disabled:opacity-50"
                                >
                                    {isLoadingCNPJ ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className={labelClass}>Razão Social</label>
                            <input type="text" name="razaoSocial" value={editingCompany.razaoSocial || ''} onChange={handleChange} className={inputClass} required />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className={labelClass}>Nome Fantasia</label>
                            <input type="text" name="nomeFantasia" value={editingCompany.nomeFantasia || ''} onChange={handleChange} className={inputClass} required />
                        </div>
                        <div>
                            <label className={labelClass}>Status</label>
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

                    {/* Address Section */}
                    <div>
                        <h4 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <MapPin size={14} /> Endereço
                        </h4>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-2">
                                <label className={labelClass}>CEP</label>
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
                                    {isLoadingCEP && <div className="absolute right-3 top-3"><Loader2 className="w-4 h-4 animate-spin text-cyan-600" /></div>}
                                </div>
                            </div>
                            <div className="col-span-2">
                                <label className={labelClass}>UF</label>
                                <input type="text" name="address.uf" value={editingCompany.address?.uf || ''} onChange={handleChange} className={inputClass} maxLength={2} />
                            </div>
                            <div className="col-span-3">
                                <label className={labelClass}>Cidade</label>
                                <input type="text" name="address.city" value={editingCompany.address?.city || ''} onChange={handleChange} className={inputClass} />
                            </div>
                            <div className="col-span-4">
                                <label className={labelClass}>Logradouro</label>
                                <input type="text" name="address.street" value={editingCompany.address?.street || ''} onChange={handleChange} className={inputClass} />
                            </div>
                        </div>
                    </div>

                    {/* Fiscal Section */}
                    <div>
                        <h4 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <Briefcase size={14} /> Fiscal
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Regime Tributário</label>
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
                            <div>
                                <label className={labelClass}>Alíquota ISS (%)</label>
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

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-500 hover:bg-slate-100 rounded-full font-bold transition-all text-sm">Cancelar</button>
                        <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-[#0ea5e9] to-[#10b981] text-white rounded-full font-bold shadow-lg shadow-emerald-500/10 hover:opacity-95 transition-all text-sm">
                            {editingCompany.id && companies.find(c => c.id === editingCompany.id) ? 'Salvar Alterações' : 'Criar Empresa'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* === MODAL: RESTAURAR SISTEMA === */}
            {isRestoreModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => !isRestoring && setIsRestoreModalOpen(false)}>
                    <div
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 relative animate-in fade-in zoom-in-95 duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-amber-100 rounded-2xl text-amber-600 flex-shrink-0">
                                <RotateCcw size={28} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900">Restaurar Sistema</h2>
                                <p className="text-sm text-slate-500 mt-1">Selecione um arquivo de backup <strong>.json</strong> exportado anteriormente pelo EscopoV3 para restaurar todos os seus dados.</p>
                            </div>
                            {!isRestoring && (
                                <button onClick={() => setIsRestoreModalOpen(false)} className="ml-auto p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        {/* Warning Banner */}
                        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl mb-6">
                            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-red-700 font-medium leading-relaxed">
                                <strong>Atenção:</strong> Esta ação irá <strong>substituir todos os dados atuais</strong> pelos dados do arquivo selecionado. O sistema será reiniciado automaticamente após a restauração. Esta ação é irreversível.
                            </p>
                        </div>

                        {/* File Drop Zone */}
                        <label className={`block w-full cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 mb-6 ${restoreFile ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-slate-50 hover:border-cyan-400 hover:bg-cyan-50/50'}`}>
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={handleRestoreFileChange}
                                disabled={isRestoring}
                            />
                            {restoreFile ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="p-3 bg-amber-100 rounded-2xl">
                                        <CheckCircle2 size={28} className="text-amber-600" />
                                    </div>
                                    <p className="font-bold text-slate-800 text-sm">{restoreFile.name}</p>
                                    <p className="text-xs text-slate-500">{(restoreFile.size / 1024).toFixed(1)} KB — Clique para trocar o arquivo</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="p-3 bg-slate-200 rounded-2xl">
                                        <Upload size={28} className="text-slate-500" />
                                    </div>
                                    <p className="font-bold text-slate-700 text-sm">Clique para selecionar o arquivo</p>
                                    <p className="text-xs text-slate-400">Apenas arquivos .json são aceitos</p>
                                </div>
                            )}
                        </label>

                        {/* Status Messages */}
                        {restoreStatus === 'error' && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
                                <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-red-700 font-medium">{restoreError}</p>
                            </div>
                        )}
                        {restoreStatus === 'success' && (
                            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl mb-4">
                                <CheckCircle2 size={16} className="text-green-500" />
                                <p className="text-xs text-green-700 font-bold">Backup restaurado com sucesso! Reiniciando...</p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsRestoreModalOpen(false)}
                                disabled={isRestoring}
                                className="flex-1 py-3 rounded-full border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRestoreConfirm}
                                disabled={!restoreFile || isRestoring || restoreStatus === 'success'}
                                className="flex-1 py-3 rounded-full bg-gradient-to-r from-[#f59e0b] to-[#ea580c] hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-amber-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isRestoring ? (
                                    <><Loader2 size={16} className="animate-spin" /> Restaurando...</>
                                ) : (
                                    <><RotateCcw size={16} /> Confirmar Restauração</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};