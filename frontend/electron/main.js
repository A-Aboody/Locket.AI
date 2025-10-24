const { app, BrowserWindow } = require('electron');
const path = require('path');
const axios = require('axios');

let mainWindow;

const isDev = process.env.NODE_ENV === 'development';
const platform = process.platform;

const VITE_DEV_SERVER = 'http://localhost:5173';
const BACKEND_URL = 'http://127.0.0.1:8001';

async function checkBackendHealth() {
  console.log('\n' + '='.repeat(60));
  console.log('[Backend] Checking backend health...');
  console.log('='.repeat(60));
  console.log(`[Backend] URL: ${BACKEND_URL}`);
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/health`, { 
      timeout: 5000 
    });
    
    if (response.data && response.data.status === 'healthy') {
      console.log('[Backend] ✓ Backend is healthy!');
      console.log(`[Backend] Environment: ${response.data.environment}`);
      console.log('='.repeat(60) + '\n');
      return true;
    } else {
      console.error('[Backend] ✗ Backend returned unexpected response');
      return false;
    }
  } catch (error) {
    console.error('[Backend] ✗ Backend is not running or not responding');
    console.error(`[Backend] Error: ${error.message}`);
    console.error('='.repeat(60) + '\n');
    return false;
  }
}

function createWindow() {
  console.log('[App] Creating application window...');
  
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
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    console.log('[App] ✓ Window ready');
    mainWindow.show();
  });

  if (isDev) {
    console.log('[App] Loading Vite dev server...');
    mainWindow.loadURL(VITE_DEV_SERVER);
    mainWindow.webContents.openDevTools();
  } else {
    console.log('[App] Loading production build...');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    console.log('[App] Window closed');
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

function showBackendNotRunningError() {
  const { dialog } = require('electron');
  
  const message = 
    'Backend Server Not Running!\n\n' +
    'Please start the backend server before launching the app.\n\n' +
    'Steps:\n' +
    '1. Open a terminal\n' +
    '2. cd backend\n' +
    '3. source venv/Scripts/activate   (Windows)\n' +
    '   source venv/bin/activate       (Mac/Linux)\n' +
    '4. python main.py\n\n' +
    'Then restart this application.';
  
  dialog.showErrorBox('Backend Not Running', message);
}

app.whenReady().then(async () => {
  console.log('\n' + '='.repeat(60));
  console.log('  Document Retrieval System - Electron App');
  console.log('='.repeat(60));
  console.log(`[App] Platform: ${platform}`);
  console.log(`[App] Development mode: ${isDev}`);
  console.log('='.repeat(60) + '\n');
  
  // Check if backend is running
  const backendHealthy = await checkBackendHealth();
  
  if (!backendHealthy) {
    console.error('[App] ✗ Cannot start: Backend is not running');
    console.error('[App] Please start the backend server first:');
    console.error('[App]   cd backend');
    console.error('[App]   source venv/Scripts/activate');
    console.error('[App]   python main.py\n');
    
    showBackendNotRunningError();
    app.quit();
    return;
  }
  
  console.log('[App] ✓ Backend check passed, starting app...\n');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  console.log('[App] All windows closed');
  if (platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  console.log('[App] Application quitting...');
});

process.on('uncaughtException', (error) => {
  console.error('[App] ✗ Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[App] ✗ Unhandled rejection:', reason);
});