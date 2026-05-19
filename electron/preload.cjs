const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hardSphereLabExporter', {
  checkExportEnvironment: () => ipcRenderer.invoke('hsl-exporter:check'),
  exportWorkbenchPayload: (payload, options) => ipcRenderer.invoke('hsl-exporter:export', payload, options),
});

contextBridge.exposeInMainWorld('hardSphereLabWindow', {
  newWindow: () => ipcRenderer.invoke('hsl-window:new'),
});
