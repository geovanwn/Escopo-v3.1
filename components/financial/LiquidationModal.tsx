import React from 'react';
import { Modal } from '../ui/Modal';
import { BankAccount } from '../../types';

interface LiquidationModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedInvoice: any;
    liquidationData: { bankAccountId: string; date: string; value: number };
    setLiquidationData: React.Dispatch<React.SetStateAction<{ bankAccountId: string; date: string; value: number }>>;
    bankAccounts: BankAccount[];
    onConfirm: () => void;
    currencyFormatter: (val: number) => string;
}

export const LiquidationModal: React.FC<LiquidationModalProps> = ({
    isOpen,
    onClose,
    selectedInvoice,
    liquidationData,
    setLiquidationData,
    bankAccounts,
    onConfirm,
    currencyFormatter
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Liquidar: ${selectedInvoice?.desc || 'Título'}`}
        >
            <div className="space-y-6 pt-2">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-slate-700 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-500 uppercase">Valor Original</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white">{selectedInvoice && currencyFormatter(selectedInvoice.value)}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] uppercase font-black text-slate-400 mb-1 block">Conta de Movimento</label>
                        <select
                            value={liquidationData.bankAccountId}
                            onChange={e => setLiquidationData(p => ({ ...p, bankAccountId: e.target.value }))}
                            className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">(Caixa Físico)</option>
                            {bankAccounts.map(b => (
                                <option key={b.id} value={b.id}>{b.bankName} (Final {b.accountNumber.slice(-4)})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-black text-slate-400 mb-1 block">Data do Pagamento</label>
                        <input
                            type="date"
                            value={liquidationData.date}
                            onChange={e => setLiquidationData(p => ({ ...p, date: e.target.value }))}
                            className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 mb-1 block">Valor Pago (R$)</label>
                    <input
                        type="number"
                        value={liquidationData.value}
                        onChange={e => setLiquidationData(p => ({ ...p, value: parseFloat(e.target.value) }))}
                        className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-lg font-black outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 italic">* Diferenças serão lançadas como Juros ou Descontos automaticamente.</p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 dark:border-slate-800">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900">Cancelar</button>
                    <button onClick={onConfirm} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                        Confirmar Liquidação
                    </button>
                </div>
            </div>
        </Modal>
    );
};
