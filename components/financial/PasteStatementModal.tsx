import React from 'react';
import { Modal } from '../ui/Modal';
import { useToast } from '../../contexts/ToastContext';

interface PasteStatementModalProps {
    isOpen: boolean;
    onClose: () => void;
    pastedText: string;
    setPastedText: (text: string) => void;
    onProcess: (text: string) => void;
}

export const PasteStatementModal: React.FC<PasteStatementModalProps> = ({
    isOpen,
    onClose,
    pastedText,
    setPastedText,
    onProcess
}) => {
    const { addToast } = useToast();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Colar Texto do Extrato Bancário"
        >
            <div className="space-y-4 pt-2">
                <p className="text-sm text-slate-500 mb-2">Cole abaixo o texto copiado diretamente do seu extrato bancário (ex: Mercado Pago, Nubank). O sistema identificará automaticamente as transações.</p>
                <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    rows={10}
                    placeholder="Data  Descrição                       ID da operação             Valor          Saldo
19-04-2025
Transferência Pix recebida   
Pedro Ferreira                   108485590541               R$ 5,00        R$ 5,00"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500 custom-scrollbar resize-none"
                ></textarea>

                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={onClose} className="px-6 py-2 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900">Cancelar</button>
                    <button
                        onClick={() => {
                            if (pastedText.trim() === '') {
                                addToast('Cole algum texto para processar.', 'warning');
                                return;
                            }
                            onClose();
                            addToast('Analisando texto...', 'info');
                            setTimeout(() => {
                                onProcess(pastedText);
                                setPastedText('');
                            }, 100);
                        }}
                        className="px-8 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                    >
                        Processar Transações
                    </button>
                </div>
            </div>
        </Modal>
    );
};
