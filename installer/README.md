# EscopoV3 - Guia Rápido de Build SFX

## 🚀 Início Rápido

### Pré-requisitos
1. Instalar NSIS: https://nsis.sourceforge.io/Download
2. Instalar Node.js: https://nodejs.org/

### Build em 3 Passos

```bash
# 1. Instalar dependências (primeira vez)
npm install

# 2. Executar build do SFX
npm run build:sfx

# 3. Arquivo gerado em:
releases/EscopoV3-SFX-1.0.0.exe
```

## 📋 Métodos de Build

### Método 1: NPM Script (Recomendado)
```bash
npm run build:sfx
```

### Método 2: PowerShell
```powershell
.\installer\build-sfx.ps1 -Version "1.0.0"
```

### Método 3: Batch (Windows)
```cmd
installer\build-sfx.bat
```

### Método 4: Manual
```bash
npm run build
npm run build:electron
"C:\Program Files (x86)\NSIS\makensis.exe" installer\escopov3-sfx.nsi
```

## 🔐 Build com Assinatura Digital

```powershell
.\installer\build-sfx.ps1 `
  -Version "1.0.0" `
  -Sign `
  -CertificatePath "C:\cert\mycert.pfx" `
  -CertificatePassword "senha123"
```

## 📦 Saída Esperada

```
releases/
├── EscopoV3-SFX-1.0.0.exe    (~180 MB)
├── checksums.txt
└── build-info.txt
```

## ✅ Checklist Pré-Build

- [ ] NSIS instalado
- [ ] Node.js instalado
- [ ] Dependências instaladas (`npm install`)
- [ ] Arquivo `build/icon.ico` existe
- [ ] Arquivo `LICENSE.txt` existe
- [ ] Versão atualizada em `package.json`

## 🐛 Problemas Comuns

### "NSIS não encontrado"
```bash
# Verificar instalação
dir "C:\Program Files (x86)\NSIS\makensis.exe"
```

### "Erro ao compilar frontend"
```bash
# Limpar e reinstalar
rm -rf node_modules dist
npm install
npm run build
```

### "Arquivo muito grande"
- Verificar se `node_modules` não está em `dist/`
- Usar compressão LZMA (já configurado)

## 📞 Suporte

Documentação completa: `docs/SFX_INSTALLER.md`

---

**Tempo estimado de build**: 5-10 minutos  
**Tamanho final**: ~150-200 MB  
**Compressão**: LZMA (máxima)
