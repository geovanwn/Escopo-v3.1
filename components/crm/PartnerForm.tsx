import { CRMField, CRMSelect, TabButton } from './CRMSharedComponents';
import { UserCheck, FileText, MapPin, Phone, Briefcase, ShieldCheck, Upload, X, Plus, History, ArrowLeftRight, User, BookOpen } from 'lucide-react';
import { formatCurrency, formatDateBR, maskCPF, maskPhone, maskCEP } from '../../utils/formatters';

export const PartnerForm = ({
    formData,
    handleInputChange,
    activePartnerTab,
    setActivePartnerTab,
    showSalaryAdjustment,
    setShowSalaryAdjustment,
    handleFetchCEP,
    partnerFileInputRef,
    handlePartnerPhotoUpload,
    handleRemovePartnerPhoto,
    setFormData
}: any) => {
    return (
        <div className="min-h-[400px]">
            <div className="flex border-b border-[var(--border-color)] mb-6 space-x-1 overflow-x-auto">
                <TabButton id="pessoais" label="1. Pessoais" current={activePartnerTab} set={setActivePartnerTab} icon={UserCheck} />
                <TabButton id="docs" label="2. Documentos" current={activePartnerTab} set={setActivePartnerTab} icon={FileText} />
                <TabButton id="endereco" label="3. Endereço" current={activePartnerTab} set={setActivePartnerTab} icon={MapPin} />
                <TabButton id="contatos" label="4. Contatos" current={activePartnerTab} set={setActivePartnerTab} icon={Phone} />
                <TabButton id="societario" label="5. Sociedade" current={activePartnerTab} set={setActivePartnerTab} icon={Briefcase} />
                <TabButton id="compliance" label="6. Compliance" current={activePartnerTab} set={setActivePartnerTab} icon={ShieldCheck} />
                <TabButton id="contabil" label="7. Contábil" current={activePartnerTab} set={setActivePartnerTab} icon={BookOpen} />
            </div>

            {activePartnerTab === 'pessoais' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
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
                                            onClick={() => partnerFileInputRef.current?.click()}
                                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all active:scale-95 shadow-lg"
                                            title="Alterar foto"
                                        >
                                            <Upload size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleRemovePartnerPhoto}
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
                                    onClick={() => partnerFileInputRef.current?.click()}
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
                            ref={partnerFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePartnerPhotoUpload}
                            className="hidden"
                        />
                    </div>

                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 grid grid-cols-4 gap-4">
                            <div className="col-span-1">
                                <CRMField label="Código" name="orderNumber" placeholder="Ex: 100" value={formData.orderNumber || ''} onChange={handleInputChange} className="bg-[var(--bg-card)] font-mono text-center" />
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
                        <CRMField label="Naturalidade" name="birthPlace" value={formData.birthPlace} onChange={handleInputChange} />
                        <CRMField label="Nome da Mãe" name="motherName" value={formData.motherName} onChange={handleInputChange} />
                        <CRMField label="Nome do Pai" name="fatherName" value={formData.fatherName} onChange={handleInputChange} />
                    </div>
                </div>
            )}
            {activePartnerTab === 'docs' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <CRMField label="CPF" name="cpf" required maxLength={14} value={formData.cpf} onChange={handleInputChange} />
                    <CRMField label="RG / RNE" name="rg" required value={formData.rg} onChange={handleInputChange} />
                    <CRMField label="Órgão Emissor" name="rgIssuer" value={formData.rgIssuer} onChange={handleInputChange} />
                    <CRMField label="Data de Emissão" name="rgIssueDate" type="date" value={formData.rgIssueDate} onChange={handleInputChange} />
                    <CRMField label="NIT / PIS" name="pis" required value={formData.pis} onChange={handleInputChange} />
                    <CRMField label="CNH" name="cnh" value={formData.cnh} onChange={handleInputChange} />
                    <CRMField label="Título Eleitor" name="voterTitle" value={formData.voterTitle} onChange={handleInputChange} />
                    <CRMField label="Certificado de Reservista" name="reservistCertificate" value={formData.reservistCertificate} onChange={handleInputChange} />
                    <CRMField label="CTPS (Número)" name="ctpsNum" value={formData.ctpsNum} onChange={handleInputChange} />
                    <CRMField label="CTPS (Série/UF)" name="ctpsSeries" value={formData.ctpsSeries} onChange={handleInputChange} />
                </div>
            )}
            {activePartnerTab === 'endereco' && (
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
            {activePartnerTab === 'contatos' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <CRMField label="Celular" name="mobilePhone" required maxLength={15} value={formData.mobilePhone} onChange={handleInputChange} />
                    <CRMField label="E-mail Pessoal" name="email" required type="email" value={formData.email} onChange={handleInputChange} />
                </div>
            )}
            {activePartnerTab === 'societario' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <CRMField label="Participação (%)" name="participation" type="number" step="0.01" required value={formData.participation} onChange={handleInputChange} />
                    <CRMField label="Matrícula" name="registration" placeholder="Ex: 12345" value={formData.registration} onChange={handleInputChange} />
                    <CRMField label="Cargo" name="role" required value={formData.role} onChange={handleInputChange} />
                    <CRMField label="CBO" name="cbo" placeholder="Ex: 4110-05" value={formData.cbo} onChange={handleInputChange} />
                    <CRMField label="Data Ingresso" name="entryDate" type="date" required value={formData.entryDate} onChange={handleInputChange} />
                    <CRMField label="Data de Admissão" name="admissionDate" type="date" required value={formData.admissionDate} onChange={handleInputChange} />
                    <CRMSelect label="Tipo de Contrato" name="contractType" value={formData.contractType} onChange={handleInputChange}>
                        <option value="pro_labore">Pró-Labore</option>
                        <option value="clt">CLT</option>
                        <option value="estatutario">Estatutário</option>
                    </CRMSelect>
                    <CRMSelect label="Tempo de Contrato" name="contractDurationType" value={formData.contractDurationType} onChange={handleInputChange}><option value="indeterminado">Prazo Indeterminado</option><option value="determinado">Prazo Determinado</option></CRMSelect>
                    <CRMField label="Jornada de Trab. (Ex: 44h)" name="weeklyHours" value={formData.weeklyHours} onChange={handleInputChange} />
                    <CRMSelect label="Categoria SEFIP" name="categorySEFIP" value={formData.categorySEFIP} onChange={handleInputChange}>
                        <option value="">Selecione...</option>
                        <optgroup label="Contribuintes Individuais (Sócios)">
                            <option value="11">11 - Diretor não empregado (com FGTS)</option>
                            <option value="13">13 - Trabalhador autônomo / Sócio (sem FGTS)</option>
                            <option value="15">15 - Transportador autônomo</option>
                        </optgroup>
                        <optgroup label="Outros / Avulsos">
                            <option value="05">05 - Diretor não empregado c/ FGTS (Lei 8.036/90)</option>
                        </optgroup>
                    </CRMSelect>
                    <CRMField label="Capital Integralizado" name="capitalIntegralized" type="number" value={formData.capitalIntegralized} onChange={handleInputChange} />
                    <div className="md:col-span-2 flex gap-4 mt-2">
                        <label className="flex items-center"><input type="checkbox" name="transportVoucher" checked={formData.transportVoucher} onChange={handleInputChange} className="mr-2" /> Vale Transporte</label>
                        <label className="flex items-center"><input type="checkbox" name="mealVoucher" checked={formData.mealVoucher} onChange={handleInputChange} className="mr-2" /> Vale Refeição</label>
                        <label className="flex items-center"><input type="checkbox" name="healthPlan" checked={formData.healthPlan} onChange={handleInputChange} className="mr-2" /> Plano de Saúde</label>
                    </div>
                    <div className="md:col-span-2">
                        <div className="flex justify-between items-end mb-1.5">
                            <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider">Valor do Salário (Pró-Labore)</label>
                            {!showSalaryAdjustment && formData.id && (
                                <button
                                    type="button"
                                    onClick={() => setShowSalaryAdjustment(true)}
                                    className="text-[10px] font-black text-green-600 hover:text-green-700 flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800 transition-all active:scale-95"
                                >
                                    <Plus size={12} /> Ajustar Salário
                                </button>
                            )}
                        </div>

                        {!showSalaryAdjustment ? (
                            <div className="space-y-3">
                                <div className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl border border-[var(--border-color)] px-4 py-3 text-sm font-bold flex justify-between items-center group relative">
                                    <span>{formatCurrency(formData.proLaboreValue || 0)}</span>
                                    {formData.id && (
                                        <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">Valor Atual</span>
                                    )}
                                    {!formData.id && (
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="proLaboreValue"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            value={formData.proLaboreValue}
                                            onChange={handleInputChange}
                                        />
                                    )}
                                </div>

                                {/* Pending Adjustment Alert */}
                                {formData.newProLaboreValue && (
                                    <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl animate-in zoom-in-95 duration-300">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center">
                                                <ArrowLeftRight size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 leading-none mb-1">Ajuste Pendente</p>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                    Alterar para {formatCurrency(formData.newProLaboreValue)} em {formatDateBR(formData.newProLaboreDate)}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData((prev: any) => ({ ...prev, newProLaboreValue: undefined, newProLaboreDate: undefined }))}
                                            className="p-1.5 text-indigo-400 hover:text-red-500 transition-colors"
                                            title="Descartar alteração"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-2xl animate-in slide-in-from-top-2 duration-300 shadow-sm">
                                <CRMField label="Novo Valor (R$)" name="newProLaboreValue" type="number" step="0.01" required value={formData.newProLaboreValue} onChange={handleInputChange} autoFocus />
                                <CRMField label="Vigência a partir de" name="newProLaboreDate" type="date" required value={formData.newProLaboreDate} onChange={handleInputChange} />
                                <div className="col-span-2 flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowSalaryAdjustment(false);
                                            setFormData((prev: any) => ({ ...prev, newProLaboreValue: undefined, newProLaboreDate: undefined }));
                                        }}
                                        className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest px-3 py-1.5 transition-colors"
                                    >
                                        Descartar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowSalaryAdjustment(false)}
                                        className="text-[10px] font-black bg-green-600 text-white hover:bg-green-700 uppercase tracking-widest px-4 py-1.5 rounded-lg shadow-sm transition-all active:scale-95"
                                    >
                                        Confirmar Ajuste
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Fallback for new partner creation where adjustment modal isn't needed yet */}
                        {!formData.id && (
                            <div className="mt-2">
                                <CRMField label="Salário Inicial (Pró-Labore)" name="proLaboreValue" type="number" step="0.01" required value={formData.proLaboreValue} onChange={handleInputChange} />
                            </div>
                        )}
                    </div>

                    {/* Salary History Section */}
                    <div className="md:col-span-2 mt-2 bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                        <h4 className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 mb-3 tracking-widest">
                            <History size={14} className="text-indigo-500" /> Histórico de Pró-Labore
                        </h4>
                        <div className="space-y-2">
                            {/* Current Value (Virtual Entry) */}
                            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-green-600 dark:text-green-400">{formatCurrency(formData.proLaboreValue || 0)}</span>
                                    <span className="text-[9px] text-slate-400 font-medium tracking-tight">
                                        Vigente desde: {(() => {
                                            const hist = formData.salaryHistory || [];
                                            const last = hist.length > 0 ? [...hist].sort((a: any, b: any) => new Date(b.endDate || 0).getTime() - new Date(a.endDate || 0).getTime())[0] : null;
                                            return formatDateBR(last ? last.endDate : (formData.admissionDate || formData.entryDate || new Date().toISOString().split('T')[0]));
                                        })()}
                                    </span>
                                </div>
                                <span className="px-2 py-0.5 bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-md text-[9px] font-black text-green-600 uppercase">
                                    Atual
                                </span>
                            </div>

                            {/* Historical Entries */}
                            {formData.salaryHistory && [...formData.salaryHistory].sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map((h: any) => (
                                <div key={h.id} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 opacity-70">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{formatCurrency(h.value)}</span>
                                        <span className="text-[9px] text-slate-400 font-medium">
                                            Período: {formatDateBR(h.startDate)} até {formatDateBR(h.endDate)}
                                        </span>
                                    </div>
                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[9px] font-bold text-slate-500 uppercase">
                                        Encerrado
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {activePartnerTab === 'compliance' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="grid grid-cols-2 gap-4">
                        <CRMSelect label="PEP?" name="isPEP" value={formData.isPEP} onChange={handleInputChange}><option value="false">Não</option><option value="true">Sim</option></CRMSelect>
                    </div>
                    <div className="pt-4 border-t border-[var(--border-color)]">
                        <label className="flex items-center text-sm font-semibold text-[var(--text-primary)]">
                            <input type="checkbox" name="lgpdConsent" checked={formData.lgpdConsent} onChange={handleInputChange} className="mr-2 w-4 h-4 text-orange-600 rounded focus:ring-orange-500" />
                            Consentimento LGPD <span className="text-red-500 ml-1">*</span>
                        </label>
                    </div>
                </div>
            )}
            {activePartnerTab === 'contabil' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <div className="md:col-span-1">
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Conta Contábil Sócio / Despesa *</label>
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
                                    setFormData((prev: any) => ({ ...prev, accountingAccount: `2.1.02.${suffix}` }));
                                }}
                            >
                                Gerar Conta Contábil
                            </button>
                        </div>
                    </div>
                    <CRMField label="Centro de Custo" name="costCenter" placeholder="Ex: Administrativo, Diretoria" value={formData.costCenter} onChange={handleInputChange} />
                </div>
            )}
        </div>
    );
};
