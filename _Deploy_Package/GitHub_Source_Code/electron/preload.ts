import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
// --------- Expose specific API to the Renderer process ---------
contextBridge.exposeInMainWorld('electronAPI', {
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
    }
})
