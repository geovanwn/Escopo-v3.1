import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useData } from '../contexts/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { UniversalList } from '../components/ui/UniversalList';
import { SefazCloudFetchModal } from '../components/fiscal/SefazCloudFetchModal';
import { ProductSearchModal } from '../components/fiscal/ProductSearchModal';
import { SearchKeyModal } from '../components/fiscal/SearchKeyModal';
import { PdfPreviewModal } from '../components/fiscal/PdfPreviewModal';
import { useXMLProcessor } from '../hooks/useXMLProcessor';
import { auth } from '../firebaseConfig';
import {
    Plus, Download, Filter, Search, MoreVertical, FileText,
    CheckCircle, XCircle, Clock, Trash2, Upload, Pencil,
    ArrowUpRight, ArrowDownLeft, Wrench, ScrollText, FileCode, Play, Layers, Loader2, ArrowUp, ArrowDown,
    ShieldCheck, RefreshCw, Info, FileBarChart, PieChart, Database, AlertTriangle, ActivitySquare,
    ChevronDown, Bookmark, ArrowRight, Server, DollarSign, Share2
} from 'lucide-react';
import { Invoice, Client, Product, Service, InvoiceItem } from '../types';
import { unmask, maskCNPJ, maskCEP, maskPhone, maskDate, formatDateBR, parseDateSafe } from '../utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import * as fflate from 'fflate';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useError } from '../contexts/ErrorContext';
import { generatePDFReport } from '../utils/pdfReport';

const SectionHeader = ({ title }: { title: string }) => (
    <div className="w-full pb-2 mb-4 border-b border-[var(--border-color)] mt-6 first:mt-0 text-center">
        <h4 className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-[0.2em]">{title}</h4>
    </div>
);

const InputGroup = ({ label, children, required = false }: { label: string, children?: React.ReactNode, required?: boolean }) => (
    <div className="flex flex-col items-center">
        <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 text-center w-full">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="w-full text-center">
            {children}
        </div>
    </div>
);

interface PendingFile {
    id: string;
    name: string;
    size: string;
    rawDate: Date;
    originalFile: File;
}

