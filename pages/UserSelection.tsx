import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
    Shield, ArrowRight, LogOut, Search, UserCircle, Loader2, Sparkles, CheckCircle2,
    Sun, Moon, Lock, CheckCheck, Clock, Layers, Filter, UserCheck, ShieldCheck
} from 'lucide-react';
import { SystemUser } from '../types';

export const UserSelection = () => {
    const { systemUsers, master_flag, logout, currentUser, userEmail } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    // Theme Toggle State
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

    const toggleTheme = () => {
        const next = !isDarkMode;
        setIsDarkMode(next);
        localStorage.setItem('theme', next ? 'dark' : 'light');
        if (next) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    // Item 3: Filter Tabs State
    const [userFilterRole, setUserFilterRole] = useState<'ALL' | 'ADM' | 'SUB' | 'ACTIVE'>('ALL');

    // Loading & Transition States
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [loadingStepText, setLoadingStepText] = useState('Iniciando o sistema...');
    
    // Navigation Loading State
    const [navigatingTarget, setNavigatingTarget] = useState<string | null>(null);
    const [navProgress, setNavProgress] = useState(0);

    // Item 5: Fluid Canvas Background Animation
    useEffect(() => {
        let fluidFrameId: number;
        const fluidCanvas = document.getElementById('user-selection-fluid') as HTMLCanvasElement;
        const fluidCtx = fluidCanvas?.getContext('2d');

        if (fluidCanvas && fluidCtx) {
            let fWidth = (fluidCanvas.width = window.innerWidth / 4);
            let fHeight = (fluidCanvas.height = window.innerHeight / 4);

            const handleResize = () => {
                if (fluidCanvas) {
                    fWidth = fluidCanvas.width = window.innerWidth / 4;
                    fHeight = fluidCanvas.height = window.innerHeight / 4;
                }
            };
            window.addEventListener('resize', handleResize);

            const orbs = [
                { x: fWidth * 0.2, y: fHeight * 0.2, vx: 0.04, vy: 0.03, r: fWidth * 0.45, color: '#0ea5e9' },
                { x: fWidth * 0.8, y: fHeight * 0.3, vx: -0.03, vy: 0.04, r: fWidth * 0.5, color: '#10b981' },
                { x: fWidth * 0.3, y: fHeight * 0.8, vx: 0.03, vy: -0.03, r: fWidth * 0.4, color: '#bef264' }
            ];

            const drawFluid = () => {
                fluidCtx.fillStyle = isDarkMode ? '#0f172a' : '#f8fafc';
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

            return () => {
                window.removeEventListener('resize', handleResize);
                if (fluidFrameId) cancelAnimationFrame(fluidFrameId);
            };
        }
    }, [isDarkMode]);

    useEffect(() => {
        if (!master_flag) {
            navigate('/app');
            return;
        }

        // Simulate Initial Welcome & Data Loading
        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += Math.floor(Math.random() * 8) + 4;
            if (currentProgress >= 100) {
                currentProgress = 100;
                setProgress(100);
                setLoadingStepText('Ambiente pronto! Seja bem-vindo!');
                clearInterval(interval);
                setTimeout(() => {
                    setIsInitialLoading(false);
                }, 600);
            } else {
                setProgress(currentProgress);
                if (currentProgress < 30) {
                    setLoadingStepText('Autenticando sessão e credenciais...');
                } else if (currentProgress < 65) {
                    setLoadingStepText('Carregando empresas, parâmetros e permissões...');
                } else if (currentProgress < 90) {
                    setLoadingStepText('Sincronizando dados contábeis e fiscais...');
                } else {
                    setLoadingStepText('Finalizando preparação da workspace...');
                }
            }
        }, 120);

        return () => clearInterval(interval);
    }, [master_flag, navigate]);

    // Item 3: Advanced Subuser Filter Logic
    const subUsersOnly = (systemUsers || []).filter(u => u.tipo_usuario === 'SUB');
    
    const filteredUsers = subUsersOnly.filter(u => {
        const matchesSearch =
            (u.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (userFilterRole === 'ADM') return u.tipo_usuario === 'ADM';
        if (userFilterRole === 'SUB') return u.tipo_usuario === 'SUB';
        if (userFilterRole === 'ACTIVE') return u.status === 'active' || !u.status;
        return true;
    });

    const handleSelectUser = (user: SystemUser | null) => {
        const targetName = user ? user.name : 'Administrador Master';
        setNavigatingTarget(targetName);
        setNavProgress(0);

        let p = 0;
        const navInterval = setInterval(() => {
            p += Math.floor(Math.random() * 15) + 10;
            if (p >= 100) {
                p = 100;
                setNavProgress(100);
                clearInterval(navInterval);
                setTimeout(() => {
                    navigate('/app');
                }, 300);
            } else {
                setNavProgress(p);
            }
        }, 100);
    };

    // --- INITIAL LOADING OVERLAY SCREEN ---
    if (isInitialLoading) {
        return (
            <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-[#f8fafc] text-slate-900'} flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans select-none`}>
                <canvas id="user-selection-fluid" className="absolute inset-0 w-full h-full pointer-events-none z-0 filter blur-[100px] opacity-60" />

                <div className={`max-w-md w-full text-center space-y-8 relative z-10 animate-in fade-in zoom-in-95 duration-700 ${isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white/80 border-slate-200/80'} backdrop-blur-xl p-10 rounded-[2.5rem] border shadow-[0_30px_70px_rgba(15,23,42,0.1)]`}>
                    
                    {/* Animated Welcome Shield Icon */}
                    <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500 via-teal-500 to-sky-500 rounded-3xl blur-md opacity-40 animate-pulse" />
                        <div className="relative w-full h-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-sky-500 rounded-3xl flex items-center justify-center text-white shadow-xl border border-white/30">
                            <Shield size={44} className="animate-bounce-subtle" />
                        </div>
                    </div>

                    {/* Warm Welcome Header */}
                    <div className="space-y-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-widest border border-emerald-200/60 dark:border-emerald-800/40">
                            <Sparkles size={13} className="text-emerald-500 animate-spin" />
                            Seja Bem-vindo(a)
                        </span>
                        <h1 className="text-3xl font-black tracking-tight leading-tight">
                            Olá, {currentUser}!
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium max-w-xs mx-auto">
                            Carregando e sincronizando seu ambiente de trabalho no <strong className="text-emerald-600">Escopo V3</strong>.
                        </p>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="space-y-3 pt-2">
                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden p-0.5 border border-slate-200/80 dark:border-slate-600 shadow-inner relative">
                            <div
                                className="h-full bg-gradient-to-r from-[#0ea5e9] via-[#10b981] to-[#bef264] rounded-full transition-all duration-300 ease-out shadow-md"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span className="truncate max-w-[260px] text-slate-600 dark:text-slate-300 font-semibold">{loadingStepText}</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-black font-mono ml-2 tabular-nums">{progress}%</span>
                        </div>
                    </div>
                </div>

                <footer className="mt-12 text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-3 relative z-10">
                    <div className="w-8 h-px bg-slate-200 dark:bg-slate-700" />
                    Escopo V3 Premium • Built for Excellence
                    <div className="w-8 h-px bg-slate-200 dark:bg-slate-700" />
                </footer>
            </div>
        );
    }

    // --- SELECTION TARGET NAVIGATION LOADING OVERLAY ---
    if (navigatingTarget) {
        return (
            <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-[#f8fafc] text-slate-900'} flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans select-none`}>
                <div className={`max-w-md w-full text-center space-y-6 relative z-10 animate-in fade-in duration-300 ${isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-200'} backdrop-blur-xl p-8 rounded-[2.5rem] border shadow-2xl`}>
                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
                        <Loader2 size={32} className="animate-spin" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black">Entrando no ambiente...</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mt-1">Carregando permissões para <strong>{navigatingTarget}</strong></p>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-600 shadow-inner">
                        <div
                            className="h-full bg-gradient-to-r from-[#0ea5e9] to-[#10b981] rounded-full transition-all duration-200 ease-out"
                            style={{ width: `${navProgress}%` }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-[#f8fafc] text-slate-900'} flex flex-col items-center justify-between p-6 relative overflow-hidden font-sans`}>
            {/* Item 5: Fluid Canvas Background */}
            <canvas id="user-selection-fluid" className="absolute inset-0 w-full h-full pointer-events-none z-0 filter blur-[90px] opacity-50" />

            {/* Top Bar with Theme Toggle */}
            <header className="w-full max-w-5xl mx-auto flex items-center justify-between relative z-10 py-2">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                        E
                    </div>
                    <span className="font-extrabold text-lg tracking-tight">Escopo<span className="text-emerald-500">V3</span></span>
                </div>

                {/* Item 5: Light/Dark Theme Switcher */}
                <button
                    onClick={toggleTheme}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all shadow-sm ${
                        isDarkMode
                            ? 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
                    <span>{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
                </button>
            </header>

            {/* Main Center Container */}
            <div className="max-w-5xl w-full space-y-8 animate-in fade-in zoom-in-95 duration-700 relative z-10 my-auto py-4">
                
                {/* Header Welcome */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-3xl mb-1 border border-emerald-500/20 shadow-inner">
                        <Shield size={32} className="animate-bounce-subtle" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                        Olá, <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500">{currentUser}!</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-medium max-w-md mx-auto">
                        Selecione o ambiente de trabalho que deseja operar hoje no ecossistema <span className="text-emerald-500 font-bold">Escopo V3</span>.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Master Admin Card */}
                    <Card
                        className={`p-7 cursor-pointer hover:border-emerald-500 hover:shadow-[0_20px_50px_rgba(16,185,129,0.15)] transition-all border-2 border-transparent group ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/90 border-slate-200/80'} backdrop-blur-xl rounded-[2.5rem] flex flex-col items-center justify-between shadow-lg`}
                        onClick={() => handleSelectUser(null)}
                    >
                        <div className="flex flex-col items-center text-center space-y-5">
                            <div className="w-22 h-22 rounded-[2rem] bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 flex items-center justify-center text-white shadow-xl group-hover:scale-105 group-hover:rotate-3 transition-all duration-500 ring-4 ring-emerald-500/10 p-5">
                                <Shield size={40} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black">Administrador Master</h3>
                                <div className="flex items-center justify-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 rounded-full font-black uppercase tracking-[0.15em]">
                                        Acesso Total Irrestrito
                                    </span>
                                </div>
                            </div>
                        </div>
                        <Button variant="outline" className="w-full mt-6 group-hover:bg-gradient-to-r group-hover:from-emerald-600 group-hover:to-teal-600 group-hover:text-white group-hover:border-emerald-600 transition-all duration-300 rounded-2xl h-12 font-bold text-sm shadow-sm">
                            Painel Master <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </Card>

                    {/* Sub-users list section */}
                    <div className="lg:col-span-2 space-y-4">
                        
                        {/* Search Bar & Item 3: Filter Tabs */}
                        <div className="space-y-3">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none" size={20} />
                                <input
                                    type="text"
                                    placeholder="Buscar subusuário por nome ou e-mail..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ paddingLeft: '3.25rem' }}
                                    className={`w-full pr-6 py-3.5 rounded-2xl border ${isDarkMode ? 'bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white/90 border-slate-200 text-slate-900 placeholder:text-slate-400'} backdrop-blur-xl shadow-md focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none text-base transition-all font-medium`}
                                />
                            </div>

                            {/* Item 3: Filter Tabs */}
                            <div className="flex items-center justify-between gap-2">
                                <div className={`flex items-center gap-1 p-1 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200/80'}`}>
                                    <button
                                        type="button"
                                        onClick={() => setUserFilterRole('ALL')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            userFilterRole === 'ALL'
                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                        }`}
                                    >
                                        Todos ({subUsersOnly.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setUserFilterRole('ACTIVE')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            userFilterRole === 'ACTIVE'
                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                        }`}
                                    >
                                        Ativos ({subUsersOnly.filter(u => u.status === 'active' || !u.status).length})
                                    </button>
                                </div>

                                <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                                    {filteredUsers.length} subusuário(s)
                                </span>
                            </div>
                        </div>

                        {/* Subusers Cards Grid (Item 2: Badges & Status) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                            {filteredUsers.map(user => (
                                <Card
                                    key={user.id}
                                    className={`p-4 cursor-pointer hover:border-emerald-400 hover:shadow-lg transition-all border ${
                                        isDarkMode ? 'bg-slate-800/70 border-slate-700/80 hover:bg-slate-800' : 'bg-white/80 border-slate-200/80 hover:bg-white'
                                    } backdrop-blur-md rounded-2xl flex items-center justify-between gap-3 group`}
                                    onClick={() => handleSelectUser(user)}
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        {/* Avatar badge */}
                                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-200 font-extrabold text-sm group-hover:from-emerald-500 group-hover:to-teal-600 group-hover:text-white transition-all duration-300 shadow-sm flex-shrink-0">
                                            {user.name ? user.name.charAt(0).toUpperCase() : <UserCircle size={24} />}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <h4 className="font-extrabold text-sm truncate group-hover:text-emerald-600 transition-colors">{user.name}</h4>
                                                {/* Item 2: Status Badge */}
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Usuário Ativo" />
                                            </div>
                                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                            
                                            {/* Item 2: Role Badge */}
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/70 text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider">
                                                    {(user as any).departamento || user.department || 'OPERADOR'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-emerald-500 flex-shrink-0">
                                        <ArrowRight size={18} />
                                    </div>
                                </Card>
                            ))}

                            {filteredUsers.length === 0 && (
                                <div className={`col-span-full py-12 text-center text-slate-400 font-medium text-xs italic ${
                                    isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white/40 border-slate-200'
                                } backdrop-blur-md rounded-[2rem] border-2 border-dashed`}>
                                    Nenhum subusuário encontrado para a busca informada.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-center pt-1">
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 text-rose-500 hover:text-rose-600 font-black hover:scale-105 transition-all px-5 py-2.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-xs uppercase tracking-wider"
                    >
                        <LogOut size={15} /> Encerrar Sessão
                    </button>
                </div>
            </div>

            {/* Item 4: Security & Session Summary Panel (Footer Bar) */}
            <footer className={`w-full max-w-5xl mx-auto py-3 px-6 rounded-2xl border ${
                isDarkMode ? 'bg-slate-800/60 border-slate-700/80 text-slate-400' : 'bg-white/60 border-slate-200/60 text-slate-500'
            } backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-semibold relative z-10`}>
                <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-500 flex-shrink-0" />
                    <span>Sessão Protegida por <strong>Criptografia Híbrida (AES-256 / SSL)</strong></span>
                </div>
                <div className="flex items-center gap-4 text-[10px]">
                    <span className="flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        Autenticado: <strong>Hoje</strong>
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                        ● Conexão Segura
                    </span>
                </div>
            </footer>

            <style>{`
                .animate-bounce-subtle {
                    animation: bounce-subtle 3s infinite;
                }
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    );
};
