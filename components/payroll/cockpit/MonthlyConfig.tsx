import React from 'react';
import { Calendar, Calculator, DollarSign, Scissors, AlertTriangle, Clock, HeartHandshake, Shield } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';

interface MonthlyConfigProps {
    inputs: any;
    selectedPerson: any;
    handleInputChange: (field: string, value: any) => void;
    onSimulate: () => void;
    onSave: () => void;
    canWrite: boolean;
}

export const MonthlyConfig: React.FC<MonthlyConfigProps> = ({
    inputs,
    selectedPerson,
    handleInputChange,
    onSimulate,
    canWrite
}) => {
    const isEmployee = selectedPerson.type === 'employee';

    return (
        <div className="space-y-4">
            {/* Folha Zerada Banner */}
            <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 p-4 rounded-2xl flex items-center justify-between group hover:border-sky-300 dark:hover:border-sky-700 transition-all">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl transition-all ${
                        inputs.isZeroed ? 'bg-amber-100 text-amber-600 rotate-3' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                    }`}>
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">
                            Folha Sem Movimento (Zerada)
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium">
                            Ative caso o colaborador não possua proventos a declarar neste mês.
                        </p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={inputs.isZeroed || false}
                        onChange={e => handleInputChange('isZeroed', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
            </div>

            {/* SE SÓCIO: Pró-labore Override */}
            {!isEmployee && (
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-wider">
                        <DollarSign size={16} /> Pró-Labore da Competência
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                            Valor Bruto do Pró-Labore (R$)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-extrabold text-emerald-600 dark:text-emerald-400 outline-none focus:border-sky-500"
                                value={inputs.proLaboreOverride || selectedPerson.proLaboreValue || 1518}
                                onChange={e => handleInputChange('proLaboreOverride', parseFloat(e.target.value) || 0)}
                            />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                            Retenção padrão: 11% de INSS para sócios e apuração de IRRF na fonte.
                        </p>
                    </div>
                </div>
            )}

            {/* SE FUNCIONÁRIO CLT */}
            {isEmployee && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card 1: Horas Extras */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-black text-xs uppercase tracking-wider">
                            <Calculator size={16} /> Horas Extras & DSR
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                    H.E. 50% (Horas)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    className="w-full px-3 py-2 text-xs font-extrabold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-sky-500"
                                    placeholder="0"
                                    value={inputs.he50_qtde || ''}
                                    onChange={e => handleInputChange('he50_qtde', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                    H.E. 100% (Horas)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    className="w-full px-3 py-2 text-xs font-extrabold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-sky-500"
                                    placeholder="0"
                                    value={inputs.he100_qtde || ''}
                                    onChange={e => handleInputChange('he100_qtde', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400">
                            O cálculo inclui automaticamente o reflexo de DSR (Descanso Semanal Remunerado).
                        </p>
                    </div>

                    {/* Card 2: Frequência, Faltas e Atrasos */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-wider">
                            <Clock size={16} /> Frequência & Ausências
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                    Faltas Injustificadas (Dias)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="30"
                                    className="w-full px-3 py-2 text-xs font-extrabold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-sky-500"
                                    placeholder="0"
                                    value={inputs.faltas_dias || ''}
                                    onChange={e => handleInputChange('faltas_dias', parseInt(e.target.value, 10) || 0)}
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                    Atrasos (Minutos)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="5"
                                    className="w-full px-3 py-2 text-xs font-extrabold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-sky-500"
                                    placeholder="0"
                                    value={inputs.atrasos_mins || ''}
                                    onChange={e => handleInputChange('atrasos_mins', parseInt(e.target.value, 10) || 0)}
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400">
                            Faltas injustificadas reduzem proporcionalmente o DSR semanal da competência.
                        </p>
                    </div>

                    {/* Card 3: Variáveis (Comissões & Bônus) */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-wider">
                            <DollarSign size={16} /> Comissões & Premiações
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                    Comissões (R$)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="w-full px-3 py-2 text-xs font-extrabold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-sky-500"
                                    placeholder="0,00"
                                    value={inputs.comissao_valor || ''}
                                    onChange={e => handleInputChange('comissao_valor', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                    Bônus / Gratificação (R$)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="w-full px-3 py-2 text-xs font-extrabold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-sky-500"
                                    placeholder="0,00"
                                    value={inputs.bonus_valor || ''}
                                    onChange={e => handleInputChange('bonus_valor', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Card 4: Adicionais Legais */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-wider">
                            <Shield size={16} /> Adicionais Trabalhistas
                        </div>
                        <div className="space-y-2.5">
                            <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Periculosidade (+30% sobre base)
                                </span>
                                <input
                                    type="checkbox"
                                    checked={inputs.adicional_periculosidade || false}
                                    onChange={e => handleInputChange('adicional_periculosidade', e.target.checked)}
                                    className="w-4 h-4 accent-sky-600 rounded"
                                />
                            </label>

                            <div>
                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                    Insalubridade (% Salário Mínimo)
                                </label>
                                <select
                                    value={inputs.adicional_insalubridade || 'nenhum'}
                                    onChange={e => handleInputChange('adicional_insalubridade', e.target.value)}
                                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-sky-500 cursor-pointer"
                                >
                                    <option value="nenhum">Nenhum (0%)</option>
                                    <option value="minimo">Grau Mínimo (10% - R$ 151,80)</option>
                                    <option value="medio">Grau Médio (20% - R$ 303,60)</option>
                                    <option value="maximo">Grau Máximo (40% - R$ 607,20)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Card 5: Descontos & Benefícios */}
                    <div className="md:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-wider">
                            <Scissors size={16} /> Benefícios, Adiantamentos & Outros Descontos
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* VT */}
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-800 dark:text-white">Vale Transporte</span>
                                    <input
                                        type="checkbox"
                                        checked={inputs.desc_vt || false}
                                        onChange={e => handleInputChange('desc_vt', e.target.checked)}
                                        className="w-4 h-4 accent-sky-600 rounded"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400">
                                    Desconto de até 6% da remuneração base do empregado.
                                </p>
                            </div>

                            {/* Adiantamento Salarial */}
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                                <span className="text-xs font-bold text-slate-800 dark:text-white block mb-1">
                                    Adiantamento Salarial (R$)
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="w-full px-3 py-1.5 text-xs font-extrabold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-sky-500"
                                    placeholder="0,00"
                                    value={inputs.desc_adiantamento || ''}
                                    onChange={e => handleInputChange('desc_adiantamento', parseFloat(e.target.value) || 0)}
                                />
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Valor adiantado (ex: vale no dia 20).
                                </p>
                            </div>

                            {/* Plano de Saúde */}
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                                <span className="text-xs font-bold text-slate-800 dark:text-white block mb-1">
                                    Plano de Saúde (R$)
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="w-full px-3 py-1.5 text-xs font-extrabold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-sky-500"
                                    placeholder="0,00"
                                    value={inputs.desc_plano_saude || ''}
                                    onChange={e => handleInputChange('desc_plano_saude', parseFloat(e.target.value) || 0)}
                                />
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Coparticipação ou mensalidade.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
