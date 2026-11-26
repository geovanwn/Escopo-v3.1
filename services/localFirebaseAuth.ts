// Mapeador do Firebase Auth para SQLite Local via Electron IPC
// Permite autenticação offline puramente local.

// @ts-ignore
const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

let currentUser: any = null;
const authListeners: any[] = [];

function notifyAuth() {
    authListeners.forEach(cb => cb(currentUser));
}

function setLocalUser(user: any) {
    if (user) {
        currentUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.name,
            providerData: [{ providerId: 'custom-local' }],
            getIdToken: async () => 'mock-token-123'
        };
    } else {
        currentUser = null;
    }
    notifyAuth();
}

export const signInWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
    if (!api) {
        console.warn("Modo Web/Dev: Simulando login (Local Auth API não disponível)");
        const user = { uid: 'web-mock-user-123', email, displayName: email.split('@')[0], isApproved: true, status: 'active', role: 'Admin' };
        setLocalUser(user);
        return { user: currentUser };
    }
    const res = await api.authLogin(email, pass);
    if (res.success && res.user) {
        setLocalUser(res.user);
        return { user: currentUser };
    }
    throw new Error(res.error || "Login falhou no banco local.");
};

export const createUserWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
    if (!api) {
        console.warn("Modo Web/Dev: Simulando registro (Local Auth API não disponível)");
        const name = email.split('@')[0];
        const user = { uid: 'web-mock-user-123', email, displayName: name, isApproved: true, status: 'active', role: 'Admin' };
        setLocalUser(user);
        return { user: currentUser };
    }
    const name = email.split('@')[0]; // Default name
    const res = await api.authRegister(email, pass, name);
    if (res.success && res.user) {
        setLocalUser(res.user);
        return { user: currentUser };
    }
    throw new Error(res.error || "Registro falhou no banco local.");
};

export const signOut = async (authObj: any) => {
    setLocalUser(null);
};

export const onAuthStateChanged = (authObj: any, callback: Function) => {
    authListeners.push(callback);
    // Aciona imediatamente
    setTimeout(() => callback(currentUser), 10);
    return () => {
        const idx = authListeners.indexOf(callback);
        if (idx > -1) authListeners.splice(idx, 1);
    };
};

export const updateProfile = async (user: any, data: any) => {
    if (currentUser) {
        currentUser.displayName = data.displayName || currentUser.displayName;
    }
};

export const sendPasswordResetEmail = async (authObj: any, email: string) => { 
    throw new Error("Recuperação de senha não suportada em modo 100% offline."); 
};

export class GoogleAuthProvider {
    constructor() {}
}

export const signInWithPopup = async (authObj: any, provider: any): Promise<any> => { 
    throw new Error("Login com Google não suportado em modo 100% offline."); 
};

export const getAuth = (app?: any) => { 
    return { 
        currentUser,
        config: { apiKey: 'offline' } 
    }; 
};
