
import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import {
    Layers, CheckCircle, AlertTriangle, Play, RefreshCw,
    Calendar, User, FileText, Activity, ShieldCheck,
    Search, Filter, ArrowUpRight, ArrowDownLeft, Database,
    Server, Wifi, ExternalLink, FileCode, Lock, Upload, Eye, X,
    Info, HelpCircle, FileCheck, Send, AlertCircle, PlusCircle, Trash2,
    ChevronLeft, ChevronRight, CheckSquare, Square
} from 'lucide-react';
import { generateEsocialBatch } from '../utils/legalGenerators';
import { EsocialEvent, Filing } from '../types';
import { esocialService, CertData } from '../services/esocialService';
import { parseDateSafe } from '../utils/formatters';

const EVENT_INFO: Record<string, string> = {
    'S-1000': 'Cadastro do Empregador/Contribuinte.',
    'S-1005': 'Tabela de Estabelecimentos.',
    'S-1010': 'Tabela de Rubricas.',
    'S-1020': 'Tabela de Lotações Tributárias.',
    'S-2200': 'Admissão/Ingresso de Trabalhador.',
    'S-2205': 'Alteração de Dados Cadastrais.',
    'S-2206': 'Alteração de Contrato.',
    'S-2210': 'Comunicação de Acidente de Trabalho (CAT).',
    'S-2220': 'Monitoramento da Saúde (ASO).',
    'S-2230': 'Afastamento Temporário.',
    'S-2240': 'Condições Ambientais (Fatores de Risco).',
    'S-2299': 'Desligamento.',
    'S-1200': 'Remuneração (Folha).',
    'S-1210': 'Pagamentos (Rendimentos).',
    'S-1299': 'Fechamento dos Eventos Periódicos.',
    'S-3000': 'Exclusão de Eventos.',
};

const STATUS_TRANSLATIONS: Record<string, string> = {
    'pending': 'Pendente',
    'generated': 'Gerado',
    'signed': 'Assinado',
    'sent': 'Enviado',
    'rejected': 'Rejeitado',
    'error': 'Erro',
    'processing': 'Processando'
};

