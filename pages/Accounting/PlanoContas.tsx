import React, { useMemo, useState, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { ArrowLeft, FileText, Search, Plus, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportElementToPdf } from '../../utils/exportPdf';
import { getChartOfAccounts, saveCustomAccount, AccountPlanItem } from '../../utils/accountingEngine';

export const PlanoContas: React.FC = () => {
    const { selectedCompany } = useData();
    const navigate = useNavigate();
    const reportRef = useRef<HTMLDivElement>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        type: 'ativo' as AccountPlanItem['type'],
        nature: 'debt' as AccountPlanItem['nature'],
        parentCode: ''
    });

    const [triggerRecalculate, setTriggerRecalculate] = useState(0);

    const chartOfAccounts = useMemo(() => {
        return getChartOfAccounts(selectedCompany?.id || '');
    }, [selectedCompany, triggerRecalculate]);

    const filteredAccounts = useMemo(() => {
        if (!searchTerm) return chartOfAccounts;
        const lowerSearch = searchTerm.toLowerCase();
        return chartOfAccounts.filter(a => 
            a.name.toLowerCase().includes(lowerSearch) || 
            a.code.includes(lowerSearch)
        );
    }, [searchTerm, chartOfAccounts]);

    const handleSaveAccount = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCompany) return;

        if (!formData.code || !formData.name) {
            alert('Por favor, informe o código e o nome da conta.');
            return;
        }

        const isAnalytic = true; // Manual accounts are always analytic
        const level = formData.code.split('.').length;

        const newAccount: AccountPlanItem = {
            code: formData.code,
            name: formData.name.toUpperCase(),
            type: formData.type,
            nature: formData.nature,
            level,
            parentCode: formData.parentCode || undefined,
            isAnalytic
        };

        saveCustomAccount(selectedCompany.id, newAccount);
        alert('Conta contábil criada com sucesso!');
        setTriggerRecalculate(prev => prev + 1);
        setIsAddModalOpen(false);

        // Reset Form
        setFormData({
            code: '',
            name: '',
            type: 'ativo',
            nature: 'debt',
            parentCode: ''
        });
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/app/accounting')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0">
                        <ArrowLeft size={24} className="text-slate-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Plano de Contas</h1>
                        <p className="text-sm text-slate-500">Estrutura de contas contábeis, níveis e naturezas de saldo</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm w-60">
                        <Search size={16} className="text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="bg-transparent text-xs font-semibold outline-none text-slate-700 dark:text-slate-300 w-full"
                        />
                    </div>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-gradient-to-r from-[#0ea5e9] to-[#10b981] text-white hover:opacity-95 font-black flex items-center gap-1.5 rounded-full px-5 py-2.5 shadow-md shadow-cyan-500/10 text-xs uppercase hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <Plus size={14} /> Nova Conta
                    </button>
                    <button 
                        onClick={() => exportElementToPdf(reportRef.current, 'PlanoContas', selectedCompany)} 
                        className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        <FileText size={14} /> Exportar PDF
                    </button>
                </div>
            </div>

            <Card ref={reportRef} className="p-0 overflow-hidden border-none shadow-xl shadow-slate-200/40 dark:shadow-none bg-white dark:bg-slate-900 rounded-[2rem]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                            <th className="p-4 font-semibold text-xs">Código</th>
                            <th className="p-4 font-semibold text-xs w-16 text-center">Nível</th>
                            <th className="p-4 font-semibold text-xs">Descrição da Conta</th>
                            <th className="p-4 font-semibold text-xs w-28">Grupo</th>
                            <th className="p-4 font-semibold text-xs w-28">Natureza</th>
                            <th className="p-4 font-semibold text-xs text-center w-24">Tipo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {filteredAccounts.map((acc) => (
                            <tr key={acc.code} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${acc.level === 1 ? 'bg-slate-100/50 dark:bg-slate-800/30 font-bold' : ''}`}>
                                <td className="p-4 font-mono text-xs text-slate-700 dark:text-slate-300 font-semibold">{acc.code}</td>
                                <td className="p-4 text-xs text-slate-500 font-mono text-center">{acc.level}</td>
                                <td className={`p-4 text-xs ${acc.isAnalytic ? 'text-slate-600 dark:text-slate-300 font-medium' : 'text-slate-950 dark:text-white font-bold'}`} style={{ paddingLeft: `${acc.level * 1.5}rem` }}>
                                    {acc.name}
                                </td>
                                <td className="p-4">
                                    <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400 uppercase text-[9px] font-black">
                                        {acc.type}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${acc.nature === 'debt' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'}`}>
                                        {acc.nature === 'debt' ? 'Devedora' : 'Credora'}
                                    </span>
                                </td>
                                <td className="p-4 text-center">
                                    {acc.isAnalytic ? (
                                        <span className="inline-block px-2 py-0.5 bg-emerald-150 text-emerald-700 rounded-full font-bold text-[9px] uppercase" title="Aceita lançamentos diretos">Lançamento</span>
                                    ) : (
                                        <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full font-bold text-[9px] uppercase" title="Sintética: Totaliza subcontas">Sintética</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredAccounts.length === 0 && (
                    <div className="p-16 text-center text-slate-400 text-sm">
                        Nenhuma conta encontrada correspondente aos critérios de busca.
                    </div>
                )}
            </Card>

            {/* MODAL FOR NEW ACCOUNT */}
            {isAddModalOpen && (
                <Modal 
                    isOpen={isAddModalOpen} 
                    onClose={() => setIsAddModalOpen(false)} 
                    title="Adicionar Conta no Plano de Contas"
                    maxWidth="max-w-md"
                >
                    <form onSubmit={handleSaveAccount} className="space-y-5 animate-in fade-in duration-300">
                        {/* Parent account alert */}
                        <div className="bg-cyan-50 dark:bg-cyan-950/20 text-cyan-700 dark:text-cyan-400 p-4 rounded-2xl border border-cyan-100 dark:border-cyan-900/30 flex gap-2">
                            <Info size={16} className="shrink-0 mt-0.5" />
                            <div className="text-[10px] leading-relaxed">
                                Crie subcontas contábeis respeitando a estrutura do grupo. Exemplo: Para criar uma subconta de Bancos, use o prefixo <span className="font-bold">1.1.01.</span> seguido do próximo índice (Ex: <span className="font-bold">1.1.01.03</span>).
                            </div>
                        </div>

                        {/* Code */}
                        <div className="relative">
                            <label className="absolute -top-2 left-3 bg-white dark:bg-[var(--bg-card)] px-1 text-[10px] font-black uppercase text-slate-400">Classificação / Código</label>
                            <input 
                                type="text"
                                required
                                value={formData.code}
                                onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                                placeholder="Ex: 1.1.01.03"
                                className="w-full p-3 rounded-full border border-slate-200 dark:border-slate-700 bg-transparent text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-cyan-500"
                            />
                        </div>

                        {/* Name */}
                        <div className="relative">
                            <label className="absolute -top-2 left-3 bg-white dark:bg-[var(--bg-card)] px-1 text-[10px] font-black uppercase text-slate-400">Nome / Descrição da Conta</label>
                            <input 
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Ex: BANCO ITAÚ S/A"
                                className="w-full p-3 rounded-full border border-slate-200 dark:border-slate-700 bg-transparent text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-cyan-500"
                            />
                        </div>

                        {/* Group Type */}
                        <div className="relative">
                            <label className="absolute -top-2 left-3 bg-white dark:bg-[var(--bg-card)] px-1 text-[10px] font-black uppercase text-slate-400">Grupo de Contas</label>
                            <select
                                required
                                value={formData.type}
                                onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                                className="w-full p-3 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-cyan-500"
                            >
                                <option value="ativo">1 - ATIVO</option>
                                <option value="passivo">2 - PASSIVO</option>
                                <option value="patrimonio">2.3 - PATRIMÔNIO LÍQUIDO</option>
                                <option value="receita">3 - RECEITAS (RESULTADO)</option>
                                <option value="despesa">4 - DESPESAS E CUSTOS (RESULTADO)</option>
                            </select>
                        </div>

                        {/* Balance Nature */}
                        <div className="relative">
                            <label className="absolute -top-2 left-3 bg-white dark:bg-[var(--bg-card)] px-1 text-[10px] font-black uppercase text-slate-400">Natureza do Saldo</label>
                            <select
                                required
                                value={formData.nature}
                                onChange={e => setFormData(prev => ({ ...prev, nature: e.target.value as any }))}
                                className="w-full p-3 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-cyan-500"
                            >
                                <option value="debt">DEVEDORA (Geralmente Ativo / Despesa)</option>
                                <option value="credit">CREDORA (Geralmente Passivo / PL / Receita)</option>
                            </select>
                        </div>

                        {/* Parent Code */}
                        <div className="relative">
                            <label className="absolute -top-2 left-3 bg-white dark:bg-[var(--bg-card)] px-1 text-[10px] font-black uppercase text-slate-400">Código Pai (Opcional)</label>
                            <input 
                                type="text"
                                value={formData.parentCode}
                                onChange={e => setFormData(prev => ({ ...prev, parentCode: e.target.value }))}
                                placeholder="Ex: 1.1.01"
                                className="w-full p-3 rounded-full border border-slate-200 dark:border-slate-700 bg-transparent text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-cyan-500"
                            />
                        </div>

                        {/* Submit Actions */}
                        <div className="flex justify-end gap-3 pt-2">
                            <button 
                                type="button" 
                                onClick={() => setIsAddModalOpen(false)}
                                className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-full px-6 py-2.5 text-xs uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                className="bg-gradient-to-r from-[#0ea5e9] to-[#10b981] text-white font-bold rounded-full px-6 py-2.5 shadow-md shadow-cyan-500/10 text-xs uppercase hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                Salvar Conta
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};
