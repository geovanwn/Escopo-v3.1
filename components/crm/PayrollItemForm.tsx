import React from 'react';
import { CRMField, CRMSelect } from './CRMSharedComponents';

export const PayrollItemForm = ({ formData, handleInputChange }: any) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CRMField label="Código Interno" name="code" required value={formData.code} onChange={handleInputChange} />
            <CRMField label="Nome da Rubrica" name="name" required value={formData.name} onChange={handleInputChange} />
            <CRMSelect label="Tipo" name="type" required value={formData.type} onChange={handleInputChange}>
                <option value="provento">Provento (Crédito)</option>
                <option value="desconto">Desconto (Débito)</option>
                <option value="encargo">Encargo (Empresa)</option>
            </CRMSelect>
            <CRMSelect label="Forma de Cálculo" name="valueType" value={formData.valueType} onChange={handleInputChange}>
                <option value="percentual">Percentual</option>
                <option value="fixo">Valor Fixo</option>
            </CRMSelect>
            <CRMField label="Valor Padrão" name="value" type="number" step="0.01" value={formData.value} onChange={handleInputChange} />

            <div className="md:col-span-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <h4 className="font-bold text-gray-700 dark:text-slate-200 text-sm mb-2">Incidências</h4>
            </div>
            <div className="flex gap-4">
                <label className="flex items-center">
                    <input type="checkbox" name="incidesFGTS" checked={formData.incidesFGTS} onChange={handleInputChange} className="mr-2" />
                    FGTS
                </label>
                <label className="flex items-center">
                    <input type="checkbox" name="incidesINSS" checked={formData.incidesINSS} onChange={handleInputChange} className="mr-2" />
                    INSS
                </label>
                <label className="flex items-center">
                    <input type="checkbox" name="incidesIR" checked={formData.incidesIR} onChange={handleInputChange} className="mr-2" />
                    IRRF
                </label>
            </div>
        </div>
    );
};
