# Script PowerShell para Build do Instalador SFX
# EscopoV3 - Self-Extracting Archive Builder

param(
    [string]$Version = "1.0.0",
    [switch]$Sign = $false,
    [string]$CertificatePath = "",
    [string]$CertificatePassword = ""
)

# Configurações
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DistFolder = Join-Path $ProjectRoot "dist"
$DistElectronFolder = Join-Path $ProjectRoot "dist-electron"
$InstallerFolder = Join-Path $ProjectRoot "installer"
$BuildFolder = Join-Path $ProjectRoot "build"
$OutputFolder = Join-Path $ProjectRoot "releases"

# Cores para output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Green "=========================================="
Write-ColorOutput Green "  EscopoV3 SFX Builder v$Version"
Write-ColorOutput Green "=========================================="
Write-Output ""

# Verificar se NSIS está instalado
Write-Output "[1/8] Verificando NSIS..."
$nsisPath = "C:\Program Files (x86)\NSIS\makensis.exe"
if (-not (Test-Path $nsisPath)) {
    Write-ColorOutput Red "ERRO: NSIS não encontrado em $nsisPath"
    Write-Output "Baixe em: https://nsis.sourceforge.io/Download"
    exit 1
}
Write-ColorOutput Green "✓ NSIS encontrado"

# Verificar se Node.js está instalado
Write-Output "[2/8] Verificando Node.js..."
try {
    $nodeVersion = node --version
    Write-ColorOutput Green "✓ Node.js $nodeVersion"
}
catch {
    Write-ColorOutput Red "ERRO: Node.js não encontrado"
    exit 1
}

# Limpar builds anteriores
Write-Output "[3/8] Limpando builds anteriores..."
if (Test-Path $OutputFolder) {
    Remove-Item -Path $OutputFolder -Recurse -Force
}
New-Item -ItemType Directory -Path $OutputFolder -Force | Out-Null
Write-ColorOutput Green "✓ Diretórios limpos"

# Build do frontend (Vite)
Write-Output "[4/8] Compilando frontend (Vite)..."
Push-Location $ProjectRoot
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Erro no build do frontend"
    }
    Write-ColorOutput Green "✓ Frontend compilado"
}
catch {
    Write-ColorOutput Red "ERRO: Falha ao compilar frontend"
    Pop-Location
    exit 1
}
Pop-Location

# Build do Electron
Write-Output "[5/8] Compilando Electron..."
Push-Location $ProjectRoot
try {
    npm run build:electron
    if ($LASTEXITCODE -ne 0) {
        throw "Erro no build do Electron"
    }
    Write-ColorOutput Green "✓ Electron compilado"
}
catch {
    Write-ColorOutput Red "ERRO: Falha ao compilar Electron"
    Pop-Location
    exit 1
}
Pop-Location

# Verificar arquivos necessários
Write-Output "[6/8] Verificando arquivos..."
$requiredFiles = @(
    (Join-Path $DistFolder "index.html"),
    (Join-Path $DistElectronFolder "main.js"),
    (Join-Path $BuildFolder "icon.ico"),
    (Join-Path $InstallerFolder "escopov3-sfx.nsi")
)

foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-ColorOutput Red "ERRO: Arquivo não encontrado: $file"
        exit 1
    }
}
Write-ColorOutput Green "✓ Todos os arquivos necessários encontrados"

# Calcular tamanho e quantidade de arquivos
Write-Output "[7/8] Calculando estatísticas..."
$distSize = (Get-ChildItem -Path $DistFolder -Recurse | Measure-Object -Property Length -Sum).Sum
$electronSize = (Get-ChildItem -Path $DistElectronFolder -Recurse | Measure-Object -Property Length -Sum).Sum
$totalSize = $distSize + $electronSize
$totalSizeMB = [math]::Round($totalSize / 1MB, 2)

$distFiles = (Get-ChildItem -Path $DistFolder -Recurse -File).Count
$electronFiles = (Get-ChildItem -Path $DistElectronFolder -Recurse -File).Count
$totalFiles = $distFiles + $electronFiles

Write-Output "  Tamanho total: $totalSizeMB MB"
Write-Output "  Total de arquivos: $totalFiles"
Write-ColorOutput Green "✓ Estatísticas calculadas"

# Gerar checksum dos arquivos principais
Write-Output "Gerando checksums..."
$checksumFile = Join-Path $OutputFolder "checksums.txt"
$mainExe = Join-Path $DistElectronFolder "EscopoV3.exe"
if (Test-Path $mainExe) {
    $md5 = (Get-FileHash -Path $mainExe -Algorithm MD5).Hash
    $sha256 = (Get-FileHash -Path $mainExe -Algorithm SHA256).Hash
    "EscopoV3.exe" | Out-File -FilePath $checksumFile
    "MD5: $md5" | Out-File -FilePath $checksumFile -Append
    "SHA256: $sha256" | Out-File -FilePath $checksumFile -Append
}

