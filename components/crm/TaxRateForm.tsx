import React from 'react';
import { CRMField, CRMSelect } from './CRMSharedComponents';

export const TaxRateForm = ({ formData, handleInputChange }: any) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
                <CRMField label="Nome da Alíquota" name="name" required placeholder="Ex: ICMS SP Intra" value={formData.name} onChange={handleInputChange} />
            </div>
            <CRMSelect label="Tipo de Imposto" name="type" required value={formData.type} onChange={handleInputChange}>
                <option value="">Selecione...</option>
                <option value="ICMS">ICMS</option>
                <option value="ISS">ISS</option>
                <option value="PIS">PIS</option>
                <option value="COFINS">COFINS</option>
                <option value="IPI">IPI</option>
                <option value="IRPJ">IRPJ</option>
                <option value="CSLL">CSLL</option>
            </CRMSelect>
            <CRMField label="Valor / Percentual (%)" name="rate" type="number" step="0.01" required value={formData.rate} onChange={handleInputChange} />
            <CRMSelect label="Aplicação" name="applicationScope" value={formData.applicationScope} onChange={handleInputChange}>
                <option value="produto">Produto</option>
                <option value="servico">Serviço</option>
                <option value="funcionario">Funcionário</option>
            </CRMSelect>
            <CRMField label="Base de Cálculo" name="baseCalculation" placeholder="Ex: Valor Total da Nota" value={formData.baseCalculation} onChange={handleInputChange} />
        </div>
    );
};
