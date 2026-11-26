import { create } from 'zustand';

interface AuthState {
    currentUser: string;
    userEmail: string | null;
    userPhotoURL: string | null;
    userPhone: string;
    userDepartment: string;
    memberSince: string;
    userRole: 'Admin' | 'Operador' | 'Cliente';
    isLoggedIn: boolean;
    isSuperAdmin: boolean;
    master_flag: boolean;
    userType: 'ADM' | 'SUB' | null;
    userIdAdm: string | null;
    isLoaded: boolean;
    is2FAEnabled: boolean;
    
    // Actions
    setAuthStatus: (isLoggedIn: boolean, email: string | null) => void;
    setAuthProfile: (profile: Partial<AuthState>) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    currentUser: localStorage.getItem('currentUser') || 'Visitante',
    userEmail: localStorage.getItem('userEmail'),
    userPhotoURL: localStorage.getItem('userPhotoURL'),
    userPhone: localStorage.getItem('userPhone') || '+55 (11) 98765-4321',
    userDepartment: localStorage.getItem('userDepartment') || 'Diretoria (HQ)',
    memberSince: localStorage.getItem('memberSince') || 'Desde Outubro 2023',
    userRole: (localStorage.getItem('userRole') as any) || 'Cliente',
    isLoggedIn: !!localStorage.getItem('isLoggedIn'),
    isSuperAdmin: false,
    master_flag: localStorage.getItem('master_flag') === 'true',
    userType: (localStorage.getItem('userType') as any) || null,
    userIdAdm: localStorage.getItem('userIdAdm') || null,
    isLoaded: false,
    is2FAEnabled: false,

    setAuthStatus: (isLoggedIn, email) => {
        set({ isLoggedIn, userEmail: email });
    },

    setAuthProfile: (profile) => {
        set({ ...profile, isLoaded: true });
    },

    logout: () => {
        set({
            isLoggedIn: false,
            userEmail: null,
            userPhotoURL: null,
            userType: null,
            master_flag: false,
            userIdAdm: null,
        });
    }
}));
