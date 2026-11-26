import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { SystemUpdater } from '../components/SystemUpdater';
import { Button } from '../components/ui/Button';
import { useData } from '../contexts/DataContext';
import { AppData } from '../types';
import { useToast } from '../contexts/ToastContext';
import { formatDateBR, parseDateSafe, maskDate } from '../utils/formatters';
import {
    Settings as SettingsIcon, Shield, Users, Save, RefreshCw,
    Database, Lock, Eye, Download, Upload, AlertCircle, Moon, Sun, Edit, Trash2,
    Palette, Layout as LayoutIcon, Check, MousePointer2, Menu, Building2, Layers, ShieldCheck
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { useAuditStore } from '../stores/useAuditStore';

import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/useUIStore';

export const Settings: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'geral' | 'layout' | 'usuarios' | 'seguranca' | 'backup' | 'atualizacao' | 'fechamento'>('geral');
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<any>({});
    const contextData = useData();
    const [localDates, setLocalDates] = useState<any>({});

    useEffect(() => {
        if (contextData.systemSettings) {
            const dates: any = {};
            ['lockDateEntradas', 'lockDateSaidas', 'lockDateCustos', 'lockDateFinanceiro', 'lockDateContabil'].forEach(key => {
                const val = (contextData.systemSettings as any)[key];
                dates[key] = val ? formatDateBR(val) : '';
            });
            setLocalDates(dates);
        }
    }, [contextData.systemSettings]);
    const { currentUser, userRole, clients, products, employees, loadBackup, theme, toggleTheme, setTheme } = contextData;
    const { layout, updateLayout } = useUIStore();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Company selection for scoped backup
    const [selectedBackupCompanyId, setSelectedBackupCompanyId] = useState<string>('all');

    // Auto-sync with current selected company if available
    useEffect(() => {
        if (contextData.selectedCompanyId) {
            setSelectedBackupCompanyId(contextData.selectedCompanyId);
        }
    }, [contextData.selectedCompanyId]);

    const targetBackupCompany = useMemo(() => {
        if (selectedBackupCompanyId === 'all') return null;
        return (contextData.companies || []).find(c => c.id === selectedBackupCompanyId) || null;
    }, [selectedBackupCompanyId, contextData.companies]);

    const backupStats = useMemo(() => {
        const isAll = selectedBackupCompanyId === 'all';
        if (isAll) {
            return {
                companiesCount: (contextData.companies || []).length,
                invoicesCount: (contextData.invoices || []).length,
                clientsCount: (contextData.clients || []).length,
                productsCount: (contextData.products || []).length,
                employeesCount: (contextData.employees || []).length,
                isAll: true
            };
        }
        const cId = selectedBackupCompanyId;
        return {
            companiesCount: 1,
            invoicesCount: (contextData.invoices || []).filter(i => i.companyId === cId).length,
            clientsCount: (contextData.clients || []).filter(c => c.companyId === cId || !c.companyId).length,
            productsCount: (contextData.products || []).filter(p => p.companyId === cId).length,
            employeesCount: (contextData.employees || []).filter(e => e.companyId === cId).length,
            isAll: false
        };
    }, [selectedBackupCompanyId, contextData]);

    // Real Audit Logs
    const { logs, subscribe } = useAuditStore();
    React.useEffect(() => {
        const unsubscribe = subscribe();
        return () => unsubscribe();
    }, []);

    const handleBackup = () => {
        const isAll = selectedBackupCompanyId === 'all';
        const targetCompany = isAll ? null : (contextData.companies || []).find(c => c.id === selectedBackupCompanyId);

        if (!isAll && !targetCompany) {
            addToast('Selecione uma empresa válida para exportar o backup.', 'error');
            return;
        }

        let backupData: any;
        let filename = '';
        const dateStr = new Date().toISOString().split('T')[0];

        if (isAll) {
            backupData = {
                _backupInfo: {
                    version: '2.0',
                    exportDate: new Date().toISOString(),
                    scope: 'all',
                    totalCompanies: (contextData.companies || []).length,
                    system: 'EscopoV3'
                },
                companies: contextData.companies || [],
                clients: contextData.clients || [],
                products: contextData.products || [],
                services: contextData.services || [],
                employees: contextData.employees || [],
                partners: contextData.partners || [],
                invoices: contextData.invoices || [],
                ncms: contextData.ncms || [],
                taxRates: contextData.taxRates || [],
                payrollItems: contextData.payrollItems || [],
                payrollRuns: contextData.payrollRuns || [],
                alerts: contextData.alerts || [],
                bankAccounts: contextData.bankAccounts || [],
                bankTransactions: contextData.bankTransactions || [],
                filings: contextData.filings || [],
                csts: contextData.csts || [],
                cfops: contextData.cfops || [],
                units: contextData.units || [],
                operationTypes: contextData.operationTypes || [],
                costCenters: contextData.costCenters || [],
                taxCalendar: contextData.taxCalendar || [],
                spedValidations: contextData.spedValidations || [],
                assets: contextData.assets || [],
                accountingEntries: contextData.accountingEntries || [],
            };
            filename = `escopo_backup_completo_${dateStr}.json`;
        } else if (targetCompany) {
            const cId = targetCompany.id;
            backupData = {
                _backupInfo: {
                    version: '2.0',
                    exportDate: new Date().toISOString(),
                    scope: 'single_company',
                    companyId: cId,
                    companyName: targetCompany.razaoSocial || targetCompany.nomeFantasia,
                    cnpj: targetCompany.cnpj,
                    system: 'EscopoV3'
                },
                companies: [targetCompany],
                clients: (contextData.clients || []).filter(c => c.companyId === cId || !c.companyId),
                products: (contextData.products || []).filter(p => p.companyId === cId),
                services: (contextData.services || []).filter(s => s.companyId === cId),
                employees: (contextData.employees || []).filter(e => e.companyId === cId),
                partners: (contextData.partners || []).filter(p => p.companyId === cId),
                invoices: (contextData.invoices || []).filter(i => i.companyId === cId),
                ncms: contextData.ncms || [],
                taxRates: contextData.taxRates || [],
                payrollItems: (contextData.payrollItems || []).filter(pi => (pi as any).companyId === cId),
                payrollRuns: (contextData.payrollRuns || []).filter(pr => (pr as any).companyId === cId),
                alerts: (contextData.alerts || []).filter(a => (a as any).companyId === cId),
                bankAccounts: (contextData.bankAccounts || []).filter(b => (b as any).companyId === cId),
                bankTransactions: (contextData.bankTransactions || []).filter(bt => (bt as any).companyId === cId),
                filings: (contextData.filings || []).filter(f => (f as any).companyId === cId),
                csts: contextData.csts || [],
                cfops: contextData.cfops || [],
                units: contextData.units || [],
                operationTypes: contextData.operationTypes || [],
                costCenters: (contextData.costCenters || []).filter(cc => (cc as any).companyId === cId),
                taxCalendar: contextData.taxCalendar || [],
                spedValidations: (contextData.spedValidations || []).filter(sv => (sv as any).companyId === cId),
                assets: (contextData.assets || []).filter(a => (a as any).companyId === cId),
                accountingEntries: (contextData.accountingEntries || []).filter(ae => (ae as any).companyId === cId),
            };

            const cleanName = (targetCompany.nomeFantasia || targetCompany.razaoSocial || 'empresa')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/gi, '_')
                .replace(/_+/g, '_')
                .substring(0, 30);
            const cleanCnpj = targetCompany.cnpj ? `_${targetCompany.cnpj.replace(/\D/g, '')}` : '';
            filename = `escopo_backup_${cleanName}${cleanCnpj}_${dateStr}.json`;
        }

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const scopeLabel = isAll
            ? 'completo (Todas as Empresas)'
            : `da empresa "${targetCompany?.nomeFantasia || targetCompany?.razaoSocial}"`;
        addToast(`Backup ${scopeLabel} exportado com sucesso!`, 'success');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (!json.companies || !Array.isArray(json.companies) || json.companies.length === 0) {
                    addToast('Arquivo de backup inválido: nenhuma empresa encontrada.', 'error');
                    return;
                }

                const isSingleCompany = json._backupInfo?.scope === 'single_company' || json.companies.length === 1;
                const companyName = json._backupInfo?.companyName || json.companies[0]?.razaoSocial || json.companies[0]?.nomeFantasia || 'Empresa';
                const currentCompanies = contextData.companies || [];

                if (isSingleCompany && currentCompanies.length > 0) {
                    const shouldMerge = confirm(
                        `O arquivo selecionado é um backup da empresa:\n"${companyName}"\n\n` +
                        `Deseja MESCLAR os dados desta empresa mantendo as outras empresas já existentes no sistema?\n\n` +
                        `[OK] = Mesclar / Atualizar apenas esta empresa (Recomendado)\n` +
                        `[Cancelar] = Substituir TODO o sistema (apaga as demais empresas)`
                    );

                    if (shouldMerge) {
                        const incomingComp = json.companies[0];
                        const incomingCompId = incomingComp.id;

                        const currentData = {
                            companies: contextData.companies || [],
                            clients: contextData.clients || [],
                            products: contextData.products || [],
                            services: contextData.services || [],
                            employees: contextData.employees || [],
                            partners: contextData.partners || [],
                            invoices: contextData.invoices || [],
                            ncms: contextData.ncms || [],
                            taxRates: contextData.taxRates || [],
                            payrollItems: contextData.payrollItems || [],
                            payrollRuns: contextData.payrollRuns || [],
                            alerts: contextData.alerts || [],
                            bankAccounts: contextData.bankAccounts || [],
                            bankTransactions: contextData.bankTransactions || [],
                            filings: contextData.filings || [],
                            csts: contextData.csts || [],
                            cfops: contextData.cfops || [],
                            units: contextData.units || [],
                            operationTypes: contextData.operationTypes || [],
                            costCenters: contextData.costCenters || [],
                            taxCalendar: contextData.taxCalendar || [],
                            spedValidations: contextData.spedValidations || [],
                            assets: contextData.assets || [],
                            accountingEntries: contextData.accountingEntries || [],
                        };

                        const mergedData: any = { ...currentData };
                        mergedData.companies = [
                            ...currentData.companies.filter(c => c.id !== incomingCompId),
                            incomingComp
                        ];

                        const entityKeys: (keyof AppData)[] = [
                            'invoices', 'products', 'services', 'employees', 'partners',
                            'payrollItems', 'payrollRuns', 'alerts', 'bankAccounts',
                            'bankTransactions', 'filings', 'costCenters', 'spedValidations',
                            'assets', 'accountingEntries'
                        ];

                        entityKeys.forEach(key => {
                            const curArr = (currentData as any)[key] || [];
                            const inArr = (json as any)[key] || [];
                            const filteredCur = curArr.filter((item: any) => item.companyId !== incomingCompId);
                            mergedData[key] = [...filteredCur, ...inArr];
                        });

                        const inClients = json.clients || [];
                        const inClientIds = new Set(inClients.map((c: any) => c.id));
                        mergedData.clients = [
                            ...(currentData.clients || []).filter(c => c.companyId !== incomingCompId && !inClientIds.has(c.id)),
                            ...inClients
                        ];

                        loadBackup(mergedData);
                        addToast(`Empresa "${companyName}" mesclada com sucesso!`, 'success');
                        return;
                    }
                }

                if (!isSingleCompany) {
                    if (!confirm("ATENÇÃO: A restauração substituirá TODOS os dados atuais do sistema.\n\nEsta ação apagará permanentemente as empresas e registros atuais.\n\nDeseja continuar com a restauração?")) {
                        return;
                    }
                }

                loadBackup(json);
                addToast('Sistema restaurado com sucesso!', 'success');
            } catch (err) {
                console.error(err);
                addToast('Erro ao ler arquivo de backup.', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
    };

    const TabButton = ({ id, label, icon: Icon }: any) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`
                flex items-center px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap
                ${activeTab === id ? 'border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-soft)]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
            `}
        >
            <Icon size={18} className="mr-2" />
            {label}
        </button>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Configurações do Sistema</h1>
                <p className="text-[var(--text-secondary)]">Gerencie preferências, usuários e segurança</p>
            </div>

            <Card className="p-0 overflow-hidden bg-[var(--bg-card)] border-[var(--border-color)]">
                <div className="flex border-b border-[var(--border-color)] overflow-x-auto bg-[var(--bg-secondary)] scrollbar-hide">
                    <TabButton id="geral" label="Geral" icon={SettingsIcon} />
                    <TabButton id="layout" label="Aparência" icon={Palette} />
                    <TabButton id="usuarios" label="Usuários" icon={Users} />
                    <TabButton id="seguranca" label="Segurança" icon={Shield} />
                    <TabButton id="backup" label="Backup" icon={Database} />
                    <TabButton id="fechamento" label="Fechamento" icon={Lock} />
                    <TabButton id="atualizacao" label="Atualização" icon={Download} />
                </div>

                <div className="p-6">
                    {activeTab === 'geral' && (
                        <div className="space-y-6 max-w-2xl animate-in fade-in slide-in-from-left-4 duration-300">
                            <div>
                                <h3 className="text-lg font-black text-[var(--text-primary)] mb-4 uppercase tracking-tighter">Gerenciamento Técnico</h3>
                                <p className="text-sm text-[var(--text-secondary)] mb-6">Configurações globais de funcionamento do motor ERP.</p>

                                <div className="space-y-4">
                                    {/* Firebase Switch */}
                                    <div className="p-4 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-card)] flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-[var(--text-primary)]">Banco de Dados Firebase</p>
                                            <p className="text-xs text-[var(--text-secondary)]">Habilitar gravação e leitura de dados no Firebase Cloud</p>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const current = contextData.systemSettings?.useFirebase ?? true;
                                                try {
                                                    await contextData.updateSystemSettings({
                                                        ...(contextData.systemSettings || {}),
                                                        useFirebase: !current
                                                    });
                                                    addToast(`Firebase ${!current ? 'ativado' : 'desativado'} com sucesso!`, 'success');
                                                } catch (e) {
                                                    addToast('Erro ao alterar configuração do Firebase.', 'error');
                                                }
                                            }}
                                            className={`w-12 h-6 rounded-full relative transition-all ${
                                                (contextData.systemSettings?.useFirebase ?? true) ? 'bg-[var(--accent-primary)]' : 'bg-slate-300'
                                            }`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${
                                                (contextData.systemSettings?.useFirebase ?? true) ? 'right-1' : 'left-1'
                                            }`} />
                                        </button>
                                    </div>

                                    {/* Supabase Switch */}
                                    <div className="p-4 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-card)] flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-[var(--text-primary)]">Banco de Dados Supabase</p>
                                            <p className="text-xs text-[var(--text-secondary)]">Habilitar replicação e sincronização automática com Supabase</p>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const current = contextData.systemSettings?.useSupabase ?? false;
                                                try {
                                                    await contextData.updateSystemSettings({
                                                        ...(contextData.systemSettings || {}),
                                                        useSupabase: !current
                                                    });
                                                    addToast(`Supabase ${!current ? 'ativado' : 'desativado'} com sucesso!`, 'success');
                                                } catch (e) {
                                                    addToast('Erro ao alterar configuração do Supabase.', 'error');
                                                }
                                            }}
                                            className={`w-12 h-6 rounded-full relative transition-all ${
                                                (contextData.systemSettings?.useSupabase ?? false) ? 'bg-[var(--accent-primary)]' : 'bg-slate-300'
                                            }`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${
                                                (contextData.systemSettings?.useSupabase ?? false) ? 'right-1' : 'left-1'
                                            }`} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Rubrics Management Shortcut */}
                            <div className="mt-8 p-6 bg-[var(--accent-soft)] border border-[var(--accent-primary)]/10 rounded-3xl flex justify-between items-center shadow-sm">
                                <div>
                                    <h3 className="font-bold text-[var(--accent-primary)] text-sm">Gerenciar Rubricas</h3>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1">Configure verbas, proventos, descontos e suas incidências.</p>
                                </div>
                                <Button onClick={() => navigate('/app/settings/rubrics')} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white shadow-lg shadow-[var(--accent-primary)]/10">
                                    Acessar Gerenciador
                                </Button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'layout' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div>
                                <h3 className="text-lg font-black text-[var(--text-primary)] mb-1 uppercase tracking-tighter">Modo de Exibição</h3>
                                <p className="text-sm text-[var(--text-secondary)] mb-6">Escolha como deseja estruturar a navegação do sistema.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div
                                        onClick={() => updateLayout({ mode: 'sidebar' })}
                                        className={`p-6 border-2 rounded-[2rem] cursor-pointer transition-all ${layout.mode === 'sidebar' ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]' : 'border-[var(--border-color)] hover:border-[var(--text-secondary)]'}`}
                                    >
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2.5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-[var(--border-color)]">
                                                <LayoutIcon size={20} className={layout.mode === 'sidebar' ? 'text-[var(--accent-primary)]' : 'text-slate-400'} />
                                            </div>
                                            <div>
                                                <p className="font-black text-[10px] uppercase tracking-wide">Sidebar</p>
                                                <p className="text-[10px] text-[var(--text-secondary)]">Menu lateral.</p>
                                            </div>
                                        </div>
                                        <div className="w-full h-20 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden flex border border-[var(--border-color)]/20 p-1 gap-1">
                                            <div className="w-4 h-full bg-[var(--accent-primary)] rounded-lg shadow-sm opacity-50" />
                                            <div className="flex-1 flex flex-col gap-1">
                                                <div className="h-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm" />
                                                <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg opacity-40 shadow-sm" />
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => updateLayout({ mode: 'mini' })}
                                        className={`p-6 border-2 rounded-[2rem] cursor-pointer transition-all ${layout.mode === 'mini' ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]' : 'border-[var(--border-color)] hover:border-[var(--text-secondary)]'}`}
                                    >
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2.5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-[var(--border-color)]">
                                                <Menu size={20} className={layout.mode === 'mini' ? 'text-[var(--accent-primary)]' : 'text-slate-400'} />
                                            </div>
                                            <div>
                                                <p className="font-black text-[10px] uppercase tracking-wide">Mini Side</p>
                                                <p className="text-[10px] text-[var(--text-secondary)]">Ícones.</p>
                                            </div>
                                        </div>
                                        <div className="w-full h-20 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden flex border border-[var(--border-color)]/20 p-1 gap-1">
                                            <div className="w-2 h-full bg-[var(--accent-primary)] rounded-lg shadow-sm opacity-50" />
                                            <div className="flex-1 flex flex-col gap-1">
                                                <div className="h-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm" />
                                                <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg opacity-40 shadow-sm" />
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => updateLayout({ mode: 'topbar' })}
                                        className={`p-6 border-2 rounded-[2rem] cursor-pointer transition-all ${layout.mode === 'topbar' ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]' : 'border-[var(--border-color)] hover:border-[var(--text-secondary)]'}`}
                                    >
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2.5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-[var(--border-color)]">
                                                <MousePointer2 size={20} className={layout.mode === 'topbar' ? 'text-[var(--accent-primary)]' : 'text-slate-400'} />
                                            </div>
                                            <div>
                                                <p className="font-black text-[10px] uppercase tracking-wide">Topbar</p>
                                                <p className="text-[10px] text-[var(--text-secondary)]">Horizontal.</p>
                                            </div>
                                        </div>
                                        <div className="w-full h-20 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden flex flex-col border border-[var(--border-color)]/20 p-1 gap-1">
                                            <div className="h-4 w-full bg-[var(--accent-primary)] rounded-lg shadow-sm opacity-50" />
                                            <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg opacity-40 shadow-sm" />
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => updateLayout({ mode: 'corporate' })}
                                        className={`p-6 border-2 rounded-[2rem] cursor-pointer transition-all ${layout.mode === 'corporate' ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]' : 'border-[var(--border-color)] hover:border-[var(--text-secondary)]'}`}
                                    >
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2.5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-[var(--border-color)]">
                                                <Building2 size={20} className={layout.mode === 'corporate' ? 'text-[var(--accent-primary)]' : 'text-slate-400'} />
                                            </div>
                                            <div>
                                                <p className="font-black text-[10px] uppercase tracking-wide">Corporate</p>
                                                <p className="text-[10px] text-[var(--text-secondary)]">Densed.</p>
                                            </div>
                                        </div>
                                        <div className="w-full h-20 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden flex flex-col border border-[var(--border-color)]/20 p-1 gap-1">
                                            <div className="h-6 w-full bg-[var(--accent-primary)] rounded-lg shadow-sm opacity-30" />
                                            <div className="flex-1 flex gap-1">
                                                <div className="w-4 h-full bg-white dark:bg-slate-800 rounded-lg shadow-sm" />
                                                <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm opacity-40" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Color Strategy */}
                            <div>
                                <h3 className="text-lg font-black text-[var(--text-primary)] mb-1 uppercase tracking-tighter">Identidade Cromática</h3>
                                <p className="text-sm text-[var(--text-secondary)] mb-6">Explore a paleta expandida de 19 temas premium para o sistema.</p>

                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-2">
                                    {[
                                        { id: 'emerald', label: 'Esm.', color: '#10b981' },
                                        { id: 'ocean', label: 'Oce.', color: '#0ea5e9' },
                                        { id: 'berry', label: 'Amo.', color: '#f43f5e' },
                                        { id: 'space', label: 'Esp.', color: '#6366f1' },
                                        { id: 'gold', label: 'Dou.', color: '#f59e0b' },
                                        { id: 'sunset', label: 'Sun.', color: '#f97316' },
                                        { id: 'forest', label: 'For.', color: '#16a34a' },
                                        { id: 'midnight', label: 'Mid.', color: '#7c3aed' },
                                        { id: 'royal', label: 'Roy.', color: '#2563eb' },
                                        { id: 'rose', label: 'Ros.', color: '#f472b6' },
                                        { id: 'teal', label: 'Tea.', color: '#14b8a6' },
                                        { id: 'indigo', label: 'Ind.', color: '#6366f1' },
                                        { id: 'amber', label: 'Amb.', color: '#f59e0b' },
                                        { id: 'slate', label: 'Sla.', color: '#64748b' },
                                        { id: 'crimson', label: 'Cri.', color: '#dc2626' },
                                        { id: 'mint', label: 'Min.', color: '#4ade80' },
                                        { id: 'nordic', label: 'Nor.', color: '#60a5fa' },
                                        { id: 'cyber', label: 'Cyb.', color: '#00ff41' },
                                        { id: 'mocha', label: 'Moc.', color: '#78350f' },
                                    ].map((c) => (
                                        <button
                                            key={c.id}
                                            onClick={() => updateLayout({ accentColor: c.id as any })}
                                            className={`flex flex-col items-center gap-2 p-2 rounded-2xl border-2 transition-all ${layout.accentColor === c.id ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]' : 'border-[var(--border-color)] hover:border-slate-400'}`}
                                        >
                                            <div className="w-6 h-6 rounded-full shadow-inner border border-white/20" style={{ backgroundColor: c.color }} />
                                            <span className="text-[10px] font-bold uppercase">{c.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Section 1: Typography & Structure */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6 border-y border-[var(--border-color)]/30">
                                <div>
                                    <h4 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-4">Tipografia do Sistema</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'inter', label: 'Inter' },
                                            { id: 'roboto', label: 'Roboto' },
                                            { id: 'poppins', label: 'Poppins' },
                                            { id: 'montserrat', label: 'Montserrat' }
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => updateLayout({ fontFamily: f.id as any })}
                                                className={`py-3 rounded-xl border-2 font-bold transition-all ${layout.fontFamily === f.id ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]' : 'border-[var(--border-color)]'}`}
                                                style={{ fontFamily: f.id }}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-4">Arredondamento UI</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['none', 'medium', 'large', 'full'].map(r => (
                                            <button
                                                key={r}
                                                onClick={() => updateLayout({ borderRadius: r as any })}
                                                className={`py-3 rounded-xl border-2 font-bold uppercase text-[10px] transition-all ${layout.borderRadius === r ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]' : 'border-[var(--border-color)]'}`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Dark Mode & Shadows */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div>
                                    <h4 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-4">Dark Mode Varietal</h4>
                                    <div className="flex bg-[var(--bg-secondary)] p-1 rounded-2xl">
                                        <button
                                            onClick={() => updateLayout({ darkModeVariant: 'midnight' })}
                                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${layout.darkModeVariant === 'midnight' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
                                        >
                                            Midnight
                                        </button>
                                        <button
                                            onClick={() => updateLayout({ darkModeVariant: 'oled' })}
                                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${layout.darkModeVariant === 'oled' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500'}`}
                                        >
                                            OLED Pure
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-4">Estilo de Sombras</h4>
                                    <select
                                        value={layout.shadowStyle}
                                        onChange={(e: any) => updateLayout({ shadowStyle: e.target.value })}
                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-3 rounded-2xl font-bold text-xs"
                                    >
                                        <option value="none">Nenhum (Plano)</option>
                                        <option value="soft">Suave (Moderno)</option>
                                        <option value="industrial">Industrial (Linhas)</option>
                                    </select>
                                </div>

                                <div>
                                    <h4 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-4">Velocidade de UI</h4>
                                    <div className="flex gap-2">
                                        {['none', 'fast', 'normal', 'slow'].map(v => (
                                            <button
                                                key={v}
                                                onClick={() => updateLayout({ animations: v as any })}
                                                className={`flex-1 py-2 rounded-xl border-2 text-[10px] font-bold uppercase transition-all ${layout.animations === v ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]' : 'border-[var(--border-color)]'}`}
                                            >
                                                {v}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Textures & Glass */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div
                                    onClick={() => updateLayout({ glassmorphism: !layout.glassmorphism })}
                                    className={`p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all flex items-center justify-between ${layout.glassmorphism ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]' : 'border-[var(--border-color)]'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${layout.glassmorphism ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-secondary)]'}`}>
                                            <ShieldCheck size={20} />
                                        </div>
                                        <div>
                                            <p className="font-black text-xs uppercase tracking-wider">Vidro (Glassmorphism)</p>
                                            <p className="text-[10px] text-[var(--text-secondary)]">Transparência nas superfícies.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 rounded-[2.5rem] border-2 border-[var(--border-color)]">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-4">Textura de Fundo</h4>
                                    <div className="flex gap-2">
                                        {['none', 'noise', 'mesh'].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => updateLayout({ bgTexture: t as any })}
                                                className={`flex-1 py-2 rounded-xl border-2 text-[10px] font-bold uppercase transition-all ${layout.bgTexture === t ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]' : 'border-[var(--border-color)]'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Intensity & Special */}
                            <div className="bg-[var(--bg-secondary)]/50 p-8 rounded-[3rem] border border-[var(--border-color)]/30 space-y-8">
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Intensidade de Acento</h4>
                                        <span className="text-xs font-black text-[var(--accent-primary)]">{layout.accentIntensity}%</span>
                                    </div>
                                    <input
                                        type="range" min="10" max="100" step="5"
                                        value={layout.accentIntensity}
                                        onChange={(e) => updateLayout({ accentIntensity: parseInt(e.target.value) })}
                                        className="w-full accent-[var(--accent-primary)]"
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${layout.customCursor ? 'bg-black text-white' : 'bg-slate-200'}`}>
                                            <MousePointer2 size={20} />
                                        </div>
                                        <div>
                                            <p className="font-black text-xs uppercase tracking-wider">Cursor Premium</p>
                                            <p className="text-[10px] text-[var(--text-secondary)]">Efeito visual de rastro dinâmico.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => updateLayout({ customCursor: !layout.customCursor })}
                                        className={`w-12 h-6 rounded-full relative transition-all ${layout.customCursor ? 'bg-[var(--accent-primary)]' : 'bg-slate-300'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${layout.customCursor ? 'right-1' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Section 5: Layout Advanced */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h4 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-4">Largura do Conteúdo</h4>
                                    <div className="flex bg-[var(--bg-secondary)] p-1 rounded-2xl w-fit">
                                        <button
                                            onClick={() => updateLayout({ contentWidth: 'boxed' })}
                                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${layout.contentWidth === 'boxed' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
                                        >
                                            Centralizado (Boxed)
                                        </button>
                                        <button
                                            onClick={() => updateLayout({ contentWidth: 'fluid' })}
                                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${layout.contentWidth === 'fluid' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
                                        >
                                            Largura Total (Fluid)
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-4">Densidade de Dados</h4>
                                    <div className="flex gap-2 p-1 bg-[var(--bg-secondary)] rounded-2xl w-fit">
                                        <button
                                            onClick={() => updateLayout({ density: 'compact' })}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${layout.density === 'compact' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <LayoutIcon size={14} /> Compacto
                                        </button>
                                        <button
                                            onClick={() => updateLayout({ density: 'comfortable' })}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${layout.density === 'comfortable' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <Layers size={14} /> Confortável
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'usuarios' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-[var(--text-primary)]">Usuários do Sistema</h3>
                                <Button size="sm" icon={Users} onClick={() => { setEditingUser({}); setShowUserModal(true); }}>Novo Usuário</Button>
                            </div>

                            <div className="rounded-2xl border border-[var(--border-color)] overflow-hidden">
                                <table className="w-full text-left border-collapse bg-[var(--bg-card)]">
                                    <thead className="bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)] uppercase">
                                        <tr>
                                            <th className="p-4">Nome</th>
                                            <th className="p-4">Email</th>
                                            <th className="p-4">Perfil</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-color)] text-sm">
                                        {/* Fallback to show current user if list empty (or migration phase) */}
                                        {contextData.systemUsers.length === 0 && (
                                            <tr>
                                                <td className="p-4 font-bold flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center font-black uppercase shadow-sm">
                                                        {currentUser.substring(0, 2)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[var(--text-primary)]">{currentUser} (Eu)</span>
                                                        <span className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest leading-none mt-0.5">Sessão Atual</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-[var(--text-secondary)] font-medium">{contextData.userEmail || 'admin@escopo.com'}</td>
                                                <td className="p-4"><span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold">{userRole}</span></td>
                                                <td className="p-4"><span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-xl text-[10px] font-black uppercase">Online</span></td>
                                                <td className="p-4 text-right text-xs text-gray-400">Gerenciado pelo Auth</td>
                                            </tr>
                                        )}

                                        {contextData.systemUsers.map(user => (
                                            <tr key={user.id}>
                                                <td className="p-4 font-bold flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black uppercase shadow-sm">
                                                        {user.name.substring(0, 2)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[var(--text-primary)]">{user.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-[var(--text-secondary)]">{user.email}</td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {user.status === 'active' ? 'Ativo' : 'Inativo'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="sm" variant="ghost" icon={Edit} onClick={() => { setEditingUser(user); setShowUserModal(true); }} />
                                                        <Button size="sm" variant="ghost" icon={Trash2} className="text-red-500 hover:text-red-700" onClick={async () => {
                                                            if (confirm('Remover este usuário?')) {
                                                                await contextData.deleteItem('systemUsers', user.id);
                                                                addToast('Usuário removido', 'success');
                                                            }
                                                        }} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'seguranca' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-blue-50/50 dark:bg-blue-500/5 border-l-4 border-blue-500 p-6 rounded-2xl">
                                    <div className="flex gap-4">
                                        <div className="p-3 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl h-fit">
                                            <Shield className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-blue-800 dark:text-blue-400 uppercase tracking-widest">Trilha de Auditoria</h4>
                                            <p className="text-xs text-blue-600 dark:text-blue-400/60 mt-2 leading-relaxed">
                                                O motor de segurança registra automaticamente o contexto de cada alteração no sistema.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-amber-50/50 dark:bg-amber-500/5 border-l-4 border-amber-500 p-6 rounded-2xl">
                                    <div className="flex gap-4">
                                        <div className="p-3 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl h-fit">
                                            <Lock className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-sm font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest">Verificação em 2 Passos</h4>
                                                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[9px] font-black rounded-full uppercase">Em breve</span>
                                            </div>
                                            <p className="text-xs text-amber-600 dark:text-amber-400/60 mt-2 leading-relaxed">
                                                Aumente a segurança da sua conta adicionando uma camada extra de proteção via app autenticador.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-hidden border border-[var(--border-color)] rounded-[2rem] bg-[var(--bg-card)] shadow-sm">
                                <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center">
                                    <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider">Histórico de Alterações</h3>
                                    <Button size="sm" variant="outline" className="text-[10px] font-black px-4">Exportar LOGS</Button>
                                </div>
                                <table className="w-full text-left">
                                    <thead className="bg-[var(--bg-secondary)] text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-[0.2em]">
                                        <tr>
                                            <th className="px-6 py-4">Evento / Data</th>
                                            <th className="px-6 py-4">Responsável</th>
                                            <th className="px-6 py-4">Ação Realizada</th>
                                            <th className="px-6 py-4">Detalhes Técnicos</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-color)]">
                                        {logs.length > 0 ? logs.map((log: any, idx: number) => (
                                            <tr key={log.id || idx} className="hover:bg-[var(--bg-secondary)] transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-black text-[var(--text-primary)]">
                                                            {log.timestamp ? new Date(log.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : '-'}
                                                        </span>
                                                        <span className="text-[10px] text-[var(--text-secondary)] font-bold">
                                                            {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-[10px] font-black text-[var(--text-secondary)]">
                                                            {log.userName?.substring(0, 2) || (log.userEmail?.substring(0, 2)) || 'S'}
                                                        </div>
                                                        <span className="text-xs font-bold text-[var(--text-secondary)]">{log.userName || log.userEmail || 'Sistema'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 text-[10px] font-black rounded-lg uppercase tracking-tight 
                                                        ${log.action === 'create' ? 'bg-green-100 text-green-700' :
                                                            log.action === 'delete' ? 'bg-red-100 text-red-700' :
                                                                log.action === 'update' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-medium text-[var(--text-secondary)] truncate max-w-xs" title={log.details}>{log.details}</span>
                                                        <span className="text-[9px] text-[var(--text-secondary)] opacity-60 font-mono mt-0.5">{log.entity} #{log.entityId}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={4} className="p-12 text-center text-[var(--text-secondary)] font-black uppercase tracking-widest">
                                                    <span className="text-slate-400">Nenhum registro encontrado</span>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'backup' && (
                        <div className="space-y-8 max-w-4xl mx-auto py-4 animate-in fade-in slide-in-from-left-4 duration-300">
                            {/* Company Selector Card */}
                            <div className="p-6 md:p-8 border border-[var(--border-color)] rounded-[2.5rem] bg-[var(--bg-secondary)] shadow-sm">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-primary)] flex items-center justify-center font-bold shadow-sm">
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-[var(--text-primary)]">
                                                Seleção de Empresa para Backup
                                            </h3>
                                            <p className="text-xs text-[var(--text-secondary)]">
                                                Escolha se deseja exportar os dados de uma empresa específica ou gerar uma cópia de segurança completa
                                            </p>
                                        </div>
                                    </div>

                                    {/* Company Select Input */}
                                    <div className="w-full md:w-80">
                                        <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                                            Empresa Alvo
                                        </label>
                                        <select
                                            value={selectedBackupCompanyId}
                                            onChange={(e) => setSelectedBackupCompanyId(e.target.value)}
                                            className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all cursor-pointer shadow-sm"
                                        >
                                            <option value="all">
                                                🏢 Todas as Empresas (Backup Geral — {(contextData.companies || []).length})
                                            </option>
                                            <optgroup label="Empresas Cadastradas">
                                                {(contextData.companies || []).map((comp) => (
                                                    <option key={comp.id} value={comp.id}>
                                                        {comp.nomeFantasia || comp.razaoSocial} {comp.cnpj ? `(${comp.cnpj})` : ''}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        </select>
                                    </div>
                                </div>

                                {/* Scope Details & Count Badges */}
                                <div className={`p-4 rounded-2xl border transition-all ${
                                    backupStats.isAll
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200'
                                        : 'bg-blue-500/10 border-blue-500/20 text-blue-900 dark:text-blue-200'
                                }`}>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <Layers className="w-4 h-4 text-[var(--accent-primary)]" />
                                            <span className="text-xs font-bold uppercase tracking-wider">
                                                Escopo Atual:
                                            </span>
                                            <span className="text-sm font-black">
                                                {backupStats.isAll
                                                    ? 'Sistema Completo (Todas as Empresas)'
                                                    : (targetBackupCompany?.nomeFantasia || targetBackupCompany?.razaoSocial || 'Empresa Específica')}
                                            </span>
                                            {!backupStats.isAll && targetBackupCompany?.cnpj && (
                                                <span className="text-xs opacity-75 font-mono">
                                                    CNPJ: {targetBackupCompany.cnpj}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                                            <span className="px-2.5 py-1 rounded-xl bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-xs">
                                                🏢 {backupStats.companiesCount} {backupStats.companiesCount === 1 ? 'Empresa' : 'Empresas'}
                                            </span>
                                            <span className="px-2.5 py-1 rounded-xl bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-xs">
                                                📄 {backupStats.invoicesCount} NF-e
                                            </span>
                                            <span className="px-2.5 py-1 rounded-xl bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-xs">
                                                👥 {backupStats.clientsCount} Clientes
                                            </span>
                                            <span className="px-2.5 py-1 rounded-xl bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-xs">
                                                📦 {backupStats.productsCount} Produtos
                                            </span>
                                            <span className="px-2.5 py-1 rounded-xl bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-xs">
                                                👔 {backupStats.employeesCount} Funcionários
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Export / Import Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="p-8 border border-[var(--border-color)] rounded-[2.5rem] bg-[var(--bg-secondary)] text-center flex flex-col items-center shadow-sm hover:shadow-md transition-shadow">
                                    <div className="w-16 h-16 bg-[var(--bg-card)] rounded-3xl flex items-center justify-center shadow-sm mb-6">
                                        <Database className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-[var(--text-primary)]">
                                        Exportar Backup
                                    </h3>
                                    <p className="text-sm text-[var(--text-secondary)] mb-8 mt-2 leading-relaxed">
                                        {backupStats.isAll
                                            ? 'Baixe uma cópia completa de todos os dados do sistema em formato JSON para segurança offline.'
                                            : `Baixe uma cópia exclusiva dos registros da empresa "${targetBackupCompany?.nomeFantasia || targetBackupCompany?.razaoSocial}" em formato JSON.`}
                                    </p>
                                    <Button
                                        icon={Download}
                                        onClick={handleBackup}
                                        className="w-full justify-center py-4 bg-green-600 hover:bg-green-700 shadow-xl shadow-green-100 dark:shadow-none text-white font-bold rounded-2xl"
                                    >
                                        Download Backup ({backupStats.isAll ? 'Todas as Empresas' : (targetBackupCompany?.nomeFantasia || targetBackupCompany?.razaoSocial || 'Empresa')})
                                    </Button>
                                </div>

                                <div className="p-8 border border-red-50 dark:border-red-900/30 rounded-[2.5rem] bg-[var(--bg-card)] text-center flex flex-col items-center shadow-sm hover:shadow-md transition-shadow border-2 border-dashed">
                                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-3xl flex items-center justify-center shadow-sm mb-6">
                                        <Upload className="w-8 h-8 text-red-600 dark:text-red-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-[var(--text-primary)]">Restaurar Sistema</h3>
                                    <p className="text-sm text-[var(--text-secondary)] mb-4 mt-2">
                                        Importe um arquivo de backup para restaurar ou mesclar dados no sistema.
                                    </p>
                                    <div className="p-4 bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 mb-8 w-full">
                                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider justify-center">
                                            <AlertCircle size={14} />
                                            Aviso de Segurança
                                        </div>
                                        <p className="text-[11px] text-red-500 dark:text-red-400/80 mt-2 leading-relaxed">
                                            Backups individuais de empresa permitem <strong>mesclagem seletiva</strong> mantendo as outras empresas intactas. Backups gerais substituem os dados atuais.
                                        </p>
                                    </div>
                                    <label
                                        className="w-full flex items-center justify-center gap-2 py-4 text-red-600 border border-red-100 bg-[var(--bg-card)] hover:bg-red-50 rounded-2xl cursor-pointer transition-all font-bold shadow-sm"
                                    >
                                        <Upload size={18} />
                                        <span>Selecionar Arquivo de Backup</span>
                                        <input
                                            type="file"
                                            accept=".json"
                                            className="hidden"
                                            onClick={(e) => {
                                                (e.target as HTMLInputElement).value = '';
                                            }}
                                            onChange={(e) => {
                                                handleFileChange(e);
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-3xl flex items-start gap-4">
                                <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
                                    <RefreshCw size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-blue-800 dark:text-blue-400">Dica de Segurança</h4>
                                    <p className="text-xs text-blue-600 dark:text-blue-400/70 mt-1 leading-relaxed">
                                        O sistema faz backup automático no armazenamento local a cada alteração, mas recomendamos exportar seus dados manualmente toda semana ou antes de grandes atualizações. Você pode exportar empresa por empresa ou o banco geral completo.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'atualizacao' && (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-300 max-w-3xl mx-auto py-8">
                            <SystemUpdater />
                        </div>
                    )}

                    {activeTab === 'fechamento' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300 max-w-3xl mx-auto py-4">
                            <div className="bg-[var(--accent-soft)] p-6 rounded-3xl border border-[var(--accent-primary)]/20 mb-8">
                                <div className="flex gap-4">
                                    <div className="p-3 bg-[var(--accent-primary)] text-white rounded-2xl h-fit">
                                        <Lock className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tighter">Bloqueio de Períodos (DataFecha)</h3>
                                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                                            Defina datas limite para cada módulo. Lançamentos com data igual ou anterior à informada serão bloqueados para inclusão, alteração ou exclusão.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[
                                    { id: 'lockDateEntradas', label: 'DataFecha (Entradas)', desc: 'Bloqueio de Notas de Entrada e Compras' },
                                    { id: 'lockDateSaidas', label: 'DataFecha (Saídas)', desc: 'Bloqueio de Notas de Saída e Serviços' },
                                    { id: 'lockDateCustos', label: 'DataFecha (Custos)', desc: 'Bloqueio de Folha e Custos Operacionais' },
                                    { id: 'lockDateFinanceiro', label: 'DataFecha (Financeiro)', desc: 'Bloqueio de Movimentações Bancárias' },
                                    { id: 'lockDateContabil', label: 'DataFecha (Contábil)', desc: 'Bloqueio de Lançamentos Contábeis Manuais' },
                                ].map((field) => (
                                    <div key={field.id} className="p-6 border border-[var(--border-color)] rounded-[2.5rem] bg-[var(--bg-card)] hover:shadow-md transition-all">
                                        <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2">{field.label}</label>
                                        <input
                                            type="text"
                                            placeholder="30/04/2026"
                                            className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-4 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-[var(--accent-primary)] transition-all"
                                            value={localDates[field.id] || ''}
                                            onChange={(e) => {
                                                const masked = maskDate(e.target.value);
                                                setLocalDates({ ...localDates, [field.id]: masked });
                                            }}
                                        />
                                        <p className="text-[10px] text-[var(--text-secondary)] mt-3 opacity-70 italic">{field.desc}</p>
                                    </div>
                                ))}
                            </div>
 
                            <div className="flex justify-end pt-8">
                                <Button 
                                    icon={Save} 
                                    className="px-10 py-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white shadow-xl shadow-[var(--accent-primary)]/20"
                                    onClick={async () => {
                                        const newSettings: any = { ...(contextData.systemSettings || {}) };
                                        
                                        Object.keys(localDates).forEach(key => {
                                            const val = localDates[key];
                                            if (val && val.length === 10) {
                                                const [d, m, y] = val.split('/');
                                                newSettings[key] = `${y}-${m}-${d}`;
                                            } else {
                                                newSettings[key] = '';
                                            }
                                        });

                                        try {
                                            await contextData.updateSystemSettings(newSettings);
                                            addToast('Datas de fechamento salvas com sucesso!', 'success');
                                        } catch (error) {
                                            addToast('Erro ao salvar configurações de fechamento.', 'error');
                                        }
                                    }}
                                >
                                    Salvar Bloqueios
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
            {/* User Management Modal */}
            <Modal
                isOpen={showUserModal}
                onClose={() => setShowUserModal(false)}
                title={editingUser.id ? 'Editar Usuário' : 'Novo Usuário (Pré-Cadastro)'}
            >
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (editingUser.id) {
                        await contextData.updateSystemUser(editingUser);
                        addToast('Usuário atualizado com sucesso', 'success');
                    } else {
                        await contextData.addSystemUser({
                            ...editingUser,
                            role: editingUser.role || 'Operador',
                            status: editingUser.status || 'active'
                        });
                        addToast('Usuário cadastrado com sucesso', 'success');
                    }
                    setShowUserModal(false);
                }} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nome</label>
                        <input
                            required
                            className="w-full border rounded-lg p-2"
                            value={editingUser.name || ''}
                            onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            required
                            type="email"
                            className="w-full border rounded-lg p-2"
                            value={editingUser.email || ''}
                            onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Perfil</label>
                            <select
                                className="w-full border rounded-lg p-2 bg-white"
                                value={editingUser.role || 'Operador'}
                                onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                            >
                                <option value="Admin">Administrador</option>
                                <option value="Operador">Operador</option>
                                <option value="Leitor">Leitor</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <select
                                className="w-full border rounded-lg p-2 bg-white"
                                value={editingUser.status || 'active'}
                                onChange={e => setEditingUser({ ...editingUser, status: e.target.value })}
                            >
                                <option value="active">Ativo</option>
                                <option value="inactive">Inativo</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setShowUserModal(false)}>Cancelar</Button>
                        <Button type="submit">Salvar</Button>
                    </div>
                </form>
            </Modal>
        </div >
    );
};