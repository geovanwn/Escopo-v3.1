import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Lock, Mail, Eye, EyeOff, User, CheckCircle2 } from 'lucide-react';

export const Login = () => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    const { login, register, isLoggedIn, resetPassword, loginWithGoogle } = useData();
    const navigate = useNavigate();

    React.useEffect(() => {
        if (isLoggedIn) {
            const masterFlagLocal = localStorage.getItem('master_flag') === 'true';
            if (masterFlagLocal) {
                navigate('/select-user');
            } else {
                navigate('/');
            }
        }
    }, [isLoggedIn, navigate]);

    React.useEffect(() => {
        const savedEmail = localStorage.getItem('escopo_email');
        const savedPassword = localStorage.getItem('escopo_password');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
        if (savedPassword) {
            setPassword(savedPassword);
        }
    }, []);

    // Interactive Animation Logic: Liquid Gradient and 3D Water Surface Ripples
    React.useEffect(() => {
        let fluidFrameId: number;
        let waterFrameId: number;
        let handleFluidResize: () => void = () => {};
        let handleWaterResize: () => void = () => {};
        let handleMouseMove: (e: MouseEvent) => void = () => {};

        const timer = setTimeout(() => {
            // --- 1. LIQUID GRADIENT BACKGROUND ---
            const fluidCanvas = document.getElementById('login-fluid') as HTMLCanvasElement;
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
                    { x: fWidth * 0.2, y: fHeight * 0.2, vx: 0.08, vy: 0.07, r: fWidth * 0.45, color: '#0ea5e9' }, // Cyan
                    { x: fWidth * 0.8, y: fHeight * 0.3, vx: -0.06, vy: 0.09, r: fWidth * 0.5, color: '#10b981' }, // Emerald
                    { x: fWidth * 0.3, y: fHeight * 0.8, vx: 0.05, vy: -0.05, r: fWidth * 0.4, color: '#bef264' }, // Lime
                    { x: fWidth * 0.7, y: fHeight * 0.7, vx: -0.07, vy: -0.08, r: fWidth * 0.55, color: '#3b82f6' } // Royal Blue
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
            const waterCanvas = document.getElementById('login-water') as HTMLCanvasElement;
            const waterCtx = waterCanvas?.getContext('2d');

            if (waterCanvas && waterCtx) {
                let width = (waterCanvas.width = window.innerWidth);
                let height = (waterCanvas.height = window.innerHeight);

                // Grid configurations
                const cols = 35;
                const rows = 25;
                let spacingX = width / (cols - 1);
                let spacingY = height / (rows - 1);

                // Initialize Grid Nodes
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
                                z: 0, // height of wave
                                v: 0  // wave velocity
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

                // Mouse interaction coordinates
                let mx = -1000;
                let my = -1000;
                let pmx = -1000;
                let pmy = -1000;

                handleMouseMove = (e: MouseEvent) => {
                    pmx = mx;
                    pmy = my;
                    mx = e.clientX;
                    my = e.clientY;

                    // Calculate mouse velocity to make ripple force proportional to speed
                    const speed = Math.sqrt((mx - pmx) ** 2 + (my - pmy) ** 2);
                    if (speed > 1) {
                        // Push waves
                        for (let i = 1; i < cols - 1; i++) {
                            for (let j = 1; j < rows - 1; j++) {
                                const p = grid[i][j];
                                const dist = Math.sqrt((p.x - mx) ** 2 + (p.y - my) ** 2);
                                if (dist < 150) { // Increased radius of influence
                                    // Add velocity to create a natural rippling splash (increased force)
                                    const force = (1 - dist / 150) * Math.min(speed * 0.7, 16);
                                    p.v += force;
                                }
                            }
                        }
                    }
                };
                window.addEventListener('mousemove', handleMouseMove);

                // Wave Equation Simulation
                const updateWaves = () => {
                    const springStiffness = 0.05; // Slightly slower, more fluid wave speed
                    const damping = 0.97; // Persistent waves

                    // 1. Calculate accelerations and update velocities (ignoring boundaries to create reflection)
                    for (let i = 1; i < cols - 1; i++) {
                        for (let j = 1; j < rows - 1; j++) {
                            const left = grid[i - 1][j].z;
                            const right = grid[i + 1][j].z;
                            const up = grid[i][j - 1].z;
                            const down = grid[i][j + 1].z;

                            // Average height of neighboring nodes
                            const avg = (left + right + up + down) / 4;
                            
                            // Force proportional to distance from neighbor average
                            const a = (avg - grid[i][j].z) * springStiffness;
                            grid[i][j].v = (grid[i][j].v + a) * damping;
                        }
                    }

                    // 2. Update heights
                    for (let i = 1; i < cols - 1; i++) {
                        for (let j = 1; j < rows - 1; j++) {
                            grid[i][j].z += grid[i][j].v;
                        }
                    }
                };

                const drawWater = () => {
                    waterCtx.clearRect(0, 0, width, height);

                    // Update wave physics
                    updateWaves();

                    // Horizontal wave lines (rendered segment by segment for glow effect)
                    for (let j = 1; j < rows - 1; j++) {
                        for (let i = 0; i < cols - 1; i++) {
                            const p1 = grid[i][j];
                            const p2 = grid[i + 1][j];
                            const avgZ = (Math.abs(p1.z) + Math.abs(p2.z)) / 2;

                            waterCtx.beginPath();
                            waterCtx.moveTo(p1.x, p1.y + p1.z);
                            waterCtx.lineTo(p2.x, p2.y + p2.z);

                            const intensity = Math.min(avgZ / 10, 0.75);
                            // Standard line opacity is 0.14, active ripples glow up to 0.89 opacity
                            waterCtx.strokeStyle = `rgba(20, 184, 166, ${0.14 + intensity})`;
                            // Line thickness expands from 0.8px up to 2.8px based on ripple displacement
                            waterCtx.lineWidth = 0.8 + intensity * 2.0;
                            waterCtx.stroke();
                        }
                    }

                    // Vertical wave lines (segment by segment)
                    for (let i = 1; i < cols - 1; i++) {
                        for (let j = 0; j < rows - 1; j++) {
                            const p1 = grid[i][j];
                            const p2 = grid[i][j + 1];
                            const avgZ = (Math.abs(p1.z) + Math.abs(p2.z)) / 2;

                            waterCtx.beginPath();
                            waterCtx.moveTo(p1.x + p1.z, p1.y);
                            waterCtx.lineTo(p2.x + p2.z, p2.y);

                            const intensity = Math.min(avgZ / 10, 0.75);
                            waterCtx.strokeStyle = `rgba(14, 165, 233, ${0.14 + intensity})`;
                            waterCtx.lineWidth = 0.8 + intensity * 2.0;
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

    const handleForgotLogin = () => {
        alert("Para recuperar seu login, entre em contato com o suporte administrativo ou verifique seu e-mail corporativo.");
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Por favor, informe seu e-mail para redefinir a senha.');
            return;
        }
        setError('');
        try {
            setLoading(true);
            await resetPassword(email);
            setSuccessMsg(`Um link para redefinição de senha foi enviado para ${email}. Verifique sua caixa de entrada.`);
        } catch (err: any) {
            setError('Erro ao enviar email de redefinição. Verifique o email informado.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const success = await loginWithGoogle();
            if (success) {
                const masterFlagLocal = localStorage.getItem('master_flag') === 'true';
                if (masterFlagLocal) {
                    navigate('/select-user');
                } else {
                    navigate('/');
                }
            } else {
                setError('Erro ao fazer login com Google.');
            }
        } catch (err: any) {
            if (err.message && (err.message.includes('Aguarde a aprovação') || err.message.includes('pendente de aprovação') || err.message.includes('aguarda aprovação'))) {
                navigate('/pending-approval');
                return;
            }
            setError(err.message || 'Erro inesperado no login com Google.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        try {
            if (isRegistering) {
                if (password !== confirmPassword) {
                    setError('As senhas não coincidem.');
                    setLoading(false);
                    return;
                }
                const result = await register(email, password, name);
                if (result.success) {
                    setSuccessMsg('Cadastro realizado! Redirecionando para análise...');
                    setTimeout(() => navigate('/pending-approval'), 1500);
                } else {
                    setError(result.error || 'Erro ao criar conta.');
                }
            } else {
                const success = await login(email, password);
                if (success) {
                    if (rememberMe) {
                        localStorage.setItem('escopo_email', email);
                        localStorage.setItem('escopo_password', password);
                    } else {
                        localStorage.removeItem('escopo_email');
                        localStorage.removeItem('escopo_password');
                    }
                    navigate('/');
                } else {
                    setError('E-mail ou senha incorretos.');
                }
            }
        } catch (err: any) {
            console.error(err);
            if (err.message && (err.message.includes('Aguarde a aprovação') || err.message.includes('pendente de aprovação') || err.message.includes('aguarda aprovação'))) {
                navigate('/pending-approval');
                return;
            }
            setError(err.message || 'Ocorreu um erro inesperado.');
        } finally {
            setLoading(false);
        }
    };

    const highlights = [
        {
            tag: 'DESTAQUE DO SISTEMA',
            title: 'Módulo Fiscal & SPED',
            description: 'Validação automatizada de SPED EFD, NF-e, NFS-e e conciliação de alíquotas fiscais em tempo real.',
            badge: 'Fiscal'
        },
        {
            tag: 'GESTÃO FINANCEIRA',
            title: 'Aging 30 / 60 / 90 Dias',
            description: 'Acompanhamento de curva de vencimentos, DRE Gerencial e Fluxo de Caixa integrado.',
            badge: 'Financeiro'
        },
        {
            tag: 'RECURSOS HUMANOS',
            title: 'Folha & eSocial',
            description: 'Cálculo de provisões, rescisões, eventos do eSocial e relatórios SEFIP pré-formatados.',
            badge: 'DP & RH'
        },
        {
            tag: 'SEGURANÇA & NUVEM',
            title: 'Sincronização Híbrida',
            description: 'Dados sincronizados entre Nuvem e SQLite local no Desktop com audit trail e backup contínuo.',
            badge: 'Cloud Sync'
        }
    ];

    const [currentSlide, setCurrentSlide] = useState(0);

    React.useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % highlights.length);
        }, 4500);
        return () => clearInterval(interval);
    }, [highlights.length]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 lg:p-8 relative overflow-hidden font-sans">
            {/* Layer 1: Blurred Liquid Canvas (Slow colorful morphing) */}
            <canvas id="login-fluid" className="absolute inset-0 w-full h-full pointer-events-none z-0 filter blur-[80px] md:blur-[120px] opacity-75" />

            {/* Layer 2: Interactive 3D Water Surface Mesh (Ripples on hover) */}
            <canvas id="login-water" className="absolute inset-0 w-full h-full pointer-events-none z-10 opacity-70" />

            {/* Split Container (The Card) */}
            <div className="w-full max-w-4xl bg-white rounded-[2rem] shadow-[0_30px_70px_rgba(15,23,42,0.18),_0_0_50px_rgba(15,23,42,0.04)] overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[580px] relative z-20 animate-in fade-in zoom-in-95 duration-500">
                
                {/* Left Panel (Dynamic Gradient Area with Highlights Showcase) */}
                <div className="hidden md:flex relative bg-gradient-to-br from-[#0ea5e9] via-[#10b981] to-[#bef264] p-10 flex-col justify-between overflow-hidden text-white select-none">
                    {/* SVG Patterns and Blobs */}
                    <div 
                        className="absolute -top-16 -left-16 w-72 h-44 bg-gradient-to-br from-[#bef264] to-[#a3e635] opacity-90 filter blur-[1px] pointer-events-none" 
                        style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }} 
                    />
                    <div 
                        className="absolute -top-20 right-12 w-80 h-48 bg-gradient-to-br from-[#06b6d4] to-[#0ea5e9] opacity-80 filter blur-[1px] pointer-events-none" 
                        style={{ borderRadius: '40% 60% 30% 70% / 40% 50% 60% 50%' }} 
                    />
                    <div 
                        className="absolute -bottom-20 right-4 w-72 h-56 bg-gradient-to-tr from-[#bef264] to-[#a3e635] opacity-90 filter blur-[1px] pointer-events-none" 
                        style={{ borderRadius: '60% 40% 60% 40% / 50% 60% 40% 50%' }} 
                    />
                    <div 
                        className="absolute -bottom-24 -left-16 w-80 h-56 bg-gradient-to-br from-[#10b981] to-[#059669] opacity-70 filter blur-[1px] pointer-events-none" 
                        style={{ borderRadius: '50% 50% 30% 70% / 50% 60% 40% 50%' }} 
                    />

                    {/* Small background circles */}
                    <div className="absolute left-[-20px] top-[55%] w-12 h-12 bg-[#bef264] opacity-90 rounded-full pointer-events-none" />
                    <div className="absolute right-[-15px] top-[32%] w-12 h-12 bg-[#bef264] opacity-90 rounded-full pointer-events-none" />

                    {/* Top Branding Badge */}
                    <div className="relative z-10 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center font-black text-xl shadow-lg">
                            E
                        </div>
                        <span className="text-2xl font-black tracking-tight text-white">
                            Escopo<span className="text-emerald-200">V3</span>
                        </span>
                    </div>

                    {/* Interactive Highlights & News Showcase Card */}
                    <div className="relative z-10 my-auto text-left max-w-sm">
                        <div className="bg-white/15 backdrop-blur-md border border-white/20 p-6 rounded-3xl shadow-xl transition-all duration-500 hover:border-white/35">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200 bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
                                    {highlights[currentSlide].tag}
                                </span>
                                <span className="text-[10px] font-bold text-white/90 bg-emerald-500/30 px-2.5 py-0.5 rounded-md border border-emerald-300/20">
                                    {highlights[currentSlide].badge}
                                </span>
                            </div>
                            <h3 className="text-xl font-black mb-2 text-white tracking-tight">
                                {highlights[currentSlide].title}
                            </h3>
                            <p className="text-white/95 text-xs leading-relaxed font-medium">
                                {highlights[currentSlide].description}
                            </p>

                            {/* Carousel Indicators */}
                            <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/15">
                                <div className="flex items-center gap-1.5">
                                    {highlights.map((_, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setCurrentSlide(idx)}
                                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                                currentSlide === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-[10px] font-bold text-white/70">
                                    {currentSlide + 1} / {highlights.length}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Info Pill */}
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold text-white">
                            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                            Sistema Ativo & Seguro
                        </div>
                    </div>
                </div>

                {/* Right Panel (Form Area) */}
                <div className="bg-white p-8 lg:p-14 flex flex-col justify-center relative">
                    <div className="w-full max-w-sm mx-auto space-y-6">
                        
                        {/* Title Header */}
                        <div className="text-left space-y-1">
                            <div className="flex items-center gap-2 mb-2 md:hidden">
                                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-base shadow-sm">E</div>
                                <span className="text-lg font-black text-slate-800">Escopo<span className="text-emerald-600">V3</span></span>
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                {isRegistering ? 'Criar Conta' : 'Entrar'}
                            </h1>
                            <p className="text-xs text-slate-500 font-medium">
                                {isRegistering ? 'Preencha os dados abaixo para registrar seu usuário.' : 'Digite suas credenciais para acessar o sistema.'}
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            
                            {/* Error / Success Notifications */}
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3.5 rounded-2xl text-xs border border-red-100 flex items-center gap-2 animate-shake">
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
                                    <span className="font-medium leading-tight">{error}</span>
                                </div>
                            )}
                            {successMsg && (
                                <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-2xl text-xs border border-emerald-100 flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                                    <span className="font-medium leading-tight">{successMsg}</span>
                                </div>
                            )}

                            {/* Inputs Container */}
                            <div className="space-y-3.5">
                                {isRegistering && (
                                    <div className="relative flex items-center">
                                        <User className="absolute left-4 text-slate-400 pointer-events-none z-10" size={18} />
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            style={{ paddingLeft: '3.25rem' }}
                                            className="w-full pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium shadow-sm"
                                            placeholder="Nome Completo"
                                        />
                                    </div>
                                )}

                                <div className="relative flex items-center">
                                    <Mail className="absolute left-4 text-slate-400 pointer-events-none z-10" size={18} />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        style={{ paddingLeft: '3.25rem' }}
                                        className="w-full pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium shadow-sm"
                                        placeholder="Usuário ou e-mail"
                                    />
                                </div>

                                <div className="relative flex items-center">
                                    <Lock className="absolute left-4 text-slate-400 pointer-events-none z-10" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        style={{ paddingLeft: '3.25rem', paddingRight: '3.25rem' }}
                                        className="w-full py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium shadow-sm"
                                        placeholder="Senha"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 text-slate-400 hover:text-emerald-600 transition-colors z-10 p-1"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                {isRegistering && (
                                    <div className="relative flex items-center">
                                        <Lock className="absolute left-4 text-slate-400 pointer-events-none z-10" size={18} />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            style={{ paddingLeft: '3.25rem', paddingRight: '3.25rem' }}
                                            className="w-full py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium shadow-sm"
                                            placeholder="Confirmar Senha"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Additional controls (Remember Me & Forgot Password) */}
                            {!isRegistering && (
                                <div className="flex items-center justify-between text-xs px-1 text-slate-500 font-medium">
                                    <label className="flex items-center gap-2 hover:text-slate-800 cursor-pointer select-none transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                        />
                                        <span>Lembrar-me</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        className="text-emerald-600 hover:text-emerald-700 font-bold transition-colors"
                                    >
                                        Esqueceu a senha?
                                    </button>
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="pt-1">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 bg-gradient-to-r from-[#0ea5e9] to-[#10b981] hover:from-[#0284c7] hover:to-[#059669] text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-[0.99] disabled:opacity-70 transition-all flex items-center justify-center text-sm tracking-wide"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        isRegistering ? 'Criar Conta' : 'Entrar no Sistema'
                                    )}
                                </button>
                            </div>

                            {/* Toggles and Social Links */}
                            <div className="text-center space-y-4 pt-1">
                                <p className="text-xs text-slate-500 font-medium">
                                    {isRegistering ? 'Já tem uma conta?' : 'Novo por aqui?'}{' '}
                                    <button
                                        type="button"
                                        onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                                        className="text-emerald-600 font-extrabold hover:underline"
                                    >
                                        {isRegistering ? 'Entrar' : 'Crie uma conta'}
                                    </button>
                                </p>

                                {/* Divider or Google Option */}
                                <div className="relative flex items-center justify-center gap-3 py-0.5">
                                    <div className="w-full border-t border-slate-200" />
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest px-2 bg-white flex-shrink-0">ou</span>
                                    <div className="w-full border-t border-slate-200" />
                                </div>

                                <button
                                    type="button"
                                    onClick={handleGoogleLogin}
                                    disabled={loading}
                                    className="w-full py-3 border border-slate-200 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 active:scale-[0.99] transition-all text-xs font-bold text-slate-700 disabled:opacity-50 shadow-sm"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    <span>Entrar com o Google</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

            </div>
            
            {/* Custom Animations in styles */}
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-4px); }
                    40% { transform: translateX(4px); }
                    60% { transform: translateX(-4px); }
                    80% { transform: translateX(4px); }
                }
                .animate-shake {
                    animation: shake 0.4s ease-in-out;
                }
            `}</style>
        </div>
    );
};
