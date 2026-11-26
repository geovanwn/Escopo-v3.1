// Authentication Adapter backed by SQLite through electronAPI

let currentUser: any = null;
type AuthListener = (user: any) => void;
const authListeners: AuthListener[] = [];

function notifyAuthListeners() {
    authListeners.forEach(l => l(currentUser));
}

export const getAuth = (app?: any) => ({
    get currentUser() { return currentUser; }
});

export const onAuthStateChanged = (authObj: any, callback: AuthListener) => {
    authListeners.push(callback);
    // Initial call
    const cachedUid = localStorage.getItem('localAuthUid');
    if (cachedUid && !currentUser && window.electronAPI) {
        window.electronAPI.dbGetDoc('local_users', cachedUid).then(userData => {
            if (userData) {
                currentUser = {
                    uid: userData.uid,
                    email: userData.email,
                    displayName: userData.displayName,
                    getIdToken: async () => 'mock-token-' + userData.uid
                };
            }
            callback(currentUser);
        });
    } else {
        callback(currentUser);
    }
    
    return () => {
        const idx = authListeners.indexOf(callback);
        if (idx > -1) authListeners.splice(idx, 1);
    };
};

export const signInWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
    if (!window.electronAPI) throw new Error("API Offline");
    const res = await window.electronAPI.authLogin(email, pass);
    if (!res.success) {
        const err: any = new Error(res.error);
        err.code = 'auth/wrong-password';
        throw err;
    }
    
    currentUser = {
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName,
        getIdToken: async () => 'mock-token-' + res.user.uid
    };
    
    localStorage.setItem('localAuthUid', res.user.uid);
    notifyAuthListeners();
    return { user: currentUser };
};

export const createUserWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
    if (!window.electronAPI) throw new Error("API Offline");
    const name = email.split('@')[0];
    const res = await window.electronAPI.authRegister(email, pass, name);
    if (!res.success) {
        throw new Error(res.error);
    }
    
    currentUser = {
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName,
        getIdToken: async () => 'mock-token-' + res.user.uid
    };
    
    localStorage.setItem('localAuthUid', res.user.uid);
    notifyAuthListeners();
    return { user: currentUser };
};

export const updateProfile = async (userObj: any, updates: { displayName?: string, photoURL?: string }) => {
    if (currentUser) {
        currentUser.displayName = updates.displayName || currentUser.displayName;
        currentUser.photoURL = updates.photoURL || currentUser.photoURL;
        notifyAuthListeners();
    }
};

export const signOut = async (authObj: any) => {
    currentUser = null;
    localStorage.removeItem('localAuthUid');
    notifyAuthListeners();
};

export class GoogleAuthProvider {}

export const signInWithPopup = async () => {
    throw new Error("O Google Login foi desativado na versão com Banco de Dados Offline.");
};

export const sendPasswordResetEmail = async () => {
    throw new Error("Reset de senha indisponível na versão offline. Contate o administrador local.");
};

export const linkWithPopup = async () => {
    throw new Error("Vínculo de contas indisponível na versão offline.");
};

export const unlink = async () => {};

export const signInWithCustomToken = async () => {};
