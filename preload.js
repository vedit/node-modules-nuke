const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  scanDirectory: (path) => ipcRenderer.invoke('scan-directory', path),
  deleteDirectories: (paths) => ipcRenderer.invoke('delete-directories', paths),
  onScanProgress: (callback) => ipcRenderer.on('scan-progress', callback)
});
