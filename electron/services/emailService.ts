import { ipcMain } from 'electron';
import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

const initTransporter = (config: any) => {
    transporter = nodemailer.createTransport({
        host: config.host,
        port: parseInt(config.port) || 587,
        secure: config.secure || false,
        auth: {
            user: config.user,
            pass: config.pass,
        },
    });
};

export const registerEmailService = () => {
    // Handler para configurar SMTP (Vindo da tela de configurações)
    ipcMain.handle('configure-email', async (_, config) => {
        try {
            initTransporter(config);
            // Validar conexão
            await transporter?.verify();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Handler para envio
    ipcMain.handle('send-email', async (_, { to, subject, html, attachments }) => {
        console.log(`[EmailService] Tentativa de envio para ${to}`);

        if (!transporter) {
            console.log('[EmailService] Transporter não configurado. Modo Simulação.');
            return { success: true, simulated: true };
        }

        try {
            const info = await transporter.sendMail({
                from: '"EscopoV3 Automático" <sistema@escopov3.com>',
                to,
                subject,
                html,
                attachments
            });
            console.log('[EmailService] Enviado:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error: any) {
            console.error('[EmailService] Erro:', error);
            return { success: false, error: error.message };
        }
    });
};
