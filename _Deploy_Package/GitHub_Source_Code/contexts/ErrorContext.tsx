
import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, XCircle, Layers, CheckCircle } from 'lucide-react';

export interface AppError {
    code: string;
    title: string;
    description: string;
    origin: string;
    suggestion: string;
}

interface ErrorContextType {
    showError: (error: AppError) => void;
    hideError: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [errorModal, setErrorModal] = useState<AppError | null>(null);

    const showError = useCallback((error: AppError) => {
        setErrorModal(error);
    }, []);

    const hideError = useCallback(() => {
        setErrorModal(null);
    }, []);

    return (
        <ErrorContext.Provider value={{ showError, hideError }}>
            {children}

            {/* ERROR MODAL POPUP */}
            {errorModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-red-100 flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="bg-red-50 p-6 flex items-start gap-4 border-b border-red-100">
                            <div className="p-3 bg-red-100 rounded-xl text-red-600">
                                <AlertTriangle size={32} strokeWidth={2.5} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-black text-slate-800 leading-tight mb-1">{errorModal.title}</h3>
                                <p className="text-sm font-bold text-red-600 font-mono">Código: {errorModal.code}</p>
                            </div>
                            <button
                                onClick={hideError}
                                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">

                            {/* Description */}
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Descrição do Erro</label>
                                <p className="text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    {errorModal.description}
                                </p>
                            </div>

                            <div className="flex gap-4">
                                {/* Origin */}
                                <div className="flex-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Origem / Módulo</label>
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <Layers size={14} className="text-purple-500" />
                                        {errorModal.origin}
                                    </div>
                                </div>
                            </div>

                            {/* Suggestion */}
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Ação Recomendada (Solução)</label>
                                <div className="flex gap-3 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                    <CheckCircle size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                                    <p className="text-sm text-emerald-800 font-medium leading-relaxed">
                                        {errorModal.suggestion}
                                    </p>
                                </div>
                            </div>

                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={hideError}
                                className="px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-transform active:scale-95"
                            >
                                Entendi, vou verificar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ErrorContext.Provider>
    );
};

export const useError = () => {
    const context = useContext(ErrorContext);
    if (!context) {
        throw new Error('useError must be used within an ErrorProvider');
    }
    return context;
};
