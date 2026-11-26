# Modelo 3: Híbrido - Electron Portátil + Web App
# Melhor dos dois mundos: Desktop nativo quando necessário, Web quando possível

name: EscopoV3 Híbrido
version: 1.0.0
description: Sistema Híbrido com Electron Portátil e PWA

## Características
- **Modo Desktop**: Electron portátil (sem instalação)
- **Modo Web**: PWA instalável via navegador
- Mesma base de código
- Sincronização automática entre modos
- Escolha do usuário conforme necessidade
- Transição suave entre modos

## Arquitetura

```
EscopoV3 Híbrido
├── Frontend (React + Vite)
│   ├── Componentes compartilhados
│   ├── PWA Service Worker
│   └── Detecção de ambiente
├── Backend API (Node.js/Firebase)
│   ├── REST API
│   ├── WebSocket para sync
│   └── Autenticação unificada
├── Electron Wrapper (Opcional)
│   ├── main.ts (processo principal)
│   ├── preload.ts (bridge)
│   └── APIs nativas
└── Sincronização
    ├── IndexedDB (Web)
    ├── SQLite (Electron)
    └── Sync Engine
```

## Configuração package.json

{
  "name": "escopov3-hybrid",
  "version": "1.0.0",
  "description": "Sistema Híbrido de Gestão Fiscal",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "dev:electron": "concurrently \"vite\" \"electron .\"",
    "build": "tsc && vite build",
    "build:web": "npm run build && vite-plugin-pwa",
    "build:electron": "npm run build && electron-builder --dir",
    "build:electron-portable": "npm run build && electron-builder --win portable --x64",
    "build:all": "npm run build:web && npm run build:electron-portable",
    "preview": "vite preview",
    "serve:web": "npm run build:web && serve dist -s",
    "serve:electron": "npm run build:electron && electron dist-electron"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "firebase": "^10.7.1",
    "dexie": "^3.2.4",
    "better-sqlite3": "^9.2.2",
    "lucide-react": "^0.300.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8",
    "vite-plugin-pwa": "^0.17.4",
    "electron": "^28.1.0",
    "electron-builder": "^24.9.1",
    "concurrently": "^8.2.2",
    "typescript": "^5.3.3"
  }
}

## Detecção de Ambiente (src/utils/environment.ts)

export const isElectron = () => {
  return !!(window && window.process && window.process.type);
};

export const isPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

export const isBrowser = () => {
  return !isElectron() && !isPWA();
};

export const getEnvironment = () => {
  if (isElectron()) return 'electron';
  if (isPWA()) return 'pwa';
  return 'browser';
};

export const hasNativeFileAccess = () => {
  return isElectron() || 'showOpenFilePicker' in window;
};

export const hasCertificateSupport = () => {
  // A3 tokens só funcionam no Electron
  return isElectron();
};

## Adaptador de Storage (src/utils/storage.ts)

import Dexie from 'dexie';
import { isElectron } from './environment';

// IndexedDB para Web/PWA
class WebStorage extends Dexie {
  companies: Dexie.Table<any, string>;
  invoices: Dexie.Table<any, string>;
  audit: Dexie.Table<any, string>;

  constructor() {
    super('EscopoV3DB');
    this.version(1).stores({
      companies: 'id, cnpj, razaoSocial',
      invoices: 'id, companyId, number, date',
      audit: 'id, companyId, timestamp, operation'
    });
    this.companies = this.table('companies');
    this.invoices = this.table('invoices');
    this.audit = this.table('audit');
  }
}

// SQLite para Electron
class ElectronStorage {
  private db: any;

  constructor() {
    if (isElectron()) {
      const Database = require('better-sqlite3');
      this.db = new Database('escopov3.db');
      this.initTables();
    }
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        cnpj TEXT,
        razaoSocial TEXT,
        data TEXT
      );
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        companyId TEXT,
        number TEXT,
        date TEXT,
        data TEXT
      );
      CREATE TABLE IF NOT EXISTS audit (
        id TEXT PRIMARY KEY,
        companyId TEXT,
        timestamp TEXT,
        operation TEXT,
        data TEXT
      );
    `);
  }

  async getAll(table: string) {
    return this.db.prepare(`SELECT * FROM ${table}`).all();
  }

  async get(table: string, id: string) {
    return this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  }

  async put(table: string, data: any) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ${table} (id, data)
      VALUES (?, ?)
    `);
    stmt.run(data.id, JSON.stringify(data));
  }

  async delete(table: string, id: string) {
    this.db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  }
}

