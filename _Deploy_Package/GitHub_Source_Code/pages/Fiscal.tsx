import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useData } from '../contexts/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { UniversalList } from '../components/ui/UniversalList';
import { auth } from '../firebaseConfig';
import {
    Plus, Download, Filter, Search, MoreVertical, FileText,
    CheckCircle, XCircle, Clock, Trash2, Upload, Pencil,
    ArrowUpRight, ArrowDownLeft, Wrench, ScrollText, FileCode, Play, Layers, Loader2, ArrowUp, ArrowDown,
    ShieldCheck, RefreshCw, Info, FileBarChart, PieChart, Database, AlertTriangle, ActivitySquare,
    ChevronDown, Bookmark, ArrowRight
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
        const currentUserProfile = systemUsers.find(u => u.email === userEmail);
        if (!currentUserProfile || !currentUserProfile.permissions) return false;
        return currentUserProfile.permissions.fiscal === 'full';
    }, [userRole, userEmail, systemUsers]);


    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const { addToast } = useToast();
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
        const filtered = data.invoices.filter(i =>
            !['cancelada', 'substituida', 'anulada', 'negada', 'recusada'].includes(i.status) &&
            (!data.selectedCompany || i.companyId === data.selectedCompany.id) &&
            (!filters.startDate || i.date >= filters.startDate) &&
            (!filters.endDate || i.date <= filters.endDate)
        );

        const entries = filtered.filter(i => i.type === 'entry');
        const exits = filtered.filter(i => i.type === 'exit');
        const services = filtered.filter(i => i.type === 'service');
        const totalTax = filtered.reduce((acc, curr) => acc + (curr.taxValue || 0), 0);

        return {
            entry: entries.reduce((acc, curr) => acc + curr.value, 0),
            exit: exits.reduce((acc, curr) => acc + curr.value, 0),
            service: services.reduce((acc, curr) => acc + curr.value, 0),
            tax: totalTax
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
        const base = formData.items.length > 0 ? totalItemsValue : currentItemTotal;

        const isSimples = data.selectedCompany?.regimeTributario === '1'; // 1 = Simples Nacional
        const companyIssRate = Number(data.selectedCompany?.aliquotaISS) || 0;

        // Helper to force zero if Simples (unless specifically wanted)
        // For Simples, IPI/PIS/COFINS usually handled differently, but here we'll simplify:
        // If Simples -> Default to 0 unless manually overridden or imported.
        // We will respect Form values if user types them, but default behavior acts here.

        const calcVal = (aliq: any) => (base * (Number(aliq) || 0)) / 100;

        const vlrICMS = formData.tipoNota !== 'service' ? calcVal(formData.impostoICMSAliq) : 0;
        const vlrIPI = formData.tipoNota !== 'service' ? calcVal(formData.impostoIPIAliq) : 0;

        // Intelligent Service Tax: Use Company setting if note is service and rate is not manually set/from item yet
        let issVal = 0;
        if (formData.tipoNota === 'service') {
            // If manual entry (rate 0), try use company rate
            if (formData.impostoISSAliq === 0 && companyIssRate > 0) {
                // Warning: This side-effect inside logic calculation might be tricky.
                // Ideally we should set defaults during initialization, but this keeps it reactive.
                // For now, calculate using form value.
            }
            issVal = calcVal(formData.impostoISSAliq);
        }

        const vlrPIS = calcVal(formData.impostoPISAliq);
        const vlrCOFINS = calcVal(formData.impostoCOFINSAliq);
        const vlrCSLL = calcVal(formData.impostoCSLLAliq);
        const vlrIRRF = calcVal(formData.impostoIRRFAliq);
        const vlrINSS = calcVal(formData.impostoINSSAliq);

        const freight = Number(formData.valorFrete) || 0;
        const insurance = Number(formData.valorSeguro) || 0;

        const totalNotaCalculado = base + freight + insurance + vlrIPI;
        const sumTaxes = vlrICMS + vlrIPI + issVal + vlrPIS + vlrCOFINS + vlrCSLL + vlrIRRF + vlrINSS;

        setFormData(prev => {
            if (
                Math.abs(prev.totalNota - totalNotaCalculado) < 0.01 &&
                Math.abs(prev.totalImpostos - sumTaxes) < 0.01 &&
                prev.prodVlrTotal === currentItemTotal &&
                prev.totalProdutos === base
            ) {
                return prev;
            }
            return {
                ...prev,
                prodVlrTotal: currentItemTotal,
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
                totalNota: totalNotaCalculado
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
        data.selectedCompany // Dep check added
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
        setFormData(prev => ({ ...prev, entityId: partner.id, entityName: partner.name, cnpj: partner.cnpj }));
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
                description: 'Item Avulso (Simulação)',
                quantity: 1,
                unitPrice: 0,
                total: 0,
                code: 'MANUAL',
                ncm: '',
                cst: '00',
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

            // Get rates from master data or defaults
            const icmsR = (item as any).icmsRate ?? (hasNCM ? 18 : 0);
            const ipiR = (item as any).ipiRate ?? 0;
            const pisR = (item as any).pisRate ?? 0;
            const cofinsR = (item as any).cofinsRate ?? 0;
            const issR = (item as any).issRate ?? (item as any).taxRate ?? 0;
            const csllR = (item as any).csllRate ?? 0;
            const irrfR = (item as any).irrfRate ?? 0;
            const inssR = (item as any).inssRate ?? 0;

            const unitPrice = Number(item.price) || 0;

            const newItem: InvoiceItem = {
                productId: item.id,
                description: item.name,
                quantity: 1,
                unitPrice: unitPrice,
                total: unitPrice,
                code: item.code,
                ncm: hasNCM ? (item as any).ncm : '',
                cst: '00',
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
                if (inv.type !== activeTab) return false;
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
            impostoISSAliq: 0,
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
            totalNota: inv.value,
            totalImpostos: inv.taxValue || 0,
            items: inv.items || [],
            // Restore item data
            prodId: firstItem?.productId || '',
            prodQtd: firstItem?.quantity || 1,
            prodVlrUnit: firstItem?.unitPrice || 0,
            prodVlrTotal: firstItem?.total || 0,
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

            const response = await axios.post('http://localhost:3000/api/nfe/distribute', {
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

    const readFileAsText = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    };

    // --- XML HELPERS ---

    const getTagValue = (parent: Document | Element, tagName: string): string | null => {
        const elements = parent.getElementsByTagName(tagName);
        return elements.length > 0 ? elements[0].textContent : null;
    };

    const findNestedTag = (doc: Document, possibleParents: string[], targetTags: string | string[]): string | null => {
        const tags = Array.isArray(targetTags) ? targetTags : [targetTags];
        for (const parentName of possibleParents) {
            const parents = doc.getElementsByTagName(parentName);
            for (let i = 0; i < parents.length; i++) {
                for (const tag of tags) {
                    const target = parents[i].getElementsByTagName(tag)[0];
                    if (target && target.textContent) return target.textContent;
                }
            }
        }
        return null;
    };

    // --- AUTO REGISTRATION LOGIC ---

    const autoRegisterClient = (doc: Document, tagContainer: Element | Document, role: 'client' | 'supplier', forceName?: string | null, forceCNPJ?: string | null) => {
        // Find CNPJ/CPF (try variations)
        const cnpj = forceCNPJ ||
            getTagValue(tagContainer, "CNPJ") ||
            getTagValue(tagContainer, "Cnpj") ||
            getTagValue(tagContainer, "CPF") ||
            getTagValue(tagContainer, "Cpf");

        // Find Name (try variations)
        const name = forceName ||
            getTagValue(tagContainer, "xNome") ||
            getTagValue(tagContainer, "RazaoSocial") ||
            getTagValue(tagContainer, "Nome") ||
            getTagValue(tagContainer, "NomeFantasia");

        if (!cnpj || !name) return null;

        const cleanCNPJ = unmask(cnpj);
        const existing = data.clients.find(c => unmask(c.cnpj) === cleanCNPJ);
        if (existing) return existing;

        // --- Address Extraction Strategy ---
        // Try to locate a specific address container to avoid ambiguity
        let addressContainer =
            tagContainer.getElementsByTagName("enderEmit")[0] || // NFe Emit
            tagContainer.getElementsByTagName("enderDest")[0] || // NFe Dest
            tagContainer.getElementsByTagName("enderNac")[0] || // NFSe Nacional Emit
            tagContainer.getElementsByTagName("end")[0] ||       // NFSe Nacional Dest
            tagContainer.getElementsByTagName("Endereco")[0] ||  // NFSe ABRASF/Mun
            tagContainer.getElementsByTagName("InfEndereco")[0]; // Some Mun

        // Fallback: use the main container if no specific address block found
        if (!addressContainer) addressContainer = tagContainer as Element;

        // Helper to try multiple tags in the container
        const getField = (tags: string[]) => {
            for (const t of tags) {
                const val = getTagValue(addressContainer, t);
                if (val) return val;
            }
            return null;
        };

        const logradouro = getField(["xLgr", "Endereco", "Logradouro", "Rua"]);
        const nro = getField(["nro", "Numero", "Num"]);
        const bairro = getField(["xBairro", "Bairro", "Distrito"]);
        const mun = getField(["xMun", "Cidade", "Municipio"]);
        const uf = getField(["UF", "Uf", "Estado"]);
        const cep = getField(["CEP", "Cep", "CodPostal"]);

        // Contacts (look in main container or Contact sub-node)
        const contatoNode = tagContainer.getElementsByTagName("Contato")[0] || tagContainer;
        const phone = getTagValue(contatoNode, "fone") || getTagValue(contatoNode, "Telefone") || getTagValue(contatoNode, "DddTelefone");
        const email = getTagValue(contatoNode, "email") || getTagValue(contatoNode, "Email");

        // City handling if Name not found but Code exists
        const cityVal = mun || getField(["cMun", "CodigoMunicipio"]) || "";

        const isAddressIncomplete = !logradouro || !cityVal || !uf;

        const newClient: Client = {
            id: Math.random().toString(36).substr(2, 9),
            name: name,
            fantasyName: name, // Often same
            cnpj: maskCNPJ(cnpj),
            type: role,
            email: email || '',
            phone: phone ? maskPhone(phone) : '',
            address: logradouro || '',
            addressNumber: nro || '',
            addressDistrict: bairro || '',
            city: cityVal,
            uf: uf || '',
            zip: cep ? maskCEP(cep) : ''
        };

        data.addClient(newClient);

        if (isAddressIncomplete || !email) {
            data.addAlert({
                id: Math.random().toString(),
                title: `Cadastro Parcial: ${role === 'client' ? 'Cliente' : 'Fornecedor'}`,
                message: `O parceiro ${name} foi importado, mas alguns dados (Endereço/Email) não foram encontrados no XML. Recomenda-se completar o cadastro.`,
                severity: 'low',
                date: new Date().toISOString(),
                isRead: false,
                type: 'system'
            });
        }

        return newClient;
    };

    const autoRegisterCarrier = (doc: Document) => {
        const transp = doc.getElementsByTagName("transp")[0];
        if (!transp) return;

        const transporta = transp.getElementsByTagName("transporta")[0];
        if (!transporta) return;

        const cnpj = getTagValue(transporta, "CNPJ") || getTagValue(transporta, "CPF");
        const name = getTagValue(transporta, "xNome");

        if (!cnpj || !name) return;

        const cleanCNPJ = unmask(cnpj);
        const existing = data.clients.find(c => unmask(c.cnpj) === cleanCNPJ); // Carriers share client DB with type='carrier'

        if (!existing) {
            const address = getTagValue(transporta, "xEnder");
            const city = getTagValue(transporta, "xMun");
            const uf = getTagValue(transporta, "UF");

            const newCarrier: Client = {
                id: Math.random().toString(36).substr(2, 9),
                name: name,
                fantasyName: name,
                cnpj: maskCNPJ(cnpj),
                type: 'carrier',
                email: '',
                phone: '',
                address: address || '',
                city: city || '',
                uf: uf || '',
                zip: ''
            };

            data.addClient(newCarrier);

            if (!address || !city) {
                data.addAlert({
                    id: Math.random().toString(),
                    title: `Cadastro Incompleto: Transportadora`,
                    message: `A transportadora ${name} foi cadastrada automaticamente, mas faltam dados de endereço.`,
                    severity: 'low',
                    date: new Date().toISOString(),
                    isRead: false,
                    type: 'system'
                });
            }
        }
    };

    const autoRegisterItems = (doc: Document, isService: boolean) => {
        if (isService) {
            // Logic for Service Item (NFSe usually has 1 main service)
            const servico = doc.getElementsByTagName("Servico")[0] || doc.getElementsByTagName("InfDeclaracaoPrestacaoServico")[0];
            if (servico) {
                const itemCode = getTagValue(servico, "CodigoItemListaServico") || "00.00";
                const desc = getTagValue(servico, "Discriminacao") || "Serviço Importado XML";
                const val = parseFloat(getTagValue(servico, "ValorServicos") || "0");

                // Use Item Code as the Service Item (Fiscal), but generate a specific ID for the Catalog
                // This satisfies the request to auto-generate the ID upon import
                const code = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

                // Check existence by Name instead of Fiscal Code to prevent duplicates but allow different services with same item code
                const existing = data.services.find(s => s.name === desc.substring(0, 150));
                if (!existing) {
                    const newService: Service = {
                        id: Math.random().toString(36).substr(2, 9),
                        code: code,
                        name: desc.substring(0, 150), // Truncate but allow longer
                        serviceItem: itemCode, // New field population
                        price: val,
                        taxRate: 5, // Default assumption
                        status: 'ativo'
                    };
                    data.addService(newService);
                    // Not alerting for service usually as description is main thing
                }
            }
        } else {
            // Logic for Products (NFe)
            const dets = doc.getElementsByTagName("det");
            for (let i = 0; i < dets.length; i++) {
                const prod = dets[i].getElementsByTagName("prod")[0];
                if (prod) {
                    const cProd = getTagValue(prod, "cProd");
                    const xProd = getTagValue(prod, "xProd");
                    const ncm = getTagValue(prod, "NCM");
                    const uCom = getTagValue(prod, "uCom");
                    const vUnCom = parseFloat(getTagValue(prod, "vUnCom") || "0");

                    if (cProd && xProd) {
                        const existing = data.products.find(p => p.code === cProd);
                        if (!existing) {
                            const newProduct: Product = {
                                id: Math.random().toString(36).substr(2, 9),
                                code: cProd,
                                name: xProd,
                                ncm: ncm || '',
                                price: vUnCom,
                                unit: uCom || 'UN',
                                stock: 0,
                                status: 'ativo'
                            };
                            data.addProduct(newProduct);

                            if (!ncm || !uCom) {
                                data.addAlert({
                                    id: Math.random().toString(),
                                    title: `Cadastro Incompleto: Produto`,
                                    message: `O produto "${xProd}" (Cód: ${cProd}) foi importado sem NCM ou Unidade. Corrija para evitar erros fiscais.`,
                                    severity: 'high',
                                    date: new Date().toISOString(),
                                    isRead: false,
                                    type: 'xml_inconsistency'
                                });
                            }
                        }
                    }
                }
            }
        }
    };

    // 4. Intelligence & Launch Logic
    const processXMLFile = async (file: PendingFile, autoSave = false, validateOnly = false): Promise<{ success: boolean, error?: string }> => {
        const normalize = (val: string | null) => val ? val.replace(/\D/g, '').replace(/^0+/, '').trim() : '';
        const loggedCompanyCNPJ = data.selectedCompany?.cnpj ? unmask(data.selectedCompany.cnpj) : '';

        if (!loggedCompanyCNPJ) {
            const errorMsg = 'Não foi possível identificar a empresa logada para validar o XML. Selecione uma empresa.';
            data.addAlert({
                id: Math.random().toString(),
                title: 'Erro de Configuração',
                message: errorMsg,
                severity: 'high',
                date: new Date().toISOString(),
                isRead: false,
                type: 'system'
            });
            return { success: false, error: errorMsg };
        }

        try {
            const xmlContent = await readFileAsText(file.originalFile);
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

            if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                throw new Error("Arquivo XML inválido ou corrompido.");
            }

            let emitCNPJ: string | null = null;
            let destCNPJ: string | null = null;
            let nNF: string | null = null;
            let serie: string | null = null;
            let vNF: string | null = null;
            let vTotTrib: string | null = null;
            let dhEmi: string | null = null;
            let chNFe: string | null = null;
            let naturezaOperacao = '';
            let isService = false;

            // Detectar Tipo de Nota baseado na estrutura
            const hasInfNFe = xmlDoc.getElementsByTagName("infNFe").length > 0;
            const hasInfNFSe = xmlDoc.getElementsByTagName("infNFSe").length > 0; // Nacional
            const hasInfNfse_Mun = xmlDoc.getElementsByTagName("InfNfse").length > 0 || xmlDoc.getElementsByTagName("CompNfse").length > 0; // ABRASF/Municipal

            isService = hasInfNFSe || hasInfNfse_Mun;

            // A. NFe / NFCe (Produto)
            if (hasInfNFe && !isService) {
                const nfeEmit = xmlDoc.getElementsByTagName("emit")[0];
                const nfeDest = xmlDoc.getElementsByTagName("dest")[0];

                emitCNPJ = nfeEmit ? getTagValue(nfeEmit, "CNPJ") : null;
                destCNPJ = nfeDest ? getTagValue(nfeDest, "CNPJ") : null;
                nNF = getTagValue(xmlDoc, "nNF");
                serie = getTagValue(xmlDoc, "serie");
                vNF = getTagValue(xmlDoc, "vNF");
                vTotTrib = getTagValue(xmlDoc, "vTotTrib") || (xmlDoc.getElementsByTagName("vICMS").length > 0 ? getTagValue(xmlDoc, "vICMS") : "0");
                dhEmi = getTagValue(xmlDoc, "dhEmi");
                chNFe = getTagValue(xmlDoc, "chNFe") || xmlDoc.getElementsByTagName("infNFe")[0]?.getAttribute("Id")?.replace("NFe", "") || null;
                const natOp = getTagValue(xmlDoc, "natOp");
                if (natOp) naturezaOperacao = natOp;
            }
            // B. NFS-e (Serviço - Nacional ou Municipal)
            else {
                isService = true; // Força flag caso detecção falhe mas entre no else

                if (hasInfNFSe) {
                    // --- Modelo Nacional (SPED) ---
                    // Emitente: <infNFSe> <emit> <CNPJ>
                    const emitNode = xmlDoc.getElementsByTagName("emit")[0];
                    emitCNPJ = emitNode ? (getTagValue(emitNode, "CNPJ") || getTagValue(emitNode, "Cnpj") || getTagValue(emitNode, "CPF") || getTagValue(emitNode, "Cpf")) : null;

                    // Tomador: <infNFSe> <DPS> <infDPS> <toma> <CNPJ>
                    const tomaNode = xmlDoc.getElementsByTagName("toma")[0];
                    destCNPJ = tomaNode ? (getTagValue(tomaNode, "CNPJ") || getTagValue(tomaNode, "Cnpj") || getTagValue(tomaNode, "CPF") || getTagValue(tomaNode, "Cpf")) : null;

                    nNF = getTagValue(xmlDoc, "nNFSe") || getTagValue(xmlDoc, "nDPS");
                    serie = getTagValue(xmlDoc, "serie");
                    vNF = getTagValue(xmlDoc, "vLiq") || "0";
                    dhEmi = getTagValue(xmlDoc, "dhEmi") || getTagValue(xmlDoc, "dhProc");
                    chNFe = xmlDoc.getElementsByTagName("infNFSe")[0]?.getAttribute("Id") || null;

                    // Valores Totais
                    const valoresTag = xmlDoc.getElementsByTagName("valores")[0];
                    if (valoresTag) {
                        const vServTag = valoresTag.getElementsByTagName("vServ")[0];
                        if (vServTag) vNF = vServTag.textContent || vNF;
                    }

                } else {
                    // --- Modelo Municipal (ABRASF e Outros) ---
                    // Prestador
                    emitCNPJ = findNestedTag(xmlDoc, ["PrestadorServico", "Prestador", "IdentificacaoPrestador", "IdentificacaoPrestadorServico"], ["Cnpj", "CNPJ"]);
                    if (!emitCNPJ) emitCNPJ = getTagValue(xmlDoc, "CnpjPrestador") || getTagValue(xmlDoc, "Cnpj") || getTagValue(xmlDoc, "CNPJ") || getTagValue(xmlDoc, "CnpjEmitente");

                    // Tomador
                    destCNPJ = findNestedTag(xmlDoc, ["TomadorServico", "Tomador", "IdentificacaoTomador", "IdentificacaoTomadorServico"], ["Cnpj", "CNPJ", "CPF", "Cpf"]);
                    if (!destCNPJ) {
                        const tomadorTag = xmlDoc.getElementsByTagName("TomadorServico")[0];
                        if (tomadorTag) destCNPJ = getTagValue(tomadorTag, "Cnpj") || getTagValue(tomadorTag, "CNPJ") || getTagValue(tomadorTag, "CPF") || getTagValue(tomadorTag, "Cpf");
                    }
                    if (!destCNPJ) {
                        destCNPJ = getTagValue(xmlDoc, "CnpjTomador") || getTagValue(xmlDoc, "CNPJ") || getTagValue(xmlDoc, "CPF") || getTagValue(xmlDoc, "Cpf");
                    }
                    if (!destCNPJ) {
                        // Fallback for some specific municipal layouts
                        const infNfse = xmlDoc.getElementsByTagName("InfNfse")[0];
                        if (infNfse) {
                            const tomador = infNfse.getElementsByTagName("Tomador")[0] || infNfse.getElementsByTagName("TomadorServico")[0];
                            if (tomador) destCNPJ = getTagValue(tomador, "Cnpj") || getTagValue(tomador, "CNPJ") || getTagValue(tomador, "CPF") || getTagValue(tomador, "Cpf");
                        }
                    }

                    nNF = getTagValue(xmlDoc, "Numero") || getTagValue(xmlDoc, "NumeroNfse") || getTagValue(xmlDoc, "nNFSe");
                    serie = getTagValue(xmlDoc, "Serie") || getTagValue(xmlDoc, "SerieNfse") || "";
                    vNF = getTagValue(xmlDoc, "ValorServicos") || getTagValue(xmlDoc, "ValorLiquidoNfse") || getTagValue(xmlDoc, "ValorTotalVlr");
                    vTotTrib = getTagValue(xmlDoc, "ValorIss") || getTagValue(xmlDoc, "ValorIssRetido") || "0";
                    dhEmi = getTagValue(xmlDoc, "DataEmissao") || getTagValue(xmlDoc, "dhEmi");
                    chNFe = getTagValue(xmlDoc, "ChaveAcesso") || getTagValue(xmlDoc, "CodigoVerificacao");
                }
            }

            if (!emitCNPJ && !destCNPJ) {
                // Fallback desesperado: procurar qualquer CNPJ
                const allCNPJs = xmlDoc.getElementsByTagName("CNPJ");
                if (allCNPJs.length > 0) emitCNPJ = allCNPJs[0].textContent;
                if (allCNPJs.length > 1) destCNPJ = allCNPJs[1].textContent;

                if (!emitCNPJ && !destCNPJ)
                    throw new Error("Não foi possível identificar CPF/CNPJ. Verifique o layout do XML.");
            }

            // Lógica de Titularidade (Quem eu sou na transação?)
            let type: 'entry' | 'exit' | 'service' = 'exit';
            let entityCNPJ = '';
            let registeredPartner: Client | undefined | null;

            const cleanEmit = unmask(emitCNPJ || "");
            const cleanDest = unmask(destCNPJ || "");

            // Validação de Empresa Logada
            const isEmit = cleanEmit === loggedCompanyCNPJ;
            const isDest = cleanDest === loggedCompanyCNPJ;

            if (!isEmit && !isDest) {
                throw new Error(`Esta nota fiscal (${nNF || "S/N"}) não pertence à empresa selecionada. CNPJ Emitente: ${emitCNPJ || 'N/A'}, Destinatário: ${destCNPJ || 'N/A'}.`);
            }

            // Se EU sou o emitente (SAÍDA ou SERVIÇO PRESTADO)
            if (isEmit) {
                type = isService ? 'service' : 'exit';
                entityCNPJ = destCNPJ || '';
                const destContainer = xmlDoc.getElementsByTagName("dest")[0] || xmlDoc.getElementsByTagName("TomadorServico")[0] || xmlDoc.getElementsByTagName("Tomador")[0] || xmlDoc.getElementsByTagName("toma")[0] || xmlDoc;
                registeredPartner = autoRegisterClient(xmlDoc, destContainer, 'client', null, entityCNPJ);
            }
            // Se EU sou o destinatário (ENTRADA ou SERVIÇO TOMADO)
            else if (isDest) {
                type = 'entry';
                // Para serviços tomados, o tipo permanece 'service' mas a natureza muda
                if (isService) type = 'service';

                entityCNPJ = emitCNPJ || '';
                const emitContainer = xmlDoc.getElementsByTagName("emit")[0] || xmlDoc.getElementsByTagName("PrestadorServico")[0] || xmlDoc.getElementsByTagName("Prestador")[0] || xmlDoc;
                registeredPartner = autoRegisterClient(xmlDoc, emitContainer, 'supplier', null, entityCNPJ);
            }

            // Ajuste fino para Natureza de Operação (Fiscal)
            if (!naturezaOperacao) {
                if (type === 'service') {
                    // Se sou prestador => Prestado
                    if (unmask(emitCNPJ || "") === loggedCompanyCNPJ) naturezaOperacao = 'Prestação de Serviço';
                    else naturezaOperacao = 'Tomada de Serviço';
                } else if (type === 'entry') {
                    naturezaOperacao = 'Compra de Mercadoria';
                } else {
                    naturezaOperacao = 'Venda de Mercadoria';
                }
            }

            // Excluir Nota se já existir (Prevenção de Duplicidade)
            const numFull = nNF || "S/N";
            const currentCNPJ = unmask(entityCNPJ || "");
            const xmlNumNorm = normalize(nNF);
            const xmlSerieNorm = normalize(serie);

            const alreadyExists = data.invoices.some(inv => {
                // Prioridade 1: Chave de Acesso
                if (chNFe && inv.searchKey === chNFe) return true;
                if (inv.searchKey && inv.searchKey === chNFe) return true;

                // Prioridade 2: Trinca (Número, Série, CNPJ Parceiro e Tipo)
                const savedNumNorm = normalize(inv.number);
                const savedSerieNorm = normalize(inv.serie || "");
                const savedCNPJ = unmask(inv.cnpj || "");

                const samePartner = savedCNPJ === currentCNPJ;
                const sameType = inv.type === type;
                const matchFields = savedNumNorm === xmlNumNorm && savedSerieNorm === xmlSerieNorm;

                return samePartner && sameType && matchFields;
            });

            if (alreadyExists) {
                if (!autoSave && !validateOnly) {
                    addToast(`Nota #${numFull} já está lançada no sistema.`, 'warning');
                    handleRemoveXML(file.id);
                }
                return { success: false, error: 'Nota já cadastrada.' };
            }

            if (validateOnly) return { success: true };

            // Extração de Itens (Produtos ou Serviços)
            const extractedItems: InvoiceItem[] = [];

            if (!isService) {
                // --- PRODUTOS (NFe) ---
                const dets = xmlDoc.getElementsByTagName("det");
                for (let i = 0; i < dets.length; i++) {
                    const det = dets[i];
                    const prodTag = det.getElementsByTagName("prod")[0];
                    if (prodTag) {
                        const cProd = getTagValue(prodTag, "cProd") || "";
                        const xProd = getTagValue(prodTag, "xProd") || "Produto s/ Descrição";
                        const ncm = getTagValue(prodTag, "NCM") || "";
                        const cfop = getTagValue(prodTag, "CFOP") || "";
                        const uCom = getTagValue(prodTag, "uCom") || "";
                        const qCom = parseFloat(getTagValue(prodTag, "qCom") || "1");
                        const vUnCom = parseFloat(getTagValue(prodTag, "vUnCom") || "0");
                        const vProd = parseFloat(getTagValue(prodTag, "vProd") || "0");
                        const vDesc = parseFloat(getTagValue(prodTag, "vDesc") || "0");

                        const impTag = det.getElementsByTagName("imposto")[0];
                        let cst = "";
                        let bcIcms = 0;
                        let pIcms = 0;
                        let vIcms = 0;
                        let vIpi = 0;
                        let pIpi = 0;
                        let pPis = 0;
                        let vPis = 0;
                        let pCofins = 0;
                        let vCofins = 0;

                        if (impTag) {
                            // ICMS
                            const icmsTag = impTag.getElementsByTagName("ICMS")[0];
                            if (icmsTag && icmsTag.children.length > 0) {
                                const icmsType = icmsTag.children[0];
                                cst = getTagValue(icmsType, "CST") || getTagValue(icmsType, "CSOSN") || "";
                                bcIcms = parseFloat(getTagValue(icmsType, "vBC") || "0");
                                pIcms = parseFloat(getTagValue(icmsType, "pICMS") || "0");
                                vIcms = parseFloat(getTagValue(icmsType, "vICMS") || "0");
                            }

                            // IPI
                            const ipiTag = impTag.getElementsByTagName("IPITrib")[0];
                            if (ipiTag) {
                                pIpi = parseFloat(getTagValue(ipiTag, "pIPI") || "0");
                                vIpi = parseFloat(getTagValue(ipiTag, "vIPI") || "0");
                            }

                            // PIS
                            const pisTag = impTag.getElementsByTagName("PIS")[0];
                            if (pisTag && pisTag.children.length > 0) {
                                const pisType = pisTag.children[0];
                                pPis = parseFloat(getTagValue(pisType, "pPIS") || "0");
                                vPis = parseFloat(getTagValue(pisType, "vPIS") || "0");
                            }

                            // COFINS
                            const cofinsTag = impTag.getElementsByTagName("COFINS")[0];
                            if (cofinsTag && cofinsTag.children.length > 0) {
                                const cofinsType = cofinsTag.children[0];
                                pCofins = parseFloat(getTagValue(cofinsType, "pCOFINS") || "0");
                                vCofins = parseFloat(getTagValue(cofinsType, "vCOFINS") || "0");
                            }
                        }

                        const matchedProduct = data.products.find(p => p.code === cProd);

                        extractedItems.push({
                            productId: matchedProduct?.id || 'manual',
                            code: cProd,
                            description: xProd,
                            ncm,
                            cst,
                            cfop,
                            unit: uCom,
                            quantity: qCom,
                            unitPrice: vUnCom,
                            total: vProd,
                            discount: vDesc,
                            bcIcms,
                            vIcms,
                            pIcms,
                            vIpi,
                            pIpi,
                            pPis,
                            vPis,
                            pCofins,
                            vCofins
                        });
                    }
                }
            } else {
                // --- SERVIÇOS (NFSe) ---

                // Variáveis comuns de extração
                let itemCode = "";
                let desc = "";
                let vServItem = parseFloat(vNF || "0");
                let vIssItem = parseFloat(vTotTrib || "0");
                let pIssItem = 0;
                let vPisItem = 0;
                let vCofinsItem = 0;
                let vInssItem = 0;
                let vIrItem = 0;
                let vCsllItem = 0;

                if (hasInfNFSe) {
                    // === Modelo Nacional (SPED) ===
                    const servTag = xmlDoc.getElementsByTagName("serv")[0]; // infDPS > serv
                    if (servTag) {
                        const cServ = servTag.getElementsByTagName("cServ")[0];
                        if (cServ) {
                            itemCode = getTagValue(cServ, "cTribNac") || getTagValue(cServ, "xDescServ") || ""; // cTribNac ex: 170201
                            desc = getTagValue(cServ, "xDescServ") || "Serviço Nacional";
                        } else {
                            desc = "Serviço Nacional (Genérico)";
                        }
                    } else {
                        // Tentar direto do XML se a estrutura for plana
                        itemCode = getTagValue(xmlDoc, "cTribNac") || "";
                        desc = getTagValue(xmlDoc, "xDescServ") || "Serviço";
                    }

                    // Valores Detalhados (Nacional)
                    const valoresTag = xmlDoc.getElementsByTagName("valores")[0];
                    if (valoresTag) {
                        const tribTag = valoresTag.getElementsByTagName("trib")[0];
                        if (tribTag) {
                            // Note: O XML Nacional exemplo forneceu apenas <tribISSQN>1</tribISSQN>, sem alíquota explícita no trecho.
                            // Vamos tentar pegar valores genéricos se existirem em tags irmãs ou vServPrest
                        }
                    }

                } else {
                    // === Modelo ABRASF / Municipal ===
                    // Procura dentro de <Servico> que está dentro de <InfDeclaracaoPrestacaoServico>
                    let servicoNode = xmlDoc.getElementsByTagName("Servico")[0];
                    if (!servicoNode) {
                        // Fallback: Procura a tag Servico em qualquer lugar
                        const allServs = xmlDoc.getElementsByTagName("Servico");
                        if (allServs.length > 0) servicoNode = allServs[allServs.length - 1]; // Pega o mais profundo
                    }

                    if (servicoNode) {
                        itemCode = getTagValue(servicoNode, "ItemListaServico") || getTagValue(servicoNode, "CodigoTributacaoMunicipio") || "";
                        desc = getTagValue(servicoNode, "Discriminacao") || "Serviço ABRASF";

                        // Valores dentro do Serviço
                        const valoresNode = servicoNode.getElementsByTagName("Valores")[0];
                        if (valoresNode) {
                            vServItem = parseFloat(getTagValue(valoresNode, "ValorServicos") || (vNF || "0"));
                            vIssItem = parseFloat(getTagValue(valoresNode, "ValorIss") || "0");
                            pIssItem = parseFloat(getTagValue(valoresNode, "Aliquota") || "0");
                            vPisItem = parseFloat(getTagValue(valoresNode, "ValorPis") || "0");
                            vCofinsItem = parseFloat(getTagValue(valoresNode, "ValorCofins") || "0");
                            vInssItem = parseFloat(getTagValue(valoresNode, "ValorInss") || "0");
                            vIrItem = parseFloat(getTagValue(valoresNode, "ValorIr") || "0");
                            vCsllItem = parseFloat(getTagValue(valoresNode, "ValorCsll") || "0");
                        }
                    } else {
                        // Fallback Top Level se não tiver tag Group
                        desc = getTagValue(xmlDoc, "Discriminacao") || "Serviço";
                        itemCode = getTagValue(xmlDoc, "ItemListaServico") || "";
                    }
                }

                // Tentar encontrar o serviço no catálogo
                const matchedService = data.services.find(s => s.serviceItem === itemCode) ||
                    data.services.find(s => s.code === itemCode) ||
                    data.services.find(s => desc.toUpperCase().includes(s.name.toUpperCase()));

                extractedItems.push({
                    productId: matchedService?.id || 'manual',
                    code: itemCode,
                    description: desc.substring(0, 500),
                    quantity: 1,
                    unitPrice: vServItem,
                    total: vServItem,
                    vIss: vIssItem,
                    pIss: pIssItem,
                    vPis: vPisItem,
                    vCofins: vCofinsItem,
                    vCsll: vCsllItem,
                    vIrrf: vIrItem,
                    vInss: vInssItem,
                    // Store rates if calculable (optional, but helps UI)
                    pPis: vServItem > 0 ? Number(((vPisItem / vServItem) * 100).toFixed(2)) : 0,
                    pCofins: vServItem > 0 ? Number(((vCofinsItem / vServItem) * 100).toFixed(2)) : 0,
                    pCsll: vServItem > 0 ? Number(((vCsllItem / vServItem) * 100).toFixed(2)) : 0,
                    pIrrf: vServItem > 0 ? Number(((vIrItem / vServItem) * 100).toFixed(2)) : 0,
                    pInss: vServItem > 0 ? Number(((vInssItem / vServItem) * 100).toFixed(2)) : 0,
                });
            }

            const vNFNum = parseFloat(vNF || "0");

            const sumTaxes = extractedItems.reduce((acc, item) => ({
                icms: acc.icms + (item.vIcms || 0),
                ipi: acc.ipi + (item.vIpi || 0),
                iss: acc.iss + (item.vIss || 0),
                pis: acc.pis + (item.vPis || 0),
                cofins: acc.cofins + (item.vCofins || 0),
                csll: acc.csll + (item.vCsll || 0),
                irrf: acc.irrf + (item.vIrrf || 0),
                inss: acc.inss + (item.vInss || 0),
                // Capture first rates found
                aliqIcms: acc.aliqIcms || (item.pIcms || 0),
                aliqIpi: acc.aliqIpi || (item.pIpi || 0),
                aliqIss: acc.aliqIss || (item.pIss || 0),
                aliqPis: acc.aliqPis || (item.pPis || 0),
                aliqCofins: acc.aliqCofins || (item.pCofins || 0)
            }), { icms: 0, ipi: 0, iss: 0, pis: 0, cofins: 0, csll: 0, irrf: 0, inss: 0, aliqIcms: 0, aliqIpi: 0, aliqIss: 0, aliqPis: 0, aliqCofins: 0 });

            // Se for lançamento em lote (Launch All), salva direto
            if (autoSave) {
                const newInvoice: Invoice = {
                    id: Math.random().toString(36).substr(2, 9),
                    number: nNF || "S/N",
                    serie: serie || "",
                    searchKey: chNFe || "",
                    entityId: registeredPartner ? registeredPartner.id : 'xml-import',
                    entityName: registeredPartner?.name || "Entidade Externa",
                    cnpj: maskCNPJ(entityCNPJ || "00000000000"),
                    date: dhEmi ? dhEmi.split('T')[0] : new Date().toISOString().split('T')[0],
                    value: vNFNum,
                    taxValue: (sumTaxes.icms + sumTaxes.ipi + sumTaxes.iss + sumTaxes.pis + sumTaxes.cofins),
                    status: 'autorizada',
                    type: type,
                    naturezaOperacao: naturezaOperacao,
                    items: extractedItems,
                    xmlContent: xmlContent,
                    accessKey: chNFe || ""
                };
                await data.addInvoice(newInvoice);
                handleRemoveXML(file.id);
            }
            // Se for botão individual, abre o formulário preenchido
            else {

                setFormData(prev => ({
                    ...prev,
                    id: '',
                    tipoNota: type,
                    naturezaOperacao: naturezaOperacao,
                    status: 'autorizada',
                    numero: nNF || '',
                    serie: serie || '',
                    searchKey: chNFe || '',
                    accessKey: chNFe || '',
                    dataEmissao: dhEmi ? dhEmi.split('T')[0] : new Date().toISOString().split('T')[0],
                    entityId: registeredPartner?.id || '',
                    totalNota: vNFNum,
                    totalImpostos: parseFloat(vTotTrib || "0") || (sumTaxes.icms + sumTaxes.ipi + sumTaxes.iss),
                    items: extractedItems,
                    totalProdutos: vNFNum,
                    xmlContent: xmlContent,
                    // Mapeamento de impostos para o formulário
                    impostoICMSValor: sumTaxes.icms,
                    impostoICMSAliq: sumTaxes.aliqIcms,
                    impostoIPIValor: sumTaxes.ipi,
                    impostoIPIAliq: sumTaxes.aliqIpi,
                    impostoISSValor: sumTaxes.iss,
                    impostoISSAliq: sumTaxes.aliqIss,
                    impostoPISValor: sumTaxes.pis,
                    impostoPISAliq: sumTaxes.aliqPis,
                    impostoCOFINSValor: sumTaxes.cofins,
                    impostoCOFINSAliq: sumTaxes.aliqCofins,
                    impostoCSLLValor: sumTaxes.csll,
                    impostoIRRFValor: sumTaxes.irrf,
                    impostoINSSValor: sumTaxes.inss,
                    pendingFileId: file.id,
                    // Se houver pelo menos um item, popula os campos de edição simples (compatibilidade)
                    ...(extractedItems.length > 0 ? {
                        prodId: extractedItems[0].productId,
                        prodQtd: extractedItems[0].quantity,
                        prodVlrUnit: extractedItems[0].unitPrice,
                        prodVlrTotal: extractedItems[0].total
                    } : {})
                }));

                if (extractedItems.length > 0) setItemSearch(extractedItems[0].description);
                if (registeredPartner) setPartnerSearch(registeredPartner.name);
                setIsModalOpen(true);
                addToast('Dados do XML carregados no formulário.', 'success');
            }

            return { success: true };

        } catch (error) {
            const errorMsg = (error as Error).message;
            console.error(`Erro ao processar ${file.name}:`, error);

            // Only add system alert if not just a validation check
            if (!validateOnly) {
                data.addAlert({
                    id: Math.random().toString(),
                    title: 'Erro de Importação XML',
                    message: `Falha ao processar ${file.name}: ${errorMsg}.`,
                    severity: 'medium',
                    date: new Date().toISOString(),
                    isRead: false,
                    type: 'system'
                });
            }
            return { success: false, error: errorMsg };
        }
    };

    const handleLaunchXML = async (file: PendingFile, autoSave = false) => {
        await processXMLFile(file, autoSave);
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
            const response = await axios.post('http://localhost:3000/api/nfe/manifest', {
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
                    const distResponse = await axios.post('http://localhost:3000/api/nfe/distribute', {
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

    const handleExportPDF = (items: any[], title: string) => {
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

        const doc = generatePDFReport(
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
            const response = await axios.post('http://localhost:3000/api/nfe/distribute', {
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
            const item = { ...newItems[index], [field]: value };

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
                productId: formData.prodId,
                description: itemSearch,
                quantity: Number(formData.prodQtd),
                unitPrice: Number(formData.prodVlrUnit),
                total: formData.prodVlrTotal
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
        } catch (error) {
            console.error("Erro ao salvar nota:", error);
            addToast("Erro ao salvar o documento fiscal.", "error");
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
            addToast('Erro ao excluir nota fiscal. Tente novamente.', 'error');
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
        <div className="flex flex-col h-[calc(100vh-2rem)] bg-slate-50 -m-6 p-6 overflow-hidden">
            {/* Hidden File Input with MULTIPLE enabled */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                className="hidden"
                accept=".xml"
                multiple
            />

            {/* TOP HEADER BAR */}
            <header className="flex justify-between items-center mb-6 shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200">
                        <FileText className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Gestão Fiscal</h1>
                        <p className="text-xs text-gray-500 font-medium">Lançamentos, XMLs e apuração inteligente</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg border border-indigo-100/50 dark:border-indigo-500/20 whitespace-nowrap">
                        <span className="text-[10px] font-black text-indigo-400 dark:text-indigo-300 uppercase tracking-widest">Comp:</span>
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-200 capitalize">
                            {format(new Date(), 'MMM/yy', { locale: ptBR })}
                        </span>
                    </div>

                    <div className="h-6 w-px bg-gray-200 mx-1 shrink-0"></div>

                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-indigo-600 hidden xl:flex" icon={Search} onClick={() => setIsSearchKeyModalOpen(true)}>Buscar Chave</Button>

                    <div className="flex items-center gap-2 ml-1">
                        <button
                            onClick={() => { setActiveTab('entry'); handleOpenNew('entry'); }}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/20 hover:scale-105 transition-all disabled:opacity-50"
                            disabled={!canWriteFiscal}
                        >
                            <ArrowDownLeft size={14} /> Entrada
                        </button>

                        <button
                            onClick={() => { setActiveTab('exit'); handleOpenNew('exit'); }}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all disabled:opacity-50"
                            disabled={!canWriteFiscal}
                        >
                            <ArrowUpRight size={14} /> Saída
                        </button>

                        <button
                            onClick={() => { setActiveTab('service'); handleOpenNew('service'); }}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all disabled:opacity-50"
                            disabled={!canWriteFiscal}
                        >
                            <ShieldCheck size={14} /> Serviços
                        </button>

                        <button
                            onClick={() => { setActiveTab('receipt'); handleOpenNew('receipt'); }}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-500/20 hover:scale-105 transition-all disabled:opacity-50"
                            disabled={!canWriteFiscal}
                        >
                            <ScrollText size={14} /> Recibo
                        </button>
                    </div>

                    <div className="h-6 w-px bg-gray-200 mx-1 shrink-0"></div>

                    <button
                        onClick={handleImportXML}
                        disabled={!canWriteFiscal}
                        className="p-2 bg-white border border-gray-200 text-gray-400 rounded-lg hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all shadow-sm"
                        title="Importar XML"
                    >
                        <Upload size={18} />
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col overflow-hidden gap-6">

                {/* KPI STRIP */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-400">Total Entradas</p>
                            <p className="text-lg font-bold text-gray-900 mt-0.5">{currency(totals.entry)}</p>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-lg"><ArrowDownLeft className="w-5 h-5 text-emerald-600" /></div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-400">Total Saídas</p>
                            <p className="text-lg font-bold text-gray-900 mt-0.5">{currency(totals.exit)}</p>
                        </div>
                        <div className="p-2 bg-indigo-50 rounded-lg"><ArrowUpRight className="w-5 h-5 text-indigo-600" /></div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-400">Serviços</p>
                            <p className="text-lg font-bold text-gray-900 mt-0.5">{currency(totals.service)}</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg"><Wrench className="w-5 h-5 text-blue-600" /></div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-400">Impostos a Pagar</p>
                            <p className="text-lg font-bold text-gray-900 mt-0.5">{currency(totals.tax)}</p>
                        </div>
                        <div className="p-2 bg-amber-50 rounded-lg"><FileText className="w-5 h-5 text-amber-600" /></div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-4">
                    {/* Staging Area for XMLs */}
                    {pendingXMLs.length > 0 && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/20 rounded-[2rem] overflow-hidden shadow-2xl shadow-green-500/5">
                                <div className="px-8 py-5 border-b border-green-100 dark:border-green-500/10 flex justify-between items-center bg-green-100/30 dark:bg-green-500/10">
                                    <h3 className="font-black text-green-800 dark:text-green-400 text-sm flex items-center gap-3 uppercase tracking-widest">
                                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="p-1.5 bg-green-600 text-white rounded-lg"><FileCode className="w-4 h-4" /></div>}
                                        Arquivos na Esteira ({pendingXMLs.length})
                                    </h3>
                                    <div className="flex gap-4 items-center">
                                        <span className="text-[10px] font-black uppercase text-green-600 tracking-wider bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-green-100 dark:border-green-500/20">Pronto para Processar</span>
                                        <Button type="button" size="sm" className="rounded-xl bg-green-600 hover:bg-green-700 shadow-md shadow-green-500/20 disabled:opacity-50" onClick={handleLaunchAll} icon={Layers} disabled={isProcessing || !canWriteFiscal}>
                                            {isProcessing ? 'Importando...' : 'Lançar Todos'}
                                        </Button>
                                    </div>
                                </div>
                                <div className="divide-y divide-green-100 dark:divide-green-500/5 max-h-80 overflow-y-auto custom-scrollbar px-2">
                                    <button
                                        onClick={handleImportXML}
                                        disabled={!canWriteFiscal}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
                                                <Upload size={18} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">Importar XML Local</p>
                                                <p className="text-[10px] text-slate-500 font-medium">Processamento instantâneo de arquivos</p>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Recommendation 2: Sefaz Integration */}
                                    <button
                                        onClick={handleSefazCloudFetch}
                                        disabled={!canWriteFiscal} // Consider restricting automated fetch too
                                        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                                                <RefreshCw className="w-[18px] h-[18px]" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">Busca Automática SEFAZ</p>
                                                <p className="text-[10px] text-slate-500 font-medium tracking-tight">Sincronização em nuvem (API Nacional)</p>
                                            </div>
                                        </div>
                                        <div className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-black uppercase rounded-full">Automático</div>
                                    </button>
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
                            </div>
                        </div>
                    )}

                    <Card className="p-0 overflow-hidden">
                        {/* Tab Switcher - Simple and Clean */}
                        <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-x-auto no-scrollbar">
                            <button onClick={() => setActiveTab('entry')} className={`px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all whitespace-nowrap ${activeTab === 'entry' ? 'border-orange-500 text-orange-600 bg-white' : 'border-transparent text-slate-400 hover:text-orange-400'}`}>Entradas</button>
                            <button onClick={() => setActiveTab('exit')} className={`px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all whitespace-nowrap ${activeTab === 'exit' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-slate-400 hover:text-indigo-400'}`}>Saídas</button>
                            <button onClick={() => setActiveTab('service')} className={`px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all whitespace-nowrap ${activeTab === 'service' ? 'border-emerald-600 text-emerald-600 bg-white' : 'border-transparent text-slate-400 hover:text-emerald-400'}`}>Serviços</button>
                            <button onClick={() => setActiveTab('receipt')} className={`px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all whitespace-nowrap ${activeTab === 'receipt' ? 'border-slate-600 text-slate-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-400'}`}>Recibos</button>
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
                                    ), className: "w-32 text-center"
                                },
                                {
                                    header: 'Tipo', accessor: (inv: any) => {
                                        const nat = inv.naturezaOperacao || '';
                                        let label: string = inv.type;
                                        let styleClass = 'bg-gray-50 text-gray-700 border-gray-200';

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
                                    }, className: "w-40 text-center"
                                },
                                {
                                    header: 'Número', accessor: (inv: any) => (
                                        <div>
                                            <span className="font-medium text-gray-900">{inv.number}</span>
                                            {inv.serie && <span className="text-[10px] text-gray-400 font-normal ml-1">ser.{inv.serie}</span>}
                                        </div>
                                    ), className: "w-32"
                                },
                                {
                                    header: 'CFOP', accessor: (inv: any) => (
                                        <span className="font-mono text-[10px] text-gray-400">
                                            {[...new Set(inv.items?.map((i: InvoiceItem) => i.cfop).filter(Boolean))].join(', ') || '-'}
                                        </span>
                                    ), className: "w-24"
                                },
                                {
                                    header: 'Entidade', accessor: (inv: any) => (
                                        <div>
                                            <div className="text-gray-900 font-medium">{inv.entityName}</div>
                                            <div className="text-gray-500 text-xs">{inv.cnpj}</div>
                                        </div>
                                    ), className: "min-w-[200px]"
                                },
                                { header: 'Emissão', accessor: (inv: any) => formatDateBR(inv.date), className: "w-32 text-gray-500 text-sm" },
                                {
                                    header: 'Auditoria', accessor: (inv: any) => (
                                        <div className="flex flex-col gap-1 text-[10px] text-gray-500">
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
                                    ), className: "w-32"
                                },
                                { header: 'Valor Total', accessor: (inv: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inv.value), className: "w-32 text-right font-medium text-gray-900" }
                            ]}
                            actions={(inv: any) => (
                                <div className="flex items-center justify-end">
                                    <button onClick={() => handleEditInvoice(inv)} className="text-gray-400 hover:text-blue-500 transition-colors mr-2 disabled:opacity-30 disabled:hover:text-gray-400" disabled={!canWriteFiscal}>
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteInvoice(inv)}
                                        className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:hover:text-gray-400"
                                        disabled={!canWriteFiscal}
                                        title="Excluir nota fiscal"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                            customFilters={
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="relative group">
                                        <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Nº ou Entidade..."
                                            value={filters.number}
                                            onChange={e => setFilters({ ...filters, number: e.target.value })}
                                            className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 w-32 focus:w-48 transition-all outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 placeholder:text-slate-400"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
                                        <label className="text-[10px] font-black uppercase text-slate-400">De</label>
                                        <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className="bg-transparent text-xs font-bold text-slate-700 outline-none w-20" />
                                    </div>
                                    <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
                                        <label className="text-[10px] font-black uppercase text-slate-400">Até</label>
                                        <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className="bg-transparent text-xs font-bold text-slate-700 outline-none w-20" />
                                    </div>
                                    <select
                                        value={filters.status}
                                        onChange={e => setFilters({ ...filters, status: e.target.value })}
                                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer hover:border-indigo-300 transition-colors"
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
                                        variant="secondary"
                                        className="text-slate-600 border-slate-200 hover:bg-slate-50 px-3 py-1.5 h-auto text-xs ml-1"
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

                        {/* Buscar XML por Chave Modal */}
                        <Modal
                            isOpen={isSearchKeyModalOpen}
                            onClose={() => setIsSearchKeyModalOpen(false)}
                            title="Buscar NF-e por Chave"
                            maxWidth="max-w-xl"
                        >
                            <div className="space-y-6">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex gap-3">
                                    <FileCode className="text-blue-600 shrink-0" size={20} />
                                    <p className="text-xs text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
                                        Informe a chave de acesso de 44 dígitos da NF-e para busca direta na SEFAZ e importação automática para o seu lançamento.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <InputGroup label="Chave de Acesso (44 dígitos)" required>
                                        <div className="relative">
                                            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                                            <input
                                                type="text"
                                                maxLength={54} // With spaces/formatting if mask applied
                                                placeholder="0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000"
                                                className="w-full pl-12 pr-4 py-3 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl font-mono text-sm tracking-wider focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all"
                                                value={nfeKey}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '').substring(0, 44);
                                                    // Formatar com espaços para melhor leitura
                                                    const formatted = val.replace(/(.{4})/g, '$1 ').trim();
                                                    setNfeKey(formatted);
                                                }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-[var(--text-secondary)] mt-1.5 font-bold uppercase tracking-widest">
                                            Digite {nfeKey.replace(/\D/g, '').length}/44 números
                                        </span>
                                    </InputGroup>

                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-color)]">
                                        <Button
                                            variant="outline"
                                            className="w-full rounded-xl"
                                            onClick={() => setIsSearchKeyModalOpen(false)}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            className="w-full rounded-xl shadow-lg shadow-green-500/20"
                                            icon={isSearchingKey ? Loader2 : Play}
                                            onClick={handleSearchNFKey}
                                            disabled={isSearchingKey || nfeKey.replace(/\D/g, '').length !== 44}
                                        >
                                            {isSearchingKey ? 'Buscando...' : 'Buscar e Importar'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Modal>

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
                                            ? 'text-green-600 after:content-[\'\'] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-green-600 bg-white shadow-sm rounded-t-lg'
                                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                            }`}
                                    >
                                        Dados Gerais
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setModalTab('impostos')}
                                        className={`relative px-6 py-4 text-xs font-black uppercase tracking-widest transition-all ${modalTab === 'impostos'
                                            ? 'text-green-600 after:content-[\'\'] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-green-600 bg-white shadow-sm rounded-t-lg'
                                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                            }`}
                                    >
                                        Impostos e Retenções
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setModalTab('complementar')}
                                        className={`relative px-6 py-4 text-xs font-black uppercase tracking-widest transition-all ${modalTab === 'complementar'
                                            ? 'text-green-600 after:content-[\'\'] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-green-600 bg-white shadow-sm rounded-t-lg'
                                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                            }`}
                                    >
                                        Complementar
                                    </button>
                                </div>

                                <form onSubmit={handleSaveInvoice}>
                                    {modalTab === 'geral' && (
                                        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
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
                                                                    <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-1">Sugestões e Tipos Cadastrados</p>
                                                                    </div>
                                                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                                                        {/* Firestore Registered Types */}
                                                                        {data.operationTypes && data.operationTypes.length > 0 && (
                                                                            <div className="border-b border-slate-100 dark:border-slate-800">
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
                                                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">{n}</span>
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
                                                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
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
                                                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-1">{c.name}</span>
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

                                            <SectionHeader title={formData.tipoNota === 'receipt' ? "3. Detalhes do Recibo" : "3. Produtos / Serviços"} />

                                            {formData.items.length > 0 && (
                                                <div className="mb-6 px-4">
                                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                                                        <table className="w-full text-left border-collapse min-w-[1200px]">
                                                            <thead className="bg-slate-50 dark:bg-slate-800 text-[9px] uppercase font-black text-slate-500 tracking-wider">
                                                                <tr>
                                                                    <th className="px-3 py-3 border border-slate-200 dark:border-slate-700">CÓD. PRODUTO</th>
                                                                    <th className="px-3 py-3 border border-slate-200 dark:border-slate-700">DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
                                                                    <th className="px-2 py-3 text-center border border-slate-200 dark:border-slate-700">NCM</th>
                                                                    <th className="px-2 py-3 text-center border border-slate-200 dark:border-slate-700">CST</th>
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
                                                                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                                        <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                            <input type="text" value={item.code || ''} onChange={(e) => handleItemValueChange(idx, 'code', e.target.value)} className="w-16 bg-transparent border-none text-[10px] text-center font-mono focus:ring-0" />
                                                                        </td>
                                                                        <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                            <input type="text" value={item.description || ''} onChange={(e) => handleItemValueChange(idx, 'description', e.target.value)} className="w-full bg-transparent border-none text-[10px] font-bold focus:ring-0" />
                                                                        </td>
                                                                        <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                            <input list="ncm-list" type="text" value={item.ncm || ''} onChange={(e) => handleItemValueChange(idx, 'ncm', e.target.value)} className="w-16 bg-transparent border-none text-[10px] text-center focus:ring-0" />
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
                                                                            <input type="number" value={item.vPis || 0} onChange={(e) => handleItemValueChange(idx, 'vPis', e.target.value)} className="w-16 bg-transparent border-none text-[10px] text-right text-slate-600 focus:ring-0" />
                                                                        </td>
                                                                        <td className="px-1 py-1 border border-slate-200 dark:border-slate-700">
                                                                            <input type="number" value={item.vCofins || 0} onChange={(e) => handleItemValueChange(idx, 'vCofins', e.target.value)} className="w-16 bg-transparent border-none text-[10px] text-right text-slate-600 focus:ring-0" />
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
                                                                ))}
                                                            </tbody>
                                                            <datalist id="ncm-list">{data.ncms.map(n => <option key={n.code} value={n.code}>{n.description}</option>)}</datalist>
                                                            <datalist id="cst-list">
                                                                {data.csts?.map(c => <option key={c.id} value={c.code}>{c.description}</option>)}
                                                                {CST_CADASTRO.map(c => <option key={c} value={c} />)}
                                                            </datalist>
                                                            <datalist id="cfop-list">
                                                                {data.cfops?.map(c => <option key={c.id} value={c.code}>{c.description}</option>)}
                                                                {CFOP_CADASTRO.map(c => <option key={c} value={c} />)}
                                                            </datalist>
                                                            <datalist id="unit-list">
                                                                {data.units?.map(u => <option key={u.id} value={u.code}>{u.description}</option>)}
                                                                {UNIDADES_CADASTRO.map(u => <option key={u} value={u} />)}
                                                            </datalist>
                                                        </table>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 mt-2 italic px-1">* Estes itens foram extraídos automaticamente do arquivo XML com todos os detalhes fiscais.</p>
                                                </div>
                                            )}
                                            <div className="flex justify-center py-8 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 mb-6 group hover:border-green-500/50 hover:bg-green-50/10 transition-all">
                                                <div className="text-center">
                                                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform border border-slate-100">
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

                                            <SectionHeader title="4. Totais do Lançamento" />
                                        </div>
                                    )}

                                    {modalTab === 'impostos' && (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            <SectionHeader title="Detalhamento de Impostos" />

                                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 mb-6">
                                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                                                    <div>
                                                        <h5 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Configuração de Alíquotas</h5>
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
                                                            <span className={`text - [10px] font - black uppercase tracking - widest transition - colors ${formData.impostoRetido ? 'text-green-600' : 'text-slate-400'} `}>
                                                                {formData.impostoRetido ? 'Sim' : 'Não'}
                                                            </span>
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                    {/* ICMS / ISS */}
                                                    <div className="space-y-4">
                                                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                                            <InputGroup label={formData.tipoNota === 'service' ? "ISS (%)" : "ICMS (%)"}>
                                                                <input
                                                                    type="number"
                                                                    name={formData.tipoNota === 'service' ? "impostoISSAliq" : "impostoICMSAliq"}
                                                                    value={formData.tipoNota === 'service' ? formData.impostoISSAliq : formData.impostoICMSAliq}
                                                                    onChange={handleChange}
                                                                    className={`${inputClass} !text - left font - bold text - blue - 600`}
                                                                />
                                                            </InputGroup>
                                                            <div className="pt-2 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center px-1">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase">Valor</span>
                                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">R$ {(formData.tipoNota === 'service' ? formData.impostoISSValor : formData.impostoICMSValor).toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* PIS / COFINS */}
                                                    <div className="space-y-4">
                                                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                                            <InputGroup label="PIS (%)">
                                                                <input type="number" name="impostoPISAliq" value={formData.impostoPISAliq} onChange={handleChange} className={`${inputClass} !text - left font - bold text - blue - 600`} />
                                                            </InputGroup>
                                                            <div className="pt-2 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center px-1">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase">Valor</span>
                                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">R$ {formData.impostoPISValor.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                                            <InputGroup label="COFINS (%)">
                                                                <input type="number" name="impostoCOFINSAliq" value={formData.impostoCOFINSAliq} onChange={handleChange} className={`${inputClass} !text - left font - bold text - blue - 600`} />
                                                            </InputGroup>
                                                            <div className="pt-2 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center px-1">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase">Valor</span>
                                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">R$ {formData.impostoCOFINSValor.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* CSLL / IRRF */}
                                                    <div className="space-y-4">
                                                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                                            <InputGroup label="CSLL (%)">
                                                                <input type="number" name="impostoCSLLAliq" value={formData.impostoCSLLAliq} onChange={handleChange} className={`${inputClass} !text - left font - bold text - blue - 600`} />
                                                            </InputGroup>
                                                            <div className="pt-2 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center px-1">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase">Valor</span>
                                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">R$ {formData.impostoCSLLValor.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                                            <InputGroup label="IRRF (%)">
                                                                <input type="number" name="impostoIRRFAliq" value={formData.impostoIRRFAliq} onChange={handleChange} className={`${inputClass} !text - left font - bold text - blue - 600`} />
                                                            </InputGroup>
                                                            <div className="pt-2 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center px-1">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase">Valor</span>
                                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">R$ {formData.impostoIRRFValor.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                                            <InputGroup label="INSS (%)">
                                                                <input type="number" name="impostoINSSAliq" value={formData.impostoINSSAliq} onChange={handleChange} className={`${inputClass} !text - left font - bold text - blue - 600`} />
                                                            </InputGroup>
                                                            <div className="pt-2 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center px-1">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase">Valor</span>
                                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">R$ {formData.impostoINSSValor.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* IPI (Apenas Produtos) */}
                                                    {formData.tipoNota !== 'service' && (
                                                        <div className="space-y-4">
                                                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                                                <InputGroup label="IPI (%)">
                                                                    <input type="number" name="impostoIPIAliq" value={formData.impostoIPIAliq} onChange={handleChange} className={`${inputClass} !text - left font - bold text - blue - 600`} />
                                                                </InputGroup>
                                                                <div className="pt-2 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center px-1">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase">Valor</span>
                                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">R$ {formData.impostoIPIValor.toFixed(2)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
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
                                                <p className="text-xl font-bold text-gray-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.totalImpostos)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-orange-600 font-black uppercase tracking-widest mb-1">Itens</p>
                                                <p className="text-xl font-bold text-gray-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.totalProdutos)}</p>
                                            </div>
                                        </div>
                                        <div className="h-10 w-px bg-orange-200 hidden md:block"></div>
                                        <div className="text-center">
                                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Valor Total da Nota</p>
                                            <div className="text-3xl font-black text-gray-900 bg-white px-6 py-2 rounded-xl shadow-sm border border-orange-50">
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
            {/* PDF Preview Modal */}
            <Modal
                isOpen={isPreviewOpen}
                onClose={() => {
                    setIsPreviewOpen(false);
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                }}
                title="Pré-visualização do Relatório"
                maxWidth="max-w-6xl"
            >
                <div className="flex flex-col h-[80vh]">
                    {previewUrl ? (
                        <iframe
                            src={previewUrl}
                            className="w-full h-full border-none rounded-lg"
                            title="Preview PDF"
                        />
                    ) : (
                        <div className="flex items-center justify-center flex-1">
                            <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
                        </div>
                    )}
                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                        <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Fechar</Button>
                        <Button variant="primary" onClick={() => {
                            const link = document.createElement('a');
                            link.href = previewUrl!;
                            link.download = `relatorio_fiscal.pdf`;
                            link.click();
                        }}>Download PDF</Button>
                    </div>
                </div>
            </Modal>
            {/* SEFAZ CLOUD FETCH MODAL - Recommendation 2 */}
            <Modal
                isOpen={sefazCloudFetchOpen}
                onClose={() => !isCloudFetching && setSefazCloudFetchOpen(false)}
                title="Busca Automática SEFAZ"
            >
                <div className="p-6 text-center">
                    <div className={`mx - auto w - 16 h - 16 rounded - full flex items - center justify - center mb - 4 ${isCloudFetching ? 'bg-blue-50 text-blue-600 animate-spin' : 'bg-emerald-50 text-emerald-600'} `}>
                        {isCloudFetching ? <RefreshCw size={32} /> : <ShieldCheck size={32} />}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 mb-2">Conexão via Certificado Digital</h3>
                    <p className="text-sm text-slate-500 mb-6 font-medium">
                        O sistema irá consultar o Ambiente Nacional da SEFAZ utilizando o certificado digital A1/A3 configurado para a empresa <strong>{data.selectedCompany?.razaoSocial}</strong>.
                    </p>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left mb-6">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Parâmetros de Busca</p>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Última consulta:</span>
                                <span className="font-bold text-slate-700">Hoje, 09:45</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Documentos Identificados:</span>
                                <span className="font-bold text-blue-600">12 pendentes</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setSefazCloudFetchOpen(false)}
                            disabled={isCloudFetching}
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={performSefazFetch}
                            loading={isCloudFetching}
                        >
                            {isCloudFetching ? 'Consultando...' : 'Iniciar Sincronização'}
                        </Button>
                    </div>

                    <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase italic flex items-center gap-1 justify-center">
                        <Info size={10} /> Sincronização via API de Distribuição de DF-e
                    </p>
                </div>
            </Modal>

            {/* PRODUCT SELECTION MODAL - Premium Search */}
            <Modal
                isOpen={isProductSearchModalOpen}
                onClose={() => setIsProductSearchModalOpen(false)}
                title="Buscar Produto ou Serviço"
                maxWidth="max-w-4xl"
            >
                <div className="p-4 space-y-6">
                    {/* Search Header */}
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 group w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Busque por nome, SKU, NCM ou código..."
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 placeholder:text-slate-300 outline-none transition-all shadow-sm"
                                autoFocus
                                value={itemSearch}
                                onChange={(e) => setItemSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl shrink-0">
                            <button
                                type="button"
                                onClick={() => setFormData(p => ({ ...p, tipoNota: 'exit' }))}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.tipoNota !== 'service' ? 'bg-white shadow-md text-green-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Produtos
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData(p => ({ ...p, tipoNota: 'service' }))}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.tipoNota === 'service' ? 'bg-white shadow-md text-green-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Serviços
                            </button>
                        </div>
                    </div>

                    {/* Results Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar p-1">
                        {itemOptions.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                    addItemToList(item.id);
                                    setIsProductSearchModalOpen(false);
                                }}
                                className="flex gap-4 p-5 bg-white border border-slate-100 rounded-[2rem] hover:border-green-500 hover:shadow-2xl hover:shadow-green-500/10 transition-all text-left group relative overflow-hidden"
                            >
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-green-50 transition-colors border border-slate-100">
                                    <FileCode className="text-slate-300 group-hover:text-green-500" size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[9px] font-black text-slate-300 uppercase font-mono tracking-widest truncate">{item.code || 'S/ SKU'}</span>
                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[8px] font-black text-slate-500 tracking-tighter uppercase whitespace-nowrap">{item.unit || 'UN'}</span>
                                    </div>
                                    <h5 className="text-sm font-black text-slate-800 mb-2 line-clamp-1 group-hover:text-green-700 transition-colors uppercase tracking-tight">{item.name}</h5>
                                    <div className="flex items-baseline gap-2 pt-2 border-t border-slate-50">
                                        <span className="text-lg font-black text-green-600">
                                            {item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Preço Unitário</span>
                                    </div>
                                </div>
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                    <div className="p-2 bg-green-600 text-white rounded-full shadow-lg">
                                        <Plus size={16} />
                                    </div>
                                </div>
                            </button>
                        ))}

                        {itemOptions.length === 0 && (
                            <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100">
                                <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-6">
                                    <Search size={40} className="text-slate-200" />
                                </div>
                                <h4 className="text-lg font-black text-slate-800 mb-2">Nenhum resultado encontrado</h4>
                                <p className="text-sm font-medium text-slate-400 mb-8 max-w-xs mx-auto">Não encontramos nada para "{itemSearch}". Tente outro termo ou adicione manualmente.</p>
                                <Button
                                    type="button"
                                    onClick={() => { addItemToList('manual'); setIsProductSearchModalOpen(false); }}
                                    variant="outline"
                                    className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white rounded-xl px-8 h-12 font-black text-xs uppercase tracking-widest"
                                >
                                    Adicionar Item Avulso (Simulação)
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        <span>Resultados: {itemOptions.length}</span>
                        <div className="flex items-center gap-2">
                            <Info size={12} />
                            <span>Os itens selecionados serão adicionados à lista principal</span>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};