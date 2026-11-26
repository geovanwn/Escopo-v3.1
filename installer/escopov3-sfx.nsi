; ============================================================================
; EscopoV3 - Self-Extracting Archive (SFX) Installer
; NSIS Script for creating professional SFX executable
; ============================================================================

; Configurações Gerais
!define PRODUCT_NAME "EscopoV3"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "EscopoV3 Sistemas"
!define PRODUCT_WEB_SITE "https://escopov3.com"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\EscopoV3.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define PRODUCT_UNINST_ROOT_KEY "HKLM"

; Compressão LZMA (máxima compressão)
SetCompressor /SOLID lzma
SetCompressorDictSize 64

; Includes necessários
!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"

; ============================================================================
; Configurações da Interface (MUI2)
; ============================================================================

!define MUI_ABORTWARNING
!define MUI_ICON "build\icon.ico"
!define MUI_UNICON "build\icon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "build\header.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP "build\wizard.bmp"

; Páginas do Instalador
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\EscopoV3.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Executar ${PRODUCT_NAME}"
!insertmacro MUI_PAGE_FINISH

; Páginas do Desinstalador
!insertmacro MUI_UNPAGE_INSTFILES

; Idiomas
!insertmacro MUI_LANGUAGE "PortugueseBR"

; ============================================================================
; Informações do Instalador
; ============================================================================

Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "EscopoV3-SFX-${PRODUCT_VERSION}.exe"
InstallDir "$PROGRAMFILES64\EscopoV3"
InstallDirRegKey HKLM "${PRODUCT_DIR_REGKEY}" ""
ShowInstDetails show
ShowUnInstDetails show
RequestExecutionLevel admin

; Informações de Versão
VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "${PRODUCT_NAME}"
VIAddVersionKey "CompanyName" "${PRODUCT_PUBLISHER}"
VIAddVersionKey "LegalCopyright" "Copyright © 2026 ${PRODUCT_PUBLISHER}"
VIAddVersionKey "FileDescription" "${PRODUCT_NAME} Self-Extracting Installer"
VIAddVersionKey "FileVersion" "${PRODUCT_VERSION}"
VIAddVersionKey "ProductVersion" "${PRODUCT_VERSION}"

; ============================================================================
; Funções de Inicialização
; ============================================================================

Function .onInit
  ; Verificar se é Windows 64-bit
  ${If} ${RunningX64}
    ; OK, continuar
  ${Else}
    MessageBox MB_OK|MB_ICONSTOP "Este programa requer Windows 64-bit."
    Abort
  ${EndIf}

  ; Verificar versão do Windows
  ${If} ${AtLeastWin10}
    ; OK, continuar
  ${Else}
    MessageBox MB_OK|MB_ICONSTOP "Este programa requer Windows 10 ou superior."
    Abort
  ${EndIf}

  ; Verificar se já está instalado
  ReadRegStr $R0 ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString"
  StrCmp $R0 "" done

  MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
  "${PRODUCT_NAME} já está instalado.$\n$\nClique em OK para remover a versão anterior ou Cancelar para sair." \
  IDOK uninst
  Abort

  uninst:
    ClearErrors
    ExecWait '$R0 /S _?=$INSTDIR'
    
  done:
FunctionEnd

; ============================================================================
; Seção Principal de Instalação
; ============================================================================

Section "Arquivos Principais" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite on

  ; Verificar espaço em disco (mínimo 500 MB)
  ${GetRoot} "$INSTDIR" $R0
  ${DriveSpace} "$R0\" "/D=F /S=M" $R1
  ${If} $R1 < 500
    MessageBox MB_OK|MB_ICONSTOP "Espaço insuficiente em disco. São necessários pelo menos 500 MB."
    Abort
  ${EndIf}

  ; Extrair todos os arquivos
  DetailPrint "Extraindo arquivos do sistema..."
  
  ; Arquivos principais
  File /r "dist\*.*"
  File /r "dist-electron\*.*"
  File "package.json"
  File "LICENSE.txt"
  File "README.md"

  ; Criar atalhos
  DetailPrint "Criando atalhos..."
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\EscopoV3.exe"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\Desinstalar.lnk" "$INSTDIR\uninst.exe"
  CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\EscopoV3.exe"

  ; Registrar no sistema
  DetailPrint "Registrando aplicação..."
  WriteRegStr HKLM "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\EscopoV3.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayName" "$(^Name)"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninst.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\EscopoV3.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  
  ; Calcular tamanho instalado
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "EstimatedSize" "$0"
SectionEnd

; ============================================================================
; Seção de Dependências (Node.js, etc)
; ============================================================================