// Adaptador unificado
export const storage = isElectron() 
  ? new ElectronStorage() 
  : new WebStorage();

## Adaptador de Certificados (src/utils/certificates.ts)

import { isElectron } from './environment';

export const selectCertificate = async (): Promise<string | null> => {
  if (isElectron()) {
    // Usar API nativa do Electron
    return await window.electronAPI.selectCertificateFile();
  } else {
    // Usar File System Access API (Web)
    try {
      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'Certificados Digitais',
            accept: { 'application/x-pkcs12': ['.pfx', '.p12'] }
          }
        ]
      });
      const file = await fileHandle.getFile();
      const buffer = await file.arrayBuffer();
      return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    } catch (err) {
      console.error('Erro ao selecionar certificado:', err);
      return null;
    }
  }
};

export const validateCertificate = async (
  certData: string,
  password: string
): Promise<any> => {
  if (isElectron()) {
    // Validação nativa via node-forge
    return await window.electronAPI.validateCertificate(certData, password);
  } else {
    // Validação via API backend
    const response = await fetch('/api/certificates/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ certData, password })
    });
    return await response.json();
  }
};

## Sincronização (src/services/sync.ts)

import { storage } from '../utils/storage';
import { isElectron } from '../utils/environment';

export class SyncService {
  private syncInterval: number = 60000; // 1 minuto
  private ws: WebSocket | null = null;

  async init() {
    // Sincronização inicial
    await this.fullSync();

    // Sincronização periódica
    setInterval(() => this.incrementalSync(), this.syncInterval);

    // WebSocket para sync em tempo real
    if (!isElectron()) {
      this.initWebSocket();
    }
  }

