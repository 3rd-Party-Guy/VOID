const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // File operations
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  writeFile: (filePath, content) => ipcRenderer.invoke('file:write', filePath, content),

  // Menu event listeners
  onMenuNew: (callback) => ipcRenderer.on('menu-new', callback),
  onMenuExport: (callback) => ipcRenderer.on('menu-export', callback),
  onMenuUndo: (callback) => ipcRenderer.on('menu-undo', callback),
  onMenuRedo: (callback) => ipcRenderer.on('menu-redo', callback),
  onMenuDelete: (callback) => ipcRenderer.on('menu-delete', callback),
  onMenuSelectAll: (callback) => ipcRenderer.on('menu-select-all', callback),
  onMenuToggleGrid: (callback) => ipcRenderer.on('menu-toggle-grid', callback),
  onMenuToggleVertices: (callback) => ipcRenderer.on('menu-toggle-vertices', callback),
  onMenuResetCamera: (callback) => ipcRenderer.on('menu-reset-camera', callback),
  onMenuAbout: (callback) => ipcRenderer.on('menu-about', callback),
  onMenuShortcuts: (callback) => ipcRenderer.on('menu-shortcuts', callback),
});
