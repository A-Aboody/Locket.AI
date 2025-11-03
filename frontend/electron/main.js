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
      // Check if backend is healthy with a quick test
      try {
        const response = await axios.get(`${BACKEND_URL}/api/health`, { timeout: 5000 });
        if (response.data && response.data.status === 'healthy') {
          updateProgress('container-check', 'Containers are running and healthy ✓', 30);
          return true;
        }
      } catch (err) {
        // Containers exist but backend not fully ready yet
        console.log('[Startup] Containers running but backend not ready yet');
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
    const dockerCompose = spawn('docker-compose', ['up', '-d', '--build'], {
      cwd: PROJECT_ROOT,
      shell: true,
    });

    let output = '';
    let hasStartedBackend = false;

    dockerCompose.stdout.on('data', (data) => {
      const message = data.toString().trim();
      output += message + '\n';
      console.log(`[Docker] ${message}`);
      
      if (message.includes('Creating')) {
        updateProgress('docker-start', 'Creating containers...', 40);
      } else if (message.includes('Starting')) {
        updateProgress('docker-start', 'Starting services...', 50);
      } else if (message.includes('backend') && !hasStartedBackend) {
        updateProgress('docker-start', 'Starting backend service...', 60);
        hasStartedBackend = true;
      }
    });

    dockerCompose.stderr.on('data', (data) => {
      const message = data.toString().trim();
      output += message + '\n';
      
      // Filter out common non-error messages
      if (!message.includes('Found orphan containers') && 
          !message.includes('Unexpected container status')) {
        console.error(`[Docker Error] ${message}`);
      }
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

    // Add timeout for docker startup
    setTimeout(() => {
      if (dockerCompose.exitCode === null) {
        console.log('[Docker] Docker startup taking longer than expected...');
      }
    }, 30000);
  });
}

