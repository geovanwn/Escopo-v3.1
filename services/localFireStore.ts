// Mapeador do Firestore para SQLite Local via Electron IPC
// Isso substitui as importações de 'firebase/firestore' permitindo que o app funcione 100% offline.

// @ts-ignore
const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

export const collection = (dbOrCol: any, ...paths: string[]) => {
    const parts = (dbOrCol && dbOrCol.path) ? [dbOrCol.path, ...paths] : paths;
    return { path: parts.filter(Boolean).join('/') };
};

export const doc = (dbOrCol: any, ...paths: string[]) => {
    const parts = (dbOrCol && dbOrCol.path) ? [dbOrCol.path, ...paths] : paths;
    const fullPath = parts.filter(Boolean).join('/');
    const pathSegments = fullPath.split('/');
    if (pathSegments.length % 2 === 0) {
        const id = pathSegments.pop();
        return { path: pathSegments.join('/'), id };
    } else {
        return { path: fullPath, id: Math.random().toString(36).substr(2, 9) };
    }
};
export const query = (col: any, ...args: any[]) => { return { ...col, queries: args }; };
export const where = (field: string, op: string, val: any) => { return { field, op, val }; };
export const orderBy = (field: string, direction: string = 'asc') => { return { type: 'orderBy', field, direction }; };
export const limit = (l: number) => { return { type: 'limit', value: l }; };

const listeners: any[] = [];

export const onSnapshot = (q: any, callback: Function, errorCb?: Function) => {
    const colName = q.path;
    const loadData = async () => {
        try {
            let data: any[] = [];
            if (api) {
                // Busca tudo localmente
                data = await api.dbGetCollectionAll(colName);
            }

            // Aplica os filtros (where) nativamente no array (modo offline)
            if (q.queries && q.queries.length > 0) {
                q.queries.forEach((queryItem: any) => {
                    if (queryItem && queryItem.op === '==') {
                        data = data.filter((d: any) => d[queryItem.field] === queryItem.val);
                    }
                });
            }

            callback({
                docs: data.map((d: any) => ({
                    data: () => d,
                    id: d.id,
                    exists: () => true
                })),
                size: data.length
            });
        } catch (error) {
            console.error("Erro no onSnapshot local:", error);
            if (errorCb) errorCb(error);
        }
    };

    loadData();
    const l = { colName, q, loadData };
    listeners.push(l);
    return () => {
        const idx = listeners.indexOf(l);
        if (idx > -1) listeners.splice(idx, 1);
    };
};

export const notifyListeners = (collectionName: string) => {
    listeners.forEach(l => {
        if (l.colName === collectionName) {
            l.loadData();
        }
    });
};

export const addDoc = async (col: any, data: any) => {
    if (!api) { console.warn("Local DB não disponível (addDoc)"); return { id: 'temp_' + Date.now() }; }
    let id = data.id || Math.random().toString(36).substr(2, 12);
    // Limpeza de campos indefinidos
    const cleanData = JSON.parse(JSON.stringify(data));
    try {
        await api.dbSaveDoc(col.path, id, cleanData, cleanData.userId || 'GLOBAL');
        notifyListeners(col.path);
        return { id };
    } catch (e) {
        console.error("addDoc Error", e);
        throw e;
    }
};

export const setDoc = async (docRef: any, data: any, options?: any) => {
    if (!api) { console.warn("Local DB não disponível (setDoc)"); return; }
    const cleanData = JSON.parse(JSON.stringify(data));
    
    // Se for merge, temos que pegar o que ja existe
    let finalData = cleanData;
    if (options && options.merge) {
        const existing = await api.dbGetDoc(docRef.path, docRef.id);
        if (existing) finalData = { ...existing, ...cleanData };
    }

    await api.dbSaveDoc(docRef.path, docRef.id, finalData, finalData.userId || 'GLOBAL');
    notifyListeners(docRef.path);
};

export const updateDoc = async (docRef: any, data: any) => {
    if (!api) return;
    const existing = await api.dbGetDoc(docRef.path, docRef.id);
    if (!existing) throw new Error("Documento não encontrado para atualizar.");
    const cleanData = JSON.parse(JSON.stringify(data));
    const updated = { ...existing, ...cleanData };
    await api.dbSaveDoc(docRef.path, docRef.id, updated, updated.userId || 'GLOBAL');
    notifyListeners(docRef.path);
};

export const deleteDoc = async (docRef: any) => {
    if (!api) return;
    await api.dbDeleteDoc(docRef.path, docRef.id);
    notifyListeners(docRef.path);
};

export const getDoc = async (docRef: any) => {
    if (!api) {
        if (docRef.id === 'web-mock-user-123') {
            return {
                exists: () => true,
                data: () => ({ name: 'Admin Mock (Web)', role: 'Admin', status: 'active', isApproved: true, tipo_usuario: 'ADM', master_flag: true }),
                id: docRef.id
            };
        }
        return { exists: () => false, data: () => null, id: docRef.id };
    }
    const data = await api.dbGetDoc(docRef.path, docRef.id);
    return {
        exists: () => !!data,
        data: () => data,
        id: docRef.id
    };
};

export const getDocs = async (q: any) => {
    if (!api) return { docs: [], size: 0 };
    let data = await api.dbGetCollectionAll(q.path);
    if (q.queries && q.queries.length > 0) {
        q.queries.forEach((queryItem: any) => {
            if (queryItem && queryItem.op === '==') {
                data = data.filter((d: any) => d[queryItem.field] === queryItem.val);
            }
        });
    }
    return {
        docs: data.map((d: any) => ({ data: () => d, id: d.id, exists: () => true })),
        size: data.length
    };
};

export class Timestamp {
    static now() { return new Date().toISOString(); }
}

export const serverTimestamp = () => new Date().toISOString();
export const initializeFirestore = () => ({});