export const Esocial: React.FC = () => {
    const {
        selectedCompany, employees, payrollRuns, payrollItems,
        filings, addFiling, updateFiling
    } = useData();
    const { addToast } = useToast();

    // State
    const [selectedPhase, setSelectedPhase] = useState<'1' | '2' | '3' | '4' | '5'>('1');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [searchTerm, setSearchTerm] = useState('');

    // Staging State (Novos Candidatos)
    const [candidates, setCandidates] = useState<EsocialEvent[]>([]);
    const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);

    // Generated Events Selection (Para Assinar/Transmitir)
    const [selectedGenerated, setSelectedGenerated] = useState<string[]>([]);

    // Certificate State
    const [certificate, setCertificate] = useState<CertData | null>(null);
    const [isCertModalOpen, setIsCertModalOpen] = useState(false);
    const [tempCertFile, setTempCertFile] = useState<File | null>(null);
    const [tempCertPassword, setTempCertPassword] = useState('');

    // Viewers State
    const [viewXml, setViewXml] = useState<string | null>(null);
    const [viewError, setViewError] = useState<{ title: string, msg: string } | null>(null);

    // Derived State
    const formattedPeriod = `${selectedPeriod.split('-')[1]}/${selectedPeriod.split('-')[0]}`;
    const currentFiling = filings.find(f =>
        f.companyId === selectedCompany?.id &&
        f.name === 'ESOCIAL' &&
        f.competence === formattedPeriod
    );

    const generatedEvents: EsocialEvent[] = currentFiling?.esocialEvents || [];

    // Filtro de Visualização
    const filteredGenerated = generatedEvents.filter(ev =>
        ev.group === selectedPhase &&
        (ev.evtType.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ev.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Load Cert
    useEffect(() => {
        if (selectedCompany) {
            const savedCert = localStorage.getItem(`esocial_cert_${selectedCompany.id}`);
            if (savedCert) {
                try {
                    const parsedCert = JSON.parse(savedCert);
                    setCertificate(parsedCert);
                    esocialService.setCertificate(parsedCert);
                } catch (e) { console.error(e); }
            } else {
                setCertificate(null);
            }
        }
    }, [selectedCompany]);

    const stats = [
        { label: 'Sucesso', value: generatedEvents.filter(e => e.status === 'sent' && e.receiptNumber).length.toString(), icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Pendentes', value: generatedEvents.filter(e => e.status !== 'sent').length.toString(), icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Erros', value: generatedEvents.filter(e => e.status === 'error' || e.status === 'rejected').length.toString(), icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
    ];

    const phases = [
        { id: '1', label: 'Tabelas', subtitle: 'Cadastros', icon: Database, color: 'indigo' },
        { id: '2', label: 'Não Periódicos', subtitle: 'Vínculos', icon: User, color: 'violet' },
        { id: '3', label: 'Periódicos', subtitle: 'Folha', icon: FileText, color: 'emerald' },
        { id: '4', label: 'SST', subtitle: 'Segurança', icon: ShieldCheck, color: 'orange' },
        { id: '5', label: 'Totalização', subtitle: 'Retificação', icon: AlertTriangle, color: 'red' }
    ] as const;

    // --- SELECTION LOGIC (MAIN TABLE) ---
    const toggleGenerated = (id: string) => {
        setSelectedGenerated(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleAllGenerated = () => {
        if (selectedGenerated.length === filteredGenerated.length) {
            setSelectedGenerated([]);
        } else {
            setSelectedGenerated(filteredGenerated.map(e => e.id));
        }
    };

    // --- ACTIONS ---

    const handleAnalyze = () => {
        if (!selectedCompany) { addToast('Selecione uma empresa.', 'error'); return; }
        setIsLoading(true);
        setTimeout(() => {
            const allPossibleEvents = generateEsocialBatch(selectedCompany, employees || [], payrollRuns || [], payrollItems || [], formattedPeriod);
            const newCandidates = allPossibleEvents.filter(candidate => {
                const exists = generatedEvents.some(existing => existing.evtType === candidate.evtType && existing.description === candidate.description);
                return !exists && candidate.group === selectedPhase;
            });
            setCandidates(newCandidates);
            setHasAnalyzed(true);
            setIsLoading(false);
            if (newCandidates.length === 0) addToast('Nada pendente encontrado.', 'success');
        }, 600);
    };

    const handleGenerateSelected = async () => {
        if (selectedCandidates.length === 0) return;
        setIsLoading(true);
        const eventsToSave = candidates.filter(c => selectedCandidates.includes(c.id));
        const updatedEvents = [...generatedEvents, ...eventsToSave];
        await saveFiling(updatedEvents);
        setCandidates(prev => prev.filter(c => !selectedCandidates.includes(c.id)));
        setSelectedCandidates([]);
        addToast(`${eventsToSave.length} eventos gerados.`, 'success');
        setIsLoading(false);
    };

    const handleSignSelected = async () => {
        if (!certificate) { addToast('Requer Certificado Digital.', 'error'); return; }
        if (selectedGenerated.length === 0) { addToast('Selecione eventos para assinar.', 'warning'); return; }

        setIsLoading(true);
        addToast('Assinando eventos selecionados...', 'info');

        // Simulating signing delay
        setIsLoading(true);
        addToast('Assinando eventos selecionados...', 'info');
        esocialService.setCertificate(certificate); // Ensure cert is active

        try {
            const eventsToSign = generatedEvents.filter(ev => selectedGenerated.includes(ev.id) && (ev.status === 'pending' || ev.status === 'error'));

            if (eventsToSign.length === 0) {
                addToast('Nenhum evento pendente para assinar.', 'warning');
                setIsLoading(false);
                return;
            }

            const signedResults = await esocialService.signEvents(eventsToSign);

            // Merge results back
            const updatedEvents = generatedEvents.map(ev => {
                const signed = signedResults.find(s => s.id === ev.id);
                return signed ? signed : ev;
            });

            await saveFiling(updatedEvents);
            addToast(`${signedResults.filter(s => s.status === 'signed').length} eventos assinados com sucesso.`, 'success');
        } catch (err: any) {
            addToast(`Erro ao assinar: ${err.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTransmitSelected = async () => {
        if (!certificate) { addToast('Requer Certificado Digital.', 'error'); return; }

        // Filter: Selected AND Signed
        const eventsToSend = generatedEvents.filter(e => selectedGenerated.includes(e.id) && e.status === 'signed');

        if (eventsToSend.length === 0) {
            addToast('Selecione eventos ASSINADOS para transmitir.', 'warning');
            return;
        }

        setIsLoading(true);
        addToast(`Transmitindo ${eventsToSend.length} eventos...`, "info");
        esocialService.setCertificate(certificate);

        try {
            // Em lote ou individual? eSocial suporta lote de até 50 eventos.
            // Vamos mandar tudo num lote só por enquanto.
            const response = await esocialService.sendBatch(selectedCompany!, eventsToSend);

            if (response.success && response.protocol) {
                const updatedEvents = generatedEvents.map(ev => {
                    if (eventsToSend.find(s => s.id === ev.id)) {
                        return {
                            ...ev,
                            status: 'sent' as const,
                            protocol: response.protocol,
                            validationMessage: undefined,
                            sentAt: new Date().toISOString()
                        };
                    }
                    return ev;
                });
                await saveFiling(updatedEvents);
                addToast(`Lote enviado! Protocolo: ${response.protocol}`, "success");
            } else {
                addToast(`Falha: ${response.message}`, "error");
            }
        } catch (error) {
            addToast("Erro crítico de comunicação.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckReceipt = async (event: EsocialEvent) => {
        if (!event.protocol) return;
        setIsLoading(true);
        try {
            const response = await esocialService.checkResults(event.protocol);
            if (response.success && response.receipt) {
                const updated = generatedEvents.map(ev => ev.id === event.id ? { ...ev, status: 'sent' as const, receiptNumber: response.receipt, validationMessage: undefined } : ev);
                await saveFiling(updated);
                addToast(`Processado! Recibo: ${response.receipt}`, 'success');
            } else if (!response.success && response.errorType === 'validation') {
                const updated = generatedEvents.map(ev => ev.id === event.id ? { ...ev, status: 'rejected' as const, validationMessage: response.message } : ev);
                await saveFiling(updated);
                addToast(`Erro validação: ${response.message}`, 'error');
            } else {
                addToast(`Ainda em processamento ou erro: ${response.message}`, 'warning');
            }
        } catch (error) { addToast('Erro consulta.', 'error'); }
        finally { setIsLoading(false); }
    };

    const handleDeleteEvent = async (id: string) => {
        if (window.confirm('Remover este evento do lote local?')) {
            const updated = generatedEvents.filter(e => e.id !== id);
            await saveFiling(updated);
            // Remove from selection if present
            setSelectedGenerated(prev => prev.filter(x => x !== id));
            addToast('Evento removido.', 'success');
        }
    };

    const saveFiling = async (events: EsocialEvent[]) => {
        if (currentFiling) {
            await updateFiling({ ...currentFiling, esocialEvents: events, updatedAt: new Date().toISOString() });
        } else {
            // Should not happen here usually
            const newFiling: Filing = {
                id: Math.random().toString(36).substr(2, 9),
                companyId: selectedCompany!.id,
                name: 'ESOCIAL',
                category: 'federal',
                competence: formattedPeriod,
                deadline: new Date().toISOString(),
                status: 'generated',
                content: 'eSocial',
                priority: 'high',
                createdAt: new Date().toISOString(),
                esocialEvents: events
            };
            await addFiling(newFiling);
        }
    };

    const processCert = () => {
        if (!tempCertFile || !tempCertPassword) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target?.result?.toString().split(',')[1];
            if (base64) {
                const data: CertData = { name: tempCertFile.name, expiry: 'Validade Backend', pfxBase64: base64, password: tempCertPassword };
                setCertificate(data);
                esocialService.setCertificate(data);
                localStorage.setItem(`esocial_cert_${selectedCompany?.id}`, JSON.stringify(data));
                setIsCertModalOpen(false);
                addToast('Certificado importado.', 'success');
            }
        };
        reader.readAsDataURL(tempCertFile);
    };

    // --- RENDER ---
    return (
        <div className="flex flex-col h-full bg-slate-50 min-h-screen p-6 font-sans relative">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Layers className="text-indigo-600" /> Central eSocial
                    </h1>
                    <p className="text-slate-500 text-sm ml-8">Gestão de Eventos (S-1000 a S-3000)</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => window.open('http://127.0.0.1:3000', '_blank')} className={`text-[10px] font-bold px-3 py-1 rounded-full border flex items-center gap-1 ${certificate ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                        <Server size={12} /> Proxy: {certificate ? 'Pronto' : 'Sem Certificado'}
                    </button>
                </div>
            </div>

            <div className="flex gap-6 h-full">

                {/* Sidebar Phases */}
                <div className="w-64 flex flex-col gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2">
                        {phases.map(p => (
                            <button key={p.id} onClick={() => { setSelectedPhase(p.id as any); setCandidates([]); }}
                                className={`w-full text-left p-3 rounded-lg mb-1 flex items-center gap-3 transition-all ${selectedPhase === p.id ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}>
                                <p.icon size={18} className={selectedPhase === p.id ? 'text-indigo-200' : `text-${p.color}-500`} />
                                <div>
                                    <span className="text-[10px] font-bold uppercase block opacity-70">{p.label}</span>
                                    <span className="text-xs font-bold block">{p.subtitle}</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="bg-slate-800 rounded-xl p-4 text-white text-center shadow-lg">
                        <ShieldCheck size={32} className="mx-auto text-emerald-400 mb-2" />
                        <p className="text-xs text-slate-400 mb-3">{certificate ? certificate.name : 'Nenhum certificado carregado'}</p>
                        <button onClick={() => setIsCertModalOpen(true)} className="w-full py-2 bg-white text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-100 flex justify-center gap-2">
                            <Upload size={14} /> {certificate ? 'Trocar' : 'Importar'}
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col gap-4">

                    {/* Toolbar */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <button onClick={() => {
                                const d = new Date(selectedPeriod + '-02'); d.setMonth(d.getMonth() - 1);
                                setSelectedPeriod(d.toISOString().slice(0, 7)); setCandidates([]);
                            }} className="p-1 hover:bg-slate-100 rounded"><ChevronLeft /></button>
                            <div className="text-center min-w-[120px]">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Competência</span>
                                <h2 className="text-base font-black text-slate-800 capitalize">{parseDateSafe(selectedPeriod + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
                            </div>
                            <button onClick={() => {
                                const d = new Date(selectedPeriod + '-02'); d.setMonth(d.getMonth() + 1);
                                setSelectedPeriod(d.toISOString().slice(0, 7)); setCandidates([]);
                            }} className="p-1 hover:bg-slate-100 rounded"><ChevronRight /></button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={handleAnalyze} disabled={isLoading} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 flex gap-2"><Search size={14} /> Buscar</button>
                            <div className="w-px h-6 bg-slate-200 mx-1"></div>

                            <button onClick={handleSignSelected} disabled={isLoading || selectedGenerated.length === 0}
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-xs font-bold hover:bg-indigo-100 flex gap-2 disabled:opacity-50 transition-all">
                                <FileCheck size={14} /> Assinar ({selectedGenerated.length})
                            </button>

                            <button onClick={handleTransmitSelected} disabled={isLoading || selectedGenerated.length === 0}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm flex gap-2 disabled:opacity-50 transition-all">
                                {isLoading ? <RefreshCw className="animate-spin" size={14} /> : <Send size={14} />} Transmitir ({selectedGenerated.length})
                            </button>
                        </div>
                    </div>

                    {/* Staging Area */}
                    {candidates.length > 0 && (
                        <div className="bg-indigo-50/50 rounded-xl border-2 border-dashed border-indigo-200 p-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xs font-bold text-indigo-900 flex items-center gap-2"><PlusCircle size={14} /> Sugestão de Eventos ({candidates.length})</h3>
                                <button onClick={handleGenerateSelected} disabled={selectedCandidates.length === 0} className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-bold">Gerar Selecionados</button>
                            </div>
                            <div className="max-h-32 overflow-auto">
                                <table className="w-full text-left text-xs">
                                    <tbody>
                                        {candidates.map(c => (
                                            <tr key={c.id} className="hover:bg-indigo-100">
                                                <td className="p-1 w-8 text-center"><input type="checkbox" checked={selectedCandidates.includes(c.id)} onChange={() => setSelectedCandidates(p => p.includes(c.id) ? p.filter(x => x !== c.id) : [...p, c.id])} /></td>
                                                <td className="p-1 font-bold text-indigo-900">{c.evtType}</td>
                                                <td className="p-1 text-slate-600">{c.description}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Main Table */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
                        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-800">Lote de Eventos <span className="text-slate-400 text-xs font-normal">({filteredGenerated.length} itens)</span></h3>
                            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Filtrar..." className="bg-white border text-xs px-2 py-1 rounded w-40" />
                        </div>
                        <div className="overflow-auto flex-1">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm text-slate-500 font-bold uppercase">
                                    <tr>
                                        <th className="p-3 w-10 text-center border-b">
                                            <input type="checkbox" checked={filteredGenerated.length > 0 && selectedGenerated.length === filteredGenerated.length} onChange={toggleAllGenerated} className="cursor-pointer" />
                                        </th>
                                        <th className="p-3 w-20 border-b">Evento</th>
                                        <th className="p-3 border-b">Descrição</th>
                                        <th className="p-3 w-32 border-b">Protocolo</th>
                                        <th className="p-3 w-24 text-center border-b">Status</th>
                                        <th className="p-3 w-40 text-center border-b">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredGenerated.map(ev => (
                                        <tr key={ev.id} className={`hover:bg-slate-50 group font-medium ${ev.status === 'error' ? 'bg-red-50/30' : ''}`}>
                                            <td className="p-3 text-center align-middle">
                                                <input type="checkbox" checked={selectedGenerated.includes(ev.id)} onChange={() => toggleGenerated(ev.id)} className="cursor-pointer" />
                                            </td>
                                            <td className="p-3 align-middle"><span className="bg-slate-100 border text-slate-600 px-1.5 py-0.5 rounded font-mono text-[10px]">{ev.evtType}</span></td>
                                            <td className="p-3 align-middle text-slate-700">
                                                {ev.description}
                                                {ev.id && <div className="text-[9px] text-slate-400 font-mono truncate w-32">{ev.id}</div>}
                                            </td>
                                            <td className="p-3 align-middle"><span className="font-mono text-[10px] text-slate-500 bg-slate-50 px-1 rounded">{ev.protocol || '-'}</span></td>
                                            <td className="p-3 text-center align-middle">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase border ${ev.status === 'sent' && ev.receiptNumber ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                    ev.status === 'sent' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                        ev.status === 'signed' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                                            ev.status === 'error' || ev.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                                                                'bg-slate-100 text-slate-500 border-slate-200'
                                                    }`}>
                                                    {ev.status === 'sent' && ev.receiptNumber ? 'Processado' : (STATUS_TRANSLATIONS[ev.status] || ev.status)}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center align-middle">
                                                <div className="flex items-center justify-center gap-2">
                                                    {/* Consultar */}
                                                    {ev.protocol && !ev.receiptNumber && (
                                                        <button onClick={() => handleCheckReceipt(ev)} title="Consultar Recibo" className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors">
                                                            <RefreshCw size={14} />
                                                        </button>
                                                    )}

                                                    {/* Visualizar XML */}
                                                    <button onClick={() => setViewXml(ev.xml)} title="Ver XML" className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"><Eye size={14} /></button>

                                                    {/* Excluir (Só se não tiver processado com sucesso final) */}
                                                    {(!ev.receiptNumber) && (
                                                        <button onClick={() => handleDeleteEvent(ev.id)} title="Excluir" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={14} /></button>
                                                    )}

                                                    {/* Erro */}
                                                    {ev.validationMessage && (
                                                        <button onClick={() => setViewError({ title: 'Erro Validação', msg: ev.validationMessage! })} className="text-[9px] text-red-600 underline font-bold">Ver Erro</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredGenerated.length === 0 && <div className="p-8 text-center text-slate-400">Nenhum evento nesta visão.</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {isCertModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-xl w-96">
                        <h3 className="font-bold mb-4">Certificado Digital</h3>
                        <input type="file" onChange={e => setTempCertFile(e.target.files?.[0] || null)} className="mb-3 block w-full text-sm" />
                        <input type="password" value={tempCertPassword} onChange={e => setTempCertPassword(e.target.value)} placeholder="Senha PFX" className="w-full border p-2 rounded mb-4" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsCertModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold">Cancelar</button>
                            <button onClick={processCert} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {viewXml && <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-10"><div className="bg-slate-900 text-emerald-400 p-6 rounded-xl w-full h-full overflow-auto relative font-mono text-sm shadow-2xl"><button onClick={() => setViewXml(null)} className="absolute top-4 right-4 text-white bg-white/10 p-2 rounded hover:bg-white/20"><X /></button><pre>{viewXml}</pre></div></div>}
            {viewError && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 ring-1 ring-red-100">
                        <div className="flex items-center gap-3 mb-4 text-red-600">
                            <AlertTriangle size={24} />
                            <h3 className="text-lg font-bold">{viewError.title}</h3>
                        </div>
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-sm text-red-800 font-medium leading-relaxed break-words">
                            {viewError.msg}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setViewError(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
