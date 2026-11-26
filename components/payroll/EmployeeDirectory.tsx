import React, { useState, useMemo } from 'react';
import { Employee, Partner } from '../../types';
import { formatCurrency, formatDateBR, maskCPF } from '../../utils/formatters';
import {
    Users, Plus, Search, Filter, Edit2, Trash2, Calculator,
    FileText, UserCheck, Calendar, DollarSign, ChevronRight,
    Building2, Phone, Mail, MoreVertical
} from 'lucide-react';

interface EmployeeDirectoryProps {
    employees: Employee[];
    partners: Partner[];
    onOpenNewModal: (type?: 'employee' | 'partner') => void;
    onEditEmployee: (collab: any) => void;
    onDeleteEmployee: (type: 'employee' | 'partner', id: string, name: string) => void;
    onCalculatePerson: (personId: string) => void;
    onGenerateDoc: (personId: string) => void;
}

export const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({
    employees,
    partners,
    onOpenNewModal,
    onEditEmployee,
    onDeleteEmployee,
    onCalculatePerson,
    onGenerateDoc
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'employee' | 'partner'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'ferias' | 'afastado' | 'inativo'>('all');

    // Consolidated list
    const consolidatedList = useMemo(() => {
        const emps = employees.map(e => ({
            ...e,
            collabType: 'employee' as const,
            baseValue: Number(e.salary) || 0,
            displayRole: e.position || e.role || 'Colaborador CLT',
            displayStatus: (e.status || 'ativo') as 'ativo' | 'inativo' | 'ferias' | 'afastado'
        }));

        const parts = partners.map(p => ({
            ...p,
            collabType: 'partner' as const,
            baseValue: Number(p.proLaboreValue) || 0,
            displayRole: p.role || 'Sócio Diretor',
            displayStatus: 'ativo'
        }));

        let list = [...emps, ...parts];

        // Type filter
        if (typeFilter !== 'all') {
            list = list.filter(item => item.collabType === typeFilter);
        }

        // Status filter
        if (statusFilter !== 'all') {
            list = list.filter(item => item.displayStatus === statusFilter);
        }

        // Search filter
        if (searchTerm.trim()) {
            const low = searchTerm.toLowerCase();
            list = list.filter(item =>
                item.name.toLowerCase().includes(low) ||
                item.cpf?.toLowerCase().includes(low) ||
                item.displayRole.toLowerCase().includes(low) ||
                ((item as any).department && (item as any).department.toLowerCase().includes(low))
            );
        }

        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [employees, partners, typeFilter, statusFilter, searchTerm]);

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Top Toolbar */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative w-full sm:w-72">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, cargo ou CPF..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-sky-500 transition-all placeholder:text-slate-400"
                        />
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs">
                        <button
                            onClick={() => setTypeFilter('all')}
                            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                                typeFilter === 'all'
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Todos ({employees.length + partners.length})
                        </button>
                        <button
                            onClick={() => setTypeFilter('employee')}
                            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                                typeFilter === 'employee'
                                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            CLT ({employees.length})
                        </button>
                        <button
                            onClick={() => setTypeFilter('partner')}
                            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                                typeFilter === 'partner'
                                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Sócios ({partners.length})
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onOpenNewModal('employee')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-sky-500/20 active:scale-95 transition-all"
                    >
                        <Plus size={16} />
                        <span>Admitir Colaborador CLT</span>
                    </button>
                    <button
                        onClick={() => onOpenNewModal('partner')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-2xl font-bold text-xs border border-emerald-200 dark:border-emerald-800 transition-all"
                    >
                        <UserCheck size={16} />
                        <span>Novo Sócio</span>
                    </button>
                </div>
            </div>

            {/* Grid of Cards */}
            {consolidatedList.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border border-slate-100 dark:border-slate-800">
                    <Users size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <h4 className="font-extrabold text-sm text-slate-700 dark:text-slate-300">
                        Nenhum colaborador encontrado
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Tente ajustar os filtros de busca ou clique no botão acima para cadastrar novos colaboradores.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {consolidatedList.map(item => {
                        const isEmp = item.collabType === 'employee';

                        return (
                            <div
                                key={item.id}
                                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                            >
                                <div>
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0 shadow-inner ${
                                                isEmp
                                                    ? 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300'
                                                    : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                                            }`}>
                                                {item.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                                                    {item.name}
                                                </h4>
                                                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                                                    {item.displayRole}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                isEmp
                                                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300'
                                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                            }`}>
                                                {isEmp ? 'CLT' : 'Sócio'}
                                            </span>
                                            {isEmp && (
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                                    item.displayStatus === 'ferias' ? 'bg-amber-100 text-amber-800' :
                                                    item.displayStatus === 'afastado' ? 'bg-rose-100 text-rose-800' :
                                                    item.displayStatus === 'inativo' ? 'bg-slate-100 text-slate-600' :
                                                    'bg-emerald-50 text-emerald-700'
                                                }`}>
                                                    {item.displayStatus === 'ferias' ? 'Férias' :
                                                     item.displayStatus === 'afastado' ? 'Afastado' :
                                                     item.displayStatus === 'inativo' ? 'Inativo' : 'Ativo'}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Card Metadata Details */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">CPF:</span>
                                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                                {maskCPF(item.cpf || '') || '—'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Admissão:</span>
                                            <span className="font-mono text-slate-700 dark:text-slate-300">
                                                {formatDateBR((item as any).admissionDate)}
                                            </span>
                                        </div>
                                        {(item as any).department && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Setor:</span>
                                                <span className="text-slate-700 dark:text-slate-300 font-semibold">
                                                    {(item as any).department}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between border-t border-slate-200/60 dark:border-slate-700 pt-1.5 mt-1.5">
                                            <span className="text-slate-500 font-bold">
                                                {isEmp ? 'Salário Base:' : 'Pró-Labore:'}
                                            </span>
                                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                                {formatCurrency(item.baseValue)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer Actions */}
                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => onCalculatePerson(item.id)}
                                            className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold text-xs hover:bg-sky-100 transition-colors flex items-center gap-1.5"
                                            title="Calcular no Cockpit"
                                        >
                                            <Calculator size={14} />
                                            <span>Calcular</span>
                                        </button>
                                        <button
                                            onClick={() => onGenerateDoc(item.id)}
                                            className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                                            title="Gerar Documento"
                                        >
                                            <FileText size={14} />
                                            <span>Docs</span>
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => onEditEmployee(item)}
                                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl transition-colors"
                                            title="Editar Dados"
                                        >
                                            <Edit2 size={15} />
                                        </button>
                                        <button
                                            onClick={() => onDeleteEmployee(item.collabType, item.id, item.name)}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                                            title="Excluir Colaborador"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
