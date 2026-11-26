import React from 'react';
import { CRMField, CRMSelect } from './CRMSharedComponents';

export const CFOPForm = ({ formData, handleInputChange, operationTypes }: any) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CRMField label="Código CFOP" name="code" required maxLength={4} value={formData.code} onChange={handleInputChange} placeholder="Ex: 5102" />
            <CRMSelect label="Tipo de Operação" name="operationTypeId" required value={formData.operationTypeId} onChange={handleInputChange}>
                <option value="">Selecione...</option>
                {operationTypes?.map((ot: any) => (
                    <option key={ot.id} value={ot.id}>{ot.name}</option>
                ))}
                <option value="entry">Entrada (Legado)</option>
                <option value="exit">Saída (Legado)</option>
            </CRMSelect>
            <div className="md:col-span-2">
                <CRMField label="Descrição" name="description" required value={formData.description} onChange={handleInputChange} placeholder="Ex: Venda de Mercadoria" />
            </div>
        </div>
    );
};
