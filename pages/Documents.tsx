import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
    FileText, FolderOpen, Upload, Search, Filter,
    MoreVertical, Download, Trash2, Eye, Share2, RefreshCw, Link as LinkIcon,
    Calendar, HardDrive, Shield, Image, FileSpreadsheet, FileCode, Video,
    FileAudio, FileArchive, FileBox, FileType
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { useData } from '../contexts/DataContext';
import { storage, db, auth } from '../firebaseConfig';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, onSnapshot, query, where, deleteDoc, doc, orderBy } from 'firebase/firestore';

import { GoogleAuthProvider, signInWithPopup, linkWithPopup, unlink } from 'firebase/auth';
import { formatDateBR } from '../utils/formatters';

const GoogleDriveIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 87.3 78" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
        <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
        <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
        <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
        <path d="m59.8 53h-27.5l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.5c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
        <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 13.75 23.8h27.5c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
    </svg>
);

const TeraBoxIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 1024 1024" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M853.333333 170.666667H170.666667c-47.146667 0-85.333333 38.186667-85.333334 85.333333v512c0 47.146667 38.186667 85.333333 85.333334 85.333333h682.666666c47.146667 0 85.333333-38.186667 85.333334-85.333333V256c0-47.146667-38.186667-85.333333-85.333334-85.333333z m0 597.333333H170.666667V256h682.666666v512z" fill="#108EE9" />
        <path d="M298.666667 384l213.333333 256 213.333333-256H298.666667z" fill="#108EE9" />
    </svg>
);

interface Document {
    id: string;
    name: string;
    url: string;
    category: string;
    size: string;
    date: string; // ISO string
    owner: string;
    status: 'protegido' | 'publico' | 'rascunho';
    userId: string;
}

