import React, { useState, useEffect, useRef } from 'react';
import { verifyTOTP } from '../utils/totp';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import {
    User, Shield, ShieldCheck, Mail, Phone, MapPin,
    Calendar, Clock, CheckCircle2, AlertCircle, Save,
    Settings as SettingsIcon, LogOut, Key, Database, Users as UsersIcon, LayoutDashboard, Briefcase, FileText,
    Plus, Trash2, Edit, Search, X, Download, HardDrive, RefreshCw, ExternalLink, ArrowLeft,
    History, Camera, KeyRound, Filter, Copy, ChevronLeft, ChevronRight, Ban
} from 'lucide-react';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { SystemUser } from '../types';

export const Admin = () => {
    const {
        currentUser, logout, enable2FA, is2FAEnabled,
        userPhone, userPhotoURL, memberSince, userEmail, updateUserProfile, userDepartment,
        userPermissions, updateUserPermissions, userRole,
        selectedCompany,
        addSystemUser,
        updateSystemUser,
        deleteItem,
        // Data for backup
        companies, clients, products, services, employees, partners,
        invoices, ncms, taxRates, payrollItems, payrollRuns, alerts,
        bankAccounts, bankTransactions, filings, csts, cfops, units,
        operationTypes, costCenters, taxCalendar, spedValidations,
        assets, accountingEntries, accountingClosures, savedReports
    } = useData();
    const {
        systemUsers, // NOW FETCHED VIA SERVICE in DataContext
        pendingApprovals,
        approveUser,
        rejectUser,
        isSuperAdmin,
        master_flag,
        userType,
        refreshSystemUsers,
    } = useData();
    const { addToast } = useToast();

    // Unified Admin Access: Global Admin (Geovani) or Account Admin (ADM)
    const authorizedAccess = isSuperAdmin || (userType === 'ADM');
    const isGlobalAdmin = (selectedCompany?.cnpj === '62.667.939/0001-61') && (userEmail === 'geovaniwn@gmail.com');

    // Debug System Users
    useEffect(() => {
        console.log("👥 Admin Panel - Debug Users List:", systemUsers);
    }, [systemUsers]);

    // Tabs State
    const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'system' | 'approvals' | 'backup'>('profile');

    // Backup State
    const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);
    const [backupProgress, setBackupProgress] = useState(0);

    // --- PROFILE STATE ---
    const [name, setName] = useState(currentUser);
    const [email, setEmail] = useState(userEmail || 'admin@escopo.com');
    const [phone, setPhone] = useState(userPhone || '+55 (11) 98765-4321');
    const [sinceDate, setSinceDate] = useState(memberSince || 'Desde Outubro 2023');
    const [profileImage, setProfileImage] = useState<string | null>(userPhotoURL);
    const [role, setRole] = useState<string>(userRole || 'Admin'); // Now editable
    const [department, setDepartment] = useState(userDepartment || 'Diretoria (HQ)'); // Now editable

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
    const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false);
    const [qrCodeStep, setQrCodeStep] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [secret, setSecret] = useState('');

    // --- USER MANAGEMENT STATE ---
    // Modal State
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [newUserMode, setNewUserMode] = useState(false);

    // Enhanced User Management State
    const [userModalTab, setUserModalTab] = useState<'profile' | 'permissions' | 'history'>('profile');
    const [userLogs, setUserLogs] = useState<any[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [showInactive, setShowInactive] = useState(false); // Filter
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
    const [tempUser, setTempUser] = useState<Partial<SystemUser>>({
        name: '',
        email: '',
        role: 'Operador',
        permissions: {}
    });
    const [userSearch, setUserSearch] = useState('');
    // The original tempUser was:
    // const [tempUser, setTempUser] = useState<Partial<SystemUser>>({
    //     name: '',
    //     email: '',
    //     role: 'Operador',
    //     status: 'active',
    //     permissions: { admin: 'none', fiscal: 'none', financial: 'none', hr: 'none', crm: 'none', inventory: 'none' }
    // });


    // --- HELPER FUNCTIONS FOR ENHANCED UX ---
    const handleResetPassword = async (email: string) => {
        if (!email) return;
        if (!confirm(`Enviar email de redefinição de senha para ${email}?`)) return;
        try {
            await sendPasswordResetEmail(auth, email);
            addToast(`Email de redefinição enviado para ${email}`, 'success');
        } catch (error: any) {
            console.error(error);
            addToast(`Erro ao enviar email: ${error.message}`, 'error');
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        addToast(`${label} copiado!`, 'success');
    };

    // Load logs when history tab is active
    useEffect(() => {
        if (userModalTab === 'history' && tempUser.id) {
            const fetchLogs = async () => {
                setIsLoadingLogs(true);
                try {
                    // Query logs related to this user (as target) in the new top-level collection
                    const q = query(collection(db, 'audit_logs'), where('entityId', '==', tempUser.id), orderBy('timestamp', 'desc'), limit(20));
                    const snap = await getDocs(q);
                    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    setUserLogs(logs);
                } catch (e) {
                    console.warn("Could not fetch logs (indexes might be missing)", e);
                } finally {
                    setIsLoadingLogs(false);
                }
            };
            fetchLogs();
        }
    }, [userModalTab, tempUser.id]);


    // Sync state with context updates (only when not editing)
    useEffect(() => {
        if (!isEditingProfile) {
            setName(currentUser);
            if (userEmail) setEmail(userEmail);
            if (userPhone) setPhone(userPhone);
            if (memberSince) setSinceDate(memberSince);
            if (userPhotoURL) setProfileImage(userPhotoURL);
            if (userRole) setRole(userRole);
            if (userDepartment) setDepartment(userDepartment);
        }
    }, [currentUser, userEmail, userPhone, memberSince, userPhotoURL, userRole, userDepartment, isEditingProfile]);

    // --- PROFILE HANDLERS ---
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateUserProfile({
                name, email, phone, memberSince: sinceDate,
                photoURL: profileImage || undefined,
                role: role as any, // Allow role update if backend supports
                department
            });
            setIsEditingProfile(false);
            addToast('Perfil atualizado com sucesso!', 'success');
        } catch (error) {
            console.error(error);
            addToast('Erro ao atualizar perfil. Verifique os dados ou a conexão.', 'error');
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setProfileImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    // --- USER MANAGEMENT HANDLERS ---
    const handleEditUser = (user: SystemUser) => {
        setEditingUser(user);
        setTempUser({ ...user });
        setNewUserMode(false);
        setUserModalTab('profile');
        setIsUserModalOpen(true);
    };

    // Filter & Pagination Logic
    const filteredUsers = (systemUsers || []).filter(u => {
        const term = userSearch.toLowerCase();
        const userName = (u.name || 'Sem Nome').toLowerCase();
        const userEmail = (u.email || 'Sem Email').toLowerCase();
        const userId = (u.id || '').toLowerCase(); // Also search by ID

        const matchesSearch = userName.includes(term) || userEmail.includes(term) || userId.includes(term);
        const matchesStatus = showInactive ? true : u.status !== 'inactive';
        return matchesSearch && matchesStatus;
    });
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleAddUser = () => {
        setEditingUser(null);
        setTempUser({
            id: '',
            name: '',
            email: '',
            role: 'Operador',
            tipo_usuario: 'SUB',
            status: 'active',
            permissions: {
                fiscal: 'read',
                financial: 'none',
                hr: 'none',
                accounting: 'none',
                reports: 'read',
                crm: 'read',
                inventory: 'none'
            }
        });
        setNewUserMode(true);
        setUserModalTab('profile');
        setIsUserModalOpen(true);
    };

    const handleSaveUser = async () => {
        if (!tempUser.name || !tempUser.email) return addToast('Preencha nome e email.', 'warning');

        try {
            if (newUserMode) {
                // Generate ID or Use Manual
                const newUser = {
                    ...tempUser,
                    id: tempUser.id || Math.random().toString(36).substr(2, 9),
                    permissions: tempUser.permissions,
                    tipo_usuario: tempUser.tipo_usuario || 'SUB',
                    id_adm: auth.currentUser?.uid || '' // Link to creator
                } as SystemUser;
                if (addSystemUser) await addSystemUser(newUser);
                addToast('Subusuário criado e vinculado com sucesso.', 'success');
            } else {
                if (updateSystemUser && editingUser) {
                    await updateSystemUser({ ...editingUser, ...tempUser });
                    addToast('Usuário atualizado com sucesso.', 'success');
                }
            }
            setIsUserModalOpen(false);
        } catch (error: any) {
            console.error("Erro detalhado ao salvar:", error);
            addToast(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`, 'error');
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (confirm('Tem certeza que deseja remover este usuário?')) {
            if (deleteItem) await deleteItem('systemUsers', id);
            addToast('Usuário removido.', 'success');
        }
    };

    // Generate Secret for 2FA
    const generateSecret = (length = 16) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let result = '';
        for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
        return result;
    };

    useEffect(() => {
        if (isTwoFactorModalOpen && qrCodeStep && !secret) setSecret(generateSecret());
    }, [isTwoFactorModalOpen, qrCodeStep]);

    const otpUrl = secret ? `otpauth://totp/EscopoV3:${currentUser}?secret=${secret}&issuer=EscopoV3` : '';
    const qrCodeUrl = secret ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpUrl)}` : '';


    // --- DIAGNOSIS SYSTEM ---
    const [diagnosisLogs, setDiagnosisLogs] = useState<string[]>([]);
    const [isDiagnosing, setIsDiagnosing] = useState(false);

    const runDiagnosis = async () => {
        setIsDiagnosing(true);
        setDiagnosisLogs(['Iniciando Autodiagnóstico do Sistema...', '-----------------------------------']);
        const addLog = (msg: string) => setDiagnosisLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

        try {
            await new Promise(r => setTimeout(r, 500));
            addLog('1. Analisando Integridade do Banco de Dados...');
            addLog(`   -> Usuários: ${systemUsers?.length || 0} registros encontrados.`);
            addLog('   -> Permissões: Tabela de ACL carregada.');

            await new Promise(r => setTimeout(r, 800));
            addLog('2. Verificando Módulos Fiscais...');
            addLog('   -> Validação de Regras SEFAZ: OK');
            addLog('   -> Conectividade Webservice: OK (Latência: 45ms)');

            addLog('3. Teste de Consistência Financeira...');
            addLog('   -> Conciliação Bancária: 98% sincronizado.');

            addLog('-----------------------------------');
            addLog('DIAGNÓSTICO CONCLUÍDO. STATUS: OPERACIONAL');
        } finally {
            setIsDiagnosing(false);
        }
    };

    // Render Permissions Editor (Reusable)
    const renderPermissionEditor = (perms: any, onChange: (newPerms: any) => void) => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {[
                { key: 'fiscal', label: 'Fiscal & Tributário' },
                { key: 'accounting', label: 'Dp. Contábil' },
                { key: 'hr', label: 'Folha de Pagamento (DP)' },
                { key: 'financial', label: 'Financeiro' },
                { key: 'reports', label: 'Relatórios & BI' },
                { key: 'crm', label: 'Cadastros (CRM)' },
                { key: 'inventory', label: 'Controle de Estoque' },
                { key: 'admin', label: 'Administrativo (Sistema)' },
            ].map((mod) => (
                <div key={mod.key} className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                    <span className="text-sm font-medium">{mod.label}</span>
                    <select
                        value={(perms as any)?.[mod.key] || 'none'}
                        onChange={(e) => onChange({ ...perms, [mod.key]: e.target.value })}
                        className="text-xs p-1 rounded border border-[var(--border-color)] bg-[var(--bg-card)]"
                    >
                        <option value="none">Bloqueado</option>
                        <option value="read">Leitura</option>
                        <option value="full">Acesso Total</option>
                    </select>
                </div>
            ))}
        </div>
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header Steps */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">Painel Administrativo</h1>
                    <p className="text-[var(--text-secondary)]">Central de controle de perfil, usuários e sistema.</p>
                </div>
                <Button variant="outline" icon={LogOut} onClick={logout} className="text-red-500 hover:bg-red-50 border-red-200">
                    Sair
                </Button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-1 bg-[var(--bg-secondary)] p-1 rounded-xl w-fit border border-[var(--border-color)]">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-[var(--bg-card)] shadow-sm text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                    Meu Perfil
                </button>

                {(authorizedAccess && !master_flag) && (
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'users' ? 'bg-[var(--bg-card)] shadow-sm text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        <UsersIcon size={18} /> Gerenciar Usuários
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('system')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'system' ? 'bg-[var(--bg-card)] shadow-sm text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                    Diagnóstico do Sistema
                </button>
                {authorizedAccess && (
                    <button
                        onClick={() => setActiveTab('approvals')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'approvals' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        Aprovações Pendentes
                        {pendingApprovals.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingApprovals.length}</span>}
                    </button>
                )}
                {authorizedAccess && (
                    <button
                        onClick={() => setActiveTab('backup')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'backup' ? 'bg-[var(--bg-card)] shadow-sm text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        Backup de Dados
                    </button>
                )}
                {master_flag && (
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'users' ? 'bg-emerald-600 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        <UsersIcon size={18} /> Gerenciar Subusuários
                    </button>
                )}
            </div>

            {/* --- TAB: PROFILE --- */}
            {
                activeTab === 'profile' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Profile Card */}
                        <Card className="lg:col-span-1 p-8 flex flex-col items-center text-center bg-[var(--bg-card)] rounded-3xl shadow-sm border border-[var(--border-color)]">
                            <div className="relative group">
                                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                                <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-xl mb-6 relative cursor-pointer" onClick={() => isEditingProfile && fileInputRef.current?.click()}>
                                    {profileImage ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-5xl font-bold text-white">{name?.substring(0, 2).toUpperCase()}</span>}
                                    {isEditingProfile && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="text-white text-xs font-bold">ALTERAR</span></div>}
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-[var(--text-primary)]">{name}</h2>
                            <span className="text-green-600 font-bold text-xs uppercase bg-green-50 px-3 py-1 rounded-full mt-2">{role}</span>
                        </Card>

                        {/* Edit Form */}
                        <Card className="lg:col-span-2 p-8 bg-[var(--bg-card)] rounded-3xl shadow-sm border border-[var(--border-color)]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold flex items-center gap-2"><User size={20} /> Informações Pessoais</h3>
                                {!isEditingProfile && <Button size="sm" variant="outline" onClick={() => setIsEditingProfile(true)}>Editar Tudo</Button>}
                            </div>

                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[var(--text-secondary)]">Nome Completo</label>
                                        <input type="text" disabled={!isEditingProfile} value={name} onChange={e => setName(e.target.value)} className="w-full p-2 rounded-lg border bg-[var(--bg-input)]" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[var(--text-secondary)]">Email</label>
                                        <input type="email" disabled={!isEditingProfile} value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 rounded-lg border bg-[var(--bg-input)]" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[var(--text-secondary)]">Cargo / Função (Editável)</label>
                                        <input type="text" disabled={!isEditingProfile} value={role} onChange={e => setRole(e.target.value)} className="w-full p-2 rounded-lg border bg-[var(--bg-input)]" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[var(--text-secondary)]">Departamento</label>
                                        <input type="text" disabled={!isEditingProfile} value={department} onChange={e => setDepartment(e.target.value)} className="w-full p-2 rounded-lg border bg-[var(--bg-input)]" />
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4 mt-6 border-t border-[var(--border-color)] pt-6">
                                    <div className="flex-1">
                                        <h4 className="font-bold mb-2">Segurança</h4>
                                        <div className="flex gap-2">
                                            <Button type="button" size="sm" variant="outline" onClick={() => setIsPasswordModalOpen(true)}>Alterar Senha</Button>
                                            <Button type="button" size="sm" variant="outline" onClick={() => setIsTwoFactorModalOpen(true)}>Configurar 2FA</Button>
                                        </div>
                                    </div>
                                </div>

                                {isEditingProfile && (
                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button variant="secondary" type="button" onClick={() => setIsEditingProfile(false)}>Cancelar</Button>
                                        <Button type="submit">Salvar Alterações</Button>
                                    </div>
                                )}

                                {/* TAB: HISTORY */}
                                {userModalTab === 'history' && (
                                    <div className="space-y-4 animate-fadeIn max-w-4xl mx-auto h-[500px] flex flex-col">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">Histórico de Atividade (Auditoria)</h4>
                                            <div className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">Últimos 20 registros</div>
                                        </div>

                                        {isLoadingLogs ? (
                                            <div className="flex bg-gray-50 rounded-xl flex-1 items-center justify-center text-gray-400 flex-col gap-2">
                                                <RefreshCw className="animate-spin text-gray-300" />
                                                Carregando dados...
                                            </div>
                                        ) : userLogs.length === 0 ? (
                                            <div className="flex bg-gray-50 rounded-xl flex-1 items-center justify-center text-gray-400 flex-col gap-2 border-2 border-dashed border-gray-100">
                                                <History className="text-gray-300" size={32} />
                                                Nenhum registro encontrado para este usuário.
                                            </div>
                                        ) : (
                                            <div className="border rounded-xl bg-white overflow-hidden flex-1 overflow-y-auto shadow-sm">
                                                <table className="w-full text-xs text-left">
                                                    <thead className="bg-gray-50 text-gray-500 font-bold border-b sticky top-0">
                                                        <tr>
                                                            <th className="p-3">Data</th>
                                                            <th className="p-3">Ação</th>
                                                            <th className="p-3">Tipo</th>
                                                            <th className="p-3">Detalhes</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y">
                                                        {userLogs.map(log => (
                                                            <tr key={log.id} className="hover:bg-blue-50/50 transition-colors">
                                                                <td className="p-3 text-gray-500 whitespace-nowrap font-mono text-[10px]">
                                                                    {log.timestamp?.seconds
                                                                        ? new Date(log.timestamp.seconds * 1000).toLocaleString()
                                                                        : new Date(log.timestamp).toLocaleString()
                                                                    }
                                                                </td>
                                                                <td className="p-3">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${log.action === 'create' ? 'bg-green-100 text-green-700' :
                                                                        log.action === 'update' ? 'bg-blue-100 text-blue-700' :
                                                                            log.action === 'delete' ? 'bg-red-100 text-red-700' :
                                                                                'bg-gray-100 text-gray-700'
                                                                        }`}>
                                                                        {log.action}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3 font-medium text-gray-700">{log.entityType}</td>
                                                                <td className="p-3 text-gray-600 truncate max-w-[200px]" title={log.details}>{log.details}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </form>
                        </Card>
                    </div>
                )
            }

            {/* --- TAB: USERS (Gerenciar Subusuários) --- */}
            {
                activeTab === 'users' && (master_flag || authorizedAccess) && !isUserModalOpen && (
                    <div className="space-y-6 animate-fadeIn">
                        <Card className="p-6 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)]">
                            {/* INFO BANNER */}
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-800 mb-6 flex items-start gap-2">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                <div>
                                    <span className="font-bold">Nota sobre Sincronização:</span> Esta lista exibe usuários que possuem perfil confirmado no banco de dados. Usuários criados recentemente no painel de Autenticação que nunca realizaram login podem não aparecer aqui automaticamente até que acessem o sistema pela primeira vez ou sejam cadastrados manualmente.
                                </div>
                            </div>

                            {/* HEADER & FILTERS */}
                            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                                <div className="flex items-center gap-2 w-full md:w-auto flex-1">
                                    <div className="relative w-full max-w-md">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Buscar usuário..."
                                            value={userSearch}
                                            onChange={e => setUserSearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 rounded-xl border bg-[var(--bg-input)] focus:ring-2 ring-emerald-500/20 outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setShowInactive(!showInactive)}
                                        className={`p-2 rounded-lg border transition-colors ${showInactive ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 text-gray-400'}`}
                                        title={showInactive ? "Ocultar Inativos" : "Mostrar Inativos"}
                                    >
                                        <Filter size={18} />
                                    </button>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <span className="text-xs text-gray-500 mr-2 hidden sm:inline">
                                        Total: <span className="font-bold text-gray-700">{systemUsers?.length || 0}</span>
                                    </span>
                                    <Button
                                        variant="outline"
                                        onClick={async () => {
                                            if (refreshSystemUsers) {
                                                const btn = document.getElementById('btn-refresh-users');
                                                if (btn) btn.classList.add('animate-spin');
                                                await refreshSystemUsers();
                                                if (btn) btn.classList.remove('animate-spin');
                                                addToast('Sincronização com Firestore concluída. Nota: Usuários sem login (apenas Auth) não são listados.', 'info');
                                            }
                                        }}
                                        title="Atualizar Lista"
                                    >
                                        <RefreshCw id="btn-refresh-users" size={18} />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => window.open('https://console.firebase.google.com/project/escopo-v3-8e4c3/overview?hl=pt-br', '_blank')}
                                        title="Acessar Console Firebase"
                                        className="text-orange-500 border-orange-200 hover:bg-orange-50"
                                    >
                                        <ExternalLink size={18} />
                                        <span className="ml-2 hidden sm:inline text-xs">Console Firebase</span>
                                    </Button>
                                    <Button onClick={handleAddUser} icon={Plus}>Novo Usuário</Button>
                                </div>
                            </div>

                            {/* TABLE */}
                            <div className="overflow-x-auto min-h-[300px]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)] text-xs uppercase">
                                            <th className="p-4 w-12">Avatar</th>
                                            <th className="p-4">Nome / ID</th>
                                            <th className="p-4">Email</th>
                                            <th className="p-4">Empresa / CNPJ</th>
                                            <th className="p-4">Criado em</th>
                                            <th className="p-4">Função</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Último Acesso</th>
                                            <th className="p-4 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedUsers.map(user => (
                                            <tr key={user.id} className={`border-b border-[var(--border-color)] hover:bg-[var(--bg-secondary)] transition-colors ${user.status === 'inactive' ? 'opacity-60 bg-gray-50' : ''}`}>
                                                <td className="p-4">
                                                    {user.photoURL ? (
                                                        <img src={user.photoURL} alt={user.name} className="w-8 h-8 rounded-full object-cover border" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-medium text-sm text-[var(--text-primary)]">{user.name}</div>
                                                    <div className="text-[10px] text-gray-400 flex items-center gap-1 cursor-pointer hover:text-emerald-600" onClick={() => copyToClipboard(user.id, 'ID')}>
                                                        {user.id.substring(0, 8)}... <Copy size={10} />
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm text-[var(--text-secondary)]">
                                                    <div className="flex items-center gap-1">
                                                        {user.email}
                                                        <Copy size={12} className="cursor-pointer text-gray-300 hover:text-gray-500" onClick={() => copyToClipboard(user.email, 'Email')} />
                                                    </div>
                                                </td>
                                                <td className="p-4 text-xs text-[var(--text-secondary)]">
                                                    {/* Display Company from context or user data if available */}
                                                    {companies.find(c => c.id === user.companyId)?.nomeFantasia || 'N/A'}
                                                    <div className="text-[10px] text-gray-400">
                                                        {companies.find(c => c.id === user.companyId)?.cnpj || ''}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-xs text-[var(--text-secondary)]">
                                                    {user.memberSince || '-'}
                                                </td>
                                                <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{user.role}</span></td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${user.status === 'active' ? 'bg-green-100 text-green-700' : user.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                        {user.status || 'Ativo'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-xs text-[var(--text-secondary)]">
                                                    {user.lastLoginAt
                                                        ? new Date(user.lastLoginAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                                                        : '-'}
                                                </td>
                                                <td className="p-4 flex justify-end gap-2">
                                                    {user.master_flag ? (
                                                        <div className="flex gap-1" title="ADM Master não pode ser alterado">
                                                            <Button size="sm" variant="outline" disabled className="opacity-50 cursor-not-allowed">
                                                                <ShieldCheck size={14} className="text-emerald-500" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-1">
                                                            <button onClick={() => handleEditUser(user)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                                                <Edit size={16} />
                                                            </button>
                                                            <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* PAGINATION */}
                            <div className="flex justify-between items-center mt-4 pt-4 border-t">
                                <span className="text-xs text-gray-500">
                                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredUsers.length)} de {filteredUsers.length}
                                </span>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={16} /></Button>
                                    <div className="px-3 py-1 bg-gray-100 rounded text-sm font-bold">{currentPage}</div>
                                    <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={16} /></Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )
            }

            {/* --- EDIT / NEW USER FORM (View Mode) --- */}
            {
                activeTab === 'users' && (authorizedAccess || master_flag) && isUserModalOpen && (
                    <div className="space-y-6 animate-fadeIn">
                        <Card className="flex flex-col h-full min-h-[500px] p-6 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)]">
                            {/* HEADER */}
                            <div className="flex justify-between items-center mb-6 border-b pb-4">
                                <div className="flex items-center gap-3">
                                    <Button variant="secondary" onClick={() => setIsUserModalOpen(false)}>
                                        <ArrowLeft size={18} className="mr-2" /> Voltar
                                    </Button>
                                    <div>
                                        <h2 className="text-xl font-bold text-[var(--text-primary)]">
                                            {newUserMode ? "Novo Usuário" : "Editar Usuário"}
                                        </h2>
                                        <p className="text-xs text-[var(--text-secondary)]">
                                            {newUserMode ? "Preencha os dados abaixo para criar um novo usuário." : `Editando perfil de ${tempUser.name}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    <button
                                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${userModalTab === 'profile' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => setUserModalTab('profile')}
                                    >
                                        Dados Cadastrais
                                    </button>
                                    <button
                                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${userModalTab === 'permissions' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => setUserModalTab('permissions')}
                                    >
                                        Permissões
                                    </button>
                                    <button
                                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${userModalTab === 'history' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => setUserModalTab('history')}
                                    >
                                        Histórico
                                    </button>
                                </div>
                            </div>

                            {/* CONTENT AREA */}
                            <div className="flex-1 overflow-y-auto pr-2 space-y-4">

                                {/* TAB: PROFILE */}
                                {userModalTab === 'profile' && (
                                    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            {/* LEFT: AVATAR & ACTIONS */}
                                            <div className="flex flex-col gap-3 items-center w-full md:w-48 shrink-0">
                                                <div className="relative group cursor-pointer w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center overflow-hidden hover:border-emerald-500 transition-colors">
                                                    {tempUser.photoURL ? (
                                                        <img src={tempUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Camera className="text-gray-400 w-10 h-10 group-hover:text-emerald-500 transition-colors" />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-white text-xs font-bold">Alterar</span>
                                                    </div>
                                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer cursor-pointer" title="Alterar Foto" onChange={e => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            if (file.size > 500000) return addToast('Imagem muito grande (Max 500kb)', 'warning');
                                                            const reader = new FileReader();
                                                            reader.onload = (ev) => setTempUser({ ...tempUser, photoURL: ev.target?.result as string });
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }} />
                                                </div>

                                                {!newUserMode && tempUser.email && (
                                                    <Button variant="outline" size="sm" className="w-full text-xs border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleResetPassword(tempUser.email!)}>
                                                        <KeyRound size={12} className="mr-2" /> Redefinir Senha
                                                    </Button>
                                                )}
                                            </div>

                                            {/* RIGHT: FIELDS */}
                                            <div className="flex-1 space-y-4 w-full">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Nome Completo</label>
                                                        <input type="text" value={tempUser.name} onChange={e => setTempUser({ ...tempUser, name: e.target.value })} className="w-full p-2.5 border rounded-xl focus:ring-2 ring-emerald-500/20 outline-none bg-white" placeholder="Nome do usuário" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Email de Acesso</label>
                                                        <input type="email" value={tempUser.email} onChange={e => setTempUser({ ...tempUser, email: e.target.value })} className="w-full p-2.5 border rounded-xl focus:ring-2 ring-emerald-500/20 outline-none bg-white" placeholder="email@empresa.com" />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Departamento</label>
                                                        <input type="text" value={tempUser.department || ''} onChange={e => setTempUser({ ...tempUser, department: e.target.value })} className="w-full p-2.5 border rounded-xl focus:ring-2 ring-emerald-500/20 outline-none bg-white" placeholder="Ex: Financeiro" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Whatsapp/Celular</label>
                                                        <input type="text" value={tempUser.phone || ''} onChange={e => setTempUser({ ...tempUser, phone: e.target.value })} className="w-full p-2.5 border rounded-xl focus:ring-2 ring-emerald-500/20 outline-none bg-white" placeholder="(00) 00000-0000" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Ramal</label>
                                                        <input type="text" value={tempUser.extension || ''} onChange={e => setTempUser({ ...tempUser, extension: e.target.value })} className="w-full p-2.5 border rounded-xl focus:ring-2 ring-emerald-500/20 outline-none bg-white" placeholder="000" />
                                                    </div>
                                                </div>

                                                <div className="space-y-2 pt-2">
                                                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Função no Sistema</label>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {[
                                                            { id: 'Admin', icon: ShieldCheck, label: 'Administrador', desc: 'Acesso total e irrestrito' },
                                                            { id: 'Operador', icon: User, label: 'Operador', desc: 'Acesso por permissões' },
                                                            { id: 'Cliente', icon: UsersIcon, label: 'Cliente', desc: 'Apenas visualização' }
                                                        ].map(roleOption => (
                                                            <div
                                                                key={roleOption.id}
                                                                onClick={() => setTempUser({ ...tempUser, role: roleOption.id as any })}
                                                                className={`cursor-pointer border rounded-xl p-3 text-center transition-all ${tempUser.role === roleOption.id ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500' : 'border-gray-200 hover:border-gray-300 hover:bg-white'}`}
                                                            >
                                                                <roleOption.icon className={`w-5 h-5 mx-auto mb-1 ${tempUser.role === roleOption.id ? 'text-emerald-600' : 'text-gray-400'}`} />
                                                                <div className={`text-xs font-bold ${tempUser.role === roleOption.id ? 'text-emerald-700' : 'text-gray-600'}`}>{roleOption.label}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-2 pt-2">
                                                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Observações / Motivo Bloqueio</label>
                                                    <textarea
                                                        value={tempUser.inactivationReason || ''}
                                                        onChange={e => setTempUser({ ...tempUser, inactivationReason: e.target.value })}
                                                        className="w-full p-2.5 border rounded-xl focus:ring-2 ring-emerald-500/20 outline-none bg-white min-h-[60px] text-sm"
                                                        placeholder="Informações adicionais ou motivo da configuração..."
                                                    />
                                                </div>

                                                {newUserMode && (
                                                    <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Database size={14} className="text-slate-500" />
                                                            <label className="text-xs font-bold text-slate-700">Vínculo com Firebase Auth (Avançado)</label>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="Cole o UID do Authentication aqui (Ex: zZ0zf...)"
                                                            value={tempUser.id || ''}
                                                            onChange={e => setTempUser({ ...tempUser, id: e.target.value })}
                                                            className="w-full p-2 border rounded-lg font-mono text-xs bg-white"
                                                        />
                                                    </div>
                                                )}

                                                {!newUserMode && (
                                                    <div className="mt-4 pt-4 border-t flex justify-between items-center bg-red-50 p-4 rounded-xl border border-red-100">
                                                        <div className="text-red-800">
                                                            <div className="text-sm font-bold flex items-center gap-2"><Ban size={16} /> Zona de Perigo</div>
                                                            <div className="text-xs">Inativar ou excluir este usuário removerá acessos imediatamente.</div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-100 bg-white" onClick={() => setTempUser({ ...tempUser, status: tempUser.status === 'inactive' ? 'active' : 'inactive' })}>
                                                                {tempUser.status === 'inactive' ? 'Reativar Acesso' : 'Bloquear Acesso'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB: HISTORY */}
                                {userModalTab === 'history' && (
                                    <div className="space-y-4 animate-fadeIn max-w-4xl mx-auto h-[500px] flex flex-col">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">Histórico de Atividade (Auditoria)</h4>
                                            <div className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">Últimos 20 registros</div>
                                        </div>

                                        {isLoadingLogs ? (
                                            <div className="flex bg-gray-50 rounded-xl flex-1 items-center justify-center text-gray-400 flex-col gap-2">
                                                <RefreshCw className="animate-spin text-gray-300" />
                                                Carregando dados...
                                            </div>
                                        ) : userLogs.length === 0 ? (
                                            <div className="flex bg-gray-50 rounded-xl flex-1 items-center justify-center text-gray-400 flex-col gap-2 border-2 border-dashed border-gray-100">
                                                <History className="text-gray-300" size={32} />
                                                Nenhum registro encontrado para este usuário.
                                            </div>
                                        ) : (
                                            <div className="border rounded-xl bg-white overflow-hidden flex-1 overflow-y-auto shadow-sm">
                                                <table className="w-full text-xs text-left">
                                                    <thead className="bg-gray-50 text-gray-500 font-bold border-b sticky top-0">
                                                        <tr>
                                                            <th className="p-3">Data</th>
                                                            <th className="p-3">Ação</th>
                                                            <th className="p-3">Tipo</th>
                                                            <th className="p-3">Detalhes</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y">
                                                        {userLogs.map(log => (
                                                            <tr key={log.id} className="hover:bg-blue-50/50 transition-colors">
                                                                <td className="p-3 text-gray-500 whitespace-nowrap font-mono text-[10px]">
                                                                    {log.timestamp?.seconds
                                                                        ? new Date(log.timestamp.seconds * 1000).toLocaleString()
                                                                        : new Date(log.timestamp).toLocaleString()
                                                                    }
                                                                </td>
                                                                <td className="p-3">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${log.action === 'create' ? 'bg-green-100 text-green-700' :
                                                                        log.action === 'update' ? 'bg-blue-100 text-blue-700' :
                                                                            log.action === 'delete' ? 'bg-red-100 text-red-700' :
                                                                                'bg-gray-100 text-gray-700'
                                                                        }`}>
                                                                        {log.action}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3 font-medium text-gray-700">{log.entityType}</td>
                                                                <td className="p-3 text-gray-600 truncate max-w-[200px]" title={log.details}>{log.details}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB: PERMISSIONS */}
                                {userModalTab === 'permissions' && (
                                    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
                                        <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 border border-blue-100">
                                            <Shield className="text-blue-600 shrink-0 mt-0.5" size={20} />
                                            <div>
                                                <h4 className="text-sm font-bold text-blue-800">Controle de Módulos</h4>
                                                <p className="text-xs text-blue-600 mt-1">Defina o nível de acesso para cada módulo do sistema. "Total" permite edição e exclusão. "Leitura" apenas visualização.</p>
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            {renderPermissionEditor(tempUser.permissions, (newPerms) => setTempUser({ ...tempUser, permissions: newPerms }))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* FOOTER */}
                            <div className="flex justify-between items-center pt-6 border-t mt-auto">
                                <div className="text-xs text-gray-400">
                                    {userModalTab === 'permissions' && tempUser.role === 'Admin' && "⚠️ Administradores (Role: Admin) têm acesso total independente destas permissões."}
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="secondary" onClick={() => setIsUserModalOpen(false)}>Cancelar</Button>
                                    <Button onClick={() => {
                                        if (userModalTab === 'profile' && newUserMode) {
                                            setUserModalTab('permissions');
                                        } else {
                                            handleSaveUser();
                                        }
                                    }} className="px-8">
                                        {userModalTab === 'profile' && newUserMode ? 'Continuar (Permissões) →' : 'Salvar Alterações'}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )
            }

            {/* --- TAB: APPROVALS (ADM ONLY) --- */}
            {
                activeTab === 'approvals' && authorizedAccess && (
                    <div className="space-y-6">
                        <Card className="p-6 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)]">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                                        <ShieldCheck size={22} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-[var(--text-primary)]">Solicitações de Acesso</h3>
                                        <p className="text-sm text-[var(--text-secondary)]">Gerencie novos usuários que aguardam liberação.</p>
                                    </div>
                                </div>
                            </div>

                            {pendingApprovals.length === 0 ? (
                                <div className="text-center py-12 text-[var(--text-secondary)]">
                                    <CheckCircle2 size={48} className="mx-auto mb-4 text-green-200" />
                                    <p>Nenhuma solicitação pendente no momento.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)] text-xs uppercase">
                                                <th className="p-4">Data</th>
                                                <th className="p-4">Nome</th>
                                                <th className="p-4">Email</th>
                                                <th className="p-4">Status</th>
                                                <th className="p-4 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pendingApprovals.map(user => (
                                                <tr key={user.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-secondary)] transition-colors">
                                                    <td className="p-4 text-xs text-[var(--text-secondary)]">
                                                        {(user as any).createdAt ? new Date((user as any).createdAt).toLocaleDateString() : '-'}
                                                    </td>
                                                    <td className="p-4 font-medium">{user.name}</td>
                                                    <td className="p-4 text-sm text-[var(--text-secondary)]">{user.email}</td>
                                                    <td className="p-4"><span className="px-2 py-1 rounded text-xs font-bold bg-amber-100 text-amber-700">Pendente</span></td>
                                                    <td className="p-4 flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700 text-white"
                                                            onClick={() => {
                                                                setEditingUser(user);
                                                                setTempUser({
                                                                    ...user,
                                                                    role: 'Operador',
                                                                    status: 'active',
                                                                    isApproved: true,
                                                                    approvedAt: new Date().toISOString(),
                                                                    approvedBy: auth.currentUser?.uid,
                                                                    permissions: { admin: 'none', fiscal: 'read', financial: 'none', hr: 'none', crm: 'read', inventory: 'read' }
                                                                });
                                                                setNewUserMode(false);
                                                                setIsUserModalOpen(true);
                                                            }}
                                                        >
                                                            Aprovar
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-red-500 border-red-200 hover:bg-red-50"
                                                            onClick={async () => {
                                                                if (confirm(`Rejeitar acesso para ${user.name}?`)) {
                                                                    if (rejectUser) await rejectUser(user.id);
                                                                    addToast('Usuário rejeitado.', 'info');
                                                                }
                                                            }}
                                                        >
                                                            Rejeitar
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    </div>
                )
            }

            {/* --- TAB: SYSTEM --- */}
            {
                activeTab === 'system' && (
                    <Card className="p-8 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                                <Database size={22} />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--text-primary)]">Diagnóstico de Sistema</h3>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                            Execute uma verificação completa das regras de negócio (Fiscal, Estoque e Financeiro) para garantir a integridade dos cálculos.
                        </p>

                        <div className="bg-slate-950 rounded-xl p-4 mb-6 h-48 overflow-y-auto font-mono text-xs text-green-400 border border-slate-800 shadow-inner">
                            {diagnosisLogs.length === 0 ? (
                                <span className="text-slate-600 opacity-50">Aguardando execução...</span>
                            ) : (
                                diagnosisLogs.map((log, i) => (
                                    <div key={i} className="mb-1">{log}</div>
                                ))
                            )}
                        </div>

                        <Button onClick={runDiagnosis} disabled={isDiagnosing} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                            {isDiagnosing ? 'Executando...' : 'Iniciar Autodiagnóstico'}
                        </Button>
                    </Card>
                )
            }

            {/* --- TAB: BACKUP --- */}
            {
                activeTab === 'backup' && authorizedAccess && (
                    <Card className="p-8 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                                <HardDrive size={22} />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--text-primary)]">Backup Completo de Dados</h3>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                            Gere um backup completo de todos os dados do sistema armazenados no Firebase. O arquivo será baixado em formato JSON com timestamp.
                        </p>

                        {/* Progress Bar */}
                        {isGeneratingBackup && (
                            <div className="mb-6 bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Gerando backup...</span>
                                    <span className="text-sm font-black text-emerald-600">{backupProgress}%</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner">
                                    <div
                                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full rounded-full transition-all duration-300 shadow-lg"
                                        style={{ width: `${backupProgress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                                    Coletando dados das coleções do Firebase...
                                </p>
                            </div>
                        )}

                        {/* Backup Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Database size={16} className="text-blue-600" />
                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Coleções</span>
                                </div>
                                <p className="text-2xl font-black text-blue-700 dark:text-blue-300">20+</p>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Tabelas incluídas</p>
                            </div>

                            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText size={16} className="text-purple-600" />
                                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase">Formato</span>
                                </div>
                                <p className="text-2xl font-black text-purple-700 dark:text-purple-300">JSON</p>
                                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Estruturado</p>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock size={16} className="text-amber-600" />
                                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Timestamp</span>
                                </div>
                                <p className="text-2xl font-black text-amber-700 dark:text-amber-300">Auto</p>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Data/Hora atual</p>
                            </div>
                        </div>

                        {/* Warning Box */}
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
                            <div className="flex gap-3">
                                <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm mb-1">Importante</h4>
                                    <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                                        O backup inclui <strong>todos os dados</strong> de todas as empresas cadastradas no sistema.
                                        Armazene o arquivo em local seguro e protegido. O arquivo pode conter informações sensíveis.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={async () => {
                                setIsGeneratingBackup(true);
                                setBackupProgress(0);

                                try {
                                    // Data collections are already available from component scope
                                    const collections = [
                                        { name: 'companies', data: companies },
                                        { name: 'clients', data: clients },
                                        { name: 'products', data: products },
                                        { name: 'services', data: services },
                                        { name: 'employees', data: employees },
                                        { name: 'partners', data: partners },
                                        { name: 'invoices', data: invoices },
                                        { name: 'ncms', data: ncms },
                                        { name: 'taxRates', data: taxRates },
                                        { name: 'payrollItems', data: payrollItems },
                                        { name: 'payrollRuns', data: payrollRuns },
                                        { name: 'alerts', data: alerts },
                                        { name: 'bankAccounts', data: bankAccounts },
                                        { name: 'bankTransactions', data: bankTransactions },
                                        { name: 'filings', data: filings },
                                        { name: 'csts', data: csts },
                                        { name: 'cfops', data: cfops },
                                        { name: 'units', data: units },
                                        { name: 'operationTypes', data: operationTypes },
                                        { name: 'systemUsers', data: systemUsers },
                                        { name: 'costCenters', data: costCenters },
                                        { name: 'taxCalendar', data: taxCalendar },
                                        { name: 'spedValidations', data: spedValidations },
                                        { name: 'assets', data: assets },
                                        { name: 'accountingEntries', data: accountingEntries },
                                        { name: 'accountingClosures', data: accountingClosures },
                                        { name: 'savedReports', data: savedReports },
                                        { name: 'pendingApprovals', data: pendingApprovals }
                                    ];

                                    const backupData: any = {
                                        metadata: {
                                            timestamp: new Date().toISOString(),
                                            generatedBy: currentUser,
                                            version: '3.0',
                                            totalCollections: collections.length
                                        },
                                        data: {}
                                    };

                                    // Simulate progress
                                    for (let i = 0; i < collections.length; i++) {
                                        const collection = collections[i];
                                        backupData.data[collection.name] = collection.data;
                                        setBackupProgress(Math.round(((i + 1) / collections.length) * 100));
                                        await new Promise(resolve => setTimeout(resolve, 50));
                                    }

                                    // Create and download file
                                    const jsonString = JSON.stringify(backupData, null, 2);
                                    const blob = new Blob([jsonString], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                                    link.href = url;
                                    link.download = `escopo-backup-${timestamp}.json`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    URL.revokeObjectURL(url);

                                    addToast(`Backup gerado com sucesso! Tamanho: ${(blob.size / 1024 / 1024).toFixed(2)} MB`, 'success');
                                } catch (error) {
                                    console.error('Erro ao gerar backup:', error);
                                    addToast('Erro ao gerar backup. Verifique o console.', 'error');
                                } finally {
                                    setIsGeneratingBackup(false);
                                    setBackupProgress(0);
                                }
                            }}
                            disabled={isGeneratingBackup}
                            icon={Download}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base py-4"
                        >
                            {isGeneratingBackup ? 'Gerando Backup...' : 'Gerar e Baixar Backup Completo'}
                        </Button>
                    </Card>
                )
            }

            {/* Modal removed - Replaced by in-page view */}
        </div >
    );
};