async function waitForBackendHealthy(maxWaitTime = 120000) {
  updateProgress('backend-wait', 'Waiting for backend to be ready...', 70);
  
  const startTime = Date.now();
  const checkInterval = 5000;
  let lastProgress = 70;
  let lastMessage = '';
  let consecutiveFailures = 0;
  let maxConsecutiveFailures = 3;

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/health`, { 
        timeout: 10000 
      });
      
      if (response.data) {
        if (response.data.status === 'healthy') {
          updateProgress('backend-wait', 'Backend is healthy ✓', 95);
          console.log('[Backend] Health check details:', response.data);
          
          // Additional wait to ensure everything is fully ready
          await new Promise(resolve => setTimeout(resolve, 3000));
          updateProgress('backend-wait', 'Backend ready ✓', 100);
          return true;
        } else if (response.data.status === 'degraded') {
          // Backend is running but some services might be degraded
          console.log('[Backend] Backend running in degraded mode:', response.data);
          updateProgress('backend-wait', 'Backend starting (some services initializing)...', 90);
          
          // Wait a bit more for full initialization
          await new Promise(resolve => setTimeout(resolve, 5000));
          updateProgress('backend-wait', 'Backend ready ✓', 100);
          return true;
        }
      }
      consecutiveFailures = 0; // Reset on successful connection
    } catch (error) {
      consecutiveFailures++;
      const elapsed = Date.now() - startTime;
      const progressPercent = Math.min(90, 70 + (elapsed / maxWaitTime) * 20);
      
      if (Math.floor(progressPercent) > lastProgress || consecutiveFailures >= maxConsecutiveFailures) {
        lastProgress = Math.floor(progressPercent);
        
        let message = '';
        if (elapsed < 20000) {
          message = 'Starting backend server...';
        } else if (elapsed < 45000) {
          message = 'Loading database and initializing services...';
        } else if (elapsed < 75000) {
          message = 'Loading AI models (this may take a minute)...';
        } else if (elapsed < 100000) {
          message = 'Finalizing setup, almost ready...';
        } else {
          message = 'Completing initialization...';
        }
        
        // Add retry information if we're having connection issues
        if (consecutiveFailures >= maxConsecutiveFailures) {
          message += ` (retrying... ${consecutiveFailures})`;
        }
        
        // Only update if message changed to avoid spam
        if (message !== lastMessage) {
          lastMessage = message;
          updateProgress('backend-wait', message, lastProgress);
        }
      }
      
      // If we're having consistent failures, log the error
      if (consecutiveFailures >= maxConsecutiveFailures) {
        console.log(`[Backend] Connection attempt ${consecutiveFailures} failed:`, error.message);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  throw new Error(`Backend did not become healthy within ${maxWaitTime/1000} seconds. Please check Docker Desktop and try again.`);
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
        '3. Start Docker Desktop and restart this application'
      );
    }

    // Check Docker running
    const dockerRunning = await checkDockerRunning();
    if (!dockerRunning) {
      throw new Error(
        'Docker Desktop is not running!\n\n' +
        'Please start Docker Desktop:\n' +
        '1. Open Docker Desktop from Start Menu/Applications\n' +
        '2. Wait for it to finish starting (green indicator)\n' +
        '3. Restart this application\n\n' +
        'If Docker Desktop is running but not detected, try restarting it.'
      );
    }

    // Check if containers already running and healthy
    const containersRunning = await checkContainersRunning();
    
    if (containersRunning) {
      updateProgress('complete', 'All services ready ✓', 100);
      console.log('[Startup] Containers already running and healthy');
      return true;
    }

    // Start containers with build to ensure latest changes
    console.log('[Startup] Starting Docker containers...');
    await startDockerContainers();

    // Wait for backend with extended timeout
    console.log('[Startup] Waiting for backend to be ready...');
    await waitForBackendHealthy(120000); // 2 minutes timeout

    updateProgress('complete', 'All services ready ✓', 100);
    console.log('[Startup] All services are ready!');
    return true;

  } catch (error) {
    console.error('[Startup] Failed to ensure Docker running:', error);
    updateError(error.message);
    throw error;
  }
}

function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 500,
    height: 400,
    frame: false,
    transparent: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: getAppIcon(),
    show: false,
    alwaysOnTop: true,
  });

  // Load the external loading HTML file
  loadingWindow.loadFile(path.join(__dirname, 'loading.html'));
  
  loadingWindow.once('ready-to-show', () => {
    loadingWindow.show();
    loadingWindow.focus();
  });
  
  loadingWindow.on('closed', () => {
    loadingWindow = null;
  });

  // Handle window focus
  loadingWindow.on('focus', () => {
    loadingWindow.flashFrame(false);
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
    title: 'Document Retrieval System - Locket.AI',
    show: false,
    titleBarStyle: platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  mainWindow.once('ready-to-show', () => {
    // Close loading window
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.close();
    }
    
    // Show main window
    mainWindow.show();
    mainWindow.focus();
    console.log('[App] Main window shown');
  });

  // Handle navigation
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // Allow localhost and our backend for development
    if (parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1') {
      event.preventDefault();
      console.warn('[Security] Blocked navigation to:', navigationUrl);
    }
  });

  if (isDev) {
    mainWindow.loadURL(VITE_DEV_SERVER);
    // Open DevTools in development mode
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle window being closed by user
  mainWindow.on('close', (event) => {
    // You can add cleanup logic here if needed
    console.log('[App] Main window closing...');
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

// Single instance lock to prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    console.log('\n' + '='.repeat(60));
    console.log('  Document Retrieval System - Electron App');
    console.log('='.repeat(60));
    console.log(`[App] Platform: ${platform}`);
    console.log(`[App] Development mode: ${isDev}`);
    console.log(`[App] Backend URL: ${BACKEND_URL}`);
    console.log(`[App] Project root: ${PROJECT_ROOT}`);
    console.log('='.repeat(60) + '\n');

    // Show loading window immediately
    createLoadingWindow();

    try {
      // Ensure Docker is running and start containers
      console.log('[Startup] Starting Docker and backend services...');
      await ensureDockerRunning();

      // Wait a moment for everything to settle
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create main window
      createMainWindow();

    } catch (error) {
      console.error('[App] Startup failed:', error);
      
      // Show error in loading window
      updateError(`Startup failed: ${error.message}\n\nPlease check Docker Desktop and try again.`);
      
      // Keep loading window open so user can see the error
      // User can close the app from there
    }
  });
}

app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (platform !== 'darwin') {
    console.log('[App] All windows closed, quitting...');
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  console.log('[App] Application quitting...');
  // Add any cleanup logic here
});

app.on('will-quit', (event) => {
  console.log('[App] Application will quit...');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[App] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[App] Unhandled rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown handling
function gracefulShutdown() {
  console.log('[App] Received shutdown signal, cleaning up...');
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
  
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.close();
  }
  
  setTimeout(() => {
    app.quit();
  }, 1000);
}

// Handle various shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Export for testing if needed
module.exports = {
  getBackendUrl: () => BACKEND_URL,
  getStartupProgress: () => startupProgress,
};