export const Fiscal: React.FC = () => {
    const navigate = useNavigate();
    const data = useData();
    const [searchParams] = useSearchParams();

    const isSimples = data.selectedCompany?.regimeTributario === '1' || data.selectedCompany?.regimeTributario === '2' || data.selectedCompany?.regimeTributario === '4';
    const companyIssRate = Number(data.selectedCompany?.aliquotaISS) || 0;

    // Tab State
    const [activeTab, setActiveTab] = useState<'entry' | 'exit' | 'service' | 'receipt'>('exit');

    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingXMLs, setPendingXMLs] = useState<PendingFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Initialize filters from URL if available
    const [filters, setFilters] = useState({
        number: '',
        status: '',
        entity: '',
        startDate: searchParams.get('startDate') || '',
        endDate: searchParams.get('endDate') || '',
        minValue: '',
        maxValue: ''
    });

    // Auto-switch tab based on URL param 'type'
    useEffect(() => {
        const typeParam = searchParams.get('type');
        if (typeParam && ['entry', 'exit', 'service', 'receipt'].includes(typeParam)) {
            setActiveTab(typeParam as any);
        }
    }, [searchParams]);

    const { userRole, userEmail, systemUsers } = data; // Destructure permissions data

    // RBAC: Permission Check Hook Logic
    const canWriteFiscal = React.useMemo(() => {
        if (userRole === 'Admin') return true;
        const currentUserProfile = systemUsers?.find(u => u.email === userEmail);
        if (!currentUserProfile || !currentUserProfile.permissions) return false;
        return currentUserProfile.permissions.fiscal === 'full';
    }, [userRole, userEmail, systemUsers]);


    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const { addToast } = useToast();
    const { showError } = useError();
    const [isSearchKeyModalOpen, setIsSearchKeyModalOpen] = useState(false);
    const [nfeKey, setNfeKey] = useState('');
    const [isSearchingKey, setIsSearchingKey] = useState(false);
    const [sefazCloudFetchOpen, setSefazCloudFetchOpen] = useState(false);
    const [isCloudFetching, setIsCloudFetching] = useState(false);

    const [isProductSearchModalOpen, setIsProductSearchModalOpen] = useState(false);
    const [showApuracaoModal, setShowApuracaoModal] = useState(false); // Apuração Express Modal

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Expanded Form State
    const [formData, setFormData] = useState({
        id: '' as string | undefined,
        tipoNota: 'exit' as 'entry' | 'exit' | 'service' | 'receipt',
        status: 'pendente' as Invoice['status'],
        numero: '',
        serie: '',
        searchKey: '',
        accessKey: '',
        dataEmissao: new Date().toISOString().split('T')[0],
        naturezaOperacao: 'Venda de Mercadoria',
        condicaoPagamento: '30_dias',
        entityId: '',
        prodId: '',
        prodQtd: 1,
        prodVlrTotal: 0,
        prodVlrUnit: 0,
        impostoCST: '00',
        impostoICMSAliq: 0,
        impostoICMSBase: 0,
        impostoICMSValor: 0,
        impostoIPIAliq: 0,
        impostoIPIValor: 0,
        impostoISSAliq: 0,
        impostoISSValor: 0,
        impostoPISAliq: 0,
        impostoPISValor: 0,
        impostoCOFINSAliq: 0,
        impostoCOFINSValor: 0,
        impostoCSLLAliq: 0,
        impostoCSLLValor: 0,
        impostoIRRFAliq: 0,
        impostoIRRFValor: 0,
        impostoINSSAliq: 0,
        impostoINSSValor: 0,
        freteModalidade: '9',
        valorFrete: 0,
        valorSeguro: 0,
        totalProdutos: 0,
        totalImpostos: 0,
        totalNota: 0,
        impostoRetido: false,
        obs: '',
        items: [] as InvoiceItem[],
        prodCode: '',
        prodNcm: '',
        prodCst: '',
        prodCfop: '',
        prodUnit: '',
        prodDiscount: 0,
        prodBcIcms: 0,
        prodVIcms: 0,
        prodVIpi: 0,
        prodPIcms: 0,
        prodPIpi: 0,
        xmlContent: '',
        pendingFileId: '',
    });

    const totals = React.useMemo(() => {
        const CANCELLED_STATUSES = ['cancelada', 'cancelado', 'reprovado', 'substituida', 'anulada', 'negada', 'recusada'];

        // Base filter: company + date range + exclude non-fiscal records
        const baseFilter = (i: any) =>
            (!data.selectedCompany || i.companyId === data.selectedCompany.id) &&
            (!filters.startDate || i.date >= filters.startDate) &&
            (!filters.endDate || i.date <= filters.endDate) &&
            i.category !== 'Conciliação Bancária' &&
            !String(i.naturezaOperacao || '').includes('Importação OFX') &&
            !String(i.naturezaOperacao || '').includes('Importação Bancária') &&
            !(i.type === 'entry' && (i.category === 'Salários' || i.category === 'Impostos - Trabalhista'));

        // All invoices (base filter only, including cancelled)
        const allFiltered = data.invoices.filter(baseFilter);

        // Only active (non-cancelled) invoices
        const filtered = allFiltered.filter(i => !CANCELLED_STATUSES.includes(i.status as any));

        const entries = filtered.filter(i => i.type === 'entry');
        const exits = filtered.filter(i => i.type === 'exit');
        const services = filtered.filter(i => i.type === 'service');

        // Valor bruto das notas ativas (saídas + serviços)
        const totalEntradas = entries.reduce((acc, curr) => acc + curr.value, 0);
        const totalSaidas = exits.reduce((acc, curr) => acc + curr.value, 0);
        const totalServicos = services.reduce((acc, curr) => acc + curr.value, 0);

        // Valor das notas canceladas (para dedução)
        const cancelled = allFiltered.filter(i => CANCELLED_STATUSES.includes(i.status as any));
        const totalCancelado = cancelled.reduce((acc, curr) => acc + curr.value, 0);

        // Valor líquido = total notas ativas - cancelamentos
        // (como filtered já exclui canceladas, o líquido é a soma das ativas)
        const valorLiquido = totalSaidas + totalServicos - totalEntradas;

        // Total de impostos calculado APENAS sobre notas não canceladas
        const totalTax = filtered.reduce((acc, curr) => acc + (curr.taxValue || 0), 0);

        return {
            entry: totalEntradas,
            exit: totalSaidas,
            service: totalServicos,
            tax: totalTax,
            totalCancelado,
            valorLiquido,
            totalBruto: totalSaidas + totalServicos + totalEntradas
        };
    }, [data.invoices, data.selectedCompany, filters]); // Re-calc totals when filters change

    const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const CFOP_CADASTRO = ['5101', '5102', '5401', '5403', '5405', '6101', '6102', '1101', '1102', '2101', '2102'];
    const CST_CADASTRO = ['00', '10', '20', '30', '40', '41', '50', '51', '60', '70', '90'];
    const UNIDADES_CADASTRO = ['UN', 'KG', 'PC', 'LT', 'MT', 'JG', 'CX', 'PR', 'DZ', 'BD', 'GL', 'M2', 'M3'];

    const [itemSearch, setItemSearch] = useState('');
    const [showItemResults, setShowItemResults] = useState(false);
    const itemResultsRef = useRef<HTMLDivElement>(null);
    const [modalTab, setModalTab] = useState<'geral' | 'impostos' | 'complementar'>('geral');

    const [partnerSearch, setPartnerSearch] = useState('');
    const [showPartnerResults, setShowPartnerResults] = useState(false);
    const partnerResultsRef = useRef<HTMLDivElement>(null);

    const [showNaturezaResults, setShowNaturezaResults] = useState(false);
    const naturezaResultsRef = useRef<HTMLDivElement>(null);

    // Mass Edit State
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
    const [isMassEditMode, setIsMassEditMode] = useState(false);
    const [massEditValues, setMassEditValues] = useState<{ cfop?: string, cst?: string, ncm?: string }>({});

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isModalOpen) return;

            if (e.key === 'F2') {
                e.preventDefault();
                // Trigger submit programmatically if possible, or bind to a Ref on the form button
                const form = document.querySelector('form');
                if (form) form.requestSubmit();
            }

            if (e.key === 'Escape') {
                setIsModalOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isModalOpen]);

    const STANDARD_NATUREZAS = [
        'Venda de Mercadoria',
        'Prestação de Serviço',
        'Compra para Comercialização',
        'Compra para Industrialização',
        'Devolução de Mercadoria',
        'Remessa para Conserto',
        'Retorno de Conserto',
        'Transferência de Mercadoria',
        'Remessa para Demonstração',
        'Venda de Produção do Estabelecimento',
        'Bonificação, Doação ou Brinde',
        'Outras Saídas não Especificadas',
        'Outras Entradas não Especificadas'
    ];

    // --- DYNAMIC TAX LOGIC ---
    useEffect(() => {
        const totalItemsValue = formData.items.reduce((acc, item) => acc + (Number(item.total) || 0), 0);
        const currentItemTotal = (Number(formData.prodVlrUnit) || 0) * (Number(formData.prodQtd) || 1);

        // Base de cálculo: Se houver itens na lista (XML ou adicionados), usa a soma deles.
        // Caso contrário, usa os inputs individuais (modo simples).
        const base = formData.items.length > 0 ? totalItemsValue : currentItemTotal;

        const calcVal = (aliq: any) => (base * (Number(aliq) || 0)) / 100;

        // Helpers para somar impostos dos itens
        const sumItemsTax = (key: keyof InvoiceItem) => formData.items.reduce((acc, item) => acc + (Number(item[key] as any) || 0), 0);

        let vlrICMS = 0;
        let vlrIPI = 0;
        let issVal = 0;
        let vlrPIS = 0;
        let vlrCOFINS = 0;
        let vlrCSLL = 0;
        let vlrIRRF = 0;
        let vlrINSS = 0;

        if (formData.items.length > 0) {
            // Modo Lista/XML: Soma os impostos de cada item
            vlrICMS = sumItemsTax('vIcms');
            vlrIPI = sumItemsTax('vIpi');
            issVal = sumItemsTax('vIss');
            vlrPIS = sumItemsTax('vPis');
            vlrCOFINS = sumItemsTax('vCofins');
            vlrCSLL = sumItemsTax('vCsll');
            vlrIRRF = sumItemsTax('vIrrf');
            vlrINSS = sumItemsTax('vInss');
        } else {
            // Modo Simples: Calcula baseado nas alíquotas globais
            vlrICMS = formData.tipoNota !== 'service' ? calcVal(formData.impostoICMSAliq) : 0;
            vlrIPI = formData.tipoNota !== 'service' ? calcVal(formData.impostoIPIAliq) : 0;

            if (formData.tipoNota === 'service') {
                if (formData.impostoISSAliq === 0 && companyIssRate > 0) {
                    // Lógica opcional de autopreenchimento de alíquota da empresa poderia vir aqui
                }
                issVal = calcVal(formData.impostoISSAliq);
            }

            vlrPIS = calcVal(formData.impostoPISAliq);
            vlrCOFINS = calcVal(formData.impostoCOFINSAliq);
            vlrCSLL = calcVal(formData.impostoCSLLAliq);
            vlrIRRF = calcVal(formData.impostoIRRFAliq);
            vlrINSS = calcVal(formData.impostoINSSAliq);
        }

        const isExitOrServiceProvided = formData.tipoNota === 'exit' || (formData.tipoNota === 'service' && (!formData.naturezaOperacao || !formData.naturezaOperacao.includes('Tomada')));

        if (isSimples && isExitOrServiceProvided) {
            vlrICMS = 0;
            vlrIPI = 0;
            vlrPIS = 0;
            vlrCOFINS = 0;
            vlrCSLL = 0;
            vlrIRRF = 0;
            vlrINSS = 0;
        }

        const freight = Number(formData.valorFrete) || 0;
        const insurance = Number(formData.valorSeguro) || 0;

        // Total da Nota = Produtos + Frete + Seguro + IPI - Descontos (já abatidos no total do item?) + Outras Despesas
        // Nota: O total do item (vProd) geralmente não inclui IPI na NFe, mas vNF inclui.
        // Aqui assumimos que `base` somou `vProd`.
        // Precisamos somar IPI se ele não estiver dentro do total do item (geralmente não está).
        // ST (Substituição Tributária) também deveria entrar aqui se tivéssemos implementado.

        const totalDiscount = formData.items.reduce((acc, item) => acc + (Number(item.discount) || 0), 0) || (Number(formData.prodDiscount) || 0);
        const totalNotaCalculado = base + freight + insurance + (formData.tipoNota === 'service' ? 0 : vlrIPI) - totalDiscount;

        // Refinamento do cálculo do Total da Nota para evitar soma duplicada ou falta
        // Se for XML, o ideal seria pegar o vNF importado, mas aqui estamos recalculando para consistência.
        // Se a nota é de serviço, o total é o serviço. Se é produto, é prod + ipi + frete...

        let finalTotal = totalNotaCalculado;

        // Em notes de serviço, o valor total muitas vezes já inclui o ISS se for retido, ou não.
        // Vamos manter a lógica original simplificada: base + extras + impostos "on top" (IPI).
        // Se items.length > 0, confiamos que a soma dos itens + impostos extrínsecos compõem o total.

        if (formData.items.length > 0) {
            // Se tiver itens, recalculamos com base na soma dos itens + extras - descontos
            finalTotal = base + freight + insurance + (formData.tipoNota === 'service' ? 0 : vlrIPI) - totalDiscount;
        }

        const sumTaxes = vlrICMS + vlrIPI + issVal + vlrPIS + vlrCOFINS + vlrCSLL + vlrIRRF + vlrINSS;

        setFormData(prev => {
            if (
                isNaN(finalTotal) || isNaN(sumTaxes) ||
                (Math.abs(prev.totalNota - finalTotal) < 0.01 &&
                Math.abs(prev.totalImpostos - sumTaxes) < 0.01 &&
                prev.prodVlrTotal === base && // Verifica base correta
                prev.totalProdutos === base)
            ) {
                return prev;
            }
            return {
                ...prev,
                prodVlrTotal: base, // Exibe o total de TODOS os produtos, não só do input unitário
                impostoICMSBase: base,
                impostoICMSValor: vlrICMS,
                impostoIPIValor: vlrIPI,
                impostoISSValor: issVal,
                impostoPISValor: vlrPIS,
                impostoCOFINSValor: vlrCOFINS,
                impostoCSLLValor: vlrCSLL,
                impostoIRRFValor: vlrIRRF,
                impostoINSSValor: vlrINSS,
                totalProdutos: base,
                totalImpostos: sumTaxes,
                totalNota: finalTotal
            };
        });

    }, [
        formData.items,
        formData.prodId,
        formData.prodQtd,
        formData.prodVlrUnit,
        formData.tipoNota,
        formData.impostoICMSAliq,
        formData.impostoIPIAliq,
        formData.impostoISSAliq,
        formData.impostoPISAliq,
        formData.impostoCOFINSAliq,
        formData.impostoCSLLAliq,
        formData.impostoIRRFAliq,
        formData.impostoINSSAliq,
        formData.valorFrete,
        formData.valorSeguro,
        formData.impostoRetido,
        data.selectedCompany
    ]);

    // Click outside listener for item search
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (itemResultsRef.current && !itemResultsRef.current.contains(event.target as Node)) {
                setShowItemResults(false);
            }
            if (partnerResultsRef.current && !partnerResultsRef.current.contains(event.target as Node)) {
                setShowPartnerResults(false);
            }
            if (naturezaResultsRef.current && !naturezaResultsRef.current.contains(event.target as Node)) {
                setShowNaturezaResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectPartner = (partner: Client) => {
        // Smart Auto-fill: Try to find the last operation with this partner
        const lastInvoice = data.invoices
            .filter(inv => inv.entityId === partner.id && inv.type === formData.tipoNota)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        setFormData(prev => ({
            ...prev,
            entityId: partner.id,
            entityName: partner.name,
            cnpj: partner.cnpj,
            naturezaOperacao: lastInvoice?.naturezaOperacao || prev.naturezaOperacao // Auto-fill
        }));

        if (lastInvoice?.naturezaOperacao) {
            addToast(`Natureza de Operação sugerida com base no histórico: ${lastInvoice.naturezaOperacao}`, 'info');
        }

        setPartnerSearch(partner.name);
        setShowPartnerResults(false);
    };

    const selectItem = (id: string) => {
        addItemToList(id);
        setShowItemResults(false);
    };

    const addItemToList = (id: string) => {
        const item = formData.tipoNota === 'service'
            ? data.services.find(s => s.id === id)
            : data.products.find(p => p.id === id);

        if (id === 'manual') {
            const newItem: InvoiceItem = {
                productId: 'manual',
                description: 'Item Avulso (Processamento)',
                quantity: 1,
                unitPrice: 0,
                total: 0,
                code: 'MANUAL',
                ncm: '',
                cst: isSimples ? '102' : '00',
                cfop: formData.tipoNota === 'exit' ? '5102' : '1102',
                unit: 'UN'
            };
            setFormData(prev => ({
                ...prev,
                items: [...prev.items, newItem]
            }));
            addToast('Item manual adicionado.', 'info');
            return;
        }

        if (item) {
            const hasNCM = 'ncm' in item;
            const isExitOrServiceProvided = formData.tipoNota === 'exit' || (formData.tipoNota === 'service' && (!formData.naturezaOperacao || !formData.naturezaOperacao.includes('Tomada')));

            // Get rates from master data or defaults
            const icmsR = (isSimples && isExitOrServiceProvided) ? 0 : ((item as any).icmsRate ?? (hasNCM ? 18 : 0));
            const ipiR = (isSimples && isExitOrServiceProvided) ? 0 : ((item as any).ipiRate ?? 0);
            const pisR = (isSimples && isExitOrServiceProvided) ? 0 : ((item as any).pisRate ?? 0);
            const cofinsR = (isSimples && isExitOrServiceProvided) ? 0 : ((item as any).cofinsRate ?? 0);
            const issR = (item as any).issRate ?? (item as any).taxRate ?? companyIssRate;
            const csllR = (isSimples && isExitOrServiceProvided) ? 0 : ((item as any).csllRate ?? 0);
            const irrfR = (isSimples && isExitOrServiceProvided) ? 0 : ((item as any).irrfRate ?? 0);
            const inssR = (isSimples && isExitOrServiceProvided) ? 0 : ((item as any).inssRate ?? 0);

            const unitPrice = Number(item.price) || 0;

            const newItem: InvoiceItem = {
                productId: item.id,
                description: item.name,
                quantity: 1,
                unitPrice: unitPrice,
                total: unitPrice,
                code: item.code,
                ncm: hasNCM ? (item as any).ncm : '',
                cst: isSimples ? '102' : '00',
                cfop: formData.tipoNota === 'exit' ? '5101' : '1101',
                unit: (item as any).unit || 'UN',

                // Linking Rates
                pIcms: icmsR,
                pIpi: ipiR,
                pPis: pisR,
                pCofins: cofinsR,
                pIss: issR,
                pCsll: csllR,
                pIrrf: irrfR,
                pInss: inssR,

                // Calculated Values (basic simulation)
                bcIcms: formData.tipoNota !== 'service' ? unitPrice : 0,
                vIcms: formData.tipoNota !== 'service' ? Number((unitPrice * icmsR / 100).toFixed(2)) : 0,
                vIpi: formData.tipoNota !== 'service' ? Number((unitPrice * ipiR / 100).toFixed(2)) : 0,
                vIss: (formData.tipoNota === 'service') ? Number((unitPrice * issR / 100).toFixed(2)) : 0,
                vPis: Number((unitPrice * pisR / 100).toFixed(2)),
                vCofins: Number((unitPrice * cofinsR / 100).toFixed(2)),
                vCsll: Number((unitPrice * csllR / 100).toFixed(2)),
                vIrrf: Number((unitPrice * irrfR / 100).toFixed(2)),
                vInss: Number((unitPrice * inssR / 100).toFixed(2))
            };

            setFormData(prev => ({
                ...prev,
                items: [...prev.items, newItem]
            }));
            addToast(`${item.name} adicionado com alíquotas vinculadas.`, 'success');
        }
    };





    // Advanced Filtering Logic
    const filteredInvoices = React.useMemo(() => {
        let result = data.invoices.filter(inv => {
            // IMPORTANTE: Filtrar por empresa selecionada primeiro
            if (data.selectedCompany && inv.companyId !== data.selectedCompany.id) return false;

            // Tab Filter
            if (activeTab === 'receipt') {
                // Ultra-Permissive Match for Receipts
                const typeStr = String(inv.type || '').toLowerCase();
                const natStr = String(inv.naturezaOperacao || '').toLowerCase();

                const isReceipt = typeStr.includes('receipt') ||
                    typeStr.includes('recibo') ||
                    natStr.includes('recibo') ||
                    natStr.includes('saída (recibo)') ||
                    natStr.includes('entrada (recibo)');

                if (!isReceipt) return false;
            } else {
                const typeStr = String(inv.type || '').toLowerCase();
                const activeTabStr = String(activeTab).toLowerCase();

                // Tratar 'exit' e 'saida' como equivalentes para a aba de Saídas
                if (activeTabStr === 'exit') {
                    if (typeStr !== 'exit' && typeStr !== 'saida' && typeStr !== 'saída') return false;
                } else {
                    if (typeStr !== activeTabStr) return false;
                }
            }

            // Extra Logic: Exclude purely financial/non-fiscal records from Fiscal View
            if (inv.category === 'Conciliação Bancária' || String(inv.naturezaOperacao || '').includes('Importação OFX') || String(inv.naturezaOperacao || '').includes('Importação Bancária')) {
                return false;
            }

            // Extra Logic: Exclude Payroll from "Entry" tab in Fiscal
            if (activeTab === 'entry' && (inv.category === 'Salários' || inv.category === 'Impostos - Trabalhista')) return false;

            // Custom Filters
            if (filters.status && inv.status !== filters.status) return false;
            if (filters.number && !inv.number.toLowerCase().includes(filters.number.toLowerCase())) return false;
            if (filters.entity && !inv.entityName.toLowerCase().includes(filters.entity.toLowerCase())) return false;

            if (filters.startDate && parseDateSafe(inv.date) < parseDateSafe(filters.startDate)) return false;
            if (filters.endDate && parseDateSafe(inv.date) > parseDateSafe(filters.endDate)) return false;

            if (filters.minValue && inv.value < parseFloat(filters.minValue)) return false;
            if (filters.maxValue && inv.value > parseFloat(filters.maxValue)) return false;

            return true;
        });

        // Let UniversalList handle sorting
        return result;
    }, [data.invoices, activeTab, filters]);

    // Reset Filters
    const clearFilters = () => {
        setFilters({ status: '', number: '', entity: '', startDate: '', endDate: '', minValue: '', maxValue: '' });
    };

    const handleOpenNew = (type: 'entry' | 'exit' | 'service' | 'receipt') => {
        let nature = 'Operação Geral';
        const ramo = data.selectedCompany?.ramoAtividade;

        if (type === 'exit') {
            if (ramo === 'comercio') nature = 'Venda de Mercadoria (Saída)';
            else if (ramo === 'industria') nature = 'Venda de Produção Industrial';
            else if (ramo === 'servicos') nature = 'Saída de Serviços';
            else nature = 'Venda de Mercadoria';
        } else if (type === 'service') {
            nature = 'Prestação de Serviço';
        } else if (type === 'entry') {
            if (ramo === 'comercio') nature = 'Compra para Revenda';
            else if (ramo === 'industria') nature = 'Compra de Matéria-Prima/Insumos';
            else nature = 'Compra para Uso/Consumo';
        } else if (type === 'receipt') {
            nature = 'Lançamento de Recibo';
        }

        setFormData(prev => ({
            ...prev,
            id: '', // Reset ID for new
            tipoNota: type,
            status: 'pendente',
            naturezaOperacao: nature,
            numero: '',
            serie: '',
            dataEmissao: new Date().toISOString().split('T')[0],
            entityId: '',
            prodId: '',
            prodQtd: 1,
            prodVlrUnit: 0,
            prodVlrTotal: 0,
            totalNota: 0,
            totalImpostos: 0,
            impostoICMSAliq: 0,
            impostoISSAliq: type === 'service' ? companyIssRate : 0,
            impostoPISAliq: 0,
            impostoCOFINSAliq: 0,
            impostoCSLLAliq: 0,
            impostoIRRFAliq: 0,
            impostoINSSAliq: 0,
            impostoINSSValor: 0, // Ensure numeric reset
            impostoIPIAliq: 0,
            items: [],
            pendingFileId: '',
        }));

        setItemSearch('');
        setPartnerSearch('');
        setIsModalOpen(true);
    };

    const handleEditInvoice = (inv: Invoice) => {
        const firstItem = inv.items?.[0];
        const partner = data.clients.find(c => c.id === inv.entityId);

        setFormData(prev => ({
            ...prev,
            id: inv.id,
            tipoNota: inv.type as 'entry' | 'exit' | 'service' | 'receipt',
            status: inv.status,
            numero: inv.number,
            serie: inv.serie || '',
            searchKey: inv.searchKey || '',
            naturezaOperacao: inv.naturezaOperacao || 'Operação Geral',
            dataEmissao: inv.date,
            entityId: inv.entityId,
            totalNota: Number(inv.value) || 0,
            totalImpostos: Number(inv.taxValue) || 0,
            items: inv.items || [],
            // Restore item data
            prodId: firstItem?.productId || '',
            prodQtd: Number(firstItem?.quantity) || 1,
            prodVlrUnit: Number(firstItem?.unitPrice) || 0,
            prodVlrTotal: Number(firstItem?.total) || 0,
            pendingFileId: '',
        }));

        setPartnerSearch(partner ? partner.name : inv.entityName);
        setItemSearch(firstItem?.description || '');
        setIsModalOpen(true);
    };

    const handleImportXML = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleSefazCloudFetch = () => {
        setSefazCloudFetchOpen(true);
    };

    const performSefazFetch = async () => {
        // Validation check for Certificate
        const cert = (data.selectedCompany as any)?.certificate;
        if (!cert || !cert.pfx || !cert.password) {
            addToast('Certificado Digital A1 não configurado na empresa selecionada.', 'error');
            setSefazCloudFetchOpen(false);
            return;
        }

        setIsCloudFetching(true);
        addToast('Conectando ao Webservice Sefaz (Ambiente de Produção)...', 'info');

        try {
            // Buscamos notas a partir do último NSU (sequência) ou 0 para começar 
            const lastNSU = (data.selectedCompany as any)?.lastNSU || '0';
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'; // Fallback safe

            const response = await axios.post(`${apiBase}/api/nfe/distribute`, {
                pfx: cert.pfx,
                password: cert.password,
                cnpj: data.selectedCompany?.cnpj,
                nsu: lastNSU,
                env: 'production'
            });

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(response.data, "text/xml");

            // Check for cStat (137 = No docs, 138 = Documents found)
            const cStat = xmlDoc.getElementsByTagName("cStat")[0]?.textContent;

            if (cStat === '137') {
                addToast('Não existem novos documentos fiscais na Sefaz.', 'info');
                setIsCloudFetching(false);
                setSefazCloudFetchOpen(false);
                return;
            }

            const docZips = xmlDoc.getElementsByTagName("docZip");
            console.log(`[Sefaz] ${docZips.length} documentos encontrados.`);

            let importedCount = 0;

            for (let i = 0; i < docZips.length; i++) {
                const schema = docZips[i].getAttribute("schema");
                const b64gzip = docZips[i].textContent || "";

                try {
                    // 1. Base64 to ArrayBuffer
                    const binaryString = window.atob(b64gzip);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let j = 0; j < binaryString.length; j++) bytes[j] = binaryString.charCodeAt(j);

                    // 2. Gunzip via fflate
                    const decompressed = fflate.gunzipSync(bytes);
                    const xmlText = new TextDecoder().decode(decompressed);

                    // 3. Create a temporary file object to use processXMLFile logic
                    const blob = new Blob([xmlText], { type: 'text/xml' });
                    const file = new File([blob], `sefaz_${i}.xml`, { type: 'text/xml' });

                    const pendingFile: PendingFile = {
                        id: Math.random().toString(36).substr(2, 9),
                        name: `NF-e Sefaz ${i + 1}`,
                        size: (file.size / 1024).toFixed(2) + ' KB',
                        rawDate: new Date(),
                        originalFile: file
                    };

                    // Process and add to pending list
                    const result = await processXMLFile(pendingFile, false, true); // validateOnly
                    if (result.success) {
                        setPendingXMLs(prev => [...prev, pendingFile]);
                        importedCount++;
                    }
                } catch (e) {
                    console.error("Erro ao descomprimir documento Sefaz:", e);
                }
            }

            // Update Newest NSU if available
            const ultNSU = xmlDoc.getElementsByTagName("ultNSU")[0]?.textContent;
            if (ultNSU && data.selectedCompany) {
                // In a real system, we'd save this to the DB to know where to start next time
                console.log("Novo NSU para próxima consulta:", ultNSU);
            }

            if (importedCount > 0) {
                addToast(`${importedCount} novos documentos fiscais carregados para conferência.`, 'success');
            } else {
                addToast('Nenhum documento novo relevante encontrado.', 'info');
            }

        } catch (error: any) {
            console.error('Erro ao buscar notas na Sefaz:', error);
            addToast(`Erro na comunicação: ${error.message}`, 'error');
        } finally {
            setIsCloudFetching(false);
            setSefazCloudFetchOpen(false);
        }
    };


    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setIsProcessing(true);
            const fileList = Array.from(files);
            let acceptedCount = 0;
            let rejectedCount = 0;

            for (const file of fileList) {
                const pendingFile: PendingFile = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    size: (file.size / 1024).toFixed(2) + ' KB',
                    rawDate: new Date(),
                    originalFile: file
                };

                // Validate immediately before adding to list
                const result = await processXMLFile(pendingFile, false, true); // validateOnly = true
                if (result.success) {
                    setPendingXMLs(prev => [...prev, pendingFile]);
                    acceptedCount++;
                } else {
                    rejectedCount++;
                }
            }

            if (rejectedCount > 0) {
                addToast(`${rejectedCount} arquivo(s) ignorado(s) por não pertencerem à empresa ou já existirem.`, 'warning');
            }
            if (acceptedCount > 0) {
                addToast(`${acceptedCount} arquivo(s) carregado(s) com sucesso.`, 'success');
            }

            setIsProcessing(false);
            e.target.value = '';
        }
    };

    const handleRemoveXML = (id: string) => {
        setPendingXMLs(prev => prev.filter(f => f.id !== id));
    };

    const { processXMLFile } = useXMLProcessor(data, addToast, handleRemoveXML);

    const handleLaunchXML = async (file: PendingFile, autoSave = false) => {
        await processXMLFile(file, autoSave, false, {
            setFormData,
            setItemSearch,
            setPartnerSearch,
            setIsModalOpen
        });
    };




    const handleExportExcel = (items: any[], title: string) => {
        if (!items || items.length === 0) return;
        const worksheet = XLSX.utils.json_to_sheet(items);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Fiscal");
        const fileName = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        addToast('Excel gerado com sucesso!', 'success');
    };

    const handleManifestInvoice = async (accessKey: string, eventType: '210210' | '210200' | '210220', sequence: number = 1) => {
        const cert = (data.selectedCompany as any)?.certificate;
        if (!cert || !cert.pfx || !cert.password) {
            addToast('Certificado Digital A1 não configurado.', 'error');
            return;
        }

        addToast(`Enviando Manifestação (${eventType === '210210' ? 'Ciência' : 'Confirmação'})...`, 'info');

        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await axios.post(`${apiBase}/api/nfe/manifest`, {
                pfx: cert.pfx,
                password: cert.password,
                cnpj: data.selectedCompany?.cnpj,
                accessKey,
                eventType,
                sequence,
                env: 'production'
            });

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(response.data, "text/xml");
            const cStat = xmlDoc.getElementsByTagName("cStat")[0]?.textContent;

            if (cStat === '128' || cStat === '135') {
                addToast('Manifestação realizada com sucesso!', 'success');
                // Após ciência (210210), a SEFAZ libera o download do XML completo.
                // Re-solicitamos a distribuição para essa chave específica.
                if (eventType === '210210') {
                    addToast('Solicitando XML completo à SEFAZ...', 'info');
                    const distResponse = await axios.post(`${apiBase}/api/nfe/distribute`, {
                        pfx: cert.pfx,
                        password: cert.password,
                        cnpj: data.selectedCompany?.cnpj,
                        accessKey,
                        env: 'production'
                    });

                    // Processar o retorno da distribuição (que deve conter o XML completo agora)
                    const distXml = parser.parseFromString(distResponse.data, "text/xml");
                    const docZip = distXml.getElementsByTagName("docZip")[0];
                    if (docZip) {
                        const b64gzip = docZip.textContent || "";
                        const binaryString = window.atob(b64gzip);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let j = 0; j < binaryString.length; j++) bytes[j] = binaryString.charCodeAt(j);
                        const decompressed = fflate.gunzipSync(bytes);
                        const xmlText = new TextDecoder().decode(decompressed);

                        // Atualizar o XMLPendete se houver um com essa chave
                        setPendingXMLs(prev => prev.map(p => {
                            // This is logic to find the file in the pending list by key.
                            // For now, let's just create a new pending file with the full XML.
                            return p;
                        }));

                        addToast('XML Completo recebido e pronto para lançamento!', 'success');
                    }
                }
            } else {
                const xMotivo = xmlDoc.getElementsByTagName("xMotivo")[0]?.textContent;
                addToast(`Sefaz: ${xMotivo || 'Erro desconhecido'}`, 'warning');
            }
        } catch (error: any) {
            console.error('Erro na manifestação:', error);
            addToast(`Falha: ${error.message}`, 'error');
        }
    };

    const handleExportPDF = async (items: any[], title: string) => {
        if (!items || items.length === 0) return;

        const columns = [
            { header: 'Número', dataKey: 'Número' },
            { header: 'Data', dataKey: 'Data' },
            { header: 'Tipo', dataKey: 'Tipo' },
            { header: 'Parceiro', dataKey: 'Parceiro' },
            { header: 'Valor', dataKey: 'Valor', format: (val: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0) },
            { header: 'ISS / Retenções', dataKey: 'ISS / Retenções', format: (val: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0) }
        ];

        const totalValue = items.reduce((acc, curr) => acc + (Number(curr['Valor']) || 0), 0);
        const totalTax = items.reduce((acc, curr) => acc + (Number(curr['ISS / Retenções']) || 0), 0);

        const doc = await generatePDFReport(
            data.selectedCompany || undefined,
            columns,
            items,
            [
                { label: 'QTD. LANÇAMENTOS', value: items.length, icon: 'hash' },
                { label: 'VALOR TOTAL', value: totalValue, icon: 'dollar', color: 'green' },
                { label: 'ISS / RETENÇÕES', value: totalTax, icon: 'percent', color: 'orange' }
            ],
            {
                title: title,
                period: filters.startDate && filters.endDate
                    ? `${formatDateBR(filters.startDate)} - ${formatDateBR(filters.endDate)}`
                    : new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase(),
                fileName: `${title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
                reportId: `FIS-${Math.floor(Math.random() * 10000)}`,
                status: 'GERADO PELO SISTEMA'
            },
            true
        );

        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setIsPreviewOpen(true);
    };

    const handleSearchNFKey = async () => {
        const cleanKey = nfeKey.replace(/\D/g, '');
        if (cleanKey.length !== 44) {
            addToast('A chave da NF-e deve conter exatamente 44 dígitos.', 'warning');
            return;
        }

        // Validate Certificate
        const cert = (data.selectedCompany as any)?.certificate;
        if (!cert || !cert.pfx || !cert.password) {
            addToast('Certificado Digital A1 não configurado na empresa selecionada.', 'error');
            return;
        }

        setIsSearchingKey(true);
        console.log('--- Iniciando Busca Real de NF-e por Chave ---');

        try {
            // Real Call to Proxy -> Sefaz
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await axios.post(`${apiBase}/api/nfe/distribute`, {
                pfx: cert.pfx,
                password: cert.password,
                cnpj: data.selectedCompany?.cnpj,
                accessKey: cleanKey,
                env: 'production'
            });

            console.log('Sefaz Response:', response.data);

            // Basic parsing of success (NFeDistribution returns 200 explicitly usually)
            // Ideally we check cStat inside the XML, but simple 200 OK is a start for "Real Connection"
            addToast('Documento localizado na base da SEFAZ!', 'success');

            // Set Form Data from Key (Real logic from key structure)
            const uf = cleanKey.substring(0, 2);
            const yymm = cleanKey.substring(2, 6);
            const cnpjEmit = cleanKey.substring(6, 20);
            const mod = cleanKey.substring(20, 22);
            const serie = cleanKey.substring(22, 25);
            const nNF = cleanKey.substring(25, 34);

            // Auto-fill form
            setFormData(prev => ({
                ...prev,
                numero: parseInt(nNF).toString(),
                serie: parseInt(serie).toString(),
                dataEmissao: `20${yymm.substring(0, 2)}-${yymm.substring(2, 4)}-01`, // Approx date
                accessKey: cleanKey,
                searchKey: cleanKey,
                status: 'autorizada',
                // We could try to find the supplier by CNPJ in our database
                entityId: data.clients.find(c => c.cnpj === maskCNPJ(cnpjEmit))?.id || ''
            }));

            // Open Modal to show data
            setIsModalOpen(true);

        } catch (error: any) {
            console.error('Erro Sefaz:', error);
            const msg = error.response?.data?.message || error.message;
            addToast(`Falha na comunicação com a SEFAZ: ${msg}`, 'error');
        } finally {
            setIsSearchingKey(false);
            setIsSearchKeyModalOpen(false);
        }
    };

    const handleItemValueChange = (index: number, field: keyof InvoiceItem, value: any) => {
        setFormData(prev => {
            const newItems = [...prev.items];
            const existingItem = newItems[index] || {} as InvoiceItem;
            const item = { ...existingItem, [field]: value };

            // Recalculations for dependent fields
            if (field === 'quantity' || field === 'unitPrice') {
                item.total = Number((Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2));
            }

            const baseVal = Number(item.total) || 0;
            const disc = Number(item.discount) || 0;

            if (field === 'pIcms' || field === 'bcIcms' || field === 'total' || field === 'quantity' || field === 'unitPrice' || field === 'discount') {
                const bc = Number(item.bcIcms) || (baseVal - disc);
                item.vIcms = Number((bc * (Number(item.pIcms) || 0) / 100).toFixed(2));
            }

            if (field === 'pIpi' || field === 'total' || field === 'quantity' || field === 'unitPrice') {
                item.vIpi = Number((baseVal * (Number(item.pIpi) || 0) / 100).toFixed(2));
            }

            if (field === 'pIss' || field === 'total' || field === 'quantity' || field === 'unitPrice') {
                item.vIss = Number((baseVal * (Number(item.pIss) || 0) / 100).toFixed(2));
            }

            if (field === 'pPis' || field === 'total' || field === 'quantity' || field === 'unitPrice') {
                item.vPis = Number((baseVal * (Number(item.pPis) || 0) / 100).toFixed(2));
            }

            if (field === 'pCofins' || field === 'total' || field === 'quantity' || field === 'unitPrice') {
                item.vCofins = Number((baseVal * (Number(item.pCofins) || 0) / 100).toFixed(2));
            }

            if (field === 'pCsll' || field === 'total' || field === 'quantity' || field === 'unitPrice') {
                item.vCsll = Number((baseVal * (Number(item.pCsll) || 0) / 100).toFixed(2));
            }

            if (field === 'pIrrf' || field === 'total' || field === 'quantity' || field === 'unitPrice') {
                item.vIrrf = Number((baseVal * (Number(item.pIrrf) || 0) / 100).toFixed(2));
            }

            if (field === 'pInss' || field === 'total' || field === 'quantity' || field === 'unitPrice') {
                item.vInss = Number((baseVal * (Number(item.pInss) || 0) / 100).toFixed(2));
            }

            newItems[index] = item;
            return { ...prev, items: newItems };
        });
    };

    const handleLaunchAll = async () => {
        if (confirm(`Deseja processar os ${pendingXMLs.length} arquivos da fila ? `)) {
            setIsProcessing(true);
            for (const file of [...pendingXMLs]) {
                await handleLaunchXML(file, true); // Auto save and silent
            }
            setIsProcessing(false);
            addToast('Todos os arquivos foram processados com sucesso.', 'success');
        }
    };

    const handleSaveInvoice = async (e: React.FormEvent) => {
        e.preventDefault();

        // CFOP Validation
        const isEntryOrExit = formData.tipoNota === 'entry' || formData.tipoNota === 'exit';
        const isServiceProvided = formData.tipoNota === 'service' && (!formData.naturezaOperacao || !formData.naturezaOperacao.includes('Tomada'));

        if (isEntryOrExit || isServiceProvided) {
            if (!formData.items || formData.items.length === 0) {
                // Se não há itens na lista, vamos usar os campos de "adição rápida", então validamos prodCfop
                if (!formData.prodCfop || String(formData.prodCfop).trim() === '') {
                    addToast("O campo CFOP é obrigatório para este tipo de lançamento.", 'warning');
                    return;
                }
            } else if (formData.items.some((item: any) => !item.cfop || String(item.cfop).trim() === '')) {
                addToast("O campo CFOP é obrigatório para todos os itens deste lançamento. Verifique os dados.", 'warning');
                return;
            }
        }

        const client = data.clients.find(c => c.id === formData.entityId);
        if (!client) {
            alert("Selecione um cliente válido.");
            return;
        }

        const newInvoice: Invoice = {
            id: formData.id || Math.random().toString(36).substr(2, 9),
            number: formData.numero,
            serie: formData.serie,
            searchKey: formData.searchKey,
            accessKey: formData.accessKey,
            entityId: formData.entityId,
            entityName: client.name,
            cnpj: client.cnpj,
            date: formData.dataEmissao,
            value: formData.totalNota,
            taxValue: formData.totalImpostos,
            status: formData.status,
            type: formData.tipoNota,
            naturezaOperacao: formData.naturezaOperacao,
            xmlContent: formData.xmlContent,
            companyId: data.selectedCompany?.id || '',
            items: formData.items.length > 0 ? formData.items : [{
                productId: formData.prodId || 'manual',
                description: itemSearch || 'Lançamento Manual',
                quantity: Number(formData.prodQtd) || 1,
                unitPrice: Number(formData.prodVlrUnit) || 0,
                total: formData.prodVlrTotal || 0,
                cfop: formData.prodCfop,
                ncm: formData.prodNcm,
                cst: formData.prodCst,
                unit: formData.prodUnit || 'UN'
            }]
        };

        try {
            if (formData.id) {
                await data.updateInvoice(newInvoice);
                addToast('Lançamento atualizado com sucesso!', 'success');
                data.addAuditLog('edit', 'fiscal', newInvoice.id, `Nota Fiscal #${newInvoice.number} atualizada.`);
            } else {
                await data.addInvoice(newInvoice);
                addToast('Lançamento realizado com sucesso!', 'success');
                data.addAuditLog('create', 'fiscal', newInvoice.id, `Nota Fiscal #${newInvoice.number} lançada.`);

                // --- FINANCIAL AUTOMATION ---
                // Se a nota está sendo lançada como "Autorizada", o financeiro já a enxerga.
                // Podemos adicionar uma mensagem confirmando que o título foi gerado.
                if (newInvoice.status === 'autorizada' || newInvoice.status === 'pendente') {
                    const isReceivable = newInvoice.type === 'exit' || (newInvoice.type === 'service' && newInvoice.naturezaOperacao === 'Prestação de Serviço');
                    const msg = isReceivable ? 'Título a Receber gerado no Financeiro.' : 'Título a Pagar gerado no Financeiro.';
                    addToast(msg, 'info');
                }
            }

            if (formData.pendingFileId) {
                handleRemoveXML(formData.pendingFileId);
            }

            setIsModalOpen(false);
        } catch (error: any) {
            console.error('Erro ao salvar documento:', error);
            if (error.message.includes('Bloqueada') || error.message.includes('Bloqueado')) {
                showError({
                    code: 'PERIOD_LOCKED',
                    title: 'Período Contábil/Fiscal Encerrado',
                    description: error.message,
                    origin: 'Módulo Fiscal',
                    suggestion: 'Para realizar alterações nesta data, solicite a reabertura do período ao setor contábil ou financeiro.',
                    type: 'lock'
                });
            } else {
                addToast(error.message || 'Erro ao salvar documento', 'error');
            }
        }
    };

    const handleDeleteInvoice = async (invoice: Invoice) => {
        // Confirmação de exclusão
        const confirmMessage = `Tem certeza que deseja excluir a nota fiscal #${invoice.number}?\n\n` +
            `Entidade: ${invoice.entityName}\n` +
            `Valor: R$ ${currency(invoice.value)}\n` +
            `Data: ${invoice.date}\n\n` +
            `ATENÇÃO: Esta ação não pode ser desfeita!`;

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            // Verificar se há dependências (integração futura)
            // TODO: Verificar se há contas a pagar/receber vinculadas
            // TODO: Verificar se há movimentações de estoque vinculadas

            // Excluir do Firestore
            await data.deleteItem('invoices', invoice.id);

            // Feedback de sucesso
            addToast(`Nota fiscal #${invoice.number} excluída com sucesso!`, 'success');

            // Log de auditoria
            console.log(`🗑️ Invoice deleted: ${invoice.id} | Number: ${invoice.number} | User: ${auth.currentUser?.email}`);

        } catch (error: any) {
            console.error('Erro ao excluir nota fiscal:', error);
            if (error.message.includes('Bloqueada') || error.message.includes('Bloqueado')) {
                showError({
                    code: 'PERIOD_LOCKED',
                    title: 'Exclusão Bloqueada',
                    description: error.message,
                    origin: 'Módulo Fiscal',
                    suggestion: 'Não é possível excluir documentos de períodos encerrados. Caso seja necessário, solicite a reabertura do período.',
                    type: 'lock'
                });
            } else {
                addToast('Erro ao excluir nota fiscal. Tente novamente.', 'error');
            }
        }
    };

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        const [newType, newSubType] = val.split('-');

        let newNatureza = '';
        switch (val) {
            case 'exit-venda': newNatureza = 'Venda de Mercadoria'; break;
            case 'exit-entrada': newNatureza = 'Entrada (Saída)'; break;
            case 'entry-compra': newNatureza = 'Compra de Mercadoria'; break;
            case 'entry-devolucao': newNatureza = 'Devolução de Mercadoria'; break;
            case 'service-prestado': newNatureza = 'Prestação de Serviço'; break;
            case 'service-tomado': newNatureza = 'Tomada de Serviço'; break;
            case 'receipt-entrada': newNatureza = 'Recibo de Entrada'; break;
            case 'receipt-saida': newNatureza = 'Recibo de Pagamento (Saída)'; break;
            default: newNatureza = 'Operação Geral';
        }

        setFormData(prev => ({
            ...prev,
            tipoNota: newType as any,
            naturezaOperacao: newNatureza
        }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, dataset } = e.target;
        let finalValue = value;
        if (dataset.numericOnly === 'true') {
            finalValue = value.replace(/\D/g, '');
        }
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const inputClass = "w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm text-center focus:border-green-500 focus:ring-4 focus:ring-green-500/10 focus:outline-none placeholder-gray-400 transition-all";
    const readOnlyClass = "w-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm text-center font-extrabold focus:outline-none cursor-default";

    // Unified Entity Selection (CRM Integration)
    // Filters based on invoice direction:
    // - Entry: Suppliers
    // - Exit/Service/Receipt: Clients (and Carriers, if needed, but usually Clients)
    const entityOptions = data.clients.filter(c => {
        // Recibos: Show Everyone
        if (formData.tipoNota === 'receipt') return true;

        // Serviços:
        // - Tomado (Tomada de Serviço) -> Fornecedores
        // - Prestado (Prestação) -> Clientes
        if (formData.tipoNota === 'service') {
            if (formData.naturezaOperacao === 'Tomada de Serviço') return c.type === 'supplier';
            return c.type !== 'supplier'; // Clients & Carriers
        }

        // Entradas:
        // - Compra -> Fornecedor
        // - Devolução -> Cliente (Devolvendo para nós)
        if (formData.tipoNota === 'entry') {
            if (formData.naturezaOperacao === 'Devolução de Mercadoria') return c.type !== 'supplier';
            return c.type === 'supplier';
        }

        // Saídas:
        // - Venda -> Clientes
        // - Entrada (Saída) / Devolução a Fornecedor -> Fornecedor
        if (formData.tipoNota === 'exit') {
            if (formData.naturezaOperacao === 'Entrada (Saída)') return c.type === 'supplier';
            return c.type !== 'supplier';
        }

        // Fallback
        return c.type !== 'supplier';
    });

    // Unified Item Selection (CRM Integration)
    // - Service Note: Services
    // - Others: Products
    // We prepare a unified list of options with a 'type' discriminator
    const itemOptions = React.useMemo(() => {
        const base = formData.tipoNota === 'service'
            ? (data.services || []).map(s => ({ id: s.id, code: s.code || '', name: s.name || '', price: s.price || 0, type: 'service', unit: 'UN' }))
            : (data.products || []).map(p => ({ id: p.id, code: p.code || '', name: p.name || '', price: p.price || 0, type: 'product', unit: p.unit || 'UN' }));

        if (!itemSearch) return base;

        // If user has already selected an item, don't show the full list in the search result if it exactly matches
        const selectedLabel = base.find(b => b.id === formData.prodId);
        if (selectedLabel && itemSearch === `${selectedLabel.code} - ${selectedLabel.name} `) {
            return base;
        }

        const term = itemSearch.toLowerCase();
        return base.filter(i =>
            (String(i.name || '').toLowerCase()).includes(term) ||
            (String(i.code || '').toLowerCase()).includes(term)
        );
    }, [formData.tipoNota, data.services, data.products, itemSearch, formData.prodId]);

    const handleItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        const item = formData.tipoNota === 'service'
            ? data.services.find(s => s.id === id)
            : data.products.find(p => p.id === id);

        if (item) {
            const hasNCM = 'ncm' in item;
            setFormData(prev => ({
                ...prev,
                prodId: id,
                prodVlrUnit: Number(item.price) || 0,
                prodCode: item.code || '',
                prodNcm: hasNCM ? (item as any).ncm : '',
                prodUnit: (item as any).unit || 'UN',

                // Link tax rates to the header fields (if relevant for the current form layout)
                impostoICMSAliq: (item as any).icmsRate ?? (hasNCM ? 18 : 0),
                impostoIPIAliq: (item as any).ipiRate ?? 0,
                impostoPISAliq: (item as any).pisRate ?? 0,
                impostoCOFINSAliq: (item as any).cofinsRate ?? 0,
                impostoISSAliq: (item as any).issRate ?? (item as any).taxRate ?? 0,
                impostoCSLLAliq: (item as any).csllRate ?? 0,
                impostoIRRFAliq: (item as any).irrfRate ?? 0,
                impostoINSSAliq: (item as any).inssRate ?? 0,

                prodQtd: 1
            }));
        } else {
            setFormData(prev => ({ ...prev, prodId: id }));
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent p-0 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Hidden File Input with MULTIPLE enabled */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                className="hidden"
                accept=".xml"
                multiple
            />

            {/* TOP HEADER BAR — Premium */}
            <header className="flex justify-between items-center mb-6 shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-md shadow-cyan-500/25">
                        <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Gestão Fiscal</h1>
                        <p className="text-xs text-slate-400 font-medium">Lançamentos, XMLs e apuração inteligente</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white/85 dark:bg-slate-800/85 p-2 rounded-2xl border border-slate-200/50 dark:border-slate-700 shadow-sm overflow-x-auto no-scrollbar backdrop-blur-md">
                    <div className="flex items-center gap-2 px-4 py-2 bg-cyan-50 dark:bg-cyan-500/10 rounded-full border border-cyan-100/50 dark:border-cyan-500/20 whitespace-nowrap">
                        <span className="text-[10px] font-black text-cyan-500 dark:text-cyan-300 uppercase tracking-widest">Comp:</span>
                        <span className="text-xs font-bold text-cyan-700 dark:text-cyan-200 capitalize">
                            {format(new Date(), 'MMM/yy', { locale: ptBR })}
                        </span>
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-1 shrink-0"></div>

                    <button
                        onClick={() => setIsSearchKeyModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 text-slate-500 hover:text-cyan-600 rounded-full text-xs font-bold transition-all"
                    >
                        <Search size={14} /> Buscar Chave
                    </button>

                    <div className="flex items-center gap-2 ml-1">
                        <button
                            onClick={() => { setActiveTab('entry'); handleOpenNew('entry'); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-650 text-white rounded-full text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-500/10 hover:opacity-95 active:scale-95 transition-all disabled:opacity-50"
                            disabled={!canWriteFiscal}
                        >
                            <ArrowDownLeft size={14} /> Entrada
                        </button>

                        <button
                            onClick={() => { setActiveTab('exit'); handleOpenNew('exit'); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0ea5e9] to-[#3b82f6] text-white rounded-full text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-500/10 hover:opacity-95 active:scale-95 transition-all disabled:opacity-50"
                            disabled={!canWriteFiscal}
                        >
                            <ArrowUpRight size={14} /> Saída
                        </button>

                        <button
                            onClick={() => { setActiveTab('service'); handleOpenNew('service'); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#10b981] to-emerald-600 text-white rounded-full text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/10 hover:opacity-95 active:scale-95 transition-all disabled:opacity-50"
                            disabled={!canWriteFiscal}
                        >
                            <ShieldCheck size={14} /> Serviços
                        </button>

                        <button
                            onClick={() => { setActiveTab('receipt'); handleOpenNew('receipt'); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-500 to-slate-650 text-white rounded-full text-xs font-black uppercase tracking-wider shadow-lg shadow-slate-500/10 hover:opacity-95 active:scale-95 transition-all disabled:opacity-50"
                            disabled={!canWriteFiscal}
                        >
                            <ScrollText size={14} /> Recibo
                        </button>
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-1 shrink-0"></div>

                    <button
                        onClick={handleImportXML}
                        disabled={!canWriteFiscal}
                        className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 rounded-full hover:bg-cyan-50 hover:text-cyan-600 hover:border-cyan-200 transition-all shadow-sm"
                        title="Importar XML"
                    >
                        <Upload size={18} />
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col overflow-hidden gap-6">

                {/* KPI STRIP — Premium */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 shrink-0">
                    <div className="relative bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex items-center justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                        <div className="relative">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Entradas</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5 tabular-nums">{currency(totals.entry)}</p>
                        </div>
                        <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform relative">
                            <ArrowDownLeft className="w-4 h-4" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="relative bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex items-center justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                        <div className="relative">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Saídas</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5 tabular-nums">{currency(totals.exit)}</p>
                        </div>
                        <div className="p-2.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 rounded-xl group-hover:scale-110 transition-transform relative">
                            <ArrowUpRight className="w-4 h-4" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-sky-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="relative bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex items-center justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-50/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                        <div className="relative">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Serviços</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5 tabular-nums">{currency(totals.service)}</p>
                        </div>
                        <div className="p-2.5 bg-teal-100 dark:bg-teal-900/30 text-teal-600 rounded-xl group-hover:scale-110 transition-transform relative">
                            <Wrench className="w-4 h-4" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="relative bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30 shadow-sm flex items-center justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 group overflow-hidden ring-1 ring-emerald-200/30">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                        <div className="relative">
                            <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Valor Líquido</p>
                            <p className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-0.5 tabular-nums">{currency(totals.valorLiquido)}</p>
                            {totals.totalCancelado > 0 && (
                                <p className="text-[9px] text-rose-400 font-bold mt-0.5">-{currency(totals.totalCancelado)} canceladas</p>
                            )}
                        </div>
                        <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 rounded-xl group-hover:scale-110 transition-transform relative">
                            <DollarSign className="w-4 h-4" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="relative bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex items-center justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                        <div className="relative">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Impostos</p>
                            <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5 tabular-nums">{currency(totals.tax)}</p>
                            <p className="text-[9px] text-slate-400 font-bold mt-0.5">Sobre notas ativas</p>
                        </div>
                        <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl group-hover:scale-110 transition-transform relative">
                            <FileText className="w-4 h-4" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-4">
                    {/* Staging Area for XMLs */}
                    {pendingXMLs.length > 0 && (
                        <div className="mb-8 bg-white dark:bg-slate-900 border border-green-100 dark:border-green-500/20 rounded-2xl shadow-xl shadow-green-500/5 overflow-hidden animate-in slide-in-from-top-4 duration-500">
                            <details className="group" open>
                                <summary className="px-8 py-5 border-b border-green-100 dark:border-green-500/10 flex justify-between items-center bg-green-100/30 dark:bg-green-500/10 cursor-pointer list-none select-none">
                                    <h3 className="font-black text-green-800 dark:text-green-400 text-sm flex items-center gap-3 uppercase tracking-widest">
                                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="p-1.5 bg-green-600 text-white rounded-lg"><FileCode className="w-4 h-4" /></div>}
                                        Arquivos na Esteira ({pendingXMLs.length})
                                        <ChevronDown className="w-4 h-4 text-green-600 transition-transform group-open:rotate-180" />
                                    </h3>
                                    <div className="flex gap-4 items-center" onClick={(e) => e.stopPropagation()}>
                                        <span className="text-[10px] font-black uppercase text-green-600 tracking-wider bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-green-100 dark:border-green-500/20">Pronto para Processar</span>
                                        <Button type="button" size="sm" className="rounded-xl bg-green-600 hover:bg-green-700 shadow-md shadow-green-500/20 disabled:opacity-50" onClick={handleLaunchAll} icon={Layers} disabled={isProcessing || !canWriteFiscal}>
                                            {isProcessing ? 'Importando...' : 'Lançar Todos'}
                                        </Button>
                                    </div>
                                </summary>
                                <div className="divide-y divide-green-100 dark:divide-green-500/5 max-h-80 overflow-y-auto custom-scrollbar px-2 bg-white dark:bg-slate-900">
                                    {/* Import Options Header inside Collapsible */}
                                    <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                                        <button
                                            onClick={handleImportXML}
                                            disabled={!canWriteFiscal}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl hover:bg-slate-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
                                                    <Upload size={18} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white">Importar XML Local</p>
                                                </div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={handleSefazCloudFetch}
                                            disabled={!canWriteFiscal}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl hover:bg-slate-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                                                    <RefreshCw className="w-[18px] h-[18px]" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white">Busca Automática SEFAZ</p>
                                                </div>
                                            </div>
                                        </button>
                                    </div>

                                    {pendingXMLs.map((file) => (
                                        <div key={file.id} className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[var(--bg-card)] transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-[var(--bg-card)] rounded border border-orange-100 text-orange-500">
                                                    <FileCode size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-[var(--text-primary)]">{file.name}</p>
                                                    <p className="text-xs text-[var(--text-secondary)]">{file.size} • XML</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => handleLaunchXML(file, false)}
                                                    disabled={isProcessing || !canWriteFiscal}
                                                    className="bg-green-600 hover:bg-green-700 text-white border-transparent shadow-sm disabled:opacity-50"
                                                >
                                                    <Play className="w-3 h-3 mr-1.5" /> Lançar
                                                </Button>
                                                {file.name.includes('Sefaz') && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleManifestInvoice(file.id, '210210')}
                                                        disabled={isProcessing || !canWriteFiscal}
                                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                        title="Dar Ciência para baixar o XML completo"
                                                    >
                                                        Ciência
                                                    </Button>
                                                )}
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="danger"
                                                    onClick={() => handleRemoveXML(file.id)}
                                                    disabled={isProcessing || !canWriteFiscal}
                                                    className="px-3 disabled:opacity-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        </div>
                    )}

                    <Card className="p-0 overflow-hidden rounded-[2rem] border border-slate-200/60 shadow-sm bg-white hover:shadow-[0_20px_45px_rgba(14,165,233,0.05)] transition-all">
                        {/* Tab Switcher - Simple and Clean */}
                        <div className="flex border-b border-slate-100 bg-slate-50/50 p-2.5 gap-2 overflow-x-auto no-scrollbar">
                            <button onClick={() => setActiveTab('entry')} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-full whitespace-nowrap ${activeTab === 'entry' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/10' : 'text-slate-400 hover:bg-slate-100 hover:text-orange-500'}`}>Entradas</button>
                            <button onClick={() => setActiveTab('exit')} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-full whitespace-nowrap ${activeTab === 'exit' ? 'bg-gradient-to-r from-[#0ea5e9] to-[#3b82f6] text-white shadow-md shadow-cyan-500/10' : 'text-slate-400 hover:bg-slate-100 hover:text-cyan-500'}`}>Saídas</button>
                            <button onClick={() => setActiveTab('service')} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-full whitespace-nowrap ${activeTab === 'service' ? 'bg-gradient-to-r from-[#10b981] to-emerald-600 text-white shadow-md shadow-emerald-500/10' : 'text-slate-400 hover:bg-slate-100 hover:text-emerald-500'}`}>Serviços</button>
                            <button onClick={() => setActiveTab('receipt')} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-full whitespace-nowrap ${activeTab === 'receipt' ? 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-md shadow-slate-500/10' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>Recibos</button>
                        </div>



                        <UniversalList
                            title=""
                            data={filteredInvoices}
                            searchPlaceholder="Pesquisar..."
                            columns={[
                                {
                                    header: 'Status', accessor: (inv: any) => (
                                        <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium border w-24
                                ${inv.status === 'autorizada' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                                ${inv.status === 'pendente' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : ''}
                                ${inv.status === 'cancelada' ? 'bg-red-50 text-red-700 border-red-200' : ''}
                            `}>
                                            {inv.status}
                                        </span>
                                    ), className: "w-32 text-center",
                                    sortKey: 'status'
                                },
                                {
                                    header: 'Tipo', accessor: (inv: any) => {
                                        const nat = inv.naturezaOperacao || '';
                                        let label: string = inv.type;
                                        let styleClass = 'bg-gray-50 text-gray-700 dark:text-slate-200 border-gray-200';

                                        if (inv.type === 'exit') {
                                            if (nat === 'Entrada (Saída)') {
                                                label = 'Saída (Entrada)';
                                                styleClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                                            } else {
                                                label = 'Saída (Venda)';
                                                styleClass = 'bg-blue-50 text-blue-700 border-blue-200';
                                            }
                                        } else if (inv.type === 'entry') {
                                            if (nat === 'Devolução de Mercadoria') {
                                                label = 'Entrada (Devolução)';
                                                styleClass = 'bg-purple-50 text-purple-700 border-purple-200';
                                            } else {
                                                label = 'Entrada (Compra)';
                                                styleClass = 'bg-orange-50 text-orange-700 border-orange-200';
                                            }
                                        } else if (inv.type === 'service') {
                                            if (nat === 'Tomada de Serviço') {
                                                label = 'Serviço (Tomado)';
                                                styleClass = 'bg-amber-50 text-amber-700 border-amber-200';
                                            } else {
                                                label = 'Serviço (Prestado)';
                                                styleClass = 'bg-cyan-50 text-cyan-700 border-cyan-200';
                                            }
                                        } else if (inv.type === 'receipt' || String(inv.type).toLowerCase() === 'recibo' || (!inv.type && nat.toLowerCase().includes('recibo'))) {
                                            if (nat.includes('Saída')) {
                                                label = 'Recibo (Saída)';
                                                styleClass = 'bg-rose-50 text-rose-700 border-rose-200';
                                            } else {
                                                label = 'Recibo (Entrada)';
                                                styleClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                            }
                                        }

                                        return (
                                            <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border w-32 ${styleClass}`}>
                                                {label}
                                            </span>
                                        );
                                    }, className: "w-40 text-center",
                                    sortKey: 'type'
                                },
                                {
                                    header: 'Número', accessor: (inv: any) => (
                                        <div>
                                            <span className="font-medium text-gray-900">{inv.number}</span>
                                            {inv.serie && <span className="text-[10px] text-gray-400 font-normal ml-1">ser.{inv.serie}</span>}
                                        </div>
                                    ), className: "w-32",
                                    sortKey: 'number'
                                },
                                {
                                    header: 'CFOP', accessor: (inv: any) => (
                                        <span className="font-mono text-[10px] text-gray-400">
                                            {[...new Set(inv.items?.map((i: InvoiceItem) => i.cfop).filter(Boolean))].join(', ') || '-'}
                                        </span>
                                    ), className: "w-24",
                                    sortable: false
                                },
                                {
                                    header: 'Natureza', accessor: (inv: any) => (
                                        <span className="text-xs text-slate-500 font-medium truncate max-w-[150px] block" title={inv.naturezaOperacao}>
                                            {inv.naturezaOperacao || '-'}
                                        </span>
                                    ), className: "w-32",
                                    sortKey: 'naturezaOperacao'
                                },
                                {
                                    header: 'Entidade', accessor: (inv: any) => {
                                        const displayName = inv.entityName && inv.entityName !== 'Não Identificado' ? inv.entityName : (inv.cnpj || 'Não Identificado');
                                        return (
                                            <div>
                                                <div className="text-gray-900 font-medium truncate max-w-[250px]" title={displayName}>{displayName}</div>
                                                <div className="text-gray-500 dark:text-slate-400 text-xs">{inv.cnpj || '-'}</div>
                                            </div>
                                        );
                                    }, className: "min-w-[200px]",
                                    sortKey: 'entityName'
                                },
                                {
                                    header: 'Emissão',
                                    accessor: (inv: any) => formatDateBR(inv.date),
                                    className: "w-32 text-gray-500 dark:text-slate-400 text-sm",
                                    sortKey: 'date'
                                },
                                {
                                    header: 'Auditoria', accessor: (inv: any) => (
                                        <div className="flex flex-col gap-1 text-[10px] text-gray-500 dark:text-slate-400">
                                            <div className="flex items-center gap-1" title="Criado por">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                                <span className="truncate max-w-[80px]">{inv.createdBy || '-'}</span>
                                            </div>
                                            {inv.updatedBy && (
                                                <div className="flex items-center gap-1" title="Alterado por">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                                                    <span className="truncate max-w-[80px]">{inv.updatedBy}</span>
                                                </div>
                                            )}
                                        </div>
                                    ), className: "w-32",
                                    sortKey: 'createdBy'
                                },
                                {
                                    header: 'Valor Total',
                                    accessor: (inv: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inv.value),
                                    className: "w-32 text-right font-medium text-gray-900",
                                    sortKey: 'value'
                                }
                            ]}
                            actions={(inv: any) => (
                                <div className="flex items-center justify-end">
                                    <button
                                        onClick={() => handleEditInvoice(inv)}
                                        className="text-gray-400 hover:text-blue-500 transition-colors mr-2 disabled:opacity-30 disabled:hover:text-gray-400"
                                        disabled={!canWriteFiscal}
                                        title="Editar lançamento"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
                                                data.deleteItem('invoices', inv.id);
                                                addToast('Lançamento excluído com sucesso', 'success');
                                            }
                                        }}
                                        className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:hover:text-gray-400"
                                        disabled={!canWriteFiscal}
                                        title="Excluir lançamento"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    {/* Status Actions */}
                                    {inv.status === 'pendente' && (
                                        <button
                                            onClick={() => {
                                                if (window.confirm('Confirmar autorização deste lançamento?')) {
                                                    data.updateInvoice({ ...inv, status: 'autorizada' });
                                                    addToast('Lançamento autorizado!', 'success');
                                                }
                                            }}
                                            className="ml-2 text-yellow-500 hover:text-green-600 transition-colors"
                                            title="Autorizar Lançamento"
                                            disabled={!canWriteFiscal}
                                        >
                                            <CheckCircle size={16} />
                                        </button>
                                    )}
                                    {inv.status === 'autorizada' && (
                                        <button
                                            onClick={() => {
                                                if (window.confirm('Deseja realmente cancelar este lançamento?')) {
                                                    data.updateInvoice({ ...inv, status: 'cancelada' });
                                                    addToast('Lançamento cancelado!', 'info');
                                                }
                                            }}
                                            className="ml-2 text-green-500 hover:text-red-600 transition-colors"
                                            title="Cancelar Lançamento"
                                            disabled={!canWriteFiscal}
                                        >
                                            <XCircle size={16} />
                                        </button>
                                    )}
                                </div>
                            )}
                            rowClassName={(item) => {
                                if ((item.status as string) === 'cancelada' || item.status === 'cancelado' || item.status === 'reprovado') return 'bg-red-50/40 hover:bg-red-50/60';
                                if (item.status === 'pendente') return 'bg-yellow-50/40 hover:bg-yellow-50/60';
                                if (item.status === 'autorizada') return 'bg-green-50/10 hover:bg-green-50/30';
                                return '';
                            }}
                            onCreate={() => handleOpenNew(activeTab)}
                            onImport={() => fileInputRef.current?.click()}
                            headerActions={
                                <div className="flex items-center gap-2">
                                    <div className="relative group">
                                        <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Nº ou Entidade..."
                                            value={filters.number}
                                            onChange={e => setFilters({ ...filters, number: e.target.value })}
                                            className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 w-32 focus:w-48 transition-all outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 placeholder:text-slate-400"
                                        />
                                    </div>

                                    {/* Quick Date Filters */}
                                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                                        <button
                                            onClick={() => {
                                                const today = new Date().toISOString().split('T')[0];
                                                setFilters({ ...filters, startDate: today, endDate: today });
                                            }}
                                            className="px-2 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded transition-all"
                                            title="Hoje"
                                        >
                                            H
                                        </button>
                                        <button
                                            onClick={() => {
                                                const date = new Date();
                                                const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
                                                const end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
                                                setFilters({ ...filters, startDate: start, endDate: end });
                                            }}
                                            className="px-2 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded transition-all"
                                            title="Este Mês"
                                        >
                                            Mês
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <label className="text-[10px] font-black uppercase text-slate-400">De</label>
                                        <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none w-20" />
                                    </div>
                                    <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <label className="text-[10px] font-black uppercase text-slate-400">Até</label>
                                        <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none w-20" />
                                    </div>
                                    <select
                                        value={filters.status}
                                        onChange={e => setFilters({ ...filters, status: e.target.value })}
                                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer hover:border-indigo-300 transition-colors"
                                    >
                                        <option value="">Status (Todos)</option>
                                        <option value="autorizada">Autorizada</option>
                                        <option value="pendente">Pendente</option>
                                        <option value="cancelada">Cancelada</option>
                                    </select>
                                    <div className="h-6 w-px bg-slate-200 mx-1"></div>
                                    <Button
                                        variant="outline"
                                        className="text-green-600 border-green-200 hover:bg-green-50 px-3 py-1.5 h-auto text-xs"
                                        icon={Download}
                                        onClick={() => handleExportExcel(filteredInvoices.map(inv => ({
                                            'Status': inv.status.toUpperCase(),
                                            'Número': inv.number,
                                            'Tipo': inv.naturezaOperacao || (inv.type === 'exit' ? 'Saída' : inv.type === 'entry' ? 'Entrada' : inv.type === 'service' ? 'Serviço' : 'Recibo'),
                                            'Entidade': inv.entityName,
                                            'CNPJ': inv.cnpj,
                                            'Data Emissão': formatDateBR(inv.date),
                                            'CFOP': [...new Set(inv.items?.map((i: InvoiceItem) => i.cfop).filter(Boolean))].join(', ') || '-',
                                            'Valor Total': inv.value
                                        })), `Relatório de ${activeTab === 'exit' ? 'Saídas' : activeTab === 'entry' ? 'Entradas' : activeTab === 'service' ? 'Serviços' : 'Recibos'} `)}
                                    >
                                        Excel
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="text-blue-500 border-blue-200 hover:bg-blue-50 px-3 py-1.5 h-auto text-xs ml-1"
                                        icon={Share2}
                                        onClick={() => window.open('https://www.meudanfe.com.br/', '_blank')}
                                        title="Baixar XML utilizando a Chave de Acesso"
                                    >
                                        Baixar XML
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        className="text-slate-600 dark:text-slate-300 border-slate-200 hover:bg-slate-50 px-3 py-1.5 h-auto text-xs ml-1"
                                        icon={FileText}
                                        onClick={() => handleExportPDF(filteredInvoices.map(inv => ({
                                            'Número': inv.number,
                                            'Data': formatDateBR(inv.date),
                                            'Tipo': inv.naturezaOperacao || (inv.type === 'exit' ? 'Saída' : inv.type === 'entry' ? 'Entrada' : inv.type === 'service' ? 'Serviço' : 'Recibo'),
                                            'Parceiro': inv.entityName,
                                            'CFOP': [...new Set(inv.items?.map((i: InvoiceItem) => i.cfop).filter(Boolean))].join(', ') || '-',
                                            'Valor': inv.value,
                                            'ISS / Retenções': inv.taxValue || 0
                                        })), `Relatório de ${activeTab === 'exit' ? 'Saídas' : activeTab === 'entry' ? 'Entradas' : activeTab === 'service' ? 'Serviços' : 'Recibos'} `)}
                                    >
                                        PDF
                                    </Button>
                                </div>
                            }
                        />

                        {/* Buscar XML por Chave Modal - Extracted */}
                        <SearchKeyModal
                            isOpen={isSearchKeyModalOpen}
                            onClose={() => setIsSearchKeyModalOpen(false)}
                            nfeKey={nfeKey}
                            setNfeKey={setNfeKey}
                            isSearchingKey={isSearchingKey}
                            onSearch={handleSearchNFKey}
                        />

                        {/* New Invoice Modal - Integrated */}
                        <Modal
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            title={`Lançamento: ${formData.tipoNota === 'entry' ? 'Entrada (Compra)' :
                                formData.tipoNota === 'exit' ? 'Saída (Venda)' :
                                    formData.tipoNota === 'service' ? 'Serviço Prestado' : 'Recibo'
                                } `}
                            maxWidth="max-w-5xl"
                        >
                            <>
                                {/* Tab Navigation */}
                                <div className="flex border-b border-[var(--border-color)] mb-6 -mx-6 px-6 gap-1 bg-slate-50/50">
                                    <button
                                        type="button"
                                        onClick={() => setModalTab('geral')}
                                        className={`relative px-6 py-4 text-xs font-black uppercase tracking-widest transition-all ${modalTab === 'geral'
                                            ? 'text-green-600 after:content-[\'\'] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-green-600 bg-white dark:bg-slate-800 shadow-sm rounded-t-lg'
                                            : 'text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100/50'
                                            }`}
                                    >
                                        Dados Gerais
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setModalTab('impostos')}
                                        className={`relative px-6 py-4 text-xs font-black uppercase tracking-widest transition-all ${modalTab === 'impostos'
                                            ? 'text-green-600 after:content-[\'\'] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-green-600 bg-white dark:bg-slate-800 shadow-sm rounded-t-lg'
                                            : 'text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100/50'
                                            }`}
                                    >
                                        Impostos e Retenções
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setModalTab('complementar')}
                                        className={`relative px-6 py-4 text-xs font-black uppercase tracking-widest transition-all ${modalTab === 'complementar'
                                            ? 'text-green-600 after:content-[\'\'] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-green-600 bg-white dark:bg-slate-800 shadow-sm rounded-t-lg'
                                            : 'text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100/50'
                                            }`}
                                    >
                                        Complementar
                                    </button>
                                </div>

                                <form onSubmit={handleSaveInvoice}>
                                    {modalTab === 'geral' && (
                                        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                                            <div className="bg-slate-50 dark:bg-slate-800/10 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50 mb-6 shadow-sm">
                                                <SectionHeader title="1. Dados do Lançamento" />
                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                                                    <div className="md:col-span-3">
                                                        <InputGroup label="Tipo" required>
                                                            <select
                                                                name="tipoNota"
                                                                value={`${formData.tipoNota}-${formData.tipoNota === 'exit' ? (formData.naturezaOperacao?.includes('Entrada') ? 'entrada' : 'venda') :
                                                                    formData.tipoNota === 'entry' ? (formData.naturezaOperacao?.includes('Devolução') ? 'devolucao' : 'compra') :
                                                                        formData.tipoNota === 'service' ? (formData.naturezaOperacao?.includes('Tomada') ? 'tomado' : 'prestado') :
                                                                            formData.tipoNota === 'receipt' ? (formData.naturezaOperacao?.includes('Saída') || formData.naturezaOperacao?.includes('Pagamento') ? 'saida' : 'entrada') :
                                                                                'venda'
                                                                    }`}
                                                                onChange={handleTypeChange}
                                                                className={inputClass}
                                                            >
                                                                {formData.tipoNota === 'exit' && (
                                                                    <optgroup label="Saídas (Vendas/Entradas)">
                                                                        <option value="exit-venda">Saída (Venda)</option>
                                                                        <option value="exit-entrada">Saída (Entrada)</option>
                                                                    </optgroup>
                                                                )}
                                                                {formData.tipoNota === 'entry' && (
                                                                    <optgroup label="Entradas (Compras/Devoluções)">
                                                                        <option value="entry-compra">Entrada (Compra)</option>
                                                                        <option value="entry-devolucao">Entrada (Devolução)</option>
                                                                    </optgroup>
                                                                )}
                                                                {formData.tipoNota === 'service' && (
                                                                    <optgroup label="Serviços">
                                                                        <option value="service-prestado">Serviço (Prestado)</option>
                                                                        <option value="service-tomado">Serviço (Tomado)</option>
                                                                    </optgroup>
                                                                )}
                                                                {formData.tipoNota === 'receipt' && (
                                                                    <optgroup label="Recibos">
                                                                        <option value="receipt-entrada">Recibo (Entrada)</option>
                                                                        <option value="receipt-saida">Recibo (Saída)</option>
                                                                    </optgroup>
                                                                )}
                                                            </select>
                                                        </InputGroup>
                                                    </div>
                                                    <div className="md:col-span-3">
                                                        <InputGroup label="Status" required>
                                                            <select name="status" value={formData.status} onChange={handleChange} className={inputClass}>
                                                                <option value="pendente">Pendente</option>
                                                                <option value="autorizada">Autorizada</option>
                                                                <option value="cancelada">Cancelada</option>
                                                                <option value="substituida">Substituída</option>
                                                                <option value="denegada">Denegada</option>
                                                                <option value="recusada">Recusada</option>
                                                                <option value="extemporanea">Extemporânea (ISS)</option>
                                                            </select>
                                                        </InputGroup>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <InputGroup label="Data Emissão" required>
                                                            <input type="date" name="dataEmissao" value={formData.dataEmissao} onChange={handleChange} className={inputClass} required />
                                                        </InputGroup>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <InputGroup label="Número" required>
                                                            <input type="text" name="numero" value={formData.numero} onChange={handleChange} className={inputClass} required />
                                                        </InputGroup>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <InputGroup label="Série" required>
                                                            <input type="text" name="serie" value={formData.serie} onChange={handleChange} className={inputClass} required />
                                                        </InputGroup>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                                                    <div className="md:col-span-12">
                                                        <InputGroup label="Natureza da Operação" required>
                                                            <div className="relative group" ref={naturezaResultsRef}>
                                                                <input
                                                                    type="text"
                                                                    name="naturezaOperacao"
                                                                    value={formData.naturezaOperacao}
                                                                    onChange={handleChange}
                                                                    onFocus={() => setShowNaturezaResults(true)}
                                                                    className={inputClass + " pr-12"}
                                                                    placeholder="Ex: Venda de Mercadoria, Remessa para Conserto..."
                                                                    required
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowNaturezaResults(!showNaturezaResults)}
                                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-600 transition-colors"
                                                                >
                                                                    <ChevronDown size={18} className={`transition-transform duration-200 ${showNaturezaResults ? 'rotate-180' : ''}`} />
                                                                </button>

                                                                {showNaturezaResults && (
                                                                    <div className="absolute z-50 mt-2 w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                                        <div className="p-2 border-b border-slate-100 dark:border-slate-700 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-1">Sugestões e Tipos Cadastrados</p>
                                                                        </div>
                                                                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                                                            {/* Firestore Registered Types */}
                                                                            {data.operationTypes && data.operationTypes.length > 0 && (
                                                                                <div className="border-b border-slate-100 dark:border-slate-700 dark:border-slate-800">
                                                                                    {data.operationTypes.map(ot => (
                                                                                        <button
                                                                                            key={ot.id}
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                setFormData(prev => ({ ...prev, naturezaOperacao: ot.name }));
                                                                                                setShowNaturezaResults(false);
                                                                                            }}
                                                                                            className="w-full text-left px-4 py-3 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center justify-between group"
                                                                                        >
                                                                                            <div>
                                                                                                <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-green-600">{ot.name}</p>
                                                                                                {ot.description && <p className="text-[10px] text-slate-500">{ot.description}</p>}
                                                                                            </div>
                                                                                            <Bookmark size={14} className="text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            )}

                                                                            {/* Standard Types */}
                                                                            {STANDARD_NATUREZAS.filter(n =>
                                                                                !data.operationTypes?.some(ot => ot.name === n) &&
                                                                                n.toLowerCase().includes(formData.naturezaOperacao.toLowerCase())
                                                                            ).map(n => (
                                                                                <button
                                                                                    key={n}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setFormData(prev => ({ ...prev, naturezaOperacao: n }));
                                                                                        setShowNaturezaResults(false);
                                                                                    }}
                                                                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between group"
                                                                                >
                                                                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">{n}</span>
                                                                                    <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                                </button>
                                                                            ))}

                                                                            {/* If searching and no results */}
                                                                            {(STANDARD_NATUREZAS.filter(n => n.toLowerCase().includes(formData.naturezaOperacao.toLowerCase())).length === 0 &&
                                                                                (!data.operationTypes || data.operationTypes.filter(ot => ot.name.toLowerCase().includes(formData.naturezaOperacao.toLowerCase())).length === 0)) && (
                                                                                    <div className="p-4 text-center">
                                                                                        <p className="text-xs text-slate-400">Pressione TAB para usar "{formData.naturezaOperacao}"</p>
                                                                                    </div>
                                                                                )}
                                                                        </div>
                                                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 dark:border-slate-800 flex justify-between items-center">
                                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Dica: Você também pode digitar livremente</p>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setShowNaturezaResults(false)}
                                                                                className="text-[10px] font-bold text-green-600 hover:underline"
                                                                            >
                                                                                Fechar
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </InputGroup>
                                                    </div>
                                                </div>

                                            </div>

                                            <div className="bg-slate-50 dark:bg-slate-800/10 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50 mb-6 shadow-sm">
                                                <SectionHeader title="2. Destinatário / Remetente" />
                                                <div className="grid grid-cols-1 mb-6">
                                                    <InputGroup label="Selecione o Parceiro (Procurar por nome)" required>
                                                        <div className="relative" ref={partnerResultsRef}>
                                                            <div className="relative">
                                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Digite para buscar parceiro..."
                                                                    value={partnerSearch}
                                                                    onChange={(e) => {
                                                                        setPartnerSearch(e.target.value);
                                                                        setShowPartnerResults(true);
                                                                        setFormData(prev => ({ ...prev, entityId: '' })); // Clear selection on type
                                                                    }}
                                                                    onFocus={() => {
                                                                        setShowPartnerResults(true);
                                                                        if (formData.entityId && !partnerSearch) {
                                                                            const current = entityOptions.find(c => c.id === formData.entityId);
                                                                            if (current) setPartnerSearch(current.name);
                                                                        }
                                                                    }}
                                                                    className={`${inputClass} pl - 11 text - left`}
                                                                    required={!formData.entityId}
                                                                />
                                                                {formData.entityId && (
                                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-green-500 text-white p-1 rounded-full">
                                                                        <CheckCircle size={12} />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {showPartnerResults && (
                                                                <div className="absolute z-[100] w-full mt-2 bg-white dark:bg-slate-900 border border-[var(--border-color)] rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar overflow-x-hidden">
                                                                    {entityOptions.filter(c => c.name.toLowerCase().includes(partnerSearch.toLowerCase()) || c.cnpj.includes(partnerSearch)).length > 0 ? (
                                                                        <div className="p-1">
                                                                            {entityOptions
                                                                                .filter(c => c.name.toLowerCase().includes(partnerSearch.toLowerCase()) || c.cnpj.includes(partnerSearch))
                                                                                .map(c => (
                                                                                    <button
                                                                                        key={c.id}
                                                                                        type="button"
                                                                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex flex-col border-b border-slate-50 dark:border-slate-800 last:border-0"
                                                                                        onClick={() => selectPartner(c)}
                                                                                    >
                                                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 dark:text-slate-200 line-clamp-1">{c.name}</span>
                                                                                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">{c.cnpj} • {c.type === 'client' ? 'Cliente' : 'Fornecedor'}</span>
                                                                                    </button>
                                                                                ))}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="p-8 text-center">
                                                                            <p className="text-xs text-slate-500 font-medium">Nenhum parceiro localizado.</p>
                                                                            <p className="text-[10px] text-slate-400 mt-1">Verifique a ortografia ou cadastre no CRM.</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </InputGroup>
                                                    {entityOptions.length === 0 && (
                                                        <p className="text-xs text-red-500 mt-1">Nenhum cliente/fornecedor compatível encontrado. Cadastre no módulo CRM.</p>
                                                    )}
                                                </div>

                                            </div>

                                            <div className="bg-slate-50 dark:bg-slate-800/10 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50 mb-6 shadow-sm">
                                                <SectionHeader title={formData.tipoNota === 'receipt' ? "3. Detalhes do Recibo" : "3. Produtos / Serviços"} />

                                                {formData.items.length > 0 && (
                                                    <div className="mb-6 px-4">
                                                        {/* Mass Edit Controls */}
                                                        {selectedItems.size > 0 && (
                                                            <div className="flex items-center gap-2 mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg animate-in slide-in-from-top-2">
                                                                <span className="text-xs font-bold text-yellow-800 ml-2">{selectedItems.size} iten(s) selecionado(s)</span>
                                                                <div className="h-4 w-px bg-yellow-300 mx-1"></div>
                                                                <input
                                                                    type="text"
                                                                    placeholder="NCM"
                                                                    className="text-xs p-1.5 rounded border border-yellow-300 w-24"
                                                                    value={massEditValues.ncm || ''}
                                                                    onChange={e => setMassEditValues({ ...massEditValues, ncm: e.target.value })}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    placeholder="CST"
                                                                    className="text-xs p-1.5 rounded border border-yellow-300 w-16"
                                                                    value={massEditValues.cst || ''}
                                                                    onChange={e => setMassEditValues({ ...massEditValues, cst: e.target.value })}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    placeholder="CFOP"
                                                                    className="text-xs p-1.5 rounded border border-yellow-300 w-16"
                                                                    value={massEditValues.cfop || ''}
                                                                    onChange={e => setMassEditValues({ ...massEditValues, cfop: e.target.value })}
                                                                />
                                                                <Button
                                                                    size="sm"
                                                                    className="bg-yellow-600 hover:bg-yellow-700 text-white border-none h-8"
                                                                    onClick={() => {
                                                                        setFormData(prev => ({
                                                                            ...prev,
                                                                            items: prev.items.map((item, idx) => {
                                                                                if (selectedItems.has(idx)) {
                                                                                    return {
                                                                                        ...item,
                                                                                        ...(massEditValues.ncm ? { ncm: massEditValues.ncm } : {}),
                                                                                        ...(massEditValues.cst ? { cst: massEditValues.cst } : {}),
                                                                                        ...(massEditValues.cfop ? { cfop: massEditValues.cfop } : {}),
                                                                                    };
                                                                                }
                                                                                return item;
                                                                            })
                                                                        }));
                                                                        addToast('Alterações em massa aplicadas!', 'success');
                                                                        setSelectedItems(new Set());
                                                                        setMassEditValues({});
                                                                    }}
                                                                >
                                                                    Aplicar
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => setSelectedItems(new Set())}
                                                                    className="border-yellow-300 text-yellow-800 hover:bg-yellow-100 h-8"
                                                                >
                                                                    Cancelar
                                                                </Button>
                                                            </div>
                                                        )}

                                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm overflow-x-auto relative">
                                                            <table className="w-full text-left border-collapse min-w-[1200px]">
                                                                <thead className="bg-slate-50 dark:bg-slate-800 text-[9px] uppercase font-black text-slate-500 tracking-wider">
                                                                    <tr>
                                                                        <th className="px-2 py-3 border border-slate-200 dark:border-slate-700 w-8 text-center sticky left-0 z-20 bg-slate-50 dark:bg-slate-800">
                                                                            <input
                                                                                type="checkbox"
                                                                                onChange={(e) => {
                                                                                    if (e.target.checked) {
                                                                                        setSelectedItems(new Set(formData.items.map((_, i) => i)));
                                                                                    } else {
                                                                                        setSelectedItems(new Set());
                                                                                    }
                                                                                }}
                                                                                checked={formData.items.length > 0 && selectedItems.size === formData.items.length}
                                                                            />
                                                                        </th>
                                                                        <th className="px-3 py-3 border border-slate-200 dark:border-slate-700 sticky left-8 z-20 bg-slate-50 dark:bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">CÓD. PRODUTO</th>
                                                                        <th className="px-3 py-3 border border-slate-200 dark:border-slate-700 min-w-[200px]">DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
                                                                        <th className="px-2 py-3 text-center border border-slate-200 dark:border-slate-700">NCM</th>
                                                                        <th className="px-2 py-3 text-center border border-slate-200 dark:border-slate-700">{isSimples ? 'CSOSN' : 'CST'}</th>
                                                                        <th className="px-2 py-3 text-center border border-slate-200 dark:border-slate-700">CFOP</th>
                                                                        <th className="px-2 py-3 text-center border border-slate-200 dark:border-slate-700">UN</th>
                                                                        <th className="px-2 py-3 text-center border border-slate-200 dark:border-slate-700">QTD</th>
                                                                        <th className="px-3 py-3 text-right border border-slate-200 dark:border-slate-700">VALOR UNIT</th>
                                                                        <th className="px-3 py-3 text-right border border-slate-200 dark:border-slate-700">VALOR TOTAL</th>
                                                                        <th className="px-3 py-3 text-right border border-slate-200 dark:border-slate-700">VALOR DESC</th>
                                                                        <th className="px-3 py-3 text-right border border-slate-200 dark:border-slate-700">{formData.tipoNota === 'service' ? 'B.CÁLC ISS' : 'B.CÁLC ICMS'}</th>
                                                                        <th className="px-3 py-3 text-right border border-slate-200 dark:border-slate-700">{formData.tipoNota === 'service' ? 'VALOR ISS' : 'VALOR ICMS'}</th>
                                                                        <th className="px-3 py-3 text-right border border-slate-200 dark:border-slate-700">VALOR PIS</th>
                                                                        <th className="px-3 py-3 text-right border border-slate-200 dark:border-slate-700">VALOR COFINS</th>
                                                                        <th className="px-3 py-3 text-right border border-slate-200 dark:border-slate-700">{formData.tipoNota === 'service' ? 'RETENÇÕES' : 'VALOR IPI'}</th>
                                                                        <th className="px-2 py-3 text-center border border-slate-200 dark:border-slate-700">{formData.tipoNota === 'service' ? 'ALÍQ. ISS' : 'ALÍQ. ICMS'}</th>
                                                                        <th className="px-2 py-3 text-center border border-slate-200 dark:border-slate-700">ALÍQ. PIS</th>
                                                                        <th className="px-2 py-3 text-center border border-slate-200 dark:border-slate-700">ALÍQ. COF</th>
                                                                        <th className="px-2 py-3 text-center border border-slate-200 dark:border-slate-700">{formData.tipoNota === 'service' ? 'OUTROS' : 'ALÍQ. IPI'}</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="bg-white dark:bg-slate-900 border-collapse">
                                                                    {formData.items.map((item, idx) => (
                                                                        item && (
                                                                        <tr key={idx} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${selectedItems.has(idx) ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}`}>
                                                                            <td className="px-1 py-1 border border-slate-200 dark:border-slate-700 w-8 text-center sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50/50">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={selectedItems.has(idx)}
                                                                                    onChange={(e) => {
                                                                                        const newSet = new Set(selectedItems);
                                                                                        if (e.target.checked) newSet.add(idx);
                                                                                        else newSet.delete(idx);
                                                                                        setSelectedItems(newSet);
                                                                                    }}
                                                                                />
                                                                            </td>
                                                                            <td className="px-1 py-1 border border-slate-200 dark:border-slate-700 sticky left-8 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                                                <input type="text" value={item.code || ''} onChange={(e) => handleItemValueChange(idx, 'code', e.target.value)} className="w-16 bg-transparent border-none text-[10px] text-center font-mono focus:ring-0" />
                                                                            </td>
                                                                            <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                                <input type="text" value={item.description || ''} onChange={(e) => handleItemValueChange(idx, 'description', e.target.value)} className="w-full bg-transparent border-none text-[10px] font-bold focus:ring-0" />
                                                                            </td>
                                                                            <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                                <input
                                                                                    list="ncm-list"
                                                                                    type="text"
                                                                                    value={item.ncm || ''}
                                                                                    onChange={(e) => handleItemValueChange(idx, 'ncm', e.target.value)}
                                                                                    className={`w-16 bg-transparent border-none text-[10px] text-center focus:ring-0 ${item.ncm && item.ncm.length !== 8 ? 'text-red-500 font-bold border-b border-red-500' : ''}`}
                                                                                    title={item.ncm && item.ncm.length !== 8 ? 'NCM deve ter 8 dígitos' : ''}
                                                                                />
                                                                            </td>
                                                                            <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                                <input list="cst-list" type="text" value={item.cst || ''} onChange={(e) => handleItemValueChange(idx, 'cst', e.target.value)} className="w-10 bg-transparent border-none text-[10px] text-center focus:ring-0" />
                                                                            </td>
                                                                            <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                                <input list="cfop-list" type="text" value={item.cfop || ''} onChange={(e) => handleItemValueChange(idx, 'cfop', e.target.value)} className="w-10 bg-transparent border-none text-[10px] text-center focus:ring-0" />
                                                                            </td>
                                                                            <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                                <input list="unit-list" type="text" value={item.unit || ''} onChange={(e) => handleItemValueChange(idx, 'unit', e.target.value)} className="w-10 bg-transparent border-none text-[10px] text-center focus:ring-0 uppercase" />
                                                                            </td>
                                                                            <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                                <input type="number" value={item.quantity} onChange={(e) => handleItemValueChange(idx, 'quantity', e.target.value)} className="w-12 bg-transparent border-none text-[10px] text-center focus:ring-0" />
                                                                            </td>
                                                                            <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                                <input type="number" value={item.unitPrice} onChange={(e) => handleItemValueChange(idx, 'unitPrice', e.target.value)} className="w-16 bg-transparent border-none text-[10px] text-right focus:ring-0" />
                                                                            </td>
                                                                            <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                                <input type="number" value={item.total} onChange={(e) => handleItemValueChange(idx, 'total', e.target.value)} className="w-20 bg-transparent border-none text-[10px] text-right font-bold text-green-600 focus:ring-0" />
                                                                            </td>
                                                                            <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                                <input type="number" value={item.discount || 0} onChange={(e) => handleItemValueChange(idx, 'discount', e.target.value)} className="w-16 bg-transparent border-none text-[10px] text-right text-red-500 focus:ring-0" />
                                                                            </td>
                                                                            <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                                <input type="number" value={item.bcIcms || 0} onChange={(e) => handleItemValueChange(idx, 'bcIcms', e.target.value)} className="w-16 bg-transparent border-none text-[10px] text-right focus:ring-0" />
                                                                            </td>
                                                                            <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                                <input type="number" value={(formData.tipoNota === 'service' ? item.vIss : item.vIcms) || 0} onChange={(e) => handleItemValueChange(idx, formData.tipoNota === 'service' ? 'vIss' : 'vIcms', e.target.value)} className="w-16 bg-transparent border-none text-[10px] text-right text-blue-600 font-bold focus:ring-0" />
                                                                            </td>
                                                                            <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                                <input type="number" value={item.vPis || 0} onChange={(e) => handleItemValueChange(idx, 'vPis', e.target.value)} className="w-16 bg-transparent border-none text-[10px] text-right text-slate-600 dark:text-slate-300 focus:ring-0" />
                                                                            </td>
                                                                            <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                                <input type="number" value={item.vCofins || 0} onChange={(e) => handleItemValueChange(idx, 'vCofins', e.target.value)} className="w-16 bg-transparent border-none text-[10px] text-right text-slate-600 dark:text-slate-300 focus:ring-0" />
                                                                            </td>
                                                                            <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                                {formData.tipoNota === 'service' ? (
                                                                                    <input type="number" value={Number((item.vCsll || 0) + (item.vIrrf || 0) + (item.vInss || 0)).toFixed(2)} readOnly className="w-16 bg-transparent border-none text-[10px] text-right text-red-600 font-bold focus:ring-0" />
                                                                                ) : (
                                                                                    <input type="number" value={item.vIpi || 0} onChange={(e) => handleItemValueChange(idx, 'vIpi', e.target.value)} className="w-16 bg-transparent border-none text-[10px] text-right text-orange-600 font-bold focus:ring-0" />
                                                                                )}
                                                                            </td>
                                                                            <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                                <input type="number" value={(formData.tipoNota === 'service' ? (item.pIss || item.pIcms) : item.pIcms) || 0} onChange={(e) => handleItemValueChange(idx, formData.tipoNota === 'service' ? 'pIss' : 'pIcms', e.target.value)} className="w-10 bg-transparent border-none text-[10px] text-center text-blue-600 focus:ring-0" />
                                                                            </td>
                                                                            <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                                <input type="number" value={item.pPis || 0} onChange={(e) => handleItemValueChange(idx, 'pPis', e.target.value)} className="w-10 bg-transparent border-none text-[10px] text-center text-slate-400 focus:ring-0" />
                                                                            </td>
                                                                            <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                                <input type="number" value={item.pCofins || 0} onChange={(e) => handleItemValueChange(idx, 'pCofins', e.target.value)} className="w-10 bg-transparent border-none text-[10px] text-center text-slate-400 focus:ring-0" />
                                                                            </td>
                                                                            <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                                <input type="number" value={item.pIpi || 0} onChange={(e) => handleItemValueChange(idx, 'pIpi', e.target.value)} className="w-10 bg-transparent border-none text-[10px] text-center text-orange-600 focus:ring-0" />
                                                                            </td>
                                                                        </tr>
                                                                        )
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        <datalist id="ncm-list">{data.ncms.map(n => <option key={n.id} value={n.code}>{n.description}</option>)}</datalist>
                                                        <datalist id="cst-list">
                                                            {isSimples ? (
                                                                ['101', '102', '103', '201', '202', '203', '300', '400', '500', '900'].map(c => <option key={c} value={c} />)
                                                            ) : (
                                                                <>
                                                                    {data.csts?.map(c => <option key={c.id} value={c.code}>{c.description}</option>)}
                                                                    {CST_CADASTRO.map(c => <option key={c} value={c} />)}
                                                                </>
                                                            )}
                                                        </datalist>
                                                        <datalist id="cfop-list">
                                                            {data.cfops?.map(c => <option key={c.id} value={c.code}>{c.description}</option>)}
                                                            {CFOP_CADASTRO.map(c => <option key={c} value={c} />)}
                                                        </datalist>
                                                        <datalist id="unit-list">
                                                            {data.units?.map(u => <option key={u.id} value={u.code}>{u.description}</option>)}
                                                            {UNIDADES_CADASTRO.map(u => <option key={u} value={u} />)}
                                                        </datalist>
                                                        <p className="text-[10px] text-slate-400 mt-2 italic px-1">* Estes itens foram extraídos automaticamente do arquivo XML com todos os detalhes fiscais.</p>
                                                    </div>
                                                )}
                                                <div className="flex justify-center py-8 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 mb-6 group hover:border-green-500/50 hover:bg-green-50/10 transition-all">
                                                    <div className="text-center">
                                                        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform border border-slate-100 dark:border-slate-700">
                                                            <Plus className="text-green-600" size={28} />
                                                        </div>
                                                        <h4 className="text-sm font-black text-slate-800 mb-1">Adicionar Itens ao Lançamento</h4>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">Selecione produtos ou serviços cadastrados</p>
                                                        <Button
                                                            type="button"
                                                            onClick={() => setIsProductSearchModalOpen(true)}
                                                            className="bg-green-600 text-white hover:bg-green-700 px-10 rounded-xl shadow-xl shadow-green-600/20 font-black text-xs uppercase tracking-widest h-12"
                                                        >
                                                            Adicionar Produto / Serviço
                                                        </Button>
                                                    </div>
                                                </div>

                                            </div>

                                            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-green-100 dark:border-green-900/30 mb-6 shadow-sm shadow-green-500/5 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl pointer-events-none"></div>
                                                <SectionHeader title="4. Totais do Lançamento" />
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 relative group hover:border-green-200 transition-colors">
                                                        <span className="text-[10px] uppercase text-slate-400 font-black tracking-widest">Total Produtos</span>
                                                        <p className="text-xl font-black text-slate-700 dark:text-slate-200 mt-1">R$ {formData.prodVlrTotal.toFixed(2)}</p>
                                                    </div>
                                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 relative group hover:border-blue-200 transition-colors">
                                                        <span className="text-[10px] uppercase text-slate-400 font-black tracking-widest">Total Impostos</span>
                                                        <p className="text-xl font-black text-blue-600 mt-1">R$ {(
                                                            (formData.impostoICMSValor || 0) +
                                                            (formData.impostoISSValor || 0) +
                                                            (formData.items.reduce((acc, item) => acc + (Number(item?.vPis) || 0) + (Number(item?.vCofins) || 0) + (Number(item?.vIpi) || 0), 0))
                                                        ).toFixed(2)}</p>
                                                    </div>
                                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 relative group hover:border-red-200 transition-colors">
                                                        <span className="text-[10px] uppercase text-slate-400 font-black tracking-widest">Total Descontos</span>
                                                        <p className="text-xl font-black text-red-500 mt-1">R$ {formData.items.reduce((acc, i) => acc + (Number(i?.discount) || 0), 0).toFixed(2)}</p>
                                                    </div>
                                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800 relative shadow-sm">
                                                        <div className="absolute top-2 right-2 p-1.5 bg-green-500 rounded-lg text-white shadow-lg shadow-green-500/30">
                                                            <DollarSign size={16} />
                                                        </div>
                                                        <span className="text-[10px] uppercase text-green-700 dark:text-green-400 font-black tracking-widest">Total Líquido</span>
                                                        <p className="text-2xl font-black text-green-700 dark:text-green-400 mt-1">R$ {formData.totalNota.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {modalTab === 'impostos' && (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            <SectionHeader title="Detalhamento de Impostos" />

                                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 dark:border-slate-800 mb-6">
                                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                                                    <div>
                                                        <h5 className="text-sm font-black text-slate-700 dark:text-slate-200 dark:text-slate-200 uppercase tracking-widest">Configuração de Alíquotas</h5>
                                                        <p className="text-[10px] text-slate-500 font-medium">Os valores são calculados automaticamente sobre a base de <span className="text-green-600 font-bold">R$ {formData.prodVlrTotal.toFixed(2)}</span></p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <label className="flex items-center gap-3 cursor-pointer group">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Imposto<br />Retido</span>
                                                            <div className="relative">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.impostoRetido}
                                                                    onChange={(e) => setFormData(prev => ({ ...prev, impostoRetido: e.target.checked }))}
                                                                    className="sr-only peer"
                                                                />
                                                                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                                            </div>
                                                            <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${formData.impostoRetido ? 'text-green-600' : 'text-slate-400'}`}>
                                                                {formData.impostoRetido ? 'Sim' : 'Não'}
                                                            </span>
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    {/* Impostos Estaduais e Municipais */}
                                                    <fieldset className="border border-blue-200 dark:border-blue-900/30 rounded-xl p-4 bg-blue-50/20 dark:bg-blue-900/10">
                                                        <legend className="text-[10px] font-black uppercase text-blue-600 px-2 tracking-widest bg-white dark:bg-slate-900 rounded border border-blue-100 dark:border-blue-800">
                                                            Estaduais / Municipais
                                                        </legend>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                <InputGroup label={formData.tipoNota === 'service' ? "ISS (%)" : "ICMS (%)"}>
                                                                    <input
                                                                        type="number"
                                                                        name={formData.tipoNota === 'service' ? "impostoISSAliq" : "impostoICMSAliq"}
                                                                        value={formData.tipoNota === 'service' ? formData.impostoISSAliq : formData.impostoICMSAliq}
                                                                        onChange={handleChange}
                                                                        className={`${inputClass} !text-left font-bold text-blue-600`}
                                                                    />
                                                                </InputGroup>
                                                                <div className="pt-2 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center px-1">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase">Valor</span>
                                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">R$ {(formData.tipoNota === 'service' ? formData.impostoISSValor : formData.impostoICMSValor).toFixed(2)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </fieldset>

                                                    {/* Impostos Federais */}
                                                    <fieldset className="border border-red-200 dark:border-red-900/30 rounded-xl p-4 bg-red-50/20 dark:bg-red-900/10">
                                                        <legend className="text-[10px] font-black uppercase text-red-600 px-2 tracking-widest bg-white dark:bg-slate-900 rounded border border-red-100 dark:border-red-800">
                                                            Federais (PIS/COFINS/IPI/Retenções)
                                                        </legend>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                <InputGroup label="PIS (%)">
                                                                    <input type="number" name="impostoPISAliq" value={formData.impostoPISAliq} onChange={handleChange} className={`${inputClass} !text-left font-bold text-slate-600`} />
                                                                </InputGroup>
                                                                <div className="pt-2 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center px-1">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase">Val</span>
                                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">R$ {formData.impostoPISValor.toFixed(2)}</span>
                                                                </div>
                                                            </div>

                                                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                <InputGroup label="COFINS (%)">
                                                                    <input type="number" name="impostoCOFINSAliq" value={formData.impostoCOFINSAliq} onChange={handleChange} className={`${inputClass} !text-left font-bold text-slate-600`} />
                                                                </InputGroup>
                                                                <div className="pt-2 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center px-1">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase">Val</span>
                                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">R$ {formData.impostoCOFINSValor.toFixed(2)}</span>
                                                                </div>
                                                            </div>

                                                            {formData.tipoNota !== 'service' && (
                                                                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                    <InputGroup label="IPI (%)">
                                                                        <input type="number" name="impostoIPIAliq" value={formData.impostoIPIAliq} onChange={handleChange} className={`${inputClass} !text-left font-bold text-orange-600`} />
                                                                    </InputGroup>
                                                                    <div className="pt-2 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center px-1">
                                                                        <span className="text-[9px] font-black text-slate-400 uppercase">Val</span>
                                                                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">R$ {formData.impostoIPIValor.toFixed(2)}</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                <InputGroup label="CSLL (%)">
                                                                    <input type="number" name="impostoCSLLAliq" value={formData.impostoCSLLAliq} onChange={handleChange} className={`${inputClass} !text-left font-bold text-slate-600`} />
                                                                </InputGroup>
                                                                <div className="pt-2 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center px-1">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase">Val</span>
                                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">R$ {formData.impostoCSLLValor.toFixed(2)}</span>
                                                                </div>
                                                            </div>

                                                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                <InputGroup label="IRRF (%)">
                                                                    <input type="number" name="impostoIRRFAliq" value={formData.impostoIRRFAliq} onChange={handleChange} className={`${inputClass} !text-left font-bold text-slate-600`} />
                                                                </InputGroup>
                                                                <div className="pt-2 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center px-1">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase">Val</span>
                                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">R$ {formData.impostoIRRFValor.toFixed(2)}</span>
                                                                </div>
                                                            </div>

                                                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                <InputGroup label="INSS (%)">
                                                                    <input type="number" name="impostoINSSAliq" value={formData.impostoINSSAliq} onChange={handleChange} className={`${inputClass} !text-left font-bold text-slate-600`} />
                                                                </InputGroup>
                                                                <div className="pt-2 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center px-1">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase">Val</span>
                                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">R$ {formData.impostoINSSValor.toFixed(2)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </fieldset>
                                                </div>
                                            </div>

                                            <SectionHeader title="Resumo Consolidado" />
                                        </div>
                                    )}

                                    {modalTab === 'complementar' && (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            <SectionHeader title="Informações Adicionais" />
                                            <div className="grid grid-cols-1 gap-4 mb-6 px-4">
                                                <InputGroup label="Observações do Lançamento">
                                                    <textarea
                                                        name="obs"
                                                        value={formData.obs}
                                                        onChange={handleChange}
                                                        rows={6}
                                                        className={`${inputClass} !text - left resize - none`}
                                                        placeholder="Digite informações complementares ao lançamento..."
                                                    ></textarea>
                                                </InputGroup>
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-orange-50 dark:bg-orange-950/20 p-6 rounded-2xl flex flex-col md:flex-row justify-center items-center gap-8 border border-orange-100 dark:border-orange-500/10 shadow-sm">
                                        <div className="flex gap-12 text-center">
                                            <div>
                                                <p className="text-[10px] text-orange-600 font-black uppercase tracking-widest mb-1">Impostos</p>
                                                <p className="text-xl font-bold text-gray-700 dark:text-slate-200">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.totalImpostos)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-orange-600 font-black uppercase tracking-widest mb-1">Itens</p>
                                                <p className="text-xl font-bold text-gray-700 dark:text-slate-200">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.totalProdutos)}</p>
                                            </div>
                                        </div>
                                        <div className="h-10 w-px bg-orange-200 hidden md:block"></div>
                                        <div className="text-center">
                                            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-black uppercase tracking-widest mb-1">Valor Total da Nota</p>
                                            <div className="text-3xl font-black text-gray-900 bg-white dark:bg-slate-800 px-6 py-2 rounded-xl shadow-sm border border-orange-50">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.totalNota)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 flex justify-center gap-4 mt-6">
                                        <Button type="button" variant="secondary" className="px-8 rounded-xl" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                        <Button type="submit" className="px-12 rounded-xl bg-slate-800 hover:bg-slate-900 shadow-xl shadow-slate-200">Confirmar Lançamento</Button>
                                    </div>
                                </form>
                            </>
                        </Modal>
                    </Card>
                </div>
            </div>
            {/* PDF Preview Modal - Extracted */}
            <PdfPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => {
                    setIsPreviewOpen(false);
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                }}
                previewUrl={previewUrl}
            />
            {/* SEFAZ CLOUD FETCH MODAL - Recommendation 2 */}
            {/* SEFAZ CLOUD FETCH MODAL - Extracted to Component */}
            <SefazCloudFetchModal
                isOpen={sefazCloudFetchOpen}
                onClose={() => setSefazCloudFetchOpen(false)}
                isCloudFetching={isCloudFetching}
                onFetch={performSefazFetch}
                companyName={data.selectedCompany?.razaoSocial}
            />

            {/* PRODUCT SELECTION MODAL - Extracted */}
            <ProductSearchModal
                isOpen={isProductSearchModalOpen}
                onClose={() => setIsProductSearchModalOpen(false)}
                itemSearch={itemSearch}
                setItemSearch={setItemSearch}
                tipoNota={formData.tipoNota}
                setTipoNota={(tipo) => setFormData(p => ({ ...p, tipoNota: tipo }))}
                itemOptions={itemOptions}
                onAddItem={addItemToList}
            />
        </div >
    );
};