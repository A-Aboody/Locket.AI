const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,

  // Existing startup handlers
  onStartupProgress: (callback) => {
    ipcRenderer.on('startup-progress', callback);
  },
  onStartupError: (callback) => {
    ipcRenderer.on('startup-error', callback);
  },

  // File association handlers
  onOpenLocalFile: (callback) => {
    ipcRenderer.on('open-local-file', (event, filePath) => {
      callback(filePath);
    });
  },

  requestPendingFile: () => {
    ipcRenderer.send('request-pending-file');
  },

  readLocalFile: (filePath) => {
    return ipcRenderer.invoke('read-local-file', filePath);
  },

  // Invite link handlers
  onOpenInviteLink: (callback) => {
    ipcRenderer.on('open-invite-link', (event, inviteCode) => {
      callback(inviteCode);
    });
  },

  requestPendingInvite: () => {
    ipcRenderer.send('request-pending-invite');
  },

  getBackendUrl: () => {
    return ipcRenderer.sendSync('get-backend-url');
  },
});