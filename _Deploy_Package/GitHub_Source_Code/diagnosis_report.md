# Relatório de Diagnóstico e Mapeamento Técnico
**Data:** 25/01/2026
**Responsável:** Antigravity (IA Technical Lead)

## 1. Visão Geral da Arquitetura
O sistema **EscopoV3** é uma aplicação Desktop desenvolvida com **Electron**, utilizando **React** (Vite) para o frontend e **Firebase** (Firestore/Auth) como Backend-as-a-Service (BaaS). Existe um componente auxiliar (`proxy-server.js`) para integrações governamentais.

### Componentes Principais:
1.  **Frontend/UI**: React 19 + TailwindCSS. Gerenciamento de estado global via `DataContext` (Context API).
2.  **Persistência**: Firebase Firestore. Estrutura multi-tenant lógica (`companyId` e `userId` em cada documento).
3.  **Desktop Wrapper**: Electron. Responsável pelo empacotamento e acesso a recursos nativos.
4.  **Integração Governamental**: `proxy-server.js` (Express). Atua como middleware para assinar XMLs (PFX) e comunicar com SOAP do eSocial/NFe.

---

## 2. Auditoria de Código e Riscos Identificados

### 🚨 Riscos Críticos (Segurança e Estabilidade)
1.  **Proxy Server Inseguro (MITM)**:
    *   **Arquivo**: `server/proxy-server.js` (linhas 38, 80).
    *   **Problema**: O uso de `rejectUnauthorized: false` ao criar agentes HTTPS desabilita a verificação de certificados SSL/TLS. Isso permite ataques Man-in-the-Middle, expondo credenciais e chaves PFX.
    *   **Recomendação**: Remover a flag e configurar corretamente a cadeia de certificados (ICPBrasil) se necessário.

2.  **Escalabilidade do Datastore (Memory Hog)**:
    *   **Arquivo**: `contexts/DataContext.tsx`.
    *   **Problema**: O sistema carrega **todas** as coleções (`invoices`, `products`, `transactions`) para a memória do cliente via `onSnapshot` sem paginação (linhas 276-286). À medida que o volume de dados cresce, a aplicação ficará lenta e travará o navegador/Electron.
    *   **Recomendação**: Migrar para queries paginadas ou "lazy loading" para listagens. Manter em tempo real apenas o estritamente necessário (ex: Dashboard).

3.  **Manipulação de Certificados PFX**:
    *   **Arquivo**: `server/proxy-server.js`.
    *   **Problema**: A senha do certificado trafega em texto plano na requisição para o proxy local.
    *   **Recomendação**: Usar armazenamento seguro do SO (Keytar) para senhas ou manter o certificado apenas em memória volátil de forma mais segura.

### ⚠️ Pontos de Atenção (Manutenibilidade e Qualidade)
1.  **God Object (`DataContext`)**:
    *   O `DataContext.tsx` possui mais de 1000 linhas e mistura responsabilidades: acesso a banco, regras de negócio (`generateDRE`, cálculo fiscal) e estado de UI.
    *   **Impacto**: Dificuldade de testes unitários e manutenção.

2.  **Tipagem Fraca (TypeScript)**:
    *   Uso excessivo de `any` (ex: `any` em `proxy-server.js`, `DataContext` linha 701) derrota o propósito do TypeScript.

3.  **Motor Fiscal (`fiscalCalculations.ts`)**:
    *   A lógica parece robusta (tabelas e segregação corretas), mas depende de validação correta na entrada (ex: classificação correta de produtos monofásicos).

---

## 3. Mapeamento de Fluxos Críticos

1.  **Emissão/Cálculo Fiscal**:
    *   Fluxo: `Invoice Input` -> `FiscalValidator` -> `FiscalCalculations` -> `Tax Report` -> `Sped Export`.
    *   Risco: Classificação incorreta de item (NCM) pode gerar imposto errado.

2.  **Conciliação Financeira**:
    *   Fluxo: `OFX Import` -> `BankTransaction` -> `Reconciliation Algorithm` -> `Invoice Settle`.
    *   Gargalo: Lógica de "matching" deve ser performática.

3.  **Envio ao Governo (eSocial/NFe)**:
    *   Fluxo: `XML Gen` -> `Proxy (Sign)` -> `Proxy (Send)` -> `Gov SOAP`.
    *   Ponto Único de Falha: O `proxy-server` deve estar rodando. Se o Electron não gerenciar esse processo filho corretamente, a funcionalidade quebra.

---

## 4. Plano de Ação (Próximas Etapas)

Conforme solicitado, seguiremos para a **Etapa 2 - Segurança da Informação**, focando imediatamente em:
1.  Corrigir a vulnerabilidade SSL no Proxy.
2.  Revisar permissões RBAC no Firestore.
3.  Implementarlogs de auditoria robustos.

Este relatório valida o término da *Etapa 1*.
