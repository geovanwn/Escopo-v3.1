import { autoUpdater } from "electron-updater"
import { BrowserWindow, ipcMain } from "electron"

export const setupAutoUpdater = (win: BrowserWindow) => {
    // Configurar log para debug
    // autoUpdater.logger = require("electron-log");
    // autoUpdater.logger.transports.file.level = "info";

    // Verificar ao iniciar
    try {
        autoUpdater.checkForUpdatesAndNotify();
    } catch (e) {
        console.error('Erro ao verificar updates', e);
    }

    autoUpdater.on('checking-for-update', () => {
        win.webContents.send('updater-message', 'Verificando atualizações...');
    })

    autoUpdater.on('update-available', (info) => {
        win.webContents.send('updater-message', 'Nova versão encontrada. Baixando...');
    })

    autoUpdater.on('update-not-available', (info) => {
        // Silencioso se não tiver, ou log
        console.log('Nenhuma atualização disponível.');
    })

    autoUpdater.on('error', (err) => {
        win.webContents.send('updater-message', 'Erro na atualização automática.');
        console.error(err);
    })

    autoUpdater.on('download-progress', (progressObj) => {
        win.webContents.send('updater-message', `Baixando atualização: ${progressObj.percent.toFixed(0)}%`);
    })

    autoUpdater.on('update-downloaded', (info) => {
        win.webContents.send('updater-message', 'Atualização pronta. Reiniciando para instalar...');
        setTimeout(() => {
            autoUpdater.quitAndInstall();
        }, 5000);
    })
}
