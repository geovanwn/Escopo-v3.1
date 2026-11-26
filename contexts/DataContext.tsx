// Data Context - Main State Management
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppData, Client, Product, Service, Employee, Partner, Invoice, NCM, TaxRate, PayrollItem, CompanyEntity, FiscalAlert, PayrollRun, BankAccount, BankTransaction, Filing, CST, CFOP, UnitOfMeasure, OperationType, SystemUser, CostCenter, TaxCalendarEvent, PreSpedValidationLog, AccountingEntry, FixedAsset, AuditLogEntry, AccountingClosure, SavedReport, SystemSettings } from '../types';
import { db, auth } from '../firebaseConfig';
import { collection, doc, setDoc, getDocs, getDoc, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut as firebaseSignOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
type User = any;
import { useNotificationStore } from '../stores/useNotificationStore';
import { useAuditStore } from '../stores/useAuditStore';
import { useWorkflowStore } from '../stores/useWorkflowStore';
import { useCompanyStore } from '../stores/useCompanyStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useDataStore } from '../stores/useDataStore';
import { verifyLicense } from '../services/licenseService';
import { UserService } from '../services/userService';
import { parseDateSafe } from '../utils/formatters';
import { DataRepository } from '../repositories/DataRepository';


// AuditLog removed, using AuditLogEntry from types

interface DataContextType extends AppData {
  selectedCompanyId: string | null;
  selectedCompany: CompanyEntity | null;
  selectCompany: (id: string | null) => void;
  saveCompany: (company: CompanyEntity) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;

  addClient: (item: Client) => Promise<void>;
  addSystemUser: (item: SystemUser) => Promise<void>; // New
  updateSystemUser: (item: SystemUser) => Promise<void>; // New
  addProduct: (item: Product) => Promise<void>;
  addService: (item: Service) => Promise<void>;
  addEmployee: (item: Employee) => Promise<void>;
  addPartner: (item: Partner) => Promise<void>;
  addInvoice: (item: Invoice) => Promise<void>;
  addNCM: (item: NCM) => Promise<void>;
  addTaxRate: (item: TaxRate) => Promise<void>;
  addPayrollItem: (item: PayrollItem) => Promise<void>;
  addPayrollRun: (item: PayrollRun) => Promise<void>;
  addBankAccount: (item: BankAccount) => Promise<void>;
  addBankTransaction: (item: BankTransaction) => Promise<void>;
  addCST: (item: CST) => Promise<void>;
  addCFOP: (item: CFOP) => Promise<void>;
  addUnit: (item: UnitOfMeasure) => Promise<void>;
  addOperationType: (item: OperationType) => Promise<void>;
  addCostCenter: (item: CostCenter) => Promise<void>;
  addTaxCalendarEvent: (item: TaxCalendarEvent) => Promise<void>;
  addPreSpedLog: (item: PreSpedValidationLog) => Promise<void>;

  updateClient: (item: Client) => Promise<void>;
  updateEmployee: (item: Employee) => Promise<void>;
  updatePartner: (item: Partner) => Promise<void>;
  updateProduct: (item: Product) => Promise<void>;
  updateService: (item: Service) => Promise<void>;
  updateNCM: (item: NCM) => Promise<void>;
  updateCST: (item: CST) => Promise<void>;
  updateCFOP: (item: CFOP) => Promise<void>;
  updateUnit: (item: UnitOfMeasure) => Promise<void>;
  updateOperationType: (item: OperationType) => Promise<void>;
  updateTaxRate: (item: TaxRate) => Promise<void>;
  updatePayrollItem: (item: PayrollItem) => Promise<void>;
  updateInvoice: (item: Invoice) => Promise<void>;
  updatePayrollRun: (item: PayrollRun) => Promise<void>;
  updateBankAccount: (item: BankAccount) => Promise<void>;
  updateBankTransaction: (item: BankTransaction) => Promise<void>;
  updateCostCenter: (item: CostCenter) => Promise<void>;
  updateTaxCalendarEvent: (item: TaxCalendarEvent) => Promise<void>;
  updatePreSpedLog: (item: PreSpedValidationLog) => Promise<void>;
  addAsset: (item: FixedAsset) => Promise<void>;
  updateAsset: (item: FixedAsset) => Promise<void>;
  addAccountingEntry: (item: AccountingEntry) => Promise<void>;
  updateAccountingEntry: (item: AccountingEntry) => Promise<void>;

  addAccountingClosure: (item: AccountingClosure) => Promise<void>;
  updateAccountingClosure: (item: AccountingClosure) => Promise<void>;
  checkPeriodClosed: (date: string, companyId?: string, targetModule?: string) => boolean;

  addSavedReport: (item: SavedReport) => Promise<void>;
  updateFiling: (item: Filing) => Promise<void>;
  addFiling: (item: Filing) => Promise<void>;
  settleInvoice: (invoiceId: string, bankAccountId: string, date: string, valuePaid: number) => Promise<void>;

  deleteItem: (type: keyof AppData, id: string) => Promise<void>;
  deletePayrollRun: (id: string) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<void>;

  addAlert: (alert: FiscalAlert) => void;
  markAllAsRead: () => void;
  clearAlerts: () => void;

  approveTransaction: (id: string, type: 'invoice' | 'record') => Promise<void>;
  generateDRE: (companyId: string, startDate: string, endDate: string) => any;
  calculateProductTaxes: (productId: string, destinationState: string) => any;
  loadBackup: (data: AppData) => Promise<void>;

  systemSettings?: SystemSettings;
  updateSystemSettings: (settings: SystemSettings) => Promise<void>;
  currentUser: string;
  userEmail: string | null;
  userRole: 'Admin' | 'Operador' | 'Cliente';
  isLoggedIn: boolean;
  isLoaded: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<{ success: boolean; error?: string }>;
  updateCurrentUser: (name: string, role?: any) => void;

  // Real 2FA (Item 5)
  is2FAEnabled: boolean;
  enable2FA: () => Promise<void>;

  // Audit (Item 7)
  addAuditLog: (action: AuditLogEntry['action'], entity: string, entityId: string, details: string) => Promise<void>;

  // Profile Extensions
  userPhone: string;
  userDepartment: string; // Added
  userPhotoURL: string | null;
  memberSince: string;
  updateUserProfile: (data: { name?: string; phone?: string; photoURL?: string; memberSince?: string; email?: string; role?: string; department?: string }) => Promise<void>;

  // Auth Extensions
  resetPassword: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<boolean>;

  // Permissions
  userPermissions: any;
  updateUserPermissions: (permissions: any) => Promise<void>;
  approveUser: (uid: string, role: string, permissions: any) => Promise<void>;
  rejectUser: (uid: string) => Promise<void>;
  isSuperAdmin: boolean;
  master_flag: boolean;
  userType: 'ADM' | 'SUB' | null;
  userIdAdm: string | null;
  refreshSystemUsers: () => Promise<void>;
}
const ADM_CNPJ = '62.667.939/0001-61';

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEY = 'escopov3_db_gold_multi';
const CURRENT_USER = 'Admin User'; // Mock User for Audit Trails

// @ts-ignore
const electronAPI = (window as any).electronAPI;
const isElectron = !!electronAPI;

const initialData: AppData = {
  companies: [],
  clients: [],
  products: [],
  services: [],
  employees: [],
  partners: [],
  invoices: [],
  ncms: [],
  taxRates: [],
  payrollItems: [],
  payrollRuns: [],
  alerts: [],
  bankAccounts: [],
  bankTransactions: [],
  filings: [],
  csts: [],
  cfops: [],
  units: [],
  operationTypes: [],
  systemUsers: [],
  costCenters: [],
  taxCalendar: [],
  spedValidations: [],
  assets: [],
  accountingEntries: [],
  accountingClosures: [],
  savedReports: [],
  pendingApprovals: []
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const setCollection = useDataStore(state => state.setCollection);
  const storeAddItem = useDataStore(state => state.addItem);
  const storeUpdateItem = useDataStore(state => state.updateItem);
  const storeDeleteItem = useDataStore(state => state.deleteItem);

  const [data, setDataState] = useState(() => useDataStore.getState().data);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const unsub = useDataStore.subscribe((state) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setDataState(state.data);
      }, 100);
    });
    return () => {
      unsub();
      clearTimeout(timeoutId);
    };
  }, []);

  const { selectedCompanyId, selectCompany: setSelectedCompanyId } = useCompanyStore();
  const [currentUser, setCurrentUser] = useState<string>(() => localStorage.getItem('currentUser') || 'Visitante');
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('userEmail'));
  const [userPhone, setUserPhone] = useState<string>(() => localStorage.getItem('userPhone') || '+55 (11) 98765-4321');
  const [userDepartment, setUserDepartment] = useState<string>(() => localStorage.getItem('userDepartment') || 'Diretoria (HQ)');
  const [userPhotoURL, setUserPhotoURL] = useState<string | null>(() => localStorage.getItem('userPhotoURL'));
  const [memberSince, setMemberSince] = useState<string>(() => localStorage.getItem('memberSince') || 'Desde Outubro 2023');
  const [userRole, setUserRole] = useState<'Admin' | 'Operador' | 'Cliente'>(() => (localStorage.getItem('userRole') as any) || 'Admin');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as any) || 'light');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!localStorage.getItem('isLoggedIn'));
  const [isLoaded, setIsLoaded] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [userPermissions, setUserPermissions] = useState<any>({
    fiscal: 'full',
    financial: 'full',
    hr: 'full',
    admin: 'full',
    inventory: 'full'
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const master_flag = useAuthStore(state => state.master_flag);
  const [userType, setUserType] = useState<'ADM' | 'SUB' | null>((localStorage.getItem('userType') as any) || null);
  const [userIdAdm, setUserIdAdm] = useState<string | null>(localStorage.getItem('userIdAdm') || null);

  const loadLocalData = async () => {
    setIsLoaded(false);
    const userId = localStorage.getItem('currentUserId') || 'GLOBAL';
    
    const collectionsToSync: (keyof AppData)[] = [
      'companies', 'clients', 'products', 'services',
      'employees', 'partners', 'invoices', 'ncms',
      'taxRates', 'payrollItems', 'payrollRuns', 'alerts',
      'bankAccounts', 'bankTransactions', 'filings',
      'csts', 'cfops', 'units', 'operationTypes',
      'costCenters', 'taxCalendar', 'spedValidations', 'assets', 'accountingEntries', 'accountingClosures', 'savedReports', 'systemSettings', 'systemUsers'
    ];

    const newData: any = { ...initialData };
    
    for (const key of collectionsToSync) {
      try {
        const items = await electronAPI.dbGetCollection(key, userId);
        useDataStore.getState().setCollection(key, items || []);
      } catch (err) {
        console.error(`Erro ao carregar ${key} do SQLite:`, err);
      }
    }
    
    // ZUSTAND SYNC: Hydrate Company Store from SQLite
    const companies = useDataStore.getState().data.companies;
    if (companies) {
      useCompanyStore.getState().setCompanies(companies);
    }

    // Hydrate User Profile from localStorage
    const savedUser = localStorage.getItem('currentUser');
    const savedRole = localStorage.getItem('userRole') as any;
    if (savedUser && savedUser !== 'Visitante') {
      setCurrentUser(savedUser);
    }
    if (savedRole) {
      setUserRole(savedRole);
    }

    useAuthStore.getState().setAuthProfile({
      currentUser: savedUser && savedUser !== 'Visitante' ? savedUser : currentUser,
      userRole: savedRole || userRole,
      userEmail: localStorage.getItem('userEmail') || userEmail
    });

    setIsLoaded(true);
    console.log('✅ Dados locais carregados via SQLite');
  };

  // Item 11: Auto refresh after sync completed in Electron
  useEffect(() => {
    if (isElectron && electronAPI?.onSyncCompleted) {
      const unsub = electronAPI.onSyncCompleted((info: any) => {
        console.log('🔄 Sincronização concluída no Electron, recarregando dados locais:', info);
        loadLocalData();
      });
      return () => { if (unsub) unsub(); };
    }
  }, []);

  // Initial cloud-to-SQLite download on app launch
  useEffect(() => {
    if (isElectron && electronAPI?.syncCloudNow) {
      const uid = localStorage.getItem('currentUserId') || 'GLOBAL';
      electronAPI.syncCloudNow(uid).then(() => {
        loadLocalData();
      }).catch((err: any) => {
        console.warn('Initial cloud sync warning:', err);
      });
    }
  }, []);

  // Requisito: Exigir Login sempre que abrir o sistema
  useEffect(() => {
    const initSession = async () => {
      const isSessionActive = sessionStorage.getItem('ESCOPO_SESSION_ACTIVE');
      if (!isSessionActive) {
        console.log('🔒 Nova execução detectada: Limpando sessão anterior para exigir login...');
        await firebaseSignOut(auth);
        localStorage.removeItem('isLoggedIn'); // Limpar flag visual
        localStorage.removeItem('currentSessionUser');
        sessionStorage.setItem('ESCOPO_SESSION_ACTIVE', 'true');
        setIsLoggedIn(false);
        useDataStore.getState().setData(initialData);
      }
    };
    initSession();
  }, []);

  // Item 7: Audit Log implementation (Always linked to UID)
  const addAuditLog = async (
    actionOrLog: AuditLogEntry['action'] | Omit<AuditLogEntry, 'id'>,
    entity?: string,
    entityId?: string,
    details?: string
  ) => {
    let log: Omit<AuditLogEntry, 'id'>;

    if (typeof actionOrLog === 'string') {
      log = {
        userId: auth.currentUser?.uid || 'anonymous',
        userName: currentUser || 'Usuário',
        userEmail: userEmail || undefined,
        action: actionOrLog as AuditLogEntry['action'],
        entity: entity || 'unknown',
        entityId: entityId || 'unknown',
        details: details || '',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      };
    } else {
      log = actionOrLog;
    }

    const logId = Math.random().toString(36).substr(2, 9);
    const newLog = { ...log, id: logId };

    // Add to SQLite if in Electron
    if (isElectron) {
      try {
        await electronAPI.dbSaveDoc('audit_logs', logId, newLog, newLog.userId || 'GLOBAL');
        return;
      } catch (err) {
        console.error('Erro ao salvar log de auditoria no SQLite:', err);
      }
    }

    // Add to Firestore if user is logged in
    const user = auth.currentUser;
    if (user) {
      // Save in top-level logs collection for easier cross-user querying by ADM
      const auditRef = collection(db, 'audit_logs');
      await setDoc(doc(auditRef, logId), {
        ...newLog,
        id_adm: userType === 'SUB' ? userIdAdm : (userType === 'ADM' ? user.uid : 'GLOBAL')
      });

      // Also keep a copy in user's subcollection (legacy/individual view)
      const userLogsRef = collection(db, 'users', user.uid, 'audit_logs');
      await setDoc(doc(userLogsRef, logId), newLog);
    }

    // Also add to the new audit store (Recommendation 5)
    // The audit store already subscribes to Firestore, but for immediate UI feedback:
    useAuditStore.getState().addAuditLog(newLog);
  };

  // Professional Multi-User Synchronization (Item 1 & 10)
  useEffect(() => {
    if (isElectron) {
      console.log('🖥️ Modo Desktop detectado: Utilizando SQLite Local');
      loadLocalData();
      return;
    }

    let unsubscribes: (() => void)[] = [];

    const setupSubscriptions = (uid: string) => {
      console.log('🔄 Configurando sincronização de dados para usuário:', uid);

      const collectionsToSync: (keyof AppData)[] = [
        'companies', 'clients', 'products', 'services',
        'employees', 'partners', 'invoices', 'ncms',
        'taxRates', 'payrollItems', 'payrollRuns', 'alerts',
        'bankAccounts', 'bankTransactions', 'filings',
        'csts', 'cfops', 'units', 'operationTypes',
        'costCenters', 'taxCalendar', 'spedValidations', 'assets', 'accountingEntries', 'accountingClosures', 'savedReports', 'systemUsers'
      ];

      // Global Settings subscription
      const settingsRef = doc(db, 'settings', 'global');
      const settingsUnsub = onSnapshot(settingsRef, (snapshot: any) => {
        if (snapshot.exists()) {
          useDataStore.getState().setData({ systemSettings: snapshot.data() });
        }
      }, (error: any) => {
        console.error('❌ Erro ao sincronizar configurações globais:', error);
      });
      unsubscribes.push(settingsUnsub);

      collectionsToSync.forEach((key) => {
        // Mapping systemUsers to Firestore 'users' collection
        const collectionName = key === 'systemUsers' ? 'users' : key;
        const q = query(collection(db, collectionName), where('userId', '==', uid));

        const unsub = onSnapshot(q, (snapshot: any) => {
          const items = snapshot.docs.map((doc: any) => ({
            ...doc.data(),
            id: doc.id
          })) as any[];

          console.log(`📊 ${key}: ${items.length} documento(s) carregado(s)`);

          useDataStore.getState().setCollection(key, items);

          // ZUSTAND SYNC: Sync Firebase 'companies' to Zustand Store
          if (key === 'companies') {
            useCompanyStore.getState().setCompanies(items);
          }
        }, (error: any) => {
          console.error(`❌ Erro ao sincronizar ${key}:`, error);
        });
        unsubscribes.push(unsub);
      });

      // Special subscription for pending user approvals (ADM only)
      // This fetches users from the 'users' collection who are waiting for approval
      const userDoc = doc(db, 'users', uid);
      getDoc(userDoc).then((docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();

          // Only fetch pending approvals for Super Admin users
          if (userData.isSuperAdmin === true) {
            console.log('🔐 Super Admin detectado - carregando usuários pendentes...');

            const pendingQuery = query(
              collection(db, 'users'),
              where('status', '==', 'pending')
            );

            const pendingUnsub = onSnapshot(pendingQuery, (snapshot: any) => {
              const pendingUsers = snapshot.docs.map((doc: any) => ({
                ...doc.data(),
                id: doc.id
              })) as SystemUser[];

              console.log(`👥 Usuários pendentes: ${pendingUsers.length}`);

              useDataStore.getState().setCollection('pendingApprovals', pendingUsers);
            }, (error: any) => {
              console.error('❌ Erro ao buscar usuários pendentes:', error);
            });

            unsubscribes.push(pendingUnsub);
          }
        }
      }).catch(error => {
        console.error('❌ Erro ao verificar permissões do usuário:', error);
      });
    };

    const authUnsubscribe = onAuthStateChanged(auth, async (user: any) => {
      // Clear previous subscriptions
      unsubscribes.forEach(u => u());
      unsubscribes = [];

      if (user) {
        console.log('✅ Usuário autenticado:', user.email);
        setIsLoggedIn(true);
        localStorage.setItem('isLoggedIn', 'true');
        setUserEmail(user.email);
        
        // ZUSTAND SYNC:
        useAuthStore.getState().setAuthStatus(true, user.email);

        // Load Profile from Firestore (Professional metadata)
        const profileRef = doc(db, 'users', user.uid);
        onSnapshot(profileRef, (snapshot: any) => {
          if (snapshot.exists()) {
            const profile = snapshot.data();

            const isMasterLogin = profile.email === 'geovaniwn@gmail.com' || user.email === 'geovaniwn@gmail.com' || profile.name === 'Geovani Silva' || profile.master_flag;

            // === CHECK APPROVAL STATUS ===
            if (!isMasterLogin && (profile.status === 'pending' || profile.isApproved === false)) {
              console.warn(`⛔ Usuário ${user.email} pendente, bloqueando acesso pelo listener.`);
              firebaseSignOut(auth).then(() => {
                setIsLoggedIn(false);
                useDataStore.getState().setData(initialData);
                // alert("Seu cadastro aguarda aprovação da empresa administradora. Entre em contato para liberação.");
                window.location.hash = "/pending-approval"; // Redirect to dedicated pending screen
              });
              return;
            }
            if (!isMasterLogin && profile.status === 'inactive') {
              console.warn(`⛔ Usuário ${user.email} inativo, bloqueando acesso.`);
              firebaseSignOut(auth).then(() => {
                setIsLoggedIn(false);
                useDataStore.getState().setData(initialData);
                alert("Seu acesso foi desativado. Entre em contato com o suporte.");
                window.location.href = "/";
              });
              return;
            }

            const activeUserName = profile.name || user.displayName || user.email?.split('@')[0] || 'Usuário';
            const activeUserRole = profile.role || (isMasterLogin ? 'Admin' : 'Operador');

            setCurrentUser(activeUserName);
            setUserRole(activeUserRole);
            localStorage.setItem('currentUser', activeUserName);
            localStorage.setItem('userRole', activeUserRole);

            setIs2FAEnabled(profile.is2FAEnabled || false);
            if (profile.phone) setUserPhone(profile.phone);
            if (profile.department) setUserDepartment(profile.department);
            if (profile.photoURL) setUserPhotoURL(profile.photoURL);
            if (profile.memberSince) setMemberSince(profile.memberSince);
            if (profile.permissions) setUserPermissions(profile.permissions);
            if (profile.tipo_usuario) {
              setUserType(profile.tipo_usuario);
              localStorage.setItem('userType', profile.tipo_usuario);
            }
            if (profile.id_adm) {
              setUserIdAdm(profile.id_adm);
              localStorage.setItem('userIdAdm', profile.id_adm);
            }

            // ZUSTAND SYNC: Auth State Profile
            useAuthStore.getState().setAuthProfile({
              currentUser: activeUserName,
              userRole: activeUserRole,
              userEmail: user.email,
              userPhotoURL: profile.photoURL || null,
              master_flag: !!profile.master_flag,
              userType: profile.tipo_usuario || null,
              userIdAdm: profile.id_adm || null
            });

            if (profile.master_flag || profile.name === 'Geovani Silva') {
              useAuthStore.getState().setAuthProfile({ master_flag: true });
              localStorage.setItem('master_flag', 'true');

              // Self-healing: Ensure Geovani Silva ALWAYS has master_flag in DB (RF-16)
              if (!profile.master_flag && profile.name === 'Geovani Silva') {
                updateDoc(doc(db, 'users', user.uid), {
                  master_flag: true,
                  updatedAt: new Date().toISOString(),
                  updatedBy: 'System (Self-healing)',
                  updatedBy_id: 'SYSTEM',
                  updatedBy_name: 'System (Self-healing)'
                }).catch(console.error);
              }
            } else {
              useAuthStore.getState().setAuthProfile({ master_flag: false });
              localStorage.setItem('master_flag', 'false');
            }
          } else {
            // If profile doesn't exist yet (race condition on creation), wait or handle gracefully
            // For safety, creates a minimal profile or lets it slide until next render
            setCurrentUser(user.displayName || 'Usuário');
          }
        });

        setupSubscriptions(user.uid);

        // Check if user needs seed data (after a delay to allow subscriptions to load)
        setTimeout(async () => {
          try {
            const { checkAndCreateSeedData } = await import('../utils/seedData');
            await checkAndCreateSeedData();
          } catch (error) {
            console.error('❌ Erro ao verificar/criar dados de teste:', error);
          }
        }, 2000);

        addAuditLog({
          userId: user.uid,
          userName: user.displayName || 'Usuário',
          action: 'login',
          entity: 'session',
          entityId: user.uid,
          details: 'User logged in',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        });
      } else {
        console.log('⚠️ Usuário não autenticado');
        setIsLoggedIn(false);
        setUserEmail(null);
        useDataStore.getState().setData(initialData); // Clear data on logout
        
        // ZUSTAND SYNC:
        useAuthStore.getState().logout();
      }
      setIsLoaded(true);
    });

    return () => {
      authUnsubscribe();
      unsubscribes.forEach(u => u());
    };
  }, []);

  // Auto-select company if none selected (UX Fix)
  useEffect(() => {
    if (isLoggedIn && !selectedCompanyId && data.companies.length > 0) {
      // Prefer "Matriz" or just the first one
      setSelectedCompanyId(data.companies[0].id);
    }
  }, [isLoggedIn, selectedCompanyId, data.companies]);

  // === ADM MODULE: FETCH USERS (Using Robust Service) ===
  useEffect(() => {
    if (!isLoggedIn) return;

    let unsubAll = () => { };
    let unsubPending = () => { };

    // Unified Admin Logic: SuperAdmin (Global) or ADM (Owner of Sub-users)
    const currentCompany = data.companies.find((c: CompanyEntity) => c.id === selectedCompanyId);
    const isGlobalAdmin = userRole === 'Admin' || currentCompany?.cnpj === ADM_CNPJ || userEmail === 'geovaniwn@gmail.com';

    if (isGlobalAdmin) {
      console.log("👑 Global Admin Access - Subscribing to ALL users");
      setIsSuperAdmin(true);
      unsubAll = UserService.subscribeToAllUsers((users: SystemUser[]) => {
        useDataStore.getState().setCollection('systemUsers', users);
      });
      unsubPending = UserService.subscribeToPendingUsers((pendings: SystemUser[]) => {
        useDataStore.getState().setCollection('pendingApprovals', pendings);
      });
    } else if (userType === 'ADM') {
      console.log("🔑 ADM Access - Subscribing to SUB users only");
      setIsSuperAdmin(true); // Grant access to Admin panel tab
      unsubAll = UserService.subscribeToSubUsers(auth.currentUser?.uid || '', (users: SystemUser[]) => {
        useDataStore.getState().setCollection('systemUsers', users);
      });
    } else {
      setIsSuperAdmin(false);
      useDataStore.getState().setCollection('pendingApprovals', []);
    }

    return () => {
      unsubAll();
      unsubPending();
    };
  }, [isLoggedIn, selectedCompanyId, data.companies, userRole]);

  // Smart Notification & Deadline Engine (Comprehensive Alert System)
  useEffect(() => {
    if (!isLoaded || !isLoggedIn) return;

    // Protective delay and throttling
    const checker = setTimeout(() => {
      const today = new Date();
      const companyId = selectedCompanyId;
      const tasks = useWorkflowStore.getState().tasks || [];
      const currentNotifs = useNotificationStore.getState().notifications || [];

      // Create a fast-lookup map for existing unread alerts to avoid O(N^2)
      const existingAlertsKeys = new Set(
        data.alerts
          .filter((a: FiscalAlert) => !a.isRead)
          .map((a: FiscalAlert) => `${a.companyId || 'global'}_${a.title}`)
      );

      const existingNotifsKeys = new Set(
        currentNotifs
          .filter(n => !n.isRead)
          .map(n => `${n.companyId || 'global'}_${n.title}`)
      );

      // Helper function to generate alerts
      const triggerAlert = (cId: string | undefined, title: string, message: string, severity: 'high' | 'medium' | 'low', type: FiscalAlert['type'], actionUrl?: string) => {
        const targetCompanyId = cId || companyId || undefined;
        const key = `${targetCompanyId || 'global'}_${title}`;

        if (!existingAlertsKeys.has(key)) {
          const alert: FiscalAlert = {
            id: Math.random().toString(36).substr(2, 9),
            companyId: targetCompanyId,
            title,
            message,
            severity,
            date: new Date().toISOString(),
            isRead: false,
            type,
            actionUrl
          };
          addAlert(alert);
          existingAlertsKeys.add(key); // Mark as added in this cycle
        }

        if (!existingNotifsKeys.has(key)) {
          useNotificationStore.getState().addNotification({
            companyId: targetCompanyId,
            title,
            message,
            type: (type === 'xml_inconsistency' || type === 'tax_deadline') ? type : 'alert',
            priority: severity,
            actionUrl
          });
          existingNotifsKeys.add(key);

          // Desktop Native Push Notification (#7)
          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              try {
                new Notification(title, { body: message, icon: '/icon.png' });
              } catch (e) {
                console.warn('Native push notification error:', e);
              }
            } else if (Notification.permission !== 'denied') {
              Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                  try {
                    new Notification(title, { body: message, icon: '/icon.png' });
                  } catch (e) {
                    console.warn('Native push notification error:', e);
                  }
                }
              });
            }
          }
        }
      };

      // Only perform heavy validations if we actually have data to process
      if (data.companies.length === 0 && data.employees.length === 0 && data.invoices.length === 0) return;

      // === VALIDAÇÕES DE CADASTRO DE EMPRESAS ===
      data.companies.forEach((company: CompanyEntity) => {
        const missing = [];
        if (!company.cnpj) missing.push('CNPJ');
        if (!company.razaoSocial) missing.push('Razão Social');
        if (!company.nomeFantasia) missing.push('Nome Fantasia');
        if (!company.regimeTributario) missing.push('Regime');
        if (!company.address?.zip) missing.push('CEP');
        if (missing.length > 0) {
          triggerAlert(company.id, `📋 Cadastro Incompleto: ${company.nomeFantasia || 'Empresa'}`, `Campos ausentes: ${missing.join(', ')}`, 'high', 'compliance', '#/app/company');
        }
      });

      // === VALIDAÇÕES DE CADASTRO DE FUNCIONÁRIOS ===
      data.employees.forEach((employee: Employee) => {
        if (employee.status !== 'ativo') return;
        if (!employee.cpf || !employee.admissionDate || !employee.salary) {
          triggerAlert(employee.companyId, `👥 Funcionário Incompleto: ${employee.name || 'Sem Nome'}`, `Cadastro incompleto detectado para o funcionário.`, 'medium', 'hr', '#/app/payroll');
        }
      });

      // === APURAÇÃO DE FOLHA DE PAGAMENTO ===
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      data.companies.forEach((company: CompanyEntity) => {
        const hasPayroll = data.payrollRuns.some((pr: PayrollRun) => {
          const d = parseDateSafe(pr.competence);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear && pr.companyId === company.id;
        });
        if (today.getDate() >= 5 && !hasPayroll) {
          triggerAlert(company.id, `💼 Apuração de Folha Pendente`, `Competência ${currentMonth + 1}/${currentYear} pendente.`, 'high', 'hr', '#/app/payroll');
        }
      });

      // === VENCIMENTO DE GUIAS E TRIBUTOS ===
      data.taxCalendar.forEach((evt: TaxCalendarEvent) => {
        if (evt.isDone) return;
        const diffDays = Math.ceil((new Date(evt.date).getTime() - today.getTime()) / (86400000));
        if (diffDays <= 5 && diffDays >= -1) {
          triggerAlert(evt.companyId, `💰 Guia/Tributo: ${evt.title}`, `Vence em ${diffDays} dias: ${evt.title}`, diffDays <= 0 ? 'high' : evt.severity, 'tax_deadline', '#/app/taxes');
        }
      });

      // === CONTAS A RECEBER / PAGAR ===
      const recentInvoices = data.invoices.slice(-200);
      recentInvoices.forEach((inv: Invoice) => {
        if (inv.status === 'paga' || inv.status === 'cancelada') return;
        const diffDays = Math.ceil((today.getTime() - new Date(inv.date).getTime()) / (86400000));

        if ((inv.type === 'exit' || inv.type === 'service') && diffDays >= 10) {
          triggerAlert(inv.companyId, `Recebimento Pendente: ${inv.number}`, `A nota de ${inv.entityName} está atrasada há ${diffDays} dias.`, 'medium', 'financial', '#/app/financial');
        } else if (inv.type === 'entry' && diffDays >= -3 && diffDays < 10) {
          // Payables
        }
      });

      // === TAREFAS PENDENTES ===
      tasks.forEach(task => {
        if (task.status === 'finalizado') return;
        const diffDays = Math.ceil((new Date(task.dueDate).getTime() - today.getTime()) / (86400000));
        if (diffDays <= 2 && diffDays >= -1) {
          triggerAlert(task.companyId, `✅ Tarefa Pendente: ${task.title}`, `Vencimento em ${diffDays} dias.`, 'medium', 'workflow', '#/app/workflow');
        }
      });

    }, 5000); // Throttled to 5 seconds

    return () => clearTimeout(checker);
  }, [isLoaded, isLoggedIn, selectedCompanyId, data.companies, data.employees, data.invoices, data.taxCalendar, data.payrollRuns]);


  // [BUSINESS LOGIC] generateDRE implementation
  const generateDRE = (companyId: string, startDate: string, endDate: string) => {
    const invoices = data.invoices.filter((i: Invoice) =>
      i.companyId === companyId &&
      i.date >= startDate &&
      i.date <= endDate &&
      i.status !== 'cancelada'
    );

    const receitaBruta = invoices
      .filter((i: Invoice) => i.type === 'exit' || i.type === 'service')
      .reduce((sum: number, i: Invoice) => sum + i.value, 0);

    const impostos = invoices
      .filter((i: Invoice) => i.type === 'exit' || i.type === 'service')
      .reduce((sum: number, i: Invoice) => sum + (i.taxValue || 0), 0);

    const cmv = invoices
      .filter((i: Invoice) => i.type === 'entry')
      .reduce((sum: number, i: Invoice) => sum + i.value, 0);

    const despesas = data.bankTransactions
      .filter((t: BankTransaction) => t.companyId === companyId && t.date >= startDate && t.date <= endDate && t.type === 'debit')
      .reduce((sum: number, t: BankTransaction) => sum + t.amount, 0);

    return {
      receitaBruta,
      receitaLiquida: receitaBruta - impostos,
      lucroBruto: (receitaBruta - impostos) - cmv,
      despesasOperacionais: despesas,
      lucroLiquido: (receitaBruta - impostos) - cmv - despesas
    };
  };

  // [BUSINESS LOGIC] calculateProductTaxes implementation
  const calculateProductTaxes = (productId: string, destinationState: string) => {
    const product = data.products.find((p: Product) => p.id === productId);
    if (!product) return { totalTax: 0, details: [] };

    const price = product.price || 0;
    const icms = price * ((product.icmsRate || 18) / 100);
    const pis = price * ((product.pisRate || 1.65) / 100);
    const cofins = price * ((product.cofinsRate || 7.6) / 100);

    // Simple DIFAL Simulation
    let difal = 0;
    if (selectedCompany?.address?.uf && selectedCompany.address.uf !== destinationState) {
      const internal = product.difalInternalRate || 18;
      const external = product.difalExternalRate || 12;
      difal = price * ((internal - external) / 100);
    }

    return {
      totalTax: icms + pis + cofins + difal,
      breakdown: { icms, pis, cofins, difal }
    };
  };

  // [BUSINESS LOGIC] approveTransaction implementation
  const approveTransaction = async (id: string, type: 'invoice' | 'record') => {
    const colName = type === 'invoice' ? 'invoices' : 'bankTransactions';
    const collectionData = (data as any)[colName];
    const existingItem = Array.isArray(collectionData) ? collectionData.find((i: any) => i.id === id) : null;
    
    if (!existingItem) {
      console.error(`Item not found for approval: ${colName}/${id}`);
      return;
    }

    const updatedItem = {
      ...existingItem,
      status: 'autorizada',
      approvedAt: new Date().toISOString(),
      approvedBy: currentUser,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser,
      updatedBy_id: auth.currentUser?.uid || 'SYSTEM',
      updatedBy_name: currentUser
    };

    await DataRepository.update(colName, id, updatedItem, auth.currentUser?.uid || 'SYSTEM');
    addAuditLog('update', colName, id, `Transaction approved by ${currentUser}`);
  };


  // Derived selected company object
  const selectedCompany = data.companies.find((c: CompanyEntity) => c.id === selectedCompanyId) || null;

  const selectCompany = (id: string | null) => {
    setSelectedCompanyId(id);
  };

  const saveCompany = async (company: CompanyEntity) => {
    await useCompanyStore.getState().saveCompany(company);
  };

  const deleteCompany = async (id: string) => {
    await useCompanyStore.getState().deleteCompany(id);
  };

  // Item 1: Real Database (Firestore) with User Isolation
  const addItem = async <T,>(key: keyof AppData, item: T) => {
    await useDataStore.getState().addItem(key, item);
  };

  const updateItem = async (key: keyof AppData, item: any, idField = 'id') => {
    await useDataStore.getState().updateItem(key, item, idField);
  };

  const deleteItem = async (key: keyof AppData, id: string) => {
    await useDataStore.getState().deleteItem(key, id);
  };

  const settleInvoice = async (invoiceId: string, bankAccountId: string, date: string, valuePaid: number) => {
    const invoice = data.invoices.find((i: Invoice) => i.id === invoiceId);
    const bank = data.bankAccounts.find((b: BankAccount) => b.id === bankAccountId);

    if (!invoice || !bank || !auth.currentUser) return;

    try {
      if (isElectron) {
        const userId = localStorage.getItem('currentUserId') || 'GLOBAL';
        
        // 1. Update Invoice
        const updatedInvoice = {
          ...invoice,
          status: 'paga' as const,
          paymentDate: date,
          isReconciled: true,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser,
          updatedBy_id: userId,
          updatedBy_name: currentUser
        };
        await electronAPI.dbSaveDoc('invoices', invoiceId, updatedInvoice, userId);

        // 2. Create Transaction
        const transactionType = (invoice.type === 'exit' || invoice.type === 'service') ? 'credit' : 'debit';
        const transactionId = Math.random().toString(36).substr(2, 9);
        const transaction: any = {
          id: transactionId,
          companyId: invoice.companyId || selectedCompanyId,
          date,
          description: `Liq. Nota: ${invoice.number} - ${invoice.entityName}`,
          amount: Math.abs(valuePaid),
          type: transactionType,
          status: 'reconciled',
          bankName: bank.bankName,
          reconciledWith: invoiceId,
          userId,
          createdAt: new Date().toISOString(),
          createdBy: currentUser,
          createdBy_id: userId,
          createdBy_name: currentUser
        };
        await electronAPI.dbSaveDoc('bankTransactions', transactionId, transaction, userId);

        // 3. Auto-Accounting
        const isReceita = (invoice.type === 'exit' || invoice.type === 'service');
        const accountingId = Math.random().toString(36).substr(2, 9);
        const accountingEntry: any = {
          id: accountingId,
          companyId: invoice.companyId || selectedCompanyId,
          date,
          description: `Liq. Financeira Ref. NF ${invoice.number}`,
          value: Math.abs(valuePaid),
          debitAccount: isReceita ? '1.1.01.0001' : '2.1.01.0001',
          creditAccount: isReceita ? '1.1.02.0001' : '1.1.01.0001',
          history: `Liquidação pelo banco ${bank.bankName}. NF: ${invoice.entityName}`,
          originModule: 'financial',
          status: 'posted',
          documentRef: invoiceId,
          userId,
          createdAt: new Date().toISOString(),
          createdBy: currentUser,
          createdBy_id: userId,
          createdBy_name: currentUser
        };
        await electronAPI.dbSaveDoc('accountingEntries', accountingId, accountingEntry, userId);

        // 4. Update Bank Balance
        const newBalance = bank.balance + (transactionType === 'credit' ? valuePaid : -valuePaid);
        const updatedBank = {
          ...bank,
          balance: newBalance,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser,
          updatedBy_id: userId,
          updatedBy_name: currentUser
        };
        await electronAPI.dbSaveDoc('bankAccounts', bankAccountId, updatedBank, userId);

        addAuditLog('update', 'financial', invoiceId, `Invoice ${invoice.number} settled (Local)`);
        loadLocalData();
        return;
      }

      // 1. Update Invoice
      const updatedInvoice = {
        ...invoice,
        status: 'paga' as const,
        paymentDate: date,
        isReconciled: true,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser,
        updatedBy_id: auth.currentUser.uid,
        updatedBy_name: currentUser
      };
      await DataRepository.update('invoices', invoiceId, updatedInvoice, auth.currentUser.uid);

      // 2. Create Transaction
      const transactionType = (invoice.type === 'exit' || invoice.type === 'service') ? 'credit' : 'debit';
      const transactionId = Math.random().toString(36).substr(2, 9);
      const transaction: any = { // using any to bypass strict type check on new fields locally vs remote
        id: transactionId,
        companyId: invoice.companyId || selectedCompanyId,
        date,
        description: `Liq. Nota: ${invoice.number} - ${invoice.entityName}`,
        amount: Math.abs(valuePaid),
        type: transactionType,
        status: 'reconciled',
        bankName: bank.bankName,
        reconciledWith: invoiceId,
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
        createdBy: currentUser,
        createdBy_id: auth.currentUser.uid,
        createdBy_name: currentUser
      };
      await DataRepository.add('bankTransactions', transaction, auth.currentUser.uid);

      // --- 2.5 AUTO-INTEGRAÇÃO CONTÁBIL (Baixas Financeiras) ---
      const isReceita = (invoice.type === 'exit' || invoice.type === 'service');
      const entryId = Math.random().toString(36).substr(2, 9);
      const accountingEntry: any = {
        id: entryId,
        companyId: invoice.companyId || selectedCompanyId,
        date,
        description: `Liq. Financeira Ref. NF ${invoice.number}`,
        value: Math.abs(valuePaid),
        debitAccount: isReceita ? '1.1.01.0001' : '2.1.01.0001', // Caixa/Bancos (Ativo) SE receita, else Fornecedores a Pagar (Passivo)
        creditAccount: isReceita ? '1.1.02.0001' : '1.1.01.0001', // Clientes a Receber (Ativo) SE receita, else Caixa/Bancos (Ativo)
        history: `Liquidação pelo banco ${bank.bankName}. NF: ${invoice.entityName}`,
        originModule: 'financial',
        status: 'posted',
        documentRef: invoiceId,
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
        createdBy: currentUser,
        createdBy_id: auth.currentUser.uid,
        createdBy_name: currentUser
      };
      await DataRepository.add('accountingEntries', accountingEntry, auth.currentUser.uid);
      // ----------------------------------------------------

      // 3. Update Balance
      const newBalance = bank.balance + (transactionType === 'credit' ? valuePaid : -valuePaid);
      const updatedBankAccount = {
        ...bank,
        balance: newBalance,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser,
        updatedBy_id: auth.currentUser.uid,
        updatedBy_name: currentUser
      };
      await DataRepository.update('bankAccounts', bankAccountId, updatedBankAccount, auth.currentUser.uid);

      addAuditLog({
        userId: auth.currentUser.uid,
        userName: currentUser,
        action: 'update',
        entity: 'financial',
        entityId: invoiceId,
        details: `Invoice ${invoice.number} settled`,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      });
    } catch (err) {
      console.error("Error settling invoice:", err);
      throw err;
    }
  };

  // Alerts Management
  const addAlert = (alert: FiscalAlert) => {
    useDataStore.getState().setCollection('alerts', [alert, ...data.alerts]);

    let notifType: 'info' | 'warning' | 'alert' | 'success' = 'info';
    if (alert.type === 'tax_deadline') notifType = 'warning';
    else if (alert.type === 'xml_inconsistency') notifType = 'alert';

    // Also add to the new smart notification store (Recommendation 1)
    useNotificationStore.getState().addNotification({
      title: alert.title,
      message: alert.message,
      priority: alert.severity === 'high' ? 'high' : alert.severity === 'medium' ? 'medium' : 'low',
      type: notifType,
      companyId: alert.companyId
    });
  };

  const markAllAsRead = () => {
    const updated = data.alerts.map((a: FiscalAlert) => ({ ...a, isRead: true }));
    useDataStore.getState().setCollection('alerts', updated);
  };

  const clearAlerts = () => {
    useDataStore.getState().setCollection('alerts', []);
  };

  // Filtering Logic
  const filteredData = React.useMemo(() => {
    // If no company selected, show nothing for business entities (or legacy if needed)
    // For strict separation as requested:
    if (!selectedCompanyId) {
      return {
        ...data, // Start with current data
        clients: [],
        products: [],
        services: [],
        employees: [],
        partners: [],
        invoices: [],
        taxRates: [],
        payrollItems: [],
        payrollRuns: [],
        bankAccounts: [],
        bankTransactions: [],
        filings: [],
        assets: [],
        accountingEntries: [],
        accountingClosures: []
      };
    }

    const filterFn = (item: { companyId?: string }) => item.companyId === selectedCompanyId;

    return {
      clients: data.clients.filter(filterFn),
      products: data.products.filter(filterFn),
      services: data.services.filter(filterFn),
      employees: data.employees.filter(filterFn),
      partners: data.partners.filter(filterFn),
      invoices: data.invoices.filter(filterFn),
      ncms: data.ncms,
      taxRates: data.taxRates.filter(filterFn),
      payrollItems: data.payrollItems.filter(filterFn),
      payrollRuns: data.payrollRuns.filter(filterFn),
      alerts: data.alerts,
      bankAccounts: data.bankAccounts.filter(filterFn),

      bankTransactions: data.bankTransactions.filter(filterFn),
      filings: data.filings.filter(filterFn),
      csts: data.csts,
      cfops: data.cfops,
      units: data.units,
      operationTypes: data.operationTypes,
      systemUsers: data.systemUsers, // Global for the owner
      assets: data.assets.filter(filterFn),
      accountingEntries: data.accountingEntries.filter(filterFn),
      accountingClosures: data.accountingClosures.filter(filterFn)
    };
  }, [data, selectedCompanyId]);

  // --- ENTITY HELPERS ---

  const addAsset = async (item: FixedAsset) => {
    await addItem('assets', item);
  };

  const updateAsset = async (item: FixedAsset) => {
    await updateItem('assets', item);
  };

  const checkPeriodClosed = (date: string, companyId?: string, targetModule?: string) => {
    return useDataStore.getState().checkPeriodClosed(date, companyId, targetModule);
  };

  const addAccountingEntry = async (item: AccountingEntry) => {
    if (checkPeriodClosed(item.date, item.companyId, 'contabil')) {
      throw new Error(`Ação Bloqueada: Não é possível criar lançamentos contábeis pois o período já foi encerrado.`);
    }
    await addItem('accountingEntries', item);
  };

  const updateAccountingEntry = async (item: AccountingEntry) => {
    // Check old date (to prevent moving from closed period) and new date (to prevent moving into closed period)
    const oldEntry = data.accountingEntries.find((e: AccountingEntry) => e.id === item.id);
    if (oldEntry && checkPeriodClosed(oldEntry.date, oldEntry.companyId, 'contabil')) {
      throw new Error(`Ação Bloqueada: Este lançamento pertence a um período fechado e não pode ser alterado.`);
    }

    if (checkPeriodClosed(item.date, item.companyId, 'contabil')) {
      throw new Error(`Ação Bloqueada: Não é possível mover este lançamento para um período que já foi encerrado.`);
    }

    await updateItem('accountingEntries', item);
  };

  const addAccountingClosure = async (item: AccountingClosure) => {
    // Check if duplicate
    const existing = data.accountingClosures.find((c: AccountingClosure) =>
      c.companyId === item.companyId &&
      c.period === item.period &&
      c.status === 'closed'
    );

    if (existing) {
      alert(`O período ${item.period} já possui um fechamento registrado.`);
      return;
    }

    await addItem('accountingClosures', item);
  };

  const updateAccountingClosure = async (item: AccountingClosure) => {
    await updateItem('accountingClosures', item);
  };

  // --- SEGURANÇA: AUTO LOGOUT (30min) ---
  useEffect(() => {
    if (!auth.currentUser) return;

    const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
    let idleTimer: NodeJS.Timeout;

    const performAutoLogout = async () => {
      console.warn("🔐 Sessão expirada por inatividade.");
      try {
        // Tentativa de log seguro
        if (auth.currentUser) {
          // Não usamos addAuditLog aqui pois ele pode depender de estado que será limpo
          // Mas tentaremos se possível
        }
      } catch (e) { console.error(e); }

      await firebaseSignOut(auth);
      setIsLoggedIn(false);
      setUserEmail(null);
      setSelectedCompanyId(null);
      ['isLoggedIn', 'currentUser', 'userEmail', 'userRole', 'userPhone', 'userDepartment', 'userPhotoURL', 'memberSince'].forEach(k => localStorage.removeItem(k));
    };

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(performAutoLogout, TIMEOUT_MS);
    };

    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    window.addEventListener('click', resetIdleTimer);
    window.addEventListener('scroll', resetIdleTimer);

    resetIdleTimer();

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('click', resetIdleTimer);
      window.removeEventListener('scroll', resetIdleTimer);
    };
  }, [auth.currentUser]);

  return (
    <DataContext.Provider value={{
      ...data,
      ...filteredData, // Override data with filtered versions
      selectedCompanyId,
      selectedCompany,
      selectCompany,
      saveCompany,
      deleteCompany,
      addClient: (i: Client) => addItem('clients', i),
      addProduct: (i: Product) => addItem('products', i),
      addService: (i: Service) => addItem('services', i),
      addEmployee: (i: Employee) => addItem('employees', i),
      addPartner: (i: Partner) => addItem('partners', i),
      addInvoice: (i: Invoice) => addItem('invoices', i),
      addNCM: (i: NCM) => addItem('ncms', i),
      addTaxRate: (i: TaxRate) => addItem('taxRates', i),
      addPayrollItem: (i: PayrollItem) => addItem('payrollItems', i),
      addPayrollRun: (i: PayrollRun) => addItem('payrollRuns', i),
      addBankAccount: (i: BankAccount) => addItem('bankAccounts', i),

      addBankTransaction: (i: BankTransaction) => addItem('bankTransactions', i),
      addFiling: (i: Filing) => addItem('filings', i),
      addCST: (i: CST) => addItem('csts', i),
      addCFOP: (i: CFOP) => addItem('cfops', i),
      addUnit: (i: UnitOfMeasure) => addItem('units', i),
      addOperationType: (i: OperationType) => addItem('operationTypes', i),
      addSystemUser: async (item) => {
        // Use ID from item if exists (e.g. from Admin manual copy), otherwise generate
        const uid = item.id || Math.random().toString(36).substr(2, 9);
        const finalItem = { ...item, id: uid };

        await UserService.createUser(uid, finalItem);
        // Optimistic
        useDataStore.getState().setCollection('systemUsers', [...data.systemUsers, finalItem]);
        addAuditLog('create', 'user', uid, `User created by Admin: ${item.name}`);
      },
      updateSystemUser: async (item: SystemUser) => {
        await UserService.updateUser(item.id, item);
        useDataStore.getState().setCollection('systemUsers', data.systemUsers.map((u: SystemUser) => u.id === item.id ? item : u));
        addAuditLog('update', 'user', item.id, `User updated by Admin: ${item.name}`);
      },

      updateClient: (i: Client) => updateItem('clients', i),
      updateEmployee: (i: Employee) => updateItem('employees', i),
      updatePartner: (i: Partner) => updateItem('partners', i),
      updateProduct: (i: Product) => updateItem('products', i),
      updateService: (i: Service) => updateItem('services', i),
      updateNCM: (i: NCM) => updateItem('ncms', i, 'code'), // Special key for NCM
      updateCST: (i: CST) => updateItem('csts', i),
      updateCFOP: (i: CFOP) => updateItem('cfops', i),
      updateUnit: (i: UnitOfMeasure) => updateItem('units', i),
      addAsset,
      updateAsset,
      addAccountingEntry,
      updateAccountingEntry,
      addAccountingClosure,
      updateAccountingClosure,
      checkPeriodClosed,
      addSavedReport: (i: SavedReport) => addItem('savedReports', i),
      updateOperationType: (i: OperationType) => updateItem('operationTypes', i),
      updateTaxRate: (i: TaxRate) => updateItem('taxRates', i),
      updatePayrollItem: (i: PayrollItem) => updateItem('payrollItems', i),
      updateInvoice: (i: Invoice) => updateItem('invoices', i),
      updateFiling: (i: Filing) => updateItem('filings', i),
      updateBankTransaction: (i: BankTransaction) => updateItem('bankTransactions', i),
      updatePayrollRun: (i: PayrollRun) => updateItem('payrollRuns', i),
      updateBankAccount: (i: BankAccount) => updateItem('bankAccounts', i),
      addCostCenter: (i: CostCenter) => addItem('costCenters', i),
      updateCostCenter: (i: CostCenter) => updateItem('costCenters', i),
      addTaxCalendarEvent: (i: TaxCalendarEvent) => addItem('taxCalendar', i),
      updateTaxCalendarEvent: (i: TaxCalendarEvent) => updateItem('taxCalendar', i),
      addPreSpedLog: (i: PreSpedValidationLog) => addItem('spedValidations', i),
      updatePreSpedLog: (i: PreSpedValidationLog) => updateItem('spedValidations', i),
      approveTransaction,
      generateDRE,
      calculateProductTaxes,
      settleInvoice,

      deleteItem,
      deletePayrollRun: (id) => deleteItem('payrollRuns', id),
      deleteBankAccount: (id) => deleteItem('bankAccounts', id),
      addAlert,
      markAllAsRead,
      clearAlerts,
      loadBackup: async (backupData: AppData) => {
        try {
          if (!backupData.companies || !Array.isArray(backupData.companies)) {
            alert("Arquivo de backup inválido ou corrompido.");
            return;
          }

          // 1. Update local state
          useDataStore.getState().setData(backupData);

          // 2. Force immediate save to localStorage
          localStorage.setItem(STORAGE_KEY, JSON.stringify(backupData));

          // 3. Try saving to disk if in Electron (Save to JSON & SQLite)
          if (electronAPI) {
            await electronAPI.saveDatabase(backupData);

            const userId = localStorage.getItem('currentUserId') || 'GLOBAL';
            const collectionsToSync: (keyof AppData)[] = [
              'companies', 'clients', 'products', 'services',
              'employees', 'partners', 'invoices', 'ncms',
              'taxRates', 'payrollItems', 'payrollRuns', 'alerts',
              'bankAccounts', 'bankTransactions', 'filings',
              'csts', 'cfops', 'units', 'operationTypes',
              'costCenters', 'taxCalendar', 'spedValidations', 'assets',
              'accountingEntries', 'accountingClosures', 'savedReports', 'systemSettings', 'systemUsers'
            ];
            for (const key of collectionsToSync) {
              const items = (backupData as any)[key];
              if (Array.isArray(items)) {
                for (const item of items) {
                  if (item && item.id) {
                    await electronAPI.dbSaveDoc(key, item.id, item, item.userId || userId);
                  }
                }
              }
            }
          }

          alert("Backup restaurado com sucesso! O sistema será reiniciado.");
          addAuditLog('update', 'system', 'backup', 'Database backup restored');
          window.location.reload();
        } catch (error) {
          console.error("Erro na restauração:", error);
          alert("Erro crítico ao restaurar dados.");
        }
      },
      currentUser,
      userEmail,
      userRole,
      isLoggedIn,
      isLoaded,
      theme,
      is2FAEnabled,
      toggleTheme: () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
      },
      setTheme: (newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
      },
      enable2FA: async () => {
        if (!auth.currentUser) return;
        try {
          // Update local state
          setIs2FAEnabled(true);

          // Update Firestore
          // Note: Assuming 'users' collection exists from register/login flow checks
          await setDoc(doc(db, 'users', auth.currentUser.uid), {
            is2FAEnabled: true
          }, { merge: true });

          addAuditLog('update', 'user_settings', auth.currentUser.uid, 'Enabled 2FA');
        } catch (error) {
          console.error("Error enabling 2FA:", error);
          // Revert on error
          setIs2FAEnabled(false);
          throw error;
        }
      },
      addAuditLog,

      register: async (email: string, pass: string, name: string) => {
        if (isElectron) {
          try {
            const result = await electronAPI.authRegister(email, pass, name);
            return result;
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        }
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
          const user = userCredential.user;
          await updateProfile(user, { displayName: name });

          const isMaster = name === 'Geovani Silva' || email === 'geovaniwn@gmail.com';
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: email,
            name: name,
            role: isMaster ? 'Admin' : 'Cliente',
            tipo_usuario: isMaster ? 'ADM' : 'SUB',
            master_flag: isMaster,
            status: isMaster ? 'active' : 'pending',
            isApproved: isMaster,
            createdAt: new Date().toISOString()
          });

          await firebaseSignOut(auth);
          return { success: true };
        } catch (error: any) {
          console.error("Registration failed:", error);
          return { success: false, error: error.message };
        }
      },
      login: async (email: string, pass: string) => {
        if (isElectron) {
          try {
            const result = await electronAPI.authLogin(email, pass);
            if (result.success) {
              setIsLoggedIn(true);
              const user = result.user;
              const nameToSet = user.displayName || user.profileData?.name || email.split('@')[0] || 'Usuário';
              const roleToSet = user.profileData?.role || 'Admin';

              setCurrentUser(nameToSet);
              setUserRole(roleToSet as any);
              setUserEmail(user.email);

              localStorage.setItem('isLoggedIn', 'true');
              localStorage.setItem('currentUserId', user.uid);
              localStorage.setItem('currentUser', nameToSet);
              localStorage.setItem('userRole', roleToSet);
              localStorage.setItem('userEmail', user.email || '');

              useAuthStore.getState().setAuthProfile({
                currentUser: nameToSet,
                userEmail: user.email,
                userRole: roleToSet as any,
                isLoggedIn: true
              });

              loadLocalData();
              return true;
            }
            return false;
          } catch (err) {
            console.error('Erro no login local:', err);
            return false;
          }
        }
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, pass);
          const user = userCredential.user;
          const userDocInternal = await getDoc(doc(db, 'users', user.uid));

          if (!userDocInternal.exists()) {
             await firebaseSignOut(auth);
             throw new Error("Perfil não encontrado. Aguarde aprovação.");
          }

          let userData = userDocInternal.data();
          const isMasterLogin = userData.email === 'geovaniwn@gmail.com' || email === 'geovaniwn@gmail.com' || userData.name === 'Geovani Silva' || userData.master_flag;

          if (isMasterLogin && (userData.status === 'pending' || !userData.isApproved || !userData.master_flag || userData.role !== 'Admin')) {
            try {
              await updateDoc(doc(db, 'users', user.uid), {
                status: 'active',
                isApproved: true,
                role: 'Admin',
                tipo_usuario: 'ADM',
                master_flag: true
              });
              userData.status = 'active';
              userData.isApproved = true;
              userData.role = 'Admin';
              userData.tipo_usuario = 'ADM';
              userData.master_flag = true;
            } catch (err) {
              console.error("Self-healing do master falhou:", err);
            }
          }

          if (userData.status === 'pending' || !userData.isApproved) {
            await firebaseSignOut(auth);
            throw new Error("Cadastro aguardando aprovação.");
          }

          const nameToSet = userData.name || user.displayName || email.split('@')[0] || 'Usuário';
          const roleToSet = userData.role || (isMasterLogin ? 'Admin' : 'Operador');

          setIsLoggedIn(true);
          setCurrentUser(nameToSet);
          setUserRole(roleToSet as any);
          setUserEmail(user.email);

          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('currentUserId', user.uid);
          localStorage.setItem('currentUser', nameToSet);
          localStorage.setItem('userRole', roleToSet);
          localStorage.setItem('userEmail', user.email || '');

          useAuthStore.getState().setAuthProfile({
            currentUser: nameToSet,
            userEmail: user.email,
            userRole: roleToSet as any,
            isLoggedIn: true
          });

          return true;
        } catch (error: any) {
          console.error("Login failed:", error);
          if (error.code?.includes('auth/') || error.message?.includes('found')) return false;
          throw error;
        }
      },
      resetPassword: async (email: string) => {
        try {
          await sendPasswordResetEmail(auth, email);
          addAuditLog('update', 'auth', email, 'Password reset email requested');
        } catch (error) {
          console.error("Reset Password failed:", error);
          throw error;
        }
      },
      loginWithGoogle: async () => {
        try {
          const provider = new GoogleAuthProvider();
          const result = await signInWithPopup(auth, provider);
          const user = result.user;

          // === VALIDAÇÃO DE LICENÇA EXTERNA ===
          try {
            console.log("🔍 Verificando licença Google...");
            const token = await user.getIdToken();
            const licenseCheck = await verifyLicense(user.uid, user.email, token);

            if (!licenseCheck.active) {
              console.warn(`⛔ Licença Google inválida: ${licenseCheck.message}`);
              await firebaseSignOut(auth);
              // Para Google Login, retornamos false e deixamos o componente lidar com erro genérico ou
              // podemos lançar exceção se o componente estiver preparado.
              // O componente Login.tsx tem catch(err) { setError('Erro inesperado...') }
              // Vamos lançar erro com mensagem clara.
              throw new Error(licenseCheck.message || "Acesso negado: Sua licença Google expirou.");
            }
          } catch (licError: any) {
            console.error("Erro licença Google:", licError);
            await firebaseSignOut(auth);
            throw new Error(licError.message || "Falha na verificação de licença.");
          }

          // Check if user exists in Firestore, if not create basic profile
          // Check if user exists in Firestore, if not create basic profile
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (!userDoc.exists()) {
            await setDoc(doc(db, 'users', user.uid), {
              uid: user.uid,
              email: user.email,
              name: user.displayName,
              role: 'Cliente', // Default for social login
              status: 'pending',
              isApproved: false,
              createdAt: new Date().toISOString(),
              photoURL: user.photoURL
            });
            // As it's a new user, block immediately
            await firebaseSignOut(auth);
            throw new Error("Cadastro realizado! Aguarde a aprovação da empresa administradora para acessar.");
          } else {
            // For existing users, check status again just in case (e.g. they were rejected)
            const userData = userDoc.data();
            if (userData.status === 'pending' || userData.isApproved === false) {
              await firebaseSignOut(auth);
              throw new Error("Seu cadastro aguarda aprovação da empresa administradora. Tente novamente mais tarde.");
            }
            if (userData.status === 'inactive') {
              await firebaseSignOut(auth);
              throw new Error("Seu acesso foi desativado. Entre em contato com o suporte.");
            }
          }

          setIsLoggedIn(true);
          setUserEmail(user.email);
          addAuditLog('login', 'session', user.uid, 'Logged in via Google');
          return true;
        } catch (error) {
          console.error("Google Login failed:", error);
          // Se lançarmos erro, o componente pega. Se retornarmos false, ele mostra msg genérica.
          // Melhor relançar se tiver mensagem útil
          throw error;
        }
      },
      logout: async () => {
        try {
          await addAuditLog('logout', 'session', auth.currentUser?.uid || 'unknown', 'User logged out');
        } catch (error) {
          console.error("Failed to log logout event:", error);
        }
        await firebaseSignOut(auth);
        setIsLoggedIn(false);
        setUserEmail(null);
        setUserType(null);
        setUserIdAdm(null);
        setSelectedCompanyId(null);
        useAuthStore.getState().logout();
        ['isLoggedIn', 'currentUser', 'userEmail', 'userRole', 'userType', 'master_flag', 'userIdAdm', 'userPhone', 'userDepartment', 'userPhotoURL', 'memberSince'].forEach(k => localStorage.removeItem(k));
      },
      updateCurrentUser: (name: string, role?: any) => {
        setCurrentUser(name);
        localStorage.setItem('currentUser', name);
        if (role) {
          setUserRole(role);
          localStorage.setItem('userRole', role);
        }
      },
      updateUserProfile: async (data: { name?: string; phone?: string; photoURL?: string; memberSince?: string; email?: string; role?: string; department?: string }) => {
        // Optimistic / Immediate Local Update
        if (data.name) {
          setCurrentUser(data.name);
          localStorage.setItem('currentUser', data.name);
        }
        if (data.phone) {
          setUserPhone(data.phone);
          localStorage.setItem('userPhone', data.phone);
        }
        if (data.department) {
          setUserDepartment(data.department);
          localStorage.setItem('userDepartment', data.department);
        }
        if (data.photoURL) {
          setUserPhotoURL(data.photoURL);
          localStorage.setItem('userPhotoURL', data.photoURL);
        }
        if (data.memberSince) {
          setMemberSince(data.memberSince);
          localStorage.setItem('memberSince', data.memberSince);
        }
        if (data.email) {
          setUserEmail(data.email);
          localStorage.setItem('userEmail', data.email);
        }
        if (data.role) {
          setUserRole(data.role as any);
          localStorage.setItem('userRole', data.role);
        }

        if (!auth.currentUser) {
          return;
        }

        try {
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            ...data,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser,
            updatedBy_id: auth.currentUser.uid,
            updatedBy_name: currentUser
          });


          // Also update Auth profile for name/photo (Best effort)
          if (data.name || data.photoURL) {
            try {
              // Check if photo is too large for Auth Profile (limit is ~2KB for URL usually, but some providers allow more. Base64 is risky)
              if (data.photoURL && data.photoURL.length > 200000) {
                console.warn("PhotoURL too large for Auth Profile, skipping Auth update but saving to Firestore.");
              } else {
                await updateProfile(auth.currentUser, {
                  displayName: data.name || auth.currentUser.displayName,
                  photoURL: data.photoURL || auth.currentUser.photoURL
                });
              }
            } catch (authError) {
              console.warn("Failed to update Auth profile:", authError);
              // Continue execution - data is saved in Firestore
            }
          }

          addAuditLog('update', 'user_profile', auth.currentUser.uid, 'Updated user profile details');
        } catch (error) {
          console.error("Error updating profile:", error);
          throw error;
        }
      },
      userPhone,
      userDepartment,
      userPhotoURL,
      memberSince,
      userPermissions,
      updateUserPermissions: async (perms) => {
        setUserPermissions(perms);
        if (!auth.currentUser) return;
        try {
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            permissions: perms,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser,
            updatedBy_id: auth.currentUser.uid,
            updatedBy_name: currentUser
          });
          addAuditLog('update', 'user_permissions', auth.currentUser.uid, 'Updated user permissions');
        } catch (error) {
          console.error("Error updating permissions:", error);
        }
      },
      pendingApprovals: data.pendingApprovals,
      approveUser: async (uid, role, perms) => {
        await UserService.approveUser(uid, role, perms);
        addAuditLog('update', 'user_approval', uid, `User approved by ADM`);
      },
      rejectUser: async (uid) => {
        await UserService.rejectUser(uid);
        addAuditLog('update', 'user_rejection', uid, `User rejected by ADM`);
      },
      isSuperAdmin,
      master_flag,
      userType,
      userIdAdm,
      systemSettings: data.systemSettings,
      updateSystemSettings: useDataStore.getState().updateSystemSettings,
      refreshSystemUsers: async () => {
        console.log('🔄 Atualizando lista de usuários manualmente via Service...');
        const users = await UserService.fetchAllUsers();
        useDataStore.getState().setCollection('systemUsers', users);
        console.log(`✅ ${users.length} usuários carregados via Service.`);
      }
    } as DataContextType}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};