import React from 'react';
import { Button } from '../../ui/Button';
import { Calendar, Calculator, Save } from 'lucide-react';

interface VacationConfigProps {
    inputs: any;
    handleInputChange: (field: string, value: any) => void;
    onSimulate: () => void;
    onSave: () => void;
    canWrite: boolean;
}

export const VacationConfig = ({ inputs, handleInputChange, onSimulate, onSave, canWrite }: VacationConfigProps) => {
    return (
        <div className="space-y-6 xl:col-span-2">
            <div className="bg-blue-50 p-5 rounded-xl border border-blue-200 shadow-sm">
                <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Calendar size={16} /> Configuração Férias
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-semibold text-blue-700 mb-1 block">Dias de Gozo</label>
                        <input type="number" min="1" max="30" className="w-full p-2.5 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                            value={inputs.feriasDias || 30}
                            onChange={(e) => handleInputChange('feriasDias', Number(e.target.value))} />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-blue-700 mb-1 block">Data Início</label>
                        <input type="date" className="w-full p-2.5 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                            value={inputs.vacationStart || ''}
                            onChange={(e) => handleInputChange('vacationStart', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs font-semibold text-blue-700 mb-1 block">Média de Variáveis (R$)</label>
                        <input type="number" step="0.01" className="w-full p-2.5 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                            placeholder="0,00"
                            value={inputs.media_variaveis_valor || 0}
                            onChange={(e) => handleInputChange('media_variaveis_valor', Number(e.target.value))} />
                    </div>
                    <div className="flex items-center">
                        <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-blue-100 rounded transition-colors w-full">
                            <input type="checkbox" className="text-blue-600 rounded focus:ring-blue-500"
                                checked={inputs.feriasAbono || false}
                                onChange={(e) => handleInputChange('feriasAbono', e.target.checked)} />
                            <span className="text-sm font-medium text-blue-900">Abono Pecuniário (Vender 10 dias)</span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button onClick={onSimulate} icon={Calculator} className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">Calcular Férias</Button>
                <Button onClick={onSave} icon={Save} className="bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canWrite}>Salvar Férias</Button>
            </div>
        </div>
    );
};
