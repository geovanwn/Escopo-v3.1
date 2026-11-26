# Modelo 1: Executável Electron Completo (Recomendado)
# Build para Windows, macOS e Linux com instalador

name: EscopoV3
version: 1.0.0
description: Sistema Integrado de Gestão Fiscal e Contábil

## Características
- Aplicativo desktop nativo
- Instalador MSI/NSIS para Windows
- DMG para macOS
- AppImage/DEB para Linux
- Auto-atualização integrada
- Acesso completo ao sistema de arquivos
- Suporte a certificados digitais A1/A3
- Banco de dados local SQLite

## Configuração electron-builder.json

{
  "appId": "com.escopov3.app",
  "productName": "EscopoV3",
  "copyright": "Copyright © 2026 EscopoV3",
  "directories": {
    "output": "dist",
    "buildResources": "build"
  },
  "files": [
    "dist-electron/**/*",
    "dist/**/*",
    "package.json"
  ],
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64", "ia32"]
      },
      {
        "target": "msi",
        "arch": ["x64"]
      },
      {
        "target": "portable",
        "arch": ["x64"]
      }
    ],
    "icon": "build/icon.ico",
    "artifactName": "${productName}-${version}-${arch}-Setup.${ext}",
    "publisherName": "EscopoV3 Sistemas",
    "verifyUpdateCodeSignature": false,
    "requestedExecutionLevel": "requireAdministrator"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "EscopoV3",
    "installerIcon": "build/icon.ico",
    "uninstallerIcon": "build/icon.ico",
    "installerHeaderIcon": "build/icon.ico",
    "license": "LICENSE.txt",
    "language": "1046",
    "warningsAsErrors": false,
    "perMachine": true,
    "allowElevation": true,
    "runAfterFinish": true,
    "menuCategory": true,
    "include": "build/installer.nsh"
  },
  "msi": {
    "oneClick": false,
    "perMachine": true,
    "runAfterFinish": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "menuCategory": "EscopoV3",
    "shortcutName": "EscopoV3"
  },
  "portable": {
    "artifactName": "${productName}-${version}-Portable.${ext}"
  },
  "mac": {
    "target": ["dmg", "zip"],
    "icon": "build/icon.icns",
    "category": "public.app-category.business",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist"
  },
  "dmg": {
    "contents": [
      {
        "x": 130,
        "y": 220
      },
      {
        "x": 410,
        "y": 220,
        "type": "link",
        "path": "/Applications"
      }
    ],
    "window": {
      "width": 540,
      "height": 380
    }
  },
  "linux": {
    "target": ["AppImage", "deb", "rpm"],
    "icon": "build/icons",
    "category": "Office",
    "maintainer": "EscopoV3 <contato@escopov3.com>",
    "vendor": "EscopoV3 Sistemas",
    "synopsis": "Sistema Integrado de Gestão Fiscal e Contábil",
    "description": "Plataforma completa para gestão fiscal, contábil e tributária com suporte a NFS-e, NF-e, CT-e e certificados digitais."
  },
  "publish": {
    "provider": "github",
    "owner": "escopov3",
    "repo": "escopov3-app",
    "releaseType": "release"
  },
  "compression": "maximum",
  "asar": true,
  "asarUnpack": [
    "**/*.node",
    "**/node_modules/sqlite3/**/*"
  ]
}

## Scripts package.json

{
  "scripts": {
    "build:win": "npm run build && electron-builder --win --x64",
    "build:win32": "npm run build && electron-builder --win --ia32",
    "build:win-all": "npm run build && electron-builder --win --x64 --ia32",
    "build:mac": "npm run build && electron-builder --mac",
    "build:linux": "npm run build && electron-builder --linux",
    "build:all": "npm run build && electron-builder -mwl",
    "build:portable": "npm run build && electron-builder --win portable",
    "dist": "npm run build && electron-builder --publish never",
    "release": "npm run build && electron-builder --publish always"
  }
}

## Estrutura de Arquivos

EscopoV3/
├── build/
│   ├── icon.ico              # Ícone Windows (256x256)
│   ├── icon.icns             # Ícone macOS
│   ├── icons/                # Ícones Linux (vários tamanhos)
│   │   ├── 16x16.png
│   │   ├── 32x32.png
│   │   ├── 48x48.png
│   │   ├── 64x64.png
│   │   ├── 128x128.png
│   │   ├── 256x256.png
│   │   └── 512x512.png
│   ├── installer.nsh         # Script customizado NSIS
│   └── entitlements.mac.plist
├── dist/                     # Build do frontend (Vite)
├── dist-electron/            # Build do Electron
├── electron/
│   ├── main.ts
│   └── preload.ts
└── package.json

## Comandos de Build

# Build para Windows (64-bit)
npm run build:win

# Build para Windows (32-bit)
npm run build:win32

# Build para Windows (ambos)
npm run build:win-all

# Build versão portátil (sem instalação)
npm run build:portable

# Build para todas as plataformas
npm run build:all

## Saída Esperada

dist/
├── EscopoV3-1.0.0-x64-Setup.exe       # Instalador NSIS 64-bit
├── EscopoV3-1.0.0-ia32-Setup.exe      # Instalador NSIS 32-bit
├── EscopoV3-1.0.0-x64.msi             # Instalador MSI 64-bit
├── EscopoV3-1.0.0-Portable.exe        # Versão portátil
├── EscopoV3-1.0.0.dmg                 # macOS
├── EscopoV3-1.0.0.AppImage            # Linux AppImage
├── escopov3_1.0.0_amd64.deb           # Debian/Ubuntu
└── escopov3-1.0.0.x86_64.rpm          # RedHat/Fedora

## Vantagens

✅ Instalador profissional com wizard
✅ Integração com menu iniciar e desktop
✅ Desinstalador automático
✅ Auto-atualização via GitHub Releases
✅ Suporte a certificados digitais
✅ Acesso completo ao sistema de arquivos
✅ Performance nativa
✅ Funciona offline
✅ Banco de dados local SQLite
✅ Multi-plataforma

## Desvantagens

❌ Tamanho maior (~150-200 MB)
❌ Requer instalação
❌ Processo de build mais complexo
❌ Requer assinatura de código (opcional mas recomendado)

## Casos de Uso Ideais

- Empresas que precisam de instalação local
- Ambientes sem internet confiável
- Necessidade de acesso a certificados A3 (tokens USB)
- Integração com hardware local
- Máxima segurança e privacidade
- Uso intensivo de recursos do sistema
