import { autoUpdater } from "electron-updater"
import { BrowserWindow, ipcMain } from "electron"

export const setupAutoUpdater = (win: BrowserWindow) => {
    // Configurar log para debug
    // autoUpdater.logger = require("electron-log");
    // autoUpdater.logger.transports.file.level = "info";

    // Disable auto download if we want manual control, but enabling it makes it easier for users
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Verificar ao iniciar (Silent check)
    try {
        // Only check if feed URL is configured (generic provider needs explicit config usually)
        // But package.json has a placeholder, so it might error if not changed. 
        // We'll wrap in try/catch.
        autoUpdater.checkForUpdates().catch(err => console.log('Silent check failed (expected if no URL):', err.message));
    } catch (e) {
        console.error('Erro ao verificar updates', e);
    }

    // --- IPC Handlers for Manual Control ---

    // 1. Manually Check for Update
    ipcMain.handle('check-for-update', async () => {
        try {
            const result = await autoUpdater.checkForUpdates();
            return {
                success: true,
                updateAvailable: !!result && result.updateInfo.version !== autoUpdater.currentVersion.version,
                version: result?.updateInfo.version,
                currentVersion: autoUpdater.currentVersion.version
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // 2. Start Download
    ipcMain.handle('download-update', async () => {
        try {
            await autoUpdater.downloadUpdate();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // 3. Quit and Install
    ipcMain.handle('quit-and-install', () => {
        autoUpdater.quitAndInstall();
    });

    // 4. Set Custom Update URL (Advanced)
    ipcMain.handle('set-update-url', (_, url: string) => {
        try {
            autoUpdater.setFeedURL({
                provider: 'generic',
                url: url
            });
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // --- Event Listeners ---

    autoUpdater.on('checking-for-update', () => {
        win.webContents.send('updater-status', { status: 'checking' });
        win.webContents.send('updater-message', 'Verificando atualizações...');
    })

    autoUpdater.on('update-available', (info) => {
        win.webContents.send('updater-status', { status: 'available', version: info.version });
        win.webContents.send('updater-message', `Nova versão ${info.version} encontrada.`);
    })

    autoUpdater.on('update-not-available', (info) => {
        win.webContents.send('updater-status', { status: 'not-available' });
        win.webContents.send('updater-message', 'Seu sistema está atualizado.');
    })

    autoUpdater.on('error', (err) => {
        win.webContents.send('updater-status', { status: 'error', error: err.message });
        win.webContents.send('updater-message', 'Erro na atualização: ' + err.message);
        console.error(err);
    })

    autoUpdater.on('download-progress', (progressObj) => {
        win.webContents.send('updater-status', {
            status: 'downloading',
            progress: progressObj.percent,
            bytesPerSecond: progressObj.bytesPerSecond,
            total: progressObj.total,
            transferred: progressObj.transferred
        });
        win.webContents.send('updater-message', `Baixando atualização: ${progressObj.percent.toFixed(0)}%`);
    })

    autoUpdater.on('update-downloaded', (info) => {
        win.webContents.send('updater-status', { status: 'downloaded', version: info.version });
        win.webContents.send('updater-message', 'Atualização pronta. Reinicie para instalar.');

        // Optional: Notify user via OS notification
    })
}
