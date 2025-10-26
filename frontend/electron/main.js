const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const axios = require('axios');
const util = require('util');

const execPromise = util.promisify(exec);

let mainWindow;
let loadingWindow;

const isDev = process.env.NODE_ENV === 'development';
const platform = process.platform;

const BACKEND_PATH = path.join(__dirname, '../../backend');
const VITE_DEV_SERVER = 'http://localhost:5173';
const BACKEND_URL = 'http://127.0.0.1:8001';
const PROJECT_ROOT = path.join(__dirname, '../..');

// Startup state
let startupProgress = {
  stage: 'initializing',
  message: 'Initializing...',
  progress: 0,
  error: null
};

function updateProgress(stage, message, progress) {
  startupProgress = { stage, message, progress, error: null };
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.webContents.send('startup-progress', startupProgress);
  }
  console.log(`[Startup] [${progress}%] ${message}`);
}

function updateError(error) {
  startupProgress.error = error;
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.webContents.send('startup-error', error);
  }
  console.error(`[Startup] ERROR: ${error}`);
}

async function checkDockerInstalled() {
  updateProgress('docker-check', 'Checking if Docker is installed...', 5);
  
  try {
    await execPromise('docker --version');
    updateProgress('docker-check', 'Docker is installed ✓', 10);
    return true;
  } catch (error) {
    return false;
  }
}

async function checkDockerRunning() {
  updateProgress('docker-check', 'Checking if Docker Desktop is running...', 15);
  
  try {
    await execPromise('docker info');
    updateProgress('docker-check', 'Docker Desktop is running ✓', 20);
    return true;
  } catch (error) {
    return false;
  }
}

