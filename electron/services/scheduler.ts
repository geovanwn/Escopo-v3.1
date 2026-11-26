import cron from 'node-cron';
import { BrowserWindow } from 'electron';
import { performAutoBackupSqlite } from './databaseService';

export const startScheduler = (win: BrowserWindow) => {
    // 08:00 AM - Verificar Prazos e Obrigações Fiscais
    cron.schedule('0 8 * * *', () => {
        console.log('[Scheduler] Trigger: Verificação de Prazos (08:00)');
        win.webContents.send('run-automation', { task: 'check-deadlines' });
    });

    // 23:59 PM - Fechamento Diário Fiscal/Financeiro
    cron.schedule('59 23 * * *', () => {
        console.log('[Scheduler] Trigger: Fechamento Diário (23:59)');
        win.webContents.send('run-automation', { task: 'daily-closing' });
    });

    // Backup Automático a cada 4 horas
    cron.schedule('0 */4 * * *', () => {
        console.log('[Scheduler] Trigger: Backup de Segurança');
        performAutoBackupSqlite();
        win.webContents.send('run-automation', { task: 'backup' }); // Frontend irá salvar o JSON
    });

    console.log('[Scheduler] Cron Jobs inicializados e ativos.');
};
