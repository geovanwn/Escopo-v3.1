import { create } from 'zustand';
import { CompanyEntity } from '../types';
import { db, auth } from '../firebaseConfig';
import { collection, doc, setDoc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useAuditStore } from './useAuditStore';
import { useAuthStore } from './useAuthStore';

interface CompanyState {
    companies: CompanyEntity[];
    selectedCompanyId: string | null;
    selectedCompany: CompanyEntity | null;
    isLoaded: boolean;
    setCompanies: (companies: CompanyEntity[]) => void;
    selectCompany: (id: string | null) => void;
    saveCompany: (company: CompanyEntity) => Promise<void>;
    deleteCompany: (id: string) => Promise<void>;
}

// @ts-ignore
const electronAPI = (window as any).electronAPI;
const isElectron = !!electronAPI;

export const useCompanyStore = create<CompanyState>((set, get) => ({
    companies: [],
    selectedCompanyId: localStorage.getItem('selectedCompanyId'),
    selectedCompany: null,
    isLoaded: false,

    setCompanies: (companies) => {
        const { selectedCompanyId } = get();
        let currentSelected = companies.find(c => c.id === selectedCompanyId) || null;
        
        // Auto-select behavior from DataContext
        if (!currentSelected && companies.length > 0) {
            currentSelected = companies[0];
            localStorage.setItem('selectedCompanyId', currentSelected.id);
            set({ companies, selectedCompany: currentSelected, selectedCompanyId: currentSelected.id, isLoaded: true });
        } else {
            set({ companies, selectedCompany: currentSelected, isLoaded: true });
        }
    },

    selectCompany: (id) => {
        if (id) {
            localStorage.setItem('selectedCompanyId', id);
            const { companies } = get();
            const selected = companies.find(c => c.id === id) || null;
            set({ selectedCompanyId: id, selectedCompany: selected });
        } else {
            localStorage.removeItem('selectedCompanyId');
            set({ selectedCompanyId: null, selectedCompany: null });
        }
    },

    saveCompany: async (company) => {
        const currentUser = useAuthStore.getState().currentUser;
        const currentUserId = auth.currentUser?.uid || 'GLOBAL';
        const now = new Date().toISOString();
        const isNew = !company.id;

        const companyData = {
            ...company,
            userId: currentUserId,
            ...(isNew
                ? {
                    createdBy: currentUser,
                    createdBy_id: currentUserId,
                    createdBy_name: currentUser,
                    createdAt: now
                }
                : {
                    updatedBy: currentUser,
                    updatedBy_id: currentUserId,
                    updatedBy_name: currentUser,
                    updatedAt: now
                }
            )
        };

        try {
            if (isElectron) {
                const finalId = company.id || Math.random().toString(36).substr(2, 9);
                const finalData = { ...companyData, id: finalId };
                await electronAPI.dbSaveDoc('companies', finalId, finalData, currentUserId);
                
                // Refresh local state
                const { companies } = get();
                const updatedCompanies = isNew 
                    ? [...companies, finalData as CompanyEntity]
                    : companies.map(c => c.id === finalId ? finalData as CompanyEntity : c);
                set({ companies: updatedCompanies });
                if (get().selectedCompanyId === finalId) set({ selectedCompany: finalData as CompanyEntity });

                useAuditStore.getState().addAuditLog({
                    userId: currentUserId,
                    userName: currentUser,
                    action: isNew ? 'create' : 'update',
                    entity: 'companies',
                    entityId: finalId,
                    details: `${isNew ? 'Created' : 'Updated'} company: ${company.nomeFantasia}`,
                    timestamp: now,
                    userAgent: navigator.userAgent
                });
                return;
            }

            if (isNew) {
                const docRef = await addDoc(collection(db, 'companies'), companyData);
                const finalCompany = { ...companyData, id: docRef.id } as CompanyEntity;

                // Sync Supabase
                try {
                    const { SupabaseService } = await import('../services/SupabaseService');
                    await SupabaseService.saveCompany(finalCompany as any, currentUserId);
                } catch (e) { console.error('Supabase Sync Error:', e); }

                // Update Local State
                set(state => ({ companies: [...state.companies, finalCompany] }));

                useAuditStore.getState().addAuditLog({
                    userId: currentUserId,
                    userName: currentUser,
                    action: 'create',
                    entity: 'companies',
                    entityId: docRef.id,
                    details: `Created company: ${company.nomeFantasia}`,
                    timestamp: now,
                    userAgent: navigator.userAgent
                });
            } else {
                await setDoc(doc(db, 'companies', company.id!), companyData, { merge: true });

                // Sync Supabase
                try {
                    const { SupabaseService } = await import('../services/SupabaseService');
                    await SupabaseService.saveCompany(companyData as any, currentUserId);
                } catch (e) { console.error('Supabase Sync Error:', e); }

                // Update Local State
                set(state => ({
                    companies: state.companies.map(c => c.id === company.id ? { ...c, ...companyData } as CompanyEntity : c),
                    selectedCompany: state.selectedCompanyId === company.id ? { ...state.selectedCompany, ...companyData } as CompanyEntity : state.selectedCompany
                }));

                useAuditStore.getState().addAuditLog({
                    userId: currentUserId,
                    userName: currentUser,
                    action: 'update',
                    entity: 'companies',
                    entityId: company.id!,
                    details: `Updated company: ${company.nomeFantasia}`,
                    timestamp: now,
                    userAgent: navigator.userAgent
                });
            }
        } catch (error) {
            console.error('Error saving company:', error);
            throw error;
        }
    },

    deleteCompany: async (id) => {
        const currentUser = useAuthStore.getState().currentUser;
        const currentUserId = auth.currentUser?.uid || 'GLOBAL';

        try {
            if (isElectron) {
                await electronAPI.dbDeleteDoc('companies', id);
                set(state => {
                    const updatedCompanies = state.companies.filter(c => c.id !== id);
                    const isDeletingSelected = state.selectedCompanyId === id;
                    return {
                        companies: updatedCompanies,
                        selectedCompanyId: isDeletingSelected ? null : state.selectedCompanyId,
                        selectedCompany: isDeletingSelected ? null : state.selectedCompany
                    };
                });
                useAuditStore.getState().addAuditLog({
                    userId: currentUserId,
                    userName: currentUser,
                    action: 'delete',
                    entity: 'companies',
                    entityId: id,
                    details: 'Company deleted (Local)',
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent
                });
                return;
            }

            await deleteDoc(doc(db, 'companies', id));
            
            set(state => {
                const updatedCompanies = state.companies.filter(c => c.id !== id);
                const isDeletingSelected = state.selectedCompanyId === id;
                return {
                    companies: updatedCompanies,
                    selectedCompanyId: isDeletingSelected ? null : state.selectedCompanyId,
                    selectedCompany: isDeletingSelected ? null : state.selectedCompany
                };
            });

            useAuditStore.getState().addAuditLog({
                userId: currentUserId,
                userName: currentUser,
                action: 'delete',
                entity: 'companies',
                entityId: id,
                details: 'Company deleted',
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            });
        } catch (error) {
            console.error('Error deleting company:', error);
            throw error;
        }
    }
}));
