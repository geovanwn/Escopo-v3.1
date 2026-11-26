import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import {
  LayoutDashboard,
  FileText,
  Users,
  Calculator,
  Briefcase,
  Settings,
  HelpCircle,
  Building2,
  Menu,
  Search,
  ChevronDown,
  ArrowLeftRight,
  Lock,
  Shield,
  ShieldCheck,
  BarChart3,
  LineChart,
  Percent,
  Sun,
  Moon,
  FolderOpen,
  Wallet,
  FileSignature,
  Package,
  Layers,
  X,
  ClipboardCheck,
  History,
  BookOpen,
  FileCode,
  Bell
} from 'lucide-react';
import { NavItem } from '../types';
import { NotificationCenter } from './ui/NotificationCenter';
import { SyncIndicator } from './SyncIndicator';

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/app', icon: LayoutDashboard },
  { label: 'Dp. Fiscal', path: '/app/fiscal', icon: FileText },
  { label: 'DP. Pessoal', path: '/app/payroll', icon: Users },
  { label: 'Dp. Contábil', path: '/app/accounting', icon: Calculator },
  { label: 'Dp. Financeiro', path: '/app/financial', icon: Wallet },
  { label: 'Analíticos', path: '/app/analytics', icon: LineChart },
  { label: 'XMLs', path: '/app/xmls', icon: FileCode },

  { label: 'Estoque', path: '/app/inventory', icon: Package },
  { label: 'Impostos', path: '/app/taxes', icon: Percent },
  { label: 'Cadastros', path: '/app/crm', icon: Briefcase },
  { label: 'Arquivos', path: '/app/documents', icon: FolderOpen },
  { label: 'Declarações', path: '/app/declarations', icon: FileSignature },
  { label: 'eSocial', path: '/app/esocial', icon: Layers },
  { label: 'Relatórios', path: '/app/reports', icon: BarChart3 },
  { label: 'Livros Fiscais', path: '/app/fiscal-books', icon: BookOpen },
  { label: 'Gestão & Portal', path: '/app/management', icon: ClipboardCheck },
  { label: 'Administração', path: '/app/admin', icon: Shield },
  { label: 'Notificações', path: '/app/notifications', icon: Bell },

  { label: 'Configurações', path: '/app/settings', icon: Settings },
  { label: 'Minha Empresa', path: '/app/company', icon: Building2 },
  { label: 'Ajuda', path: '/app/help', icon: HelpCircle },
];

