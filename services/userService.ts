
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig'; // Adjust path if needed
import { SystemUser } from '../types';

// Collection Reference
const usersRef = collection(db, 'users');

/**
 * Service to manage System Users synchronized with Firestore
 */
export const UserService = {

    /**
     * Real-time listener for all users (Admin only)
     * @param callback Function to update state with users list
     * @returns Unsubscribe function
     */
    subscribeToAllUsers: (callback: (users: SystemUser[]) => void) => {
        const q = query(usersRef);
        return onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SystemUser[];
            callback(users);
        }, (error) => {
            console.error("Error fetching users real-time:", error);
        });
    },

    /**
     * Real-time listener for sub-users of an ADM
     * @param admId ID of the administrator
     * @param callback Function to update state
     * @returns Unsubscribe function
     */
    subscribeToSubUsers: (admId: string, callback: (users: SystemUser[]) => void) => {
        const q = query(usersRef, where('id_adm', '==', admId));
        return onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SystemUser[];
            callback(users);
        }, (error) => {
            console.error("Error fetching sub-users real-time:", error);
        });
    },

    /**
     * Real-time listener for pending approvals (Admin only)
     * @param callback Function to update state with pending users
     * @returns Unsubscribe function
     */
    subscribeToPendingUsers: (callback: (users: SystemUser[]) => void) => {
        const q = query(usersRef, where('status', '==', 'pending'));
        return onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SystemUser[];
            callback(users);
        }, (error) => {
            console.error("Error fetching pending users:", error);
        });
    },

    /**
     * Manually fetch all users (for Refresh button)
     * Forces fetch from server to bypass local cache
     */
    fetchAllUsers: async (): Promise<SystemUser[]> => {
        try {
            // Use getDocsFromServer to ensure we get the latest data from backend
            const { getDocsFromServer } = await import('firebase/firestore');
            const snapshot = await getDocsFromServer(usersRef);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SystemUser[];
        } catch (error) {
            console.error("Error fetching all users manually:", error);
            throw error;
        }
    },

    /**
     * Approve a pending user
     */
    approveUser: async (uid: string, role: string = 'Operador', permissions: any = {}) => {
        if (!auth.currentUser) throw new Error("Unauthorized");

        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                status: 'active',
                isApproved: true,
                role: role,
                permissions: permissions,
                approvedAt: new Date().toISOString(),
                approvedBy: auth.currentUser.uid,
                approvedBy_name: auth.currentUser.displayName || 'Admin',
                updatedAt: new Date().toISOString(),
                updatedBy: auth.currentUser.displayName || 'Admin',
                updatedBy_id: auth.currentUser.uid,
                updatedBy_name: auth.currentUser.displayName || 'Admin'
            });
            return true;
        } catch (error) {
            console.error("Error approving user:", error);
            throw error;
        }
    },

    /**
     * Reject or Block a user
     */
    rejectUser: async (uid: string) => {
        if (!auth.currentUser) throw new Error("Unauthorized");

        try {
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists() && userSnap.data().master_flag === true) {
                throw new Error("O ADM Master não pode ser desativado.");
            }
            await updateDoc(userRef, {
                status: 'inactive',
                isApproved: false,
                rejectedAt: new Date().toISOString(),
                rejectedBy: auth.currentUser.uid,
                rejectedBy_name: auth.currentUser.displayName || 'Admin',
                updatedAt: new Date().toISOString(),
                updatedBy: auth.currentUser.displayName || 'Admin',
                updatedBy_id: auth.currentUser.uid,
                updatedBy_name: auth.currentUser.displayName || 'Admin'
            });
            return true;
        } catch (error) {
            console.error("Error rejecting user:", error);
            throw error;
        }
    },

    /**
     * Create a new user (or overwrite existing)
     */
    createUser: async (uid: string, data: SystemUser) => {
        if (!auth.currentUser) throw new Error("Unauthorized");

        try {
            const userRef = doc(db, 'users', uid);
            // Use setDoc to create or overwrite
            await setDoc(userRef, {
                ...data,
                uid: uid,
                createdAt: new Date().toISOString(),
                createdBy: auth.currentUser.displayName || 'System',
                createdBy_id: auth.currentUser.uid,
                createdBy_name: auth.currentUser.displayName || 'System',
                updatedAt: new Date().toISOString(),
                updatedBy: auth.currentUser.displayName || 'System',
                updatedBy_id: auth.currentUser.uid,
                updatedBy_name: auth.currentUser.displayName || 'System'
            });
            return true;
        } catch (error) {
            console.error("Error creating user:", error);
            throw error;
        }
    },

    /**
     * Update user details/permissions
     */
    updateUser: async (uid: string, data: Partial<SystemUser>) => {
        if (!auth.currentUser) throw new Error("Unauthorized");

        try {
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists() && userSnap.data().master_flag === true && data.master_flag === false) {
                throw new Error("O ADM Master não pode ser rebaixado.");
            }
            if (userSnap.exists() && userSnap.data().master_flag === true && data.status === 'inactive') {
                throw new Error("O ADM Master não pode ser desativado.");
            }
            await updateDoc(userRef, {
                ...data,
                updatedAt: new Date().toISOString(),
                updatedBy: auth.currentUser.displayName || 'System',
                updatedBy_id: auth.currentUser.uid,
                updatedBy_name: auth.currentUser.displayName || 'System'
            });
            return true;
        } catch (error) {
            console.error("Error updating user:", error);
            throw error;
        }
    },

    /**
     * Ensures a Firestore document exists for the user (Self-healing)
     * Call this when a user logs in but might not have a doc
     */
    ensureUserDocument: async (user: any) => {
        if (!user) return;

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            console.log(`Creating missing Firestore document for user: ${user.email}`);
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                name: user.displayName || user.email?.split('@')[0] || 'Novo Usuário',
                photoURL: user.photoURL || null,
                role: 'Cliente',
                status: 'pending',
                isApproved: false,
                createdAt: new Date().toISOString(),
                createdBy: 'System (Auto-healing)',
                createdBy_id: 'SYSTEM',
                createdBy_name: 'System (Auto-healing)',
                updatedAt: new Date().toISOString(),
                updatedBy: 'System (Auto-healing)',
                updatedBy_id: 'SYSTEM',
                updatedBy_name: 'System (Auto-healing)',
                providerId: user.providerData?.[0]?.providerId || 'firebase'
            });
        }
    }
};
