const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hardSphereLabExporter', {
  checkExportEnvironment: () => ipcRenderer.invoke('hsl-exporter:check'),
  exportWorkbenchPayload: (payload, options) => ipcRenderer.invoke('hsl-exporter:export', payload, options),
});

contextBridge.exposeInMainWorld('hardSphereLabWindow', {
  newWindow: () => ipcRenderer.invoke('hsl-window:new'),
  minimize: () => ipcRenderer.invoke('hsl-window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('hsl-window:toggle-maximize'),
  close: () => ipcRenderer.invoke('hsl-window:close'),
  getState: () => ipcRenderer.invoke('hsl-window:get-state'),
  onState: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('hsl-window:state', listener);
    return () => ipcRenderer.removeListener('hsl-window:state', listener);
  },
});

contextBridge.exposeInMainWorld('hardSphereLabUserGuide', {
  openUserGuide: (language) => ipcRenderer.invoke('hsl-user-guide:open', language),
});

contextBridge.exposeInMainWorld('hardSphereLabLegal', {
  openLegalFile: (fileId) => ipcRenderer.invoke('hsl-legal:open-file', fileId),
});

contextBridge.exposeInMainWorld('hardSphereLabUpdater', {
  checkForUpdates: () => ipcRenderer.invoke('hsl-updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('hsl-updater:download'),
  quitAndInstall: () => ipcRenderer.invoke('hsl-updater:quit-and-install'),
  openManualDownload: () => ipcRenderer.invoke('hsl-updater:open-manual-download'),
  onStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('hsl-updater:status', listener);
    return () => ipcRenderer.removeListener('hsl-updater:status', listener);
  },
});
