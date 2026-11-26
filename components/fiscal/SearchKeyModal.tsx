import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FileCode, FileText, Loader2, Play } from 'lucide-react';

interface SearchKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    nfeKey: string;
    setNfeKey: (key: string) => void;
    isSearchingKey: boolean;
    onSearch: () => void;
}

export const SearchKeyModal: React.FC<SearchKeyModalProps> = ({
    isOpen,
    onClose,
    nfeKey,
    setNfeKey,
    isSearchingKey,
    onSearch
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Buscar NF-e por Chave"
            maxWidth="max-w-xl"
        >
            <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex gap-3">
                    <FileCode className="text-blue-600 shrink-0" size={20} />
                    <p className="text-xs text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
                        Informe a chave de acesso de 44 dígitos da NF-e para busca direta na SEFAZ e importação automática para o seu lançamento.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                            Chave de Acesso (44 dígitos)
                            <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                            <input
                                type="text"
                                maxLength={54} // With spaces/formatting if mask applied
                                placeholder="0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000"
                                className="w-full pl-12 pr-4 py-3 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl font-mono text-sm tracking-wider focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all"
                                value={nfeKey}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').substring(0, 44);
                                    // Formatar com espaços para melhor leitura
                                    const formatted = val.replace(/(.{4})/g, '$1 ').trim();
                                    setNfeKey(formatted);
                                }}
                            />
                        </div>
                        <span className="text-[10px] text-[var(--text-secondary)] mt-1.5 font-bold uppercase tracking-widest">
                            Digite {nfeKey.replace(/\D/g, '').length}/44 números
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-color)]">
                        <Button
                            variant="outline"
                            className="w-full rounded-xl"
                            onClick={onClose}
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="w-full rounded-xl shadow-lg shadow-green-500/20"
                            icon={isSearchingKey ? Loader2 : Play}
                            onClick={onSearch}
                            disabled={isSearchingKey || nfeKey.replace(/\D/g, '').length !== 44}
                        >
                            {isSearchingKey ? 'Buscando...' : 'Buscar e Importar'}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
