import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LayoutConfig {
    mode: 'sidebar' | 'topbar' | 'mini' | 'corporate';
    accentColor: 'emerald' | 'ocean' | 'berry' | 'space' | 'gold' | 'sunset' | 'forest' | 'midnight' | 'royal' | 'rose' | 'teal' | 'indigo' | 'amber' | 'slate' | 'crimson' | 'mint' | 'nordic' | 'cyber' | 'mocha';
    borderRadius: 'none' | 'medium' | 'large' | 'full';
    density: 'compact' | 'comfortable';
    glassmorphism: boolean;
    fontFamily: 'inter' | 'roboto' | 'poppins' | 'montserrat';
    shadowStyle: 'none' | 'soft' | 'industrial';
    animations: 'none' | 'slow' | 'normal' | 'fast';
    darkModeVariant: 'midnight' | 'oled';
    contentWidth: 'boxed' | 'fluid';
    buttonStyle: 'flat' | 'soft' | 'glass';
    sidebarStyle: 'fixed' | 'floating' | 'translucent';
    accentIntensity: number; // 0-100
    customCursor: boolean;
    bgTexture: 'none' | 'noise' | 'mesh' | 'dots';
}

interface UIState {
    theme: 'light' | 'dark';
    layout: LayoutConfig;
    sidebarOpen: boolean;
    isMobile: boolean;
    setTheme: (theme: 'light' | 'dark') => void;
    toggleTheme: () => void;
    updateLayout: (config: Partial<LayoutConfig>) => void;
    setSidebarOpen: (open: boolean) => void;
    setIsMobile: (isMobile: boolean) => void;
}

const DEFAULT_LAYOUT: LayoutConfig = {
    mode: 'sidebar',
    accentColor: 'emerald',
    borderRadius: 'medium',
    density: 'comfortable',
    glassmorphism: false,
    fontFamily: 'inter',
    shadowStyle: 'soft',
    animations: 'normal',
    darkModeVariant: 'midnight',
    contentWidth: 'fluid',
    buttonStyle: 'soft',
    sidebarStyle: 'fixed',
    accentIntensity: 100,
    customCursor: false,
    bgTexture: 'none'
};

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            theme: 'light',
            layout: DEFAULT_LAYOUT,
            sidebarOpen: true,
            isMobile: false,
            toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
            setTheme: (theme) => set({ theme }),
            setSidebarOpen: (open) => set({ sidebarOpen: open }),
            setIsMobile: (mobile) => set({ isMobile: mobile }),
            updateLayout: (config) => set((state) => ({ layout: { ...state.layout, ...config } })),
        }),
        {
            name: 'ui-storage-v4',
        }
    )
);
