import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { RubricForm } from '../components/RubricForm';
import { PayrollItem } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Plus, Edit2, Trash2, Search, Filter, Upload } from 'lucide-react';
import { ImportModal } from '../components/ui/ImportModal';
import { useToast } from '../contexts/ToastContext';
import { parseCSV } from '../utils/csvParser';

export const RubricManager: React.FC = () => {
    const { addToast } = useToast();
    const { payrollItems, deleteItem, addPayrollItem, currentUser } = useData();
    const [isEditing, setIsEditing] = useState(false);
    const [selectedItem, setSelectedItem] = useState<PayrollItem | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const handleCreate = () => {
        setSelectedItem(undefined);
        setIsEditing(true);
    };

    const handleEdit = (item: PayrollItem) => {
        setSelectedItem(item);
        setIsEditing(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta rubrica?')) {
            deleteItem('payrollItems', id);
        }
    };

    const handleSave = () => {
        setIsEditing(false);
        setSelectedItem(undefined);
    };

    const handleDownloadTemplate = () => {
        const columns = ['code', 'name', 'type', 'natureza', 'calcMethod', 'calcValue'];
        const csvContent = "data:text/csv;charset=utf-8," + columns.join(";");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `modelo_rubricas.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportData = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target?.result as string;
            const records = parseCSV(content);

            if (records.length === 0) {
                addToast('Nenhum registro encontrado ou arquivo inválido.', 'warning');
                return;
            }

            let successCount = 0;
            const importBatch = async () => {
                for (const record of records) {
                    try {
                        if (!record.code || !record.name) continue;

                        const payload: PayrollItem = {
                            ...record,
                            id: crypto.randomUUID(),
                            status: 'ativo',
                            type: record.type || 'provento', // Default
                            // Ensure required fields
                            natureza: record.natureza || 'salarial',
                            userId: currentUser || 'integrated_user' // handled by context
                        } as any;

                        await addPayrollItem(payload);
                        successCount++;
                    } catch (err) {
                        console.error("Error importing rubric:", record, err);
                    }
                }
            };

            await importBatch();
            addToast(`${successCount} rubricas importadas com sucesso!`, 'success');
            setIsImportModalOpen(false);
        };
        reader.readAsText(file);
    };

    // Filter Logic
    const filteredItems = payrollItems.filter(item => {
        const matchesSearch =
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.code.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = filterType === 'all' || item.type === filterType;

        return matchesSearch && matchesType;
    });

    if (isEditing) {
        return (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Gerenciador de Rubricas</h1>
                        <p className="text-[var(--text-secondary)]">Cadastro completo de eventos de folha</p>
                    </div>
                </div>
                <RubricForm
                    initialData={selectedItem}
                    onSave={handleSave}
                    onCancel={() => setIsEditing(false)}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Gerenciador de Rubricas</h1>
                    <p className="text-[var(--text-secondary)]">Configure proventos, descontos e bases de cálculo</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleCreate} icon={Plus}>Nova Rubrica</Button>
                    <Button variant="outline" icon={Upload} onClick={() => setIsImportModalOpen(true)}>Importar</Button>
                </div>
            </div>

            <Card className="p-0 overflow-hidden bg-[var(--bg-card)] border-[var(--border-color)]">
                {/* Filters */}
                <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <input
                            type="text"
                            placeholder="Buscar por nome ou código..."
                            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-3 top-2.5 text-[var(--text-secondary)] w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Filter size={20} className="text-[var(--text-secondary)]" />
                        <select
                            className="p-2 border border-[var(--border-color)] rounded-lg outline-none bg-[var(--bg-input)] text-[var(--text-primary)] text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                        >
                            <option value="all">Todos os Tipos</option>
                            <option value="provento">Proventos</option>
                            <option value="desconto">Descontos</option>
                            <option value="encargo">Encargos</option>
                            <option value="base">Bases</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto bg-[var(--bg-card)]">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)] uppercase">
                            <tr>
                                <th className="p-4 w-24">Código</th>
                                <th className="p-4">Nome</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4">Natureza</th>
                                <th className="p-4">Cálculo</th>
                                <th className="p-4 w-20">eSocial</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)] text-sm">
                            {filteredItems.length > 0 ? filteredItems.map(item => (
                                <tr key={item.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                                    <td className="p-4 font-mono font-bold text-[var(--text-secondary)]">{item.code}</td>
                                    <td className="p-4 font-medium text-[var(--text-primary)]">{item.name}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize 
                                            ${item.type === 'provento' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                item.type === 'desconto' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                    item.type === 'encargo' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
                                            {item.type}
                                        </span>
                                    </td>
                                    <td className="p-4 capitalize text-[var(--text-secondary)]">{item.natureza || '-'}</td>
                                    <td className="p-4 capitalize text-[var(--text-secondary)]">{item.calcMethod || 'Fixo'}</td>
                                    <td className="p-4 text-[var(--text-secondary)]">{item.eSocialCode || '-'}</td>
                                    <td className="p-4 text-center">
                                        <span className={`w-2 h-2 rounded-full inline-block ${item.status === 'ativo' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="p-2 text-[var(--text-secondary)] hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-2 text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-[var(--text-secondary)]">
                                        Nenhuma rubrica encontrada. Clique em "Nova Rubrica" para começar.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImportData}
                onDownloadTemplate={handleDownloadTemplate}
                title="Importar Rubricas"
            />
        </div>
    );
};
