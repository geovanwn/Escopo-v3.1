
import React from 'react';
import { UserCheck, FileText, MapPin, Phone, DollarSign, Briefcase, Paperclip, Loader2 } from 'lucide-react';
import { EmployeeSchema } from '../../utils/crmSchemas';

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

export const EmployeeForm = ({ formData, handleInputChange, formTab, setFormTab, handleFetchCEP }: any) => {
    return (
        <div className="min-h-[400px]">
            <div className="flex border-b border-[var(--border-color)] mb-6 space-x-1 overflow-x-auto">
                <TabButton id="pessoais" label="1. Pessoais" current={formTab} set={setFormTab} icon={UserCheck} />
                <TabButton id="docs" label="2. Documentos" current={formTab} set={setFormTab} icon={FileText} />
                <TabButton id="endereco" label="3. Endereço" current={formTab} set={setFormTab} icon={MapPin} />
                <TabButton id="contatos" label="4. Contatos" current={formTab} set={setFormTab} icon={Phone} />
                <TabButton id="bancarios" label="5. Bancário" current={formTab} set={setFormTab} icon={DollarSign} />
                <TabButton id="funcionais" label="6. Funcionais" current={formTab} set={setFormTab} icon={Briefcase} />
                <TabButton id="anexos" label="7. Anexos" current={formTab} set={setFormTab} icon={Paperclip} />
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
                    <CRMField label="Data Nascimento" name="birthDate" type="date" value={formData.birthDate} onChange={handleInputChange} />
                    <CRMSelect label="Sexo" name="gender" value={formData.gender} onChange={handleInputChange}><option value="">Selecione...</option><option value="M">Masculino</option><option value="F">Feminino</option></CRMSelect>
                    <CRMField label="Nacionalidade" name="nationality" value={formData.nationality} onChange={handleInputChange} />
                    <CRMField label="Naturalidade" name="birthPlace" value={formData.birthPlace} onChange={handleInputChange} />
                    <CRMField label="Nome da Mãe" name="motherName" value={formData.motherName} onChange={handleInputChange} />
                    <CRMField label="Nome do Pai" name="fatherName" value={formData.fatherName} onChange={handleInputChange} />
                </div>
            )}
            {formTab === 'docs' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <CRMField label="CPF" name="cpf" required maxLength={14} value={formData.cpf} onChange={handleInputChange} />
                    <CRMField label="RG" name="rg" required value={formData.rg} onChange={handleInputChange} />
                    <CRMField label="Órgão Emissor" name="rgIssuer" value={formData.rgIssuer} onChange={handleInputChange} />
                    <CRMField label="PIS/NIS" name="pis" value={formData.pis} onChange={handleInputChange} />
                    <CRMField label="CNH" name="cnh" value={formData.cnh} onChange={handleInputChange} />
                    <CRMField label="Título Eleitor" name="voterTitle" value={formData.voterTitle} onChange={handleInputChange} />
                    <CRMField label="CTPS (Número)" name="ctpsNum" value={formData.ctpsNum} onChange={handleInputChange} />
                    <CRMField label="CTPS (Série/UF)" name="ctpsSeries" value={formData.ctpsSeries} onChange={handleInputChange} />
                </div>
            )}
            {formTab === 'endereco' && (
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 animate-in fade-in duration-300">
                    <div className="md:col-span-2"><CRMField label="CEP" name="zip" required maxLength={9} onBlur={() => handleFetchCEP('main')} value={formData.zip} onChange={handleInputChange} /></div>
                    <div className="md:col-span-4"><CRMField label="Logradouro" name="address" required value={formData.address} onChange={handleInputChange} /></div>
                    <div className="md:col-span-2"><CRMField label="Número" name="addressNumber" required value={formData.addressNumber} onChange={handleInputChange} /></div>
                    <div className="md:col-span-2"><CRMField label="Bairro" name="addressDistrict" value={formData.addressDistrict} onChange={handleInputChange} /></div>
                    <div className="md:col-span-2"><CRMField label="Cidade" name="city" required value={formData.city} onChange={handleInputChange} /></div>
                </div>
            )}
            {formTab === 'contatos' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <CRMField label="Celular" name="mobilePhone" maxLength={15} value={formData.mobilePhone} onChange={handleInputChange} />
                    <CRMField label="Email Pessoal" name="email" type="email" value={formData.email} onChange={handleInputChange} />
                    <div className="md:col-span-2"><CRMField label="Contato de Emergência (Nome/Tel)" name="emergencyContact" value={formData.emergencyContact} onChange={handleInputChange} /></div>
                </div>
            )}
            {formTab === 'bancarios' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <CRMField label="Banco" name="bank" value={formData.bank} onChange={handleInputChange} />
                    <CRMField label="Agência" name="agency" value={formData.agency} onChange={handleInputChange} data-numeric-only="true" />
                    <CRMField label="Conta" name="account" value={formData.account} onChange={handleInputChange} data-numeric-only="true" />
                    <CRMField label="Chave PIX" name="pix" value={formData.pix} onChange={handleInputChange} />
                </div>
            )}
            {formTab === 'funcionais' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <CRMField label="Cargo" name="role" required value={formData.role} onChange={handleInputChange} />
                    <CRMField label="Departamento" name="department" value={formData.department} onChange={handleInputChange} />
                    <CRMField label="Salário Base" name="salary" type="number" step="0.01" required value={formData.salary} onChange={handleInputChange} />
                    <CRMField label="Data Admissão" name="admissionDate" type="date" required value={formData.admissionDate} onChange={handleInputChange} />
                    <CRMSelect label="Tipo Contrato" name="contractType" value={formData.contractType} onChange={handleInputChange}><option value="CLT">CLT</option><option value="PJ">PJ</option><option value="Estagio">Estágio</option></CRMSelect>
                    <CRMField label="Supervisor" name="supervisor" value={formData.supervisor} onChange={handleInputChange} />
                    <div className="md:col-span-2 flex gap-4 mt-2">
                        <label className="flex items-center"><input type="checkbox" name="transportVoucher" checked={formData.transportVoucher} onChange={handleInputChange} className="mr-2" /> Vale Transporte</label>
                        <label className="flex items-center"><input type="checkbox" name="mealVoucher" checked={formData.mealVoucher} onChange={handleInputChange} className="mr-2" /> Vale Refeição</label>
                        <label className="flex items-center"><input type="checkbox" name="healthPlan" checked={formData.healthPlan} onChange={handleInputChange} className="mr-2" /> Plano de Saúde</label>
                    </div>
                </div>
            )}
            {formTab === 'anexos' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-300">
                    {['RG/CPF/CNH', 'Comprovante Endereço', 'Foto 3x4', 'Exame Admissional'].map(doc => (
                        <div key={doc} className="border border-dashed border-[var(--border-color)] rounded-lg p-3 flex justify-between items-center hover:bg-[var(--bg-secondary)] cursor-pointer">
                            <span className="text-sm text-[var(--text-secondary)]">{doc}</span>
                            <span className="text-xs bg-[var(--bg-secondary)] text-[var(--text-secondary)] px-2 py-1 rounded">Upload</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
