const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hardSphereLabExporter', {
  checkExportEnvironment: () => ipcRenderer.invoke('hsl-exporter:check'),
  exportWorkbenchPayload: (payload, options) => ipcRenderer.invoke('hsl-exporter:export', payload, options),
});

contextBridge.exposeInMainWorld('hardSphereLabWindow', {
  newWindow: () => ipcRenderer.invoke('hsl-window:new'),
});

contextBridge.exposeInMainWorld('hardSphereLabUpdater', {
  checkForUpdates: () => ipcRenderer.invoke('hsl-updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('hsl-updater:download'),
  quitAndInstall: () => ipcRenderer.invoke('hsl-updater:quit-and-install'),
  onStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('hsl-updater:status', listener);
    return () => ipcRenderer.removeListener('hsl-updater:status', listener);
  },
});
