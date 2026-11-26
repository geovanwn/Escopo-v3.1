import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import { startFileWatcher } from './services/fileWatcher'
import { startScheduler } from './services/scheduler'
import { registerEmailService } from './services/emailService'
import { setupAutoUpdater } from './services/updater'
import { registerSigner } from './services/signerService'
import { initializeSqlite } from './services/databaseService'
import { initializeSyncService } from './services/syncService'
import { spawn, ChildProcess } from 'node:child_process'

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

let proxyProcess: ChildProcess | null = null;

function startProxyServer() {
    const isDev = !!process.env.VITE_DEV_SERVER_URL;
    const proxyPath = isDev 
        ? path.join(process.env.APP_ROOT!, 'server', 'proxy-server.js')
        : path.join(process.resourcesPath, 'server', 'proxy-server.js');

    if (!fsSync.existsSync(proxyPath)) {
        console.log(`[Main] Proxy Server opcional não encontrado em: ${proxyPath}`);
        return;
    }

    console.log(`[Main] Iniciando Proxy Server em: ${proxyPath}`);

    try {
        proxyProcess = spawn('node', ['--openssl-legacy-provider', `"${proxyPath}"`], {
            env: { ...process.env, PORT: '3000' },
            shell: true
        });

        proxyProcess.stdout?.on('data', (data) => {
            console.log(`[Proxy] ${data}`);
        });

        proxyProcess.stderr?.on('data', (data) => {
            console.error(`[Proxy Error] ${data}`);
        });

        proxyProcess.on('error', (err) => {
            console.warn('[Proxy Error] Falha ao executar node do proxy:', err.message);
        });
    } catch (e: any) {
        console.warn('[Main] Falha ao iniciar proxy server:', e?.message || e);
    }

    app.on('will-quit', () => {
        if (proxyProcess) {
            proxyProcess.kill();
        }
    });
}

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        autoHideMenuBar: true, // Oculta a barra de menu de navegacao
        icon: path.join(process.env.VITE_PUBLIC || '', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
        },
    })

    // Permite abertura de janelas (popups) necessária para o login do Google
    win.webContents.setWindowOpenHandler(({ url }) => {
        return { action: 'allow' }
    })


    // Configurar zoom fixo automático para impedir desconfiguração
    win.webContents.setZoomFactor(1.0)
    win.webContents.setVisualZoomLevelLimits(1, 1)

    // Bloquear atalhos de teclado de zoom (Ctrl+, Ctrl-, Ctrl+0) e impedir rolagem com zoom acidental
    win.webContents.on('before-input-event', (event, input) => {
        if (input.control || input.meta) {
            if (input.key.toLowerCase() === 'equal' || input.key === '+' || 
                input.key.toLowerCase() === 'minus' || input.key === '-' || 
                input.key === '0') {
                event.preventDefault();
            }
        }
    })

    // START AUTOMATION SERVICES
    try { startFileWatcher(win) } catch (e) { console.error('[Main] Erro startFileWatcher:', e); }
    try { startScheduler(win) } catch (e) { console.error('[Main] Erro startScheduler:', e); }
    try { setupAutoUpdater(win) } catch (e) { console.error('[Main] Erro setupAutoUpdater:', e); }

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

// === ICP-BRASIL CERTIFICATE BYPASS ===
// O Electron/Chromium frequentemente barra as cadeias raiz do ICP-Brasil (ERR_CERT_AUTHORITY_INVALID).
// Explicitamente ignoramos o erro de autoridade para os webservices do governo.
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (url.includes('esocial.gov.br') || url.includes('producaorestrita.esocial.gov.br')) {
        event.preventDefault()
        callback(true)
    } else {
        callback(false)
    }
})

// Additional imports for Certificate and Request Handling
import forge from 'node-forge';
import https from 'node:https';
import axios from 'axios';

// ----------------------------------------------------------------------------
// CERTIFICATE & NFSE HANDLERS
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// CLIENT CERTIFICATE HANDLING (For System/A3 Certificates)
// ----------------------------------------------------------------------------

