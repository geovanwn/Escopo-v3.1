// Data Context - Main State Management
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Client, Product, Service, Employee, Partner, Invoice, NCM, TaxRate, PayrollItem, CompanyEntity, FiscalAlert, PayrollRun, BankAccount, BankTransaction, Filing, CST, CFOP, UnitOfMeasure, OperationType, SystemUser, CostCenter, TaxCalendarEvent, PreSpedValidationLog, AccountingEntry, FixedAsset, AuditLogEntry, AccountingClosure, SavedReport } from '../types';
import { db, auth } from '../firebaseConfig';
import { collection, doc, setDoc, getDocs, getDoc, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut as firebaseSignOut, onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { useNotificationStore } from '../stores/useNotificationStore';
import { useAuditStore } from '../stores/useAuditStore';
import { useWorkflowStore } from '../stores/useWorkflowStore';


// AuditLog removed, using AuditLogEntry from types

export interface AppData {
  companies: CompanyEntity[];
  clients: Client[];
  products: Product[];
  services: Service[];
  employees: Employee[];
  partners: Partner[];
  invoices: Invoice[];
  ncms: NCM[];
  taxRates: TaxRate[];
  payrollItems: PayrollItem[];
  payrollRuns: PayrollRun[];
  alerts: FiscalAlert[];
  bankAccounts: BankAccount[];

  bankTransactions: BankTransaction[];
  filings: Filing[];
  csts: CST[];
  cfops: CFOP[];
  units: UnitOfMeasure[];
  operationTypes: OperationType[];
  systemUsers: SystemUser[];
  costCenters: CostCenter[];
  taxCalendar: TaxCalendarEvent[];
  spedValidations: PreSpedValidationLog[];
  assets: FixedAsset[];
  accountingEntries: AccountingEntry[];
  accountingClosures: AccountingClosure[];
  savedReports: SavedReport[];
}

interface DataContextType extends AppData {
  selectedCompanyId: string | null;
  selectedCompany: CompanyEntity | null;
  selectCompany: (id: string | null) => void;
  saveCompany: (company: CompanyEntity) => void;
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
  checkPeriodClosed: (date: string, companyId?: string) => boolean;

  addSavedReport: (item: SavedReport) => Promise<void>;

  updateFiling: (item: Filing) => Promise<void>;
  settleInvoice: (invoiceId: string, bankAccountId: string, date: string, valuePaid: number) => Promise<void>;

  deleteItem: (type: keyof AppData, id: string) => Promise<void>;
  deletePayrollRun: (id: string) => void;
  deleteBankAccount: (id: string) => void;

  addAlert: (alert: FiscalAlert) => void;
  markAllAsRead: () => void;
  clearAlerts: () => void;

  approveTransaction: (id: string, type: 'invoice' | 'record') => Promise<void>;
  generateDRE: (companyId: string, startDate: string, endDate: string) => any;
  calculateProductTaxes: (productId: string, destinationState: string) => any;
  loadBackup: (data: AppData) => void;

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

  // Filings (Declarations)
  addFiling: (item: Filing) => Promise<void>;
  filings: Filing[];

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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEY = 'escopov3_db_gold_multi';
const CURRENT_USER = 'Admin User'; // Mock User for Audit Trails

// @ts-ignore
const electronAPI = (window as any).electronAPI;

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
  savedReports: []
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(initialData);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(localStorage.getItem('selectedCompanyId'));
  const [currentUser, setCurrentUser] = useState<string>(localStorage.getItem('currentUser') || 'Visitante');
  const [userEmail, setUserEmail] = useState<string | null>(localStorage.getItem('userEmail'));
  const [userPhone, setUserPhone] = useState<string>(localStorage.getItem('userPhone') || '+55 (11) 98765-4321');
  const [userDepartment, setUserDepartment] = useState<string>(localStorage.getItem('userDepartment') || 'Diretoria (HQ)');
  const [userPhotoURL, setUserPhotoURL] = useState<string | null>(localStorage.getItem('userPhotoURL'));
  const [memberSince, setMemberSince] = useState<string>(localStorage.getItem('memberSince') || 'Desde Outubro 2023');
  const [userRole, setUserRole] = useState<'Admin' | 'Operador' | 'Cliente'>((localStorage.getItem('userRole') as any) || 'Cliente');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as any) || 'light');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!localStorage.getItem('isLoggedIn'));
  const [isLoaded, setIsLoaded] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [userPermissions, setUserPermissions] = useState<any>({
    fiscal: 'full',
    financial: 'full',
    hr: 'full',
    crm: 'full',
    admin: 'full',
    inventory: 'full'
  });

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
        setData(initialData);
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

    // Add to Firestore if user is logged in
    const user = auth.currentUser;
    if (user) {
      const logsRef = collection(db, 'users', user.uid, 'audit_logs');
      await setDoc(doc(logsRef, logId), newLog);
    }

    // Also add to the new audit store (Recommendation 5)
    // The audit store already subscribes to Firestore, but for immediate UI feedback:
    useAuditStore.getState().addAuditLog(newLog);
  };

  // Professional Multi-User Synchronization (Item 1 & 10)
  useEffect(() => {
    let unsubscribes: (() => void)[] = [];

    const setupSubscriptions = (uid: string) => {
      console.log('🔄 Configurando sincronização de dados para usuário:', uid);

      const collectionsToSync: (keyof AppData)[] = [
        'companies', 'clients', 'products', 'services',
        'employees', 'partners', 'invoices', 'ncms',
        'taxRates', 'payrollItems', 'payrollRuns', 'alerts',
        'bankAccounts', 'bankTransactions', 'filings',
        'csts', 'cfops', 'units', 'operationTypes', 'systemUsers',
        'costCenters', 'taxCalendar', 'spedValidations', 'assets', 'accountingEntries', 'accountingClosures', 'savedReports'
      ];

      collectionsToSync.forEach((key) => {
        // Aplicar filtro de userId para todas as coleções, incluindo invoices
        // Isso garante isolamento de dados e conformidade com regras do Firestore
        const q = query(collection(db, key), where('userId', '==', uid));

        const unsub = onSnapshot(q, (snapshot) => {
          const items = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
          })) as any[];

          console.log(`📊 ${key}: ${items.length} documento(s) carregado(s)`);

          setData(prev => ({
            ...prev,
            [key]: items
          }));
        }, (error) => {
          console.error(`❌ Erro ao sincronizar ${key}:`, error);
        });
        unsubscribes.push(unsub);
      });
    };

    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      // Clear previous subscriptions
      unsubscribes.forEach(u => u());
      unsubscribes = [];

      if (user) {
        console.log('✅ Usuário autenticado:', user.email);
        setIsLoggedIn(true);
        localStorage.setItem('isLoggedIn', 'true');
        setUserEmail(user.email);

        // Load Profile from Firestore (Professional metadata)
        const profileRef = doc(db, 'users', user.uid);
        onSnapshot(profileRef, (doc) => {
          if (doc.exists()) {
            const profile = doc.data();
            setCurrentUser(profile.name || user.displayName || 'Usuário');
            setUserRole(profile.role || 'Cliente');
            setIs2FAEnabled(profile.is2FAEnabled || false);
            if (profile.phone) setUserPhone(profile.phone);
            if (profile.department) setUserDepartment(profile.department);
            if (profile.photoURL) setUserPhotoURL(profile.photoURL);
            if (profile.memberSince) setMemberSince(profile.memberSince);
            if (profile.permissions) setUserPermissions(profile.permissions);
          } else {
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
        setData(initialData); // Clear data on logout
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

  // Smart Notification & Deadline Engine (Comprehensive Alert System)
  useEffect(() => {
    if (!isLoaded || !isLoggedIn) return;

    // Protective delay to ensure all nested stores are hydrated
    const checker = setTimeout(() => {
      const today = new Date();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const todayStr = today.toISOString().split('T')[0];
      const tasks = useWorkflowStore.getState().tasks;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const currentNotifs = useNotificationStore.getState().notifications;

      // Helper function to generate alerts
      const triggerAlert = (companyId: string | undefined, title: string, message: string, severity: 'high' | 'medium' | 'low', type: FiscalAlert['type']) => {
        // Se não tiver companyId, associa à empresa selecionada atualmente (contexto global) ou deixa undefined (sistema geral)
        const targetCompanyId = companyId || selectedCompanyId || undefined;

        // Anti-spam: check for unread alerts with similar title within the same company context
        const alreadyExists = data.alerts.some(a =>
          a.title === title &&
          !a.isRead &&
          (a.companyId === targetCompanyId)
        );

        if (!alreadyExists) {
          const alert: FiscalAlert = {
            id: Math.random().toString(36).substr(2, 9),
            companyId: targetCompanyId,
            title,
            message,
            severity,
            date: new Date().toISOString(),
            isRead: false,
            type
          };

          addAlert(alert);
        }
      };

      // === VALIDAÇÕES DE CADASTRO DE EMPRESAS ===
      data.companies.forEach(company => {
        const missingFields: string[] = [];

        if (!company.cnpj) missingFields.push('CNPJ');
        if (!company.razaoSocial) missingFields.push('Razão Social');
        if (!company.nomeFantasia) missingFields.push('Nome Fantasia');
        if (!company.regimeTributario) missingFields.push('Regime Tributário');
        if (!company.email) missingFields.push('E-mail');
        if (!company.telefone) missingFields.push('Telefone');

        // Validação de endereço
        if (!company.address?.zip) missingFields.push('CEP');
        if (!company.address?.street) missingFields.push('Endereço');
        if (!company.address?.city) missingFields.push('Cidade');
        if (!company.address?.uf) missingFields.push('UF');

        if (missingFields.length > 0) {
          triggerAlert(
            company.id,
            `📋 Cadastro Incompleto: ${company.nomeFantasia || 'Empresa'}`,
            `Campos obrigatórios ausentes: ${missingFields.join(', ')}. Complete o cadastro para evitar problemas fiscais.`,
            'high',
            'compliance'
          );
        }
      });

      // === APURAÇÃO DE FOLHA DE PAGAMENTO ===
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      // Check for each company
      data.companies.forEach(company => {
        const payrollForMonth = data.payrollRuns.find(
          pr => new Date(pr.competence).getMonth() === currentMonth &&
            new Date(pr.competence).getFullYear() === currentYear &&
            pr.companyId === company.id
        );

        // Verificar se já passou do dia 5 e ainda não calculou a folha
        if (today.getDate() >= 5 && !payrollForMonth) {
          triggerAlert(
            company.id,
            `💼 Apuração de Folha Pendente`,
            `A folha de pagamento de ${today.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })} ainda não foi apurada. Prazo limite: dia 10.`,
            'high',
            'hr'
          );
        }

        // Folha calculada mas não fechada
        if (payrollForMonth && payrollForMonth.status !== 'fechado') {
          const daysUntil10 = 10 - today.getDate();
          if (daysUntil10 <= 3 && daysUntil10 >= 0) {
            triggerAlert(
              company.id,
              `⚠️ Folha Não Fechada`,
              `A folha de ${today.toLocaleString('pt-BR', { month: 'long' })} está calculada mas ainda não foi fechada. Faltam ${daysUntil10} dias para o prazo.`,
              'medium',
              'hr'
            );
          }
        }
      });

      // === FECHAMENTOS CONTÁBEIS EM ABERTO ===
      data.filings.forEach(filing => {
        if (filing.status === 'not_started' || filing.status === 'pending') {
          const deadline = new Date(filing.deadline);
          const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays <= 7) {
            triggerAlert(
              filing.companyId,
              `📊 Fechamento em Aberto: ${filing.name}`,
              `O fechamento "${filing.name}" do período ${filing.competence} vence em ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}. Status: ${filing.status === 'not_started' ? 'Não iniciado' : 'Em andamento'}.`,
              diffDays <= 2 ? 'high' : 'medium',
              'compliance'
            );
          }
        }
      });

      // === VENCIMENTO DE GUIAS E TRIBUTOS ===
      data.taxCalendar.forEach(evt => {
        if (evt.isDone) return;

        const evtDate = new Date(evt.date);
        const diffDays = Math.ceil((evtDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 5 && diffDays >= -1) {
          const urgencyText = diffDays < 0 ? 'VENCIDO' : diffDays === 0 ? 'VENCE HOJE' : `vence em ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;

          triggerAlert(
            evt.companyId,
            `💰 Guia/Tributo: ${evt.title}`,
            `${evt.title} ${urgencyText} (${evt.date.split('-').reverse().join('/')}). ${evt.description || 'Efetue o pagamento para evitar multas e juros.'}`,
            diffDays <= 0 ? 'high' : evt.severity,
            'tax_deadline'
          );
        }
      });

      // === CONTAS A RECEBER (FINANCIAL) ===
      data.invoices.forEach(inv => {
        if ((inv.type === 'exit' || inv.type === 'service') && inv.status !== 'paga' && inv.status !== 'cancelada') {
          const invDate = new Date(inv.date);
          const diffDays = Math.ceil((today.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays >= 5) {
            triggerAlert(
              inv.companyId,
              `💵 Recebimento Pendente: ${inv.number}`,
              `A nota fiscal de ${inv.entityName} no valor de R$ ${inv.value.toFixed(2)} está aberta há ${diffDays} dias. Entre em contato com o cliente.`,
              diffDays > 15 ? 'high' : 'medium',
              'financial'
            );
          }
        }
      });

      // === CONTAS A PAGAR ===
      data.invoices.forEach(inv => {
        if (inv.type === 'entry' && inv.status !== 'paga' && inv.status !== 'cancelada') {
          const invDate = new Date(inv.date);
          const diffDays = Math.ceil((invDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays <= 3 && diffDays >= -1) {
            const statusText = diffDays < 0 ? 'VENCIDA' : diffDays === 0 ? 'VENCE HOJE' : `vence em ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;

            triggerAlert(
              inv.companyId,
              `💳 Conta a Pagar: ${inv.number}`,
              `Despesa de ${inv.entityName} no valor de R$ ${inv.value.toFixed(2)} ${statusText}. Providencie o pagamento.`,
              diffDays <= 0 ? 'high' : 'medium',
              'financial'
            );
          }
        }
      });

      // === TAREFAS PENDENTES (WORKFLOW) ===
      tasks.forEach(task => {
        if (task.status !== 'done') {
          const dueDate = new Date(task.dueDate);
          const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays <= 2 && diffDays >= -1) {
            triggerAlert(
              task.companyId,
              `✅ Tarefa Pendente: ${task.title}`,
              `Prazo: ${task.dueDate.split('-').reverse().join('/')}. Atribuída a: ${task.assignedTo || 'Sistema'}. ${task.description || ''}`,
              task.priority === 'urgent' ? 'high' : 'medium',
              'workflow'
            );
          }
        }
      });

      // === CERTIFICADO DIGITAL PRÓXIMO DO VENCIMENTO ===
      data.companies.forEach(company => {
        // Assumindo que temos um campo certificateExpiry (você pode adicionar isso ao tipo CompanyEntity)
        if ((company as any).certificateExpiry) {
          const certDate = new Date((company as any).certificateExpiry);
          const diffDays = Math.ceil((certDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays <= 30 && diffDays >= 0) {
            triggerAlert(
              company.id,
              `🔐 Certificado Digital Vencendo`,
              `O certificado digital da empresa ${company.nomeFantasia} vencerá em ${diffDays} dias (${(company as any).certificateExpiry}). Renove com antecedência!`,
              diffDays <= 7 ? 'high' : 'medium',
              'compliance'
            );
          }
        }
      });

    }, 3000);

    return () => clearTimeout(checker);
  }, [isLoaded, isLoggedIn, selectedCompanyId, data.companies, data.invoices, data.taxCalendar, data.filings, data.payrollRuns]);

  // [BUSINESS LOGIC] generateDRE implementation
  const generateDRE = (companyId: string, startDate: string, endDate: string) => {
    const invoices = data.invoices.filter(i =>
      i.companyId === companyId &&
      i.date >= startDate &&
      i.date <= endDate &&
      i.status !== 'cancelada'
    );

    const receitaBruta = invoices
      .filter(i => i.type === 'exit' || i.type === 'service')
      .reduce((sum, i) => sum + i.value, 0);

    const impostos = invoices
      .filter(i => i.type === 'exit' || i.type === 'service')
      .reduce((sum, i) => sum + (i.taxValue || 0), 0);

    const cmv = invoices
      .filter(i => i.type === 'entry')
      .reduce((sum, i) => sum + i.value, 0);

    const despesas = data.bankTransactions
      .filter(t => t.companyId === companyId && t.date >= startDate && t.date <= endDate && t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);

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
    const product = data.products.find(p => p.id === productId);
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
    await updateDoc(doc(db, colName, id), {
      status: 'autorizada',
      approvedAt: new Date().toISOString(),
      approvedBy: currentUser
    });
    addAuditLog('update', colName, id, `Transaction approved by ${currentUser}`);
  };

  // Persist Selected Company
  useEffect(() => {
    if (selectedCompanyId) {
      localStorage.setItem('selectedCompanyId', selectedCompanyId);
    } else {
      localStorage.removeItem('selectedCompanyId');
    }
  }, [selectedCompanyId]);

  // Derived selected company object
  const selectedCompany = data.companies.find(c => c.id === selectedCompanyId) || null;

  const selectCompany = (id: string | null) => {
    setSelectedCompanyId(id);
  };

  const saveCompany = async (company: CompanyEntity) => {
    if (!auth.currentUser) return;

    const now = new Date().toISOString();
    const isNew = !company.id;

    const companyData = {
      ...company,
      userId: auth.currentUser.uid,
      ...(isNew
        ? { createdBy: currentUser, createdAt: now }
        : { updatedBy: currentUser, updatedAt: now }
      )
    };

    try {
      if (isNew) {
        const docRef = await addDoc(collection(db, 'companies'), companyData);
        addAuditLog({
          userId: auth.currentUser.uid,
          userName: currentUser,
          action: 'create',
          entity: 'companies',
          entityId: docRef.id,
          details: `Created company: ${company.nomeFantasia}`,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        });
      } else {
        await setDoc(doc(db, 'companies', company.id), companyData, { merge: true });
        addAuditLog({
          userId: auth.currentUser.uid,
          userName: currentUser,
          action: 'update',
          entity: 'companies',
          entityId: company.id,
          details: `Updated company: ${company.nomeFantasia}`,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        });
      }
    } catch (error: any) {
      console.error('Error saving company:', error);
      if (error.code === 'permission-denied') {
        alert('Erro de permissão! Verifique suas credenciais.');
      }
      throw error;
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'companies', id));
      if (selectedCompanyId === id) setSelectedCompanyId(null);
    } catch (error) {
      console.error('Error deleting company:', error);
    }
  };

  // Item 1: Real Database (Firestore) with User Isolation
  const addItem = async <T,>(key: keyof AppData, item: T) => {
    if (!auth.currentUser) {
      console.error("❌ Tentativa de gravação sem usuário autenticado.");
      alert("Erro: Usuário não autenticado. Tente fazer login novamente.");
      return;
    }

    // Safety Force Company ID
    let targetCompanyId = selectedCompanyId;
    if (!targetCompanyId && data.companies.length > 0) {
      targetCompanyId = data.companies[0].id;
      setSelectedCompanyId(targetCompanyId); // Sync state
    }

    try {
      const itemWithAudit = {
        ...(item as any),
        userId: auth.currentUser.uid, // OBRIGATORIO para isolamento
        companyId: (key === 'ncms' || key === 'companies') ? undefined : ((item as any).companyId || targetCompanyId),
        createdBy: currentUser,
        createdAt: new Date().toISOString()
      };

      console.log(`📝 Criando documento em ${key}...`, itemWithAudit);
      const docRef = await addDoc(collection(db, key), itemWithAudit);
      console.log(`✅ Documento criado em ${key} com ID:`, docRef.id);

      addAuditLog({
        userId: auth.currentUser.uid,
        userName: currentUser,
        action: 'create',
        entity: key as string,
        entityId: docRef.id,
        details: `Created new ${key}`,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      });
    } catch (error: any) {
      console.error(`❌ Erro ao adicionar em ${key}:`, error);
      console.error('Código do erro:', error.code);
      console.error('Mensagem:', error.message);

      if (error.code === 'permission-denied') {
        alert('Erro de permissão! Verifique se as regras do Firestore estão atualizadas no Firebase Console.');
      } else {
        // alert(`Erro ao salvar: ${error.message}`); // Let caller handle generic errors
      }
      throw error;
    }
  };

  const updateItem = async (key: keyof AppData, item: any, idField = 'id') => {
    try {
      const id = item[idField];
      if (!id || !auth.currentUser) {
        console.error('❌ ID inválido ou usuário não autenticado');
        return;
      }

      const itemWithAudit = {
        ...item,
        userId: auth.currentUser.uid,
        updatedBy: currentUser,
        updatedAt: new Date().toISOString()
      };

      console.log(`✏️ Atualizando documento em ${key} com ID: ${id}`);
      await updateDoc(doc(db, key, id), itemWithAudit);
      console.log(`✅ Documento atualizado em ${key}`);

      addAuditLog({
        userId: auth.currentUser.uid,
        userName: currentUser,
        action: 'update',
        entity: key as string,
        entityId: id,
        details: `Updated ${key}`,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      });
    } catch (error: any) {
      console.error(`❌ Erro ao atualizar ${key}:`, error);
      console.error('Código do erro:', error.code);
      console.error('Mensagem:', error.message);

      if (error.code === 'permission-denied') {
        alert('Erro de permissão ao atualizar! Você só pode atualizar seus próprios documentos.');
      } else {
        // alert(`Erro ao atualizar: ${error.message}`);
      }
      throw error;
    }
  };

  const deleteItem = async (key: keyof AppData, id: string) => {
    try {
      console.log(`🗑️ Excluindo documento em ${key} com ID: ${id}`);
      // Validation for Deletion in Closed Periods (AccountingEntries)
      if (key === 'accountingEntries') {
        // Need to find the item first to check date
        // Since 'item' arg in deleteItem is just ID, we look up in data
        const entryToDelete = (data.accountingEntries as AccountingEntry[]).find(e => e.id === id);
        if (entryToDelete) {
          if (checkPeriodClosed(entryToDelete.date, entryToDelete.companyId)) {
            alert(`⚠️ PERÍODO ENCERRADO!\n\nNão é possível excluir este lançamento pois a competência ${entryToDelete.date.substring(0, 7)} está fechada.`);
            return;
          }
        }
      }

      await deleteDoc(doc(db, key, id));
      console.log(`✅ Documento excluído de ${key}`);

      addAuditLog({
        userId: auth.currentUser?.uid || 'anonymous',
        userName: currentUser,
        action: 'delete',
        entity: key as string,
        entityId: id,
        details: `Deleted from ${key}`,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      });
    } catch (error: any) {
      console.error(`❌ Erro ao excluir de ${key}:`, error);
      console.error('Código do erro:', error.code);
      console.error('Mensagem:', error.message);

      if (error.code === 'permission-denied') {
        alert('Erro de permissão ao excluir! Você só pode excluir seus próprios documentos.');
      } else {
        // alert(`Erro ao excluir: ${error.message}`);
      }
      throw error;
    }
  };

  const settleInvoice = async (invoiceId: string, bankAccountId: string, date: string, valuePaid: number) => {
    const invoice = data.invoices.find(i => i.id === invoiceId);
    const bank = data.bankAccounts.find(b => b.id === bankAccountId);

    if (!invoice || !bank || !auth.currentUser) return;

    try {
      // 1. Update Invoice
      const updatedInvoice = {
        ...invoice,
        status: 'paga' as const,
        paymentDate: date,
        isReconciled: true,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser
      };
      await updateDoc(doc(db, 'invoices', invoiceId), updatedInvoice);

      // 2. Create Transaction
      const transactionType = (invoice.type === 'exit' || invoice.type === 'service') ? 'credit' : 'debit';
      const transaction: any = { // using any to bypass strict type check on new fields locally vs remote
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
        createdBy: currentUser
      };
      await addDoc(collection(db, 'bankTransactions'), transaction);

      // 3. Update Balance
      const newBalance = bank.balance + (transactionType === 'credit' ? valuePaid : -valuePaid);
      await updateDoc(doc(db, 'bankAccounts', bankAccountId), { balance: newBalance });

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
    setData(prev => ({ ...prev, alerts: [alert, ...prev.alerts] }));

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
    setData(prev => ({
      ...prev,
      alerts: prev.alerts.map(a => ({ ...a, isRead: true }))
    }));
  };

  const clearAlerts = () => {
    setData(prev => ({ ...prev, alerts: [] }));
  };

  // Filtering Logic
  const filteredData = React.useMemo(() => {
    // If no company selected, show nothing for business entities (or legacy if needed)
    // For strict separation as requested:
    if (!selectedCompanyId) {
      return {
        clients: [],
        products: [],
        services: [],
        employees: [],
        partners: [],
        invoices: [],
        ncms: data.ncms, // Global
        taxRates: [],
        payrollItems: [],
        alerts: data.alerts,
        csts: data.csts,
        cfops: data.cfops,
        units: data.units,
        operationTypes: data.operationTypes,
        systemUsers: data.systemUsers,
        assets: [],
        accountingEntries: [],
        accountingClosures: []
      };
    }

    const filterFn = (item: any) => item.companyId === selectedCompanyId;

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

  const checkPeriodClosed = (date: string, companyId?: string) => {
    const targetCompanyId = companyId || selectedCompanyId;
    if (!targetCompanyId || !date) return false;

    // Check if date falls into any closed period (status = 'closed')
    // Extract YYYY-MM
    const period = date.substring(0, 7);

    // Find closure for this period
    const closure = data.accountingClosures.find(c =>
      c.companyId === targetCompanyId &&
      c.period === period &&
      c.status === 'closed'
    );

    return !!closure;
  };

  const addAsset = async (item: FixedAsset) => {
    await addItem('assets', item);
  };

  const updateAsset = async (item: FixedAsset) => {
    await updateItem('assets', item);
  };

  const addAccountingEntry = async (item: AccountingEntry) => {
    if (checkPeriodClosed(item.date, item.companyId)) {
      alert(`⚠️ PERÍODO ENCERRADO!\n\nNão é possível criar lançamentos para a competência ${item.date.substring(0, 7)} pois o período contábil já foi fechado.`);
      return; // Block
    }
    await addItem('accountingEntries', item);
  };

  const updateAccountingEntry = async (item: AccountingEntry) => {
    // Check old date (to prevent moving from closed period) and new date (to prevent moving into closed period)
    const oldEntry = data.accountingEntries.find(e => e.id === item.id);
    if (oldEntry && checkPeriodClosed(oldEntry.date, oldEntry.companyId)) {
      alert(`⚠️ PERÍODO ENCERRADO!\n\nEste lançamento pertence a um período fechado (${oldEntry.date.substring(0, 7)}) e não pode ser alterado.`);
      return;
    }

    if (checkPeriodClosed(item.date, item.companyId)) {
      alert(`⚠️ PERÍODO ENCERRADO!\n\nNão é possível mover este lançamento para ${item.date.substring(0, 7)} pois o destino está em um período fechado.`);
      return;
    }

    await updateItem('accountingEntries', item);
  };

  const addAccountingClosure = async (item: AccountingClosure) => {
    // Check if duplicate
    const existing = data.accountingClosures.find(c =>
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

  return (
    <DataContext.Provider value={{
      ...data,
      ...filteredData, // Override data with filtered versions
      selectedCompanyId,
      selectedCompany,
      selectCompany,
      saveCompany,
      deleteCompany,
      addClient: (i) => addItem('clients', i),
      addProduct: (i) => addItem('products', i),
      addService: (i) => addItem('services', i),
      addEmployee: (i) => addItem('employees', i),
      addPartner: (i) => addItem('partners', i),
      addInvoice: (i) => addItem('invoices', i),
      addNCM: (i) => addItem('ncms', i),
      addTaxRate: (i) => addItem('taxRates', i),
      addPayrollItem: (i) => addItem('payrollItems', i),
      addPayrollRun: (i) => addItem('payrollRuns', i),
      addBankAccount: (i) => addItem('bankAccounts', i),

      addBankTransaction: (i) => addItem('bankTransactions', i),
      addFiling: (i) => addItem('filings', i),
      addCST: (i) => addItem('csts', i),
      addCFOP: (i) => addItem('cfops', i),
      addUnit: (i) => addItem('units', i),
      addOperationType: (i) => addItem('operationTypes', i),
      addSystemUser: (i) => addItem('systemUsers', i),
      updateSystemUser: (i) => updateItem('systemUsers', i),

      updateClient: (i) => updateItem('clients', i),
      updateEmployee: (i) => updateItem('employees', i),
      updatePartner: (i) => updateItem('partners', i),
      updateProduct: (i) => updateItem('products', i),
      updateService: (i) => updateItem('services', i),
      updateNCM: (i) => updateItem('ncms', i, 'code'), // Special key for NCM
      updateCST: (i) => updateItem('csts', i),
      updateCFOP: (i) => updateItem('cfops', i),
      updateUnit: (i) => updateItem('units', i),
      addAsset,
      updateAsset,
      addAccountingEntry,
      updateAccountingEntry,
      addAccountingClosure,
      updateAccountingClosure,
      checkPeriodClosed,
      addSavedReport: (i) => addItem('savedReports', i),
      updateOperationType: (i) => updateItem('operationTypes', i),
      updateTaxRate: (i) => updateItem('taxRates', i),
      updatePayrollItem: (i) => updateItem('payrollItems', i),
      updateInvoice: (i) => updateItem('invoices', i),
      updateBankTransaction: (i) => updateItem('bankTransactions', i),
      updateFiling: (i) => updateItem('filings', i),
      updatePayrollRun: (i) => updateItem('payrollRuns', i),
      updateBankAccount: (i) => updateItem('bankAccounts', i),
      addCostCenter: (i) => addItem('costCenters', i),
      updateCostCenter: (i) => updateItem('costCenters', i),
      addTaxCalendarEvent: (i) => addItem('taxCalendar', i),
      updateTaxCalendarEvent: (i) => updateItem('taxCalendar', i),
      addPreSpedLog: (i) => addItem('spedValidations', i),
      updatePreSpedLog: (i) => updateItem('spedValidations', i),
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
          setData(backupData);

          // 2. Force immediate save to localStorage
          localStorage.setItem(STORAGE_KEY, JSON.stringify(backupData));

          // 3. Try saving to disk if in Electron
          if (electronAPI) {
            await electronAPI.saveDatabase(backupData);
          }

          alert("Backup restaurado com sucesso! O sistema será reiniciado.");
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
      register: async (email, pass, name) => {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
          const user = userCredential.user;

          await updateProfile(user, { displayName: name });

          // Create User Profile in Firestore (Professional)
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: email,
            name: name,
            role: 'Admin', // Default role for new signups
            createdAt: new Date().toISOString()
          });

          setCurrentUser(name);
          setIsLoggedIn(true);
          setUserEmail(user.email);

          addAuditLog('create', 'user', user.uid, `New user registered: ${name}`);
          return { success: true };
        } catch (error: any) {
          console.error("Registration failed:", error);
          return { success: false, error: error.message };
        }
      },
      login: async (email, pass) => {
        try {
          // Item 2: Real JWT Auth via Firebase
          const userCredential = await signInWithEmailAndPassword(auth, email, pass);
          const user = userCredential.user;
          setIsLoggedIn(true);
          setUserEmail(user.email);
          // Item 7: Audit Log
          addAuditLog('login', 'session', user.uid, 'Successful login');
          return true;
        } catch (error) {
          console.error("Login failed:", error);
          return false;
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

          // Check if user exists in Firestore, if not create basic profile
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (!userDoc.exists()) {
            await setDoc(doc(db, 'users', user.uid), {
              uid: user.uid,
              email: user.email,
              name: user.displayName,
              role: 'Cliente', // Default for social login
              createdAt: new Date().toISOString(),
              photoURL: user.photoURL
            });
          }

          setIsLoggedIn(true);
          setUserEmail(user.email);
          addAuditLog('login', 'session', user.uid, 'Logged in via Google');
          return true;
        } catch (error) {
          console.error("Google Login failed:", error);
          return false;
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
        setSelectedCompanyId(null);
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userPhone');
        localStorage.removeItem('userDepartment');
        localStorage.removeItem('userPhotoURL');
        localStorage.removeItem('memberSince');
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
          await setDoc(doc(db, 'users', auth.currentUser.uid), data, { merge: true });


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
          await setDoc(doc(db, 'users', auth.currentUser.uid), { permissions: perms }, { merge: true });
          addAuditLog('update', 'user_permissions', auth.currentUser.uid, 'Updated user permissions');
        } catch (error) {
          console.error("Error updating permissions:", error);
        }
      }
    }}>
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