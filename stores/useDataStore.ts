import { create } from 'zustand';
import { AppData, CompanyEntity } from '../types';
import { db, auth } from '../firebaseConfig';
import { collection, doc, setDoc, addDoc, updateDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { useAuditStore } from './useAuditStore';
import { useAuthStore } from './useAuthStore';
import { useCompanyStore } from './useCompanyStore';
import { DataRepository } from '../repositories/DataRepository';

// @ts-ignore
const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
const isElectron = !!electronAPI;

const initialData: AppData = {
    companies: [],
    clients: [],
    products: [],
    services: [],
    employees: [],
    partners: [],
    invoices: [],
    ncms: [],
    taxRates: [],
    payrollItems: [],
    payrollRuns: [],
    alerts: [],
    bankAccounts: [],
    bankTransactions: [],
    filings: [],
    csts: [],
    cfops: [],
    units: [],
    operationTypes: [],
    systemUsers: [],
    costCenters: [],
    taxCalendar: [],
    spedValidations: [],
    assets: [],
    accountingEntries: [],
    accountingClosures: [],
    savedReports: [],
    pendingApprovals: [],
    systemSettings: {
        lockDateEntradas: '',
        lockDateSaidas: '',
        lockDateCustos: '',
        lockDateFinanceiro: '',
        lockDateContabil: '',
        useFirebase: true,
        useSupabase: false
    }
};

interface DataState {
    data: AppData;
    isLoaded: boolean;
    setData: (newData: Partial<AppData>) => void;
    setCollection: (key: keyof AppData, items: any[]) => void;
    addItem: (key: keyof AppData, item: any) => Promise<void>;
    updateItem: (key: keyof AppData, item: any, idField?: string) => Promise<void>;
    deleteItem: (key: keyof AppData, id: string) => Promise<void>;
    checkPeriodClosed: (date: string, companyId?: string, targetModule?: string) => boolean;
    updateSystemSettings: (settings: any) => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
    data: initialData,
    isLoaded: false,

    setData: (newData) => set((state) => ({ data: { ...state.data, ...newData } })),
    
    setCollection: (key, items) => set((state) => ({ 
        data: { ...state.data, [key]: items } 
    })),

    checkPeriodClosed: (date, companyId, targetModule) => {
        const { selectedCompanyId } = useCompanyStore.getState();
        const targetCompanyId = companyId || selectedCompanyId;
        if (!targetCompanyId || !date) return false;

        // Normalize date to YYYY-MM-DD for comparison
        let normalizedDate = date;
        if (date.includes('/')) {
            const parts = date.split('/');
            if (parts.length === 3) {
                normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } else if (parts.length === 2) {
                normalizedDate = `${parts[1]}-${parts[0].padStart(2, '0')}-01`;
            }
        }

        // 1. Check granular lock dates (System Settings)
        const settings = get().data.systemSettings;
        if (settings) {
            let lockDate = '';
            if (targetModule === 'entradas') lockDate = settings.lockDateEntradas || '';
            else if (targetModule === 'saidas') lockDate = settings.lockDateSaidas || '';
            else if (targetModule === 'custos') lockDate = settings.lockDateCustos || '';
            else if (targetModule === 'financeiro') lockDate = settings.lockDateFinanceiro || '';
            else if (targetModule === 'contabil') lockDate = settings.lockDateContabil || '';

            if (lockDate && normalizedDate <= lockDate) {
                return true;
            }
        }

        // 2. Check legacy period closures (Monthly)
        const period = normalizedDate.substring(0, 7);
        const closure = get().data.accountingClosures.find((c: any) =>
            c.companyId === targetCompanyId &&
            c.period === period &&
            c.status === 'closed'
        );
        return !!closure;
    },

    addItem: async (key, item) => {
        try {
            const { selectedCompanyId } = useCompanyStore.getState();
            const { currentUser } = useAuthStore.getState();
            const userId = isElectron ? (localStorage.getItem('currentUserId') || 'GLOBAL') : auth.currentUser?.uid;
            
            if (!userId) throw new Error("User not authenticated");

            // Period validation
            let periodDate = '';
            let targetModule = '';
            if (key === 'invoices') {
                periodDate = item.date;
                if (item.type === 'entry') targetModule = 'entradas';
                else if (['exit', 'service'].includes(item.type)) targetModule = 'saidas';
            } else if (key === 'bankTransactions') {
                periodDate = item.date;
                targetModule = 'financeiro';
            } else if (key === 'accountingEntries') {
                periodDate = item.date;
                targetModule = 'contabil';
            } else if (key === 'payrollRuns') {
                const rawComp = item.competence || '';
                periodDate = rawComp.includes('/') ? `${rawComp.split('/')[1]}-${rawComp.split('/')[0]}-28` : rawComp;
                targetModule = 'custos';
            }

            if (periodDate && get().checkPeriodClosed(periodDate, item.companyId || selectedCompanyId, targetModule)) {
                throw new Error(`Ação Bloqueada: A data de competência informada (${periodDate}) pertence a um período contábil/fiscal já encerrado.`);
            }

            const itemId = item.id || Math.random().toString(36).substr(2, 9);
            const itemWithMetadata = {
                ...item,
                id: itemId,
                userId,
                companyId: (key === 'ncms' || key === 'companies') ? undefined : (item.companyId || selectedCompanyId),
                createdBy: currentUser,
                createdBy_id: userId,
                createdBy_name: currentUser,
                createdAt: new Date().toISOString()
            };

            const docRefId = await DataRepository.add(key as string, itemWithMetadata, userId);

            // Optimistic update of local Zustand store so state immediately updates in memory & UI
            const currentItems = get().data[key] || [];
            const existingIndex = Array.isArray(currentItems) ? (currentItems as any[]).findIndex((i: any) => i.id === itemId) : -1;
            let updatedList: any[];
            if (existingIndex >= 0) {
                updatedList = [...(currentItems as any[])];
                updatedList[existingIndex] = itemWithMetadata;
            } else {
                updatedList = [...(currentItems as any[]), itemWithMetadata];
            }
            get().setCollection(key, updatedList);

            useAuditStore.getState().addAuditLog({
                userId,
                userName: currentUser,
                action: 'create',
                entity: key as string,
                entityId: docRefId,
                details: `Created new ${String(key)}`,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            });
        } catch (error: any) {
            console.error(`Error in addItem [${String(key)}]:`, error);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: error.message || 'Erro ao adicionar item', type: 'error' } }));
            }
            throw error;
        }
    },

    updateItem: async (key, item, idField = 'id') => {
        try {
            const { selectedCompanyId } = useCompanyStore.getState();
            const { currentUser } = useAuthStore.getState();
            const id = item[idField];
            const userId = isElectron ? (localStorage.getItem('currentUserId') || 'GLOBAL') : auth.currentUser?.uid;
            
            if (!id || !userId) throw new Error("ID invalid or user not authenticated");

            const collection = get().data[key];
            const existingItem = Array.isArray(collection) ? collection.find((i: any) => i[idField] === id) : null;
            let newDate = (item as any).date;
            let oldDate = existingItem ? (existingItem as any).date : undefined;
            let targetModule = '';

            if (key === 'invoices') {
                if (item.type === 'entry') targetModule = 'entradas';
                else if (['exit', 'service'].includes(item.type)) targetModule = 'saidas';
            } else if (key === 'bankTransactions') {
                targetModule = 'financeiro';
            } else if (key === 'accountingEntries') {
                targetModule = 'contabil';
            } else if (key === 'payrollRuns') {
                const rawNew = (item as any).competence || '';
                newDate = rawNew.includes('/') ? `${rawNew.split('/')[1]}-${rawNew.split('/')[0]}-28` : rawNew;
                if (existingItem) {
                    const rawOld = (existingItem as any).competence || '';
                    oldDate = rawOld.includes('/') ? `${rawOld.split('/')[1]}-${rawOld.split('/')[0]}-28` : rawOld;
                }
                targetModule = 'custos';
            }

            if (targetModule) {
                if (oldDate && get().checkPeriodClosed(oldDate, (existingItem as any)?.companyId || selectedCompanyId, targetModule)) {
                    throw new Error(`Ação Bloqueada: Este documento pertence a um período contábil/fiscal já encerrado (${oldDate}).`);
                }
                if (newDate && get().checkPeriodClosed(newDate, (item as any).companyId || selectedCompanyId, targetModule)) {
                    throw new Error(`Ação Bloqueada: A nova data informada (${newDate}) pertence a um período contábil/fiscal já encerrado.`);
                }
            }

            const itemWithAudit = {
                ...item,
                userId,
                updatedBy: currentUser,
                updatedBy_id: userId,
                updatedBy_name: currentUser,
                updatedAt: new Date().toISOString()
            };

            await DataRepository.update(key as string, id, itemWithAudit, userId);

            // Optimistic update of local Zustand store in memory
            const currentItems = get().data[key] || [];
            const updatedList = (currentItems as any[]).map((i: any) => i[idField] === id ? { ...i, ...itemWithAudit } : i);
            get().setCollection(key, updatedList);

            useAuditStore.getState().addAuditLog({
                userId,
                userName: currentUser,
                action: 'update',
                entity: key as string,
                entityId: id,
                details: `Updated ${String(key)}`,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            });
        } catch (error: any) {
            console.error(`Error in updateItem [${String(key)}]:`, error);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: error.message || 'Erro ao atualizar item', type: 'error' } }));
            }
            throw error;
        }
    },

    deleteItem: async (key, id) => {
        try {
            const { currentUser } = useAuthStore.getState();
            const userId = isElectron ? (localStorage.getItem('currentUserId') || 'GLOBAL') : auth.currentUser?.uid;
            if (!userId) return;

            if (['accountingEntries', 'invoices', 'bankTransactions', 'payrollRuns'].includes(key as string)) {
                const collection = (get().data as any)[key];
                const itemToDelete = Array.isArray(collection) ? collection.find((d: any) => d.id === id) : null;
                if (itemToDelete) {
                    let deleteDate = '';
                    let targetModule = '';
                    if (key === 'invoices') {
                        deleteDate = itemToDelete.date;
                        if (itemToDelete.type === 'entry') targetModule = 'entradas';
                        else if (['exit', 'service'].includes(itemToDelete.type)) targetModule = 'saidas';
                    } else if (key === 'bankTransactions') {
                        deleteDate = itemToDelete.date;
                        targetModule = 'financeiro';
                    } else if (key === 'accountingEntries') {
                        deleteDate = itemToDelete.date;
                        targetModule = 'contabil';
                    } else if (key === 'payrollRuns') {
                        const rawComp = itemToDelete.competence || '';
                        deleteDate = rawComp.includes('/') ? `${rawComp.split('/')[1]}-${rawComp.split('/')[0]}-28` : rawComp;
                        targetModule = 'custos';
                    }

                    if (deleteDate && get().checkPeriodClosed(deleteDate, itemToDelete.companyId, targetModule)) {
                        throw new Error(`Ação Bloqueada: Não é possível excluir documentos de um período contábil/fiscal já encerrado (${deleteDate}).`);
                    }
                }
            }

            await DataRepository.delete(key as string, id);

            // Optimistic deletion from local Zustand store in memory
            const currentItems = get().data[key] || [];
            const updatedList = (currentItems as any[]).filter((i: any) => i.id !== id);
            get().setCollection(key, updatedList);
            
            useAuditStore.getState().addAuditLog({
                userId,
                userName: currentUser,
                action: 'delete',
                entity: key as string,
                entityId: id,
                details: `Deleted ${String(key)}`,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            });
        } catch (error: any) {
            console.error(`Error in deleteItem [${String(key)}]:`, error);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: error.message || 'Erro ao excluir item', type: 'error' } }));
            }
            throw error;
        }
    },

    updateSystemSettings: async (settings) => {
        const userId = isElectron ? (localStorage.getItem('currentUserId') || 'GLOBAL') : auth.currentUser?.uid;
        if (!userId) return;

        const updatedSettings = {
            ...settings,
            lastUpdated: new Date().toISOString()
        };

        if (isElectron) {
            await electronAPI.dbSaveDoc('settings', 'global', updatedSettings, userId);
        } else {
            await setDoc(doc(db, 'settings', 'global'), updatedSettings);
        }

        set((state) => ({
            data: { ...state.data, systemSettings: updatedSettings }
        }));
    }
}));
