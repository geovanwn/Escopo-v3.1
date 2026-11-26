import React from 'react';
import { CRMField } from './CRMSharedComponents';

export const UnitForm = ({ formData, handleInputChange }: any) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CRMField label="Sigla (Código)" name="code" required value={formData.code} onChange={handleInputChange} placeholder="Ex: UN" className="uppercase" />
            <div className="md:col-span-2">
                <CRMField label="Descrição" name="description" required value={formData.description} onChange={handleInputChange} placeholder="Ex: Unidade" />
            </div>
        </div>
    );
};
