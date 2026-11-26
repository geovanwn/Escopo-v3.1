# Manual do Usuário - Instalação do EscopoV3

## 📥 Download

Baixe o instalador oficial:
- **Arquivo**: EscopoV3-SFX-1.0.0.exe
- **Tamanho**: ~180 MB
- **Fonte**: https://escopov3.com/download

## 🔒 Verificação de Segurança

Antes de instalar, verifique a integridade do arquivo:

### Windows 10/11

1. Abra o PowerShell
2. Execute:
```powershell
Get-FileHash -Path "C:\Downloads\EscopoV3-SFX-1.0.0.exe" -Algorithm SHA256
```

3. Compare com o hash oficial (fornecido no site)

## 💻 Requisitos do Sistema

### Mínimos
- **Sistema Operacional**: Windows 10 64-bit ou superior
- **Processador**: Intel Core i3 ou equivalente
- **Memória RAM**: 4 GB
- **Espaço em Disco**: 500 MB livres
- **Conexão**: Internet (para ativação inicial)

### Recomendados
- **Sistema Operacional**: Windows 11 64-bit
- **Processador**: Intel Core i5 ou superior
- **Memória RAM**: 8 GB ou mais
- **Espaço em Disco**: 1 GB livres
- **Conexão**: Internet banda larga

## 📋 Instalação Passo a Passo

### 1. Executar o Instalador

1. Localize o arquivo **EscopoV3-SFX-1.0.0.exe**
2. Clique com botão direito → **Executar como administrador**
3. Se aparecer aviso do Windows SmartScreen:
   - Clique em **Mais informações**
   - Clique em **Executar assim mesmo**

### 2. Tela de Boas-Vindas

- Leia as informações apresentadas
- Clique em **Avançar**

### 3. Licença de Uso

- Leia os termos de licença
- Marque **Aceito os termos**
- Clique em **Avançar**

### 4. Escolha do Diretório

**Opção 1: Instalação Padrão (Recomendado)**
- Manter: `C:\Program Files\EscopoV3`
- Clique em **Avançar**

**Opção 2: Instalação Personalizada**
- Clique em **Procurar**
- Escolha outro local
- Clique em **Avançar**

### 5. Instalação

- Aguarde a extração dos arquivos
- Barra de progresso mostrará o andamento
- Tempo estimado: 2-5 minutos

### 6. Dependências (Opcional)

Se o Node.js não estiver instalado:
- Aparecerá uma pergunta
- **Recomendado**: Clique em **Sim** para instalar
- **Opcional**: Clique em **Não** (pode instalar depois)

### 7. Conclusão

- Marque **Executar EscopoV3** (se desejar abrir agora)
- Clique em **Concluir**

## 🎯 Primeiro Acesso

### 1. Abrir o Programa

**Opção 1: Atalho do Desktop**
- Duplo clique no ícone **EscopoV3**

**Opção 2: Menu Iniciar**
- Pressione tecla Windows
- Digite "EscopoV3"
- Clique no resultado

**Opção 3: Diretório de Instalação**
- Navegue até `C:\Program Files\EscopoV3`
- Execute **EscopoV3.exe**

### 2. Configuração Inicial

Na primeira execução:
1. Aceite os termos de uso
2. Configure sua conta
3. Selecione sua empresa
4. Configure certificado digital (se aplicável)

## 🔧 Configurações Importantes

### Certificado Digital

#### Certificado A1 (Arquivo)
1. Menu → **Configurações** → **Certificados**
2. Clique em **Adicionar Certificado**
3. Selecione o arquivo **.pfx** ou **.p12**
4. Digite a senha
5. Clique em **Validar**

#### Certificado A3 (Token USB)
1. Conecte o token USB
2. Menu → **Configurações** → **Certificados**
3. O sistema detectará automaticamente
4. Digite o PIN do token
5. Clique em **Validar**

### Firewall do Windows

O instalador configura automaticamente, mas se houver problemas:

1. Painel de Controle → Firewall do Windows
2. Configurações Avançadas
3. Regras de Entrada
4. Procure por "EscopoV3"
5. Certifique-se que está **Habilitado**

## 🆘 Solução de Problemas

### Problema: "Não é possível executar"

**Solução:**
1. Clique com botão direito no instalador
2. Selecione **Executar como administrador**

### Problema: "Espaço insuficiente em disco"

**Solução:**
1. Libere pelo menos 500 MB
2. Execute o instalador novamente

### Problema: "Windows SmartScreen bloqueou"

**Solução:**
1. Clique em **Mais informações**
2. Clique em **Executar assim mesmo**

### Problema: "Certificado não validado"

**Solução:**
1. Verifique se o arquivo .pfx está correto
2. Confirme a senha do certificado
3. Verifique a validade do certificado

### Problema: "Erro ao conectar com servidor"

**Solução:**
1. Verifique sua conexão com internet
2. Desabilite temporariamente antivírus
3. Verifique configurações de proxy

## 🗑️ Desinstalação

### Método 1: Painel de Controle

1. Painel de Controle → Programas e Recursos
2. Localize **EscopoV3**
3. Clique em **Desinstalar**
4. Siga as instruções

### Método 2: Menu Iniciar

1. Menu Iniciar → EscopoV3
2. Clique em **Desinstalar**
3. Siga as instruções

### Método 3: Desinstalador Direto

1. Navegue até `C:\Program Files\EscopoV3`
2. Execute **uninst.exe**
3. Siga as instruções

### Dados do Usuário

Durante a desinstalação, será perguntado:
- **Sim**: Remove tudo (configurações, logs, certificados)
- **Não**: Mantém dados para reinstalação futura

## 📞 Suporte

### Canais de Atendimento

- **Site**: https://escopov3.com/suporte
- **Email**: suporte@escopov3.com
- **Telefone**: (11) 1234-5678
- **WhatsApp**: (11) 98765-4321
- **Chat**: Disponível no site

### Horário de Atendimento

- Segunda a Sexta: 8h às 18h
- Sábado: 8h às 12h
- Domingo e Feriados: Fechado

### Informações Úteis para Suporte

Ao entrar em contato, tenha em mãos:
- Versão do EscopoV3
- Versão do Windows
- Descrição detalhada do problema
- Prints de tela (se aplicável)

## 🔄 Atualizações

### Verificar Atualizações

1. Abra o EscopoV3
2. Menu → **Ajuda** → **Verificar Atualizações**
3. Se houver atualização disponível, siga as instruções

### Atualizações Automáticas

O sistema verifica automaticamente:
- A cada 7 dias
- Ao iniciar o programa
- Notificação quando disponível

## 📚 Recursos Adicionais

### Tutoriais em Vídeo

- YouTube: https://youtube.com/@escopov3
- Playlist completa de tutoriais

### Documentação

- Manual completo: https://docs.escopov3.com
- FAQ: https://escopov3.com/faq
- Blog: https://blog.escopov3.com

### Comunidade

- Fórum: https://forum.escopov3.com
- Grupo Facebook: EscopoV3 Usuários
- Telegram: @escopov3oficial

## ⚖️ Termos e Privacidade

- Termos de Uso: https://escopov3.com/termos
- Política de Privacidade: https://escopov3.com/privacidade
- LGPD: https://escopov3.com/lgpd

---

**Versão do Manual**: 1.0.0  
**Última Atualização**: 09/02/2026  
**EscopoV3 Sistemas** - Todos os direitos reservados
