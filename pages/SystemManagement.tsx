import React, { useState } from 'react';
import { Workflow } from './Workflow';
import { Portal } from './Portal';
import { AuditLogs } from './AuditLogs';
import { ClipboardCheck, ShieldCheck, History } from 'lucide-react';

export const SystemManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'workflow' | 'portal' | 'audit'>('workflow');

    const tabs = [
        { id: 'workflow', label: 'Workflow e Tarefas', icon: ClipboardCheck },
        { id: 'portal', label: 'Portal do Parceiro', icon: ShieldCheck },
        { id: 'audit', label: 'Trilha de Auditoria', icon: History },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Gestão de Processos & Portal</h1>
                    <p className="text-slate-500 font-medium mt-1">
                        Central unificada de tarefas, relacionamento com parceiros e auditoria do sistema.
                    </p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex overflow-x-auto gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 mb-6">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                                flex items-center gap-2 px-6 py-3 rounded-t-xl text-sm font-bold uppercase tracking-wide transition-all
                                ${isActive
                                    ? 'bg-white dark:bg-slate-900 text-indigo-600 border-x border-t border-slate-200 dark:border-slate-800 shadow-sm relative top-[1px]'
                                    : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }
                            `}
                        >
                            <tab.icon size={18} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="bg-white dark:bg-slate-900 rounded-b-2xl rounded-tr-2xl shadow-sm border border-slate-200 dark:border-slate-800 min-h-[600px] p-1">
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {activeTab === 'workflow' && <Workflow />}
                    {activeTab === 'portal' && <Portal />}
                    {activeTab === 'audit' && <AuditLogs />}
                </div>
            </div>
        </div>
    );
};
