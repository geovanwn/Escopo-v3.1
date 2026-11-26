/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />


interface Window {
    electronAPI: {
        dbGetCollection: (collectionName: string, userId: string) => Promise<any[]>;
        dbGetCollectionAll: (collectionName: string) => Promise<any[]>;
        dbGetDoc: (collectionName: string, docId: string) => Promise<any>;
        dbSaveDoc: (collectionName: string, docId: string, data: any, userId: string) => Promise<{ success: boolean; error?: string }>;
        dbDeleteDoc: (collectionName: string, docId: string) => Promise<{ success: boolean; error?: string }>;
        authLogin: (email: string, pass: string) => Promise<{ success: boolean; user?: any; error?: string }>;
        authRegister: (email: string, pass: string, name: string) => Promise<{ success: boolean; user?: any; error?: string }>;

        saveDatabase: (data: any) => Promise<boolean>;
        readDatabase: () => Promise<any>;
        configureEmail: (config: any) => Promise<any>;
        sendEmail: (options: any) => Promise<any>;
        onUpdaterMessage: (callback: (message: string) => void) => () => void;
        onAutoImportFile: (callback: (file: any) => void) => () => void;

        checkForUpdates: () => Promise<any>;
        downloadUpdate: () => Promise<any>;
        quitAndInstall: () => Promise<any>;
        setUpdateUrl: (url: string) => Promise<any>;
        onUpdaterStatus: (callback: (status: any) => void) => () => void;

        selectCertificateFile: () => Promise<string | null>;
        getCertificateInfo: (path: string, password?: string) => Promise<any>;
        listSystemCertificates: () => Promise<any>;
        signWithSerpro: (data: any) => Promise<any>;
        setActiveCertificate: (thumbprint: string) => Promise<any>;
        secureRequest: (options: any) => Promise<any>;
        fetchNFSe: (config: any) => Promise<any>;
        signXml: (data: any) => Promise<any>;

        setZoomFactor: (factor: number) => Promise<boolean>;
        getZoomFactor: () => Promise<number>;
    }
}

