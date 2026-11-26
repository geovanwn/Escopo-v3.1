import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { generateSPED } from '../../utils/legalGenerators';
import { Button } from '../ui/Button';
import { Download, FileText, Loader2, AlertTriangle } from 'lucide-react';

export const SpedExport: React.FC = () => {
    const { invoices, selectedCompany, products, clients } = useData();
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [error, setError] = useState<string | null>(null);

    const handleDownload = () => {
        setError(null);
        if (!selectedCompany) {
            setError("Selecione uma empresa para gerar o arquivo.");
            return;
        }

        setLoading(true);
        setTimeout(() => {
            try {
                // Filter invoices by period
                const [year, month] = period.split('-').map(Number);
                const filteredInvoices = invoices.filter(inv => {
                    const d = new Date(inv.date);
                    return d.getFullYear() === year && d.getMonth() + 1 === month;
                });

                if (filteredInvoices.length === 0) {
                    setError("Nenhuma nota fiscal encontrada para o período selecionado.");
                    setLoading(false);
                    return;
                }

                const content = generateSPED(filteredInvoices, selectedCompany, products, clients);

                const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `SPED_FISCAL_${selectedCompany.cnpj.replace(/\D/g, '')}_${period}.txt`);
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);

            } catch (err) {
                console.error(err);
                setError("Erro ao gerar arquivo SPED. Verifique os logs.");
            } finally {
                setLoading(false);
            }
        }, 1000);
    };

    return (
        <div className="bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-color)]">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                Exportação SPED Fiscal (EFD ICMS/IPI)
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
                Gere o arquivo de texto para importação no Validador (PVA) da Receita Federal.
                O arquivo contém os blocos 0, C, H e 9.
            </p>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center mb-6 border border-red-200">
                    <AlertTriangle size={20} className="mr-2" />
                    {error}
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-end gap-4">
                <div className="w-full sm:w-64">
                    <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">Competência (Mês/Ano)</label>
                    <input
                        type="month"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-[var(--text-primary)] font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <Button
                    onClick={handleDownload}
                    disabled={loading}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                >
                    {loading ? <Loader2 className="mr-2 animate-spin" size={18} /> : <Download className="mr-2" size={18} />}
                    Gerar Arquivo .TXT
                </Button>
            </div>

            <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
                <h4 className="text-xs font-black uppercase text-[var(--text-secondary)] mb-4">Registros Gerados</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
                        <span className="block text-xs text-[var(--text-secondary)]">0000</span>
                        <span className="font-bold text-[var(--text-primary)]">Abertura</span>
                    </div>
                    <div className="p-3 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
                        <span className="block text-xs text-[var(--text-secondary)]">0150</span>
                        <span className="font-bold text-[var(--text-primary)]">Participantes</span>
                    </div>
                    <div className="p-3 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
                        <span className="block text-xs text-[var(--text-secondary)]">C100/C190</span>
                        <span className="font-bold text-[var(--text-primary)]">Notas Fiscais</span>
                    </div>
                    <div className="p-3 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
                        <span className="block text-xs text-[var(--text-secondary)]">C990</span>
                        <span className="font-bold text-[var(--text-primary)]">Encerramento</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
