import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
            manifest: {
                name: 'EscopoV3 - Sistema Contábil',
                short_name: 'EscopoV3',
                description: 'Sistema Contábil e Financeiro Avançado',
                theme_color: '#10b981',
                background_color: '#f8fafc',
                display: 'standalone',
                orientation: 'portrait',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            }
        })
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@contexts': path.resolve(__dirname, './contexts'),
            '@components': path.resolve(__dirname, './components'),
            '@pages': path.resolve(__dirname, './pages'),
            '@utils': path.resolve(__dirname, './utils'),
            '@types': path.resolve(__dirname, './types'),
            '@hooks': path.resolve(__dirname, './hooks'),
            '@stores': path.resolve(__dirname, './stores'),
        }
    }
})

