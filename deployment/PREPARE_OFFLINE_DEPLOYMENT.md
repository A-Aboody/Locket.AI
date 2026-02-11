# OFFLINE DEPLOYMENT PREPARATION GUIDE

This guide helps you prepare all necessary files for air-gapped Raspberry Pi deployment.

## 1. GATHER DEPLOYMENT FILES

### 1.1 Create Deployment Directory
On your Windows PC:
```
C:\locket-deployment\
├── raspbian-images\       # Raspberry Pi OS images
├── docker-packages\       # Docker installation files
├── python-packages\       # Python dependencies
├── ollama-model\          # AI model files
├── app-source\            # Your application code
└── scripts\               # Setup scripts
```

### 1.2 Download Raspberry Pi OS Images
1. Download **Raspberry Pi OS Lite (64-bit, Debian Bookworm)**
   - Use Raspberry Pi Imager or download from: https://www.raspberrypi.com/software/operating-systems/
   - File: `2024-XX-XX-raspios-bookworm-arm64-lite.img.xz`
   - Save to: `C:\locket-deployment\raspbian-images\`

### 1.3 Download Docker Offline Installation

**On a Linux machine with internet (or WSL on Windows):**

```bash
# Create directory for Docker packages
mkdir -p /tmp/docker-packages
cd /tmp/docker-packages

# Download Docker Engine for Raspberry Pi (ARM64)
# We'll use Docker convenience script
curl -fsSL https://get.docker.com -o get-docker.sh

# Download required .deb packages for offline installation
# Note: You'll need to do this on an ARM64 system or use a Pi with internet temporarily
```

**Alternative (Recommended): Use one Pi temporarily with internet**
1. Connect ONE Raspberry Pi 5 to internet temporarily
2. Install Docker: `curl -fsSL https://get.docker.com | sh`
3. Download Docker images:
   ```bash
   docker pull postgres:15-alpine
   docker pull ollama/ollama:latest
   docker save postgres:15-alpine -o postgres-15-alpine.tar
   docker save ollama/ollama:latest -o ollama-latest.tar
   ```
4. Copy these .tar files to USB drive

### 1.4 Download Ollama Model

**On a system with internet and Ollama installed:**
```bash
# Pull the model
ollama pull llama3.2:3b

# Export the model
# The model is stored in ~/.ollama/models/
# Copy the entire models directory to USB
```

**Model location:**
- Linux/Mac: `~/.ollama/models/`
- Windows: `C:\Users\<username>\.ollama\models\`

**Copy to:** `C:\locket-deployment\ollama-model\`

### 1.5 Download Python Dependencies

**On your development machine:**

```bash
# Navigate to your backend directory
cd backend/

# Download all Python packages for ARM64
pip download -r requirements.txt -d python-packages --platform manylinux2014_aarch64 --python-version 311 --only-binary=:all:

# Also download for any arch (for pure Python packages)
pip download -r requirements.txt -d python-packages

# Download sentence-transformers model
python -c "
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
"

# The model will be in ~/.cache/torch/sentence_transformers/
# Copy this directory as well
```

**Copy `python-packages/` folder to:** `C:\locket-deployment\python-packages\`

### 1.6 Copy Application Source Code

Copy your entire application directory:
```
C:\locket-deployment\app-source\
├── backend/
├── frontend/
├── docker-compose.yml
├── .env.example
└── ... (all your project files)
```

---

## 2. CREATE SETUP SCRIPTS

### 2.1 Create Installation Script for Each Pi

Save this as `C:\locket-deployment\scripts\setup-pi.sh`:

```bash
#!/bin/bash
# Setup script for Raspberry Pi in air-gapped environment

echo "=================================="
echo "Locket Air-Gapped Setup Script"
echo "=================================="

# Update hostname
read -p "Enter hostname for this Pi (pi5-main/pi5-ai/pi4-router/pi4-web): " HOSTNAME
sudo hostnamectl set-hostname $HOSTNAME

# Set static IP
echo "Setting up static IP..."
read -p "Enter static IP (e.g., 192.168.100.10): " STATIC_IP

sudo tee /etc/dhcpcd.conf << EOF
interface eth0
static ip_address=$STATIC_IP/24
static routers=192.168.100.1
static domain_name_servers=8.8.8.8 8.8.4.4

interface wlan0
static ip_address=$STATIC_IP/24
static routers=192.168.100.1
static domain_name_servers=8.8.8.8 8.8.4.4
EOF

# Enable SSH
sudo systemctl enable ssh
sudo systemctl start ssh

echo "Setup complete! Reboot required."
read -p "Reboot now? (y/n): " REBOOT
if [ "$REBOOT" = "y" ]; then
    sudo reboot
fi
```

---

## 3. WHAT TO PUT ON USB DRIVES

**USB Drive #1 - System Files:**
- Raspberry Pi OS images
- Docker installation files
- Docker images (.tar files)

**USB Drive #2 - Application Files:**
- Application source code
- Python packages
- Ollama model files
- Setup scripts

**USB Drive #3 - Tools (optional):**
- PuTTY portable
- WinSCP portable
- Text editors
- Documentation

---

## 4. PRE-FLIGHT CHECKLIST

Before going air-gapped, verify you have:

- [ ] 4x microSD cards (2x 128GB, 2x 32GB)
- [ ] Raspberry Pi OS Lite images downloaded
- [ ] USB drives with all packages
- [ ] Docker images saved as .tar files
- [ ] Ollama llama3.2:3b model exported
- [ ] All Python dependencies downloaded
- [ ] Sentence-transformers model cached
- [ ] Application source code backed up
- [ ] Setup scripts prepared
- [ ] Network cables (Cat5e/6) for initial setup
- [ ] Power supplies for all 4 Pis
- [ ] USB keyboard + HDMI cable (for initial Pi setup)
- [ ] PuTTY and WinSCP on your Windows PC

---

## 5. ESTIMATED DOWNLOAD SIZES

Plan for these approximate sizes:

- Raspberry Pi OS (per image): ~1.5 GB
- Docker Engine packages: ~100 MB
- PostgreSQL Docker image: ~250 MB
- Ollama Docker image: ~500 MB
- Ollama llama3.2:3b model: ~2-3 GB
- Python packages: ~500 MB
- Sentence-transformers model: ~100 MB
- Application source: ~50 MB

**Total: ~8-10 GB**

Use USB drives with at least 16GB capacity.

---

## NEXT STEPS

Once you have everything downloaded:
1. Proceed to **PHASE 2** in the main deployment guide
2. Flash microSD cards with Raspberry Pi OS
3. Boot each Pi and run initial setup
4. Transfer files from USB drives
5. Configure networking
6. Deploy application

**Important:** Test everything on ONE Pi with internet first, then replicate to others offline!
