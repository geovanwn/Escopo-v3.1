import React, { useState, useMemo } from 'react';
import {
    Search, Filter, Plus, Download, ChevronLeft, ChevronRight,
    ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface Column<T> {
    header: string;
    accessor?: keyof T | ((item: T) => React.ReactNode);
    className?: string; // For alignment text-right, text-center, width, etc.
    sortable?: boolean;
    sortKey?: string; // If accessor is a function, this is needed for sorting
}

interface UniversalListProps<T> {
    title: string;
    subtitle?: string;
    icon?: React.ElementType;
    data: T[];
    columns: Column<T>[];
    actions?: (item: T) => React.ReactNode;
    onCreate?: () => void;
    onImport?: () => void;
    onExport?: () => void; // Optional export handler
    headerActions?: React.ReactNode; // Custom actions for the header
    customFilters?: React.ReactNode; // Slot for custom filters like "Year", "Month"
    searchPlaceholder?: string;
    itemsPerPageOptions?: number[];
    idAccessor?: keyof T | ((item: T) => string);
    summary?: (items: T[]) => React.ReactNode; // Custom summary based on filtered items
}

export function UniversalList<T>({
    title,
    subtitle,
    icon: Icon,
    data,
    columns,
    actions,
    onCreate,
    onImport,
    onExport,
    headerActions,
    customFilters,
    searchPlaceholder = "Pesquisar...",
    itemsPerPageOptions = [10, 20, 50, 100],
    idAccessor = 'id' as any,
    summary
}: UniversalListProps<T>) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // --- GENERIC FILTERING ---
    // Note: This is a simple client-side search. 
    // Complex properties might need custom logic, but "JSON.stringify" search is a robust fallback for quick lists.
    const filteredData = useMemo(() => {
        if (!searchTerm) return data;
        const lowerTerm = searchTerm.toLowerCase();
        return data.filter(item => {
            return Object.values(item as any).some(val =>
                String(val).toLowerCase().includes(lowerTerm)
            );
        });
    }, [data, searchTerm]);

    // --- SORTING ---
    const sortedData = useMemo(() => {
        if (!sortConfig) return filteredData;
        const result = [...filteredData];
        result.sort((a: any, b: any) => {
            // value resolution
            const key = sortConfig.key;
            const aVal = a[key] ?? '';
            const bVal = b[key] ?? '';

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return result;
    }, [filteredData, sortConfig]);

    // --- PAGINATION ---
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedData.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedData, currentPage, itemsPerPage]);

    const handleSort = (key?: string) => {
        if (!key) return;
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ columnKey }: { columnKey?: string }) => {
        if (!columnKey || sortConfig?.key !== columnKey) return <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={12} className="ml-1 text-green-600" />
            : <ArrowDown size={12} className="ml-1 text-green-600" />;
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden rounded-xl border border-slate-200 shadow-sm">

            {/* 1. HEADER BAR */}
            <header className="flex flex-col xl:flex-row items-center justify-between p-4 border-b border-slate-100 bg-white gap-4 shrink-0">
                <div className="flex items-center gap-4 w-full xl:w-auto">
                    {Icon && (
                        <div className="bg-slate-50 p-2.5 rounded-xl shadow-sm border border-slate-200 hidden md:block">
                            <Icon className="w-6 h-6 text-green-600" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h1>
                        {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto overflow-x-auto">

                    {/* Custom Filters Slot */}
                    {customFilters && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 whitespace-nowrap">
                            {customFilters}
                        </div>
                    )}

                    {/* Search */}
                    <div className="relative group w-full md:w-64">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-lg pl-9 pr-4 py-2 text-xs font-medium focus:ring-2 focus:ring-green-500/20 transition-all outline-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        {onImport && (
                            <button
                                onClick={onImport}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-sm whitespace-nowrap"
                            >
                                <Download size={14} /> Importar
                            </button>
                        )}
                        {onExport && (
                            <button
                                onClick={onExport}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-sm whitespace-nowrap"
                            >
                                <Download size={14} /> Exportar
                            </button>
                        )}
                        {headerActions}
                        {onCreate && (
                            <button
                                onClick={onCreate}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-black shadow-lg shadow-green-500/20 hover:scale-105 transition-all whitespace-nowrap"
                            >
                                <Plus size={14} /> Novo
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* 2. DATA TABLE */}
            <div className="overflow-auto custom-scrollbar flex-1 min-h-0 bg-white">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur-sm">
                        <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    className={`px-6 py-4 cursor-pointer group hover:text-slate-600 transition-colors ${col.className || ''}`}
                                    onClick={() => col.sortable !== false && handleSort(col.sortKey || (typeof col.accessor === 'string' ? col.accessor : undefined))}
                                >
                                    <div className={`flex items-center ${col.className?.includes('text-right') ? 'justify-end' : (col.className?.includes('text-center') ? 'justify-center' : '')}`}>
                                        {col.header}
                                        {col.sortable !== false && <SortIcon columnKey={col.sortKey || (typeof col.accessor === 'string' ? col.accessor : undefined)} />}
                                    </div>
                                </th>
                            ))}
                            {actions && <th className="px-6 py-4 text-right">Ações</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {paginatedData.length > 0 ? (
                            paginatedData.map((item, idx) => {
                                const id = typeof idAccessor === 'function' ? idAccessor(item) : (item as any)[idAccessor];
                                return (
                                    <tr key={id || idx} className="hover:bg-green-50/30 transition-all group">
                                        {columns.map((col, colIdx) => (
                                            <td key={colIdx} className={`px-6 py-4 ${col.className || ''}`}>
                                                {typeof col.accessor === 'function'
                                                    ? col.accessor(item)
                                                    : (item as any)[col.accessor as string]
                                                }
                                            </td>
                                        ))}
                                        {actions && (
                                            <td className="px-6 py-4 text-right">
                                                {actions(item)}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={columns.length + (actions ? 1 : 0)} className="py-20 text-center">
                                    <div className="flex flex-col items-center justify-center opacity-40">
                                        <Search size={48} className="text-slate-300 mb-4" />
                                        <p className="text-sm font-black uppercase tracking-widest">Nenhum registro encontrado</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* 3. FOOTER */}
            <div className="border-t border-slate-100 bg-white px-6 py-3 shrink-0">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="text-xs text-slate-500">
                            Mostrando <span className="font-bold text-slate-700">{Math.min(((currentPage - 1) * itemsPerPage) + 1, sortedData.length)}</span> a <span className="font-bold text-slate-700">{Math.min(currentPage * itemsPerPage, sortedData.length)}</span> de <span className="font-bold text-slate-700">{sortedData.length}</span> registros
                        </div>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Por página:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none cursor-pointer"
                            >
                                {itemsPerPageOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {summary && summary(sortedData)}
                        {summary && <div className="h-4 w-px bg-slate-200 hidden md:block"></div>}

                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-bold text-slate-700 px-2">
                            {currentPage} / {totalPages || 1}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
