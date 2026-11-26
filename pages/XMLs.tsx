
import React, { useState, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { NFSeFetcher } from '../components/fiscal/NFSeFetcher';
import { useToast } from '../contexts/ToastContext';
import {
    FileCode,
    Upload,
    Server,
    CheckCircle,
    AlertTriangle,
    Play,
    Trash2,
    Layers,
    Loader2,
    FileText,
    Search
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseInvoiceXML } from '../utils/xmlParser';
import { Invoice } from '../types';
import JSZip from 'jszip';

interface PendingFile {
    id: string;
    name: string;
    size: string;
    rawDate: Date;
    originalFile: File;
}

export const XMLs: React.FC = () => {
    const { addToast } = useToast();
    const data = useData();
    const [isNFSeFetcherOpen, setIsNFSeFetcherOpen] = useState(false);
    const [pendingXMLs, setPendingXMLs] = useState<PendingFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { userRole, userEmail, systemUsers } = data;

    const canWrite = React.useMemo(() => {
        if (userRole === 'Admin') return true;
        const currentUserProfile = systemUsers.find(u => u.email === userEmail);
        if (!currentUserProfile || !currentUserProfile.permissions) return false;
        return currentUserProfile.permissions.fiscal === 'full';
    }, [userRole, userEmail, systemUsers]);

    const handleImportXML = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setIsProcessing(true);
            const fileList = Array.from(files);
            let acceptedCount = 0;

            for (const file of fileList) {
                if (file.name.toLowerCase().endsWith('.zip')) {
                    try {
                        const zip = new JSZip();
                        const loadedZip = await zip.loadAsync(file);
                        const filePromises: Promise<void>[] = [];
                        loadedZip.forEach((relativePath, zipEntry) => {
                            if (!zipEntry.dir && relativePath.toLowerCase().endsWith('.xml')) {
                                filePromises.push(zipEntry.async('blob').then(blob => {
                                    const extractedFile = new File([blob], zipEntry.name, { type: 'text/xml' });
                                    setPendingXMLs(prev => [...prev, {
                                        id: Math.random().toString(36).substr(2, 9),
                                        name: extractedFile.name,
                                        size: (extractedFile.size / 1024).toFixed(2) + ' KB',
                                        rawDate: new Date(),
                                        originalFile: extractedFile
                                    }]);
                                    acceptedCount++;
                                }));
                            }
                        });
                        await Promise.all(filePromises);
                    } catch (err) {
                        console.error('Falha ao descompactar ZIP:', file.name, err);
                        addToast(`Falha ao descompactar o arquivo ${file.name}.`, 'error');
                    }
                } else {
                    const pendingFile: PendingFile = {
                        id: Math.random().toString(36).substr(2, 9),
                        name: file.name,
                        size: (file.size / 1024).toFixed(2) + ' KB',
                        rawDate: new Date(),
                        originalFile: file
                    };
                    setPendingXMLs(prev => [...prev, pendingFile]);
                    acceptedCount++;
                }
            }

            if (acceptedCount > 0) {
                addToast(`${acceptedCount} arquivo(s) carregado(s).`, 'success');
            }
            setIsProcessing(false);
            e.target.value = '';
        }
    };

    const handleRemoveXML = (id: string) => {
        setPendingXMLs(prev => prev.filter(f => f.id !== id));
    };

    const handleProcessAll = async () => {
        setIsProcessing(true);
        addToast('Processamento em lote iniciado...', 'info');
        
        let successCount = 0;
        let duplicateCount = 0;
        let failCount = 0;
        
        for (const pending of pendingXMLs) {
            try {
                const text = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.onerror = reject;
                    reader.readAsText(pending.originalFile);
                });
                
                const parsed = parseInvoiceXML(text, data.selectedCompany?.cnpj);
                if (parsed.length === 0) {
                    failCount++;
                    continue;
                }

                for (const note of parsed) {
                    // Prevenção de duplicidade
                    const isDuplicate = data.invoices.some(inv => 
                        inv.companyId === data.selectedCompany?.id && 
                        inv.number === note.number && 
                        inv.cnpj === note.cnpj
                    );

                    if (isDuplicate) {
                        duplicateCount++;
                        continue;
                    }

                    const invoiceId = Math.random().toString(36).substr(2, 9);
                    await data.addInvoice({
                        ...note,
                        id: invoiceId,
                        companyId: data.selectedCompany?.id
                    } as Invoice);

                    // AUTO-INTEGRAÇÃO CONTÁBIL (Alimentando o Analytics.tsx)
                    const isReceita = note.type === 'service' || note.type === 'exit';
                    await data.addAccountingEntry({
                        id: Math.random().toString(36).substr(2, 9),
                        companyId: data.selectedCompany?.id || '',
                        date: note.date || new Date().toISOString(),
                        description: `XML Importado: NF ${note.number} (${note.entityName})`,
                        value: Number(note.value) || 0,
                        debitAccount: isReceita ? '1.1.02.0001' : '5.1.01.0001', // Clientes a Receber (Ativo) ou Custo CMV (Despesa)
                        creditAccount: isReceita ? '4.1.01.0001' : '2.1.01.0001', // Receita de Vendas ou Fornecedores (Passivo)
                        history: `Integração Fiscal Automática. Tributos contidos: \n${note.details || ''}`,
                        originModule: 'fiscal',
                        status: 'posted',
                        documentRef: invoiceId
                    });

                    successCount++;
                }
            } catch (err) {
                console.error('Falha ao processar arquivo:', pending.name, err);
                failCount++;
            }
        }
        
        setIsProcessing(false);
        setPendingXMLs([]);

        if (successCount > 0) {
            addToast(`${successCount} nota(s) processada(s) e adicionada(s) com sucesso aos Livros Fiscais!`, 'success');
        }
        if (duplicateCount > 0) {
            addToast(`${duplicateCount} nota(s) ignorada(s) por duplicidade no banco de dados.`, 'warning');
        }
        if (failCount > 0) {
            addToast(`${failCount} arquivo(s) não foram reconhecidos como NF-e/NFS-e válidas.`, 'error');
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] bg-slate-50 dark:bg-slate-900 -m-6 p-6 overflow-hidden gap-5">
            <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                className="hidden"
                accept=".xml,.zip"
                multiple
            />

            {/* HEADER \u2014 Premium */}
            <header className="flex justify-between items-center shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-md shadow-indigo-500/25">
                        <FileCode className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Central de XMLs</h1>
                        <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">Gest\u00e3o, importa\u00e7\u00e3o e consulta de documentos fiscais</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-full border border-indigo-200/60 dark:border-indigo-800/40 shadow-sm">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">AMB:</span>
                    <span className="text-xs font-black text-indigo-700 dark:text-indigo-300">Produ\u00e7\u00e3o</span>
                </div>
            </header>

            {/* MAIN ACTIONS \u2014 Premium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                {/* CARD 1: BUSCA NFS-e */}
                <button
                    onClick={() => setIsNFSeFetcherOpen(true)}
                    className="relative group bg-white dark:bg-slate-800/90 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 text-left overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Server size={90} className="text-indigo-600" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                    <div className="relative">
                        <div className="w-11 h-11 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                            <Server size={20} />
                        </div>
                        <h3 className="text-base font-black text-slate-800 dark:text-white mb-1.5">Buscar NFS-e na Prefeitura</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[85%]">
                            Utilize o Certificado Digital A1 para baixar notas fiscais de servi\u00e7o diretamente da base nacional/municipal.
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-xs font-black text-indigo-600 group-hover:gap-3 transition-all">
                            <span>Iniciar Consulta</span>
                            <Play size={10} className="fill-current" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-400 to-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                {/* CARD 2: UPLOAD MANUAL */}
                <button
                    onClick={handleImportXML}
                    className="relative group bg-white dark:bg-slate-800/90 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-300 text-left overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Upload size={90} className="text-emerald-600" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                    <div className="relative">
                        <div className="w-11 h-11 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                            <Upload size={20} />
                        </div>
                        <h3 className="text-base font-black text-slate-800 dark:text-white mb-1.5">Importar XML Manual</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[85%]">
                            Carregue arquivos XML do seu computador para processamento e lan\u00e7amento no sistema.
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-xs font-black text-emerald-600 group-hover:gap-3 transition-all">
                            <span>Selecionar Arquivos</span>
                            <Play size={10} className="fill-current" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                {/* CARD 3: AUDITORIA (EM BREVE) */}
                <div className="relative group bg-white dark:bg-slate-800/60 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/30 shadow-sm text-left overflow-hidden opacity-60 cursor-not-allowed">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Search size={90} className="text-slate-600" />
                    </div>
                    <div className="relative">
                        <div className="w-11 h-11 bg-slate-100 dark:bg-slate-700/30 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 mb-4">
                            <Search size={20} />
                        </div>
                        <h3 className="text-base font-black text-slate-600 dark:text-slate-400 mb-1.5">Auditoria de Arquivos</h3>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-[85%]">
                            Verifique a integridade dos arquivos XML e identifique falhas na sequ\u00eancia num\u00e9rica.
                        </p>
                        <div className="mt-4">
                            <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 dark:bg-slate-700/40 text-slate-400 text-[10px] font-black uppercase tracking-wider rounded-full">Em Breve</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* PENDING FILES LIST \u2014 Premium */}
            <div className="flex-1 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex flex-col overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/80 dark:bg-slate-800/40 rounded-t-2xl">
                    <div className="flex items-center gap-2.5">
                        <Layers size={16} className="text-slate-400" />
                        <h3 className="font-black text-sm text-slate-700 dark:text-slate-200 uppercase tracking-wider">Fila de Processamento</h3>
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${pendingXMLs.length > 0 ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                            {pendingXMLs.length}
                        </span>
                    </div>
                    {pendingXMLs.length > 0 && (
                        <button
                            onClick={handleProcessAll}
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-black rounded-full shadow-md shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <Play size={11} className="fill-current" />}
                            Processar Todos
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {pendingXMLs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                            <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-700/30 flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700/50">
                                <FileCode size={28} className="text-slate-300 dark:text-slate-500" />
                            </div>
                            <p className="font-black text-sm text-slate-400 uppercase tracking-wider">Nenhum arquivo na fila</p>
                            <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Importe XMLs usando os cards acima</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2">
                            {pendingXMLs.map(file => (
                                <div key={file.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-500 flex items-center justify-center border border-orange-100 dark:border-orange-800/30">
                                            <FileCode size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{file.name}</p>
                                            <p className="text-[10px] text-slate-400">{file.size} &bull; {format(file.rawDate, 'dd/MM/yyyy HH:mm')}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveXML(file.id)}
                                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* MODALS */}
            <Modal isOpen={isNFSeFetcherOpen} onClose={() => setIsNFSeFetcherOpen(false)} title="Consulta de NFS-e (Certificado Digital)" maxWidth="max-w-7xl">
                <div className="h-[85vh]">
                    <NFSeFetcher onClose={() => setIsNFSeFetcherOpen(false)} />
                </div>
            </Modal>
        </div>
    );
};
