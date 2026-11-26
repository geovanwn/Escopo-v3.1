import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { BookOpen, ArrowDownToLine, ArrowUpFromLine, Calculator, ClipboardList, FileCheck, FileText, FileCode, Calendar, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { FiscalBookGenerator } from '../components/fiscal/FiscalBookGenerator';
import { OpeningClosingTerm } from '../components/fiscal/OpeningClosingTerm';


export const FiscalBooks: React.FC = () => {
    const [activeTab, setActiveTab] = useState(1);

    const tabs = [
        { id: 1, label: 'Livro de Entradas', icon: ArrowDownToLine },
        { id: 2, label: 'Livro de Saídas', icon: ArrowUpFromLine },
        { id: 6, label: 'Livro de Serviços', icon: FileText },
        { id: 3, label: 'Apuração ICMS', icon: Calculator },
        { id: 4, label: 'Inventário', icon: ClipboardList },
        { id: 5, label: 'Abertura e Encerramento', icon: FileCheck },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">Livros Fiscais</h1>
                    <p className="text-[var(--text-secondary)]">Gerenciamento e visualização dos livros fiscais.</p>
                </div>
            </div>

            <div className="bg-[var(--bg-card)] rounded-2xl shadow-sm border border-[var(--border-color)] overflow-hidden">
                <div className="flex overflow-x-auto border-b border-[var(--border-color)]">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                 flex items-center gap-2 px-6 py-4 text-sm font-bold whitespace-nowrap transition-all duration-200
                 ${activeTab === tab.id
                                    ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50 dark:bg-green-900/10'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                                }
               `}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {activeTab === 1 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold mb-4">Gerar Livro de Entradas</h2>
                            <FiscalBookGenerator type="entry" title="Livro de Registro de Entradas" />
                        </div>
                    )}
                    {activeTab === 2 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold mb-4">Gerar Livro de Saídas</h2>
                            <FiscalBookGenerator type="exit" title="Livro de Registro de Saídas" />
                        </div>
                    )}
                    {activeTab === 6 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold mb-4">Gerar Livro de Serviços</h2>
                            <FiscalBookGenerator type="service" title="Livro de Registro de Serviços Prestados" />
                        </div>
                    )}
                    {activeTab === 3 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold mb-4">Apuração do ICMS</h2>
                            <FiscalBookGenerator type="icms" title="Livro de Apuração do ICMS" />
                        </div>
                    )}
                    {activeTab === 4 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold mb-4">Gerar Livro de Inventário</h2>
                            <FiscalBookGenerator type="inventory" title="Registro de Inventário" />
                        </div>
                    )}
                    {activeTab === 5 && (
                        <div className="space-y-4">
                            <OpeningClosingTerm />
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};


