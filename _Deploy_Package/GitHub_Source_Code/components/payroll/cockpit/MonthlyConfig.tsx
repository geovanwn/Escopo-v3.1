import React from 'react';
import { Button } from '../../ui/Button';
import { Calendar, Calculator, DollarSign, Scissors, Save } from 'lucide-react';

interface MonthlyConfigProps {
    inputs: any;
    selectedPerson: any;
    handleInputChange: (field: string, value: any) => void;
    onSimulate: () => void;
    onSave: () => void;
    canWrite: boolean;
}

export const MonthlyConfig = ({ inputs, selectedPerson, handleInputChange, onSimulate, onSave, canWrite }: MonthlyConfigProps) => {
    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:col-span-2">
            {selectedPerson.type === 'employee' ? (
                <>
                    {(inputs.selectedRubrics?.includes('2001') || inputs.selectedRubrics?.includes('2002')) && (
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <Calendar size={16} className="text-orange-500" /> Jornada & Frequência
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {inputs.selectedRubrics?.includes('2001') && (
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Faltas (Dias)</label>
                                        <input type="number" min="0" className="w-full p-2.5 text-sm border border-gray-200 rounded-lg outline-none" value={inputs.faltas_dias} onChange={e => handleInputChange('faltas_dias', Number(e.target.value))} />
                                    </div>
                                )}
                                {inputs.selectedRubrics?.includes('2002') && (
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Atrasos (Min)</label>
                                        <input type="number" min="0" className="w-full p-2.5 text-sm border border-gray-200 rounded-lg outline-none" value={inputs.atrasos_mins} onChange={e => handleInputChange('atrasos_mins', Number(e.target.value))} />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {(inputs.selectedRubrics?.includes('1004') || inputs.selectedRubrics?.includes('1005')) && (
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <Calculator size={16} className="text-blue-500" /> Horas Extras
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {inputs.selectedRubrics?.includes('1004') && (
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">H.E. 50% (Qtd)</label>
                                        <input type="number" min="0" className="w-full p-2.5 text-sm border border-gray-200 rounded-lg outline-none" value={inputs.he50_qtde} onChange={e => handleInputChange('he50_qtde', Number(e.target.value))} />
                                    </div>
                                )}
                                {inputs.selectedRubrics?.includes('1005') && (
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">H.E. 100% (Qtd)</label>
                                        <input type="number" min="0" className="w-full p-2.5 text-sm border border-gray-200 rounded-lg outline-none" value={inputs.he100_qtde} onChange={e => handleInputChange('he100_qtde', Number(e.target.value))} />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {(inputs.selectedRubrics?.includes('1003') || inputs.selectedRubrics?.includes('1010')) && (
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <DollarSign size={16} className="text-green-500" /> Variáveis
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {inputs.selectedRubrics?.includes('1003') && (
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Comissões (R$)</label>
                                        <input type="number" min="0" step="0.01" className="w-full p-2.5 text-sm border border-gray-200 rounded-lg outline-none" value={inputs.comissao_valor} onChange={e => handleInputChange('comissao_valor', Number(e.target.value))} />
                                    </div>
                                )}
                                {inputs.selectedRubrics?.includes('1010') && (
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Bônus / Grat. (R$)</label>
                                        <input type="number" min="0" step="0.01" className="w-full p-2.5 text-sm border border-gray-200 rounded-lg outline-none" value={inputs.bonus_valor} onChange={e => handleInputChange('bonus_valor', Number(e.target.value))} />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {(inputs.selectedRubrics?.includes('1701') || inputs.selectedRubrics?.includes('5201') || inputs.selectedRubrics?.includes('5202') || inputs.selectedRubrics?.includes('2011')) && (
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <Scissors size={16} className="text-red-500" /> Adicionais & Descontos
                            </h3>
                            <div className="space-y-3">
                                {inputs.selectedRubrics?.includes('1701') && (
                                    <label className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-100 transition-all">
                                        <input type="checkbox" className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500" checked={inputs.adicional_periculosidade} onChange={e => handleInputChange('adicional_periculosidade', e.target.checked)} />
                                        <span className="text-sm font-medium text-gray-700">Adicional Periculosidade (30%)</span>
                                    </label>
                                )}
                                <div className="h-px bg-gray-100"></div>
                                <div className="grid grid-cols-2 gap-4">
                                    {inputs.selectedRubrics?.includes('5202') && (
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 mb-1 block">Plano de Saúde (Desc.)</label>
                                            <input type="number" min="0" step="0.01" className="w-full p-2.5 text-sm border border-gray-200 rounded-lg outline-none" value={inputs.desc_plano_saude} onChange={e => handleInputChange('desc_plano_saude', Number(e.target.value))} />
                                        </div>
                                    )}
                                    {inputs.selectedRubrics?.includes('2011') && (
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 mb-1 block">Outros Descontos</label>
                                            <input type="number" min="0" step="0.01" className="w-full p-2.5 text-sm border border-gray-200 rounded-lg outline-none" value={inputs.desc_outros} onChange={e => handleInputChange('desc_outros', Number(e.target.value))} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm xl:col-span-2">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <DollarSign size={16} className="text-green-500" /> Definição de Pró-Labore
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1 block">Valor Pró-Labore</label>
                            <input type="number" min="0" step="0.01" className="w-full p-3 text-sm border border-gray-200 rounded-lg font-bold text-gray-800 outline-none" value={inputs.proLaboreOverride} onChange={e => handleInputChange('proLaboreOverride', Number(e.target.value))} />
                            <p className="text-[10px] text-gray-400 mt-1">Valor padrão conforme contrato social ou ajuste mensal.</p>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1 block">Bônus / Gratificação</label>
                            <input type="number" min="0" step="0.01" className="w-full p-3 text-sm border border-gray-200 rounded-lg outline-none" value={inputs.bonus_valor} onChange={e => handleInputChange('bonus_valor', Number(e.target.value))} />
                        </div>
                    </div>
                </div>
            )}

            <div className="xl:col-span-2 flex justify-end gap-3 pt-4 pb-8">
                <Button onClick={onSimulate} icon={Calculator} className="bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 px-6 py-3 h-auto text-base shadow-sm">
                    Calcular Folha
                </Button>
                <Button id="save-btn" onClick={onSave} icon={Save} className="bg-gray-900 text-white hover:bg-gray-800 shadow-xl shadow-gray-900/10 px-8 py-3 h-auto text-base disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canWrite}>
                    Salvar Folha
                </Button>
            </div>
        </div>
    );
};
