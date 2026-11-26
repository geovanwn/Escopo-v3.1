import React from 'react';
import { CRMField, CRMSelect } from './CRMSharedComponents';

export const NCMForm = ({ formData, handleInputChange }: any) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CRMField label="Código NCM (8 Dígitos)" name="code" required maxLength={8} value={formData.code} onChange={handleInputChange} />
            <CRMField label="Descrição" name="description" required value={formData.description} onChange={handleInputChange} />
            <CRMField label="Categoria" name="category" value={formData.category} onChange={handleInputChange} />
            <CRMSelect label="Origem" name="origin" value={formData.origin} onChange={handleInputChange}>
                <option value="nacional">Nacional</option>
                <option value="importado">Importado</option>
            </CRMSelect>

            <div className="md:col-span-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <h4 className="font-bold text-gray-700 dark:text-slate-200 text-sm mb-2">Alíquotas Padrão (%)</h4>
            </div>
            <CRMField label="IPI" name="aliquotaIPI" type="number" value={formData.aliquotaIPI} onChange={handleInputChange} />
            <CRMField label="ICMS (Estadual)" name="aliquotaICMS" type="number" value={formData.aliquotaICMS} onChange={handleInputChange} />
            <CRMField label="PIS" name="aliquotaPIS" type="number" value={formData.aliquotaPIS} onChange={handleInputChange} />
            <CRMField label="COFINS" name="aliquotaCOFINS" type="number" value={formData.aliquotaCOFINS} onChange={handleInputChange} />
        </div>
    );
};
