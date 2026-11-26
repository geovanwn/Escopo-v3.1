// @ts-ignore
const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
const isElectron = !!electronAPI;

import { db } from '../firebaseConfig';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useDataStore } from '../stores/useDataStore';

export class DataRepository {
    
    /**
     * Adiciona um documento na base de dados
     * @param collectionName Nome da coleção
     * @param item Objeto com os dados, já incluindo metadados como id, userId, etc.
     */
    static async add(collectionName: string, item: any, userId: string): Promise<string> {
        let savedId = item.id;
        const settings = useDataStore.getState().data.systemSettings;
        const useFirebase = settings?.useFirebase ?? true;
        
        if (isElectron) {
            // Salva no SQLite via Electron IPC
            await electronAPI.dbSaveDoc(collectionName, savedId, item, userId);
        } else if (useFirebase) {
            // Salva no Firebase
            const docRef = await addDoc(collection(db, collectionName), item);
            savedId = docRef.id;
            item.id = savedId;
        }

        return savedId;
    }

    /**
     * Atualiza um documento existente
     */
    static async update(collectionName: string, id: string, item: any, userId: string): Promise<void> {
        const settings = useDataStore.getState().data.systemSettings;
        const useFirebase = settings?.useFirebase ?? true;

        if (isElectron) {
            await electronAPI.dbSaveDoc(collectionName, id, item, userId);
        } else if (useFirebase) {
            await updateDoc(doc(db, collectionName, id), item);
        }
    }

    /**
     * Deleta um documento
     */
    static async delete(collectionName: string, id: string): Promise<void> {
        const settings = useDataStore.getState().data.systemSettings;
        const useFirebase = settings?.useFirebase ?? true;

        if (isElectron) {
            await electronAPI.dbDeleteDoc(collectionName, id);
        } else if (useFirebase) {
            const finalCollectionName = collectionName === 'systemUsers' ? 'users' : collectionName;
            await deleteDoc(doc(db, finalCollectionName, id));
        }
    }
}
