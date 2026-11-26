
import React from 'react';
import { UserCheck, FileText, MapPin, Phone, Briefcase, ShieldCheck, Loader2 } from 'lucide-react';

const CRMField = ({ label, name, value, onChange, required = false, type = "text", onBlur, isLoading, ...props }: any) => (
    <div className={`mb-4 ${props.className || ''}`}>
        <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>
        <div className="relative">
            <input
                type={type}
                name={name}
                required={required}
                className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm focus:border-green-500 focus:ring-4 focus:ring-green-500/10 focus:outline-none placeholder-[var(--text-secondary)]/30 transition-all disabled:bg-[var(--bg-secondary)]"
                value={value || ''}
                onChange={onChange}
                onBlur={onBlur}
                {...props}
            />
            {isLoading ? (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                </div>
            ) : null}
        </div>
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

export const PartnerForm = ({ formData, handleInputChange, formTab, setFormTab, handleFetchCEP }: any) => {
    return (
        <div className="min-h-[400px]">
            <div className="flex border-b border-[var(--border-color)] mb-6 space-x-1 overflow-x-auto">
                <TabButton id="pessoais" label="1. Pessoais" current={formTab} set={setFormTab} icon={UserCheck} />
                <TabButton id="docs" label="2. Documentos" current={formTab} set={setFormTab} icon={FileText} />
                <TabButton id="endereco" label="3. Endereço" current={formTab} set={setFormTab} icon={MapPin} />
                <TabButton id="contatos" label="4. Contatos" current={formTab} set={setFormTab} icon={Phone} />
                <TabButton id="societario" label="5. Sociedade" current={formTab} set={setFormTab} icon={Briefcase} />
                <TabButton id="compliance" label="6. Compliance" current={formTab} set={setFormTab} icon={ShieldCheck} />
            </div>

            {formTab === 'pessoais' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <div className="md:col-span-2 grid grid-cols-4 gap-4">
                        <div className="col-span-1">
                            <CRMField label="Código" name="orderNumber" value={formData.orderNumber || 'Automático'} readOnly disabled className="bg-[var(--bg-secondary)] font-mono text-center" />
                        </div>
                        <div className="col-span-3">
                            <CRMField label="Nome Completo" name="name" required value={formData.name} onChange={handleInputChange} />
                        </div>
                    </div>
                    <CRMField label="Data de Nascimento" name="birthDate" type="date" required value={formData.birthDate} onChange={handleInputChange} />
                    <CRMField label="Nacionalidade" name="nationality" required placeholder="Brasileiro(a)" value={formData.nationality} onChange={handleInputChange} />
                    <CRMSelect label="Estado Civil" name="maritalStatus" required value={formData.maritalStatus} onChange={handleInputChange}>
                        <option value="">Selecione...</option>
                        <option value="solteiro">Solteiro(a)</option>
                        <option value="casado">Casado(a)</option>
                        <option value="divorciado">Divorciado(a)</option>
                    </CRMSelect>
                    <CRMField label="Profissão" name="profession" value={formData.profession} onChange={handleInputChange} />
                    <CRMSelect label="Grau de Instrução" name="educationLevel" value={formData.educationLevel} onChange={handleInputChange}>
                        <option value="">Selecione...</option>
                        <option value="superior">Superior</option>
                        <option value="medio">Médio</option>
                    </CRMSelect>
                </div>
            )}
            {formTab === 'docs' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <CRMField label="CPF" name="cpf" required maxLength={14} value={formData.cpf} onChange={handleInputChange} />
                    <CRMField label="RG / RNE / CNH" name="rg" required value={formData.rg} onChange={handleInputChange} />
                    <CRMField label="Órgão Emissor" name="rgIssuer" value={formData.rgIssuer} onChange={handleInputChange} />
                    <CRMField label="Data de Emissão" name="rgIssueDate" type="date" value={formData.rgIssueDate} onChange={handleInputChange} />
                    <CRMField label="NIT / PIS" name="pis" required value={formData.pis} onChange={handleInputChange} />
                </div>
            )}
            {formTab === 'endereco' && (
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 animate-in fade-in duration-300">
                    <div className="md:col-span-2"><CRMField label="CEP" name="zip" required maxLength={9} onBlur={() => handleFetchCEP('main')} value={formData.zip} onChange={handleInputChange} /></div>
                    <div className="md:col-span-4"><CRMField label="Logradouro" name="address" required value={formData.address} onChange={handleInputChange} /></div>
                    <div className="md:col-span-2"><CRMField label="Número" name="addressNumber" required value={formData.addressNumber} onChange={handleInputChange} /></div>
                    <div className="md:col-span-2"><CRMField label="Qd" name="addressQuadra" value={formData.addressQuadra} onChange={handleInputChange} /></div>
                    <div className="md:col-span-2"><CRMField label="Lote" name="addressLote" value={formData.addressLote} onChange={handleInputChange} /></div>
                    <div className="md:col-span-2"><CRMField label="Complemento" name="addressComp" value={formData.addressComp} onChange={handleInputChange} /></div>
                    <div className="md:col-span-4"><CRMField label="Cidade" name="city" required value={formData.city} onChange={handleInputChange} /></div>
                </div>
            )}
            {formTab === 'contatos' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <CRMField label="Celular" name="mobilePhone" required maxLength={15} value={formData.mobilePhone} onChange={handleInputChange} />
                    <CRMField label="E-mail Pessoal" name="email" required type="email" value={formData.email} onChange={handleInputChange} />
                </div>
            )}
            {formTab === 'societario' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <CRMField label="Participação (%)" name="participation" type="number" step="0.01" required value={formData.participation} onChange={handleInputChange} />
                    <CRMField label="Cargo" name="role" required value={formData.role} onChange={handleInputChange} />
                    <CRMField label="Data Ingresso" name="entryDate" type="date" required value={formData.entryDate} onChange={handleInputChange} />
                    <CRMField label="Data de Admissão" name="admissionDate" type="date" required value={formData.admissionDate} onChange={handleInputChange} />
                    <CRMField label="Capital Integralizado" name="capitalIntegralized" type="number" value={formData.capitalIntegralized} onChange={handleInputChange} />
                    <CRMField label="Valor do Salário (Pró-Labore)" name="proLaboreValue" type="number" step="0.01" required value={formData.proLaboreValue} onChange={handleInputChange} />
                </div>
            )}
            {formTab === 'compliance' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="grid grid-cols-2 gap-4">
                        <CRMSelect label="PEP?" name="isPEP" value={formData.isPEP} onChange={handleInputChange}><option value="false">Não</option><option value="true">Sim</option></CRMSelect>
                    </div>
                    <div className="pt-4 border-t">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                            <input type="checkbox" name="lgpdConsent" checked={formData.lgpdConsent} onChange={handleInputChange} className="mr-2 w-4 h-4 text-orange-600 rounded focus:ring-orange-500" />
                            Consentimento LGPD <span className="text-red-500 ml-1">*</span>
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
};
