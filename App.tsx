import React, { useEffect, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { DataProvider, useData } from '@contexts/DataContext';
import { ToastProvider } from './contexts/ToastContext';
import { ErrorProvider } from './contexts/ErrorContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { PendingApproval } from './pages/PendingApproval';

// Lazy load pages
const CompanySelection = lazy(() => import('./pages/CompanySelection').then(m => ({ default: m.CompanySelection })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Fiscal = lazy(() => import('./pages/Fiscal').then(m => ({ default: m.Fiscal })));
const Payroll = lazy(() => import('./pages/Payroll').then(m => ({ default: m.Payroll })));
const Taxes = lazy(() => import('./pages/Taxes').then(m => ({ default: m.Taxes })));
const Accounting = lazy(() => import('./pages/Accounting').then(m => ({ default: m.Accounting })));
const AccountingDRE = lazy(() => import('./pages/Accounting/DRE').then(m => ({ default: m.DRE })));
const AccountingBalanco = lazy(() => import('./pages/Accounting/Balanco').then(m => ({ default: m.Balanco })));
const AccountingPlanoContas = lazy(() => import('./pages/Accounting/PlanoContas').then(m => ({ default: m.PlanoContas })));
const AccountingDiario = lazy(() => import('./pages/Accounting/LivroDiario').then(m => ({ default: m.LivroDiario })));
const AccountingBalancete = lazy(() => import('./pages/Accounting/Balancete').then(m => ({ default: m.Balancete })));
const AccountingDMPL = lazy(() => import('./pages/Accounting/DMPL').then(m => ({ default: m.DMPL })));
const AccountingDFC = lazy(() => import('./pages/Accounting/DFC').then(m => ({ default: m.DFC })));
const Company = lazy(() => import('./pages/Company').then(m => ({ default: m.Company })));
const CRM = lazy(() => import('./pages/CRM').then(m => ({ default: m.CRM })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const FiscalBooks = lazy(() => import('./pages/FiscalBooks').then(m => ({ default: m.FiscalBooks })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Help = lazy(() => import('./pages/Help').then(m => ({ default: m.Help })));
const RubricManager = lazy(() => import('./pages/RubricManager').then(m => ({ default: m.RubricManager })));
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const Documents = lazy(() => import('./pages/Documents').then(m => ({ default: m.Documents })));
const Financial = lazy(() => import('./pages/Financial').then(m => ({ default: m.Financial })));
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const XMLs = lazy(() => import('./pages/XMLs').then(m => ({ default: m.XMLs })));
const Declarations = lazy(() => import('./pages/Declarations').then(m => ({ default: m.Declarations })));
const Esocial = lazy(() => import('./pages/Esocial').then(m => ({ default: m.Esocial })));
const Inventory = lazy(() => import('./pages/Inventory')); // Default export assumed if not specified otherwise
const Portal = lazy(() => import('./pages/Portal')); // Default export assumed
const Workflow = lazy(() => import('./pages/Workflow').then(m => ({ default: m.Workflow })));
const AuditLogs = lazy(() => import('./pages/AuditLogs').then(m => ({ default: m.AuditLogs })));
const SystemManagement = lazy(() => import('./pages/SystemManagement').then(m => ({ default: m.SystemManagement })));
const FirestoreTest = lazy(() => import('./pages/FirestoreTest').then(m => ({ default: m.FirestoreTest })));
const UserSelection = lazy(() => import('./pages/UserSelection').then(m => ({ default: m.UserSelection })));
const Notifications = lazy(() => import('./pages/Notifications').then(m => ({ default: m.NotificationsPage })));

// Loading component
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
    </div>
);

// Auth Guard component
const AuthGuard = ({ children }: { children: React.ReactNode }) => {
    const { isLoggedIn, isLoaded } = useData();

    if (!isLoaded) {
        return <PageLoader />;
    }

    if (!isLoggedIn) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

// Role Guard component
const RoleGuard = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
    const { userRole, isLoggedIn, isLoaded } = useData();

    if (!isLoaded) {
        return <PageLoader />;
    }

    if (!isLoggedIn) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(userRole)) {
        return <Navigate to="/app" replace />;
    }

    return <>{children}</>;
};

// Protected Layout that requires a company to be selected
const AppLayout = () => {
    const { isLoggedIn, isLoaded } = useData();
    // const { selectedCompany } = useData(); // Not strictly checking selectedCompany here, usually handled by business logic

    if (!isLoaded) {
        return <PageLoader />;
    }

    if (!isLoggedIn) {
        return <Navigate to="/login" replace />;
    }

    return (
        <Layout>
            <Outlet />
        </Layout>
    );
};

const AppWrapper = ({ children }: { children: React.ReactNode }) => {
    const { theme, isLoggedIn } = useData();

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return <>{children}</>;
};

function App() {
    return (
        <DataProvider>
            <ToastProvider>
                <ErrorProvider>
                    <AppWrapper>
                        <HashRouter>
                            <Suspense fallback={<PageLoader />}>
                                <Routes>
                                    <Route path="/login" element={<Login />} />
                                    <Route path="/pending-approval" element={<PendingApproval />} />

                                    {/* Protected Selection Route */}
                                    <Route path="/" element={
                                        <AuthGuard>
                                            <CompanySelection />
                                        </AuthGuard>
                                    } />

                                    <Route path="/select-user" element={
                                        <AuthGuard>
                                            <UserSelection />
                                        </AuthGuard>
                                    } />

                                    {/* Protected App Routes */}
                                    <Route path="/app" element={<AppLayout />}>
                                        <Route index element={<Dashboard />} />
                                        <Route path="fiscal" element={<Fiscal />} />
                                        <Route path="taxes" element={<Taxes />} />
                                        <Route path="payroll" element={<Payroll />} />
                                        <Route path="accounting" element={<Accounting />} />
                                        <Route path="accounting/dre" element={<AccountingDRE />} />
                                        <Route path="accounting/balanco" element={<AccountingBalanco />} />
                                        <Route path="accounting/plano-contas" element={<AccountingPlanoContas />} />
                                        <Route path="accounting/diario" element={<AccountingDiario />} />
                                        <Route path="accounting/balancete" element={<AccountingBalancete />} />
                                        <Route path="accounting/dmpl" element={<AccountingDMPL />} />
                                        <Route path="accounting/dfc" element={<AccountingDFC />} />
                                        <Route path="crm" element={<CRM />} />
                                        <Route path="reports" element={<Reports />} />
                                        <Route path="fiscal-books" element={<FiscalBooks />} />
                                        <Route path="settings" element={<Settings />} />
                                        <Route path="settings/rubrics" element={<RubricManager />} />
                                        <Route path="company" element={<Company />} />
                                        <Route path="help" element={<Help />} />
                                        <Route path="documents" element={<Documents />} />
                                        <Route path="financial" element={<Financial />} />
                                        <Route path="analytics" element={<Analytics />} />
                                        <Route path="xmls" element={<XMLs />} />
                                        <Route path="declarations" element={<Declarations />} />
                                        <Route path="esocial" element={<Esocial />} />
                                        <Route path="inventory" element={<Inventory />} />
                                        <Route path="portal" element={<Portal />} />
                                        <Route path="workflow" element={<Workflow />} />
                                        <Route path="audit" element={<AuditLogs />} />
                                        <Route path="management" element={<SystemManagement />} />
                                        <Route path="firestore-test" element={
                                            <RoleGuard allowedRoles={['Admin']}>
                                                <FirestoreTest />
                                            </RoleGuard>
                                        } />
                                        <Route path="notifications" element={<Notifications />} />

                                        <Route path="admin" element={
                                            <RoleGuard allowedRoles={['Admin']}>
                                                <Admin />
                                            </RoleGuard>
                                        } />
                                    </Route>

                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </Routes>
                            </Suspense>
                        </HashRouter>
                    </AppWrapper>
                </ErrorProvider>
            </ToastProvider>
        </DataProvider>
    );
}

export default App;