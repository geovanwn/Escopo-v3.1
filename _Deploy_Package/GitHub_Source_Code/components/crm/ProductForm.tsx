
import React from 'react';
import { Package, Tag, Archive, DollarSign, Truck, Paperclip } from 'lucide-react';
import { ProductSchema } from '../../utils/crmSchemas';
import { useData } from '../../contexts/DataContext';

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

export const ProductForm = ({ formData, handleInputChange, formTab, setFormTab }: any) => {
    return (
        <div className="min-h-[400px]">
            <div className="flex border-b border-[var(--border-color)] mb-6 space-x-1 overflow-x-auto">
                <TabButton id="basico" label="1. Básico" current={formTab} set={setFormTab} icon={Package} />
                <TabButton id="comercial" label="2. Comercial" current={formTab} set={setFormTab} icon={Tag} />
                <TabButton id="estoque" label="3. Estoque" current={formTab} set={setFormTab} icon={Archive} />
                <TabButton id="custo" label="4. Preço/Tax" current={formTab} set={setFormTab} icon={DollarSign} />
                <TabButton id="logistica" label="5. Logística" current={formTab} set={setFormTab} icon={Truck} />
                <TabButton id="imagens" label="6. Imagens" current={formTab} set={setFormTab} icon={Paperclip} />
            </div>

            {formTab === 'basico' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <div className="md:col-span-2 grid grid-cols-4 gap-4">
                        <div className="col-span-1">
                            <CRMField label="Código" name="orderNumber" value={formData.orderNumber || 'Automático'} readOnly disabled className="bg-[var(--bg-secondary)] font-mono text-center" />
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
                    <div className="md:col-span-3 pt-4 border-t"><h5 className="font-bold text-slate-700 text-sm mb-2 uppercase tracking-wide">Tributação (NFe/CTe)</h5></div>
                    <CRMField label="ICMS (%)" name="icmsRate" type="number" value={formData.icmsRate} onChange={handleInputChange} />
                    <CRMField label="IPI (%)" name="ipiRate" type="number" value={formData.ipiRate} onChange={handleInputChange} />
                    <CRMField label="PIS (%)" name="pisRate" type="number" value={formData.pisRate} onChange={handleInputChange} />
                    <CRMField label="COFINS (%)" name="cofinsRate" type="number" value={formData.cofinsRate} onChange={handleInputChange} />
                    <CRMField label="CSLL (%)" name="csllRate" type="number" value={formData.csllRate} onChange={handleInputChange} />
                    <CRMField label="IRRF (%)" name="irrfRate" type="number" value={formData.irrfRate} onChange={handleInputChange} />
                    <CRMField label="INSS (%)" name="inssRate" type="number" value={formData.inssRate} onChange={handleInputChange} />
                </div>
            )}
            {formTab === 'logistica' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <CRMField label="NCM (8 dígitos)" name="ncm" required maxLength={8} value={formData.ncm} onChange={handleInputChange} />
                    <CRMSelect label="Origem" name="origin" value={formData.origin} onChange={handleInputChange}><option value="nacional">Nacional</option><option value="importado">Importado</option></CRMSelect>
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
