import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import { startFileWatcher } from './services/fileWatcher'
import { startScheduler } from './services/scheduler'
import { registerEmailService } from './services/emailService'
import { setupAutoUpdater } from './services/updater'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─ dist
// │ ├─ index.html
// │ ├─ assets
// │ └─ ...
// ├─┬─ dist-electron
// │ ├─ main.js
// │ └─ preload.js
//
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let DB_PATH: string
let win: BrowserWindow | null

function initializeDatabase() {
    DB_PATH = path.join(app.getPath('userData'), 'database.json')

    // IPC Handlers for database management
    ipcMain.handle('read-database', async () => {
        try {
            const data = await fs.readFile(DB_PATH, 'utf-8')
            return JSON.parse(data)
        } catch (error) {
            return null
        }
    })

    ipcMain.handle('save-database', async (_, data) => {
        try {
            await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8')
            return true
        } catch (error) {
            console.error('Erro ao salvar no disco:', error)
            return false
        }
    })
}

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(process.env.VITE_PUBLIC || '', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    })

    // Configurar zoom fixo - REMOVED to allow proper DPI scaling behavior
    // win.webContents.setZoomFactor(1.0)
    // win.webContents.setVisualZoomLevelLimits(1, 1)

    // Desabilitar atalhos de zoom (Ctrl+, Ctrl-, Ctrl+0)
    win.webContents.on('before-input-event', (event, input) => {
        if (input.control || input.meta) {
            if (input.key.toLowerCase() === 'equal' ||
                input.key.toLowerCase() === 'minus' ||
                input.key === '0') {
                event.preventDefault()
            }
        }
    })

    // START AUTOMATION SERVICES
    startFileWatcher(win)
    startScheduler(win)
    setupAutoUpdater(win)

    // Test active push message to Renderer-process.
    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', (new Date).toLocaleString())
    })

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
    } else {
        // win.loadFile('dist/index.html')
        win.loadFile(path.join(RENDERER_DIST, 'index.html'))
    }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
        win = null
    }
})

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

app.whenReady().then(() => {
    initializeDatabase()
    registerEmailService() // Initialize Email IPC handlers
    createWindow()
})