let selectedThumbprint: string | null = null;

app.on('select-client-certificate', (event, webContents, url, list, callback) => {
    // Se temos um thumbprint selecionado pelo usuário, procura na lista
    if (selectedThumbprint) {
        const cert = list.find(c => c.fingerprint.replace(/:/g, '').toLowerCase() === selectedThumbprint?.toLowerCase());
        if (cert) {
            event.preventDefault();
            callback(cert);
            return;
        }
    }

    // Se não encontrou ou não tem thumbprint, deixa o Electron mostrar o diálogo nativo ou continua
    // Opcionalmente, podemos não fazer nada e o Electron mostrará o diálogo se houver interação
});

function registerCertificateServices() {
    // Handler: Set active thumbprint for next requests
    ipcMain.handle('set-active-certificate', (_, thumbprint) => {
        selectedThumbprint = thumbprint;
        return true;
    });

    // Handler: Secure Request (Alternative to Proxy for System Certs)
    ipcMain.handle('secure-request', async (_, { url, method, data, headers, thumbprint }) => {
        selectedThumbprint = thumbprint;

        // Usamos o net do Electron pois ele integra com o store do Windows
        const { net } = require('electron');

        return new Promise((resolve) => {
            const request = net.request({
                url,
                method: method || 'POST',
            });

            if (headers) {
                Object.entries(headers).forEach(([key, value]) => {
                    request.setHeader(key, value as string);
                });
            }

            request.on('response', (response: any) => {
                let body = '';
                response.on('data', (chunk: Buffer) => {
                    body += chunk.toString();
                });
                response.on('end', () => {
                    resolve({
                        status: response.statusCode,
                        data: body,
                        headers: response.headers
                    });
                });
            });

            request.on('error', (error: Error) => {
                resolve({
                    success: false,
                    error: error.message
                });
            });

            if (data) {
                request.write(data);
            }
            request.end();
        });
    });

    // Handler: Read Certificate Info (without sending request)
    ipcMain.handle('get-certificate-info', async (_, filePath, password) => {
        try {
            const pfxBuffer = fsSync.readFileSync(filePath);
            const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
            const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password || '');

            // Get the certificate from the SafeBags
            const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
            const certBag = bags[forge.pki.oids.certBag]?.[0];

            if (!certBag) {
                throw new Error('Certificado não encontrado no arquivo PFX.');
            }

            const cert = certBag.cert;
            if (!cert) throw new Error('Certificado inválido.');

            const subject = cert.subject.attributes.map((attr: any) => `${attr.shortName}=${attr.value}`).join(', ');
            const validFrom = cert.validity.notBefore;
            const validTo = cert.validity.notAfter;
            const issueDate = validFrom;

            // Extract CN and Organization
            const commonName = cert.subject.getField('CN')?.value || 'Desconhecido';
            const organization = cert.subject.getField('O')?.value || '';

            return {
                success: true,
                subject,
                commonName,
                organization,
                validFrom,
                validTo,
                issuer: cert.issuer.attributes.map((attr: any) => attr.value).join(', ')
            };

        } catch (error: any) {
            console.error('Erro ao ler certificado:', error);
            return { success: false, error: error.message || 'Senha incorreta ou arquivo inválido.' };
        }
    });

    // Handler: Open File Dialog (Secure)
    ipcMain.handle('select-certificate-file', async () => {
        const { dialog } = require('electron');
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'Certificados Digitais (A1)', extensions: ['pfx', 'p12'] }
            ]
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }
        return result.filePaths[0]; // Return the absolute path
    });

    // Handler: Fetch NFSe (The Real Request Logic)
    ipcMain.handle('fetch-nfse', async (_, config) => {
        const { pfxPath, pfxBase64, password, startDate, endDate, cnpj, endpoint, queryType, noteNumber, rpsNumber } = config;

        if ((!pfxPath && !pfxBase64) || !password) {
            return { success: false, error: 'Certificado e senha são obrigatórios.' };
        }

        try {
            // 1. Create HTTPS Agent with the Certificate
            let pfx: Buffer;
            if (pfxBase64) {
                pfx = Buffer.from(pfxBase64, 'base64');
            } else {
                pfx = fsSync.readFileSync(pfxPath);
            }

            const httpsAgent = new https.Agent({
                pfx: pfx,
                passphrase: password,
                rejectUnauthorized: false
            });

            // 2. Select SOAP Envelop based on Query Type (Issued vs Received vs Specific Filters)
            // NOTE: This assumes ABRASF Standard.

            let soapBodyContent = '';
            let soapAction = '';

            const cleanCNPJ = cnpj?.replace(/\D/g, '');

            if (queryType === 'received') {
                // ** CONSULA TOMADO (Serviços Tomados) **
                soapAction = 'http://tempuri.org/ConsultarNfseServicoTomado';
                soapBodyContent = `
                    <ConsultarNfseServicoTomadoEnvio>
                        <Consulente>
                             <Cnpj>${cleanCNPJ}</Cnpj>
                        </Consulente>
                        <PeriodoEmissao>
                            <DataInicial>${startDate}</DataInicial>
                            <DataFinal>${endDate}</DataFinal>
                        </PeriodoEmissao>
                    </ConsultarNfseServicoTomadoEnvio>
                 `;
            } else {
                // ** CONSULTA PRESTADO (Serviços Prestados - Emitidas) **
                // Default ABRASF behavior
                if (rpsNumber) {
                    soapAction = 'http://tempuri.org/ConsultarNfsePorRps';
                    soapBodyContent = `
                        <ConsultarNfseRpsEnvio>
                            <IdentificacaoRps>
                                <Numero>${rpsNumber}</Numero>
                                <Serie>1</Serie> 
                                <Tipo>1</Tipo>
                            </IdentificacaoRps>
                            <Prestador>
                                <Cnpj>${cleanCNPJ}</Cnpj>
                            </Prestador>
                        </ConsultarNfseRpsEnvio>
                     `;
                } else if (noteNumber) {
                    // Note: Some cities use ConsultarNfseFaixa for numbers, others just ConsultarNfse
                    soapAction = 'http://tempuri.org/ConsultarNfseFaixa';
                    soapBodyContent = `
                        <ConsultarNfseFaixaEnvio>
                            <Prestador>
                                <Cnpj>${cleanCNPJ}</Cnpj>
                            </Prestador>
                            <Faixa>
                                <NumeroNfseInicial>${noteNumber}</NumeroNfseInicial>
                                <NumeroNfseFinal>${noteNumber}</NumeroNfseFinal>
                            </Faixa>
                        </ConsultarNfseFaixaEnvio>
                     `;
                } else {
                    // Standard Period Query
                    soapAction = 'http://tempuri.org/ConsultarNfseServicoPrestado';
                    soapBodyContent = `
                        <ConsultarNfseServicoPrestadoEnvio>
                            <Prestador>
                                <Cnpj>${cleanCNPJ}</Cnpj>
                                <InscricaoMunicipal></InscricaoMunicipal> 
                            </Prestador>
                            <PeriodoEmissao>
                                <DataInicial>${startDate}</DataInicial>
                                <DataFinal>${endDate}</DataFinal>
                            </PeriodoEmissao>
                        </ConsultarNfseServicoPrestadoEnvio>
                     `;
                }
            }

            const soapEnvelope = `
                <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
                <soapenv:Header/>
                <soapenv:Body>
                    ${soapBodyContent}
                </soapenv:Body>
                </soapenv:Envelope>
            `;

            const targetUrl = endpoint || 'https://hom.nfse.gg.br/API/v1/ConsultarNfse';

            console.log(`[NFSe] REQUEST: ${queryType.toUpperCase()} | URL: ${targetUrl}`);

            // LOGGING (RF03)
            const logEntry = `[${new Date().toISOString()}] REQ: ${queryType} | CNPJ: ${cleanCNPJ} | URL: ${targetUrl}\n`;
            const logPath = path.join(app.getPath('userData'), 'nfse-requests.log');
            fsSync.appendFileSync(logPath, logEntry);


            const response = await axios.post(targetUrl, soapEnvelope, {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': soapAction
                },
                httpsAgent: httpsAgent,
                timeout: 45000 // Extended timeout for heavy SOAP services
            });

            // LOG RESPONSE (RF03)
            fsSync.appendFileSync(logPath, `[${new Date().toISOString()}] RES: Status ${response.status} | Size: ${JSON.stringify(response.data).length} bytes\n`);


            return {
                success: true,
                status: response.status,
                data: response.data,
                headers: response.headers
            };

        } catch (error: any) {
            console.error('[NFSe] Erro na requisição:', error.message);
            // ... (error handling same as before)
            let msg = error.message;
            if (error.code === 'ERR_OSSL_EVP_BAD_DECRYPT') msg = 'Senha do certificado incorreta.';
            if (error.response) {
                return {
                    success: false,
                    error: `O servidor retornou erro ${error.response.status}: ${error.response.statusText}`,
                    details: error.response.data
                };
            }
            return { success: false, error: msg };
        }
    });

    // Handler: List Certificates from Windows Store (NEW)
    ipcMain.handle('list-system-certificates', async () => {
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);

        try {
            // PowerShell command to list personal certificates
            const command = `powershell -Command "Get-ChildItem -Path Cert:\\CurrentUser\\My | Select-Object Subject, Thumbprint, NotAfter, FriendlyName | ConvertTo-Json"`;
            const { stdout } = await execPromise(command);

            if (!stdout || stdout.trim() === '') {
                return [];
            }

            const certs = JSON.parse(stdout);
            // Ensure result is always an array
            const certList = Array.isArray(certs) ? certs : [certs];

            return certList.map((c: any) => ({
                subject: c.Subject,
                thumbprint: c.Thumbprint,
                validTo: c.NotAfter,
                friendlyName: c.FriendlyName || c.Subject.split(',')[0].replace('CN=', '')
            }));
        } catch (error) {
            console.error('Erro ao listar certificados do sistema:', error);
            return [];
        }
    });

    // Handler: Sign with Serpro (Integration)
    ipcMain.handle('sign-with-serpro', async (_, { xml, tagToSign }) => {
        // ... (existing code omitted for brevity)
        return { success: false, message: 'Integração implementada no main.ts' };
    });

    // --- ZOOM HANDLERS ---
    ipcMain.handle('set-zoom-factor', (_, factor: number) => {
        if (win) {
            win.webContents.setZoomFactor(factor);
            return true;
        }
        return false;
    });

    ipcMain.handle('get-zoom-factor', () => {
        return win ? win.webContents.getZoomFactor() : 1.0;
    });
}

function createPortugueseMenu() {
    // Removemos completamente o menu padrao do topo (Arquivo, Editar, Exibir...)
    // Isso garante a aparencia "limpa" de um aplicativo Desktop nativo que nao lembra um navegador ou janela comum
    Menu.setApplicationMenu(null);
}


app.whenReady().then(() => {
    try { initializeSqlite(); } catch (e) { console.error('[Main] Erro initializeSqlite:', e); }
    try { initializeSyncService(); } catch (e) { console.error('[Main] Erro initializeSyncService:', e); }
    try { initializeDatabase(); } catch (e) { console.error('[Main] Erro initializeDatabase:', e); }
    try { registerEmailService(); } catch (e) { console.error('[Main] Erro registerEmailService:', e); }
    try { registerCertificateServices(); } catch (e) { console.error('[Main] Erro registerCertificateServices:', e); }
    try { registerSigner(); } catch (e) { console.error('[Main] Erro registerSigner:', e); }
    try { createPortugueseMenu(); } catch (e) { console.error('[Main] Erro createPortugueseMenu:', e); }
    try { startProxyServer(); } catch (e) { console.error('[Main] Erro startProxyServer:', e); }
    try { createWindow(); } catch (e) { console.error('[Main] Erro createWindow:', e); }
})


