import React from 'react';
import { Button } from '../../ui/Button';
import { DollarSign, Calculator, Save } from 'lucide-react';

interface ThirteenthConfigProps {
    inputs: any;
    handleInputChange: (field: string, value: any) => void;
    onSimulate: () => void;
    onSave: () => void;
    canWrite: boolean;
}

export const ThirteenthConfig = ({ inputs, handleInputChange, onSimulate, onSave, canWrite }: ThirteenthConfigProps) => {
    return (
        <div className="space-y-6 xl:col-span-2">
            <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 shadow-sm">
                <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <DollarSign size={16} /> Configuração 13º Salário
                </h3>
                <div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="d13" className="text-amber-600 focus:ring-amber-500"
                            checked={inputs.decimoTerceiroParcela === '1'}
                            onChange={() => handleInputChange('decimoTerceiroParcela', '1')} />
                        <span className="text-sm font-medium text-amber-900">1ª Parcela (Adiantamento)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="d13" className="text-amber-600 focus:ring-amber-500"
                            checked={inputs.decimoTerceiroParcela === '2'}
                            onChange={() => handleInputChange('decimoTerceiroParcela', '2')} />
                        <span className="text-sm font-medium text-amber-900">2ª Parcela (Final)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="d13" className="text-amber-600 focus:ring-amber-500"
                            checked={inputs.decimoTerceiroParcela === 'unica'}
                            onChange={() => handleInputChange('decimoTerceiroParcela', 'unica')} />
                        <span className="text-sm font-medium text-amber-900">Parcela Única</span>
                    </label>
                </div>
                <div className="mt-4 pt-4 border-t border-amber-100">
                    <label className="text-xs font-semibold text-amber-800 mb-1 block">Média de Variáveis (R$)</label>
                    <input type="number" step="0.01" className="w-full p-2 text-sm border border-amber-200 rounded-lg outline-none bg-white/50 focus:bg-white"
                        placeholder="0,00"
                        value={inputs.media_variaveis_valor || 0}
                        onChange={(e) => handleInputChange('media_variaveis_valor', Number(e.target.value))} />
                    <p className="text-[10px] text-amber-600 mt-1">Soma das médias de H.E., Comissões, Adicionais, etc.</p>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button onClick={onSimulate} icon={Calculator} className="bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100">Calcular 13º</Button>
                <Button onClick={onSave} icon={Save} className="bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canWrite}>Salvar 13º</Button>
            </div>
        </div>
    );
};
