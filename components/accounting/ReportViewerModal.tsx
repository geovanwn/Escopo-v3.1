import React, { useRef } from 'react';

import { Printer, Download, X, FileText, Building2, Calendar } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

interface ReportViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    onExportPdf?: () => void;
    reportSubtitle?: string;
    dateRange?: string;
}

export const ReportViewerModal: React.FC<ReportViewerModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    onExportPdf,
    reportSubtitle,
    dateRange,
}) => {
    const printRef = useRef<HTMLDivElement>(null);
    const { selectedCompany } = useData();

    if (!isOpen) return null;

    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
    });
    const formattedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const handlePrint = () => {
        const printContent = printRef.current?.innerHTML ?? '';
        const win = window.open('', '_blank', 'width=900,height=700');
        if (!win) return;
        win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-weight: 700; }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>${printContent}</body>
</html>`);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Panel */}
            <div className="relative z-10 flex flex-col w-full max-w-5xl my-4 mx-4 bg-slate-100 dark:bg-slate-950 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">

                {/* Top Toolbar */}
                <div className="flex items-center justify-between gap-4 px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                            <FileText size={16} className="text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Visualizador</p>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{title}</h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            
                            onClick={handlePrint}
                            className="gap-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-sm"
                        >
                            <Printer size={15} />
                            <span className="hidden sm:inline">Imprimir</span>
                        </button>
                        {onExportPdf && (
                            <button
                                onClick={onExportPdf}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-xl shadow-md shadow-indigo-600/20 text-sm"
                            >
                                <Download size={15} />
                                <span className="hidden sm:inline">Exportar PDF</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="ml-2 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Paper Area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-6" style={{ background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)' }}>
                    {/* A4 Paper */}
                    <div
                        ref={printRef}
                        className="mx-auto bg-white rounded-xl shadow-2xl"
                        style={{ width: '100%', minHeight: '900px' }}
                    >
                        {/* Paper Header — compact single strip */}
                        <div style={{
                            background: 'linear-gradient(100deg, #1e293b 0%, #312e81 100%)',
                            padding: '16px 32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 16,
                        }}>
                            {/* Left: Logo + Company */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: 10,
                                    background: 'rgba(255,255,255,0.12)',
                                    border: '1.5px solid rgba(255,255,255,0.25)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <Building2 size={20} color="white" />
                                </div>
                                <div>
                                    <p style={{ color: 'white', fontSize: 13, fontWeight: 800, lineHeight: 1.2, margin: 0 }}>
                                        {selectedCompany?.razaoSocial || selectedCompany?.nomeFantasia || 'Empresa'}
                                    </p>
                                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, margin: '2px 0 0' }}>
                                        {selectedCompany?.cnpj ? `CNPJ: ${selectedCompany.cnpj}` : ''}
                                        {selectedCompany?.address?.city ? ` · ${selectedCompany.address.city}${selectedCompany.address.uf ? `/${selectedCompany.address.uf}` : ''}` : ''}
                                    </p>
                                </div>
                            </div>

                            {/* Right: Badge + Date */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                <div style={{
                                    background: 'rgba(99,102,241,0.4)',
                                    border: '1px solid rgba(165,180,252,0.35)',
                                    borderRadius: 6,
                                    padding: '2px 10px',
                                }}>
                                    <span style={{ color: '#c7d2fe', fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
                                        Relatório Contábil
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <Calendar size={11} color="rgba(255,255,255,0.35)" />
                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
                                        {formattedDate} às {formattedTime}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Report Body */}
                        <div style={{ padding: '0' }}>
                            {children}
                        </div>

                        {/* Paper Footer */}
                        <div style={{
                            borderTop: '2px solid #e2e8f0',
                            padding: '16px 40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#f8fafc',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1' }} />
                                <span style={{ color: '#64748b', fontSize: 11 }}>
                                    {selectedCompany?.razaoSocial || 'Sistema Contábil'} — Documento gerado automaticamente
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {selectedCompany?.cnpj && (
                                    <span style={{ color: '#94a3b8', fontSize: 11 }}>CNPJ: {selectedCompany.cnpj}</span>
                                )}
                                <span style={{ color: '#94a3b8', fontSize: 11 }}>
                                    {formattedDate}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
