import React, { useState, useMemo } from 'react';
import { Edit2, Trash2, Search, ChevronLeft, ChevronRight, MessageCircle, Mail, MapPin } from 'lucide-react';
import { Client } from '../../types';
import { maskCNPJ, maskCPF, maskPhone, unmask } from '../../utils/formatters';

interface EntityListProps {
    data: Client[];
    onEdit: (item: Client) => void;
    onDelete: (id: string) => void;
    isLoading?: boolean;
}

const ITEMS_PER_PAGE = 10;

export const EntityList: React.FC<EntityListProps> = ({ data, onEdit, onDelete, isLoading }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState<keyof Client>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Filter and Sort Logic
    const filteredData = useMemo(() => {
        let result = [...data];

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(
                item =>
                    (item.name && item.name.toLowerCase().includes(lowerTerm)) ||
                    (item.fantasyName && item.fantasyName.toLowerCase().includes(lowerTerm)) ||
                    (item.cnpj && (item.cnpj.includes(searchTerm) || item.cnpj.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, '')))) ||
                    (item.email && item.email.toLowerCase().includes(lowerTerm))
            );
        }

        result.sort((a, b) => {
            const aValue = String(a[sortField] || '').toLowerCase();
            const bValue = String(b[sortField] || '').toLowerCase();

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [data, searchTerm, sortField, sortDirection]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleSort = (field: keyof Client) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Carregando dados...</div>;
    }

    return (
        <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
            {/* Header / Toolbar */}
            <div className="p-4 border-b border-[var(--border-color)] flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="font-bold text-lg text-[var(--text-primary)]">Registros ({filteredData.length})</h3>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, email ou documento..."
                        className="w-full pl-10 pr-4 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-[var(--text-secondary)]">
                    <thead className="bg-[var(--bg-secondary)] uppercase font-bold text-xs">
                        <tr>
                            <th className="px-6 py-4 text-left cursor-pointer hover:text-green-600" onClick={() => handleSort('name')}>Nome / Razão Social</th>
                            <th className="px-6 py-4 text-left">Documento</th>
                            <th className="px-6 py-4 text-left">Contatos</th>
                            <th className="px-6 py-4 text-left text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                        {paginatedData.length > 0 ? (
                            paginatedData.map((item) => (
                                <tr key={item.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-[var(--text-primary)]">{item.name || 'Sem Nome'}</span>
                                            {item.fantasyName && <span className="text-xs text-gray-400">{item.fantasyName}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono">
                                        <span className="bg-[var(--bg-secondary)] px-2 py-1 rounded text-xs border border-[var(--border-color)]">
                                            {item.cnpj ? (item.cnpj.length > 11 ? maskCNPJ(item.cnpj) : maskCPF(item.cnpj)) : '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-xs">
                                                <Mail size={12} className="text-blue-500" />
                                                <a href={`mailto:${item.email || ''}`} className="hover:underline">{item.email || 'N/D'}</a>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs">
                                                <MessageCircle size={12} className="text-green-500" />
                                                <a href={`https://wa.me/${unmask(item.mobilePhone || item.phone || '')}`} target="_blank" rel="noreferrer" className="hover:underline">
                                                    {item.mobilePhone || item.phone || 'Sem Telefone'}
                                                </a>
                                            </div>
                                            {item.city && (
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                    <MapPin size={12} />
                                                    {item.city} - {item.uf || ''}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => onEdit(item)}
                                                className="p-2 bg-[var(--bg-secondary)] rounded-lg hover:text-green-600 hover:bg-green-50 transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Tem certeza que deseja excluir este registro?')) {
                                                        onDelete(item.id);
                                                    }
                                                }}
                                                className="p-2 bg-[var(--bg-secondary)] rounded-lg hover:text-red-600 hover:bg-red-50 transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                                    Nenhum registro encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
                <div className="p-4 border-t border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-secondary)]">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 transition-all"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    <span className="text-xs font-bold text-[var(--text-secondary)]">
                        Página {currentPage} de {totalPages}
                    </span>

                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 transition-all"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};
