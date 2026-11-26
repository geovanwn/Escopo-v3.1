import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { PayrollItem } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import {
    Info, Save, X, FileText, Activity,
    Calculator, DollarSign, Database,
    Calendar, CheckCircle, AlertTriangle
} from 'lucide-react';

interface RubricFormProps {
    initialData?: PayrollItem;
    onSave: (data: PayrollItem) => void;
    onCancel: () => void;
}

export const RubricForm: React.FC<RubricFormProps> = ({ initialData, onSave, onCancel }) => {
    const { addPayrollItem, updatePayrollItem } = useData();
    const [activeTab, setActiveTab] = useState('identificacao');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState<Partial<PayrollItem>>({
        status: 'ativo',
        type: 'provento',
        natureza: 'salarial',
        eventoFixo: true,
        calcMethod: 'fixo',
        // Defaults
        incidesINSS: false,
        incidesFGTS: false,
        incidesIRRF: false,
        compoeSalarioBase: false,
        ...initialData
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleInputChange = (field: keyof PayrollItem, value: any) => {
        let finalValue = value;
        // Enforce numeric only fields
        if (field === 'code' || field === 'eSocialCode' || field === 'eSocialNatureza') {
            if (typeof value === 'string') {
                finalValue = value.replace(/\D/g, '');
            }
        }

        setFormData(prev => ({ ...prev, [field]: finalValue }));
        // Clear error if exists
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.code) newErrors.code = 'Código é obrigatório';
        if (!formData.name) newErrors.name = 'Nome é obrigatório';
        if (!formData.type) newErrors.type = 'Tipo é obrigatório';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) {
            const missingField = Object.keys(errors)[0];
            alert(`Por favor, preencha os campos obrigatórios: ${missingField}`);
            return;
        }

        const rubricToSave = {
            ...formData,
            id: formData.id || crypto.randomUUID()
        } as PayrollItem;

        if (initialData?.id) {
            updatePayrollItem(rubricToSave);
        } else {
            addPayrollItem(rubricToSave);
        }
        onSave(rubricToSave);
    };

    const TabButton = ({ id, label, icon: Icon }: any) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`
                flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${activeTab === id ? 'border-[var(--text-accent)] text-[var(--text-accent)] bg-[var(--bg-secondary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}
            `}
        >
            <Icon size={16} className="mr-2" />
            {label}
        </button>
    );

    const FormRow = ({ label, error, children, required }: any) => (
        <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    );

    const SectionTitle = ({ title, icon: Icon }: any) => (
        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide mb-4 flex items-center gap-2 border-b border-[var(--border-color)] pb-2 mt-2">
            <Icon size={16} className="text-[var(--text-accent)]" /> {title}
        </h3>
    );

    return (
        <Card className="max-w-4xl mx-auto overflow-hidden bg-[var(--bg-card)] border-[var(--border-color)] shadow-xl">
            <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                    {initialData ? 'Editar Rubrica' : 'Nova Rubrica'}
                    <span className="text-xs font-normal bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800">
                        {formData.code || 'Novo'}
                    </span>
                </h2>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onCancel} icon={X}>Cancelar</Button>
                    <Button onClick={handleSubmit} icon={Save}>Salvar Rubrica</Button>
                </div>
            </div>

            <div className="flex border-b border-[var(--border-color)] overflow-x-auto bg-[var(--bg-card)]">
                <TabButton id="identificacao" label="1. Identificação" icon={Info} />
                <TabButton id="classificacao" label="2. Classificação" icon={Activity} />
                <TabButton id="incidencias" label="3. Incidências" icon={AlertTriangle} />
                <TabButton id="bases" label="4. Bases" icon={Database} />
                <TabButton id="calculo" label="5. Cálculo" icon={Calculator} />
                <TabButton id="esocial" label="6. eSocial" icon={FileText} />
                <TabButton id="contabil" label="7. Contábil" icon={DollarSign} />
                <TabButton id="controle" label="8. Controle" icon={CheckCircle} />
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar bg-[var(--bg-card)]">

                {/* 1. IDENTIFICAÇÃO */}
                {activeTab === 'identificacao' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                        <SectionTitle title="Identificação da Rubrica" icon={Info} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormRow label="Código (Único)" required error={errors.code}>
                                <input
                                    type="text"
                                    className="w-full p-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded focus:ring-2 focus:ring-green-500/20 outline-none uppercase font-mono"
                                    value={formData.code || ''}
                                    onChange={e => handleInputChange('code', e.target.value)}
                                    placeholder="Ex: 1001"
                                />
                            </FormRow>
                            <FormRow label="Nome da Rubrica" required error={errors.name}>
                                <input
                                    type="text"
                                    className="w-full p-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded focus:ring-2 focus:ring-green-500/20 outline-none"
                                    value={formData.name || ''}
                                    onChange={e => handleInputChange('name', e.target.value)}
                                    placeholder="Ex: Salário Base"
                                />
                            </FormRow>
                        </div>
                        <FormRow label="Descrição Detalhada">
                            <textarea
                                className="w-full p-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded focus:ring-2 focus:ring-green-500/20 outline-none"
                                rows={3}
                                value={formData.description || ''}
                                onChange={e => handleInputChange('description', e.target.value)}
                                placeholder="Descrição para compor o holerite ou para controle interno."
                            />
                        </FormRow>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormRow label="Tipo" required>
                                <select
                                    className="w-full p-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded focus:ring-2 focus:ring-green-500/20 outline-none"
                                    value={formData.type || 'provento'}
                                    onChange={e => handleInputChange('type', e.target.value)}
                                >
                                    <option value="provento">Provento (+)</option>
                                    <option value="desconto">Desconto (-)</option>
                                    <option value="encargo">Encargo (Informativo)</option>
                                    <option value="base">Base (Informativo)</option>
                                </select>
                            </FormRow>
                        </div>
                    </div>
                )}

                {/* 2. CLASSIFICAÇÃO */}
                {activeTab === 'classificacao' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                        <SectionTitle title="Classificação e Natureza" icon={Activity} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormRow label="Natureza">
                                <select
                                    className="w-full p-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded focus:ring-2 focus:ring-green-500/20 outline-none"
                                    value={formData.natureza || 'salarial'}
                                    onChange={e => handleInputChange('natureza', e.target.value)}
                                >
                                    <option value="salarial">Salarial</option>
                                    <option value="indenizatoria">Indenizatória</option>
                                    <option value="outros">Outros</option>
                                </select>
                            </FormRow>
                            <FormRow label="Tipo de Evento">
                                <div className="flex gap-4 p-2 text-[var(--text-primary)]">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="eventoFixo"
                                            checked={formData.eventoFixo === true}
                                            onChange={() => handleInputChange('eventoFixo', true)}
                                            className="text-green-600 focus:ring-green-500"
                                        />
                                        <span>Fixo (Recorrente)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="eventoFixo"
                                            checked={formData.eventoFixo === false}
                                            onChange={() => handleInputChange('eventoFixo', false)}
                                            className="text-green-600 focus:ring-green-500"
                                        />
                                        <span>Variável (Esporádico)</span>
                                    </label>
                                </div>
                            </FormRow>
                        </div>
                        <FormRow label="Classificação Contábil (Interna)">
                            <input
                                type="text"
                                className="w-full p-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded focus:ring-2 focus:ring-green-500/20 outline-none"
                                value={formData.classification || ''}
                                onChange={e => handleInputChange('classification', e.target.value)}
                                placeholder="Referência interna contábil"
                            />
                        </FormRow>
                    </div>
                )}

                {/* 3. INCIDÊNCIAS */}
                {activeTab === 'incidencias' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                        <SectionTitle title="Incidências Legais" icon={AlertTriangle} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-color)]">
                            {[
                                { key: 'incidesINSS', label: 'Incide INSS' },
                                { key: 'incidesFGTS', label: 'Incide FGTS' },
                                { key: 'incidesIRRF', label: 'Incide IRRF' },
                                { key: 'incidesSindicato', label: 'Incide Contribuição Sindical' },
                                { key: 'incidesOutros', label: 'Incide Outras Contribuições (Pensão, etc)' },
                            ].map(({ key, label }) => (
                                <label key={key} className="flex items-center gap-3 p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded hover:border-green-300 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                        checked={(formData as any)[key] || false}
                                        onChange={e => handleInputChange(key as any, e.target.checked)}
                                    />
                                    <span className="font-medium text-[var(--text-primary)]">{label}</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-2">
                            <Info size={12} className="inline mr-1" />
                            Atenção: A configuração incorreta destas incidências pode gerar erros fiscais e trabalhistas.
                        </p>
                    </div>
                )}

                {/* 4. BASES DE CÁLCULO */}
                {activeTab === 'bases' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                        <SectionTitle title="Composição de Bases" icon={Database} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-color)]">
                            {[
                                { key: 'compoeSalarioBase', label: 'Compõe Salário Base' },
                                { key: 'compoeMedias13', label: 'Compõe Médias de 13º Salário' },
                                { key: 'compoeMediasFerias', label: 'Compõe Médias de Férias' },
                                { key: 'compoeMediasRescisao', label: 'Compõe Médias de Rescisão' },
                                { key: 'compoeAvisoPrevio', label: 'Entra no Cálculo de Aviso Prévio' },
                            ].map(({ key, label }) => (
                                <label key={key} className="flex items-center gap-3 p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded hover:border-blue-300 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                        checked={(formData as any)[key] || false}
                                        onChange={e => handleInputChange(key as any, e.target.checked)}
                                    />
                                    <span className="font-medium text-[var(--text-primary)]">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* 5. MÉTODO DE CÁLCULO */}
                {activeTab === 'calculo' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                        <SectionTitle title="Método de Cálculo" icon={Calculator} />
                        <div className="grid grid-cols-1 gap-4">
                            <FormRow label="Tipo de Cálculo">
                                <select
                                    className="w-full p-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded focus:ring-2 focus:ring-green-500/20 outline-none"
                                    value={formData.calcMethod || 'fixo'}
                                    onChange={e => handleInputChange('calcMethod', e.target.value)}
                                >
                                    <option value="fixo">Valor Fixo</option>
                                    <option value="percentual">Percentual (%)</option>
                                    <option value="formula">Fórmula</option>
                                    <option value="quantidade">Por Quantidade (Horas/Dias/Unidades)</option>
                                </select>
                            </FormRow>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormRow label={formData.calcMethod === 'percentual' ? 'Percentual Padrão (%)' : 'Valor Padrão (R$)'}>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full p-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded focus:ring-2 focus:ring-green-500/20 outline-none"
                                    value={formData.calcValue || 0}
                                    onChange={e => handleInputChange('calcValue', Number(e.target.value))}
                                />
                            </FormRow>
                            <FormRow label="Permite Alteração Manual?">
                                <div className="flex gap-4 p-2 items-center text-[var(--text-primary)]">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                            checked={formData.allowManualOverride || false}
                                            onChange={e => handleInputChange('allowManualOverride', e.target.checked)}
                                        />
                                        <span>Sim, permitir edição no lançamento</span>
                                    </label>
                                </div>
                            </FormRow>
                        </div>
                    </div>
                )}

                {/* 6. eSOCIAL */}
                {activeTab === 'esocial' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                        <SectionTitle title="Integrações Legais e eSocial" icon={FileText} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormRow label="Código da Rubrica (eSocial)">
                                <input
                                    type="text"
                                    className="w-full p-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded focus:ring-2 focus:ring-green-500/20 outline-none"
                                    value={formData.eSocialCode || formData.code || ''}
                                    onChange={e => handleInputChange('eSocialCode', e.target.value)}
                                    placeholder="Geralmente o mesmo código interno"
                                />
                            </FormRow>
                            <FormRow label="Natureza (Tabela 03)">
                                <input
                                    type="text"
                                    className="w-full p-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded focus:ring-2 focus:ring-green-500/20 outline-none"
                                    value={formData.eSocialNatureza || ''}
                                    onChange={e => handleInputChange('eSocialNatureza', e.target.value)}
                                    placeholder="Ex: 1000 - Salário"
                                />
                            </FormRow>
                            <FormRow label="Incidência Tributária (eSocial)">
                                <div className="grid grid-cols-3 gap-2">
                                    <input
                                        type="text"
                                        className="w-full p-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded focus:ring-2 focus:ring-green-500/20 outline-none text-xs"
                                        value={formData.eSocialIncidencia?.inss || ''}
                                        onChange={e => handleInputChange('eSocialIncidencia', { ...formData.eSocialIncidencia, inss: e.target.value })}
                                        placeholder="INSS"
                                        title="Código de Incidência de INSS"
                                    />
                                    <input
                                        type="text"
                                        className="w-full p-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded focus:ring-2 focus:ring-green-500/20 outline-none text-xs"
                                        value={formData.eSocialIncidencia?.fgts || ''}
                                        onChange={e => handleInputChange('eSocialIncidencia', { ...formData.eSocialIncidencia, fgts: e.target.value })}
                                        placeholder="FGTS"
                                        title="Código de Incidência de FGTS"
                                    />
                                    <input
                                        type="text"
                                        className="w-full p-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded focus:ring-2 focus:ring-green-500/20 outline-none text-xs"
                                        value={formData.eSocialIncidencia?.irrf || ''}
                                        onChange={e => handleInputChange('eSocialIncidencia', { ...formData.eSocialIncidencia, irrf: e.target.value })}
                                        placeholder="IRRF"
                                        title="Código de Incidência de IRRF"
                                    />
                                </div>
                            </FormRow>
                        </div>
                    </div>
                )}

                {/* 7. CONTÁBIL */}
                {activeTab === 'contabil' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                        <SectionTitle title="Contabilização" icon={DollarSign} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormRow label="Conta Contábil (Débito)">
                                <input
                                    type="text"
                                    className="w-full p-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded focus:ring-2 focus:ring-green-500/20 outline-none"
                                    value={formData.contaDebito || ''}
                                    onChange={e => handleInputChange('contaDebito', e.target.value)}
                                />
                            </FormRow>
                            <FormRow label="Conta Contábil (Crédito)">
                                <input
                                    type="text"
                                    className="w-full p-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded focus:ring-2 focus:ring-green-500/20 outline-none"
                                    value={formData.contaCredito || ''}
                                    onChange={e => handleInputChange('contaCredito', e.target.value)}
                                />
                            </FormRow>
                            <FormRow label="Centro de Custo Padrão">
                                <input
                                    type="text"
                                    className="w-full p-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded focus:ring-2 focus:ring-green-500/20 outline-none"
                                    value={formData.centroCusto || ''}
                                    onChange={e => handleInputChange('centroCusto', e.target.value)}
                                />
                            </FormRow>
                            <FormRow label="Rateio Contábil">
                                <input
                                    type="text"
                                    className="w-full p-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded focus:ring-2 focus:ring-green-500/20 outline-none"
                                    value={formData.rateioContabil || ''}
                                    onChange={e => handleInputChange('rateioContabil', e.target.value)}
                                />
                            </FormRow>
                        </div>
                    </div>
                )}

                {/* 8. CONTROLE */}
                {activeTab === 'controle' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                        <SectionTitle title="Controle e Auditoria" icon={CheckCircle} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormRow label="Status" required>
                                <select
                                    className="w-full p-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded focus:ring-2 focus:ring-green-500/20 outline-none"
                                    value={formData.status || 'ativo'}
                                    onChange={e => handleInputChange('status', e.target.value)}
                                >
                                    <option value="ativo">Ativo</option>
                                    <option value="inativo">Inativo</option>
                                </select>
                            </FormRow>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormRow label="Início Vigência">
                                <input
                                    type="date"
                                    className="w-full p-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded focus:ring-2 focus:ring-green-500/20 outline-none"
                                    value={formData.validFrom || ''}
                                    onChange={e => handleInputChange('validFrom', e.target.value)}
                                />
                            </FormRow>
                            <FormRow label="Fim Vigência">
                                <input
                                    type="date"
                                    className="w-full p-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded focus:ring-2 focus:ring-green-500/20 outline-none"
                                    value={formData.validTo || ''}
                                    onChange={e => handleInputChange('validTo', e.target.value)}
                                />
                            </FormRow>
                        </div>
                        <FormRow label="Observações Internas">
                            <textarea
                                className="w-full p-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded focus:ring-2 focus:ring-green-500/20 outline-none"
                                rows={3}
                                value={formData.observacoes || ''}
                                onChange={e => handleInputChange('observacoes', e.target.value)}
                            />
                        </FormRow>

                        {/* AUDITORIA INFO (READ ONLY) */}
                        {initialData && (
                            <div className="mt-8 pt-4 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)] grid grid-cols-2 gap-2">
                                <div>
                                    <p>Criado por: <span className="font-semibold text-[var(--text-primary)]">{initialData.createdBy || 'Sistema'}</span></p>
                                    <p>Criado em: <span className="font-semibold text-[var(--text-primary)]">{initialData.createdAt ? new Date(initialData.createdAt).toLocaleString() : '-'}</span></p>
                                </div>
                                <div>
                                    <p>Alterado por: <span className="font-semibold text-[var(--text-primary)]">{initialData.updatedBy || '-'}</span></p>
                                    <p>Alterado em: <span className="font-semibold text-[var(--text-primary)]">{initialData.updatedAt ? new Date(initialData.updatedAt).toLocaleString() : '-'}</span></p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </Card>
    );
};
