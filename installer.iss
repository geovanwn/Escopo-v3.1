; Script gerado para EscopoV3 usando Inno Setup

[Setup]
AppName=EscopoV3
AppVersion=1.0.0
AppPublisher=Geovani Silva
AppPublisherURL=https://escopov3.com.br
DefaultDirName=C:\EscopoV3
DefaultGroupName=EscopoV3
DisableProgramGroupPage=yes
OutputBaseFilename=Setup_EscopoV3_Inno
UninstallDisplayIcon={app}\EscopoV3.exe
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin
WizardStyle=modern

; Remove versoes antigas pelo GUID (se houver) e limpa a pasta de instalacao na reinstalacao
DirExistsWarning=no
SetupLogging=yes

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "release\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\EscopoV3"; Filename: "{app}\EscopoV3.exe"
Name: "{group}\{cm:UninstallProgram,EscopoV3}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\EscopoV3"; Filename: "{app}\EscopoV3.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\EscopoV3.exe"; Description: "{cm:LaunchProgram,EscopoV3}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Code]
// Forca a exclusao de tudo dentro da pasta de destino antes de iniciar a copia (Clean Install exigido)
procedure CurStepChanged(CurStep: TSetupStep);
var
  DestPath: String;
begin
  if CurStep = ssInstall then
  begin
    DestPath := ExpandConstant('{app}');
    if DirExists(DestPath) then
    begin
      Log('Removendo diretorio de instalacao antigo: ' + DestPath);
      DelTree(DestPath, True, True, True);
    end;
  end;
end;
