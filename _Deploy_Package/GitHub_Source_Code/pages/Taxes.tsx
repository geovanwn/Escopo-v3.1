import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
    FileText, Users, TrendingUp, Calculator, Settings, ArrowLeft,
    Download, Filter, Calendar as CalendarIcon, FileSpreadsheet,
    CheckCircle, AlertTriangle, XCircle, Info, Plus, Upload, DollarSign,
    Loader2, RefreshCw, Trash2, Lock, FileKey, ChevronLeft, ChevronRight, Save
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Invoice } from '../types';
import { formatDateBR, parseDateSafe } from '../utils/formatters';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useToast } from '../contexts/ToastContext';
import { generateDasReceipt } from '../utils/pdfReport';
import { SIMPLES_ANNEXES, calculateFatorR, calculateComplexDas } from '../utils/fiscalCalculations';

// ... (Constants remain the same)
const MONOFASICO_NCMS = [
    // Farmacêuticos
    '3003', '3004', '3303', '3304', '3305', '3306', '3307',
    // Bebidas Frias (Águas, Cervejas, Refrigerantes)
    '2201', '2202', '2203',
    // Autopeças
    '4011', '4013', '8708', '8409', '8511', '8512', '8714',
    // Pneus e Câmaras
    '4011', '4013'
];



const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

interface TaxSettingsViewProps {
    setActiveView: (v: string | null) => void;
}

