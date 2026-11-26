import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Search, FileCode, Plus, Info } from 'lucide-react';

interface ProductSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemSearch: string;
    setItemSearch: (val: string) => void;
    tipoNota: 'entry' | 'exit' | 'service' | 'receipt';
    setTipoNota: (tipo: 'entry' | 'exit' | 'service' | 'receipt') => void;
    itemOptions: any[];
    onAddItem: (id: string) => void;
}

export const ProductSearchModal: React.FC<ProductSearchModalProps> = ({
    isOpen,
    onClose,
    itemSearch,
    setItemSearch,
    tipoNota,
    setTipoNota,
    itemOptions,
    onAddItem
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Buscar Produto ou Serviço"
            maxWidth="max-w-4xl"
        >
            <div className="p-4 space-y-6">
                {/* Search Header */}
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 group w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Busque por nome, SKU, NCM ou código..."
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 placeholder:text-slate-300 outline-none transition-all shadow-sm"
                            autoFocus
                            value={itemSearch}
                            onChange={(e) => setItemSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl shrink-0">
                        <button
                            type="button"
                            onClick={() => setTipoNota('exit')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tipoNota !== 'service' ? 'bg-white shadow-md text-green-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Produtos
                        </button>
                        <button
                            type="button"
                            onClick={() => setTipoNota('service')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tipoNota === 'service' ? 'bg-white shadow-md text-green-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Serviços
                        </button>
                    </div>
                </div>

                {/* Results Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar p-1">
                    {itemOptions.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                                onAddItem(item.id);
                                onClose();
                            }}
                            className="flex gap-4 p-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[2rem] hover:border-green-500 hover:shadow-2xl hover:shadow-green-500/10 transition-all text-left group relative overflow-hidden"
                        >
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-green-50 transition-colors border border-slate-100 dark:border-slate-700">
                                <FileCode className="text-slate-300 group-hover:text-green-500" size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[9px] font-black text-slate-300 uppercase font-mono tracking-widest truncate">{item.code || 'S/ SKU'}</span>
                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[8px] font-black text-slate-500 tracking-tighter uppercase whitespace-nowrap">{item.unit || 'UN'}</span>
                                </div>
                                <h5 className="text-sm font-black text-slate-800 mb-2 line-clamp-1 group-hover:text-green-700 transition-colors uppercase tracking-tight">{item.name}</h5>
                                <div className="flex items-baseline gap-2 pt-2 border-t border-slate-50">
                                    <span className="text-lg font-black text-green-600">
                                        {item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Preço Unitário</span>
                                </div>
                            </div>
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                <div className="p-2 bg-green-600 text-white rounded-full shadow-lg">
                                    <Plus size={16} />
                                </div>
                            </div>
                        </button>
                    ))}

                    {itemOptions.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-700">
                            <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center justify-center mx-auto mb-6">
                                <Search size={40} className="text-slate-200" />
                            </div>
                            <h4 className="text-lg font-black text-slate-800 mb-2">Nenhum resultado encontrado</h4>
                            <p className="text-sm font-medium text-slate-400 mb-8 max-w-xs mx-auto">Não encontramos nada para "{itemSearch}". Tente outro termo ou adicione manualmente.</p>
                            <Button
                                type="button"
                                onClick={() => { onAddItem('manual'); onClose(); }}
                                variant="outline"
                                className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white rounded-xl px-8 h-12 font-black text-xs uppercase tracking-widest"
                            >
                                Adicionar Item Avulso (Processamento)
                            </Button>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <span>Resultados: {itemOptions.length}</span>
                    <div className="flex items-center gap-2">
                        <Info size={12} />
                        <span>Os itens selecionados serão adicionados à lista principal</span>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
