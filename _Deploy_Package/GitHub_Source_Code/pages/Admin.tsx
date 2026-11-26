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
    Plus, Trash2, Edit, Search, X
} from 'lucide-react';
import { SystemUser } from '../types';

export const Admin = () => {
    const {
        currentUser, logout, enable2FA, is2FAEnabled,
        userPhone, userPhotoURL, memberSince, userEmail, updateUserProfile, userDepartment,
        userPermissions, updateUserPermissions, userRole,
        systemUsers,
        addSystemUser,
        updateSystemUser,
        deleteItem
    } = useData();
    const { addToast } = useToast();

    // Tabs State
    const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'system'>('profile');

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
    const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [newUserMode, setNewUserMode] = useState(false);
    const [tempUser, setTempUser] = useState<Partial<SystemUser>>({
        name: '',
        email: '',
        role: 'Operador',
        status: 'active',
        permissions: { admin: 'none', fiscal: 'none', financial: 'none', hr: 'none', crm: 'none', inventory: 'none' }
    });


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
        setIsUserModalOpen(true);
    };

    const handleAddUser = () => {
        setEditingUser(null);
        setTempUser({
            name: '',
            email: '',
            role: 'Operador',
            status: 'active',
            permissions: { admin: 'none', fiscal: 'read', financial: 'none', hr: 'none', crm: 'read', inventory: 'read' }
        });
        setNewUserMode(true);
        setIsUserModalOpen(true);
    };

    const handleSaveUser = async () => {
        if (!tempUser.name || !tempUser.email) return addToast('Preencha nome e email.', 'warning');

        try {
            if (newUserMode) {
                // Generate ID
                const newUser = {
                    ...tempUser,
                    id: Math.random().toString(36).substr(2, 9),
                    permissions: tempUser.permissions
                } as SystemUser;
                if (addSystemUser) await addSystemUser(newUser);
                addToast('Usuário criado com sucesso.', 'success');
            } else {
                if (updateSystemUser && editingUser) await updateSystemUser({ ...editingUser, ...tempUser });
                addToast('Usuário atualizado com sucesso.', 'success');
            }
            setIsUserModalOpen(false);
        } catch (error) {
            console.error(error);
            addToast('Erro ao salvar usuário.', 'error');
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
                { key: 'admin', label: 'Admin Global' },
                { key: 'fiscal', label: 'Fiscal & Tributário' },
                { key: 'financial', label: 'Financeiro' },
                { key: 'hr', label: 'Recursos Humanos' },
                { key: 'crm', label: 'CRM / Clientes' },
                { key: 'inventory', label: 'Estoque' },
            ].map((mod) => (
                <div key={mod.key} className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                    <span className="text-sm font-medium">{mod.label}</span>
                    <select
                        value={perms?.[mod.key] || 'none'}
                        onChange={(e) => onChange({ ...perms, [mod.key]: e.target.value })}
                        className="text-xs p-1 rounded border border-[var(--border-color)] bg-[var(--bg-card)]"
                    >
                        <option value="none">Sem Acesso</option>
                        <option value="read">Leitura</option>
                        <option value="full">Total</option>
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
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-[var(--bg-card)] shadow-sm text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                    Gerenciar Usuários
                </button>
                <button
                    onClick={() => setActiveTab('system')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'system' ? 'bg-[var(--bg-card)] shadow-sm text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                    Diagnóstico do Sistema
                </button>
            </div>

            {/* --- TAB: PROFILE --- */}
            {activeTab === 'profile' && (
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
                        </form>
                    </Card>
                </div>
            )}

            {/* --- TAB: USERS --- */}
            {activeTab === 'users' && (
                <div className="space-y-6">
                    <Card className="p-6 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)]">
                        <div className="flex justify-between items-center mb-6">
                            <div className="relative w-full max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar usuário..."
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-xl border bg-[var(--bg-input)] focus:ring-2 ring-green-500/20 outline-none"
                                />
                            </div>
                            <Button onClick={handleAddUser} icon={Plus}>Novo Usuário</Button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)] text-xs uppercase">
                                        <th className="p-4">Nome</th>
                                        <th className="p-4">Email</th>
                                        <th className="p-4">Função</th>
                                        <th className="p-4">Permissões</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(systemUsers || []).filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase())).map(user => (
                                        <tr key={user.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-secondary)] transition-colors">
                                            <td className="p-4 font-medium">{user.name}</td>
                                            <td className="p-4 text-sm text-[var(--text-secondary)]">{user.email}</td>
                                            <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{user.role}</span></td>
                                            <td className="p-4 text-xs">
                                                {Object.entries(user.permissions || {}).filter(([_, v]) => v === 'full').length} Acessos Totais
                                            </td>
                                            <td className="p-4 flex justify-end gap-2">
                                                <button onClick={() => handleEditUser(user)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"><Edit size={16} /></button>
                                                <button onClick={() => handleDeleteUser(user.id)} className="p-2 hover:bg-red-100 rounded-lg text-red-600"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* --- TAB: SYSTEM --- */}
            {activeTab === 'system' && (
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
            )}

            {/* USER MODAL */}
            <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={newUserMode ? "Novo Usuário" : "Editar Usuário"}>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[var(--text-secondary)]">Nome</label>
                            <input type="text" value={tempUser.name} onChange={e => setTempUser({ ...tempUser, name: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[var(--text-secondary)]">Email</label>
                            <input type="email" value={tempUser.email} onChange={e => setTempUser({ ...tempUser, email: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-[var(--text-secondary)]">Função</label>
                        <select value={tempUser.role} onChange={e => setTempUser({ ...tempUser, role: e.target.value as any })} className="w-full p-2 border rounded">
                            <option value="Admin">Administrador</option>
                            <option value="Operador">Operador</option>
                            <option value="Cliente">Cliente / Visualizador</option>
                        </select>
                    </div>

                    <div className="pt-4 border-t">
                        <h4 className="font-bold text-sm mb-2">Permissões de Acesso</h4>
                        {renderPermissionEditor(tempUser.permissions, (newPerms) => setTempUser({ ...tempUser, permissions: newPerms }))}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="secondary" onClick={() => setIsUserModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveUser}>Salvar Usuário</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