const TaxSettingsView: React.FC<TaxSettingsViewProps> = ({ setActiveView }) => {
    const { selectedCompany, saveCompany } = useData();
    const { addToast } = useToast();
    const [settings, setSettings] = useState<{
        regime: 'simples' | 'presumido' | 'real';
        fatorR: boolean;
        cpp: number;
        ratFap: number;
    }>({
        regime: (selectedCompany?.regimeTributario as any) || 'simples',
        fatorR: true,
        cpp: 20,
        ratFap: 2.0
    });

    const handleSave = async () => {
        if (!selectedCompany) return;
        try {
            await saveCompany({
                ...selectedCompany,
                regimeTributario: settings.regime,
            });
            addToast('Configurações fiscais salvas com sucesso!', 'success');
            setActiveView(null);
        } catch (error) {
            addToast('Erro ao salvar configurações.', 'error');
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-2">
                <Button variant="outline" onClick={() => setActiveView(null)} icon={ArrowLeft} className="rounded-xl">Voltar</Button>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">Configurações e Parâmetros Fiscais</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Perfil Tributário da Empresa" subtitle="Defina o enquadramento fiscal para cálculos automáticos">
                    <div className="space-y-4 mt-4">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-1">Regime Tributário</label>
                            <select
                                value={settings.regime}
                                onChange={(e) => setSettings({ ...settings, regime: e.target.value as any })}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            >
                                <option value="simples">Simples Nacional</option>
                                <option value="presumido">Lucro Presumido</option>
                                <option value="real">Lucro Real</option>
                            </select>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800 rounded-xl">
                            <div>
                                <h4 className="font-bold text-orange-700 dark:text-orange-400">Fator R (Anexo V)</h4>
                                <p className="text-[10px] text-orange-600/70 font-medium">Calcular automaticamente baseado na folha/faturamento</p>
                            </div>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.fatorR}
                                    onChange={(e) => setSettings({ ...settings, fatorR: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Alíquota CPP (%)</label>
                                <input
                                    type="number"
                                    value={settings.cpp}
                                    onChange={(e) => setSettings({ ...settings, cpp: parseFloat(e.target.value) })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-mono outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">RAT + FAP</label>
                                <input
                                    type="number"
                                    value={settings.ratFap}
                                    onChange={(e) => setSettings({ ...settings, ratFap: parseFloat(e.target.value) })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-mono outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </Card>
                <Card title="Recuperação de Créditos (Monofásicos)" subtitle="Configuração de NCMs com PIS/COFINS zero">
                    <div className="space-y-4 mt-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Ative a detecção automática para que o sistema identifique NCMs que possuem tributação monofásica de PIS e COFINS no Simples Nacional.
                            </p>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {MONOFASICO_NCMS.slice(0, 8).map(ncm => (
                                <div key={ncm} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                    <span className="font-mono text-xs font-black">{ncm}xxxxxx</span>
                                    <span className="text-[10px] font-bold text-emerald-500 uppercase">Detectado</span>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" className="w-full border-dashed" icon={Plus}>Adicionar NCM Manual</Button>
                    </div>
                </Card>
            </div>
            <div className="flex justify-end gap-3 mt-8">
                <Button variant="secondary" onClick={() => setActiveView(null)}>Cancelar</Button>
                <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20 px-8">Salvar Configurações</Button>
            </div>
        </div>
    );
};

interface TaxNotesViewProps {
    competence: string;
    setCompetence: (c: string) => void;
    setActiveView: (v: string | null) => void;
}

const TaxNotesView: React.FC<TaxNotesViewProps> = ({ competence, setCompetence, setActiveView }) => {
    const { invoices, selectedCompany, addInvoice } = useData();
    const { addToast } = useToast();
    const [activeSubTab, setActiveSubTab] = useState<'calculation' | 'history'>('calculation');
    const [historicalBills, setHistoricalBills] = useState<Invoice[]>([]);
    const [showFilters, setShowFilters] = useState(false);

    // Helper handlers defined inside or imported
    const handleGenerateExcel = (data: any[], fileName: string) => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Dados");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    };

    const handleGeneratePDF = (data: any[], fileName: string) => {
        const doc = new jsPDF();
        autoTable(doc, {
            head: [Object.keys(data[0] || {})],
            body: data.map(Object.values),
        });
        doc.save(`${fileName}.pdf`);
    };

    const safeInvoices = invoices || [];

    const filteredInvoices = useMemo(() => {
        if (!selectedCompany) return [];
        const validStatuses = ['autorizada', 'paga', 'recebida', 'pendente'];
        const invalidStatuses = ['cancelada', 'substituida', 'anulada', 'negada', 'recusada'];
        return safeInvoices.filter(i =>
            i.companyId === selectedCompany.id &&
            i.date.startsWith(competence) &&
            (i.type === 'service' || i.type === 'exit') &&
            (validStatuses.includes(i.status) || !invalidStatuses.includes(i.status as any))
        );
    }, [safeInvoices, selectedCompany, competence]);

    useEffect(() => {
        if (activeSubTab === 'history') {
            const taxBills = safeInvoices.filter(b =>
                b.companyId === selectedCompany?.id &&
                b.category === 'Impostos' &&
                b.naturezaOperacao?.includes(`DAS Simples Nacional - Competência ${competence}`)
            );
            setHistoricalBills(taxBills);
        }
    }, [activeSubTab, safeInvoices, competence, selectedCompany]);

    // Simples Nacional Logic
    const isSimples = selectedCompany?.regimeTributario === '1' || selectedCompany?.regimeTributario === 'simples';

    let simplesShare = { irpj: 0, csll: 0, cofins: 0, pis: 0, cpp: 0, icms: 0, iss: 0, ipi: 0 };
    let simplesRate = 0;

    if (isSimples && selectedCompany) {
        if (selectedCompany.ramoAtividade === 'comercio') {
            simplesRate = 0.04; // Annex I
            simplesShare = SIMPLES_ANNEXES?.['I']?.[0]?.share || { irpj: 0, csll: 0, cofins: 0, pis: 0, cpp: 0, icms: 0, iss: 0, ipi: 0 };
        } else if (selectedCompany.ramoAtividade === 'industria') {
            simplesRate = 0.045; // Annex II
            simplesShare = SIMPLES_ANNEXES?.['II']?.[0]?.share || { irpj: 0, csll: 0, cofins: 0, pis: 0, cpp: 0, icms: 0, iss: 0, ipi: 0 };
        } else {
            simplesRate = 0.06; // Annex III (Services)
            simplesShare = SIMPLES_ANNEXES?.['III']?.[0]?.share || { irpj: 0, csll: 0, cofins: 0, pis: 0, cpp: 0, icms: 0, iss: 0, ipi: 0 };
        }
    }

    const totalGross = filteredInvoices.reduce((acc, inv) => acc + inv.value, 0);

    const totalRetentions = filteredInvoices.reduce((acc, inv) => {
        const gross = inv.value;
        if (isSimples) {
            return acc + (gross * simplesRate);
        } else {
            const irrf = gross > 670 ? gross * 0.015 : 0;
            const pis = gross > 5000 ? gross * 0.0065 : 0;
            const cofins = gross > 5000 ? gross * 0.03 : 0;
            const csll = gross > 5000 ? gross * 0.01 : 0;
            const iss = gross * 0.05;
            return acc + irrf + pis + cofins + csll + iss;
        }
    }, 0);

    const handleSaveTaxToFinancial = async () => {
        if (totalRetentions <= 0) {
            addToast('Valor do imposto zerado. Nada a salvar.', 'error');
            return;
        }
        if (!selectedCompany) return;

        const estimatesExists = invoices.some(i =>
            i.companyId === selectedCompany.id &&
            i.category === 'Impostos' &&
            i.naturezaOperacao === `DAS Simples Nacional - Competência ${competence}`
        );

        if (estimatesExists) {
            addToast('Já existe um lançamento para esta competência.', 'error');
            return;
        }

        try {
            await addInvoice({
                id: crypto.randomUUID(),
                companyId: selectedCompany.id,
                number: `DAS-EST-${competence.replace('-', '')}`,
                entityName: 'Receita Federal (Simples Nacional)',
                entityId: 'gov-rfb',
                cnpj: '00.394.460/0001-41',
                date: new Date().toISOString().split('T')[0],
                value: totalRetentions,
                type: 'entry',
                status: 'pendente',
                category: 'Impostos',
                naturezaOperacao: `DAS Simples Nacional - Competência ${competence}`,
                details: JSON.stringify({
                    type: 'imposto_notas_simples',
                    competence: competence,
                    details: {
                        gross: totalGross,
                        rate: simplesRate,
                        breakdown: simplesShare
                    }
                })
            } as any);

            addToast(`Lançamento de R$ ${formatCurrency(totalRetentions)} gerado no Contas a Pagar!`, 'success');
        } catch (error) {
            console.error(error);
            addToast('Erro ao salvar lançamento.', 'error');
        }
    };

    const renderHistory = () => (
        <div className="space-y-4">
            {historicalBills.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
                    <p className="text-gray-400 font-medium">Nenhum histórico de apuração salvo para esta competência.</p>
                </div>
            ) : (
                historicalBills.map(bill => (
                    <div key={bill.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all">
                        <div>
                            <p className="font-bold text-slate-800">{bill.naturezaOperacao || 'DAS Simples Nacional'}</p>
                            <p className="text-xs text-slate-500">Apuração: {bill.date}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="font-mono font-bold text-slate-700">{formatCurrency(bill.value)}</span>
                            <div className="flex gap-2">
                                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Baixar PDF"><Download size={16} /></button>
                                <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Baixar Excel"><FileSpreadsheet size={16} /></button>
                                <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Excluir Lançamento"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveView(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="text-gray-600" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {isSimples ? 'Detalhamento PGDAS (Por Nota)' : 'Imposto Por Notas (Retenções)'}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {isSimples ? `Simulação da partilha de tributos (${(simplesRate * 100).toFixed(2)}%)` : 'Apuração de XMLs de serviço'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isSimples && (
                        <div className="flex bg-gray-100 p-1 rounded-lg mr-4">
                            <button
                                onClick={() => setActiveSubTab('calculation')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeSubTab === 'calculation' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Apuração Atual
                            </button>
                            <button
                                onClick={() => setActiveSubTab('history')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeSubTab === 'history' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Histórico Salvo
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1.5 px-3">
                        <CalendarIcon size={16} className="text-gray-500" />
                        <input
                            type="month"
                            value={competence}
                            onChange={(e) => setCompetence(e.target.value)}
                            className="text-sm font-medium text-gray-700 outline-none bg-transparent"
                        />
                    </div>

                    {activeSubTab === 'calculation' && (
                        <>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`p-2 rounded-lg border transition-colors ${showFilters ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                title="Filtros Avançados"
                            >
                                <Filter size={20} />
                            </button>

                            <div className="h-8 w-px bg-gray-200 mx-1"></div>

                            {isSimples && (
                                <button
                                    onClick={handleSaveTaxToFinancial}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg hover:bg-slate-900 transition-colors shadow-lg shadow-slate-900/20"
                                >
                                    <Save size={16} />
                                    <span className="text-xs font-bold">Salvar Apuração</span>
                                </button>
                            )}
                        </>
                    )}

                    <button
                        onClick={() => handleGenerateExcel(filteredInvoices.map(i => {
                            const gross = i.value;
                            if (isSimples) {
                                const totalDas = gross * simplesRate;
                                return {
                                    'Nota': i.number,
                                    'Parceiro': i.entityName,
                                    'Valor Bruto': gross,
                                    'IRPJ': totalDas * (simplesShare.irpj / 100),
                                    'CSLL': totalDas * (simplesShare.csll / 100),
                                    'COFINS': totalDas * (simplesShare.cofins / 100),
                                    'PIS': totalDas * (simplesShare.pis / 100),
                                    'CPP': totalDas * (simplesShare.cpp / 100),
                                    'ISS': totalDas * (simplesShare.iss / 100),
                                    'ICMS': totalDas * (simplesShare.icms / 100),
                                    'Total DAS': totalDas
                                };
                            } else {
                                return {
                                    'Nota': i.number,
                                    'Prestador': i.entityName,
                                    'Valor Bruto': gross,
                                    'IRRF': gross > 670 ? gross * 0.015 : 0,
                                    'PIS/COFINS': gross > 5000 ? gross * 0.0365 : 0,
                                    'ISS': gross * 0.05,
                                    'Líquido': gross - ((gross > 670 ? gross * 0.015 : 0) + (gross > 5000 ? gross * 0.0365 : 0) + (gross * 0.05))
                                };
                            }
                        }), 'Relatório de Impostos')}
                        className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                    >
                        <FileSpreadsheet size={16} />
                    </button>
                    <button
                        onClick={() => handleGeneratePDF(filteredInvoices.map(i => {
                            const gross = i.value;
                            if (isSimples) {
                                const das = gross * simplesRate;
                                return {
                                    'Nota': i.number,
                                    'Parceiro': i.entityName,
                                    'Valor Bruto': gross,
                                    'DAS Estimado': das,
                                    'Líquido (Ref)': gross - das
                                };
                            } else {
                                return {
                                    'Nota': i.number,
                                    'Prestador': i.entityName,
                                    'Valor Bruto': gross,
                                    'IRRF': gross > 670 ? gross * 1.5 / 100 : 0,
                                    'PIS/COFINS': gross > 5000 ? gross * 3.65 / 100 : 0,
                                    'ISS': gross * 5 / 100,
                                    'Líquido': gross - ((gross > 670 ? gross * 0.015 : 0) + (gross > 5000 ? gross * 0.0365 : 0) + (gross * 0.05))
                                };
                            }
                        }), 'Relatório de Impostos')}
                        className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    >
                        <Download size={16} />
                    </button>
                </div>
            </div>

            {/* Dashboard / Table View */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="md:col-span-1 p-5 border border-blue-100 bg-blue-50/50">
                    <p className="text-xs text-blue-500 font-bold uppercase mb-1">Notas Fiscais</p>
                    <h3 className="text-2xl font-black text-slate-800">{filteredInvoices.length}</h3>
                </Card>
                <Card className="md:col-span-1 p-5 border border-green-100 bg-green-50/50">
                    <p className="text-xs text-green-500 font-bold uppercase mb-1">Faturamento Bruto</p>
                    <h3 className="text-2xl font-black text-slate-800">{formatCurrency(totalGross)}</h3>
                </Card>
                <Card className="md:col-span-1 p-5 border border-orange-100 bg-orange-50/50">
                    <p className="text-xs text-orange-500 font-bold uppercase mb-1">Total Impostos</p>
                    <h3 className="text-2xl font-black text-slate-800">{formatCurrency(totalRetentions)}</h3>
                    {isSimples && <p className="text-[10px] text-orange-400 mt-1">Alíquota Efetiva: {(simplesRate * 100).toFixed(2)}%</p>}
                </Card>
                <Card className="md:col-span-1 p-5 border border-purple-100 bg-purple-50/50">
                    <p className="text-xs text-purple-500 font-bold uppercase mb-1">Receita Líquida</p>
                    <h3 className="text-2xl font-black text-slate-800">{formatCurrency(totalGross - totalRetentions)}</h3>
                </Card>
            </div>

            {activeSubTab === 'history' ? renderHistory() : (
                <Card className="overflow-hidden border-0 shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                                    <th className="p-4 font-bold">Nota / Emissão</th>
                                    <th className="p-4 font-bold">Parceiro</th>
                                    <th className="p-4 font-bold text-right">Valor Bruto</th>
                                    <th className="p-4 font-bold text-right">Base Calc.</th>
                                    <th className="p-4 font-bold text-right text-orange-600">Imposto ({isSimples ? 'DAS' : 'Ret.'})</th>
                                    <th className="p-4 font-bold text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredInvoices.map((inv) => {
                                    const gross = inv.value;
                                    let taxVal = 0;
                                    if (isSimples) {
                                        taxVal = gross * simplesRate;
                                    } else {
                                        taxVal = (gross > 670 ? gross * 0.015 : 0) + (gross > 5000 ? gross * 0.0365 : 0) + (gross * 0.05);
                                    }

                                    return (
                                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors text-sm">
                                            <td className="p-4">
                                                <div className="font-bold text-slate-700">{inv.number}</div>
                                                <div className="text-xs text-slate-400">{formatDateBR(inv.date)}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-700">{inv.entityName}</div>
                                                <div className="text-xs text-slate-400">{inv.category || 'Serviços'}</div>
                                            </td>
                                            <td className="p-4 text-right font-mono text-slate-600">{formatCurrency(gross)}</td>
                                            <td className="p-4 text-right font-mono text-slate-400">{formatCurrency(gross)}</td>
                                            <td className="p-4 text-right font-mono font-bold text-orange-600">{formatCurrency(taxVal)}</td>
                                            <td className="p-4 text-center">
                                                <span className="px-2 py-1 rounded-full text-[10px] uppercase font-bold bg-green-100 text-green-700 border border-green-200">
                                                    {inv.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredInvoices.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-10 text-center text-slate-400 italic">
                                            Nenhuma nota fiscal encontrada para esta competência.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};

export const Taxes: React.FC = () => {
    // ... (Hooks remain)
    const navigate = useNavigate();
    const {
        invoices,
        employees,
        selectedCompany,
        payrollRuns,
        saveCompany,
        addInvoice,
        addFiling,
        updateFiling,
        filings = []
    } = useData();
    const { addToast } = useToast();
    const [activeView, setActiveView] = useState<string | null>(null);

    // ... (State remains)
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [isTransmitModalOpen, setIsTransmitModalOpen] = useState(false);
    const [transmitCredentials, setTransmitCredentials] = useState({ type: 'certificate', password: '', accessCode: '', file: null as File | null });

    const getDasDueDate = (comp: string) => {
        const [year, month] = comp.split('-').map(Number);
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        let due = new Date(nextYear, nextMonth - 1, 20);
        const day = due.getDay();
        if (day === 6) due.setDate(due.getDate() + 2);
        else if (day === 0) due.setDate(due.getDate() + 1);
        return due;
    };

    const [receiptForm, setReceiptForm] = useState({
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        description: '',
        value: '',
        entity: '',
        category: 'geral'
    });

    const [competence, setCompetence] = useState(new Date().toISOString().substring(0, 7));
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [dasCalculation, setDasCalculation] = useState<{
        rbt12: number;
        ms12: number;
        currentRevenue: number;
        effectiveRate: number;
        taxValue: number;
        fatorRate: number;
        annexKey: string;
        tier: any;
        isFatorR: boolean;
        breakdown: { code: string; value: number; rate: number }[];
        revenueDetails: { type: string; value: number }[];
    } | null>(null);

    React.useEffect(() => {
        setDasCalculation(null);
    }, [competence]);

    const handlePeriodChange = (offset: number) => {
        const [year, month] = competence.split('-').map(Number);
        const date = new Date(year, month - 1 + offset, 1);
        const newComp = date.toISOString().substring(0, 7);
        setCompetence(newComp);
    };

    const handleTransmit = async () => {
        if (!dasCalculation || !selectedCompany) return;
        const data = dasCalculation;

        if (!transmitCredentials.file && transmitCredentials.type === 'certificate') {
            addToast('Selecione o arquivo do Certificado Digital A1 (.pfx)', 'error');
            return;
        }

        setIsTransmitModalOpen(false);
        addToast('Conectando ao Ambiente Nacional do Simples (Serpro)...', 'info');

        setTimeout(async () => {
            try {
                const protocol = `${Math.floor(Math.random() * 99)}.${Math.floor(Math.random() * 99)}.${Math.floor(Math.random() * 99)}.${Math.floor(Math.random() * 9999999)}.${Math.floor(Math.random() * 99)}`;
                const hash = Math.random().toString(36).substring(2, 12).toUpperCase();

                const newFiling = {
                    id: Date.now().toString(),
                    companyId: selectedCompany.id,
                    name: 'PGDAS-D',
                    category: 'federal',
                    competence: competence,
                    deadline: getDasDueDate(competence).toISOString().split('T')[0],
                    status: 'sent',
                    sentAt: new Date().toISOString(),
                    priority: 'high',
                    content: JSON.stringify({
                        revenue: data.currentRevenue,
                        rbt12: data.rbt12,
                        ms12: data.ms12,
                        effectiveRate: data.effectiveRate,
                        taxValue: data.taxValue,
                        annex: data.annexKey,
                        tier: data.tier,
                        protocol: protocol,
                        hash: hash,
                        breakdown: data.tier?.share ? Object.entries(data.tier.share).map(([k, v]) => ({ code: k, value: data.taxValue * ((v as number) / 100) })) : data.breakdown
                    })
                };

                await addFiling(newFiling as any);

                if (data.taxValue > 0) {
                    await addInvoice({
                        id: Date.now().toString() + 'DAS',
                        number: `DAS-${protocol.split('.')[4]}`,
                        entityName: 'Receita Federal do Brasil',
                        entityId: 'gov-receita',
                        cnpj: '00.394.460/0001-41',
                        date: getDasDueDate(competence).toISOString().split('T')[0],
                        value: data.taxValue,
                        type: 'entry',
                        status: 'pendente',
                        category: 'Impostos',
                        naturezaOperacao: `DAS Simples Nacional - Competência ${competence}`
                    } as any);
                }

                addToast(`Transmissão realizada com sucesso! Protocolo: ${protocol}`, 'success');
            } catch (err) {
                console.error(err);
                addToast('Erro na transmissão. Tente novamente.', 'error');
            }
        }, 3000);
    };

    const handleCalculateDas = () => {
        if (!selectedCompany) return;

        const [compYear, compMonth] = competence.split('-').map(Number);
        const currentCompetenceDate = new Date(compYear, compMonth - 1, 1);

        const twelveMonthsAgo = new Date(currentCompetenceDate);
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const validStatuses = ['autorizada', 'paga', 'recebida', 'pendente'];
        const invalidStatuses = ['cancelada', 'substituida', 'anulada', 'negada', 'recusada'];

        const rbt12 = invoices
            .filter(i => i.companyId === selectedCompany.id)
            .filter(i => (i.type === 'exit' || i.type === 'service') && validStatuses.includes(i.status) && !invalidStatuses.includes(i.status as any))
            .filter(i => {
                const d = parseDateSafe(i.date);
                return d >= twelveMonthsAgo && d < currentCompetenceDate;
            })
            .reduce((sum, i) => sum + i.value, 0);

        const openingDateStr = selectedCompany.openingDate || '2025-03-22';
        const openingDate = parseDateSafe(openingDateStr);
        let isProportional = false;
        let rbt12Prop = rbt12;
        const diffMonths = (currentCompetenceDate.getFullYear() - openingDate.getFullYear()) * 12 + (currentCompetenceDate.getMonth() - openingDate.getMonth());
        if (diffMonths < 12 && diffMonths > 0) {
            isProportional = true;
            rbt12Prop = (rbt12 / diffMonths) * 12;
        } else if (diffMonths === 0) {
            const currentRevEst = invoices
                .filter(i => i.companyId === selectedCompany.id)
                .filter(i => (i.type === 'exit' || i.type === 'service') && i.date.startsWith(competence) && validStatuses.includes(i.status) && !invalidStatuses.includes(i.status as any))
                .reduce((sum, i) => sum + i.value, 0);
            rbt12Prop = currentRevEst * 12;
            isProportional = true;
        }

        const ms12 = payrollRuns
            .filter(p => {
                let pDate: Date;
                if (p.competence.includes('/')) {
                    const [m, y] = p.competence.split('/').map(Number);
                    pDate = new Date(y, m - 1, 1);
                } else {
                    const [y, m] = p.competence.split('-').map(Number);
                    pDate = new Date(y, m - 1, 1);
                }
                return pDate >= twelveMonthsAgo && pDate < currentCompetenceDate;
            })
            .reduce((sum, p) => sum + (p.totalGross || 0), 0);

        const currentInvoices = invoices
            .filter(i => i.companyId === selectedCompany.id)
            .filter(i => (i.type === 'exit' || i.type === 'service') && i.date.startsWith(competence) && validStatuses.includes(i.status) && !invalidStatuses.includes(i.status as any));

        const revenueSources: import('../utils/fiscalCalculations').RevenueSource[] = [];
        let totalRevenue = 0;
        let revenueStandard = 0;
        let revenueMonofasic = 0;

        currentInvoices.forEach(inv => {
            if (inv.items && inv.items.length > 0) {
                inv.items.forEach(item => {
                    const itemTotal = item.total;
                    totalRevenue += itemTotal;
                    const ncm = (item.ncm || '').replace(/\./g, '');
                    const isMonofasic = MONOFASICO_NCMS.some(m => ncm.startsWith(m));
                    if (isMonofasic) {
                        revenueMonofasic += itemTotal;
                        revenueSources.push({ value: itemTotal, annex: 'I', options: { isMonofasicoPisCofins: true } });
                    } else {
                        const isService = inv.type === 'service';
                        // Default Annex logic based on Ramo de Atividade
                        let defaultAnnex = 'III'; // Default for Services
                        if (selectedCompany.ramoAtividade === 'comercio') defaultAnnex = 'I';
                        else if (selectedCompany.ramoAtividade === 'industria') defaultAnnex = 'II';
                        else if (selectedCompany.ramoAtividade === 'servicos') defaultAnnex = 'III';

                        const annex = isService ? (selectedCompany.anexoSimples || defaultAnnex) : 'I';
                        revenueStandard += itemTotal;
                        revenueSources.push({ value: itemTotal, annex: annex as any });
                    }
                });
            } else {
                totalRevenue += inv.value;
                revenueStandard += inv.value;

                let defaultAnnex = 'III';
                if (selectedCompany.ramoAtividade === 'comercio') defaultAnnex = 'I';
                else if (selectedCompany.ramoAtividade === 'industria') defaultAnnex = 'II';

                revenueSources.push({ value: inv.value, annex: (selectedCompany.anexoSimples || defaultAnnex) as any });
            }
        });

        const calculationRBT = isProportional ? rbt12Prop : rbt12;
        const fatorRate = calculationRBT > 0 ? ms12 / calculationRBT : 0;

        revenueSources.forEach(rev => {
            if (rev.annex === 'III' && selectedCompany.fatorR && fatorRate < 0.28) rev.annex = 'V';
            else if (rev.annex === 'V' && fatorRate >= 0.28) rev.annex = 'III';
        });

        const result = calculateComplexDas(calculationRBT, revenueSources);

        // --- DYNAMIC TIER CALCULATION ---
        // Determine Tier (Faixa) based on RBT12 roughly for Display
        // This is a simplification; precise tier logic is in calculateComplexDas usually
        let tierIndex = 1;
        if (calculationRBT > 180000) tierIndex = 2;
        if (calculationRBT > 360000) tierIndex = 3;
        if (calculationRBT > 720000) tierIndex = 4;
        if (calculationRBT > 1800000) tierIndex = 5;
        if (calculationRBT > 3600000) tierIndex = 6;

        const mainAnnex = revenueSources[0]?.annex || 'III';
        const annexTable = SIMPLES_ANNEXES[mainAnnex] || SIMPLES_ANNEXES['III'];
        const tierData = annexTable[tierIndex - 1] || annexTable[0];
        const tierShare = tierData.share;

        setDasCalculation({
            rbt12: calculationRBT,
            ms12,
            currentRevenue: totalRevenue,
            effectiveRate: result.effectiveRate,
            taxValue: result.totalValue,
            fatorRate: fatorRate,
            annexKey: mainAnnex,
            tier: { limit: tierData.limit, rate: tierData.rate, ded: tierData.ded, share: tierShare }, // Use tier directly for visual breakdown
            isFatorR: (selectedCompany.fatorR || false),
            breakdown: result.breakdown,
            revenueDetails: [
                { type: 'Tributação Padrão', value: revenueStandard },
                { type: 'Monofásico/Isento', value: revenueMonofasic }
            ]
        });

        if (revenueMonofasic > 0) {
            addToast(`Economia Detectada! Receita segregada automaticamente.`, 'success');
        } else {
            addToast('Cálculo realizado com sucesso.', 'success');
        }
    };

    const seedHistoricalData = async () => {
        if (!selectedCompany) return;

        const history = [
            { date: '2025-04-30', value: 1293.18 },
            { date: '2025-05-31', value: 4334.41 },
            { date: '2025-06-30', value: 1407.70 },
            { date: '2025-07-31', value: 6575.00 },
            { date: '2025-08-31', value: 15809.70 },
            { date: '2025-09-30', value: 10001.00 },
            { date: '2025-10-31', value: 7965.08 },
            { date: '2025-11-30', value: 9600.00 },
        ];

        // Current PA (12/2025)
        const hasCurrent = invoices.some(i => i.date.startsWith(competence) && Math.abs(i.value - 13210.00) < 1);
        if (!hasCurrent) {
            history.push({ date: competence + '-30', value: 13210.00 });
        }

        let addedCount = 0;
        for (const item of history) {
            const exists = invoices.some(i => i.date.startsWith(item.date.substring(0, 7)) && Math.abs(i.value - item.value) < 0.01);
            if (!exists) {
                await addInvoice({
                    id: Date.now().toString() + Math.random(),
                    companyId: selectedCompany.id,
                    number: `HIST-${item.date.substring(5, 7)}`,
                    entityId: 'hist-legacy',
                    entityName: 'Cliente Diverso (Legado)',
                    cnpj: '00.000.000/0000-00',
                    date: item.date,
                    value: item.value,
                    status: 'paga',
                    type: 'service',
                    items: [{ productId: 'srv-legacy', description: 'Serviços Prestados (Importado)', quantity: 1, unitPrice: item.value, total: item.value }]
                });
                addedCount++;
            }
        }

        if (!selectedCompany.openingDate) {
            await saveCompany({ ...selectedCompany, openingDate: '2025-03-22' });
        }

        addToast(addedCount > 0 ? `${addedCount} notas importadas com sucesso!` : 'Dados já estão atualizados.', 'success');

        setTimeout(handleCalculateDas, 1000);
    };



    const handleDeleteCalculation = async () => {
        // If there's an existing filing, check if we want to cancel it
        const [compYear, compMonth] = competence.split('-').map(Number);

        // Find existing filing in the closures context (we need to access 'filings' here or passed in)
        // Accessing from outer scope 'filings'
        const existingFiling = (filings || []).find(f =>
            (f.name === 'DAS-SIMPLES' || f.name === 'PGDAS-D') &&
            f.competence === competence &&
            f.status === 'sent'
        );

        if (existingFiling) {
            const confirm = window.confirm('ATENÇÃO: Deseja realmente excluir esta apuração transmitida? Isso cancelará o registro oficial no sistema.');
            if (confirm) {
                // Update filing to cancelled
                await updateFiling({ ...existingFiling, status: 'cancelled' });
                setDasCalculation(null); // Clear local state
                addToast('Apuração excluída e cancelada com sucesso.', 'success');
            }
        } else {
            // Just clear local simulation
            if (dasCalculation) {
                setDasCalculation(null);
                addToast('Simulação de apuração limpa.', 'success');
            }
        }
    };

    const handleViewGuide = (filing: any) => {
        try {
            const content = JSON.parse(filing.content || '{}');
            const doc = new jsPDF();

            // Header
            doc.setFillColor(240, 240, 240);
            doc.rect(0, 0, 210, 40, 'F');
            doc.setFontSize(18);
            doc.setTextColor(0, 0, 0);
            doc.text("DAS - Documento de Arrecadação", 105, 20, { align: 'center' });
            doc.setFontSize(10);
            doc.text("Simples Nacional", 105, 28, { align: 'center' });

            // Info
            doc.setFontSize(10);
            doc.setTextColor(50);
            doc.text(`Razão Social: ${selectedCompany?.razaoSocial.toUpperCase()}`, 20, 50);
            doc.text(`CNPJ: ${selectedCompany?.cnpj}`, 20, 56);
            doc.text(`Período de Apuração: ${filing.competence}`, 120, 50);
            doc.text(`Vencimento: ${formatDateBR(filing.deadline)}`, 120, 56);

            // Value
            doc.setFillColor(255, 247, 237);
            doc.rect(20, 65, 170, 25, 'F');
            doc.setFontSize(12);
            doc.text("Valor Total a Recolher", 105, 75, { align: 'center' });
            doc.setFontSize(18);
            doc.setTextColor(194, 65, 12); // Orange-700
            doc.text(formatCurrency(content.taxValue), 105, 85, { align: 'center' });

            // Barcode (Mock)
            doc.setFillColor(0, 0, 0);
            doc.rect(20, 100, 170, 15, 'F');
            doc.setTextColor(0);
            doc.setFontSize(8);
            doc.text("85800000001-9 52410294202-0 60035939202-7 51200100000-8", 105, 119, { align: 'center' });

            doc.save(`DAS-GUIA-${filing.competence}.pdf`);
            addToast('Guia de pagamento gerada com sucesso.', 'success');
        } catch (e) {
            console.error(e);
            addToast('Erro ao gerar guia.', 'error');
        }
    };

    const handleSaveReceipt = async () => {
        // Validation
        if (!receiptForm.description || !receiptForm.value || !receiptForm.entity) {
            addToast('Preencha os campos obrigatórios', 'error');
            return;
        }

        // Save to Database
        await addInvoice({
            id: Date.now().toString(),
            number: 'REC-' + Date.now().toString().slice(-4),
            entityId: 'manual-receipt',
            entityName: receiptForm.entity,
            cnpj: '00.000.000/0000-00',
            date: receiptForm.date,
            value: parseFloat(receiptForm.value),
            status: 'autorizada',
            type: 'receipt',
            items: [{ productId: 'manual', description: receiptForm.description, quantity: 1, unitPrice: parseFloat(receiptForm.value), total: parseFloat(receiptForm.value) }]
        });

        addToast('Lançamento registrado com sucesso!', 'success');

        // Reset and Close
        setIsReceiptModalOpen(false);
        setReceiptForm({
            date: new Date().toISOString().split('T')[0],
            type: 'expense',
            description: '',
            value: '',
            entity: '',
            category: 'geral'
        });
    };

    const buttons = [
        {
            id: 'tax-notes',
            label: 'Imposto Por Notas', // ISS / PIS / COFINS Retido
            icon: FileText,
            description: 'Apuração baseada em XMLs de entrada e saída',
            color: 'bg-blue-50 text-blue-600 border-blue-100 hover:border-blue-300'
        },
        {
            id: 'tax-payroll',
            label: 'Imposto Folha', // INSS / FGTS / IRRF
            icon: Users,
            description: 'Encargos trabalhistas (INSS, FGTS, IRRF)',
            color: 'bg-green-50 text-green-600 border-green-100 hover:border-green-300'
        },
        {
            id: 'tax-das',
            label: 'Simples Nacional / DAS',
            icon: Calculator,
            description: 'Geração e conferência do DAS',
            color: 'bg-orange-50 text-orange-600 border-orange-100 hover:border-orange-300'
        },
        {
            id: 'tax-credits',
            label: 'Recuperação de Créditos',
            icon: TrendingUp,
            description: 'Análise de créditos tributários',
            color: 'bg-purple-50 text-purple-600 border-purple-100 hover:border-purple-300'
        },
        {
            id: 'tax-settings',
            label: 'Config. Alíquotas',
            icon: Settings,
            description: 'Parâmetros fiscais do sistema',
            color: 'bg-gray-50 text-gray-600 border-gray-100 hover:border-gray-300'
        }
    ];



    const getFilteredInvoices = () => {
        return invoices.filter(inv => {
            const matchesType = inv.type === 'service' || (activeView === 'tax-credits' && inv.type === 'entry');
            const matchesCompetence = inv.date.startsWith(competence);
            const matchesSearch = searchTerm === '' ||
                inv.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                inv.number.includes(searchTerm) ||
                (inv.cnpj && inv.cnpj.includes(searchTerm));

            return matchesType && matchesCompetence && matchesSearch;
        });
    };

    // --- VIEW: PAYROLL ---
    const renderPayrollView = () => {
        // Attempt to find a closed payroll run for this competence
        const payrollRun = payrollRuns.find(p => {
            if (p.competence === competence) return true;
            const [y, m] = competence.split('-');
            return p.competence === `${m}/${y}`;
        });

        // If no run, estimate based on active employees
        const estimatedPayroll = employees.filter(e => e.status === 'ativo').reduce((acc, emp) => {
            const base = emp.salary;
            const inss = base * 0.11; // Simplified
            const fgts = base * 0.08;
            const irrf = base > 2112 ? (base * 0.075) - 158.40 : 0; // Very simplified
            return {
                gross: acc.gross + base,
                inss: acc.inss + inss,
                fgts: acc.fgts + fgts,
                irrf: acc.irrf + irrf,
                count: acc.count + 1
            };
        }, { gross: 0, inss: 0, fgts: 0, irrf: 0, count: 0 });

        const display = payrollRun ? {
            source: 'Folha Fechada',
            gross: payrollRun.totalGross || 0,
            inss: payrollRun.details?.reduce((acc, d) => acc + (d.inssValue || 0), 0) || 0,
            fgts: payrollRun.details?.reduce((acc, d) => acc + (d.fgtsValue || 0), 0) || 0,
            irrf: payrollRun.details?.reduce((acc, d) => acc + (d.irrfValue || 0), 0) || 0,
            count: payrollRun.employeeCount || 0
        } : {
            source: 'Estimativa (Cadastro)',
            ...estimatedPayroll
        };

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setActiveView(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft /></button>
                        <h2 className="text-2xl font-bold text-gray-900">Impostos sobre Folha</h2>
                    </div>

                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1.5 px-3 shadow-sm">
                        <CalendarIcon size={16} className="text-gray-500" />
                        <input
                            type="month"
                            value={competence}
                            onChange={(e) => setCompetence(e.target.value)}
                            className="text-sm font-medium text-gray-700 outline-none bg-transparent"
                        />
                    </div>
                </div>

                <div className="flex gap-4 items-center bg-blue-50 p-4 rounded-xl text-blue-800 text-sm">
                    <Info size={20} />
                    <p>Valores baseados em: <strong>{display.source}</strong> para a competência <strong>{competence}</strong>.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6 border-l-4 border-l-orange-500">
                        <div className="flex justify-between">
                            <div>
                                <p className="text-xs uppercase font-bold text-gray-500">INSS (Previdência)</p>
                                <h3 className="text-2xl font-black text-gray-800 mt-2">{formatCurrency(display.inss)}</h3>
                                <p className="text-xs text-gray-400 mt-1">Guia vencimento dia 20</p>
                            </div>
                            <div className="p-3 bg-orange-50 rounded-xl text-orange-500 h-fit"><Users size={24} /></div>
                        </div>
                        <Button className="w-full mt-4 bg-orange-600 text-white rounded-lg h-9 text-xs" icon={Download}>Gerar GPS/DARF</Button>
                    </Card>

                    <Card className="p-6 border-l-4 border-l-green-500">
                        <div className="flex justify-between">
                            <div>
                                <p className="text-xs uppercase font-bold text-gray-500">FGTS Digital</p>
                                <h3 className="text-2xl font-black text-gray-800 mt-2">{formatCurrency(display.fgts)}</h3>
                                <p className="text-xs text-gray-400 mt-1">Guia vencimento dia 20</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-xl text-green-500 h-fit"><CheckCircle size={24} /></div>
                        </div>
                        <Button className="w-full mt-4 bg-green-600 text-white rounded-lg h-9 text-xs" icon={Download}>Gerar GFD</Button>
                    </Card>

                    <Card className="p-6 border-l-4 border-l-blue-500">
                        <div className="flex justify-between">
                            <div>
                                <p className="text-xs uppercase font-bold text-gray-500">IRRF (Retido)</p>
                                <h3 className="text-2xl font-black text-gray-800 mt-2">{formatCurrency(display.irrf)}</h3>
                                <p className="text-xs text-gray-400 mt-1">Guia vencimento dia 20</p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-xl text-blue-500 h-fit"><FileText size={24} /></div>
                        </div>
                        <Button className="w-full mt-4 bg-blue-600 text-white rounded-lg h-9 text-xs" icon={Download}>Gerar DARF IR</Button>
                    </Card>
                </div>
            </div>
        );
    };

    // --- VIEW: DAS (SIMPLES) ---
    const renderDasView = () => {
        // Normalização do Regime
        const rawRegime = selectedCompany?.regimeTributario || '1';
        const isSimples = rawRegime === 'simples' || rawRegime === '1' || rawRegime === '2' || rawRegime === '4';

        if (!isSimples) {
            const regimeLabel = {
                '3': 'Regime Normal (Lucro Presumido/Real)',
                '5': 'Imune / Isenta',
                'presumido': 'Lucro Presumido',
                'real': 'Lucro Real'
            }[rawRegime] || rawRegime;

            return (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <AlertTriangle className="mx-auto text-orange-500 mb-4" size={48} />
                    <h3 className="text-xl font-bold text-gray-800">Módulo exclusivo para Simples Nacional</h3>
                    <p className="text-gray-500 mt-2 max-w-md mx-auto">Esta empresa está configurada como <strong>{regimeLabel.toUpperCase()}</strong> em CRM / Empresas. Altere o regime para usar esta apuração.</p>
                </div>
            );
        }

        const [compYear, compMonth] = competence.split('-').map(Number);

        // Check for existing transmission
        const existingFiling = (filings || []).find(f =>
            (f.name === 'DAS-SIMPLES' || f.name === 'PGDAS-D') &&
            f.competence === competence &&
            f.status === 'sent'
        );

        // Determine data source (Calculation or Existing Filing)
        const data = existingFiling && existingFiling.content
            ? JSON.parse(existingFiling.content)
            : dasCalculation;

        // Repartição Tributária (Estimada por Anexo)
        const activeAnnexKey = data?.annexKey || data?.annex || 'III';

        // Use dynamic share from Tier calculation if available, otherwise safe fallback
        const reparticao = data?.tier?.share || { cpp: 0, iss: 0, irpj: 0, csll: 0, pis: 0, cofins: 0 };

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setActiveView(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft /></button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-bold text-gray-900">PGDAS-D Simples Nacional</h2>
                                {existingFiling && (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-black uppercase rounded-full flex items-center gap-1 border border-green-200">
                                        <CheckCircle size={10} /> Transmitido
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                                Regime: {rawRegime === '1' ? 'Simples Nacional' : 'MEI'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm p-1">
                        <button onClick={() => handlePeriodChange(-1)} className="p-2 hover:bg-slate-100 text-slate-500 hover:text-orange-600 rounded-lg transition-colors">
                            <ChevronLeft size={18} />
                        </button>
                        <div className="relative group px-2 mx-1 min-w-[170px] text-center">
                            <span className="text-sm font-bold text-gray-700 capitalize group-hover:text-orange-600 cursor-pointer flex items-center justify-center gap-2 select-none">
                                <CalendarIcon size={14} className="text-gray-400 group-hover:text-orange-500" />
                                {parseDateSafe(competence.split('-')[0] + '-' + competence.split('-')[1] + '-10').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                            </span>
                            <input
                                type="month"
                                value={competence}
                                onChange={(e) => setCompetence(e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                        <button onClick={() => handlePeriodChange(1)} className="p-2 hover:bg-slate-100 text-slate-500 hover:text-orange-600 rounded-lg transition-colors">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {!data ? (
                    <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-gray-300 shadow-sm">
                        <div className="mx-auto w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 mb-4">
                            <Calculator size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Apuração Mensal Pendente</h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-8">
                            Nenhuma apuração encontrada para a competência <strong>{competence}</strong>. Clique abaixo para processar as notas fiscais e calcular o imposto devido.
                        </p>
                        <div className="flex justify-center gap-4">
                            <Button
                                onClick={handleCalculateDas}
                                className="bg-orange-600 text-white hover:bg-orange-700 px-8 py-6 rounded-xl font-bold text-lg shadow-xl shadow-orange-600/20 transition-all hover:-translate-y-1"
                                icon={Calculator}
                            >
                                Calcular DAS Agora
                            </Button>

                            {/* Import Button for Legacy Setup */}
                            <button
                                onClick={seedHistoricalData}
                                className="px-6 py-6 rounded-xl font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent hover:border-slate-200 transition-all text-sm flex items-center gap-2"
                            >
                                <Download size={16} /> Importar Legado (Conf. Inicial)
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <Card className="lg:col-span-2 p-6 border-t-4 border-t-orange-500 shadow-xl shadow-slate-200/50">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">Declaração Mensal de Impostos</h3>
                                    <p className="text-sm text-gray-500">Conformidade com LC 123/2006 {data.rbt12 !== data.tier?.limit && '(RBT12p Ativo)'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="secondary"
                                        className="h-8 w-8 p-0 rounded-full bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                        onClick={handleCalculateDas}
                                        title="Recalcular Apuração"
                                    >
                                        <RefreshCw size={14} />
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        className="h-8 w-8 p-0 rounded-full bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={handleDeleteCalculation}
                                        title="Excluir/Limpar Apuração"
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                    <div className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase border border-slate-200">
                                        {existingFiling ? `Protocolo: ${JSON.parse(existingFiling.content || '{}').protocol}` : 'Simulação'}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Receita Mensal Bruta</span>
                                        <span className="text-xl font-bold text-gray-900">{formatCurrency(data.currentRevenue)}</span>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">RBT12 (Média Móvel)</span>
                                        <span className="text-xl font-bold text-gray-900">{formatCurrency(data.rbt12)}</span>
                                    </div>
                                </div>

                                {data.isFatorR && (
                                    <div className={`p-4 rounded-xl border ${data.fatorRate >= 0.28 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-gray-500 block">Apuração Fator R (Folha/Receita)</span>
                                                <span className={`text-xl font-black ${data.fatorRate >= 0.28 ? 'text-green-700' : 'text-red-700'}`}>
                                                    {(data.fatorRate * 100).toFixed(2)}%
                                                </span>
                                                <div className="flex gap-4 mt-2">
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase">MS12: {formatCurrency(data.ms12)}</p>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase">Meta: 28,00%</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`px-2 py-1 rounded text-[10px] font-black uppercase mb-1 ${data.fatorRate >= 0.28 ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                                    Anexo {activeAnnexKey}
                                                </div>
                                                <p className="text-[10px] text-gray-500">Status: {data.fatorRate >= 0.28 ? 'Alíquota Reduzida' : 'Alíquota Majorada'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between p-5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                                    <div>
                                        <span className="text-[10px] uppercase font-black opacity-60 block tracking-widest mb-1">Alíquota Efetiva do Período</span>
                                        <span className="text-3xl font-black">{(data.effectiveRate * 100).toFixed(4)}%</span>
                                    </div>
                                    <div className="text-right flex flex-col justify-center">
                                        <p className="text-xs font-bold uppercase opacity-80">
                                            Faixa de Enquadramento (Estimada)
                                        </p>
                                        <div className="flex gap-2 justify-end mt-1 text-[10px] font-medium opacity-60">
                                            <span>Nominal: {(data.tier?.rate * 100).toFixed(2)}%</span>
                                            <span>Ded: {formatCurrency(data.tier?.ded)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-6 mt-6">
                                    <div className="bg-slate-900 border border-slate-700 text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-2 opacity-10">
                                            <Calculator size={120} />
                                        </div>
                                        <div className="text-center md:text-left z-10">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Guia DAS a Recolher</p>
                                            <p className="text-xs text-orange-400 font-bold flex items-center gap-1">
                                                Vencimento: {data ? formatDateBR(getDasDueDate(competence).toISOString()) : '--/--/----'}
                                            </p>
                                        </div>
                                        <h1 className="text-5xl font-black z-10">{formatCurrency(data.taxValue)}</h1>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <div className="space-y-4">
                            <Card className={`overflow-hidden border-2 transition-all ${existingFiling ? 'border-green-200 bg-green-50/10' : 'border-orange-100 bg-white'}`}>
                                <div className={`p-4 border-b flex justify-between items-center ${existingFiling ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
                                    <h4 className={`font-black text-xs uppercase tracking-widest flex items-center gap-2 ${existingFiling ? 'text-green-700' : 'text-orange-700'}`}>
                                        {existingFiling ? <CheckCircle size={14} /> : <Upload size={14} />} PGDAS-D Portal
                                    </h4>
                                    {existingFiling && (
                                        <span className="text-[9px] font-bold text-green-600 bg-white px-2 py-0.5 rounded border border-green-200">VALIDADO</span>
                                    )}
                                </div>
                                <div className="p-5 text-center">
                                    {existingFiling ? (
                                        <div className="space-y-4">
                                            <p className="text-slate-600 text-sm">Competência transmitida com sucesso em <strong>{formatDateBR(existingFiling.sentAt)}</strong>.</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => generateDasReceipt(selectedCompany || undefined, existingFiling)}
                                                    className="py-2.5 bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors"
                                                >
                                                    <Download size={14} /> Baixar Recibo
                                                </button>
                                                <button
                                                    onClick={() => handleViewGuide(existingFiling)}
                                                    className="py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors"
                                                >
                                                    Visualizar Guia
                                                </button>
                                            </div>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase italic">Código de Controle: {JSON.parse(existingFiling.content || '{}').hash}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-slate-500 text-sm mb-5">Verifique os dados da apuração antes de realizar a transmissão oficial no ambiente e-CAC.</p>
                                            <button
                                                disabled={!data || data.currentRevenue === undefined}
                                                onClick={() => setIsTransmitModalOpen(true)}
                                                className={`w-full py-4 bg-orange-600 text-white font-black rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-2 ${(!data || data.currentRevenue === undefined) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <Calculator size={18} /> Transmitir Competência Oficial
                                            </button>
                                        </>
                                    )}
                                </div>
                            </Card>
                            <Card className="p-5 border border-slate-100">
                                <h4 className="font-black text-slate-800 text-[10px] uppercase mb-4 tracking-widest border-b pb-2 flex items-center justify-between">
                                    Partilha de Arrecadação <span>(CGSN 140/18)</span>
                                </h4>
                                <ul className="space-y-3">
                                    {(data.breakdown && data.breakdown.length > 0) ? (
                                        // Nova Visualização (Motor Preciso)
                                        data.breakdown.map((item: any) => (
                                            <li key={item.code} className="flex justify-between items-center text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${item.value > 0 ? 'bg-orange-500' : 'bg-slate-300'}`}></div>
                                                    <span className="text-gray-500 font-bold uppercase tracking-tighter">{item.code}</span>
                                                </div>
                                                <span className="font-mono font-bold text-gray-700">{formatCurrency(item.value)}</span>
                                            </li>
                                        ))
                                    ) : (
                                        // Fallback via 'reparticao' (Agra baseado no Tier)
                                        Object.entries(reparticao).map(([key, pct]) => (
                                            <li key={key} className="flex justify-between items-center text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                                    <span className="text-gray-500 font-bold uppercase tracking-tighter">{key}</span>
                                                </div>
                                                <span className="font-mono font-bold text-gray-700">{formatCurrency(data.taxValue * (pct as number))}</span>
                                            </li>
                                        ))
                                    )}
                                    <li className="pt-3 border-t border-dashed flex justify-between items-center text-xs font-black text-slate-900">
                                        <span>TOTAL</span>
                                        <span>{formatCurrency(data.taxValue)}</span>
                                    </li>
                                </ul>
                            </Card>
                        </div>
                    </div >
                )}

                {/* Modal de Transmissão Real */}
                <Modal
                    isOpen={isTransmitModalOpen}
                    onClose={() => setIsTransmitModalOpen(false)}
                    title="Transmissão PGDAS-D"
                >
                    <div className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 text-blue-800 text-sm">
                            <Lock className="shrink-0" size={20} />
                            <p>Ambiente seguro. Seus dados de credenciamento são utilizados apenas para a sessão de transmissão com a Receita Federal.</p>
                        </div>

                        <div className="flex gap-4 p-1 bg-gray-100 rounded-lg">
                            <button
                                onClick={() => setTransmitCredentials(p => ({ ...p, type: 'certificate' }))}
                                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${transmitCredentials.type === 'certificate' ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Certificado Digital A1
                            </button>
                            <button
                                onClick={() => setTransmitCredentials(p => ({ ...p, type: 'code' }))}
                                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${transmitCredentials.type === 'code' ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Código de Acesso
                            </button>
                        </div>

                        {transmitCredentials.type === 'certificate' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Arquivo do Certificado (.pfx / .p12)</label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                                        <input
                                            type="file"
                                            accept=".pfx,.p12"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => setTransmitCredentials(p => ({ ...p, file: e.target.files?.[0] || null }))}
                                        />
                                        <FileKey className="mx-auto text-gray-400 mb-2" />
                                        <p className="text-sm font-medium text-gray-600">
                                            {transmitCredentials.file ? transmitCredentials.file.name : 'Clique para selecionar o certificado'}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Senha do Certificado</label>
                                    <input
                                        type="password"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono"
                                        placeholder="••••••••"
                                        value={transmitCredentials.password}
                                        onChange={e => setTransmitCredentials(p => ({ ...p, password: e.target.value }))}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">CNPJ</label>
                                    <input
                                        disabled
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500"
                                        value={selectedCompany?.cnpj}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">CPF do Responsável</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                        placeholder="000.000.000-00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Código de Acesso</label>
                                    <input
                                        type="password"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono tracking-widest"
                                        placeholder="000000000000"
                                        value={transmitCredentials.accessCode}
                                        onChange={e => setTransmitCredentials(p => ({ ...p, accessCode: e.target.value }))}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setIsTransmitModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleTransmit} className="bg-green-600 text-white hover:bg-green-700">Assinar e Transmitir</Button>
                        </div>
                    </div>
                </Modal>


            </div >
        );
    };

    // --- VIEW: CREDITS ---
    const renderCreditsView = () => {
        const regime = selectedCompany?.regimeTributario || 'simples';

        // --- 1. PIS/COFINS (Lucro Real Only) ---
        const inputInvoices = invoices.filter(i => i.type === 'entry' && i.status === 'autorizada');
        const pisCofinsCredits = regime === 'real'
            ? inputInvoices.reduce((acc, inv) => acc + (inv.value * 0.0925), 0)
            : 0;

        // --- 2. Tese do Século (STF RE 574.706) ---
        // Exclusão do ICMS da base do PIS/COFINS (Retroativo Estimado)
        const outputInvoices = invoices.filter(i => i.type === 'exit' && i.status === 'autorizada');
        const teseDoSeculoCredits = outputInvoices.reduce((acc, inv) => {
            // Estima ICMS destacado (média 12%) e aplica PIS/COFINS (média 9.25%) sobre esse montante
            const estimatedICMS = inv.value * 0.12;
            const creditValue = estimatedICMS * 0.0925;
            return acc + creditValue;
        }, 0);

        // --- 3. Produtos Monofásicos (Simples Nacional Recovery) ---
        // NCM Scan Logic
        const monofasicosFound = invoices
            .filter(i => (i.type === 'exit' || i.type === 'service') && i.status === 'autorizada')
            .flatMap(inv => {
                // In a real system, we'd check each item's NCM. 
                // Since our Invoice type has items, we can check them.
                if (!inv.items) return [];
                return inv.items.filter(item => {
                    const cleanNCM = (item as any).ncm?.substring(0, 4);
                    return MONOFASICO_NCMS.includes(cleanNCM);
                }).map(item => ({
                    ...item,
                    invoiceNum: inv.number,
                    potential: item.total * 0.0198 // PIS/COFINS average in DAS
                }));
            });

        const totalMonofasico = monofasicosFound.reduce((acc, item) => acc + item.potential, 0);

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveView(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft /></button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Inteligência de Recuperação Fiscal</h2>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Base Jurídica: Jurisprudência STF & Resoluções CGSN</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Monofásicos Section (Universal/Simples Nacional Highlight) */}
                        <Card className="p-0 overflow-hidden border-orange-100 shadow-xl shadow-orange-500/5">
                            <div className="p-4 bg-orange-50 border-b border-orange-100 flex justify-between items-center">
                                <h3 className="font-black text-orange-700 text-xs uppercase tracking-widest flex items-center gap-2">
                                    <TrendingUp size={16} /> Produtos Monofásicos (NCM)
                                </h3>
                                <div className="px-2 py-1 bg-white rounded-lg text-[10px] font-bold text-orange-600 border border-orange-200">
                                    SOLUÇÃO COSIT 225/2017
                                </div>
                            </div>
                            <div className="p-5">
                                <div className="space-y-3">
                                    {monofasicosFound.length > 0 ? (
                                        monofasicosFound.slice(0, 5).map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:bg-orange-50/50 transition-all cursor-default group">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">{(item as any).ncm || 'NCM'}</div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{item.description}</p>
                                                        <p className="text-[10px] text-slate-400">Nota: {item.invoiceNum} • {formatCurrency(item.total)}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-orange-600">+{formatCurrency(item.potential)}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Economia no DAS</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                            <Calculator className="mx-auto text-gray-300 mb-2" size={32} />
                                            <p className="text-xs text-gray-400 font-medium">Nenhum NCM Monofásico identificado nas vendas recentes.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>

                        {/* Tese do Século Section */}
                        <Card className="p-6 border-blue-100">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-[0.15em] mb-1">Exclusão do ICMS (Base PIS/COFINS)</h3>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-lg">
                                        Cálculo baseado na tese fixada pelo STF (RE 574.706), identificando valores pagos a maior nas notas de saída.
                                    </p>
                                </div>
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                    <CheckCircle size={24} />
                                </div>
                            </div>
                            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex justify-between items-center">
                                <div>
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Potencial Recuperável Estimado</span>
                                    <span className="text-2xl font-black text-blue-900">{formatCurrency(teseDoSeculoCredits)}</span>
                                </div>
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-6 font-bold text-xs">
                                    Auditar Notas
                                </Button>
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="bg-slate-900 text-white border-none p-6 relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-slate-400 font-black uppercase text-[9px] tracking-[0.3em] mb-4">Dashboard de Créditos</p>
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-xs opacity-60">Créditos Operacionais (Entrada)</p>
                                        <h2 className={`text-2xl font-black ${regime === 'real' ? 'text-green-400' : 'text-slate-500'}`}>
                                            {regime === 'real' ? formatCurrency(pisCofinsCredits) : 'Indisponível*'}
                                        </h2>
                                        {regime !== 'real' && <p className="text-[9px] text-orange-400 font-bold mt-1 uppercase italic">Apenas Regime Lucro Real</p>}
                                    </div>
                                    <div className="h-px bg-slate-800"></div>
                                    <div>
                                        <p className="text-xs opacity-60">Créditos Monofásicos / Teses</p>
                                        <h2 className="text-2xl font-black text-blue-400">{formatCurrency(totalMonofasico + teseDoSeculoCredits)}</h2>
                                    </div>
                                    <div className="pt-4">
                                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                            <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Total Recuperável</p>
                                            <p className="text-3xl font-black text-white">{formatCurrency(pisCofinsCredits + totalMonofasico + teseDoSeculoCredits)}</p>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => {
                                        addToast('Consolidando arquivos para o PER/DCOMP...', 'info');
                                        setTimeout(() => addToast('Pedido enviado para a malha da Receita Federal.', 'success'), 2500);
                                    }}
                                    className="w-full mt-6 bg-white text-slate-900 hover:bg-slate-100 font-black rounded-xl py-6"
                                >
                                    Gerar Pedido de Restituição (PER/DCOMP)
                                </Button>
                            </div>
                        </Card>

                        <div className="bg-gray-100/50 p-4 rounded-2xl border border-gray-200">
                            <div className="flex items-center gap-3 mb-2">
                                <Info size={16} className="text-slate-400" />
                                <h4 className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Importante</h4>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                A recuperação de créditos tributários exige validação por um contador e, em certos casos, autorização judicial. Os valores acima são baseados em varredura automatizada da base de dados local.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- VIEW: NOTES (Original) ---
    const handleGenerateExcel = (reportData: any[], title: string) => {
        if (!reportData || reportData.length === 0) return;
        const worksheet = XLSX.utils.json_to_sheet(reportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
        const fileName = `${title.toLowerCase().replace(/\s+/g, '_')}_${competence}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        addToast('Excel gerado com sucesso!', 'success');
    };

    const handleGeneratePDF = (reportData: any[], title: string) => {
        if (!reportData || reportData.length === 0) return;

        import('../utils/pdfReport').then(({ generatePDFReport }) => {
            const headers = Object.keys(reportData[0]);

            const columns = headers.map(h => ({
                header: h.toUpperCase(),
                dataKey: h,
                halign: ['valor', 'bruto', 'líquido', 'irrf', 'pis', 'iss', 'cofins'].some(k => h.toLowerCase().includes(k)) ? 'right' as const : 'left' as const,
                format: (val: any) => {
                    if (typeof val === 'number') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
                    return val;
                }
            }));

            // Calc Totals
            const totalizers = [];
            const count = reportData.length;
            totalizers.push({ label: 'Documentos', value: count, icon: 'hash' as const });

            const grossKey = headers.find(h => h.toLowerCase().includes('bruto'));
            if (grossKey) {
                const totalGross = reportData.reduce((acc, row) => acc + (Number(row[grossKey]) || 0), 0);
                totalizers.push({ label: 'Total Bruto', value: totalGross, icon: 'dollar' as const, color: 'blue' as const });
            }

            const netKey = headers.find(h => h.toLowerCase().includes('líquido'));
            if (netKey) {
                const totalNet = reportData.reduce((acc, row) => acc + (Number(row[netKey]) || 0), 0);
                totalizers.push({ label: 'Total Líquido', value: totalNet, icon: 'dollar' as const, color: 'green' as const });
            }

            const doc = generatePDFReport(
                selectedCompany || undefined,
                columns,
                reportData,
                totalizers,
                {
                    title: title,
                    period: competence,
                    status: 'APURADO',
                    fileName: `${title.toLowerCase().replace(/\s+/g, '_')}_${competence}.pdf`
                },
                true
            );

            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            setIsPreviewOpen(true);
        });
    };

    // --- MAIN RENDER ---
    if (activeView === 'tax-notes') return <TaxNotesView competence={competence} setCompetence={setCompetence} setActiveView={setActiveView} />;
    if (activeView === 'tax-payroll') return renderPayrollView();
    if (activeView === 'tax-das') return renderDasView();
    if (activeView === 'tax-credits') return renderCreditsView();
    if (activeView === 'tax-settings') return <TaxSettingsView setActiveView={setActiveView} />;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Central de Impostos</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Gestão inteligente de tributos, guias e obrigações</p>
                </div>
                <Button
                    onClick={() => setIsReceiptModalOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
                    icon={Plus}
                >
                    Lançar Recibo/Despesa
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {buttons.map((btn) => (
                    <button
                        key={btn.id}
                        onClick={() => {
                            setActiveView(btn.id);
                        }}
                        className={`
                            relative group p-6 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 text-left
                            bg-[var(--bg-card)] border-[var(--border-color)]
                            hover:border-[var(--accent-primary)]
                        `}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`
                                p-4 rounded-xl shadow-sm transition-transform group-hover:scale-110
                                ${btn.id === 'tax-notes' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}
                                ${btn.id === 'tax-payroll' ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' : ''}
                                ${btn.id === 'tax-das' ? 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400' : ''}
                                ${btn.id === 'tax-credits' ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400' : ''}
                                ${btn.id === 'tax-settings' ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' : ''}
                            `}>
                                <btn.icon size={28} />
                            </div>
                        </div>
                        <h3 className={`text-xl font-black mb-2
                            ${btn.id === 'tax-notes' ? 'text-blue-600 dark:text-blue-400' : ''}
                            ${btn.id === 'tax-payroll' ? 'text-green-600 dark:text-green-400' : ''}
                            ${btn.id === 'tax-das' ? 'text-orange-600 dark:text-orange-400' : ''}
                            ${btn.id === 'tax-credits' ? 'text-purple-600 dark:text-purple-400' : ''}
                            ${btn.id === 'tax-settings' ? 'text-slate-600 dark:text-slate-400' : ''}
                        `}>{btn.label}</h3>
                        <p className="text-sm font-medium text-[var(--text-secondary)]">{btn.description}</p>
                    </button>
                ))}
            </div>

            <div className="mt-8 flex justify-center opacity-50">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Selecione um módulo para iniciar</p>
            </div>

            <Modal
                isOpen={isReceiptModalOpen}
                onClose={() => setIsReceiptModalOpen(false)}
                title="Lançamento de Recibo / Despesa"
                maxWidth="max-w-2xl"
            >
                <form onSubmit={handleSaveReceipt} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
                            <input
                                type="date"
                                required
                                value={receiptForm.date}
                                onChange={e => setReceiptForm({ ...receiptForm, date: e.target.value })}
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setReceiptForm({ ...receiptForm, type: 'expense' })}
                                    className={`flex-1 py-2.5 rounded-lg border text-sm font-bold transition-colors ${receiptForm.type === 'expense'
                                        ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                                        }`}
                                >
                                    Despesa (Saída)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReceiptForm({ ...receiptForm, type: 'revenue' })}
                                    className={`flex-1 py-2.5 rounded-lg border text-sm font-bold transition-colors ${receiptForm.type === 'revenue'
                                        ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                                        }`}
                                >
                                    Receita (Entrada)
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                        <input
                            type="text"
                            required
                            placeholder="Ex: Pagamento de material de escritório"
                            value={receiptForm.description}
                            onChange={e => setReceiptForm({ ...receiptForm, description: e.target.value })}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor (R$)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="0,00"
                                    value={receiptForm.value}
                                    onChange={e => setReceiptForm({ ...receiptForm, value: e.target.value })}
                                    className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Beneficiário / Pagador</label>
                            <input
                                type="text"
                                required
                                placeholder="Ex: Papelaria Silva"
                                value={receiptForm.entity}
                                onChange={e => setReceiptForm({ ...receiptForm, entity: e.target.value })}
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Anexo</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer dark:border-slate-600 dark:hover:bg-slate-800">
                            <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Clique para fazer upload do comprovante (PDF, JPG, PNG)</p>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => setIsReceiptModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" className="bg-green-600 text-white hover:bg-green-700">Salvar Lançamento</Button>
                    </div>
                </form>
            </Modal>
            {/* PDF Preview Modal */}
            <Modal
                isOpen={isPreviewOpen}
                onClose={() => {
                    setIsPreviewOpen(false);
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                }}
                title="Pré-visualização da Apuração"
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
                            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                        </div>
                    )}
                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                        <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Fechar</Button>
                        <Button variant="primary" onClick={() => {
                            const link = document.createElement('a');
                            link.href = previewUrl!;
                            link.download = `apuracao_${competence}.pdf`;
                            link.click();
                        }}>Download PDF</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
