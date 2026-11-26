import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { RefreshCw, ShieldCheck, Info } from 'lucide-react';

interface SefazCloudFetchModalProps {
    isOpen: boolean;
    onClose: () => void;
    isCloudFetching: boolean;
    onFetch: () => void;
    companyName?: string;
}

export const SefazCloudFetchModal: React.FC<SefazCloudFetchModalProps> = ({
    isOpen,
    onClose,
    isCloudFetching,
    onFetch,
    companyName
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={() => !isCloudFetching && onClose()}
            title="Busca Automática SEFAZ"
        >
            <div className="p-6 text-center">
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isCloudFetching ? 'bg-blue-50 text-blue-600 animate-spin' : 'bg-emerald-50 text-emerald-600'} `}>
                    {isCloudFetching ? <RefreshCw size={32} /> : <ShieldCheck size={32} />}
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2">Conexão via Certificado Digital</h3>
                <p className="text-sm text-slate-500 mb-6 font-medium">
                    O sistema irá consultar o Ambiente Nacional da SEFAZ utilizando o certificado digital A1/A3 configurado para a empresa <strong>{companyName || 'Selecionada'}</strong>.
                </p>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-left mb-6">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Parâmetros de Busca</p>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Última consulta:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">Hoje, 09:45</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Documentos Identificados:</span>
                            <span className="font-bold text-blue-600">12 pendentes</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={onClose}
                        disabled={isCloudFetching}
                    >
                        Cancelar
                    </Button>
                    <Button
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={onFetch}
                        loading={isCloudFetching}
                    >
                        {isCloudFetching ? 'Consultando...' : 'Iniciar Sincronização'}
                    </Button>
                </div>

                <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase italic flex items-center gap-1 justify-center">
                    <Info size={10} /> Sincronização via API de Distribuição de DF-e
                </p>
            </div>
        </Modal>
    );
};