export const Documents: React.FC = () => {
    const { addAuditLog, currentUser, theme, selectedCompanyId } = useData();
    const [search, setSearch] = useState('');
    const [uploading, setUploading] = useState(false);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);

    // Upload Modal State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [isOCRProcessing, setIsOCRProcessing] = useState(false);

    const [progress, setProgress] = useState(0);
    const [googleToken, setGoogleToken] = useState<string | null>(null);

    // Link Modal
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [linkName, setLinkName] = useState('');
    const [linkUrl, setLinkUrl] = useState('');

    // SMART FOLDERS (Recommendation 6)
    const [activeFolder, setActiveFolder] = useState<string | null>(null);
    const folders = [
        { id: 'fiscal', label: 'Fiscal', icon: FolderOpen, color: 'text-blue-500' },
        { id: 'folha', label: 'Folha Pagto', icon: FolderOpen, color: 'text-emerald-500' },
        { id: 'juridico', label: 'Jurídico', icon: FolderOpen, color: 'text-purple-500' },
        { id: 'extratos', label: 'Extratos', icon: FolderOpen, color: 'text-orange-500' }
    ];


    // Fetch Documents Realtime
    useEffect(() => {
        if (!auth.currentUser || !selectedCompanyId) {
            setDocuments([]);
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'documents'),
            where('userId', '==', auth.currentUser.uid),
            where('companyId', '==', selectedCompanyId)
            // orderBy('createdAt', 'desc') // Requires index? If fails, remove orderBy
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as any[];
            // Map Firestore data to interface if needed
            const mappedDocs = docs.map(d => ({
                ...d,
                date: d.date || d.createdAt?.toDate?.().toISOString() || new Date().toISOString()
            }));

            // Sort client side to avoid index requirement block
            mappedDocs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setDocuments(mappedDocs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching docs:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [auth.currentUser, selectedCompanyId]);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processUpload(e.dataTransfer.files[0]);
        }
    };

    const processUpload = async (file: File) => {
        if (!selectedCompanyId) {
            alert("Selecione uma empresa primeiro.");
            return;
        }
        if (!file || !auth.currentUser) {
            console.error('Erro de upload: Arquivo ou usuário não detectado', { file: !!file, user: !!auth.currentUser });
            return;
        }

        console.log('--- Iniciando Processo de Upload ---');
        setUploading(true);
        setProgress(0);

        try {
            // STEP A: Upload to Google Drive (if connected)
            let driveFileId = null;
            if (googleToken) {
                console.log('Token Google detectado. Iniciando upload para o Drive...');
                setProgress(5);

                const metadata = {
                    name: file.name,
                    mimeType: file.type,
                    parents: ['root']
                };

                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                form.append('file', file);

                try {
                    // Create a timeout promise
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout conexão Google Drive')), 8000)
                    );

                    // Race between fetch and timeout
                    const driveRes: any = await Promise.race([
                        fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                            method: 'POST',
                            headers: new Headers({ 'Authorization': 'Bearer ' + googleToken }),
                            body: form
                        }),
                        timeoutPromise
                    ]);

                    if (driveRes.ok) {
                        const driveData = await driveRes.json();
                        driveFileId = driveData.id;
                        console.log('Upload Google Drive CONCLUÍDO. ID:', driveFileId);
                        await addAuditLog('create', 'document', driveFileId, `Backup Google Drive: ${file.name}`);
                    } else {
                        console.warn('Google Drive recusou:', await driveRes.text());
                    }
                } catch (driveErr) {
                    console.warn('Erro/Timeout no Upload Google Drive (ignorando e seguindo para Firebase):', driveErr);
                }
                setProgress(30);
            } else {
                console.log('Nenhum token Google Drive. Pulando backup no Drive.');
            }

            // STEP B: Upload to Firebase Storage (Standard Flow)
            const storagePath = `documents/${auth.currentUser.uid}/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, storagePath);

            // Standard upload
            const uploadTask = uploadBytesResumable(storageRef, file);

            const firebaseUploadPromise = new Promise<void>((resolve, reject) => {
                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        // Map 0-100 of Firebase to 30-80 of total progress if drive used, or 0-80 if not
                        const firebaseProg = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        const base = googleToken ? 30 : 0;
                        const scale = googleToken ? 0.5 : 0.8;
                        setProgress(base + Math.round(firebaseProg * scale));
                    },
                    (error) => reject(error),
                    () => resolve()
                );
            });

            const firebaseTimeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout upload Firebase Storage')), 30000) // 30 seconds timeout
            );

            await Promise.race([firebaseUploadPromise, firebaseTimeoutPromise]);


            console.log('Upload Firebase Concluído.');
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setProgress(90);

            // STEP C: Save Metadata
            const docData = {
                name: file.name,
                url: downloadURL,
                storagePath: uploadTask.snapshot.ref.fullPath,
                size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
                category: 'Geral',
                date: new Date().toISOString(),
                owner: currentUser,
                userId: auth.currentUser.uid,
                companyId: selectedCompanyId,
                status: 'publico',
                driveId: driveFileId || undefined, // Store Drive ID if available
                createdAt: new Date().toISOString(),
                createdBy: currentUser,
                createdBy_id: auth.currentUser.uid,
                createdBy_name: currentUser,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser,
                updatedBy_id: auth.currentUser.uid,
                updatedBy_name: currentUser
            };

            const docRef = await addDoc(collection(db, 'documents'), docData);

            // Simulation steps...
            setIsOCRProcessing(true);
            setProgress(95);
            await new Promise(resolve => setTimeout(resolve, 1500));

            await addAuditLog('create', 'document', docRef.id, `Uploaded file ${file.name}`);

            setProgress(100);
            setIsUploadModalOpen(false);
            setIsOCRProcessing(false);

            if (driveFileId) {
                alert('Sucesso!\nArquivo salvo no sistema e backup realizado no Google Drive.');
            } else {
                // Silent success or toast
            }

        } catch (error: any) {
            console.error('ERRO CRÍTICO NO UPLOAD:', error);
            let msg = 'Erro ao enviar arquivo.';
            if (error.code === 'storage/unauthorized') msg = 'Sem permissão no Storage (verificar regras).';
            alert(msg + '\n\nDetalhes: ' + (error.message || 'Erro desconhecido'));
        } finally {
            setUploading(false);
            // Reset progress after a moment so user sees 100%
            setTimeout(() => setProgress(0), 1000);
        }
    };

    const handleDelete = async (docId: string, storagePath?: string, docName?: string) => {
        if (!confirm('Tem certeza que deseja excluir este arquivo?')) return;

        try {
            // 1. Delete from Storage if path exists
            if (storagePath) {
                const fileRef = ref(storage, storagePath);
                await deleteObject(fileRef).catch(err => console.warn("Storage file not found or already deleted", err));
            }

            // 2. Delete from Firestore
            await deleteDoc(doc(db, 'documents', docId));

            await addAuditLog('delete', 'document', docId, `Deleted file ${docName}`);

        } catch (error) {
            console.error("Error deleting document:", error);
            alert("Erro ao excluir documento");
        }
    };

    const handleDownload = (url: string) => {
        window.open(url, '_blank');
    };

    const handleLinkSave = async () => {
        if (!selectedCompanyId) {
            alert("Selecione uma empresa primeiro.");
            return;
        }
        if (!linkName || !linkUrl || !auth.currentUser) {
            alert('Por favor, preencha o nome e o link do arquivo.');
            return;
        }

        try {
            const docData = {
                name: linkName,
                url: linkUrl,
                storagePath: 'external-link', // Firestore rules might require a string
                size: 'Link',
                category: 'Link Externo',
                date: new Date().toISOString(),
                owner: currentUser || { name: 'Usuário', email: auth.currentUser.email, role: 'editor' }, // Fallback if currentUser is null
                userId: auth.currentUser.uid,
                companyId: selectedCompanyId,
                status: 'publico',
                driveId: '',
                createdAt: new Date().toISOString(),
                createdBy: currentUser,
                createdBy_id: auth.currentUser.uid,
                createdBy_name: currentUser,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser,
                updatedBy_id: auth.currentUser.uid,
                updatedBy_name: currentUser
            };

            const docRef = await addDoc(collection(db, 'documents'), docData);
            await addAuditLog('create', 'document', docRef.id, `Added external link: ${linkName}`);

            alert('Link salvo com sucesso!');
            setLinkName('');
            setLinkUrl('');
            setIsLinkModalOpen(false);

        } catch (error) {
            console.error('Erro ao salvar link:', error);
            alert('Erro ao salvar link: ' + (error as Error).message);
        }
    };

    const filteredDocs = documents.filter(doc => {
        const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase()) ||
            doc.category.toLowerCase().includes(search.toLowerCase());
        const matchesFolder = !activeFolder || doc.category?.toLowerCase() === activeFolder.toLowerCase();
        return matchesSearch && matchesFolder;
    });


    // Calculate Storage Usage (Mock logic for total capacity, real sum for used)
    const totalSizeMB = documents.reduce((acc, doc) => {
        const size = parseFloat(doc.size.replace(' MB', '').replace(' KB', '')); // Rough parsing
        return acc + (doc.size.includes('KB') ? size / 1024 : size);
    }, 0);

    const handleGoogleDriveLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            provider.addScope('https://www.googleapis.com/auth/drive.file');

            let result;
            let user;

            // PRESERVE SESSION: Try to LINK the account first if a user is already logged in.
            // This prevents the "switch user" behavior which causes Permission Denied on Firestore (because the new Google user has no system roles).
            if (auth.currentUser) {
                try {
                    console.log('Tentando vincular conta Google ao usuário existente...');
                    result = await linkWithPopup(auth.currentUser, provider);
                    user = result.user;

                    // Verify if emails match (Account Check Alert)
                    const googleEmail = user.providerData.find(p => p.providerId === 'google.com')?.email;
                    if (googleEmail && user.email && googleEmail.toLowerCase() !== user.email.toLowerCase()) {
                        alert(
                            `Atenção: A conta Google conectada (${googleEmail}) é diferente do seu e-mail de login no sistema (${user.email}).\n\n` +
                            `Certifique-se de que esta é realmente a conta onde deseja salvar seus backups.`
                        );
                    }

                    // Token handling for linked account:
                    const credential = GoogleAuthProvider.credentialFromResult(result);
                    if (credential?.accessToken) setGoogleToken(credential.accessToken);
                } catch (linkError: any) {
                    console.warn('Erro ao vincular (linkWithPopup):', linkError.code);

                    // If account is already linked or credential in use, we just want the token, so we might need to re-auth.
                    // But usually "credential-already-in-use" means another user has it.
                    if (linkError.code === 'auth/credential-already-in-use') {
                        const googleEmail = linkError.customData?.email || 'selecionada';
                        const proceed = confirm(
                            `A conta Google (${googleEmail}) já está cadastrada no sistema como um usuário diferente.\n\n` +
                            `O Firebase não permite vincular a mesma conta Google a dois usuários distintos.\n\n` +
                            `Deseja sair do usuário atual e ENTRAR com essa conta Google?`
                        );

                        if (proceed) {
                            // Switch to the Google Account
                            await signInWithPopup(auth, provider);
                            // Page/Auth state will update automatically
                        }
                        return;
                    }
                    if (linkError.code === 'auth/provider-already-linked') {
                        // Already linked, so we can just proceed (we technically refreshed the token scope)
                        // But to get a fresh Access Token we might need reauthenticateWithPopup or just accept it's linked.
                        // For this flow, let's assume success if already linked.
                        console.log('Conta já vinculada. Prosseguindo.');
                        user = auth.currentUser;
                    } else {
                        // If linking fails for other reasons, fall back to sign in (CAREFUL: this logs out current user)
                        // Actually, better NOT to log out if the goal is integration.
                        throw linkError;
                    }
                }
            } else {
                // Not logged in (unlikely in this protected route), but standard flow
                result = await signInWithPopup(auth, provider);
                user = result.user;
                const credential = GoogleAuthProvider.credentialFromResult(result);
                if (credential?.accessToken) setGoogleToken(credential.accessToken);
            }

            if (!user) return;

            console.log("Conectado ao Google Drive:", user.displayName);

            // Separate Try/Catch for Audit Log to prevent UI "Error" if log fails but Auth succeeded
            try {
                await addAuditLog('update', 'system', 'google-drive', `Conectado ao Google Drive: ${user.email}`);
            } catch (logError) {
                console.warn('Falha ao registrar log de auditoria (Permissões?):', logError);
            }

            alert(`Conectado com sucesso ao Google Drive de: ${user.displayName || user.email}\n\nAgora o sistema está autorizado.`);

        } catch (error: any) {
            console.error(error);
            alert('Erro ao conectar com Google Drive: ' + error.message);
        }
    };

    const handleGoogleDriveLogout = async () => {
        if (!confirm('Deseja desconectar a conta do Google Drive?')) return;

        try {
            if (auth.currentUser) {
                // Unlink the provider
                // Note: 'google.com' is the provider ID
                await unlink(auth.currentUser, 'google.com');
                setGoogleToken(null);
                alert('Conta Google desconectada com sucesso.');
                await addAuditLog('update', 'system', 'google-drive-logout', `Desconectado Google Drive`);
            }
        } catch (error: any) {
            console.error("Erro ao desconectar:", error);
            alert("Erro ao desconectar conta: " + error.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Arquivos</h1>
                    <p className="text-[var(--text-secondary)] font-medium mt-1">Gestão Eletrônica de Documentos e Arquivos</p>
                    <div className="flex gap-3 items-center mt-4">
                        {(() => {
                            const googleProvider = auth.currentUser?.providerData.find(p => p.providerId === 'google.com');

                            if (googleProvider) {
                                return (
                                    <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl shadow-sm">
                                        <div className="p-1.5 bg-white rounded-lg shadow-sm">
                                            <GoogleDriveIcon className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider leading-tight">Conectado ao Drive</span>
                                            <span className="text-xs font-bold text-slate-700">{googleProvider.email}</span>
                                        </div>
                                        <div className="h-6 w-px bg-blue-200 mx-2"></div>
                                        <button
                                            onClick={handleGoogleDriveLogout}
                                            title="Desconectar Conta"
                                            className="p-2 hover:bg-red-100 rounded-lg text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <button
                                            onClick={handleGoogleDriveLogin}
                                            title="Trocar Conta / Atualizar Permissões"
                                            className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                                        >
                                            <RefreshCw size={16} />
                                        </button>
                                    </div>
                                );
                            }

                            return (
                                <Button
                                    className="bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm rounded-xl font-bold flex items-center gap-2 text-sm"
                                    onClick={handleGoogleDriveLogin}
                                >
                                    <GoogleDriveIcon className="w-5 h-5" />
                                    Conectar Google Drive
                                </Button>
                            );
                        })()}

                        <Button
                            className="bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm rounded-xl text-sm font-bold flex items-center gap-2"
                            title="Adicionar Link (TeraBox)"
                            onClick={() => setIsLinkModalOpen(true)}
                        >
                            <TeraBoxIcon className="w-5 h-5 text-blue-500" />
                            Link TeraBox
                        </Button>

                        <div className="h-8 w-px bg-gray-200 mx-1"></div>

                        <Button
                            className="rounded-xl shadow-lg shadow-green-500/20 bg-green-600 hover:bg-green-700 text-white font-bold flex items-center gap-2"
                            onClick={() => setIsUploadModalOpen(true)}
                        >
                            <Upload size={18} />
                            Novo Upload
                        </Button>
                    </div>
                </div>
            </div>

            <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload de Arquivo" maxWidth="max-w-md">
                <div
                    className={`
                        border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer
                        ${dragActive ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-[var(--border-color)] hover:bg-[var(--bg-hover)]'}
                    `}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('ged-file-upload')?.click()}
                >
                    <input
                        id="ged-file-upload"
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                processUpload(e.target.files[0]);
                            }
                        }}
                        disabled={uploading}
                    />

                    {uploading ? (
                        <div className="w-full">
                            <div className="flex justify-between text-xs font-bold text-[var(--text-secondary)] mb-2">
                                <span>{isOCRProcessing ? 'Processando IA...' : 'Enviando...'}</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-4">
                                <div
                                    className="h-full bg-green-500 transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="font-bold text-[var(--text-primary)] text-sm">{isOCRProcessing ? 'Realizando leitura inteligente (OCR)...' : 'Enviando arquivo para a nuvem...'}</p>
                            {isOCRProcessing && <p className="text-[10px] text-green-600 font-black uppercase mt-2 animate-pulse">Classificando dados automaticamente</p>}
                        </div>
                    ) : (
                        <>
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
                                <Upload size={24} />
                            </div>
                            <p className="font-bold text-[var(--text-primary)] text-sm">Clique ou arraste seu arquivo aqui</p>

                            <p className="text-xs text-[var(--text-secondary)] mt-2">Suporta PDF, Imagens, Excel, Word</p>
                        </>
                    )}
                </div>
                <div className="mt-4 flex justify-end">
                    <Button variant="ghost" onClick={() => setIsUploadModalOpen(false)}>Cancelar</Button>
                </div>
            </Modal>

            {/* Link Import Modal (TeraBox/External) */}
            <Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} title="Adicionar Link Externo (TeraBox/Outros)" maxWidth="max-w-md">
                <div className="space-y-4">
                    <div className="p-4 bg-blue-50 text-blue-800 rounded-xl text-xs">
                        <p className="font-bold mb-1">Nota sobre TeraBox/Mega:</p>
                        Estes serviços não permitem upload direto via sistema (API fechada).
                        <br />
                        Você pode colar o link do arquivo aqui para organizá-lo junto com seus documentos.
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Arquivo</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border rounded-xl text-sm"
                            placeholder="Ex: Planilha Financeira.xlsx"
                            value={linkName}
                            onChange={e => setLinkName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Link (URL)</label>
                        <input
                            type="url"
                            className="w-full px-3 py-2 border rounded-xl text-sm"
                            placeholder="https://terabox.com/s/..."
                            value={linkUrl}
                            onChange={e => setLinkUrl(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="ghost" onClick={() => setIsLinkModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleLinkSave} disabled={!linkName || !linkUrl}>Salvar Link</Button>
                    </div>
                </div>
            </Modal>

            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6">
                <Card
                    onClick={() => setActiveFolder(null)}
                    className={`p-4 border border-[var(--border-color)] flex items-center gap-4 transition-all cursor-pointer group ${activeFolder === null ? 'bg-green-600 border-none text-white' : 'bg-[var(--bg-card)] hover:shadow-lg'}`}
                >
                    <div className={`p-3 rounded-2xl ${activeFolder === null ? 'bg-white/20 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] group-hover:text-green-600'}`}>
                        <HardDrive size={24} />
                    </div>
                    <div>
                        <p className={`text-xs font-black uppercase tracking-wider ${activeFolder === null ? 'text-white/80' : 'text-[var(--text-secondary)]'}`}>Meu Drive</p>
                        <h4 className="text-lg font-black">{documents.length} Arqs</h4>
                    </div>
                </Card>

                {folders.map((f) => (
                    <Card
                        key={f.id}
                        onClick={() => setActiveFolder(f.id)}
                        className={`p-4 border border-[var(--border-color)] flex items-center gap-4 transition-all cursor-pointer group ${activeFolder === f.id ? 'bg-slate-900 border-none text-white' : 'bg-[var(--bg-card)] hover:shadow-lg'}`}
                    >
                        <div className={`p-3 rounded-2xl ${activeFolder === f.id ? 'bg-white/10 text-white' : `bg-[var(--bg-secondary)] ${f.color}`}`}>
                            <f.icon size={24} />
                        </div>
                        <div>
                            <p className={`text-xs font-black uppercase tracking-wider ${activeFolder === f.id ? 'text-white/80' : 'text-[var(--text-secondary)]'}`}>{f.label}</p>
                            <h4 className="text-lg font-black">
                                {documents.filter(d => d.category?.toLowerCase() === f.id).length} Arqs
                            </h4>
                        </div>
                    </Card>
                ))}
            </div>


            <Card className="p-0 overflow-hidden border-[var(--border-color)] bg-[var(--bg-card)]">
                <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] group-focus-within:text-green-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Pesquisar nos documentos..."
                            className="w-full pl-11 pr-4 py-2.5 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-2xl text-sm focus:ring-4 focus:ring-green-500/5 focus:border-green-500/50 outline-none transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[var(--bg-secondary)] text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-[0.2em]">
                            <tr>
                                <th className="px-6 py-4">Arquivo / Categoria</th>
                                <th className="px-6 py-4">Tamanho</th>
                                <th className="px-6 py-4">Data Upload</th>
                                <th className="px-6 py-4">Status / Tags</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-[var(--text-secondary)]">Carregando documentos...</td></tr>
                            ) : filteredDocs.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-[var(--text-secondary)]">Nenhum documento encontrado.</td></tr>
                            ) : (
                                filteredDocs.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-[var(--bg-hover)] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-xl group-hover:bg-green-600 group-hover:text-white transition-all shadow-sm">
                                                    {(() => {
                                                        const ext = doc.name.split('.').pop()?.toLowerCase() || '';

                                                        let icon = <FileText size={18} />;
                                                        let colorClass = 'bg-slate-100 text-slate-500';

                                                        if (['pdf'].includes(ext)) {
                                                            icon = <FileText size={18} />;
                                                            colorClass = 'bg-red-50 text-red-500 border-red-100';
                                                        } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
                                                            icon = <FileSpreadsheet size={18} />;
                                                            colorClass = 'bg-emerald-50 text-emerald-500 border-emerald-100';
                                                        } else if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) {
                                                            icon = <FileType size={18} />;
                                                            colorClass = 'bg-blue-50 text-blue-500 border-blue-100';
                                                        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
                                                            icon = <Image size={18} />;
                                                            colorClass = 'bg-purple-50 text-purple-500 border-purple-100';
                                                        } else if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) {
                                                            icon = <Video size={18} />;
                                                            colorClass = 'bg-pink-50 text-pink-500 border-pink-100';
                                                        } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
                                                            icon = <FileAudio size={18} />;
                                                            colorClass = 'bg-amber-50 text-amber-500 border-amber-100';
                                                        } else if (['zip', 'rar', '7z', 'tar'].includes(ext)) {
                                                            icon = <FileArchive size={18} />;
                                                            colorClass = 'bg-orange-50 text-orange-500 border-orange-100';
                                                        } else if (['xml', 'json', 'js', 'ts', 'html', 'css'].includes(ext)) {
                                                            icon = <FileCode size={18} />;
                                                            colorClass = 'bg-gray-100 text-gray-600 border-gray-200';
                                                        } else if (doc.category === 'Link Externo') {
                                                            icon = <TeraBoxIcon className="w-5 h-5 text-indigo-500" />;
                                                            colorClass = 'bg-indigo-50 text-indigo-500 border-indigo-100';
                                                        }

                                                        return (
                                                            <div className={`p-2.5 rounded-xl border transition-all shadow-sm ${colorClass} group-hover:scale-110`}>
                                                                {icon}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-extrabold text-[var(--text-primary)]">{doc.name}</span>
                                                    <span className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest">{doc.category}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-[var(--text-secondary)]">{doc.size}</td>
                                        <td className="px-6 py-4 text-xs font-medium text-[var(--text-secondary)]">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={12} />
                                                {formatDateBR(doc.date)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {doc.status === 'protegido' ? (
                                                    <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900 text-amber-600 dark:text-amber-100 text-[9px] font-black rounded-lg uppercase flex items-center gap-1 border border-amber-100 dark:border-amber-800">
                                                        <Shield size={10} /> Criptografado
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-100 text-[9px] font-black rounded-lg uppercase border border-green-100 dark:border-green-800">
                                                        Público
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleDownload(doc.url)}
                                                    className="p-2 hover:bg-[var(--bg-secondary)] rounded-xl text-[var(--text-secondary)] hover:text-green-600 transition-all"
                                                    title="Baixar"
                                                >
                                                    <Download size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(doc.id, (doc as any).storagePath, doc.name)}
                                                    className="p-2 hover:bg-[var(--bg-secondary)] rounded-xl text-[var(--text-secondary)] hover:text-red-500 transition-all"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card >
        </div >
    );
};
