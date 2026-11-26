
import React from 'react';
import { FileText, Wrench, DollarSign, Percent } from 'lucide-react';

const CRMField = ({ label, name, value, onChange, required = false, type = "text", ...props }: any) => (
    <div className={`mb-4 ${props.className || ''}`}>
        <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>
        <input
            type={type}
            name={name}
            required={required}
            className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm focus:border-green-500 focus:ring-4 focus:ring-green-500/10 focus:outline-none placeholder-[var(--text-secondary)]/30 transition-all disabled:bg-[var(--bg-secondary)]"
            value={value || ''}
            onChange={onChange}
            {...props}
        />
    </div>
);

const CRMTextArea = ({ label, name, value, onChange, required = false, ...props }: any) => (
    <div className={`mb-4 ${props.className || ''}`}>
        <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>
        <textarea
            name={name}
            required={required}
            className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm focus:border-green-500 focus:ring-4 focus:ring-green-500/10 focus:outline-none placeholder-[var(--text-secondary)]/30 transition-all disabled:bg-[var(--bg-secondary)]"
            rows={4}
            value={value || ''}
            onChange={onChange}
            {...props}
        />
    </div>
);

const CRMSelect = ({ label, name, value, onChange, required = false, children, ...props }: any) => (
    <div className={`mb-4 ${props.className || ''}`}>
        <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>
        <select name={name} required={required} className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm focus:border-green-500 focus:ring-4 focus:ring-green-500/10 focus:outline-none transition-all disabled:bg-[var(--bg-secondary)]" value={value || ''} onChange={onChange} {...props}>
            {children}
        </select>
    </div>
);

const TabButton = ({ id, label, current, set, icon: Icon }: any) => (
    <button
        type="button"
        onClick={() => set(id)}
        className={`px-4 py-3 text-sm font-black border-b-2 transition-all uppercase tracking-wider whitespace-nowrap flex items-center ${current === id ? 'border-green-600 text-green-600' : 'border-transparent text-[var(--text-secondary)] hover:text-green-500'}`}
    >
        {Icon && <Icon size={16} className="mr-2 mb-0.5" />} {label}
    </button>
);

export const ServiceForm = ({ formData, handleInputChange, formTab, setFormTab }: any) => {
    return (
        <div className="min-h-[400px]">
            <div className="flex border-b border-gray-200 mb-6 space-x-1 overflow-x-auto">
                <TabButton id="geral" label="1. Geral" current={formTab} set={setFormTab} icon={FileText} />
                <TabButton id="execucao" label="2. Execução" current={formTab} set={setFormTab} icon={Wrench} />
                <TabButton id="comercial" label="3. Comercial" current={formTab} set={setFormTab} icon={DollarSign} />
                <TabButton id="tributacao" label="4. Tributação" current={formTab} set={setFormTab} icon={Percent} />
            </div>

            {formTab === 'geral' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <div className="md:col-span-2 grid grid-cols-4 gap-4">
                        <div className="col-span-1">
                            <CRMField label="Código" name="orderNumber" value={formData.orderNumber || 'Automático'} readOnly disabled className="bg-gray-100 font-mono text-center" />
                        </div>
                        <div className="col-span-3">
                            <CRMField label="Nome do Serviço" name="name" required value={formData.name} onChange={handleInputChange} />
                        </div>
                    </div>
                    <CRMField label="Código Interno" name="code" value={formData.code} onChange={handleInputChange} />
                    <CRMField label="Item do Serviço (Ex: 14.01)" name="serviceItem" value={formData.serviceItem} onChange={handleInputChange} placeholder="00.00" />
                    <CRMField label="Categoria" name="category" value={formData.category} onChange={handleInputChange} />
                    <div className="md:col-span-2"><CRMTextArea label="Descrição Detalhada" name="description" value={formData.description} onChange={handleInputChange} /></div>
                </div>
            )}
            {formTab === 'execucao' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <div className="md:col-span-2"><CRMTextArea label="Escopo" name="scope" value={formData.scope} onChange={handleInputChange} /></div>
                    <div className="md:col-span-2"><CRMTextArea label="O que NÃO está incluso" name="exclusions" value={formData.exclusions} onChange={handleInputChange} /></div>
                    <CRMSelect label="Método" name="method" value={formData.method} onChange={handleInputChange}><option value="presencial">Presencial</option><option value="remoto">Remoto</option><option value="hibrido">Híbrido</option></CRMSelect>
                    <CRMField label="Tempo Estimado" name="executionTime" value={formData.executionTime} onChange={handleInputChange} />
                </div>
            )}
            {formTab === 'comercial' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <CRMField label="Preço" name="price" type="number" step="0.01" required value={formData.price} onChange={handleInputChange} />
                    <CRMSelect label="Modelo Cobrança" name="pricingModel" value={formData.pricingModel} onChange={handleInputChange}><option value="fixo">Preço Fixo</option><option value="hora">Por Hora</option><option value="pacote">Pacote</option></CRMSelect>
                    <CRMField label="Condições Pagamento" name="paymentTerms" placeholder="Ex: 50% entrada" value={formData.paymentTerms} onChange={handleInputChange} />
                </div>
            )}
            {formTab === 'tributacao' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <CRMField label="ISS (%)" name="issRate" type="number" required value={formData.issRate} onChange={handleInputChange} />
                    <CRMField label="CNAE" name="cnae" value={formData.cnae} onChange={handleInputChange} />
                    <div className="md:col-span-2 pt-2 border-t mt-2">
                        <h5 className="font-bold text-slate-700 text-[10px] mb-2 uppercase tracking-wide">Retenções (NFSe)</h5>
                    </div>
                    <CRMField label="PIS (%)" name="pisRate" type="number" value={formData.pisRate} onChange={handleInputChange} />
                    <CRMField label="COFINS (%)" name="cofinsRate" type="number" value={formData.cofinsRate} onChange={handleInputChange} />
                    <CRMField label="CSLL (%)" name="csllRate" type="number" value={formData.csllRate} onChange={handleInputChange} />
                    <CRMField label="IRRF (%)" name="irrfRate" type="number" value={formData.irrfRate} onChange={handleInputChange} />
                    <CRMField label="INSS (%)" name="inssRate" type="number" value={formData.inssRate} onChange={handleInputChange} />
                    <div className="md:col-span-2 bg-slate-50 border border-slate-100 p-3 rounded-xl text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                        Configure as alíquotas de retenção que serão sugeridas no faturamento de serviços.
                    </div>
                </div>
            )}
        </div>
    );
};
