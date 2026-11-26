import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Mail, Phone, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const PendingApproval: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[var(--bg-card)] rounded-3xl shadow-xl border border-[var(--border-color)] overflow-hidden animate-in fade-in zoom-in duration-500">

                {/* Header Banner */}
                <div className="bg-amber-50 p-8 flex flex-col items-center justify-center border-b border-amber-100">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                        <ShieldAlert className="w-10 h-10 text-amber-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-amber-800 text-center">Cadastro em Análise</h1>
                    <p className="text-amber-700 text-center mt-2 max-w-sm">
                        Seu cadastro aguarda aprovação da empresa administradora.
                        <br />
                        Entre em contato para liberação.
                    </p>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8">

                    <div className="space-y-4 text-center">
                        <p className="text-[var(--text-secondary)] leading-relaxed">
                            Para garantir a segurança do sistema, todos os novos cadastros passam por uma verificação manual.
                            <br />
                            Você receberá uma notificação ou poderá tentar fazer login novamente após a aprovação.
                        </p>
                    </div>

                    {/* Contact Info */}
                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 space-y-4 border border-[var(--border-color)]">
                        <h3 className="font-semibold text-[var(--text-primary)] text-center mb-4 border-b border-[var(--border-color)] pb-2">
                            Canais de Atendimento Prioritário
                        </h3>

                        <div className="flex items-center gap-4 p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] hover:border-emerald-200 transition-colors group cursor-pointer" onClick={() => window.open('https://wa.me/5562992127752', '_blank')}>
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                                <Phone className="w-5 h-5 text-emerald-700" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-[var(--text-secondary)] uppercase font-bold tracking-wider">WhatsApp</p>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">(62) 99212-7752</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] hover:border-blue-200 transition-colors group cursor-pointer" onClick={() => window.location.href = 'mailto:geovaniwn@gmail.com'}>
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                <Mail className="w-5 h-5 text-blue-700" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-[var(--text-secondary)] uppercase font-bold tracking-wider">E-mail</p>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">geovaniwn@gmail.com</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        <Button onClick={() => navigate('/login')} className="w-full justify-center">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar para o Login
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
