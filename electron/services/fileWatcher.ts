import chokidar from 'chokidar';
import { BrowserWindow, app } from 'electron';
import path from 'path';
import fs from 'fs';

export const startFileWatcher = (win: BrowserWindow) => {
    const docPath = app.getPath('documents');
    const watchPath = path.join(docPath, 'EscopoV3_Automacao', 'Entrada');
    const processedPath = path.join(docPath, 'EscopoV3_Automacao', 'Processados');
    const errorPath = path.join(docPath, 'EscopoV3_Automacao', 'Erros');

    // Criar pastas se não existirem
    [watchPath, processedPath, errorPath].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    const watcher = chokidar.watch(watchPath, {
        ignored: /(^|[\/\\])\../, // ignora arquivos ocultos
        persistent: true,
        awaitWriteFinish: {
            stabilityThreshold: 2000,
            pollInterval: 100
        },
    });

    watcher.on('add', async (filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        const fileName = path.basename(filePath);

        console.log(`[Watcher] Novo arquivo detectado: ${fileName}`);

        if (ext === '.xml' || ext === '.ofx') {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');

                // Enviar para o renderer processar (Frontend contém a lógica de negócio)
                win.webContents.send('auto-import-file', {
                    fileName,
                    type: ext.replace('.', ''), // 'xml' ou 'ofx'
                    content
                });

                console.log(`[Watcher] Enviado para frontend: ${fileName}`);

                // Mover para pasta de processados
                // Adiciona timestamp para evitar colisão de nomes
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const destPath = path.join(processedPath, `${timestamp}_${fileName}`);

                fs.renameSync(filePath, destPath);
                console.log(`[Watcher] Arquivo movido para: ${destPath}`);

            } catch (err) {
                console.error(`[Watcher] Erro ao ler/mover arquivo ${fileName}:`, err);
                // Mover para erro
                try {
                    const destPath = path.join(errorPath, fileName);
                    fs.renameSync(filePath, destPath);
                } catch (e) {
                    console.error('Falha ao mover para erro', e);
                }
            }
        }
    });

    console.log(`[Watcher] Serviço iniciado em: ${watchPath}`);
    return watcher;
};
