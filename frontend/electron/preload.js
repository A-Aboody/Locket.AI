const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  onStartupProgress: (callback) => {
    ipcRenderer.on('startup-progress', callback);
  },
  onStartupError: (callback) => {
    ipcRenderer.on('startup-error', callback);
  },
});