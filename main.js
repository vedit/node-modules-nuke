const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');
// Additional modules will be required for scanning logic

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#121212', // Dark mode background
    titleBarStyle: 'hiddenInset' // Premium feel for macOS
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

ipcMain.handle('scan-directory', async (event, rootPath) => {
  // Basic validation
  if (!rootPath) return [];

  // Helper to format size
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const modules = [];

  // Recursive scanner
  async function scan(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (e) {
      // Permission denied or other error, skip
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') {
          // Found one! Calculate size and add to list.
          // Do not recurse INSIDE node_modules
          try {
            const size = await getDirSize(fullPath);
            modules.push({
              path: fullPath,
              sizeBytes: size,
              sizeFormatted: formatSize(size)
            });
          } catch (e) {
            console.error(`Error sizing ${fullPath}:`, e);
          }
        } else {
          // Recurse
          if (!entry.name.startsWith('.')) { // Skip hidden folders like .git
            await scan(fullPath);
          }
        }
      }
    }
  }

  // Directory size calculator
  async function getDirSize(dir) {
    let size = 0;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (e) { return 0; }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        size += await getDirSize(fullPath);
      } else {
        try {
          const stats = await fs.stat(fullPath);
          size += stats.size;
        } catch (e) { }
      }
    }
    return size;
  }

  await scan(rootPath);
  return modules;
});

ipcMain.handle('delete-directories', async (event, paths) => {
  for (const p of paths) {
    try {
      await fs.rm(p, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to delete ${p}:`, error);
      // Could return errors to UI, but for now simple log
    }
  }
  return true;
});
