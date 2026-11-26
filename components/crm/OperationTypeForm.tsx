import React from 'react';
import { CRMField, CRMSelect } from './CRMSharedComponents';

export const OperationTypeForm = ({ formData, handleInputChange }: any) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
                <CRMField label="Descrição da Natureza" name="name" required value={formData.name} onChange={handleInputChange} placeholder="Ex: Venda, Compra, Devolução, Remessa" />
            </div>
            <div className="md:col-span-2">
                <CRMSelect label="Flag / Tipo de Operação" name="flag" required value={formData.flag} onChange={handleInputChange}>
                    <option value="">Selecione o tipo...</option>
                    <option value="compra">🛒 Compra (Mercadoria para Revenda)</option>
                    <option value="venda">💰 Venda de Mercadoria / Serviço</option>
                    <option value="imobilizado">🏭 Imobilizado (Ativo Permanente)</option>
                    <option value="compra_material_aplicado">🔧 Compra de Material Aplicado na Obra/Serviço</option>
                    <option value="uso_consumo">📦 Uso e Consumo (Interno)</option>
                    <option value="devolucao">↩️ Devolução de Compra / Venda</option>
                    <option value="remessa">📤 Remessa (Conserto, Demo, Beneficiamento)</option>
                    <option value="transferencia">🔄 Transferência Entre Estabelecimentos</option>
                    <option value="servico_prestado">🛠️ Serviço Prestado (NFS-e emitida)</option>
                    <option value="servico_tomado">📋 Serviço Tomado (NFS-e recebida)</option>
                    <option value="outros">📎 Outros / Não Especificado</option>
                </CRMSelect>
            </div>
            <div className="md:col-span-2">
                <CRMField label="Observação / Detalhes" name="description" value={formData.description} onChange={handleInputChange} placeholder="Ex: Operações relativas à venda de mercadorias" />
            </div>
        </div>
    );
};