async function checkContainersRunning() {
  updateProgress('container-check', 'Checking if containers are running...', 25);
  
  try {
    const { stdout } = await execPromise('docker-compose ps -q', { cwd: PROJECT_ROOT });
    
    if (stdout.trim()) {
      // Check if backend is healthy
      try {
        const response = await axios.get(`${BACKEND_URL}/api/health`, { timeout: 3000 });
        if (response.data && response.data.status === 'healthy') {
          updateProgress('container-check', 'Containers are running and healthy ✓', 30);
          return true;
        }
      } catch (err) {
        // Containers exist but backend not healthy
        return false;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
}

async function startDockerContainers() {
  updateProgress('docker-start', 'Starting Docker containers...', 35);
  
  return new Promise((resolve, reject) => {
    const dockerCompose = spawn('docker-compose', ['up', '-d'], {
      cwd: PROJECT_ROOT,
      shell: true,
    });

    let output = '';

    dockerCompose.stdout.on('data', (data) => {
      const message = data.toString().trim();
      output += message + '\n';
      console.log(`[Docker] ${message}`);
      
      if (message.includes('Creating')) {
        updateProgress('docker-start', `Creating containers...`, 45);
      } else if (message.includes('Starting')) {
        updateProgress('docker-start', `Starting services...`, 55);
      }
    });

    dockerCompose.stderr.on('data', (data) => {
      const message = data.toString().trim();
      output += message + '\n';
      console.error(`[Docker Error] ${message}`);
    });

    dockerCompose.on('close', (code) => {
      if (code === 0) {
        updateProgress('docker-start', 'Containers started ✓', 65);
        resolve();
      } else {
        reject(new Error(`Docker failed to start (exit code ${code})\n\n${output}`));
      }
    });

    dockerCompose.on('error', (error) => {
      reject(new Error(`Failed to run docker-compose: ${error.message}`));
    });
  });
}

async function waitForBackendHealthy(maxWaitTime = 90000) {
  updateProgress('backend-wait', 'Waiting for backend to be ready...', 70);
  
  const startTime = Date.now();
  const checkInterval = 2000;
  let lastProgress = 70;

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/health`, { timeout: 3000 });
      
      if (response.data && response.data.status === 'healthy') {
        updateProgress('backend-wait', 'Backend is healthy ✓', 100);
        return true;
      }
    } catch (error) {
      // Still waiting...
      const elapsed = Date.now() - startTime;
      const progressPercent = Math.min(95, 70 + (elapsed / maxWaitTime) * 25);
      
      if (Math.floor(progressPercent) > lastProgress) {
        lastProgress = Math.floor(progressPercent);
        
        if (elapsed < 30000) {
          updateProgress('backend-wait', 'Starting backend server...', lastProgress);
        } else if (elapsed < 60000) {
          updateProgress('backend-wait', 'Loading AI models (this takes time)...', lastProgress);
        } else {
          updateProgress('backend-wait', 'Almost ready...', lastProgress);
        }
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  throw new Error('Backend did not become healthy within timeout');
}

async function ensureDockerRunning() {
  try {
    // Check Docker installed
    const dockerInstalled = await checkDockerInstalled();
    if (!dockerInstalled) {
      throw new Error(
        'Docker is not installed!\n\n' +
        'Please install Docker Desktop:\n' +
        '1. Visit https://www.docker.com/products/docker-desktop/\n' +
        '2. Download and install Docker Desktop\n' +
        '3. Restart this application'
      );
    }

    // Check Docker running
    const dockerRunning = await checkDockerRunning();
    if (!dockerRunning) {
      throw new Error(
        'Docker Desktop is not running!\n\n' +
        'Please start Docker Desktop:\n' +
        '1. Open Docker Desktop from Start Menu\n' +
        '2. Wait for it to finish starting (green icon)\n' +
        '3. Restart this application'
      );
    }

    // Check if containers already running
    const containersRunning = await checkContainersRunning();
    
    if (containersRunning) {
      updateProgress('complete', 'All services ready ✓', 100);
      return true;
    }

    // Start containers
    await startDockerContainers();

    // Wait for backend
    await waitForBackendHealthy();

    updateProgress('complete', 'All services ready ✓', 100);
    return true;

  } catch (error) {
    updateError(error.message);
    throw error;
  }
}

function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 500,
    height: 350,
    frame: false,
    transparent: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: getAppIcon(),
  });

  // Create HTML for loading screen
  const loadingHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          color: white;
        }
        .container {
          text-align: center;
          padding: 40px;
        }
        .logo {
          font-size: 48px;
          margin-bottom: 10px;
        }
        h1 {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 30px;
        }
        .progress-container {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          height: 8px;
          margin: 20px 0;
          overflow: hidden;
        }
        .progress-bar {
          background: white;
          height: 100%;
          width: 0%;
          transition: width 0.3s ease;
          border-radius: 10px;
        }
        .message {
          font-size: 14px;
          opacity: 0.9;
          min-height: 20px;
        }
        .spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-top: 20px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .error {
          background: #ef4444;
          padding: 20px;
          border-radius: 10px;
          margin-top: 20px;
          font-size: 13px;
          text-align: left;
          white-space: pre-wrap;
        }
        .error-title {
          font-weight: bold;
          margin-bottom: 10px;
          font-size: 16px;
        }
        button {
          background: white;
          color: #667eea;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 15px;
        }
        button:hover {
          opacity: 0.9;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">📄</div>
        <h1>Document Retrieval System</h1>
        <div class="progress-container">
          <div class="progress-bar" id="progress"></div>
        </div>
        <div class="message" id="message">Initializing...</div>
        <div class="spinner" id="spinner"></div>
        <div id="error-container"></div>
      </div>
      <script>
        const { ipcRenderer } = require('electron');
        
        ipcRenderer.on('startup-progress', (event, data) => {
          document.getElementById('progress').style.width = data.progress + '%';
          document.getElementById('message').textContent = data.message;
        });
        
        ipcRenderer.on('startup-error', (event, error) => {
          document.getElementById('spinner').style.display = 'none';
          document.getElementById('error-container').innerHTML = 
            '<div class="error">' +
            '<div class="error-title">❌ Startup Failed</div>' +
            error +
            '<button onclick="require(\\'electron\\').remote.app.quit()">Close</button>' +
            '</div>';
        });
      </script>
    </body>
    </html>
  `;

  loadingWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(loadingHTML)}`);
  
  loadingWindow.on('closed', () => {
    loadingWindow = null;
  });
}

function createMainWindow() {
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
    // Close loading window
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.close();
    }
    
    // Show main window
    mainWindow.show();
    console.log('[App] Main window shown');
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
  console.log('\n' + '='.repeat(60));
  console.log('  Document Retrieval System - Electron App');
  console.log('='.repeat(60));
  console.log(`[App] Platform: ${platform}`);
  console.log(`[App] Development mode: ${isDev}`);
  console.log('='.repeat(60) + '\n');

  // Show loading window
  createLoadingWindow();

  try {
    // Ensure Docker is running and start containers
    await ensureDockerRunning();

    // Wait a moment for everything to settle
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create main window
    createMainWindow();

  } catch (error) {
    console.error('[App] Startup failed:', error);
    // Loading window will show the error
    // User can close the app from there
  }
});

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

process.on('uncaughtException', (error) => {
  console.error('[App] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[App] Unhandled rejection:', reason);
});