import React, { useRef } from 'react';
import { CRMField, CRMSelect, TabButton } from './CRMSharedComponents';
import { UserCheck, FileText, MapPin, Phone, DollarSign, Briefcase, Paperclip, Loader2, Upload, X, User, BookOpen } from 'lucide-react';
import { EmployeeSchema } from '../../utils/crmSchemas';

export const EmployeeForm = ({ formData, handleInputChange, formTab, setFormTab, handleFetchCEP }: any) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione apenas arquivos de imagem.');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB.');
            return;
        }

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            // Persist photo in formData
            handleInputChange({
                target: {
                    name: 'photo3x4',
                    value: base64String,
                    type: 'text'
                }
            });
        };
        reader.readAsDataURL(file);
    };

    const handleRemovePhoto = () => {
        handleInputChange({
            target: {
                name: 'photo3x4',
                value: '',
                type: 'text'
            }
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="min-h-[400px]">
            <div className="flex bg-[var(--bg-input)] p-2 rounded-[1.25rem] border border-[var(--border-color)] mb-8 space-x-1 overflow-x-auto custom-scrollbar shadow-sm">
                <TabButton id="pessoais" label="Pessoais" current={formTab} set={setFormTab} icon={UserCheck} />
                <TabButton id="docs" label="Documentos" current={formTab} set={setFormTab} icon={FileText} />
                <TabButton id="endereco" label="Endereço" current={formTab} set={setFormTab} icon={MapPin} />
                <TabButton id="contatos" label="Contatos" current={formTab} set={setFormTab} icon={Phone} />
                <TabButton id="bancarios" label="Bancário" current={formTab} set={setFormTab} icon={DollarSign} />
                <TabButton id="funcionais" label="Funcionais" current={formTab} set={setFormTab} icon={Briefcase} />
                <TabButton id="evolucao" label="Evol. Salarial" current={formTab} set={setFormTab} icon={DollarSign} />
                <TabButton id="anexos" label="Dossiê Digital" current={formTab} set={setFormTab} icon={Paperclip} />
                <TabButton id="contabil" label="Contábil" current={formTab} set={setFormTab} icon={BookOpen} />
            </div>

            {formTab === 'pessoais' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
                    {/* Photo Upload Section */}
                    <div className="md:col-span-1 flex flex-col items-center">
                        <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-3 text-center">
                            Foto 3x4
                        </label>

                        <div className="relative w-40 h-52 rounded-xl border-2 border-dashed border-[var(--border-color)] overflow-hidden bg-[var(--bg-secondary)] hover:border-green-500 transition-all group shadow-sm">
                            {formData.photo3x4 ? (
                                <>
                                    <img
                                        src={formData.photo3x4}
                                        alt="Foto 3x4"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all active:scale-95 shadow-lg"
                                            title="Alterar foto"
                                        >
                                            <Upload size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleRemovePhoto}
                                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all active:scale-95 shadow-lg"
                                            title="Remover foto"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-full flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)] hover:text-green-600 transition-colors bg-[var(--bg-input)]"
                                >
                                    <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center ring-1 ring-[#e2e8f0] dark:ring-slate-700 group-hover:ring-green-200 dark:group-hover:ring-green-900 transition-all">
                                        <User size={24} className="text-[var(--text-secondary)] group-hover:text-green-600 transition-colors" />
                                    </div>
                                    <div className="text-center px-2">
                                        <p className="text-xs font-bold mb-1">Adicionar Foto</p>
                                    </div>
                                </button>
                            )}
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                        />
                    </div>

                    {/* Personal Data Fields - Reorganized for 2 columns taking remaining space */}
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 grid grid-cols-4 gap-4">
                            <div className="col-span-1">
                                <CRMField label="Código" name="orderNumber" placeholder="Ex: 100" value={formData.orderNumber || ''} onChange={handleInputChange} className="bg-[var(--bg-card)] font-mono text-center" />
                            </div>
                            <div className="col-span-3">
                                <CRMField label="Nome Completo" name="name" required value={formData.name} onChange={handleInputChange} />
                            </div>
                        </div>
                        <CRMField label="Data Nascimento" name="birthDate" type="date" value={formData.birthDate} onChange={handleInputChange} />
                        <CRMSelect label="Sexo" name="gender" value={formData.gender} onChange={handleInputChange}><option value="">Selecione...</option><option value="M">Masculino</option><option value="F">Feminino</option></CRMSelect>
                        <CRMField label="Nacionalidade" name="nationality" value={formData.nationality} onChange={handleInputChange} />
                        <CRMSelect label="Estado Civil" name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange}>
                            <option value="">Selecione...</option>
                            <option value="solteiro(a)">Solteiro(a)</option>
                            <option value="casado(a)">Casado(a)</option>
                            <option value="divorciado(a)">Divorciado(a)</option>
                            <option value="viuvo(a)">Viúvo(a)</option>
                        </CRMSelect>
                        <CRMField label="Naturalidade" name="birthPlace" value={formData.birthPlace} onChange={handleInputChange} />
                        <CRMField label="Nome da Mãe" name="motherName" value={formData.motherName} onChange={handleInputChange} />
                        <CRMField label="Nome do Pai" name="fatherName" value={formData.fatherName} onChange={handleInputChange} />
                    </div>
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
                    <CRMField label="Matrícula" name="registration" placeholder="Ex: 12345" value={formData.registration} onChange={handleInputChange} />
                    <CRMField label="Cargo" name="role" required value={formData.role} onChange={handleInputChange} />
                    <CRMField label="CBO" name="cbo" placeholder="Ex: 4110-05" value={formData.cbo} onChange={handleInputChange} />
                    <CRMField label="Jornada de Trab. (Ex: 44h)" name="weeklyHours" value={formData.weeklyHours} onChange={handleInputChange} />
                    <CRMSelect label="Categoria SEFIP" name="categorySEFIP" value={formData.categorySEFIP} onChange={handleInputChange}>
                        <option value="">Selecione...</option>
                        <optgroup label="Empregados (com FGTS)">
                            <option value="01">01 - Empregado CLT</option>
                            <option value="03">03 - Trabalhador não concursado (estatutário com FGTS)</option>
                            <option value="04">04 - Contrato Temporário (Lei 6.019/74)</option>
                            <option value="07">07 - Menor Aprendiz</option>
                        </optgroup>
                        <optgroup label="Contribuintes Individuais">
                            <option value="11">11 - Diretor não empregado (com FGTS)</option>
                            <option value="13">13 - Trabalhador autônomo / Sócio (sem FGTS)</option>
                            <option value="15">15 - Transportador autônomo</option>
                        </optgroup>
                        <optgroup label="Outros / Avulsos">
                            <option value="02">02 - Trabalhador Avulso</option>
                            <option value="05">05 - Diretor não empregado c/ FGTS (Lei 8.036/90)</option>
                            <option value="06">06 - Empregado Doméstico (até 09/2015)</option>
                            <option value="20">20 - Agente Político</option>
                        </optgroup>
                    </CRMSelect>
                    <CRMField label="Departamento" name="department" value={formData.department} onChange={handleInputChange} />
                    <CRMField label="Salário Base" name="salary" type="number" step="0.01" required value={formData.salary} onChange={handleInputChange} />
                    <CRMField label="Data Admissão" name="admissionDate" type="date" required value={formData.admissionDate} onChange={handleInputChange} />
                    <CRMSelect label="Tipo Contrato" name="contractType" value={formData.contractType} onChange={handleInputChange}><option value="CLT">CLT</option><option value="PJ">PJ</option><option value="Estagio">Estágio</option></CRMSelect>
                    <CRMSelect label="Tempo de Contrato" name="contractDurationType" value={formData.contractDurationType} onChange={handleInputChange}><option value="indeterminado">Prazo Indeterminado</option><option value="determinado">Prazo Determinado</option></CRMSelect>
                    <CRMField label="Supervisor" name="supervisor" value={formData.supervisor} onChange={handleInputChange} />
                    <div className="md:col-span-2 flex gap-4 mt-2">
                        <label className="flex items-center"><input type="checkbox" name="transportVoucher" checked={formData.transportVoucher} onChange={handleInputChange} className="mr-2" /> Vale Transporte</label>
                        <label className="flex items-center"><input type="checkbox" name="mealVoucher" checked={formData.mealVoucher} onChange={handleInputChange} className="mr-2" /> Vale Refeição</label>
                        <label className="flex items-center"><input type="checkbox" name="healthPlan" checked={formData.healthPlan} onChange={handleInputChange} className="mr-2" /> Plano de Saúde</label>
                    </div>
                </div>
            )}
            {formTab === 'anexos' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <p className="text-sm font-semibold text-[var(--text-secondary)]">Armazenamento Seguro de Documentos (LGPD)</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {['RG/CPF/CNH', 'Comprovante Endereço', 'ASO (Atestado)', 'Contrato de Trabalho', 'Outros'].map((docType) => {
                            const hasDoc = formData.documents && formData.documents.some((d: any) => d.name === docType);
                            return (
                                <div key={docType} className={`border ${hasDoc ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-dashed border-[var(--border-color)] hover:bg-[var(--bg-secondary)]'} rounded-lg p-3 flex justify-between items-center cursor-pointer transition-all`}>
                                    <span className={`text-sm ${hasDoc ? 'text-emerald-700 font-bold' : 'text-[var(--text-secondary)]'}`}>{docType}</span>
                                    {hasDoc ? (
                                        <span className="text-xs bg-emerald-500 text-white px-2 py-1 rounded">Anexado ✓</span>
                                    ) : (
                                        <label className="text-xs bg-[var(--bg-secondary)] text-[var(--text-secondary)] px-2 py-1 rounded cursor-pointer hover:bg-slate-200">
                                            Upload
                                            <input type="file" className="hidden" onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = () => {
                                                        const docs = formData.documents || [];
                                                        docs.push({ id: Math.random().toString(), name: docType, url: reader.result, uploadDate: new Date().toISOString() });
                                                        handleInputChange({ target: { name: 'documents', value: docs, type: 'object' } });
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }} />
                                        </label>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {formTab === 'evolucao' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400">SALÁRIO ATUAL</p>
                            <p className="text-xl font-black text-emerald-900 dark:text-emerald-300">
                                {(formData.salary || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                            <CRMField
                                label="Novo Salário Base"
                                name="newSalaryValue"
                                type="number"
                                step="0.01"
                                placeholder="..."
                                value={formData.newSalaryValue || ''}
                                onChange={handleInputChange}
                                wrapperClassName="w-32"
                            />
                            <CRMField
                                label="A partir de"
                                name="newSalaryDate"
                                type="date"
                                value={formData.newSalaryDate || ''}
                                onChange={handleInputChange}
                            />
                            <p className="text-[10px] text-emerald-600">Preencha para registrar promoção/dissídio.</p>
                        </div>
                    </div>

                    <div className="mt-4">
                        <h4 className="text-sm font-bold text-slate-700 mb-2">Histórico Salarial do Colaborador</h4>
                        {formData.salaryHistory && formData.salaryHistory.length > 0 ? (
                            <div className="border border-[var(--border-color)] rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                                        <tr>
                                            <th className="p-2 font-bold text-xs uppercase">Valor</th>
                                            <th className="p-2 font-bold text-xs uppercase">Data Início</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-color)]">
                                        {[...formData.salaryHistory].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map((hist: any) => (
                                            <tr key={hist.id} className="hover:bg-[var(--bg-secondary)]">
                                                <td className="p-2 font-semibold text-emerald-600">
                                                    {(hist.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </td>
                                                <td className="p-2">
                                                    {new Date(hist.startDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-6 text-center border-2 border-dashed border-[var(--border-color)] rounded-xl text-[var(--text-secondary)]">
                                Nenhum histórico salarial registrado.
                            </div>
                        )}
                    </div>
                </div>
            )}
            {formTab === 'contabil' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <div className="md:col-span-1">
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Conta Contábil Funcionário / Despesa *</label>
                        <div className="space-y-2">
                            <input
                                name="accountingAccount"
                                value={formData.accountingAccount || ''}
                                readOnly
                                placeholder="Gerada automaticamente pelo sistema"
                                className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] cursor-not-allowed opacity-80"
                            />
                            <button
                                type="button"
                                className="w-full text-xs font-bold border-dashed border-2 p-2 rounded hover:border-green-500 hover:text-green-600 transition-colors text-gray-500"
                                onClick={() => {
                                    const suffix = Math.floor(1000 + Math.random() * 9000);
                                    handleInputChange({
                                        target: {
                                            name: 'accountingAccount',
                                            value: `2.1.02.${suffix}`
                                        }
                                    });
                                }}
                            >
                                Gerar Conta Contábil
                            </button>
                        </div>
                    </div>
                    <CRMField label="Centro de Custo" name="costCenter" placeholder="Ex: Operacional, Administrativo" value={formData.costCenter} onChange={handleInputChange} />
                </div>
            )}
        </div>
    );
};