Section "Dependências do Sistema" SEC02
  DetailPrint "Verificando dependências..."
  
  ; Verificar se Node.js está instalado
  nsExec::ExecToStack 'node --version'
  Pop $0
  Pop $1
  
  ${If} $0 != 0
    MessageBox MB_YESNO "Node.js não foi detectado.$\n$\nDeseja baixar e instalar? (Recomendado)" IDYES download_node IDNO skip_node
    
    download_node:
      DetailPrint "Baixando Node.js..."
      NSISdl::download "https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi" "$TEMP\nodejs.msi"
      Pop $R0
      ${If} $R0 == "success"
        DetailPrint "Instalando Node.js..."
        ExecWait '"msiexec" /i "$TEMP\nodejs.msi" /qn'
        Delete "$TEMP\nodejs.msi"
      ${Else}
        MessageBox MB_OK "Falha ao baixar Node.js. Você pode instalá-lo manualmente mais tarde."
      ${EndIf}
    
    skip_node:
  ${EndIf}
SectionEnd

; ============================================================================
; Seção de Configuração Inicial
; ============================================================================

Section "Configuração Inicial" SEC03
  DetailPrint "Configurando aplicação..."
  
  ; Criar diretórios de dados
  CreateDirectory "$APPDATA\EscopoV3"
  CreateDirectory "$APPDATA\EscopoV3\data"
  CreateDirectory "$APPDATA\EscopoV3\logs"
  CreateDirectory "$APPDATA\EscopoV3\certificates"
  
  ; Criar arquivo de configuração inicial
  FileOpen $0 "$APPDATA\EscopoV3\config.json" w
  FileWrite $0 '{$\r$\n'
  FileWrite $0 '  "version": "${PRODUCT_VERSION}",$\r$\n'
  FileWrite $0 '  "installPath": "$INSTDIR",$\r$\n'
  FileWrite $0 '  "dataPath": "$APPDATA\EscopoV3\data",$\r$\n'
  FileWrite $0 '  "firstRun": true$\r$\n'
  FileWrite $0 '}$\r$\n'
  FileClose $0
  
  ; Definir permissões
  AccessControl::GrantOnFile "$APPDATA\EscopoV3" "(BU)" "FullAccess"
SectionEnd

; ============================================================================
; Seção Pós-Instalação
; ============================================================================

Section -Post
  ; Criar desinstalador
  WriteUninstaller "$INSTDIR\uninst.exe"
  
  ; Registrar protocolo personalizado (escopov3://)
  WriteRegStr HKCR "escopov3" "" "URL:EscopoV3 Protocol"
  WriteRegStr HKCR "escopov3" "URL Protocol" ""
  WriteRegStr HKCR "escopov3\DefaultIcon" "" "$INSTDIR\EscopoV3.exe,0"
  WriteRegStr HKCR "escopov3\shell\open\command" "" '"$INSTDIR\EscopoV3.exe" "%1"'
  
  ; Adicionar ao firewall do Windows
  DetailPrint "Configurando firewall..."
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="EscopoV3" dir=in action=allow program="$INSTDIR\EscopoV3.exe" enable=yes'
  
  ; Limpar arquivos temporários
  DetailPrint "Limpando arquivos temporários..."
  Delete "$TEMP\escopov3_*.*"
  
  DetailPrint "Instalação concluída com sucesso!"
SectionEnd

; ============================================================================
; Descrições das Seções
; ============================================================================

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC01} "Arquivos principais do ${PRODUCT_NAME}"
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC02} "Dependências necessárias para o funcionamento"
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC03} "Configuração inicial do sistema"
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; ============================================================================
; Seção de Desinstalação
; ============================================================================

Section Uninstall
  ; Parar processos em execução
  DetailPrint "Encerrando processos..."
  nsExec::ExecToLog 'taskkill /F /IM EscopoV3.exe'
  Sleep 1000

  ; Remover arquivos
  DetailPrint "Removendo arquivos..."
  Delete "$INSTDIR\uninst.exe"
  Delete "$INSTDIR\*.*"
  RMDir /r "$INSTDIR\dist"
  RMDir /r "$INSTDIR\dist-electron"
  RMDir "$INSTDIR"

  ; Remover atalhos
  DetailPrint "Removendo atalhos..."
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\*.*"
  RMDir "$SMPROGRAMS\${PRODUCT_NAME}"
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"

  ; Remover do registro
  DetailPrint "Removendo entradas do registro..."
  DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"
  DeleteRegKey HKCR "escopov3"

  ; Remover do firewall
  DetailPrint "Removendo regra do firewall..."
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="EscopoV3"'

  ; Perguntar sobre dados do usuário
  MessageBox MB_YESNO "Deseja remover também os dados do usuário?$\n$\n(Configurações, logs e certificados)" IDYES remove_data IDNO skip_data
  
  remove_data:
    DetailPrint "Removendo dados do usuário..."
    RMDir /r "$APPDATA\EscopoV3"
  
  skip_data:

  SetAutoClose true
  DetailPrint "Desinstalação concluída!"
SectionEnd

; ============================================================================
; Funções de Callback
; ============================================================================

Function un.onUninstSuccess
  HideWindow
  MessageBox MB_ICONINFORMATION|MB_OK "${PRODUCT_NAME} foi removido com sucesso do seu computador."
FunctionEnd

Function un.onInit
  MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "Tem certeza que deseja desinstalar completamente o ${PRODUCT_NAME}?" IDYES +2
  Abort
FunctionEnd
