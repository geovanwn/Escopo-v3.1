import { CRMField, CRMSelect, CRMTextArea, TabButton } from './CRMSharedComponents';
import { Package, Tag, Archive, DollarSign, Truck, Paperclip } from 'lucide-react';
import { ProductSchema } from '../../utils/crmSchemas';
import { useData } from '../../contexts/DataContext';

export const ProductForm = ({ formData, handleInputChange, formTab, setFormTab, setFormData }: any) => {
    return (
        <div className="min-h-[400px]">
            <div className="flex bg-[var(--bg-input)] p-2 rounded-[1.25rem] border border-[var(--border-color)] mb-8 space-x-1 overflow-x-auto custom-scrollbar shadow-sm">
                <TabButton id="basico" label="Básico" current={formTab} set={setFormTab} icon={Package} />
                <TabButton id="comercial" label="Comercial" current={formTab} set={setFormTab} icon={Tag} />
                <TabButton id="estoque" label="Estoque" current={formTab} set={setFormTab} icon={Archive} />
                <TabButton id="custo" label="Preço / Tax" current={formTab} set={setFormTab} icon={DollarSign} />
                <TabButton id="logistica" label="Logística" current={formTab} set={setFormTab} icon={Truck} />
                <TabButton id="imagens" label="Imagens" current={formTab} set={setFormTab} icon={Paperclip} />
            </div>

            {formTab === 'basico' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <div className="md:col-span-2 grid grid-cols-4 gap-4">
                        <div className="col-span-1">
                            <CRMField label="Código" name="orderNumber" placeholder="Ex: 100" value={formData.orderNumber || ''} onChange={handleInputChange} className="bg-[var(--bg-card)] font-mono text-center" />
                        </div>
                        <div className="col-span-3">
                            <CRMField label="Nome do Produto" name="name" required value={formData.name} onChange={handleInputChange} />
                        </div>
                    </div>
                    <CRMField label="Código SKU" name="code" required value={formData.code} onChange={handleInputChange} />
                    <CRMField label="Código EAN (Barras)" name="ean" value={formData.ean} onChange={handleInputChange} />
                    <CRMField label="Categoria" name="category" value={formData.category} onChange={handleInputChange} />
                    <CRMField label="Subcategoria" name="subCategory" value={formData.subCategory} onChange={handleInputChange} />
                    <div className="md:col-span-2"><CRMTextArea label="Descrição Detalhada" name="description" value={formData.description} onChange={handleInputChange} /></div>
                </div>
            )}
            {formTab === 'comercial' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <CRMField label="Marca" name="brand" value={formData.brand} onChange={handleInputChange} />
                    <CRMField label="Modelo" name="model" value={formData.model} onChange={handleInputChange} />
                    <CRMField label="Fabricante" name="manufacturer" value={formData.manufacturer} onChange={handleInputChange} />
                    <CRMField label="Fornecedor Principal" name="supplierId" placeholder="Nome ou ID" value={formData.supplierId} onChange={handleInputChange} />
                    <CRMField label="Garantia (meses)" name="warranty" value={formData.warranty} onChange={handleInputChange} />
                </div>
            )}
            {formTab === 'estoque' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-300">
                    <CRMField label="Unidade (UN, KG, CX)" name="unit" required value={formData.unit} onChange={handleInputChange} />
                    <CRMField label="Estoque Atual" name="stock" type="number" required value={formData.stock} onChange={handleInputChange} />
                    <CRMField label="Localização" name="location" placeholder="Corredor A" value={formData.location} onChange={handleInputChange} />
                    <CRMField label="Estoque Mínimo" name="minStock" type="number" value={formData.minStock} onChange={handleInputChange} />
                    <CRMField label="Estoque Máximo" name="maxStock" type="number" value={formData.maxStock} onChange={handleInputChange} />
                </div>
            )}
            {formTab === 'custo' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-300">
                    <CRMField label="Preço de Custo" name="costPrice" type="number" step="0.01" value={formData.costPrice} onChange={handleInputChange} />
                    <CRMField label="Preço de Venda" name="price" type="number" step="0.01" required value={formData.price} onChange={handleInputChange} />
                    <CRMField label="Margem (%)" name="margin" type="number" value={formData.margin} onChange={handleInputChange} />
                    <div className="md:col-span-3 pt-4 border-t"><h5 className="font-bold text-slate-700 text-sm mb-2 uppercase tracking-wide">Tributação e Alíquotas</h5></div>
                    <CRMField label="ICMS (%)" name="icmsRate" type="number" value={formData.icmsRate} onChange={handleInputChange} />
                    <CRMField label="Código CEST" name="cest" placeholder="Ex: 01.001.00" value={formData.cest} onChange={handleInputChange} />
                    <CRMField label="CST/CSOSN Padrão" name="icmsCst" placeholder="Ex: 000, 102" value={formData.icmsCst} onChange={handleInputChange} />
                    
                    <CRMField label="IPI (%)" name="ipiRate" type="number" value={formData.ipiRate} onChange={handleInputChange} />
                    <CRMField label="PIS (%)" name="pisRate" type="number" value={formData.pisRate} onChange={handleInputChange} />
                    <CRMField label="COFINS (%)" name="cofinsRate" type="number" value={formData.cofinsRate} onChange={handleInputChange} />
                    <CRMField label="CSLL (%)" name="csllRate" type="number" value={formData.csllRate} onChange={handleInputChange} />
                    <CRMField label="IRRF (%)" name="irrfRate" type="number" value={formData.irrfRate} onChange={handleInputChange} />
                    <CRMField label="INSS (%)" name="inssRate" type="number" value={formData.inssRate} onChange={handleInputChange} />

                    <div className="md:col-span-3"><h5 className="font-bold text-slate-700 text-sm mb-2 mt-4 uppercase tracking-wide">Matriz de CFOPs Automação</h5></div>
                    <CRMField label="CFOP Venda Interna" name="cfopVendaInterna" placeholder="5101/5102" value={formData.cfopVendaInterna} onChange={handleInputChange} />
                    <CRMField label="CFOP Venda Interestadual" name="cfopVendaInterestadual" placeholder="6101/6102" value={formData.cfopVendaInterestadual} onChange={handleInputChange} />
                    <CRMField label="CFOP Compra Interna" name="cfopCompraInterna" placeholder="1101/1102" value={formData.cfopCompraInterna} onChange={handleInputChange} />

                    <div className="md:col-span-3"><h5 className="font-bold text-slate-700 text-sm mb-2 mt-4 uppercase tracking-wide">Contábil</h5></div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Conta Contábil Padrão (Venda/Estoque) *</label>
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
                                    setFormData((prev: any) => ({ ...prev, accountingAccount: `3.1.01.${suffix}` }));
                                }}
                            >
                                Gerar Conta Contábil
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {formTab === 'logistica' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <CRMField label="NCM (8 dígitos)" name="ncm" required maxLength={8} value={formData.ncm} onChange={handleInputChange} />
                    <CRMSelect label="Origem da Mercadoria (CST)" name="origin" value={formData.origin} onChange={handleInputChange}>
                        <option value="">Selecione...</option>
                        <option value="0">0 - Nacional, exceto indicadas 3 a 5</option>
                        <option value="1">1 - Estrangeira Importação Direta</option>
                        <option value="2">2 - Estrangeira Interno</option>
                        <option value="3">3 - Nacional, c/ conteúdo sup 40%</option>
                        <option value="4">4 - Nacional, Prod Básica MDF</option>
                        <option value="5">5 - Nacional, inf a 40%</option>
                    </CRMSelect>
                    <CRMField label="Peso Bruto (kg)" name="weightGross" type="number" step="0.001" value={formData.weightGross} onChange={handleInputChange} />
                    <CRMField label="Peso Líquido (kg)" name="weightNet" type="number" step="0.001" value={formData.weightNet} onChange={handleInputChange} />
                </div>
            )}
            {formTab === 'imagens' && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 cursor-pointer">
                    <Paperclip size={32} />
                    <p className="mt-2 text-sm">Clique para adicionar fotos do produto</p>
                </div>
            )}
        </div>
    );
};
