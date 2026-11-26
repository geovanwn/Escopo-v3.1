# Modelo 2: Progressive Web App (PWA) com Service Worker
# Aplicativo web instalável sem Electron

name: EscopoV3 PWA
version: 1.0.0
description: Sistema Web Progressivo de Gestão Fiscal

## Características
- Instalável via navegador (Chrome, Edge, Safari)
- Funciona offline com Service Worker
- Atualizações automáticas instantâneas
- Sem necessidade de instalador
- Tamanho reduzido (~5-10 MB)
- Multiplataforma (Windows, macOS, Linux, Android, iOS)
- Notificações push
- Sincronização em background

## Configuração vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'EscopoV3 - Sistema de Gestão Fiscal',
        short_name: 'EscopoV3',
        description: 'Plataforma completa para gestão fiscal, contábil e tributária',
        theme_color: '#4F46E5',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        screenshots: [
          {
            src: 'screenshots/desktop-1.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide'
          },
          {
            src: 'screenshots/mobile-1.png',
            sizes: '750x1334',
            type: 'image/png',
            form_factor: 'narrow'
          }
        ],
        categories: ['business', 'finance', 'productivity'],
        shortcuts: [
          {
            name: 'NFS-e Fetcher',
            short_name: 'NFS-e',
            description: 'Consultar NFS-e',
            url: '/app/xmls?tab=nfse',
            icons: [{ src: 'icons/shortcut-nfse.png', sizes: '96x96' }]
          },
          {
            name: 'Fiscal',
            short_name: 'Fiscal',
            description: 'Módulo Fiscal',
            url: '/app/fiscal',
            icons: [{ src: 'icons/shortcut-fiscal.png', sizes: '96x96' }]
          },
          {
            name: 'Auditoria',
            short_name: 'Auditoria',
            description: 'Auditoria de Arquivos',
            url: '/app/audit',
            icons: [{ src: 'icons/shortcut-audit.png', sizes: '96x96' }]
          }
        ],
        share_target: {
          action: '/app/xmls/import',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
            files: [
              {
                name: 'xml',
                accept: ['text/xml', 'application/xml', '.xml']
              }
            ]
          }
        }
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/api\.escopov3\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'ui': ['lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});

## Service Worker Customizado (sw.js)

// Importar Workbox
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// Configuração
workbox.setConfig({
  debug: false
});

// Precache de assets estáticos
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

// Estratégia para páginas HTML
workbox.routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  new workbox.strategies.NetworkFirst({
    cacheName: 'pages-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 // 24 hours
      })
    ]
  })
);

// Estratégia para XMLs (importante para o sistema)
workbox.routing.registerRoute(
  ({ url }) => url.pathname.endsWith('.xml'),
  new workbox.strategies.NetworkFirst({
    cacheName: 'xml-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 // 1 hour
      })
    ]
  })
);

// Sincronização em background para uploads
workbox.routing.registerRoute(
  /\/api\/upload/,
  new workbox.strategies.NetworkOnly({
    plugins: [
      new workbox.backgroundSync.BackgroundSyncPlugin('upload-queue', {
        maxRetentionTime: 24 * 60 // Retry for up to 24 hours
      })
    ]
  }),
  'POST'
);

