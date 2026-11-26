const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== [1/4] Compilando frontend e Electron com Vite ===');
execSync('npx vite build', { stdio: 'inherit' });

console.log('=== [2/4] Empacotando binários (electron-builder --win --dir) ===');
execSync('npx electron-builder --win --dir', { stdio: 'inherit' });

const winUnpacked = path.join(__dirname, '..', 'release', 'win-unpacked');
const electronExe = path.join(winUnpacked, 'electron.exe');
const escopoExe = path.join(winUnpacked, 'EscopoV3.exe');

// Se electron.exe ainda existir e EscopoV3.exe não existir
if (fs.existsSync(electronExe) && !fs.existsSync(escopoExe)) {
    fs.copyFileSync(electronExe, escopoExe);
    try { fs.unlinkSync(electronExe); } catch (e) {}
}

console.log('=== [3/4] Binário preparado pelo electron-builder com integridade ASAR intacta ===');

console.log('=== [4/4] Gerando instalador final Setup_EscopoV3.exe com NSIS ===');
const makensisPath = path.join(
    process.env.LOCALAPPDATA || '',
    'electron-builder',
    'Cache',
    'nsis',
    'nsis-3.0.4.1',
    'makensis.exe'
);

const nsisCmd = fs.existsSync(makensisPath) ? `"${makensisPath}"` : 'makensis';
execSync(`${nsisCmd} installer.nsi`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });

const setupExe = path.join(__dirname, '..', 'Setup_EscopoV3.exe');
if (fs.existsSync(setupExe)) {
    const stats = fs.statSync(setupExe);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n========================================`);
    console.log(`SUCESSO! Instalador gerado com êxito:`);
    console.log(`Arquivo: ${setupExe}`);
    console.log(`Tamanho: ${sizeMb} MB`);
    console.log(`========================================\n`);
} else {
    console.error('ERRO: Setup_EscopoV3.exe não foi encontrado.');
    process.exit(1);
}
