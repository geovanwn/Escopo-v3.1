// Firestore Adapter backed by SQLite through electronAPI

interface Listener {
    collectionName: string;
    callback: Function;
    filters?: any[];
}
const listeners: Listener[] = [];

function notifyListeners(collectionName: string) {
    if (!window.electronAPI || !window.electronAPI.dbGetCollectionAll) return;

    // A simple mechanism to update active snapshot listeners
    const relevantListeners = listeners.filter(l => l.collectionName === collectionName);
    if (relevantListeners.length === 0) return;

    window.electronAPI.dbGetCollectionAll(collectionName).then(allDocs => {
        relevantListeners.forEach(l => {
            let filteredDocs = allDocs;
            if (l.filters && l.filters.length > 0) {
                // Apply simple where equality filters (e.g., where('userId', '==', uid))
                l.filters.forEach(f => {
                    if (f.op === '==') {
                        filteredDocs = filteredDocs.filter((d: any) => d[f.field] === f.value);
                    }
                });
            }

            const snapshot = {
                docs: filteredDocs.map((d: any) => ({
                    id: d.id || d.docId,
                    exists: () => true,
                    data: () => d
                }))
            };
            l.callback(snapshot);
        });
    });
}

export const initializeFirestore = (app: any, config: any) => ({});
export const getFirestore = () => ({});

export const collection = (db: any, path: string) => {
    return { path, isCollection: true };
};

export const doc = (dbOrCol: any, pathOrId: string, idParam?: string) => {
    if (dbOrCol && dbOrCol.isCollection) {
        // called as doc(collection(db, 'users'), id)
        return { collectionName: dbOrCol.path, id: pathOrId || Math.random().toString(36).substring(2) };
    }
    // called as doc(db, 'users', id) 
    return { collectionName: pathOrId, id: idParam || Math.random().toString(36).substring(2) };
};

export const query = (colRef: any, ...filters: any[]) => {
    return { collectionName: colRef.path, filters };
};

export const where = (field: string, op: string, value: any) => {
    return { field, op, value, type: 'where' };
};

export const orderBy = (field: string, direction: 'asc' | 'desc' = 'asc') => {
    return { field, direction, type: 'orderBy' };
};

export const limit = (max: number) => {
    return { max, type: 'limit' };
};

export const getDoc = async (docRef: any) => {
    if (!window.electronAPI) return { exists: () => false, data: () => null };
    const docData = await window.electronAPI.dbGetDoc(docRef.collectionName, docRef.id);
    return {
        exists: () => !!docData,
        data: () => docData,
        id: docRef.id
    };
};

export const getDocs = async (queryRef: any) => {
    if (!window.electronAPI) return { docs: [] };
    let data: any;
    if (queryRef.filters && queryRef.filters.length > 0) {
        const userIdFilter = queryRef.filters.find((f: any) => f.field === 'userId');
        if (userIdFilter && userIdFilter.op === '==') {
            data = await window.electronAPI.dbGetCollection(queryRef.collectionName, userIdFilter.value);
        } else {
            data = await window.electronAPI.dbGetCollectionAll(queryRef.collectionName);
            queryRef.filters.forEach((f: any) => {
                if (f.op === '==') data = data.filter((d: any) => d[f.field] === f.value);
            });
        }
    } else {
        data = await window.electronAPI.dbGetCollectionAll(queryRef.collectionName);
    }
    return {
        docs: data.map((d: any) => ({
            id: d.id,
            exists: () => true,
            data: () => d
        }))
    };
};

export const onSnapshot = (queryRef: any, callback: Function, errorCallback?: Function) => {
    const listenerProps: Listener = {
        collectionName: queryRef.collectionName || queryRef.path,
        callback,
        filters: queryRef.filters || []
    };
    
    listeners.push(listenerProps);
    
    // Trigger initial fetch immediately
    if (window.electronAPI) {
        getDocs(queryRef).then(result => callback(result)).catch(e => errorCallback && errorCallback(e));
    }

    return () => {
        const idx = listeners.indexOf(listenerProps);
        if (idx > -1) listeners.splice(idx, 1);
    };
};

export const addDoc = async (colRef: any, data: any) => {
    const docId = Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    if (window.electronAPI) {
        await window.electronAPI.dbSaveDoc(colRef.path, docId, data, data.userId || 'GLOBAL');
        notifyListeners(colRef.path);
    }
    return { id: docId, path: colRef.path };
};

export const setDoc = async (docRef: any, data: any, options?: { merge?: boolean }) => {
    if (window.electronAPI) {
        let finalData = data;
        if (options?.merge) {
            const existing = await window.electronAPI.dbGetDoc(docRef.collectionName, docRef.id);
            if (existing) {
                finalData = { ...existing, ...data };
            }
        }
        await window.electronAPI.dbSaveDoc(docRef.collectionName, docRef.id, finalData, finalData.userId || 'GLOBAL');
        notifyListeners(docRef.collectionName);
    }
};

export const updateDoc = async (docRef: any, data: any) => {
    if (window.electronAPI) {
        const existing = await window.electronAPI.dbGetDoc(docRef.collectionName, docRef.id) || {};
        const finalData = { ...existing, ...data };
        await window.electronAPI.dbSaveDoc(docRef.collectionName, docRef.id, finalData, finalData.userId || 'GLOBAL');
        notifyListeners(docRef.collectionName);
    }
};

export const deleteDoc = async (docRef: any) => {
    if (window.electronAPI) {
        await window.electronAPI.dbDeleteDoc(docRef.collectionName, docRef.id);
        notifyListeners(docRef.collectionName);
    }
};

export const serverTimestamp = () => new Date().toISOString();

export const Timestamp = {
    now: () => ({ toDate: () => new Date() })
};
