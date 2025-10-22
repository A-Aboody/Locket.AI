const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const waitOn = require('wait-on');
const os = require('os');

let mainWindow;
let backendProcess;

const isDev = process.env.NODE_ENV === 'development';
const platform = process.platform;

// Paths
const BACKEND_PATH = isDev
  ? path.join(__dirname, '../../backend')
  : path.join(process.resourcesPath, 'backend');

const VITE_DEV_SERVER = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8001';

function getPythonPath() {
  if (isDev) {
    if (platform === 'win32') {
      return path.join(BACKEND_PATH, 'venv', 'Scripts', 'python.exe');
    } else {
      return path.join(BACKEND_PATH, 'venv', 'bin', 'python');
    }
  } else {
    if (platform === 'win32') {
      return path.join(process.resourcesPath, 'backend', 'venv', 'Scripts', 'python.exe');
    } else {
      return path.join(process.resourcesPath, 'backend', 'venv', 'bin', 'python');
    }
  }
}

function findPython() {
  const venvPython = getPythonPath();
  const fs = require('fs');
  
  if (fs.existsSync(venvPython)) {
    console.log(`[Backend] Using venv Python: ${venvPython}`);
    return venvPython;
  }
  
  console.log('[Backend] venv not found, using system Python');
  
  if (platform === 'win32') {
    return 'python';
  } else {
    return 'python3';
  }
}

async function startBackend() {
  return new Promise((resolve, reject) => {
    console.log('[Backend] Starting FastAPI server...');
    console.log(`[Backend] Platform: ${platform}`);
    console.log(`[Backend] Backend path: ${BACKEND_PATH}`);
    
    const pythonExecutable = findPython();
    const mainScript = path.join(BACKEND_PATH, 'main.py');
    
    console.log(`[Backend] Python: ${pythonExecutable}`);
    console.log(`[Backend] Script: ${mainScript}`);
    
    const env = {
      ...process.env,
      PYTHONUNBUFFERED: '1',
    };
    
    if (platform === 'win32') {
      backendProcess = spawn(`"${pythonExecutable}"`, [`"${mainScript}"`], {
        cwd: BACKEND_PATH,
        env: env,
        shell: true,
      });
    } else {
      backendProcess = spawn(pythonExecutable, [mainScript], {
        cwd: BACKEND_PATH,
        env: env,
      });
    }

    backendProcess.stdout.on('data', (data) => {
      console.log(`[Backend] ${data.toString().trim()}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`[Backend Error] ${data.toString().trim()}`);
    });

    backendProcess.on('error', (error) => {
      console.error('[Backend] Failed to start:', error);
      reject(error);
    });

    backendProcess.on('close', (code) => {
      console.log(`[Backend] Process exited with code ${code}`);
    });

    console.log('[Backend] Waiting for server to be ready...');
    waitOn({
      resources: [`http-get://${BACKEND_URL.replace('http://', '')}/api/health`],
      timeout: 30000,
      interval: 1000,
    })
      .then(() => {
        console.log('[Backend] Server is ready!');
        resolve();
      })
      .catch((err) => {
        console.error('[Backend] Failed to start:', err);
        reject(err);
      });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: getAppIcon(),
    title: 'Document Retrieval System',
  });

  if (isDev) {
    mainWindow.loadURL(VITE_DEV_SERVER);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function getAppIcon() {
  const iconPath = path.join(__dirname, '../public');
  
  if (platform === 'win32') {
    return path.join(iconPath, 'icon.ico');
  } else if (platform === 'darwin') {
    return path.join(iconPath, 'icon.icns');
  } else {
    return path.join(iconPath, 'icon.png');
  }
}

app.whenReady().then(async () => {
  console.log(`[App] Starting on ${platform}...`);
  
  try {
    await startBackend();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('[App] Failed to start:', error);
    
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Startup Error',
      `Failed to start the application:\n\n${error.message}\n\nPlease check that Python is installed and the backend is configured correctly.`
    );
    
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    console.log('[Backend] Shutting down...');
    backendProcess.kill();
  }
});

app.on('quit', () => {
  if (backendProcess) {
    console.log('[Backend] Final cleanup...');
    
    if (platform === 'win32') {
      spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
    } else {
      backendProcess.kill('SIGTERM');
    }
  }
});

process.on('uncaughtException', (error) => {
  console.error('[App] Uncaught exception:', error);
});