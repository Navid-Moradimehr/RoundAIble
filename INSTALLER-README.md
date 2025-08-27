# RoundAIble Beta - Installer Creation Guide

## Overview
This guide explains how to create a professional installer for RoundAIble Beta that automatically starts the backend server and protects the source code.

## What the Installer Does

### ✅ **Automatic Backend Startup**
- Users don't need to manually start the backend server
- Launcher script automatically starts both backend and frontend
- Backend runs in the background

### ✅ **Code Protection**
- Only compiled/compressed files are included
- No source code (.ts, .tsx, .js files) in the installer
- Users cannot modify the application logic

### ✅ **Professional Installation**
- Installs to `C:\Program Files\RoundAIble\`
- Creates Start Menu shortcuts
- Optional desktop shortcut
- Proper uninstaller

## Prerequisites

1. **Inno Setup** - Download from: https://jrsoftware.org/isdl.php
2. **Node.js** - For building the backend
3. **Rust** - For building the Tauri app

## Building the Installer

### Step 1: Build Everything
```bash
# Run the build script
build-installer.bat
```

This script will:
- Build the Tauri application
- Build the backend (TypeScript → JavaScript)
- Prepare all files for the installer

### Step 2: Create the Installer
1. Open `create-installer.iss` in Inno Setup Compiler
2. Click **Build → Compile**
3. The installer will be created in `installer\` folder

## What Gets Installed

### Application Files
- `RoundAIble-Beta.exe` - Main application
- `launch-roundaible.ps1` - PowerShell launcher
- `launch-roundaible.bat` - Batch launcher (backup)
- `stop-roundaible.bat` - Stop backend script

### Backend Files (Compiled Only)
- `backend/dist/` - Compiled JavaScript files
- `backend/package.json` - Dependencies info
- `backend/package-lock.json` - Locked versions

### What's NOT Included (Protected)
- `frontend/src/` - React source code
- `backend/src/` - TypeScript source code
- `src-tauri/src/` - Rust source code
- Development files and configurations

## User Experience

### Installation
1. User runs `RoundAIble-Beta-Setup.exe`
2. Chooses installation directory
3. Selects optional shortcuts
4. Installation completes

### Running the App
1. User clicks "RoundAIble Beta" shortcut
2. Launcher script starts backend server
3. Backend starts in background
4. Main application launches
5. App connects to backend automatically

### Stopping the App
- Close the main application window
- Backend continues running in background
- Use "Stop RoundAIble Backend" shortcut to stop backend

## Troubleshooting

### Backend Won't Start
- Check if Node.js is installed
- Check if port 4000 is available
- Run `stop-roundaible.bat` then try again

### App Shows "Backend Disconnected"
- Wait a few seconds for backend to start
- Check if backend is running: `http://localhost:4000/api/health`
- Restart the application

### Permission Issues
- Run installer as Administrator
- Check Windows Defender/Firewall settings

## Security Features

### Code Protection
- Source code is not included in installer
- Only compiled/minified files are distributed
- Users cannot access or modify application logic

### Process Isolation
- Backend runs as separate process
- Can be stopped independently
- No direct access to backend internals

## Customization

### Changing App Name/Version
Edit `create-installer.iss`:
```ini
AppName=RoundAIble Beta
AppVersion=1.0.0
```

### Adding Files
Add to `[Files]` section:
```ini
Source: "path\to\file"; DestDir: "{app}"; Flags: ignoreversion
```

### Custom Icons
Replace icon references in `[Icons]` section with your custom .ico files.

## Distribution

### Single File
- `RoundAIble-Beta-Setup.exe` contains everything
- No additional files needed
- Users just need Node.js installed

### Requirements
- Windows 10/11 (64-bit)
- Node.js 16+ (if not bundled)
- 500MB free disk space
- 4GB RAM recommended 