import React, { useState, useMemo } from 'react';
import { PayrollRun, PayrollRunDetail, CompanyEntity, Employee } from '../../types';
import { formatCurrency, formatDateBR } from '../../utils/formatters';
import { generatePayrollSummaryPDF, generateSinglePayslipPDF } from '../../services/payrollPdfService';
import { validateSEFIP84Data, generateSEFIP84 } from '../../utils/sefip84Generator';
import { generateEsocial } from '../../utils/legalGenerators';
import { useToast } from '../../contexts/ToastContext';
import { useError } from '../../contexts/ErrorContext';
import {
    Search, Filter, ArrowUp, ArrowDown, ClipboardList, Edit2,
    FileText, FileCode, Trash2, Users, FileCheck, CheckCircle2,
    Download, AlertCircle, Printer
} from 'lucide-react';

interface PayrollHistoryTableProps {
    history: PayrollRun[];
    selectedCompany: CompanyEntity | null;
    people: any[];
    onEditRun: (run: PayrollRun) => void;
    onDeleteRun: (runId: string) => void;
    onViewPayslip: (detail: PayrollRunDetail) => void;
    onViewDetails: (run: PayrollRun) => void;
}

export const PayrollHistoryTable: React.FC<PayrollHistoryTableProps> = ({
    history,
    selectedCompany,
    people,
    onEditRun,
    onDeleteRun,
    onViewPayslip,
    onViewDetails
}) => {
    const { addToast } = useToast();
    const { showError } = useError();

    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'folha_mensal' | 'decimo_terceiro' | 'ferias' | 'rescisao'>('all');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'closedAt',
        direction: 'desc'
    });
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredAndSortedHistory = useMemo(() => {
        let list = [...history];

        // Type filter
        if (typeFilter !== 'all') {
            list = list.filter(r => (r.calculationType || 'folha_mensal') === typeFilter);
        }

        // Search term
        if (searchTerm.trim()) {
            const low = searchTerm.toLowerCase();
            list = list.filter(r =>
                r.competence.toLowerCase().includes(low) ||
                (r.details || []).some(d => d.employeeName?.toLowerCase().includes(low))
            );
        }

        // Sort
        list.sort((a, b) => {
            const aVal = (a as any)[sortConfig.key];
            const bVal = (b as any)[sortConfig.key];

            if (aVal === undefined && bVal === undefined) return 0;
            if (aVal === undefined) return 1;
            if (bVal === undefined) return -1;

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return list;
    }, [history, searchTerm, typeFilter, sortConfig]);

    const handleDownloadSummary = (run: PayrollRun) => {
        if (!selectedCompany) {
            addToast('Nenhuma empresa ativa selecionada.', 'warning');
            return;
        }
        generatePayrollSummaryPDF(
            run,
            selectedCompany,
            setIsGeneratingPdf,
            showError,
            (url, doc, name) => {
                doc.save(name);
                addToast('Resumo da folha baixado com sucesso!', 'success');
            }
        );
    };

    const handleGenerateSefip = (run: PayrollRun) => {
        if (!selectedCompany) {
            addToast('Nenhuma empresa ativa selecionada.', 'warning');
            return;
        }

        const errors = validateSEFIP84Data(selectedCompany, people as any, run, { isZeroMovement: false });
        if (errors.length > 0) {
            const errorList = errors.map(e => `• ${e.name ? `[${e.name}] ` : ''}${e.field}: ${e.message}`).join('\n');
            showError({
                code: 'SEFIP_VAL_001',
                title: 'Dados Incompletos para SEFIP',
                description: `Corrija as inconsistências abaixo antes de gerar o arquivo oficial:\n\n${errorList}`,
                origin: 'Validador SEFIP 8.4',
                suggestion: 'Complete os cadastros da Empresa e dos Colaboradores com CPF, PIS, CBO e endereço completo.',
                type: 'error'
            });
            return;
        }

        try {
            const txt = generateSEFIP84(selectedCompany, people as any, run, {
                name: selectedCompany.razaoSocial,
                phone: selectedCompany.telefone || '11999999999',
                contact: 'DEPARTAMENTO PESSOAL'
            }, { isZeroMovement: false });

            const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `SEFIP_${run.competence.replace('/', '_')}.RE`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            addToast('Arquivo SEFIP (.RE) gerado com sucesso!', 'success');
        } catch (err: any) {
            addToast(`Erro ao gerar SEFIP: ${err.message}`, 'error');
        }
    };

    const handleGenerateEsocialXml = (run: PayrollRun) => {
        if (!selectedCompany) {
            addToast('Nenhuma empresa ativa selecionada.', 'warning');
            return;
        }

        try {
            const employeesList = people.filter(p => p.type === 'employee') as Employee[];
            const xml = generateEsocial(run, selectedCompany, employeesList);
            const blob = new Blob([xml], { type: 'text/xml;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `eSocial_S1200_${run.competence.replace('/', '_')}.xml`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            addToast('Arquivo XML eSocial S-1200 gerado com sucesso!', 'success');
        } catch (err: any) {
            addToast(`Erro ao gerar eSocial: ${err.message}`, 'error');
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden animate-in fade-in duration-300">
            {/* Table Header Filter Toolbar */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 sm:w-64">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Buscar competência ou nome..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-sky-500 transition-all placeholder:text-slate-400"
                        />
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                        {[
                            { id: 'all', label: 'Todos' },
                            { id: 'folha_mensal', label: 'Mensal' },
                            { id: 'decimo_terceiro', label: '13º' },
                            { id: 'ferias', label: 'Férias' },
                            { id: 'rescisao', label: 'Rescisão' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setTypeFilter(tab.id as any)}
                                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                                    typeFilter === tab.id
                                        ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <span>Total de Fechamentos: <strong>{filteredAndSortedHistory.length}</strong></span>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-800/80 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 select-none">
                            <th className="px-6 py-3.5 cursor-pointer hover:text-slate-600" onClick={() => handleSort('competence')}>
                                <div className="flex items-center gap-1">
                                    Competência
                                    {sortConfig.key === 'competence' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                </div>
                            </th>
                            <th className="px-4 py-3.5 text-center cursor-pointer hover:text-slate-600" onClick={() => handleSort('calculationType')}>
                                <div className="flex items-center justify-center gap-1">
                                    Regime
                                    {sortConfig.key === 'calculationType' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                </div>
                            </th>
                            <th className="px-4 py-3.5 text-center cursor-pointer hover:text-slate-600" onClick={() => handleSort('status')}>
                                <div className="flex items-center justify-center gap-1">
                                    Status
                                    {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                </div>
                            </th>
                            <th className="px-6 py-3.5">
                                Colaboradores
                            </th>
                            <th className="px-6 py-3.5 text-right cursor-pointer hover:text-slate-600" onClick={() => handleSort('closedAt')}>
                                <div className="flex items-center justify-end gap-1">
                                    Data de Processamento
                                    {sortConfig.key === 'closedAt' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                </div>
                            </th>
                            <th className="px-6 py-3.5 text-right cursor-pointer hover:text-slate-600" onClick={() => handleSort('totalNet')}>
                                <div className="flex items-center justify-end gap-1">
                                    Valor Líquido Total
                                    {sortConfig.key === 'totalNet' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                </div>
                            </th>
                            <th className="px-6 py-3.5 text-center">
                                Ações Oficiais
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {filteredAndSortedHistory.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                            <FileText size={24} />
                                        </div>
                                        <p className="font-extrabold text-sm text-slate-600 dark:text-slate-300">
                                            Nenhum histórico registrado
                                        </p>
                                        <p className="text-xs max-w-sm">
                                            Calcule e feche a primeira folha de pagamento no Cockpit para arquivar aqui.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredAndSortedHistory.map(run => {
                                const isSingle = run.employeeCount === 1;
                                const firstDetail = run.details?.[0];

                                return (
                                    <tr
                                        key={run.id}
                                        onClick={() => onViewDetails(run)}
                                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                                    >
                                        {/* Competência */}
                                        <td className="px-6 py-4">
                                            <span className="font-black text-sm text-slate-900 dark:text-white font-mono">
                                                {run.competence}
                                            </span>
                                        </td>

                                        {/* Regime */}
                                        <td className="px-4 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                                run.calculationType === 'decimo_terceiro' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400' :
                                                run.calculationType === 'ferias' ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400' :
                                                run.calculationType === 'rescisao' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400' :
                                                'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                            }`}>
                                                {run.calculationType === 'decimo_terceiro' ? '13º Salário' :
                                                 run.calculationType === 'ferias' ? 'Férias' :
                                                 run.calculationType === 'rescisao' ? 'Rescisão TRCT' : 'Folha Mensal'}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                run.status === 'fechado'
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${run.status === 'fechado' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                                                {run.status === 'fechado' ? (isSingle ? 'Individual' : 'Consolidado') : 'Rascunho'}
                                            </span>
                                        </td>

                                        {/* Colaboradores */}
                                        <td className="px-6 py-4">
                                            {isSingle && firstDetail ? (
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-xl bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 flex items-center justify-center font-black text-xs">
                                                        {firstDetail.employeeName?.charAt(0) || 'C'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-extrabold text-slate-800 dark:text-slate-200 truncate">
                                                            {firstDetail.employeeName}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400">
                                                            {firstDetail.role || 'Colaborador'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <Users size={14} className="text-slate-400" />
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                                        {run.employeeCount} colaboradores
                                                    </span>
                                                </div>
                                            )}
                                        </td>

                                        {/* Processado em */}
                                        <td className="px-6 py-4 text-right">
                                            <p className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                                                {formatDateBR(run.closedAt)}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                {run.closedAt ? new Date(run.closedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </p>
                                        </td>

                                        {/* Líquido */}
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-black text-sm text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                                                {formatCurrency(run.totalNet || 0)}
                                            </span>
                                        </td>

                                        {/* Ações */}
                                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1">
                                                {/* PDF Resumo */}
                                                <button
                                                    onClick={() => handleDownloadSummary(run)}
                                                    className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30 rounded-lg transition-colors"
                                                    title="Baixar Relatório Consolidado (PDF)"
                                                >
                                                    <ClipboardList size={16} />
                                                </button>

                                                {/* Holerite */}
                                                <button
                                                    onClick={() => {
                                                        if (isSingle && firstDetail) {
                                                            onViewPayslip({ ...firstDetail, competence: firstDetail.competence || run.competence });
                                                        } else {
                                                            onViewDetails(run);
                                                        }
                                                    }}
                                                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"
                                                    title="Ver Holerite / Demonstrativo"
                                                >
                                                    <FileText size={16} />
                                                </button>

                                                {/* SEFIP .RE */}
                                                <button
                                                    onClick={() => handleGenerateSefip(run)}
                                                    className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg transition-colors"
                                                    title="Exportar Arquivo SEFIP 8.4 (.RE)"
                                                >
                                                    <FileCode size={16} />
                                                </button>

                                                {/* eSocial S-1200 */}
                                                <button
                                                    onClick={() => handleGenerateEsocialXml(run)}
                                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors"
                                                    title="Gerar XML eSocial S-1200"
                                                >
                                                    <Download size={16} />
                                                </button>

                                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

                                                {/* Editar / Restaurar */}
                                                <button
                                                    onClick={() => onEditRun(run)}
                                                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors"
                                                    title="Reabrir no Cockpit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>

                                                {/* Excluir */}
                                                <button
                                                    onClick={() => onDeleteRun(run.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                                                    title="Excluir Registro"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
