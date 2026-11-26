import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Lock, Mail, Eye, EyeOff, LayoutDashboard, ShieldCheck, User, ArrowRight, CheckCircle2 } from 'lucide-react';

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
            navigate('/');
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

    const handleForgotLogin = () => {
        // Simple alert for now as login recovery usually requires support contact
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
                navigate('/');
            } else {
                setError('Erro ao fazer login com Google.');
            }
        } catch (err) {
            setError('Erro inesperado no login com Google.');
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
                    setSuccessMsg('Conta criada com sucesso! Redirecionando...');
                    setTimeout(() => navigate('/'), 1500);
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
        } catch (err) {
            setError('Ocorreu um erro inesperado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex font-sans">
            {/* Left Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-[var(--bg-card)]">
                <div className="w-full max-w-md space-y-8 animate-in slide-in-from-left-4 duration-700">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <ShieldCheck className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-[var(--text-primary)]">Escopo V3</span>
                    </div>

                    <div>
                        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                            {isRegistering ? 'Criar nova conta' : 'Bem-vindo de volta'}
                        </h1>
                        <p className="mt-2 text-[var(--text-secondary)]">
                            {isRegistering ? 'Preencha os dados abaixo para começar.' : 'Por favor, insira seus dados para entrar.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                {error}
                            </div>
                        )}
                        {successMsg && (
                            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm border border-emerald-100 flex items-center gap-2">
                                <CheckCircle2 size={16} />
                                {successMsg}
                            </div>
                        )}

                        <div className="space-y-4">
                            {isRegistering && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">Nome Completo</label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                                        placeholder="Seu nome"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">E-mail ou Usuário</label>
                                    {!isRegistering && (
                                        <button
                                            type="button"
                                            onClick={handleForgotLogin}
                                            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                                        >
                                            Esqueceu o login?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                                        placeholder="Digite seu email"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <label className="text-sm font-medium text-[var(--text-primary)]">Senha</label>
                                    {!isRegistering && (
                                        <button
                                            type="button"
                                            onClick={handleForgotPassword}
                                            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                                        >
                                            Esqueceu a senha?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-11 pr-11 py-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {!isRegistering && (
                                <div className="flex items-center gap-2">
                                    <input
                                        id="remember-me"
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <label htmlFor="remember-me" className="text-sm text-[var(--text-secondary)] cursor-pointer select-none">Lembrar</label>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-70 flex items-center justify-center"
                            >
                                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (isRegistering ? 'Cadastrar' : 'Entrar')}
                            </button>
                            <button type="button" className="p-3 border border-[var(--border-color)] rounded-xl hover:bg-gray-50 transition-colors text-[var(--text-secondary)]">
                                <ShieldCheck size={20} />
                            </button>
                        </div>

                        <div className="relative flex items-center gap-4 py-2">
                            <div className="flex-grow border-t border-[var(--border-color)]"></div>
                            <span className="text-xs text-[var(--text-secondary)] uppercase font-semibold">ou continue com</span>
                            <div className="flex-grow border-t border-[var(--border-color)]"></div>
                        </div>

                        <button type="button" onClick={handleGoogleLogin} disabled={loading} className="w-full py-3 border border-[var(--border-color)] rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors font-medium text-[var(--text-primary)] disabled:opacity-50">
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google
                        </button>

                        <div className="text-center mt-6">
                            <p className="text-sm text-[var(--text-secondary)]">
                                {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'}{' '}
                                <button
                                    type="button"
                                    onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                                    className="text-emerald-600 font-bold hover:underline"
                                >
                                    {isRegistering ? 'Fazer login' : 'Cadastre-se'}
                                </button>
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            {/* Right Side - Feature/Image */}
            <div className="hidden lg:flex w-1/2 bg-slate-950 relative overflow-hidden flex-col justify-between p-16 text-white">
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-emerald-500 rounded-full blur-[150px] animate-pulse"></div>
                    <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] bg-emerald-400 rounded-full blur-[150px] animate-pulse delay-1000"></div>
                </div>

                <div className="relative z-10 w-12 h-12 bg-white/10 backdrop-blur-lg rounded-xl flex items-center justify-center mb-auto">
                    <Lock className="text-emerald-400" size={24} />
                </div>

                <div className="relative z-10 max-w-lg">
                    <h2 className="text-4xl font-bold mb-6 leading-tight">Acesso seguro ao seu ecossistema corporativo.</h2>
                    <p className="text-emerald-100 text-lg mb-12 leading-relaxed">
                        Junte-se a milhares de empresas que confiam no Escopo V3 para proteger seus dados fiscais e otimizar seu fluxo de trabalho contábil.
                    </p>

                    <div className="flex items-center gap-4 pt-8 border-t border-white/10">
                        <div className="flex -space-x-3">
                            {[1, 2, 3].map((_, i) => (
                                <div key={i} className="w-10 h-10 rounded-full bg-emerald-800 border-2 border-[#0a2e1d] flex items-center justify-center text-xs font-bold text-emerald-200">
                                    {['JD', 'AS', '+2k'][i]}
                                </div>
                            ))}
                        </div>
                        <div>
                            <div className="flex text-yellow-400 text-xs mb-1">
                                {[1, 2, 3, 4, 5].map(i => <span key={i}>★</span>)}
                            </div>
                            <p className="text-xs text-emerald-200">Confiado por times em todo o Brasil</p>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-6px); }
                    40% { transform: translateX(6px); }
                    60% { transform: translateX(-6px); }
                    80% { transform: translateX(6px); }
                }
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>
        </div>
    );
};
