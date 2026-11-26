# Executável SFX (Self-Extracting Archive) - EscopoV3

## Visão Geral

Este documento descreve o processo completo de criação de um executável SFX profissional para o sistema EscopoV3, utilizando NSIS (Nullsoft Scriptable Install System).

---

## 📦 Características do SFX

### Funcionalidades Implementadas

✅ **Extração Automática**
- Descompactação automática de todos os arquivos
- Barra de progresso visual
- Verificação de espaço em disco antes da extração
- Compressão LZMA (máxima eficiência)

✅ **Instalação Inteligente**
- Wizard de instalação profissional em português
- Seleção de diretório de instalação
- Criação automática de atalhos (Desktop + Menu Iniciar)
- Registro no sistema Windows
- Protocolo personalizado (escopov3://)

✅ **Verificações de Sistema**
- Validação de Windows 10/11 64-bit
- Verificação de espaço em disco (mínimo 500 MB)
- Detecção e instalação opcional de Node.js
- Configuração de firewall do Windows

✅ **Pós-Instalação**
- Execução automática após instalação (opcional)
- Criação de diretórios de dados do usuário
- Arquivo de configuração inicial
- Permissões de acesso configuradas

✅ **Desinstalação Completa**
- Remoção de todos os arquivos
- Limpeza de registro do Windows
- Opção de manter ou remover dados do usuário
- Remoção de regras de firewall

---

## 🛠️ Requisitos para Build

### Software Necessário

1. **NSIS (Nullsoft Scriptable Install System)**
   - Versão: 3.08 ou superior
   - Download: https://nsis.sourceforge.io/Download
   - Instalação: Padrão em `C:\Program Files (x86)\NSIS\`

2. **Node.js**
   - Versão: 18.x ou superior
   - Download: https://nodejs.org/

3. **PowerShell**
   - Versão: 5.1 ou superior (incluído no Windows 10/11)

4. **Ferramentas Opcionais**
   - **SignTool** (para assinatura digital)
     - Incluído no Windows SDK
     - Download: https://developer.microsoft.com/windows/downloads/windows-sdk/
   - **Certificado de Assinatura de Código**
     - Para distribuição profissional

### Estrutura de Arquivos Necessária

```
EscopoV3/
├── build/
│   ├── icon.ico              # Ícone 256x256 (obrigatório)
│   ├── header.bmp            # Imagem do cabeçalho 150x57
│   └── wizard.bmp            # Imagem do wizard 164x314
├── dist/                     # Build do frontend (Vite)
├── dist-electron/            # Build do Electron
├── installer/
│   ├── escopov3-sfx.nsi      # Script NSIS
│   └── build-sfx.ps1         # Script de build PowerShell
├── LICENSE.txt               # Licença do software
├── README.md                 # Documentação
└── package.json              # Configuração do projeto
```

---

## 🚀 Como Compilar o SFX

### Método 1: Script PowerShell Automatizado (Recomendado)

```powershell
# Navegar até a pasta do projeto
cd "C:\Users\Geovani Silva\Documents\EscopoV3\EscopoV3 (1)~1"

# Executar script de build
.\installer\build-sfx.ps1 -Version "1.0.0"

# Com assinatura digital (opcional)
.\installer\build-sfx.ps1 -Version "1.0.0" -Sign -CertificatePath "C:\cert\mycert.pfx" -CertificatePassword "senha123"
```

### Método 2: Manual

```powershell
# 1. Build do frontend
npm run build

# 2. Build do Electron
npm run build:electron

# 3. Compilar NSIS
"C:\Program Files (x86)\NSIS\makensis.exe" installer\escopov3-sfx.nsi
```

### Método 3: Via package.json

Adicione ao `package.json`:

```json
{
  "scripts": {
    "build:sfx": "powershell -ExecutionPolicy Bypass -File installer/build-sfx.ps1"
  }
}
```

Execute:
```bash
npm run build:sfx
```

---

## 📋 Processo de Build Detalhado

### Etapa 1: Verificações Iniciais
- ✓ Verifica instalação do NSIS
- ✓ Verifica instalação do Node.js
- ✓ Limpa builds anteriores

### Etapa 2: Compilação
- ✓ Compila frontend com Vite
- ✓ Compila Electron
- ✓ Verifica arquivos necessários

### Etapa 3: Estatísticas
- ✓ Calcula tamanho total
- ✓ Conta quantidade de arquivos
- ✓ Gera checksums MD5 e SHA256

### Etapa 4: Geração do SFX
- ✓ Compila script NSIS
- ✓ Aplica compressão LZMA
- ✓ Gera executável final

### Etapa 5: Pós-Build
- ✓ Assina digitalmente (se configurado)
- ✓ Gera checksums do instalador
- ✓ Cria arquivo de informações

---

## 📊 Saída do Build

### Arquivos Gerados

```
releases/
├── EscopoV3-SFX-1.0.0.exe    # Instalador SFX (~150-200 MB)
├── checksums.txt              # Checksums MD5 e SHA256
└── build-info.txt             # Informações do build
```

### Exemplo de checksums.txt

```
EscopoV3.exe
MD5: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
SHA256: 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

EscopoV3-SFX-1.0.0.exe
Tamanho: 187.45 MB
MD5: f6e5d4c3b2a1098765432109876543210
SHA256: fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321
```

---

## 🔐 Assinatura Digital

### Por que assinar?

- ✅ Evita avisos do Windows SmartScreen
- ✅ Aumenta confiança dos usuários
- ✅ Verifica integridade do arquivo
- ✅ Identifica o desenvolvedor

### Como assinar

1. **Obter Certificado de Assinatura de Código**
   - Fornecedores: DigiCert, Sectigo, GlobalSign
   - Custo: ~R$ 1.000 - R$ 3.000/ano

2. **Assinar com SignTool**

```powershell
# Localizar SignTool
$signtool = "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe"

# Assinar executável
& $signtool sign `
  /f "C:\cert\mycert.pfx" `
  /p "senha_do_certificado" `
  /t http://timestamp.digicert.com `
  /v "releases\EscopoV3-SFX-1.0.0.exe"
```

3. **Verificar Assinatura**

```powershell
& $signtool verify /pa "releases\EscopoV3-SFX-1.0.0.exe"
```

---

## 🎨 Personalização Visual

### Ícones e Imagens

#### icon.ico (256x256)
- Formato: ICO multi-resolução
- Resoluções: 16x16, 32x32, 48x48, 256x256
- Ferramenta: IcoFX, GIMP, Photoshop

#### header.bmp (150x57)
- Formato: BMP 24-bit
- Aparece no topo do instalador
- Cores: Preferencialmente com fundo gradiente

#### wizard.bmp (164x314)
- Formato: BMP 24-bit
- Aparece na lateral do wizard
- Estilo: Vertical, profissional

### Criar Ícones

```powershell
# Usando ImageMagick
magick convert logo.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico

# Criar BMP do header
magick convert header.png -resize 150x57 -depth 24 header.bmp

# Criar BMP do wizard
magick convert wizard.png -resize 164x314 -depth 24 wizard.bmp
```

---

## 🧪 Testes do Instalador

### Checklist de Testes

- [ ] Instalação em Windows 10 limpo
- [ ] Instalação em Windows 11 limpo
- [ ] Instalação com Node.js já instalado
- [ ] Instalação sem Node.js
- [ ] Instalação em diretório customizado
- [ ] Instalação em diretório padrão
- [ ] Execução após instalação
- [ ] Criação de atalhos
- [ ] Protocolo escopov3:// funciona
- [ ] Desinstalação completa
- [ ] Desinstalação mantendo dados
- [ ] Reinstalação sobre versão anterior
- [ ] Instalação em conta sem admin (deve falhar)
- [ ] Verificação de espaço em disco
- [ ] Firewall configurado corretamente

### Teste de Integridade

```powershell
# Verificar checksum
$expectedSHA256 = "1234567890abcdef..."
$actualSHA256 = (Get-FileHash -Path "releases\EscopoV3-SFX-1.0.0.exe" -Algorithm SHA256).Hash

if ($expectedSHA256 -eq $actualSHA256) {
    Write-Host "✓ Checksum válido" -ForegroundColor Green
} else {
    Write-Host "✗ Checksum inválido!" -ForegroundColor Red
}
```

---

## 📦 Distribuição

### Opções de Distribuição

#### 1. Download Direto
- Hospedar em servidor próprio
- CDN para downloads rápidos
- Exemplo: https://escopov3.com/download/EscopoV3-SFX-1.0.0.exe

#### 2. GitHub Releases
```bash
# Criar release no GitHub
gh release create v1.0.0 \
  releases/EscopoV3-SFX-1.0.0.exe \
  releases/checksums.txt \
  --title "EscopoV3 v1.0.0" \
  --notes "Primeira versão estável"
```

#### 3. Microsoft Store (Futuro)
- Requer conversão para MSIX
- Processo de aprovação da Microsoft
- Distribuição automática via Windows Update

---

## 🔧 Troubleshooting

### Problema: "NSIS não encontrado"

**Solução:**
```powershell
# Verificar instalação
Test-Path "C:\Program Files (x86)\NSIS\makensis.exe"

# Se não encontrado, instalar:
# https://nsis.sourceforge.io/Download
```

### Problema: "Erro ao compilar frontend"

**Solução:**
```bash
# Limpar cache e reinstalar dependências
rm -rf node_modules
rm package-lock.json
npm install
npm run build
```

### Problema: "Arquivo muito grande"

**Solução:**
- Verificar se `node_modules` não está sendo incluído
- Usar compressão LZMA máxima
- Remover arquivos desnecessários do dist

### Problema: "Windows SmartScreen bloqueia"

**Solução:**
- Assinar digitalmente o executável
- Aguardar reputação do arquivo (downloads ao longo do tempo)
- Fornecer instruções aos usuários

---

## 📝 Manutenção

### Atualizar Versão

1. Editar `package.json`:
```json
{
  "version": "1.1.0"
}
```

2. Editar `escopov3-sfx.nsi`:
```nsis
!define PRODUCT_VERSION "1.1.0"
```

3. Rebuild:
```powershell
.\installer\build-sfx.ps1 -Version "1.1.0"
```

### Changelog

Manter arquivo `CHANGELOG.md`:
```markdown
# Changelog

## [1.1.0] - 2026-02-15
### Adicionado
- Sistema de auditoria de arquivos
- Suporte a certificados A3

### Corrigido
- Bug na validação de certificados
```

---

## 📊 Métricas de Sucesso

### KPIs para Monitorar

- **Taxa de Download**: Quantos usuários baixam
- **Taxa de Instalação**: Quantos completam a instalação
- **Taxa de Erro**: Quantos encontram erros
- **Tempo de Download**: Média de tempo
- **Feedback de Usuários**: Avaliações e comentários

### Ferramentas de Análise

- Google Analytics (eventos de download)
- Sentry (erros de instalação)
- Hotjar (gravação de sessões)

---

## 🎯 Próximos Passos

### Melhorias Futuras

- [ ] Auto-atualização integrada
- [ ] Instalação silenciosa para empresas
- [ ] Suporte a múltiplos idiomas
- [ ] Instalador MSI para GPO
- [ ] Conversão para MSIX (Microsoft Store)
- [ ] Telemetria de uso

---

## 📞 Suporte

Para problemas com o build:
1. Verificar logs em `installer/build.log`
2. Consultar documentação do NSIS
3. Contatar equipe de desenvolvimento

**Documentação Oficial:**
- NSIS: https://nsis.sourceforge.io/Docs/
- Electron Builder: https://www.electron.build/

---

**Versão**: 1.0.0  
**Data**: 2026-02-09  
**Autor**: Equipe EscopoV3
