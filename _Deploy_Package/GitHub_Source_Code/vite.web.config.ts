import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [
        react(),
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