import { useUIStore } from '../stores/useUIStore';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedCompany, selectCompany, currentUser, userRole, userPhotoURL, logout } = useData();
  const { theme, toggleTheme, sidebarOpen, setSidebarOpen, isMobile, setIsMobile, layout, updateLayout } = useUIStore();
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const navigate = useNavigate();
  const location = useLocation();

  const accentClass = `theme-${layout.accentColor}`;
  const radiusClass = `radius-${layout.borderRadius}`;
  const densityClass = `density-${layout.density}`;
  const glassClass = layout.glassmorphism ? 'glass-effect' : '';
  const fontClass = `font-${layout.fontFamily}`;
  const animClass = `anim-${layout.animations}`;
  const shadowClass = `shadow-${layout.shadowStyle}`;

  // Detect mobile & Handle Mini Mode
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else if (layout.mode === 'sidebar' || layout.mode === 'corporate') setSidebarOpen(true);
      else if (layout.mode === 'mini') setSidebarOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [layout.mode]);

  // Apply custom variables for intensity
  useEffect(() => {
    document.documentElement.style.setProperty('--accent-opacity', (layout.accentIntensity / 100).toString());
    document.documentElement.style.setProperty('--glass-opacity', (layout.accentIntensity / 150).toString());
  }, [layout.accentIntensity]);

  // Close sidebar on route change on mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  // Check Local API Status
  useEffect(() => {
    const checkApi = async () => {
        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const res = await fetch(`${apiBase}/ping`);
            if (res.ok) setApiStatus('online');
            else setApiStatus('offline');
        } catch (e) {
            setApiStatus('offline');
        }
    };
    checkApi();
    const interval = setInterval(checkApi, 30000); 
    return () => clearInterval(interval);
  }, []);

  // Handle Custom Cursor
  useEffect(() => {
    if (layout.customCursor) {
      const handleMouseMove = (e: MouseEvent) => {
        const cursor = document.getElementById('custom-cursor');
        if (cursor) {
          cursor.style.left = e.clientX + 'px';
          cursor.style.top = e.clientY + 'px';
        }
      };
      document.addEventListener('mousemove', handleMouseMove);
      return () => document.removeEventListener('mousemove', handleMouseMove);
    }
  }, [layout.customCursor]);

  const handleLogout = async () => {
    if (confirm("Deseja realmente sair do sistema?")) {
      try {
        await logout();
        navigate('/login');
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
      }
    }
  };

  const handleSwitchCompany = () => {
    selectCompany(null);
    navigate('/');
  };

  const SidebarContent = ({ isMini = false }) => (
    <>
      <div className={`h-20 flex items-center ${isMini ? 'justify-center' : 'justify-between px-6'} border-b border-slate-100 dark:border-slate-800`}>
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/app')}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-[#0ea5e9] to-[#10b981] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/10 animate-in zoom-in-50 duration-500">E</div>
          {(!isMini && (sidebarOpen || isMobile)) && (
            <span className="text-xl font-black tracking-tighter text-slate-800 dark:text-slate-150 animate-in fade-in slide-in-from-left-2 duration-300">
              Escopo<span className="text-emerald-500">V3</span>
            </span>
          )}
        </div>
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} className="p-2 text-slate-400 hover:text-cyan-600">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 py-6 overflow-y-auto custom-scrollbar">
        <ul className="space-y-1 px-4">
          {navItems.filter(item => {
            // ADMINS see everything
            if (userRole === 'Admin') return true;

            const perms = (useData() as any).userPermissions;
            if (!perms) return true; // Safety fallback

            // Mapping items to permission keys
            const mapping: Record<string, string> = {
              'Dashboard': 'dashboard',
              'Dp. Fiscal': 'fiscal',
              'DP. Pessoal': 'hr',
              'Dp. Contábil': 'accounting',
              'Dp. Financeiro': 'financial',
              'Analíticos': 'accounting',
              'XMLs': 'fiscal',
              'Estoque': 'inventory',
              'Impostos': 'fiscal',
              'Cadastros': 'crm',
              'Arquivos': 'crm',
              'Declarações': 'fiscal',
              'eSocial': 'hr',
              'Relatórios': 'reports',
              'Livros Fiscais': 'fiscal',
              'Gestão & Portal': 'admin',
              'Administração': 'admin',
              'Notificações': 'all',
              'Configurações': 'admin',
              'Minha Empresa': 'admin',
              'Ajuda': 'all'
            };

            const key = mapping[item.label];
            if (!key || key === 'all' || key === 'dashboard') return true;

            return perms[key] && perms[key] !== 'none';
          }).map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/app' && location.pathname.startsWith(item.path));
            return (
              <li key={item.path} title={isMini ? item.label : undefined}>
                <NavLink
                  to={item.path}
                  className={`
                    flex items-center ${isMini ? 'justify-center' : 'px-4'} py-3 rounded-full transition-all duration-300 group relative
                    ${isActive
                      ? 'bg-gradient-to-r from-[#0ea5e9] to-[#10b981] text-white shadow-lg shadow-emerald-500/15'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-[#0ea5e9] dark:text-slate-400 dark:hover:bg-slate-800'
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#0ea5e9]'} transition-colors`} />
                  {(!isMini && (sidebarOpen || isMobile)) && (
                    <span className="ml-3 text-sm font-bold tracking-tight">{item.label}</span>
                  )}
                  {isActive && sidebarOpen && !isMini && !isMobile && (
                    <div className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full"></div>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );

  return (
    <div
      className={`
        flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans overflow-hidden transition-all duration-500 
        ${accentClass} ${radiusClass} ${densityClass} ${fontClass} ${animClass} ${shadowClass}
        ${layout.customCursor ? 'cursor-none [&_*]:cursor-none' : ''}
      `}
      data-theme={theme}
      data-dark-variant={layout.darkModeVariant}
    >
      {layout.bgTexture === 'noise' && <div className="bg-noise" />}
      {layout.bgTexture === 'mesh' && <div className="bg-mesh" />}

      {layout.customCursor && (
        <div
          className="fixed w-8 h-8 rounded-full border-2 border-[var(--accent-primary)] pointer-events-none z-[9999] transition-transform duration-75 mix-blend-difference"
          id="custom-cursor"
          style={{ transform: 'translate(-50%, -50%)', left: '-100px', top: '-100px' }}
        />
      )}

      {/* Sidebar / Mini / Corporate Aside */}
      {(layout.mode === 'sidebar' || layout.mode === 'mini' || layout.mode === 'corporate') && (
        <>
          {/* Backdrop for mobile */}
          {isMobile && sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 backdrop-blur-md"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <aside
            className={`
              ${layout.mode === 'mini' && !isMobile ? 'w-20' : (sidebarOpen ? (isMobile ? 'translate-x-0 w-64' : 'w-64') : (isMobile ? '-translate-x-full w-64' : 'w-20'))} 
              ${isMobile ? 'fixed' : 'relative'}
              h-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-r border-slate-200/40 transition-all duration-300 flex flex-col z-50 shadow-xl lg:shadow-none
            `}
          >
            <SidebarContent isMini={layout.mode === 'mini' && !isMobile} />
            {!isMobile && layout.mode !== 'mini' && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="w-full flex items-center justify-center p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-[#0ea5e9] transition-all border border-slate-200/50 shadow-sm"
                >
                  <Menu size={20} />
                </button>
              </div>
            )}
          </aside>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Modern Header (Common for both modes but adaptive) */}
        <header className={`
          ${layout.mode === 'corporate' ? 'h-24 px-10' : 'h-20 px-4 md:px-8'}
          bg-[var(--bg-card)]/80 backdrop-blur-md border-b border-[var(--border-color)]/60 flex items-center justify-between z-30 transition-all sticky top-0
        `}>
          {/* Left: Search & Mobile Toggle */}
          <div className="flex items-center gap-6 flex-1 max-w-2xl">
            {(layout.mode !== 'topbar') ? (
              isMobile && (
                <div className="flex items-center gap-3">
                  <button onClick={() => setSidebarOpen(true)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    <Menu size={24} strokeWidth={2} />
                  </button>
                  <button
                    onClick={handleSwitchCompany}
                    className="flex lg:hidden items-center gap-2 p-1.5 pr-3 bg-[var(--bg-secondary)]/50 border border-[var(--border-color)]/50 rounded-full active:scale-95 transition-all"
                  >
                    <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center">
                      <ArrowLeftRight size={12} />
                    </div>
                    <span className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-tight">Trocar</span>
                  </button>
                </div>
              )
            ) : (
              /* Topnav Logo */
              <div className="flex items-center space-x-3 mr-4 cursor-pointer" onClick={() => navigate('/app')}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[var(--accent-primary)]/20">E</div>
                <span className="hidden md:block text-xl font-black tracking-tighter text-[var(--text-primary)]">
                  Escopo<span className="text-[var(--accent-primary)]">V3</span>
                </span>
              </div>
            )}

            {/* Modern Search Bar */}
            <div className={`
              hidden sm:flex items-center group transition-all duration-300
              ${layout.mode === 'corporate' ? 'w-full max-w-xl' : 'w-full max-w-md'}
              bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-secondary)] focus-within:bg-[var(--bg-card)]
              focus-within:ring-2 focus-within:ring-[var(--accent-primary)]/20 focus-within:shadow-lg
              border border-transparent focus-within:border-[var(--accent-primary)]/30
              rounded-2xl px-4 py-2.5
            `}>
              <Search className="w-5 h-5 text-[var(--text-secondary)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
              <input
                type="text"
                placeholder={layout.mode === 'corporate' ? "Pesquisar faturas, empresas..." : "Pesquisar..."}
                className="bg-transparent border-none focus:outline-none text-sm ml-3 text-[var(--text-primary)] w-full placeholder-[var(--text-secondary)]/70 font-medium"
              />
              <div className="hidden group-focus-within:flex items-center gap-1">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">⌘</span>
                <span className="text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">K</span>
              </div>
            </div>
          </div>

          {/* Top Navigation Links (if applicable) */}
          {layout.mode === 'topbar' && !isMobile && (
            <nav className="hidden xl:flex items-center gap-1 mx-4">
              {navItems.slice(0, 7).map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/app' && location.pathname.startsWith(item.path));
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`
                      px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200
                      ${isActive
                        ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                      }
                    `}
                  >
                    {item.label}
                  </NavLink>
                );
              })}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2.5 ml-1 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--accent-primary)] transition-all"
                title="Mais Módulos"
              >
                <Layers size={20} strokeWidth={1.5} />
              </button>
            </nav>
          )}

          {/* Right: Actions & User */}
          <div className="flex items-center gap-4 md:gap-6">
            {/* Company Selector - Redesigned */}
            <div className="hidden lg:flex items-center">
              <div className="flex items-center gap-3 p-1.5 pr-3 bg-slate-100 dark:bg-slate-800 border border-slate-200/65 rounded-full hover:border-cyan-300 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-[#0ea5e9]">
                  <Building2 size={16} />
                </div>
                <div className="flex flex-col leading-none mr-2">
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Empresa</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{selectedCompany?.nomeFantasia || 'Selecione'}</span>
                </div>
                <button
                  onClick={handleSwitchCompany}
                  title="Trocar Empresa"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:bg-gradient-to-r hover:from-[#0ea5e9] hover:to-[#10b981] hover:text-white transition-all ml-1"
                >
                  <ArrowLeftRight size={14} />
                </button>
              </div>
            </div>

            {/* Action Buttons Group */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-cyan-600 transition-colors group"
              >
                {theme === 'light' ? <Moon size={20} strokeWidth={1.5} /> : <Sun size={20} strokeWidth={1.5} />}
              </button>


              <div className="text-slate-500 hover:text-cyan-600 transition-colors">
                <NotificationCenter />
              </div>

              <button
                onClick={handleLogout}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-500 hover:text-rose-500 transition-colors"
                title="Sair"
                id="logout-button"
              >
                <Lock size={20} strokeWidth={1.5} />
              </button>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden md:block"></div>

            {/* API / Sync Status Indicator */}
            <div className="hidden sm:flex items-center">
                <SyncIndicator />
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden md:block"></div>

            {/* User Profile */}
            <div
              onClick={() => navigate('/app/admin')}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="hidden md:flex flex-col items-end leading-none">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-cyan-600 transition-colors">
                  {currentUser && currentUser !== 'Visitante' ? currentUser : (localStorage.getItem('currentUser') || 'Usuário')}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  {userRole}
                </span>
              </div>
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-gradient-to-r from-[#0ea5e9] to-[#10b981] p-0.5 shadow-lg shadow-emerald-500/10 group-hover:shadow-emerald-500/20 transition-all duration-300">
                  <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                    {userPhotoURL ? (
                      <img src={userPhotoURL} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-black text-sm text-cyan-600">
                        {(() => {
                          const activeName = (currentUser && currentUser !== 'Visitante') ? currentUser : (localStorage.getItem('currentUser') || '');
                          if (!activeName || activeName === 'Visitante') return 'AD';
                          const parts = activeName.trim().split(/\s+/);
                          if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                          return activeName.substring(0, 2).toUpperCase();
                        })()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
              </div>
            </div>
          </div>
        </header>

        {/* content padding should be responsive and account for bottom nav on mobile */}
        <main className={`
          flex-1 overflow-y-auto custom-scrollbar bg-[var(--bg-primary)] transition-all duration-300
          ${layout.mode === 'corporate' ? 'p-10' : 'p-4 md:p-8'}
          ${isMobile ? 'pb-24' : ''}
        `}>
          <div className={`
             mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700
             ${layout.contentWidth === 'boxed' ? 'max-w-7xl' : (layout.mode === 'corporate' ? 'max-w-[1720px]' : 'max-w-[1600px]')}
          `}>
            {children}
          </div>
        </main>

        {/* Bottom Nav for Mobile */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 h-16 bg-[var(--bg-card)] border-t border-[var(--border-color)] z-[55] shadow-[0_-4px_10px_rgba(0,0,0,0.05)] backdrop-blur-lg overflow-x-auto overflow-y-hidden no-scrollbar">
            <div className="flex items-center h-full px-2 min-w-max space-x-1">
              {[
                { label: 'Início', path: '/app', icon: LayoutDashboard },
                ...navItems.filter(item => item.path !== '/app').map(item => ({
                  ...item,
                  label: item.label.replace('Dp. ', '').replace('DP. ', '') // Simplify labels for mobile
                })),
                { label: 'Menu', path: 'sidebar', icon: Menu, isToggle: true },
              ].map((item) => {


                const isActive = item.path !== 'sidebar' && (location.pathname === item.path || (item.path !== '/app' && location.pathname.startsWith(item.path)));

                if (item.isToggle) {
                  return (
                    <button
                      key="mobile-sidebar-toggle"
                      onClick={() => setSidebarOpen(true)}
                      className="flex flex-col items-center justify-center gap-1 min-w-[60px]"
                    >
                      <item.icon size={20} className="text-[var(--text-secondary)]" />
                      <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">{item.label}</span>
                    </button>
                  );
                }

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `
                    flex flex-col items-center justify-center gap-1 min-w-[60px] transition-all
                    ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}
                  `}
                  >
                    <item.icon size={22} className={isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'} />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
                    {isActive && (
                      <div className="absolute -top-0.5 w-8 h-1 bg-[var(--accent-primary)] rounded-full shadow-[0_2px_5px_var(--accent-primary)]" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Navigation Drawer for Top/Mini Modes when more is needed */}
      {(layout.mode === 'topbar' || layout.mode === 'mini') && sidebarOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-all" onClick={() => setSidebarOpen(false)} />
          <aside className="w-80 h-full bg-[var(--bg-card)] shadow-2xl relative z-20 flex flex-col border-l border-[var(--border-color)] animate-in slide-in-from-right duration-500">
            <div className="p-8 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-secondary)]/10">
              <div className="flex flex-col">
                <h3 className="font-black uppercase tracking-[0.2em] text-xs text-[var(--text-secondary)] mb-1">Menu Central</h3>
                <p className="text-[10px] font-bold text-[var(--accent-primary)] uppercase">Todos os Módulos</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-2.5 hover:bg-[var(--bg-secondary)] rounded-2xl transition-all hover:rotate-90">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <SidebarContent />
            </div>
            <div className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/30">
              <div className="p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-primary)]">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-tight">{currentUser}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] font-bold">{userRole}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};