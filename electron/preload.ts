import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
// --------- Expose specific API to the Renderer process ---------
contextBridge.exposeInMainWorld('electronAPI', {
    // SQLite Local DB
    dbGetCollection: (collectionName: string, userId: string) => ipcRenderer.invoke('db-get-collection', collectionName, userId),
    dbGetCollectionAll: (collectionName: string) => ipcRenderer.invoke('db-get-collection-all', collectionName),
    dbGetDoc: (collectionName: string, docId: string) => ipcRenderer.invoke('db-get-doc', collectionName, docId),
    dbSaveDoc: (collectionName: string, docId: string, data: any, userId: string) => ipcRenderer.invoke('db-save-doc', collectionName, docId, data, userId),
    dbDeleteDoc: (collectionName: string, docId: string) => ipcRenderer.invoke('db-delete-doc', collectionName, docId),
    authLogin: (email: string, pass: string) => ipcRenderer.invoke('auth-login', email, pass),
    authRegister: (email: string, pass: string, name: string) => ipcRenderer.invoke('auth-register', email, pass, name),

    saveDatabase: (data: any) => ipcRenderer.invoke('save-database', data),
    readDatabase: () => ipcRenderer.invoke('read-database'),
    configureEmail: (config: any) => ipcRenderer.invoke('configure-email', config),
    sendEmail: (options: any) => ipcRenderer.invoke('send-email', options),
    onUpdaterMessage: (callback: (message: string) => void) => {
        const subscription = (_event: any, message: string) => callback(message);
        ipcRenderer.on('updater-message', subscription);
        return () => ipcRenderer.off('updater-message', subscription);
    },
    onAutoImportFile: (callback: (file: any) => void) => {
        const subscription = (_event: any, file: any) => callback(file);
        ipcRenderer.on('auto-import-file', subscription);
        return () => ipcRenderer.off('auto-import-file', subscription);
    },
    onSyncCompleted: (callback: (data: any) => void) => {
        const subscription = (_event: any, data: any) => callback(data);
        ipcRenderer.on('sync-completed', subscription);
        return () => ipcRenderer.off('sync-completed', subscription);
    },
    // Updater API
    checkForUpdates: () => ipcRenderer.invoke('check-for-update'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
    setUpdateUrl: (url: string) => ipcRenderer.invoke('set-update-url', url),
    onUpdaterStatus: (callback: (status: any) => void) => {
        const subscription = (_event: any, status: any) => callback(status);
        ipcRenderer.on('updater-status', subscription);
        return () => ipcRenderer.off('updater-status', subscription);
    },

    // SSL / Certificate Methods
    selectCertificateFile: () => ipcRenderer.invoke('select-certificate-file'),
    getCertificateInfo: (path: string, password?: string) => ipcRenderer.invoke('get-certificate-info', path, password),
    listSystemCertificates: () => ipcRenderer.invoke('list-system-certificates'),
    signWithSerpro: (data: any) => ipcRenderer.invoke('sign-with-serpro', data),
    setActiveCertificate: (thumbprint: string) => ipcRenderer.invoke('set-active-certificate', thumbprint),
    secureRequest: (options: any) => ipcRenderer.invoke('secure-request', options),
    fetchNFSe: (config: any) => ipcRenderer.invoke('fetch-nfse', config),
    signXml: (data: any) => ipcRenderer.invoke('sign-xml', data),

    // Zoom API
    setZoomFactor: (factor: number) => ipcRenderer.invoke('set-zoom-factor', factor),
    getZoomFactor: () => ipcRenderer.invoke('get-zoom-factor'),

    // Cloud Sync
    syncCloudNow: (userId: string) => ipcRenderer.invoke('sync-cloud-now', userId)
})

