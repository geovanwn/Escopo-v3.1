import React from 'react';
import { CRMField, CRMSelect } from './CRMSharedComponents';

export const BankAccountForm = ({ formData, handleInputChange, setFormData }: any) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
                <CRMField label="Nome do Banco" name="bankName" required value={formData.bankName} onChange={handleInputChange} placeholder="Ex: Banco do Brasil" />
            </div>
            <CRMField label="Agência" name="agency" required value={formData.agency} onChange={handleInputChange} placeholder="0000-0" />
            <CRMField label="Conta" name="accountNumber" required value={formData.accountNumber} onChange={handleInputChange} placeholder="00000-0" />
            <CRMSelect label="Tipo de Conta" name="type" required value={formData.type} onChange={handleInputChange}>
                <option value="">Selecione...</option>
                <option value="corrente">Conta Corrente</option>
                <option value="poupanca">Conta Poupança</option>
                <option value="investimento">Conta Investimento</option>
            </CRMSelect>
            <CRMField label="Saldo Inicial (R$)" name="balance" type="number" step="0.01" required value={formData.balance} onChange={handleInputChange} />
            <div className="md:col-span-2 pt-2 border-t border-[var(--border-color)]">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Conta Contábil Relacionada (Banco Conta Movimento) *</label>
                <div className="space-y-2">
                    <input
                        name="accountingAccount"
                        value={formData.accountingAccount || ''}
                        readOnly
                        placeholder="Gerada automaticamente pelo sistema"
                        className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] cursor-not-allowed opacity-80"
                    />
                    <button
                        type="button"
                        className="w-full text-xs font-bold border-dashed border-2 p-2 rounded hover:border-green-500 hover:text-green-600 transition-colors text-gray-500"
                        onClick={() => {
                            const suffix = Math.floor(1000 + Math.random() * 9000);
                            setFormData((prev: any) => ({ ...prev, accountingAccount: `1.1.01.02.${suffix}` }));
                        }}
                    >
                        Gerar Conta Contábil
                    </button>
                </div>
            </div>
        </div>
    );
};
