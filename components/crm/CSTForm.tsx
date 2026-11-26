import React from 'react';
import { CRMField, CRMSelect } from './CRMSharedComponents';

export const CSTForm = ({ formData, handleInputChange }: any) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CRMField label="Código CST" name="code" required value={formData.code} onChange={handleInputChange} placeholder="Ex: 00" />
            <CRMSelect label="Tipo de Imposto" name="taxType" required value={formData.taxType} onChange={handleInputChange}>
                <option value="">Selecione...</option>
                <option value="ICMS">ICMS</option>
                <option value="IPI">IPI</option>
                <option value="PIS">PIS</option>
                <option value="COFINS">COFINS</option>
            </CRMSelect>
            <div className="md:col-span-2">
                <CRMField label="Descrição" name="description" required value={formData.description} onChange={handleInputChange} placeholder="Ex: Tributada Integralmente" />
            </div>
        </div>
    );
};
