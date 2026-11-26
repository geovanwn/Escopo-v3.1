import React from 'react';
import { Button } from '../../ui/Button';
import { Scissors, Calculator, Save } from 'lucide-react';

interface TerminationConfigProps {
    inputs: any;
    handleInputChange: (field: string, value: any) => void;
    onSimulate: () => void;
    onSave: () => void;
    canWrite: boolean;
}

export const TerminationConfig = ({ inputs, handleInputChange, onSimulate, onSave, canWrite }: TerminationConfigProps) => {
    return (
        <div className="space-y-6 xl:col-span-2">
            <div className="bg-red-50 p-5 rounded-xl border border-red-200 shadow-sm">
                <h3 className="text-sm font-bold text-red-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Scissors size={16} /> Configuração Rescisão
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="text-xs font-semibold text-red-700 mb-1 block">Média de Variáveis (R$)</label>
                        <input type="number" step="0.01" className="w-full p-2 text-sm border border-red-200 rounded-lg outline-none bg-white/50 focus:bg-white"
                            placeholder="0,00"
                            value={inputs.media_variaveis_valor || 0}
                            onChange={(e) => handleInputChange('media_variaveis_valor', Number(e.target.value))} />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-red-700 mb-1 block">Motivo</label>
                        <select className="w-full p-2.5 text-sm border border-red-200 rounded-lg outline-none bg-white"
                            value={inputs.rescisaoReason || 'sem_justa_causa'}
                            onChange={(e) => handleInputChange('rescisaoReason', e.target.value)}>
                            <option value="sem_justa_causa">Dispensa Sem Justa Causa</option>
                            <option value="pedido_demissao">Pedido de Demissão</option>
                            <option value="justa_causa">Justa Causa</option>
                            <option value="acordo">Acordo</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-red-700 mb-1 block">Aviso Prévio</label>
                        <select className="w-full p-2.5 text-sm border border-red-200 rounded-lg outline-none bg-white"
                            value={inputs.rescisaoNotice || 'indenizado'}
                            onChange={(e) => handleInputChange('rescisaoNotice', e.target.value)}>
                            <option value="trabalhado">Trabalhado</option>
                            <option value="indenizado">Indenizado</option>
                            <option value="nao_cumprido">Não Cumprido (Descontar)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-red-700 mb-1 block">Saldo Férias Vencidas (Dias)</label>
                        <input type="number" min="0" className="w-full p-2.5 text-sm border border-red-200 rounded-lg outline-none"
                            value={inputs.rescisaoVacationBalance}
                            onChange={(e) => handleInputChange('rescisaoVacationBalance', Number(e.target.value))} />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-red-700 mb-1 block">Data de Afastamento</label>
                        <input type="date" className="w-full p-2.5 text-sm border border-red-200 rounded-lg outline-none bg-white"
                            value={inputs.rescisaoDate || ''}
                            onChange={(e) => handleInputChange('rescisaoDate', e.target.value)} />
                    </div>
                </div>
                <div className="mt-4">
                    <div className="w-1/2 pr-2">
                        <label className="text-xs font-semibold text-red-700 mb-1 block">Cód. Afastamento (TRCT)</label>
                        <input type="text" className="w-full p-2.5 text-sm border border-red-200 rounded-lg outline-none uppercase"
                            placeholder="EX: SJ2"
                            value={inputs.rescisaoAfastamentoCode || ''}
                            onChange={(e) => handleInputChange('rescisaoAfastamentoCode', e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button onClick={onSimulate} icon={Calculator} className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-100">Calcular Rescisão</Button>
                <Button onClick={onSave} icon={Save} className="bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canWrite}>Salvar Rescisão</Button>
            </div>
        </div>
    );
};
