[Setup]
AppName=RoundAIble
AppVersion=1.0
DefaultDirName={autopf}\RoundAIble
DefaultGroupName=RoundAIble
OutputDir=installer
OutputBaseFilename=RoundAIble-Setup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin

[Files]
; Main application files
Source: "frontend\dist\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs

; Backend files
Source: "backend\*"; DestDir: "{app}\backend"; Flags: ignoreversion recursesubdirs

; Node.js runtime (portable version)
Source: "node-runtime\*"; DestDir: "{app}\node-runtime"; Flags: ignoreversion recursesubdirs

; Launcher scripts
Source: "launch-roundaible.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "launch-roundaible.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "stop-roundaible.bat"; DestDir: "{app}"; Flags: ignoreversion

; Main executable
Source: "RoundAIble-Beta.exe"; DestDir: "{app}"; Flags: ignoreversion

; Documentation files
Source: "LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "API_SETUP_GUIDE.md"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\RoundAIble"; Filename: "{app}\RoundAIble.exe"
Name: "{group}\Launch RoundAIble"; Filename: "{app}\launch-roundaible.bat"
Name: "{group}\Stop RoundAIble"; Filename: "{app}\stop-roundaible.bat"
Name: "{commondesktop}\RoundAIble"; Filename: "{app}\RoundAIble.exe"

[Run]
Filename: "{app}\launch-roundaible.bat"; Description: "Launch RoundAIble now"; Flags: postinstall nowait skipifsilent