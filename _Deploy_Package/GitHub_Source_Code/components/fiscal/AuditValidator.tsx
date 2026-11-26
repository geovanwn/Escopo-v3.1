import React from 'react';
import { useData } from '../../contexts/DataContext';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export const AuditValidator = () => {
    const { invoices } = useData();
    const [results, setResults] = React.useState<any[]>([]);

    React.useEffect(() => {
        import('../../utils/fiscalValidator').then(mod => {
            const res = mod.validateInvoiceBatch(invoices);
            const flatErrors: any[] = [];
            res.forEach(r => {
                r.errors.forEach(e => flatErrors.push({ record: 'C100', field: 'Auto', message: `[${r.invoiceNumber}] ${e}`, severity: 'error' }));
                r.warnings.forEach(w => flatErrors.push({ record: 'C190', field: 'Auto', message: `[${r.invoiceNumber}] ${w}`, severity: 'warning' }));
            });
            setResults(flatErrors);
        });
    }, [invoices]);

    if (results.length === 0) {
        return (
            <div className="text-center p-12 text-green-600 bg-green-50 rounded-2xl border border-green-200">
                <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
                <h3 className="font-bold text-xl text-green-700">Tudo Certo com sua Escrita!</h3>
                <p className="text-green-600/80 mt-2">Nenhuma inconsistência tributária encontrada nos registros fiscais atuais.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4">
            <div className="flex gap-4 mb-4">
                <div className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-bold text-sm flex items-center gap-2">
                    <AlertTriangle size={16} /> {results.filter(r => r.severity === 'error').length} Erros
                </div>
                <div className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg font-bold text-sm flex items-center gap-2">
                    <AlertTriangle size={16} /> {results.filter(r => r.severity === 'warning').length} Alertas
                </div>
            </div>

            {results.map((err, i) => (
                <div key={i} className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between border-l-4" style={{ borderLeftColor: err.severity === 'error' ? '#ef4444' : '#f59e0b' }}>
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${err.severity === 'error' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                            {err.severity === 'error' ? <XCircle size={20} /> : <AlertTriangle size={20} />}
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase text-slate-400">Reg. {err.record}</p>
                            <p className="text-sm font-bold text-slate-700">{err.message}</p>
                        </div>
                    </div>
                    <button className="px-4 py-2 text-xs font-bold uppercase rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                        Verificar
                    </button>
                </div>
            ))}
        </div>
    );
};