  private async fullSync() {
    try {
      // Buscar dados do servidor
      const response = await fetch('/api/sync/full', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();

      // Salvar localmente
      for (const company of data.companies) {
        await storage.put('companies', company);
      }
      for (const invoice of data.invoices) {
        await storage.put('invoices', invoice);
      }

      console.log('Sincronização completa realizada');
    } catch (error) {
      console.error('Erro na sincronização:', error);
    }
  }

  private async incrementalSync() {
    try {
      const lastSync = localStorage.getItem('lastSync') || '0';
      
      const response = await fetch(`/api/sync/incremental?since=${lastSync}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const changes = await response.json();

      // Aplicar mudanças localmente
      for (const change of changes) {
        if (change.type === 'delete') {
          await storage.delete(change.table, change.id);
        } else {
          await storage.put(change.table, change.data);
        }
      }

      localStorage.setItem('lastSync', Date.now().toString());
    } catch (error) {
      console.error('Erro na sincronização incremental:', error);
    }
  }

  private initWebSocket() {
    this.ws = new WebSocket('wss://api.escopov3.com/sync');
    
    this.ws.onmessage = async (event) => {
      const change = JSON.parse(event.data);
      
      if (change.type === 'delete') {
        await storage.delete(change.table, change.id);
      } else {
        await storage.put(change.table, change.data);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      // Reconectar após 5 segundos
      setTimeout(() => this.initWebSocket(), 5000);
    };
  }
}

export const syncService = new SyncService();

## Configuração Electron Builder (electron-builder.json)

{
  "appId": "com.escopov3.hybrid",
  "productName": "EscopoV3",
  "directories": {
    "output": "dist-electron-build"
  },
  "files": [
    "dist-electron/**/*",
    "dist/**/*"
  ],
  "win": {
    "target": [
      {
        "target": "portable",
        "arch": ["x64"]
      }
    ],
    "icon": "build/icon.ico",
    "artifactName": "${productName}-Portable-${version}.${ext}"
  },
  "portable": {
    "artifactName": "${productName}-Portable.exe",
    "unicode": false,
    "useZip": false
  },
  "compression": "maximum",
  "asar": true
}

## Configuração PWA (vite.config.ts)

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'EscopoV3 Híbrido',
        short_name: 'EscopoV3',
        description: 'Sistema Híbrido de Gestão Fiscal',
        theme_color: '#4F46E5',
        display: 'standalone',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.escopov3\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10
            }
          }
        ]
      }
    })
  ]
});

## Estrutura de Distribuição

dist/
├── web/                          # PWA para hospedagem
│   ├── index.html
│   ├── assets/
│   ├── icons/
│   ├── manifest.json
│   └── sw.js
└── desktop/
    └── EscopoV3-Portable.exe     # Electron portátil (Windows)

## Comandos de Build

# Build apenas Web/PWA
npm run build:web

# Build apenas Electron Portátil
npm run build:electron-portable

# Build completo (Web + Electron)
npm run build:all

## Fluxo de Uso

### Cenário 1: Usuário com Certificado A1 (arquivo)
1. Acessa https://app.escopov3.com
2. Instala PWA via navegador
3. Usa normalmente via web
4. Funciona offline com Service Worker

### Cenário 2: Usuário com Certificado A3 (token USB)
1. Baixa EscopoV3-Portable.exe
2. Executa sem instalação
3. Token USB é detectado automaticamente
4. Usa funcionalidades nativas do Electron

### Cenário 3: Usuário híbrido
1. Usa PWA no dia a dia
2. Quando precisa de A3, baixa e executa portátil
3. Dados sincronizam automaticamente
4. Transição transparente

## Vantagens

✅ Flexibilidade máxima
✅ Melhor dos dois mundos
✅ Sem instalação obrigatória
✅ Suporte a A1 e A3
✅ Sincronização automática
✅ Funciona offline (ambos modos)
✅ Atualizações fáceis
✅ Menor barreira de entrada (PWA)
✅ Funcionalidades avançadas quando necessário (Electron)
✅ Mesma base de código
✅ Custo otimizado

## Desvantagens

❌ Complexidade de desenvolvimento maior
❌ Dois ambientes para testar
❌ Sincronização pode ter conflitos
❌ Manutenção de duas versões
❌ Documentação mais extensa

## Casos de Uso Ideais

- Empresas com necessidades mistas (A1 + A3)
- Equipes distribuídas com diferentes requisitos
- Transição gradual de desktop para web
- Máxima flexibilidade para usuários
- Ambientes heterogêneos
- Necessidade de funcionar offline em ambos modos

## Comparação de Recursos

| Recurso | PWA | Electron Portátil |
|---------|-----|-------------------|
| Certificado A1 | ✅ | ✅ |
| Certificado A3 | ❌ | ✅ |
| Offline | ✅ | ✅ |
| Auto-atualização | ✅ | ⚠️ Manual |
| Tamanho | ~5 MB | ~150 MB |
| Instalação | Não requer | Não requer |
| Mobile | ✅ | ❌ |
| Acesso a arquivos | Limitado | Completo |
| Notificações | ✅ | ✅ |
| Performance | Boa | Excelente |

## Estratégia de Distribuição

1. **Site Principal**: https://escopov3.com
   - Apresenta ambas opções
   - Detecta automaticamente necessidades do usuário
   - Recomenda versão adequada

2. **PWA**: https://app.escopov3.com
   - Acesso direto via navegador
   - Instalação opcional
   - Maioria dos usuários

3. **Download Portátil**: https://escopov3.com/download
   - Link direto para .exe
   - Sem instalador
   - Para usuários com A3

## Recomendação de Uso

**Para 80% dos usuários**: PWA
- Mais rápido
- Mais leve
- Sempre atualizado
- Multiplataforma

**Para 20% dos usuários**: Electron Portátil
- Certificado A3
- Integrações avançadas
- Máximo controle

**Transição suave**: Usuários podem alternar conforme necessidade