# Compilar instalador NSIS
Write-Output "[8/8] Compilando instalador SFX..."
$nsiScript = Join-Path $InstallerFolder "escopov3-sfx.nsi"
$outputExe = Join-Path $OutputFolder "EscopoV3-SFX-$Version.exe"

try {
    & $nsisPath /DVERSION=$Version $nsiScript
    if ($LASTEXITCODE -ne 0) {
        throw "Erro ao compilar NSIS"
    }
    
    # Mover arquivo gerado
    $generatedExe = Join-Path $InstallerFolder "EscopoV3-SFX-$Version.exe"
    if (Test-Path $generatedExe) {
        Move-Item -Path $generatedExe -Destination $outputExe -Force
    }
    
    Write-ColorOutput Green "✓ Instalador SFX compilado com sucesso!"
}
catch {
    Write-ColorOutput Red "ERRO: Falha ao compilar instalador NSIS"
    Write-Output $_.Exception.Message
    exit 1
}

# Assinar digitalmente (opcional)
if ($Sign -and $CertificatePath -and (Test-Path $CertificatePath)) {
    Write-Output ""
    Write-Output "Assinando executável..."
    
    $signtoolPath = "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe"
    
    if (Test-Path $signtoolPath) {
        try {
            & $signtoolPath sign /f $CertificatePath /p $CertificatePassword /t http://timestamp.digicert.com /v $outputExe
            Write-ColorOutput Green "✓ Executável assinado digitalmente"
        }
        catch {
            Write-ColorOutput Yellow "⚠ Falha ao assinar executável (continuando...)"
        }
    }
    else {
        Write-ColorOutput Yellow "⚠ SignTool não encontrado (pulando assinatura)"
    }
}

# Gerar checksum do instalador final
Write-Output ""
Write-Output "Gerando checksum do instalador..."
if (Test-Path $outputExe) {
    $installerMD5 = (Get-FileHash -Path $outputExe -Algorithm MD5).Hash
    $installerSHA256 = (Get-FileHash -Path $outputExe -Algorithm SHA256).Hash
    $installerSize = (Get-Item $outputExe).Length
    $installerSizeMB = [math]::Round($installerSize / 1MB, 2)
    
    "" | Out-File -FilePath $checksumFile -Append
    "EscopoV3-SFX-$Version.exe" | Out-File -FilePath $checksumFile -Append
    "Tamanho: $installerSizeMB MB" | Out-File -FilePath $checksumFile -Append
    "MD5: $installerMD5" | Out-File -FilePath $checksumFile -Append
    "SHA256: $installerSHA256" | Out-File -FilePath $checksumFile -Append
}

# Gerar arquivo de informações
Write-Output "Gerando arquivo de informações..."
$infoFile = Join-Path $OutputFolder "build-info.txt"
@"
EscopoV3 - Build Information
============================

Versão: $Version
Data: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Sistema: Windows $(if ([Environment]::Is64BitOperatingSystem) { "64-bit" } else { "32-bit" })

Estatísticas:
- Tamanho total dos arquivos: $totalSizeMB MB
- Quantidade de arquivos: $totalFiles
- Tamanho do instalador: $installerSizeMB MB
- Compressão: LZMA (Solid)

Arquivos gerados:
- $outputExe
- $checksumFile
- $infoFile

Checksums:
MD5: $installerMD5
SHA256: $installerSHA256
"@ | Out-File -FilePath $infoFile

# Resumo final
Write-Output ""
Write-ColorOutput Green "=========================================="
Write-ColorOutput Green "  BUILD CONCLUÍDO COM SUCESSO!"
Write-ColorOutput Green "=========================================="
Write-Output ""
Write-Output "Arquivo gerado:"
Write-ColorOutput Cyan "  $outputExe"
Write-Output ""
Write-Output "Tamanho: $installerSizeMB MB"
Write-Output "Arquivos empacotados: $totalFiles"
Write-Output "Compressão: LZMA"
Write-Output ""
Write-Output "Checksums salvos em:"
Write-ColorOutput Cyan "  $checksumFile"
Write-Output ""
Write-ColorOutput Green "Pronto para distribuição!"
Write-Output ""

# Abrir pasta de saída
$openFolder = Read-Host "Deseja abrir a pasta de saída? (S/N)"
if ($openFolder -eq "S" -or $openFolder -eq "s") {
    Start-Process explorer.exe -ArgumentList $OutputFolder
}
