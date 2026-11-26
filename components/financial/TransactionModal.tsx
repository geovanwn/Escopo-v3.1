import React from 'react';
import { Modal } from '../ui/Modal';
import { OperationType } from '../../types';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactionData: {
        type: 'entry' | 'exit';
        description: string;
        category: string;
        value: number;
        date: string;
        status: 'pendente' | 'paga';
        costCenter: string;
        naturezaOperacao: string;
    };
    setTransactionData: React.Dispatch<React.SetStateAction<any>>;
    operationTypes: OperationType[];
    onConfirm: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
    isOpen,
    onClose,
    transactionData,
    setTransactionData,
    operationTypes,
    onConfirm
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={transactionData.type === 'exit' ? 'Nova Entrada (Receita)' : 'Nova Saída (Despesa)'}
        >
            <div className="space-y-4 pt-2">
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
                    <button
                        onClick={() => setTransactionData((p: any) => ({ ...p, type: 'exit' }))}
                        className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${transactionData.type === 'exit' ? 'bg-white shadow text-emerald-600' : 'text-slate-400'
                            }`}
                    >
                        Entrada
                    </button>
                    <button
                        onClick={() => setTransactionData((p: any) => ({ ...p, type: 'entry' }))}
                        className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${transactionData.type === 'entry' ? 'bg-white shadow text-red-600' : 'text-slate-400'
                            }`}
                    >
                        Saída
                    </button>
                </div>

                <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Descrição</label>
                    <input
                        value={transactionData.description}
                        onChange={e => setTransactionData((p: any) => ({ ...p, description: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Ex: Aluguel, Venda de Balcão..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400">Categoria</label>
                        <select
                            value={transactionData.category}
                            onChange={e => setTransactionData((p: any) => ({ ...p, category: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none"
                        >
                            <option value="">Selecione...</option>
                            {transactionData.type === 'exit' ? (
                                <>
                                    <option value="Vendas">Vendas</option>
                                    <option value="Serviços">Prestação de Serviços</option>
                                    <option value="Rendimentos">Rendimentos / Juros</option>
                                    <option value="Recebimentos">Recebimentos Pendentes</option>
                                    <option value="Outros">Outras Entradas</option>
                                </>
                            ) : (
                                <>
                                    <option value="Salarios">Salários / Pró-Labore</option>
                                    <option value="Contas Fixas">Contas Fixas (Água/Luz/Net)</option>
                                    <option value="Aluguel">Aluguel</option>
                                    <option value="Compras">Compras / Despesas Diárias</option>
                                    <option value="Dividas">Pagamento de Dívidas</option>
                                    <option value="Impostos">Impostos e Taxas</option>
                                    <option value="Outros">Outras Saídas</option>
                                </>
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400">Centro de Custo (Rec. 9)</label>
                        <select
                            value={transactionData.costCenter}
                            onChange={e => setTransactionData((p: any) => ({ ...p, costCenter: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none"
                        >
                            <option value="">Geral</option>
                            <option value="ADM">Administrativo</option>
                            <option value="COM">Comercial</option>
                            <option value="OP">Operacional / Produção</option>
                            <option value="MKT">Marketing</option>
                            <option value="TI">Tecnologia</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Natureza da Operação</label>
                    <input
                        value={transactionData.naturezaOperacao}
                        list="naturezas-financial-list"
                        onChange={e => setTransactionData((p: any) => ({ ...p, naturezaOperacao: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Ex: Venda, Serviço, Pagamento de Aluguel..."
                    />
                    <datalist id="naturezas-financial-list">
                        {(operationTypes || []).map(ot => (
                            <option key={ot.id} value={ot.name}>{ot.name}</option>
                        ))}
                    </datalist>
                </div>

                <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Valor (R$)</label>
                    <input
                        type="number"
                        value={transactionData.value}
                        onChange={e => setTransactionData((p: any) => ({ ...p, value: parseFloat(e.target.value) }))}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Data de Competência</label>
                    <input
                        type="date"
                        value={transactionData.date}
                        onChange={e => setTransactionData((p: any) => ({ ...p, date: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none"
                    />
                </div>
                <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Status</label>
                    <select
                        value={transactionData.status}
                        onChange={e => setTransactionData((p: any) => ({ ...p, status: e.target.value as any }))}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none"
                    >
                        <option value="pendente">Pendente (Agendar)</option>
                        <option value="paga">Realizado (Já Pago)</option>
                    </select>
                </div>
            </div>

            <button
                onClick={onConfirm}
                className="w-full py-3 mt-4 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
                Confirmar Lançamento
            </button>
        </Modal>
    );
};
