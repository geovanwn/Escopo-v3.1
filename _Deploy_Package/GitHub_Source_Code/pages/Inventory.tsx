import React, { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { UniversalList } from '../components/ui/UniversalList';
import { Product, InvoiceItem } from '../types';
import {
    Package,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownLeft,
    Search,
    Filter,
    MoreHorizontal,
    Box,
    Truck,
    BarChart3,
    ShoppingCart,
    Plus,
    History,
    Download,
    FileText,
    Layers,
    ChevronRight,
    SearchCode,
    Activity,
    Calendar,
    RefreshCw,
    ShieldCheck,
    ArrowDownRight,
    Pencil,
    ArrowUpDown,
    ArrowUp as ArrowUpIcon,
    ArrowDown as ArrowDownIcon,
    ChevronLeft
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { formatDateBR, parseDateSafe } from '../utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Inventory: React.FC = () => {
    const navigate = useNavigate();
    const { invoices, products, addProduct, updateProduct, selectedCompany, addAuditLog } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'stock' | 'movement' | 'cmv' | 'abc'>('stock');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [editingProductId, setEditingProductId] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedEntryYear, setSelectedEntryYear] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const years = useMemo(() => {
        const yearsSet = new Set<string>();
        invoices.forEach(inv => {
            if (inv.date) {
                const y = inv.date.split('-')[0];
                if (y) yearsSet.add(y);
            }
        });
        yearsSet.add(new Date().getFullYear().toString());
        return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
    }, [invoices]);

    const monthsList = [
        { id: 'all', name: 'Ano Completo' },
        { id: '01', name: 'Janeiro' },
        { id: '02', name: 'Fevereiro' },
        { id: '03', name: 'Março' },
        { id: '04', name: 'Abril' },
        { id: '05', name: 'Maio' },
        { id: '06', name: 'Junho' },
        { id: '07', name: 'Julho' },
        { id: '08', name: 'Agosto' },
        { id: '09', name: 'Setembro' },
        { id: '10', name: 'Outubro' },
        { id: '11', name: 'Novembro' },
        { id: '12', name: 'Dezembro' },
    ];

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Product>>({
        name: '',
        code: '',
        unit: 'UN',
        stock: 0,
        price: 0,
        category: '',
        ncm: '',
        status: 'ativo'
    });

    const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    // --- DATA PROCESSING: ENHANCED STOCK & COSTING ---
    const inventoryData = useMemo(() => {
        // 1. Initialize with ALL products (Fix for "Invisible Products")
        const productsMap = new Map();
        products.forEach(p => {
            productsMap.set(p.id, {
                id: p.id,
                name: p.name,
                code: p.code,
                category: p.category || 'Geral',
                minStock: p.minStock || 5,
                unit: p.unit || 'UN',

                // Trackers
                computedStock: p.stock || 0, // Base Manual Stock (Initial)
                avgCost: p.price || 0,       // Base Cost

                // Period Specifics
                inPeriodIn: 0,
                inPeriodOut: 0,
                startPeriodStock: p.stock || 0, // Will adjust
                lastMove: null,
                lastNatureza: 'Saldo Inicial',
                moves: [],
                invoiceYear: 'N/A',
                hasInvoiceEntry: false
            });
        });

        // 2. Sort Invoices Chronologically for WAC accuracy
        const sortedInvoices = [...invoices].filter(i => i.status !== 'cancelada' && i.date).sort((a, b) => a.date.localeCompare(b.date));

        // 3. Process Movements
        sortedInvoices.forEach(inv => {
            if (inv.type === 'service' || inv.type === 'receipt') return;
            const docDate = parseDateSafe(inv.date);
            const [y, mStr] = inv.date.split('-');
            const m = parseInt(mStr);
            const refYear = parseInt(selectedYear);
            const refMonth = selectedMonth === 'all' ? -1 : parseInt(selectedMonth);

            // Period Check Helpers
            const isBeforePeriod = docDate.getFullYear() < refYear || (docDate.getFullYear() === refYear && refMonth !== -1 && (m < refMonth));
            const isWithinPeriod = docDate.getFullYear() === refYear && (refMonth === -1 || m === refMonth);
            // Notes in future are ignored for "Current" calculation relative to report, 
            // but usually we want "Real Time" or "End of Selected Period". 
            // Here we stick to "Up to End of Selected Period" logic.
            const isAfterPeriod = docDate.getFullYear() > refYear || (docDate.getFullYear() === refYear && refMonth !== -1 && m > refMonth);

            if (isAfterPeriod) return; // Ignore future relative to report

            inv.items?.forEach(item => {
                const pId = item.productId;
                if (!pId || pId === 'manual') return;

                const productData = productsMap.get(pId);
                if (!productData) return; // Should not happen if initialized from products

                productData.hasInvoiceEntry = true;
                if (inv.type === 'entry') {
                    if (productData.invoiceYear === 'N/A' || y < productData.invoiceYear) {
                        productData.invoiceYear = y;
                    }

                    // --- Weighted Average Cost Calculation (WAC) ---
                    const totalValueBefore = productData.computedStock * productData.avgCost;
                    const entryValue = item.quantity * item.unitPrice;
                    const newTotalQty = productData.computedStock + item.quantity;

                    if (newTotalQty > 0) {
                        productData.avgCost = (totalValueBefore + entryValue) / newTotalQty;
                    } else {
                        productData.avgCost = item.unitPrice;
                    }
                    // -----------------------------------------------

                    productData.computedStock += item.quantity;

                    if (isBeforePeriod) {
                        productData.startPeriodStock += item.quantity;
                    } else if (isWithinPeriod) {
                        productData.inPeriodIn += item.quantity;
                    }

                } else if (inv.type === 'exit') {
                    productData.computedStock -= item.quantity;

                    // Cost doesn't change on exit, only stock reduction

                    if (isBeforePeriod) {
                        productData.startPeriodStock -= item.quantity;
                    } else if (isWithinPeriod) {
                        productData.inPeriodOut += item.quantity;
                    }
                }

                if (!isBeforePeriod) {
                    productData.lastMove = inv.date;
                    productData.lastNatureza = inv.naturezaOperacao || (inv.type === 'entry' ? 'Compra' : 'Venda');
                }

                if (isWithinPeriod) {
                    productData.moves.push({
                        date: inv.date,
                        type: inv.type,
                        qty: item.quantity,
                        price: item.unitPrice, // Unit price of the note
                        costState: productData.avgCost, // Track cost at this moment
                        doc: inv.number
                    });
                }
            });
        });

        // 4. Transform to Array for Grid
        const list = Array.from(productsMap.values()).map(d => {
            const currentStock = d.startPeriodStock + d.inPeriodIn - d.inPeriodOut;
            // Correction: computedStock assumes we ran through EVERYTHING up that reporting date.
            // If the logic above is correct, 'computedStock' at end of loop is effectively 'current' if we didn't skip 'isAfterPeriod'.
            // Because we skipped 'isAfterPeriod', 'computedStock' IS the stock at end of period.

            return {
                id: d.id,
                name: d.name,
                code: d.code,
                category: d.category,
                minStock: d.minStock,
                invoiceYear: d.invoiceYear,

                // Stock Data
                current: d.computedStock, // This is End-of-Period Stock
                totalQty: d.computedStock, // Mapping to computedStock to fix missing property error
                startStock: d.startPeriodStock,
                in: d.inPeriodIn,
                out: d.inPeriodOut,

                // Valuation
                value: d.avgCost, // Final Average Cost
                totalValue: d.computedStock * d.avgCost,

                lastMove: d.lastMove,
                lastNatureza: d.lastNatureza,
                moves: d.moves,
                lowStock: d.computedStock < d.minStock
            };
        });

        // ABC Calculation
        const sortedByValue = [...list].sort((a, b) => b.totalValue - a.totalValue);
        const globalTotal = sortedByValue.reduce((acc, curr) => acc + curr.totalValue, 0);

        let cumulative = 0;
        return sortedByValue.map(item => {
            cumulative += item.totalValue;
            const percent = globalTotal > 0 ? (cumulative / globalTotal) * 100 : 0;
            let classification: 'A' | 'B' | 'C' = 'C';
            if (percent <= 70) classification = 'A';
            else if (percent <= 90) classification = 'B';

            return { ...item, abc: classification };
        });

    }, [invoices, products, selectedYear, selectedMonth]);

    const categories = useMemo(() => {
        const cats = new Set<string>();
        inventoryData.forEach(item => {
            if (item.category) cats.add(item.category);
        });
        return Array.from(cats).sort();
    }, [inventoryData]);

    const entryYears = useMemo(() => {
        const years = new Set<string>();
        inventoryData.forEach(item => {
            if (item.invoiceYear && item.invoiceYear !== 'N/A') years.add(item.invoiceYear);
        });
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [inventoryData]);

    const filteredInventoryData = useMemo(() => {
        return inventoryData.filter(d => {
            const matchesCategory = selectedCategory === 'all' || d.category === selectedCategory;
            const matchesEntryYear = selectedEntryYear === 'all' || d.invoiceYear === selectedEntryYear;
            return matchesCategory && matchesEntryYear;
        });
    }, [inventoryData, selectedCategory, selectedEntryYear]);

    // --- KPI CALCULATIONS ---
    const kpis = useMemo(() => {
        const totalItems = inventoryData.length;
        const lowStockCount = inventoryData.filter(d => d.lowStock).length;
        const totalValue = inventoryData.reduce((sum, d) => sum + d.totalValue, 0);
        const cmv = inventoryData.reduce((sum, d) => sum + (d.out * d.value), 0);
        const accuracy = 98.4; // Simulation

        return { totalItems, lowStockCount, totalValue, cmv, accuracy };
    }, [inventoryData]);

    // --- PDF GENERATOR: LIVRO DE INVENTÁRIO (MODELO 7) ---
    const generateInventoryBook = () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        const now = new Date();
        const year = selectedYear;
        const month = selectedMonth;
        const dateStr = month === 'all'
            ? `31/12/${year}`
            : format(new Date(parseInt(year), parseInt(month), 0), 'dd/MM/yyyy');

        // Header
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('REGISTRO DE INVENTÁRIO', 148, 15, { align: 'center' });

        doc.setFontSize(9);
        doc.text(`EMPRESA: ${selectedCompany?.razaoSocial || 'EMPRESA TESTE LTDA'}`, 15, 25);
        doc.text(`CNPJ: ${selectedCompany?.cnpj || '00.000.000/0001-00'}`, 15, 30);
        doc.text(`POSIÇÃO EM: ${dateStr}`, 282, 25, { align: 'right' });
        doc.text('MODELO 7', 282, 30, { align: 'right' });

        const tableBody = inventoryData.map(item => [
            item.code,
            item.name,
            'UN',
            item.current.toString(),
            currency(item.value).replace('R$', '').trim(),
            currency(item.totalValue).replace('R$', '').trim(),
            'PRÓPRIO',
            item.category
        ]);

        autoTable(doc, {
            startY: 40,
            head: [['CÓDIGO', 'DISCRIMINAÇÃO', 'UNID', 'QUANTIDADE', 'VALOR UNIT', 'VALOR TOTAL', 'TIPO POSSE', 'OBSERVAÇÕES']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [40, 40, 40], textColor: 255, fontSize: 7, halign: 'center' },
            bodyStyles: { fontSize: 7, halign: 'center' },
            columnStyles: {
                1: { halign: 'left', cellWidth: 80 },
                5: { halign: 'right' },
            }
        });

        // Footer Summary
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFont('helvetica', 'bold');
        doc.text(`VALOR TOTAL DO INVENTÁRIO: ${currency(kpis.totalValue)}`, 282, finalY, { align: 'right' });

        doc.save(`Livro_Inventario_${year}.pdf`);
        addAuditLog('export', 'inventory', 'all', 'Generated Inventory Book PDF (Model 7)');
    };

    const handleOpenCreateModal = () => {
        setEditingProductId(null);
        setFormData({
            name: '',
            code: '',
            unit: 'UN',
            stock: 0,
            price: 0,
            category: '',
            ncm: '',
            status: 'ativo'
        });
        setIsProductModalOpen(true);
    };

    const handleEditClick = (item: any) => {
        const product = products.find(p => p.id === item.id);
        if (product) {
            setEditingProductId(product.id);
            setFormData({
                name: product.name,
                code: product.code,
                unit: product.unit,
                stock: product.stock,
                price: product.price,
                category: product.category,
                ncm: product.ncm,
                status: product.status
            });
            setIsProductModalOpen(true);
        }
    };

    const handleCreateProduct = async () => {
        if (!formData.name || !formData.code) return;

        if (editingProductId) {
            const updatedProduct: Product = {
                ...products.find(p => p.id === editingProductId)!,
                name: formData.name!,
                code: formData.code!,
                unit: formData.unit || 'UN',
                stock: Number(formData.stock) || 0,
                price: Number(formData.price) || 0,
                category: formData.category || 'Geral',
                ncm: formData.ncm || '',
                status: (formData.status as any) || 'ativo'
            };
            await updateProduct(updatedProduct);
            addAuditLog('update', 'inventory', editingProductId, `Updated product: ${formData.name}`);
        } else {
            const product: Product = {
                id: Math.random().toString(36).substr(2, 9),
                name: formData.name!,
                code: formData.code!,
                unit: formData.unit || 'UN',
                stock: Number(formData.stock) || 0,
                price: Number(formData.price) || 0,
                category: formData.category || 'Geral',
                ncm: formData.ncm || '',
                status: 'ativo',
                companyId: selectedCompany?.id || '1'
            };
            await addProduct(product);
            addAuditLog('create', 'inventory', product.id, `Created product: ${formData.name}`);
        }
        setIsProductModalOpen(false);
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 -m-6 p-6 overflow-hidden">

            {/* 1. TOP HEADER BAR - REFINED */}
            <header className="flex justify-between items-center mb-4 shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-200">
                        <Box className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Gestão de Estoques</h1>
                        <p className="text-xs text-slate-500 font-medium">Controle de mercadorias, Kardex e Inventário Fiscal</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex gap-1 pr-2 border-r border-slate-100">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg">
                            <span className="text-[10px] font-black uppercase">Inventário:</span>
                            <span className="text-xs font-bold">{selectedYear}{selectedMonth !== 'all' ? `/${selectedMonth}` : ''}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleOpenCreateModal}
                        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-xs font-black shadow-lg shadow-green-500/20 hover:scale-105 transition-all"
                    >
                        <Plus size={16} /> Novo Produto
                    </button>

                    <button
                        onClick={generateInventoryBook}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Download size={16} /> Modelo 7
                    </button>

                    <div className="h-6 w-px bg-slate-200 mx-1"></div>

                    <button
                        onClick={() => navigate('/app/fiscal')}
                        className="p-2.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                        title="Comprar / Lançar Nota"
                    >
                        <ShoppingCart size={18} />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex flex-col overflow-hidden gap-4 min-h-0">

                {/* 2. KPI GRID - MODERNIZED */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 shrink-0">
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group">
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">Total em Ativos</p>
                            <p className="text-lg font-bold text-slate-900 mt-0.5">{currency(kpis.totalValue)}</p>
                        </div>
                        <div className="p-2.5 bg-green-50 text-green-600 rounded-lg group-hover:scale-110 transition-transform"><TrendingUp className="w-5 h-5" /></div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group">
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">Risco de Ruptura</p>
                            <p className="text-lg font-bold text-red-600 mt-0.5">{kpis.lowStockCount} Itens</p>
                        </div>
                        <div className="p-2.5 bg-red-50 text-red-600 rounded-lg group-hover:scale-110 transition-transform"><AlertTriangle className="w-5 h-5" /></div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group">
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">Giro Mensal</p>
                            <p className="text-lg font-bold text-blue-600 mt-0.5">1.24x</p>
                        </div>
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform"><Activity className="w-5 h-5" /></div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group">
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">CMV Projetado</p>
                            <p className="text-lg font-bold text-slate-900 mt-0.5">{currency(kpis.cmv)}</p>
                        </div>
                        <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg group-hover:scale-110 transition-transform"><BarChart3 className="w-5 h-5" /></div>
                    </div>
                </div>

                {/* YEAR SUMMARY - NEW */}
                {entryYears.length > 0 && (
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm shrink-0">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <h3 className="text-xs font-black uppercase text-slate-700">Produtos por Ano da Nota Fiscal</h3>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {entryYears.map(year => {
                                const yearProducts = inventoryData.filter(item => item.invoiceYear === year);
                                const yearValue = yearProducts.reduce((sum, item) => sum + item.totalValue, 0);
                                return (
                                    <button
                                        key={year}
                                        onClick={() => setSelectedEntryYear(year)}
                                        className={`p-2 rounded-lg border-2 transition-all text-left flex-shrink-0 min-w-[100px] ${selectedEntryYear === year
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-100 hover:border-blue-200 hover:bg-blue-50/50'
                                            }`}
                                    >
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Ano {year}</p>
                                        <p className="text-base font-bold text-slate-900 mt-0.5">{yearProducts.length}</p>
                                        <p className="text-[9px] font-bold text-blue-600 mt-0.5">{currency(yearValue)}</p>
                                    </button>
                                );
                            })}
                            {selectedEntryYear !== 'all' && (
                                <button
                                    onClick={() => setSelectedEntryYear('all')}
                                    className="p-2 rounded-lg border-2 border-slate-200 hover:border-slate-300 bg-slate-50 transition-all text-left flex-shrink-0 min-w-[100px]"
                                >
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Limpar</p>
                                    <p className="text-base font-bold text-slate-900 mt-0.5">Todos</p>
                                    <p className="text-[9px] font-bold text-slate-600 mt-0.5">Ver tudo</p>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. MAIN WORKSPACE */}
                <div className="flex-1 min-h-0 p-1">
                    <UniversalList
                        title=""
                        data={filteredInventoryData}
                        searchPlaceholder="Pesquisar SKU ou Nome..."
                        columns={[
                            {
                                header: 'Produto & Categoria', accessor: (item: any) => (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-800 font-black text-xs shadow-sm shadow-slate-100 group-hover:bg-green-600 group-hover:text-white transition-all">
                                            {item.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{item.name}</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                {item.code} • {item.category}
                                                {item.invoiceYear !== 'N/A' && <span className="ml-2 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">NF {item.invoiceYear}</span>}
                                            </p>
                                        </div>
                                    </div>
                                ), className: "px-6 py-4 min-w-[300px]"
                            },
                            {
                                header: 'Status', accessor: (item: any) => item.lowStock ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-[9px] font-black uppercase ring-1 ring-red-100">Reposição</span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-600 text-[9px] font-black uppercase ring-1 ring-green-100">Ok</span>
                                ), className: "text-center px-4 py-4 w-32"
                            },
                            { header: 'Qtd Total', accessor: 'totalQty', className: "text-center px-4 py-4 w-24 font-black text-slate-800" },
                            {
                                header: 'Em Estoque', accessor: (item: any) => (
                                    <div className="flex flex-col items-center">
                                        <p className={`text-sm font-black ${item.lowStock ? 'text-red-600' : 'text-slate-800'}`}>{item.current}</p>
                                        <div className="w-12 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                            <div className={`h-full ${item.lowStock ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min((item.current / (item.minStock * 3)) * 100, 100)}%` }} />
                                        </div>
                                    </div>
                                ), className: "text-center px-4 py-4 w-32"
                            },
                            { header: 'Custo Médio', accessor: (item: any) => currency(item.value), className: "text-right px-4 py-4 w-32 font-bold text-slate-700" },
                            { header: 'Valor Total', accessor: (item: any) => currency(item.totalValue), className: "text-right px-4 py-4 w-32 font-black text-slate-900", sortKey: 'totalValue' },
                            {
                                header: 'Natureza', accessor: (item: any) => (
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md max-w-[120px] truncate block mx-auto">{item.lastNatureza}</span>
                                ), className: "text-center px-4 py-4 w-32"
                            }
                        ]}
                        customFilters={
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50/50 rounded-lg border border-green-100 whitespace-nowrap">
                                    <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Ano:</span>
                                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent text-xs font-bold text-green-700 outline-none cursor-pointer">
                                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50/50 rounded-lg border border-green-100 whitespace-nowrap">
                                    <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Período:</span>
                                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-xs font-bold text-green-700 outline-none cursor-pointer">
                                        {monthsList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                    <Filter size={14} className="text-slate-400" />
                                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-transparent text-xs font-bold text-slate-600 outline-none cursor-pointer">
                                        <option value="all">Todas Categorias</option>
                                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                    <Calendar size={14} className="text-slate-400" />
                                    <select value={selectedEntryYear} onChange={(e) => setSelectedEntryYear(e.target.value)} className="bg-transparent text-xs font-bold text-slate-600 outline-none cursor-pointer">
                                        <option value="all">Ano da NF (Todos)</option>
                                        {entryYears.map(year => <option key={year} value={year}>NF de {year}</option>)}
                                    </select>
                                </div>
                            </div>
                        }
                        actions={(item: any) => (
                            <div className="flex items-center justify-end gap-2">
                                <button onClick={() => navigate('/app/crm', { state: { targetRegistry: 'products', targetProductId: item.id } })} className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg transition-all" title="Acessar Cadastro"><FileText size={14} /></button>
                                <button onClick={() => handleEditClick(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Editar Produto"><Pencil size={14} /></button>
                            </div>
                        )}
                        summary={(items) => (
                            <div className="text-sm font-black text-slate-900">
                                Total do Inventário: <span className="text-green-600">{currency(items.reduce((sum, i) => sum + (i as any).totalValue, 0))}</span>
                            </div>
                        )}
                    />
                </div>
            </div>

            {/* PRODUCT MODAL - REFINED */}
            <Modal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                title={editingProductId ? "Editar Produto / Estoque" : "Novo Lançamento de Estoque"}
                maxWidth="max-w-xl"
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Descrição</label>
                            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-green-500/10 placeholder:text-slate-300 outline-none transition-all" placeholder="Nome comercial do item" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">SKU / Código</label>
                            <input type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-4 focus:ring-green-500/10 outline-none transition-all" placeholder="ID-0000" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Unidade</label>
                            <select value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-green-500/10 outline-none transition-all">
                                <option value="UN">Unidade (UN)</option>
                                <option value="KG">Kilograma (KG)</option>
                                <option value="LT">Litro (LT)</option>
                                <option value="PC">Peça (PC)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Saldo Inicial</label>
                            <input type="number" value={formData.stock} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-green-500/10 outline-none transition-all" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Preço Custo</label>
                            <input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-green-500/10 outline-none transition-all" />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                        <Button variant="outline" onClick={() => setIsProductModalOpen(false)}>Cancelar</Button>
                        <Button variant="primary" className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20" onClick={handleCreateProduct}>
                            {editingProductId ? "Salvar Alterações" : "Confirmar Cadastro"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Inventory;
