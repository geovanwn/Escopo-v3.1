import React, { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { AlertCircle, Calendar, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { formatDateBR, parseDateSafe } from '../utils/formatters';

export const SmartAlerts: React.FC = () => {
    const { selectedCompany, filings, invoices, employees } = useData();

    const alerts = useMemo(() => {
        const list: any[] = [];
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        // 1. Digital Certificate Expiry
        if (selectedCompany?.certificate?.validity) {
            const expiry = parseDateSafe(selectedCompany.certificate.validity);
            const daysToExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            if (daysToExpiry < 0) {
                list.push({
                    id: 'cert-expired',
                    title: 'Certificado Digital Vencido',
                    desc: `Expirou em ${formatDateBR(selectedCompany.certificate.validity)}. Renove imediatamente para evitar bloqueios.`,
                    priority: 'critical',
                    type: 'config'
                });
            } else if (daysToExpiry <= 30) {
                list.push({
                    id: 'cert-warning',
                    title: `Certificado Vence em ${daysToExpiry} dias`,
                    desc: `Vencimento: ${formatDateBR(selectedCompany.certificate.validity)}. Programar renovação.`,
                    priority: daysToExpiry <= 10 ? 'high' : 'medium',
                    type: 'config'
                });
            }
        } else {
            list.push({
                id: 'cert-missing',
                title: 'Certificado Digital Não Configurado',
                desc: 'Configure o certificado A1 para habilitar emissão de notas e eSocial.',
                priority: 'medium',
                type: 'config'
            });
        }

        // 2. Tax Deadlines (DAS - Simples Nacional)
        // Rule: Due 20th of next month
        const nextMonth = new Date(currentYear, currentMonth + 1, 20);
        // Check if filing exists for current competence (displayed as Previous-Month usually)
        // Logic: if today is 15th of May, we are paying April's tax. April's tax filing is competence '202X-04'.
        // So we check if filing '202X-04' (previous month) exists.

        const previousMonthDate = new Date(currentYear, currentMonth - 1, 1);
        const prevComp = `${previousMonthDate.getFullYear()}-${(previousMonthDate.getMonth() + 1).toString().padStart(2, '0')}`;
        // Adjust for filing competence format 'MM/YYYY' or 'YYYY-MM' used in system. 
        // Based on Taxes.tsx, it seems to use 'YYYY-MM'. Based on Filing type, let's check.
        // Tax filing usually stored with competence 'YYYY-MM'.

        const hasPaidDas = filings.some(f =>
            f.companyId === selectedCompany?.id &&
            (f.name === 'DAS' || f.name === 'Simples Nacional') &&
            (f.competence === prevComp || f.competence === `${previousMonthDate.getMonth() + 1}/${previousMonthDate.getFullYear()}`) &&
            f.status === 'sent'
        );

        const dasDeadline = new Date(currentYear, currentMonth, 20); // 20th of CURRENT month (paying previous month)
        // If today is before 20th, and check if not paid.
        if (today.getDate() <= 20 && !hasPaidDas) {
            const daysLeft = Math.ceil((dasDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            list.push({
                id: 'tax-das',
                title: 'Guia DAS (Simples Nacional)',
                desc: `Vence em ${daysLeft} dias (${formatDateBR(dasDeadline.toISOString())}). Competência: ${prevComp}`,
                priority: daysLeft <= 2 ? 'critical' : 'high',
                type: 'tax'
            });
        }

        // 3. Payroll Step (Vacations)
        // Check for vacations expiring soon (1 year + 11 months since admission)
        employees
            .filter(e => e.companyId === selectedCompany?.id && e.status === 'ativo')
            .forEach(emp => {
                const admission = parseDateSafe(emp.admissionDate);
                // Concessive period ends 1 year + 11 months after admission year cycle?
                // Minimal check: Admission + 1 year = Vested. Admission + 2 years = Double Pay Risk.
                // Warn if close to 2 years from admission (simplified).

                const yearsServiced = (today.getTime() - admission.getTime()) / (1000 * 60 * 60 * 24 * 365);
                const nextLimit = new Date(admission);
                nextLimit.setFullYear(admission.getFullYear() + Math.floor(yearsServiced) + 1);

                // If standard simplistic check:
                // TODO: Real vacation logic is complex (periods taken). 
                // We'll just list active incomplete admission data as a placeholder for data hygiene.
                if (!emp.cpf || emp.cpf.length < 11) {
                    list.push({
                        id: `emp-data-${emp.id}`,
                        title: `Dados Incompletos: ${emp.name}`,
                        desc: 'CPF ou dados admissionais pendentes.',
                        priority: 'medium',
                        type: 'hr'
                    });
                }
            });

        return list.length > 0 ? list : [{ id: 'all-good', title: 'Tudo em dia!', desc: 'Nenhuma pendência crítica encontrada.', priority: 'success', type: 'general' }];
    }, [selectedCompany, filings, employees]);

    const getIcon = (type: string, priority: string) => {
        if (priority === 'success') return <CheckCircle2 className="text-emerald-500" />;
        if (type === 'config') return <ShieldAlert className={priority === 'critical' ? 'text-red-500' : 'text-amber-500'} />;
        if (type === 'tax') return <FileText className="text-blue-500" />;
        return <AlertCircle className="text-slate-400" />;
    };

    const getBg = (priority: string) => {
        if (priority === 'critical') return 'bg-red-50 border-red-100';
        if (priority === 'high') return 'bg-orange-50 border-orange-100';
        if (priority === 'success') return 'bg-emerald-50 border-emerald-100';
        return 'bg-white border-slate-100';
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <AlertCircle size={20} />
                </div>
                <div>
                    <h3 className="font-black text-slate-800 text-lg">Assistente Inteligente</h3>
                    <p className="text-xs text-slate-500 font-medium">Monitoramento proativo de obrigações e riscos</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {alerts.map(alert => (
                    <div key={alert.id} className={`p-4 rounded-xl border ${getBg(alert.priority)} flex items-start gap-3 transition-transform hover:scale-[1.02] cursor-default`}>
                        <div className="mt-1">{getIcon(alert.type, alert.priority)}</div>
                        <div>
                            <h4 className={`text-sm font-bold ${alert.priority === 'critical' ? 'text-red-700' : 'text-slate-700'}`}>
                                {alert.title}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                {alert.desc}
                            </p>
                            {alert.priority !== 'success' && (
                                <button className="mt-3 text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:underline">
                                    Resolver Agora →
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
