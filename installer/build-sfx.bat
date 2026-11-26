# Script Batch para Build Rápido do SFX
# Para usuários que preferem não usar PowerShell

@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ==========================================
echo   EscopoV3 SFX Builder (Batch)
echo ==========================================
echo.

:: Verificar se NSIS está instalado
set "NSIS_PATH=C:\Program Files (x86)\NSIS\makensis.exe"
if not exist "%NSIS_PATH%" (
    echo [ERRO] NSIS não encontrado!
    echo Baixe em: https://nsis.sourceforge.io/Download
    pause
    exit /b 1
)

:: Verificar se Node.js está instalado
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js não encontrado!
    echo Baixe em: https://nodejs.org/
    pause
    exit /b 1
)

:: Limpar builds anteriores
echo [1/5] Limpando builds anteriores...
if exist releases rmdir /s /q releases
mkdir releases
echo OK

:: Build do frontend
echo [2/5] Compilando frontend...
call npm run build
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao compilar frontend
    pause
    exit /b 1
)
echo OK

:: Build do Electron
echo [3/5] Compilando Electron...
call npm run build:electron
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao compilar Electron
    pause
    exit /b 1
)
echo OK

:: Compilar NSIS
echo [4/5] Compilando instalador SFX...
"%NSIS_PATH%" installer\escopov3-sfx.nsi
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao compilar NSIS
    pause
    exit /b 1
)
echo OK

:: Mover arquivo gerado
echo [5/5] Finalizando...
move installer\EscopoV3-SFX-*.exe releases\ >nul 2>&1
echo OK

echo.
echo ==========================================
echo   BUILD CONCLUÍDO COM SUCESSO!
echo ==========================================
echo.
echo Arquivo gerado em: releases\
echo.

:: Perguntar se deseja abrir pasta
set /p OPEN="Deseja abrir a pasta de saída? (S/N): "
if /i "%OPEN%"=="S" start explorer releases

pause
