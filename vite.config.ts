import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: false, // Prevents auto-injection of SW since index.tsx does it
            manifest: false // We probably don't need the manifest in the electron build
        }),
        electron({
            main: {
                // Main-Process entry file of the Electron App.
                entry: 'electron/main.ts',
                vite: {
                    build: {
                        sourcemap: false,
                        minify: process.env./* @__PURE__*/ NODE_ENV === 'production',
                        rollupOptions: {
                            external: [
                                'electron',
                                'electron-updater',
                                'better-sqlite3',
                                'node-forge',
                                'chokidar',
                                'node-cron',
                                'nodemailer',
                                'express',
                                'cors',
                                'axios',
                                'firebase',
                                'date-fns',
                                'fs',
                                'path',
                                'os',
                                'child_process'
                            ],
                            output: {
                                format: 'cjs',
                                entryFileNames: '[name].cjs'
                            }
                        }
                    }
                }
            },
            preload: {
                input: 'electron/preload.ts',
                vite: {
                    build: {
                        sourcemap: false,
                        rollupOptions: {
                            output: {
                                format: 'cjs',
                                entryFileNames: '[name].cjs'
                            }
                        }
                    }
                }
            },
        }),
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
            '@stores': path.resolve(__dirname, './stores')
        }
    }
})
