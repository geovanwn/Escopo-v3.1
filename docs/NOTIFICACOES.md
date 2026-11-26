# Sistema de Notificações Inteligentes - EscopoV3

## 📋 Resumo das Implementações

O sistema de notificações foi completamente expandido para monitorar e alertar sobre diversos aspectos críticos da operação contábil e fiscal.

## 🔔 Tipos de Notificações Implementadas

### 1. **Validação de Cadastros de Empresas** 📋
- Verifica campos obrigatórios ausentes:
  - CNPJ
  - Razão Social
  - Nome Fantasia
  - Regime Tributário
  - E-mail e Telefone
  - Endereço completo (CEP, Rua, Cidade, UF)
- **Severidade**: Alta (high)
- **Tipo**: compliance

### 2. **Apuração de Folha de Pagamento** 💼
- **Folha não apurada**: Alerta a partir do dia 5 de cada mês
- **Folha não fechada**: Alerta quando faltam 3 dias ou menos para o dia 10
- **Severidade**: Alta para folha pendente, Média para folha não fechada
- **Tipo**: hr

### 3. **Fechamentos Contábeis em Aberto** 📊
- Monitora obrigações fiscais (SPED, DCTF, etc.)
- Alerta com 7 dias de antecedência
- **Severidade**: Alta (2 dias ou menos), Média (3-7 dias)
- **Tipo**: compliance

### 4. **Vencimento de Guias e Tributos** 💰
- Monitora calendário de impostos
- Alerta com 5 dias de antecedência
- Identifica tributos VENCIDOS, que VENCEM HOJE ou próximos
- **Severidade**: Alta (vencido ou hoje), Variável (demais casos)
- **Tipo**: tax_deadline

### 5. **Contas a Receber** 💵
- Notas fiscais abertas há 5 dias ou mais
- **Severidade**: Alta (>15 dias), Média (5-15 dias)
- **Tipo**: financial

### 6. **Contas a Pagar** 💳
- Despesas com vencimento em 3 dias ou menos
- Identifica contas VENCIDAS, que VENCEM HOJE ou próximas
- **Severidade**: Alta (vencida ou hoje), Média (demais)
- **Tipo**: financial

### 7. **Tarefas Pendentes (Workflow)** ✅
- Tarefas com prazo em 2 dias ou menos
- **Severidade**: Baseada na prioridade da tarefa
- **Tipo**: workflow

### 8. **Certificado Digital Vencendo** 🔐
- Alerta com 30 dias de antecedência
- **Severidade**: Alta (7 dias ou menos), Média (8-30 dias)
- **Tipo**: compliance

## 🎯 Funcionalidades Principais

### Notificações em Balão (Browser Notifications)
- ✅ Integração com a API de Notificações do navegador
- ✅ Solicita permissão automaticamente após login
- ✅ Notificação de boas-vindas após concessão de permissão
- ✅ Formato rico com ícone, badge e vibração
- ✅ `requireInteraction: true` para alertas de alta severidade

### Anti-Spam
- ✅ Verifica se já existe alerta não lido com o mesmo título
- ✅ Previne duplicação de notificações

### Filtragem Inteligente
- ✅ Respeita empresa selecionada quando aplicável
- ✅ Mostra alertas de todas as empresas quando nenhuma está selecionada

## 📁 Arquivos Modificados

### `contexts/DataContext.tsx`
- Expandiu o `useEffect` de notificações (linhas 377-477)
- Adicionou 8 tipos diferentes de validações
- Integrou com Browser Notification API

### `hooks/useNotificationPermission.ts` (NOVO)
- Hook para solicitar permissão de notificações
- Função utilitária `sendBrowserNotification`
- Notificação de boas-vindas

### `App.tsx`
- Integrou `useNotificationPermission` no `AppWrapper`
- Solicita permissão automaticamente após login

## 🚀 Como Funciona

1. **Usuário faz login** → Sistema solicita permissão de notificações
2. **Permissão concedida** → Notificação de boas-vindas
3. **A cada 3 segundos** → Sistema verifica todos os itens críticos
4. **Condição detectada** → Cria alerta E envia notificação em balão
5. **Notificação exibida** → Usuário é alertado visualmente

## ⚙️ Configurações

### Permissões do Navegador
O sistema solicita permissão automaticamente, mas o usuário pode:
- **Conceder**: Receberá todas as notificações
- **Negar**: Ainda verá alertas no sistema (não em balão)
- **Silenciar**: Configurações do navegador > Notificações

### Personalização
Para ajustar frequência de verificação, edite:
```typescript
setTimeout(() => { ... }, 3000); // 3000ms = 3 segundos
```

## 📊 Métricas de Severidade

| Severidade | Cor     | Uso                                    |
|-----------|---------|----------------------------------------|
| `high`    | Vermelho| Vencido, Hoje, Urgente, Crítico        |
| `medium`  | Amarelo | Próximo (2-7 dias), Importante         |
| `low`     | Azul    | Informativo, Não urgente               |

## 🔐 Segurança

- ✅ Todas as notificações respeitam isolamento por usuário (userId)
- ✅ Apenas dados do usuário autenticado são monitorados
- ✅ Notificações não expõem dados sensíveis no título

## 📱 Compatibilidade

- ✅ Chrome/Edge (100%)
- ✅ Firefox (100%)
- ✅ Safari (limitado - requer permissão explícita)
- ✅ Mobile (Android/iOS com limitações do SO)

## 🐛 Tratamento de Erros

- Verifica se `Notification` está disponível
- Valida permissão antes de enviar
- Console.log para debugging
- Fallback gracioso se navegador não suporta

## 📝 Notas Importantes

1. **Permissão única por domínio**: O navegador só permite UMA solicitação de permissão automática. Se o usuário negar, será necessário configuração manual.

2. **Limite de notificações**: Navegadores limitam quantidade de notificações simultâneas (geralmente 3-4).

3. **Persistência**: Notificações em balão são temporárias e desaparecem após alguns segundos (exceto high severity com `requireInteraction`).

4. **Performance**: Sistema otimizado com anti-spam e delay de 3 segundos para não sobrecarregar.

## 🎉 Resultado

O sistema agora possui um **motor de notificações inteligente e abrangente** que:
- ✅ Monitora 8 categorias diferentes
- ✅ Envia alertas visuais em balão
- ✅ Previne spam de notificações
- ✅ É não-intrusivo e configurável
- ✅ Funciona em tempo real com Firebase
