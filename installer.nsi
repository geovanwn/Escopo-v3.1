!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"

Name "EscopoV3"
OutFile "Setup_EscopoV3.exe"
InstallDir "C:\EscopoV3"
InstallDirRegKey HKLM "Software\EscopoV3" "Install_Dir"
RequestExecutionLevel admin

; Make the installer show details by default
ShowInstDetails show
ShowUnInstDetails show

;--------------------------------
; Interface Settings

!define MUI_ABORTWARNING

;--------------------------------
; Pages

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

;--------------------------------
; Languages

!insertmacro MUI_LANGUAGE "PortugueseBR"

;--------------------------------
; Installer Sections

Section "EscopoV3 (required)"
  SectionIn RO

  ; Set output path to the installation directory.
  SetOutPath $INSTDIR
  
  ; --- 1. REMOVE PREVIOUS INSTALLATION ---
  DetailPrint "Removendo instalacoes e atalhos anteriores..."
  
  ; Remove old shortcuts
  Delete "$DESKTOP\EscopoV3.lnk"
  Delete "$DESKTOP\Nome do Sistema.lnk"
  Delete "$SMPROGRAMS\EscopoV3\EscopoV3.lnk"
  Delete "$SMPROGRAMS\EscopoV3\Uninstall.lnk"
  RMDir "$SMPROGRAMS\EscopoV3"
  
  ; Remove previous files (clean install) - except the ones we might currently have locked
  ; Using RMDir /r is ok, but often better to just delete contents
  RMDir /r "$INSTDIR\*.*"
  
  ; --- 2. EXTRACT NEW FILES ---
  DetailPrint "Extraindo novos arquivos..."
  File /r "release\win-unpacked\*"

  ; --- 3. WRITE REGISTRY KEYS ---
  DetailPrint "Registrando informacoes no sistema..."
  WriteRegStr HKLM "Software\EscopoV3" "Install_Dir" "$INSTDIR"

  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\EscopoV3" "DisplayName" "EscopoV3"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\EscopoV3" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\EscopoV3" "DisplayIcon" '"$INSTDIR\EscopoV3.exe"'
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\EscopoV3" "Publisher" "Geovani Silva"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\EscopoV3" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\EscopoV3" "NoRepair" 1
  
  WriteUninstaller "$INSTDIR\uninstall.exe"

  ; --- 4. CREATE SHORTCUTS ---
  DetailPrint "Criando atalhos..."
  CreateDirectory "$SMPROGRAMS\EscopoV3"
  CreateShortcut "$SMPROGRAMS\EscopoV3\EscopoV3.lnk" "$INSTDIR\EscopoV3.exe"
  CreateShortcut "$SMPROGRAMS\EscopoV3\Uninstall.lnk" "$INSTDIR\uninstall.exe"
  CreateShortcut "$DESKTOP\EscopoV3.lnk" "$INSTDIR\EscopoV3.exe"

SectionEnd

;--------------------------------
; Uninstaller Section

Section "Uninstall"
  
  DetailPrint "Removendo EscopoV3..."

  Delete "$INSTDIR\uninstall.exe"
  
  ; Remove files and directories
  RMDir /r "$INSTDIR"

  ; Remove shortcuts
  Delete "$SMPROGRAMS\EscopoV3\EscopoV3.lnk"
  Delete "$SMPROGRAMS\EscopoV3\Uninstall.lnk"
  RMDir "$SMPROGRAMS\EscopoV3"
  Delete "$DESKTOP\EscopoV3.lnk"
  Delete "$DESKTOP\Nome do Sistema.lnk"

  ; Remove registry keys
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\EscopoV3"
  DeleteRegKey HKLM "Software\EscopoV3"

SectionEnd
