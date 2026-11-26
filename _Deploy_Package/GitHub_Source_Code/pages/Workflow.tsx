import React, { useEffect, useState } from 'react';
import { useWorkflowStore } from '../stores/useWorkflowStore';
import { useData } from '../contexts/DataContext';
import {
    Plus,
    Calendar,
    CheckCircle2,
    Clock,
    AlertCircle,
    MoreVertical,
    User,
    Tag,
    ChevronRight,
    Search,
    Filter
} from 'lucide-react';
import { WorkflowTask } from '../types';
import { formatDateBR } from '../utils/formatters';

export const Workflow: React.FC = () => {
    const { selectedCompany } = useData();
    const { tasks, isLoaded, addTask, updateTask, deleteTask, subscribe } = useWorkflowStore();
    const [isAdding, setIsAdding] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | WorkflowTask['status']>('all');

    useEffect(() => {
        if (selectedCompany?.id) {
            const unsub = subscribe(selectedCompany.id);
            return () => unsub();
        }
    }, [selectedCompany?.id, subscribe]);

    const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        await addTask({
            companyId: selectedCompany?.id || '',
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            assignedTo: formData.get('assignedTo') as string,
            status: 'todo',
            priority: formData.get('priority') as any || 'medium',
            dueDate: formData.get('dueDate') as string || new Date().toISOString().split('T')[0],
        });

        setIsAdding(false);
    };

    const filteredTasks = tasks.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: WorkflowTask['status']) => {
        switch (status) {
            case 'done': return 'bg-green-100 text-green-700 border-green-200';
            case 'doing': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'blocked': return 'bg-red-100 text-red-700 border-red-200';
            case 'todo': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getPriorityIcon = (priority: WorkflowTask['priority']) => {
        switch (priority) {
            case 'urgent': return <AlertCircle className="w-3 h-3 text-red-500" />;
            case 'high': return <Clock className="w-3 h-3 text-amber-500" />;
            default: return <Clock className="w-3 h-3 text-slate-400" />;
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                        <CheckCircle2 className="text-green-600" />
                        Workflow e Tarefas
                    </h1>
                    <p className="text-[var(--text-secondary)] text-sm font-medium">Gestão de processos e obrigações do escritório</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-500/20 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus size={18} />
                    Nova Tarefa
                </button>
            </header>

            <div className="flex flex-col md:flex-row gap-4 bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-color)] shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar tarefas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    {(['all', 'todo', 'doing', 'done', 'blocked'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-4 py-3 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all ${statusFilter === s ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-slate-500 hover:border-green-600/50'}`}
                        >
                            {s === 'all' ? 'Todas' : s}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isAdding && (
                    <div className="bg-[var(--bg-card)] rounded-3xl border-2 border-dashed border-green-600/30 p-6 animate-in fade-in slide-in-from-top-4 duration-300">
                        <form onSubmit={handleAddTask} className="space-y-4">
                            <input
                                name="title"
                                placeholder="Título da tarefa..."
                                className="w-full bg-transparent text-lg font-black outline-none border-b border-[var(--border-color)] pb-2 focus:border-green-600 transition-all"
                                required
                                autoFocus
                            />
                            <textarea
                                name="description"
                                placeholder="Descrição detalhada..."
                                className="w-full bg-[var(--bg-primary)] rounded-xl p-3 text-sm min-h-[100px] outline-none border border-[var(--border-color)] focus:border-green-600 transition-all"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Prioridade</label>
                                    <select name="priority" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs outline-none">
                                        <option value="low">Baixa</option>
                                        <option value="medium" selected>Média</option>
                                        <option value="high">Alta</option>
                                        <option value="urgent">Urgente</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Prazo</label>
                                    <input type="date" name="dueDate" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs outline-none" />
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="submit" className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold text-xs">Criar Tarefa</button>
                                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs">Cancelar</button>
                            </div>
                        </form>
                    </div>
                )}

                {filteredTasks.map(task => (
                    <div
                        key={task.id}
                        className="group bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)] p-6 hover:shadow-xl hover:shadow-green-500/5 transition-all hover:border-green-600/30 relative overflow-hidden"
                    >
                        {/* Status bar */}
                        <div className={`absolute top-0 left-0 right-0 h-1 ${getStatusColor(task.status).split(' ')[0]}`} />

                        <div className="flex justify-between items-start mb-4">
                            <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${getStatusColor(task.status)}`}>
                                {task.status}
                            </span>
                            <div className="flex gap-1.5">
                                {getPriorityIcon(task.priority)}
                                <button className="p-1 text-slate-400 hover:text-green-600 transition-colors">
                                    <MoreVertical size={16} />
                                </button>
                            </div>
                        </div>

                        <h3 className="font-black text-slate-800 dark:text-slate-100 mb-2 group-hover:text-green-600 transition-colors">{task.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed font-medium">
                            {task.description}
                        </p>

                        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)] mt-auto">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                                    <User size={12} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                    {task.assignedTo || 'Sem atribuição'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <Calendar size={12} />
                                <span className="text-[10px] font-bold">
                                    {formatDateBR(task.dueDate)}
                                </span>
                            </div>
                        </div>

                        {/* Interactive transition buttons */}
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-[var(--bg-card)] via-[var(--bg-card)] translate-y-full group-hover:translate-y-0 transition-transform flex gap-2">
                            <button
                                onClick={() => updateTask(task.id, { status: 'doing' })}
                                className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1"
                            >
                                <Clock size={12} /> Iniciar
                            </button>
                            <button
                                onClick={() => updateTask(task.id, { status: 'done' })}
                                className="flex-1 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1"
                            >
                                <CheckCircle2 size={12} /> Concluir
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isLoaded && filteredTasks.length === 0 && !isAdding && (
                <div className="text-center py-20 bg-[var(--bg-card)] rounded-[3rem] border-2 border-dashed border-[var(--border-color)]">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                        <CheckCircle2 size={40} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Tudo pronto!</h3>
                    <p className="text-slate-500 text-sm font-medium">Não há tarefas pendentes para esta empresa.</p>
                </div>
            )}
        </div>
    );
};