// Notificações push
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url
    },
    actions: [
      {
        action: 'open',
        title: 'Abrir'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Ação de clique em notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

## Scripts package.json

{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "build:pwa": "npm run build && workbox generateSW workbox-config.js",
    "serve:pwa": "npm run build:pwa && npx serve dist -s -p 3000",
    "deploy:firebase": "npm run build:pwa && firebase deploy --only hosting",
    "deploy:netlify": "npm run build:pwa && netlify deploy --prod --dir=dist",
    "deploy:vercel": "npm run build:pwa && vercel --prod"
  },
  "dependencies": {
    "vite-plugin-pwa": "^0.17.4",
    "workbox-window": "^7.0.0"
  },
  "devDependencies": {
    "workbox-cli": "^7.0.0"
  }
}

## Estrutura de Arquivos

EscopoV3-PWA/
├── public/
│   ├── icons/
│   │   ├── icon-72x72.png
│   │   ├── icon-96x96.png
│   │   ├── icon-128x128.png
│   │   ├── icon-144x144.png
│   │   ├── icon-152x152.png
│   │   ├── icon-192x192.png
│   │   ├── icon-384x384.png
│   │   └── icon-512x512.png
│   ├── screenshots/
│   │   ├── desktop-1.png
│   │   └── mobile-1.png
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   ├── manifest.json
│   └── robots.txt
├── src/
│   ├── registerServiceWorker.ts
│   └── ...
├── vite.config.ts
└── workbox-config.js

## Registro do Service Worker (registerServiceWorker.ts)

import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Nova versão disponível! Deseja atualizar?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App pronto para funcionar offline');
  },
  onRegistered(registration) {
    console.log('Service Worker registrado:', registration);
  },
  onRegisterError(error) {
    console.error('Erro ao registrar Service Worker:', error);
  }
});

## Comandos de Build e Deploy

# Build PWA local
npm run build:pwa

# Testar PWA localmente
npm run serve:pwa

# Deploy Firebase Hosting
npm run deploy:firebase

# Deploy Netlify
npm run deploy:netlify

# Deploy Vercel
npm run deploy:vercel

## Instalação pelo Usuário

### Desktop (Chrome/Edge)
1. Acessar https://app.escopov3.com
2. Clicar no ícone de instalação na barra de endereço
3. Confirmar instalação
4. App aparece como aplicativo nativo

### Mobile (Android/iOS)
1. Acessar https://app.escopov3.com
2. Menu → "Adicionar à tela inicial"
3. App aparece como aplicativo nativo

## Vantagens

✅ Sem instalador necessário
✅ Atualizações instantâneas e automáticas
✅ Tamanho muito reduzido (~5-10 MB)
✅ Funciona em qualquer plataforma
✅ Funciona offline
✅ Notificações push
✅ Sincronização em background
✅ Fácil distribuição (apenas URL)
✅ Sem processo de aprovação em lojas
✅ SEO otimizado
✅ Custo de hospedagem baixo
✅ Mobile-friendly nativo

## Desvantagens

❌ Acesso limitado ao sistema de arquivos
❌ Não suporta certificados A3 (tokens USB) nativamente
❌ Requer conexão inicial para instalação
❌ Limitações de API do navegador
❌ Menos integração com sistema operacional
❌ Dependente de navegador moderno

## Casos de Uso Ideais

- Empresas que preferem acesso via web
- Ambientes com boa conectividade
- Necessidade de acesso multiplataforma
- Atualizações frequentes
- Equipes distribuídas geograficamente
- Uso em dispositivos móveis
- Menor custo de manutenção
- Certificados A1 (arquivo) apenas

## Limitações Específicas para EscopoV3

### Certificados Digitais
- ✅ A1 (arquivo .pfx): Funciona via upload
- ❌ A3 (token USB): Não suporta nativamente
  - Solução: Usar extensão de navegador ou proxy local

### Arquivos XML
- ✅ Upload: Funciona perfeitamente
- ✅ Download: Funciona perfeitamente
- ✅ Cache offline: Funciona com Service Worker
- ⚠️ Acesso direto a pastas: Limitado (File System Access API)

### Impressão
- ✅ Impressão de relatórios: Funciona via window.print()
- ✅ PDF: Funciona via bibliotecas JS
- ⚠️ Impressoras fiscais: Requer integração especial

## Hospedagem Recomendada

1. **Firebase Hosting** (Recomendado)
   - CDN global
   - SSL automático
   - Deploy simples
   - Custo: Gratuito até 10GB/mês

2. **Netlify**
   - Deploy automático via Git
   - Preview de branches
   - Custo: Gratuito até 100GB/mês

3. **Vercel**
   - Otimizado para React
   - Edge functions
   - Custo: Gratuito até 100GB/mês

4. **AWS S3 + CloudFront**
   - Máxima escalabilidade
   - Controle total
   - Custo: Pay-as-you-go
