import React from 'react';
import { X, Activity, Sparkles } from 'lucide-react';

interface DiagnosticCardProps {
    code: string;
    title?: string;
    description: string;
    onClose?: () => void;
    className?: string;
}

export const DiagnosticCard: React.FC<DiagnosticCardProps> = ({
    code,
    title,
    description,
    onClose,
    className = ''
}) => {
    return (
        <div className={`bg-slate-900 rounded-xl p-6 relative flex gap-5 shadow-2xl border border-slate-800/60 ${className}`}>
            {/* Icon Box */}
            <div className="shrink-0">
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50 flex items-center justify-center shadow-inner">
                    <Activity className="w-6 h-6 text-amber-500" />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 w-full relative">
                {/* Close Button positioned absolutely top-right of content area */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute -top-1 -right-1 text-slate-500 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-800"
                        title="Fechar"
                    >
                        <X size={18} />
                    </button>
                )}

                <div className="flex flex-col items-start pr-8">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="px-1.5 py-0.5 bg-amber-500/10 rounded border border-amber-500/20 flex items-center gap-1.5">
                            <Sparkles size={10} className="text-amber-500" />
                            <span className="text-amber-500 font-bold text-[10px] tracking-widest uppercase">
                                Diagnóstico IA
                            </span>
                        </div>
                    </div>

                    <h3 className="text-white font-bold text-lg tracking-tight mb-2">
                        {title || `Entendendo: ${code}`}
                    </h3>

                    <p className="text-slate-400 text-sm leading-relaxed antialiased">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
};
