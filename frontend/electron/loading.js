const { ipcRenderer } = require('electron');

// DOM elements
const progressBar = document.getElementById('progress');
const progressPercent = document.getElementById('progress-percent');
const messageElement = document.getElementById('message');
const spinner = document.getElementById('spinner');
const errorContainer = document.getElementById('error-container');

// Handle startup progress updates
ipcRenderer.on('startup-progress', (event, data) => {
    updateProgress(data.progress, data.message);
});

// Handle startup errors
ipcRenderer.on('startup-error', (event, error) => {
    showError(error);
});

function updateProgress(progress, message) {
    // Update progress bar
    progressBar.style.width = `${progress}%`;
    
    // Update percentage text
    progressPercent.textContent = `${Math.round(progress)}%`;
    
    // Update message
    messageElement.textContent = message;
    
    // Show/hide spinner based on completion
    if (progress >= 100) {
        spinner.style.display = 'none';
        messageElement.style.color = '#248A8E';
        messageElement.innerHTML = `${message} <span style="color: #248A8E;">✓</span>`;
    } else {
        spinner.style.display = 'inline-block';
        messageElement.style.color = '#A0A0A0';
    }
}

function showError(error) {
    // Hide spinner
    spinner.style.display = 'none';
    
    // Create error message
    errorContainer.innerHTML = `
        <div class="error">
            <div class="error-title">Startup Failed</div>
            ${error}
            <button onclick="handleClose()">Close Application</button>
        </div>
    `;
    
    // Update main message
    messageElement.textContent = 'Failed to start application';
    messageElement.style.color = '#FF6B6B';
}

function handleClose() {
    // Close the application
    const { remote } = require('electron');
    remote.app.quit();
}