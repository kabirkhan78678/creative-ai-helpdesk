# 🍏 Creative AI IT Helpdesk - macOS Setup Guide

Welcome to the **Creative AI Internal IT Management & Helpdesk Suite** on macOS.

---

## ⚡ Quick 1-Click Launch (Terminal)

1. Open **Terminal** on your Mac (`Cmd + Space` -> type `Terminal` -> press `Enter`).
2. Navigate to this extracted folder:
   ```bash
   cd /path/to/extracted/folder
   ```
3. Run the launch script:
   ```bash
   sh run-mac.sh
   ```
   *What this script does:*
   - Automatically installs required Mac dependencies (`npm install`).
   - Builds the production UI assets (`npm run build`).
   - Launches the native macOS Creative AI desktop application.

---

## 📦 Build Standalone macOS DMG Installer

To package an official `.dmg` installer (which you can drag into your Mac `/Applications` folder):

1. In Terminal, run:
   ```bash
   sh build-mac-dmg.sh
   ```
2. Your installer will be ready in:
   `desktop/release/Creative AI IT Helpdesk-1.0.0.dmg`
3. Double click the `.dmg` and drag the app into your **Applications** folder!

---

## 🌐 Network Auto-Discovery (Zero Config)

When the app launches on your Mac:
- It automatically broadcasts over your local Wi-Fi to locate the Central IT Server (`192.168.29.69`).
- No IP configuration needed!
- Real-time hardware telemetry (Apple M-Series/Intel CPU, RAM, Disk, Wi-Fi SSID, external USB media) will instantly register on the Central IT Fleet Dashboard.

---

## 🛡️ macOS Permissions Note

- **Screen Sharing / Remote Desktop:** The first time an IT Admin requests remote screen viewing, macOS will display a prompt asking for **Screen Recording** permission.
  - Go to **System Settings > Privacy & Security > Screen Recording** and ensure **Creative AI IT Helpdesk** (or Terminal / Electron) is checked.
- **Remote Lock / Restart:** Handled natively via Apple's `pmset` and `osascript`.

