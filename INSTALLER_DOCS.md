# Documentação do Instalador - EscopoV3

Este documento descreve como o instalador do EscopoV3 foi desenvolvido, como compilar o script-fonte e o fluxo de operação da instalação e desinstalação automática.

## Tecnologias Utilizadas
Foi utilizado o **NSIS (Nullsoft Scriptable Install System)**, uma excelente alternativa open-source para criação de instaladores rápidos, profissionais e compressos no Windows (10/11 - arquiteturas x64). O compilador NSIS localiza-se na máquina padrão de desenvolvimento em `C:\Program Files (x86)\NSIS\makensis.exe`.

## Estrutura do Instalador
A solução contém dois arquivos principais na raiz do projeto:
1. **`installer.nsi`**: É o script-fonte do NSIS. Ele declara todo o fluxo lógico do instalador.
2. **`Setup_EscopoV3.exe`**: É o binário gerado, pronto para ser distribuído aos clientes.

## Funcionalidades Atendidas (Requisitos)

### 1. Limpeza Profunda ("Clean Install")
Antes de extrair qualquer arquivo, a seção obrigatória do script verifica a existência dos atalhos anteriores e do diretório `C:\Program Files\EscopoV3`.
- Destrói atalhos presentes em:
  - Área de Trabalho (`$DESKTOP`)
  - Menu Iniciar (`$SMPROGRAMS\EscopoV3`)
- Executa o comando NSIS `RMDir /r "$INSTDIR\*.*"` esvaziando a pasta antes da descompactação.

### 2. Extração Total Local
- Instala na pasta protegida `$PROGRAMFILES64\EscopoV3`.
- O executável solicita **elevação de administrador** obrigatoriamente através do atributo `RequestExecutionLevel admin` para evitar problemas de _Access Denied_ na pasta Arquivos de Programas.

### 3. Modificações de Registros e Atalhos
- O atalho central de execução é criado automaticamente na Área de Trabalho e Programas.
- O sistema é registrado no gerenciador "Painel de Controle -> Programas e Recursos" com seu icone nativo e nome, onde também está vinculado ao seu programa próprio de Desinstalação (`uninstall.exe`).

### 4. Interface e Logs
- A interface `showInstDetails show` loga toda alteração feita durante o processo para ajudar em possíveis depurações ou auditorias técnicas.

## Como compilar novamente (Caso haja atualizações)
Sempre que uma nova compilação (`electron-builder --win dir` ou equivalente) preencher a pasta `release\win-unpacked` com os executáveis finais do sistema, basta regenerar o instalador `.exe` executando:

```ps1
& "C:\Program Files (x86)\NSIS\makensis.exe" installer.nsi
```

O arquivo `Setup_EscopoV3.exe` será sobrescrito/criado instantaneamente incorporando os novos arquivos prontos para ambiente de produção.
