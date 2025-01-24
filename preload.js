const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  startDownload: (playlistUrl) => ipcRenderer.send('start-download', playlistUrl),
  stopDownload: () => ipcRenderer.send('stop-download'),
  onPlaylistLoaded: (callback) => ipcRenderer.on('playlist-loaded', (event, info) => callback(info)),
  onProgress: (callback) => ipcRenderer.on('download-progress', (event, progress) => callback(progress)),
  onComplete: (callback) => ipcRenderer.on('download-complete', callback),
  onError: (callback) => ipcRenderer.on('download-error', (event, error) => callback(error)),
  setConvertOption: (value) => ipcRenderer.send('set-convert-option', value),
  onConversionProgress: (callback) => 
    ipcRenderer.on('conversion-progress', (event, progress) => callback(progress)),
});