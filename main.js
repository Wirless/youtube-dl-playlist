const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { downloadPlaylist, DownloadManager } = require('./playlist');
const fs = require('fs');

let mainWindow;
let downloadManager = null;

// Initialize an array to store AbortControllers (optional if you plan to implement abort functionality)
let abortControllers = [];

function createWindow() {
  console.log('Creating BrowserWindow...');
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile('index.html')
    .then(() => {
      console.log('Loaded index.html');
      // Open DevTools for debugging
      mainWindow.webContents.openDevTools();
    })
    .catch((err) => {
      console.error('Error loading index.html:', err);
    });
}

app.whenReady().then(() => {
  console.log('App is ready');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      console.log('Re-creating window on activate');
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.on('start-download', async (event, playlistUrl) => {
  try {
    const downloadFolder = path.join(__dirname, 'downloads');
    if (!fs.existsSync(downloadFolder)) {
      fs.mkdirSync(downloadFolder, { recursive: true });
    }

    downloadManager = new DownloadManager(downloadFolder);
    
    // Initialize playlist
    const playlistInfo = await downloadManager.initializeFromPlaylist(playlistUrl);
    mainWindow.webContents.send('playlist-loaded', playlistInfo);

    // Start processing queue
    await downloadManager.processQueue((update) => {
      mainWindow.webContents.send('download-progress', update);
    });

    mainWindow.webContents.send('download-complete');
  } catch (error) {
    console.error('Download failed:', error);
    mainWindow.webContents.send('download-error', error.message);
  }
});

ipcMain.on('stop-download', () => {
  console.log('Received stop-download IPC event');
  // Abort all ongoing downloads if abort functionality is implemented
  abortControllers.forEach(controller => controller.abort());
  abortControllers = []; // Clear the controllers after aborting
  mainWindow.webContents.send('download-error', 'Download stopped by user.');
});

ipcMain.on('set-convert-option', (event, shouldConvert) => {
  if (downloadManager) {
    downloadManager.setConvertToMp3(shouldConvert);
  }
}); 