import { CRMField, CRMSelect, CRMTextArea, TabButton } from './CRMSharedComponents';
import { FileText, Wrench, DollarSign, Percent } from 'lucide-react';

export const ServiceForm = ({ formData, handleInputChange, formTab, setFormTab, setFormData }: any) => {
    return (
        <div className="min-h-[400px]">
            <div className="flex bg-[var(--bg-input)] p-2 rounded-[1.25rem] border border-[var(--border-color)] mb-8 space-x-1 overflow-x-auto custom-scrollbar shadow-sm">
                <TabButton id="geral" label="Geral" current={formTab} set={setFormTab} icon={FileText} />
                <TabButton id="execucao" label="Execução" current={formTab} set={setFormTab} icon={Wrench} />
                <TabButton id="comercial" label="Comercial" current={formTab} set={setFormTab} icon={DollarSign} />
                <TabButton id="tributacao" label="Tributação" current={formTab} set={setFormTab} icon={Percent} />
            </div>

            {formTab === 'geral' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <div className="md:col-span-2 grid grid-cols-4 gap-4">
                        <div className="col-span-1">
                            <CRMField label="Código" name="orderNumber" placeholder="Ex: 100" value={formData.orderNumber || ''} onChange={handleInputChange} className="bg-[var(--bg-card)] font-mono text-center" />
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
                    <div className="md:col-span-2 pt-2 border-t border-[var(--border-color)] mt-2">
                        <h5 className="font-bold text-[var(--text-primary)] text-[10px] mb-2 uppercase tracking-wide">Retenções (NFSe)</h5>
                    </div>
                    <CRMField label="PIS (%)" name="pisRate" type="number" value={formData.pisRate} onChange={handleInputChange} />
                    <CRMField label="COFINS (%)" name="cofinsRate" type="number" value={formData.cofinsRate} onChange={handleInputChange} />
                    <CRMField label="CSLL (%)" name="csllRate" type="number" value={formData.csllRate} onChange={handleInputChange} />
                    <CRMField label="IRRF (%)" name="irrfRate" type="number" value={formData.irrfRate} onChange={handleInputChange} />
                    <CRMField label="INSS (%)" name="inssRate" type="number" value={formData.inssRate} onChange={handleInputChange} />
                    <div className="md:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3 rounded-xl text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-tighter">
                        Configure as alíquotas de retenção que serão sugeridas no faturamento de serviços.
                    </div>
                    <div className="md:col-span-2 pt-2 border-t border-[var(--border-color)] mt-2">
                        <h5 className="font-bold text-[var(--text-primary)] text-[10px] mb-2 uppercase tracking-wide">Contábil</h5>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Conta Contábil Padrão (Receita de Serviços) *</label>
                        <div className="space-y-2">
                            <input
                                name="accountingAccount"
                                value={formData.accountingAccount || ''}
                                readOnly
                                placeholder="Gerada automaticamente pelo sistema"
                                className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] cursor-not-allowed opacity-80"
                            />
                            <button
                                type="button"
                                className="w-full text-xs font-bold border-dashed border-2 p-2 rounded hover:border-green-500 hover:text-green-600 transition-colors text-gray-500"
                                onClick={() => {
                                    const suffix = Math.floor(1000 + Math.random() * 9000);
                                    setFormData((prev: any) => ({ ...prev, accountingAccount: `3.1.02.${suffix}` }));
                                }}
                            >
                                Gerar Conta Contábil
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
