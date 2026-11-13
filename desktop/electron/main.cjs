const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');

app.name = 'Creative AI Helpdesk';

// Dedicated userData directory to avoid collisions with generic Electron cache
try {
  const userDataPath = path.join(app.getPath('appData'), 'Creative-AI-Helpdesk');
  app.setPath('userData', userDataPath);
} catch (_) {}

// Enforce single instance lock to prevent duplicate instances and cache lock collisions
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[Electron] Another instance is already running. Quitting duplicate.');
  app.quit();
} else {
  let mainWindow = null;

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1440,
      height: 920,
      minWidth: 1024,
      minHeight: 700,
      backgroundColor: '#ffffff',
      title: 'Creative AI - Internal IT Management & Helpdesk',
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
      },
    });

    if (app.isPackaged) {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    } else {
      const devUrl = 'http://localhost:5173';
      const net = require('net');
      const client = new net.Socket();
      client.setTimeout(1000);
      client.connect(5173, '127.0.0.1', () => {
        client.destroy();
        mainWindow.loadURL(devUrl);
      });
      client.on('error', () => {
        client.destroy();
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
      });
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // IPC: Screen capturing source enumeration for Remote Desktop WebRTC
  ipcMain.handle('DESKTOP_CAPTURER_GET_SOURCES', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 480, height: 270 }
      });
      return sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL()
      }));
    } catch (err) {
      console.error('Failed to get screen sources:', err);
      return [];
    }
  });

  // IPC: Take full screen screenshot for Ticket attachment
  ipcMain.handle('TAKE_SCREENSHOT', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1280, height: 720 }
      });
      if (sources && sources.length > 0) {
        return sources[0].thumbnail.toDataURL();
      }
    } catch (err) {
      console.error('Screenshot capture failed:', err);
    }
    return null;
  });

  // IPC: Capture screen frame for Remote Desktop live stream (fast 720p JPEG)
  ipcMain.handle('CAPTURE_SCREEN_FRAME', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1280, height: 720 }
      });
      if (sources && sources.length > 0) {
        const thumb = sources[0].thumbnail;
        if (typeof thumb.toJPEG === 'function') {
          const jpegBuffer = thumb.toJPEG(65);
          return 'data:image/jpeg;base64,' + jpegBuffer.toString('base64');
        }
        return thumb.toDataURL();
      }
    } catch (err) {
      console.error('Frame capture failed:', err);
    }
    return null;
  });

  // IPC: Window controls
  ipcMain.on('WINDOW_MINIMIZE', () => mainWindow?.minimize());
  ipcMain.on('WINDOW_MAXIMIZE', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('WINDOW_CLOSE', () => mainWindow?.close());

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}
