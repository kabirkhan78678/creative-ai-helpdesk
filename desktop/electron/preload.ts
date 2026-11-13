// @ts-nocheck
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getScreenSources: () => ipcRenderer.invoke('DESKTOP_CAPTURER_GET_SOURCES'),
  minimize: () => ipcRenderer.send('WINDOW_MINIMIZE'),
  maximize: () => ipcRenderer.send('WINDOW_MAXIMIZE'),
  close: () => ipcRenderer.send('WINDOW_CLOSE'),
  platform: process.platform,
});
