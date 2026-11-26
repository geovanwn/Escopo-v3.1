import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Download, CheckCircle2, AlertTriangle, FileBarChart, RefreshCw } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export const GovernmentTables: React.FC = () => {
    const { addToast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);
    const [status, setStatus] = useState<'outdated' | 'updated'>('outdated');

    const handleUpdateIndices = () => {
        setIsUpdating(true);
        // Simulate download/update process
        setTimeout(() => {
            setIsUpdating(false);
            setStatus('updated');
            addToast('Índices e Tabelas do Governo atualizados com sucesso para a competência atual.', 'success');
        }, 2000);
    };

    const tables = [
        {
            id: 'fgts',
            name: 'Índices FGTS (TF - Tabela de Fator)',
            description: 'Necessário para cálculo de juros e multas de FGTS em atraso.',
        },
        {
            id: 'inss',
            name: 'Tabela INSS (Cálculo de Contribuição)',
            description: 'Faixas salariais e alíquotas para contribuição previdenciária.',
        },
        {
            id: 'selic',
            name: 'Tabela SELIC (Taxa Básica)',
            description: 'Utilizada para atualização monetária de tributos federais.',
        }
    ];

    const currentPeriod = new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });

    return (
        <Card className="mb-6 p-6 border-blue-100 bg-blue-50/30">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <FileBarChart className="text-blue-600" />
                        Central de Atualizações SEFIP 8.4
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Mantenha as Tabelas do Governo atualizadas para evitar erros de validação na CAIXA.
                    </p>
                </div>
                <Button 
                    onClick={handleUpdateIndices} 
                    disabled={isUpdating || status === 'updated'}
                    className={`${status === 'updated' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white shadow-md`}
                >
                    {isUpdating ? (
                        <><RefreshCw size={16} className="animate-spin" /> Atualizando...</>
                    ) : status === 'updated' ? (
                        <><CheckCircle2 size={16} /> Índices Atualizados</>
                    ) : (
                        <><Download size={16} /> Baixar Índices CAIXA</>
                    )}
                </Button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Tabelas do Governo</h3>
                </div>
                <div className="divide-y divide-slate-100">
                    {tables.map(table => (
                        <div key={table.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors">
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">{table.name}</h4>
                                <p className="text-xs text-slate-500">{table.description}</p>
                            </div>
                            <div className="flex items-center">
                                {status === 'updated' ? (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                        <CheckCircle2 size={12} className="mr-1" />
                                        Atualizado ({currentPeriod})
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                        <AlertTriangle size={12} className="mr-1" />
                                        Desatualizado (10/2023)
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
};
