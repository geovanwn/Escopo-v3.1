# 🔍 GUIA DE DIAGNÓSTICO - Sistema não busca dados

## Por que o sistema não está buscando dados?

Existem 4 causas principais:

### 1️⃣ Usuário não está autenticado
**Sintoma**: Tela de login aparece o tempo todo
**Solução**: Fazer login com credenciais válidas do Firebase Auth

### 2️⃣ Regras do Firestore não foram publicadas
**Sintoma**: Erros de "permission-denied" no console
**Solução**: 
1. Acesse https://console.firebase.google.com/project/escopo-v3-8e4c3/firestore/rules
2. Cole as regras do arquivo `firestore.rules`
3. Clique em "Publicar"

### 3️⃣ Dados não têm o campo `userId`
**Sintoma**: Dados existem mas não aparecem
**Causa**: Dados criados antes da implementação do filtro por userId
**Solução**: Adicionar o campo `userId` manualmente aos documentos existentes

### 4️⃣ Base de dados está vazia
**Sintoma**: Nenhum dado em nenhuma tela
**Solução**: Criar dados manualmente ou usar a criação automática

---

## 🧪 TESTE AGORA - Passo a Passo

### PASSO 1: Abra o Console do Navegador
1. Abra o sistema: http://localhost:5173
2. Pressione **F12** (abre as ferramentas do desenvolvedor)
3. Clique na aba **"Console"**

### PASSO 2: Execute o Script de Diagnóstico

Cole este comando no console e pressione ENTER:

```javascript
// Verificar autenticação
const user = window.firebase?.auth?.currentUser || null;
console.log('Usuário:', user ? user.email : 'NÃO AUTENTICADO');
```

### PASSO 3: Verifique os Logs

Você deve ver no console mensagens como:

```
🔄 Configurando sincronização de dados para usuário: [uid]
✅ Usuário autenticado: email@example.com
📊 companies: X documento(s) carregado(s)
📊 clients: X documento(s) carregado(s)
```

Se ver **0 documento(s)**, há um problema!

---

## 🔧 CORREÇÕES MAIS COMUNS

### Correção 1: Publicar Regras do Firestore

**É A MAIS COMUM!** Se você não fez isso ainda:

1. Acesse: https://console.firebase.google.com/project/escopo-v3-8e4c3/firestore/rules
2. Cole este código:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{collection}/{document} {
      allow create: if request.auth != null;
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /audit_logs/{logId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

3. Clique em **"Publicar"**
4. Recarregue o sistema (F5)

### Correção 2: Adicionar userId aos Dados Existentes

Se você tem dados na base mas eles não aparecem:

1. Acesse o Firebase Console: https://console.firebase.google.com/project/escopo-v3-8e4c3/firestore/data
2. Para cada documento que você quer que apareça:
   - Clique no documento
   - Adicione um campo chamado `userId`
   - O valor deve ser o UID do seu usuário (você vê isso no console após fazer login)
   - Salve

### Correção 3: Criar Dados de Teste

Se a base está vazia, o sistema cria dados automaticamente após o login, mas você pode forçar:

1. Abra o console (F12)
2. Execute:

```javascript
// Importar e executar criação de dados
import { checkAndCreateSeedData } from './utils/seedData';
await checkAndCreateSeedData();
```

---

## 📊 Verificação Visual Rápida

### No Console do Navegador (F12), procure por:

✅ **Mensagens boas**:
```
✅ Usuário autenticado: email@example.com
📊 companies: 1 documento(s) carregado(s)
📝 Criando documento em companies...
✅ Documento criado em companies com ID: abc123
```

❌ **Mensagens de problema**:
```
❌ Erro ao sincronizar companies: Missing or insufficient permissions
⚠️ Usuário não autenticado
📊 companies: 0 documento(s) carregado(s)
```

---

## 🎯 Checklist Rápido

Marque conforme resolve:

- [ ] Sistema está abrindo em http://localhost:5173
- [ ] Console do navegador (F12) está aberto na aba "Console"
- [ ] Você fez login com email e senha válidos
- [ ] Vê a mensagem "✅ Usuário autenticado: [seu-email]"
- [ ] Vê "📊 companies: X documento(s) carregado(s)" com X > 0
- [ ] Se X = 0, verificou se as regras do Firestore estão publicadas
- [ ] Se ainda X = 0, verificou se existem dados no Firestore Console
- [ ] Se existem dados mas X = 0, verificou se têm o campo `userId`

---

## 🆘 Ainda com Problema?

Execute este comando completo no console:

```javascript
// DIAGNÓSTICO COMPLETO
import { auth, db } from './firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

console.log('1. Usuário:', auth.currentUser?.email || 'NÃO AUTENTICADO');
console.log('2. UID:', auth.currentUser?.uid || 'N/A');

if (auth.currentUser) {
  const snapshot = await getDocs(collection(db, 'companies'));
  console.log('3. Total de empresas na base:', snapshot.size);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log('   Empresa:', {
      id: doc.id,
      nome: data.nomeFantasia,
      userId: data.userId,
      match: data.userId === auth.currentUser.uid ? '✅ MATCH' : '❌ NÃO MATCH'
    });
  });
}
```

Copie e cole o resultado aqui para análise.
