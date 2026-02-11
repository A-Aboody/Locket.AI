# LOCKET AIR-GAPPED RASPBERRY PI DEPLOYMENT GUIDE
## Complete Step-by-Step Guide for Beginners

---

## TABLE OF CONTENTS
1. [Overview](#overview)
2. [Phase 1: Prepare Downloads](#phase-1-prepare-downloads)
3. [Phase 2: Flash MicroSD Cards](#phase-2-flash-microsd-cards)
4. [Phase 3: Initial Pi Setup](#phase-3-initial-pi-setup)
5. [Phase 4: Network Configuration](#phase-4-network-configuration)
6. [Phase 5: Install Docker & Dependencies](#phase-5-install-docker--dependencies)
7. [Phase 6: Deploy Application](#phase-6-deploy-application)
8. [Phase 7: Testing & Verification](#phase-7-testing--verification)
9. [Troubleshooting](#troubleshooting)

---

## OVERVIEW

### What You're Building

An **air-gapped** (no internet) document AI system running on 4 Raspberry Pis:

```
Your Network Architecture:
┌──────────────────────────────────────────────────────────┐
│                  Air-Gapped Network                      │
│              Network: 192.168.100.0/24                   │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │  Pi4-Router │  │  Pi5-Main   │  │  Pi5-AI     │      │
│  │  (Gateway)  │  │  (Backend)  │  │  (Ollama)   │      │
│  │  .100.1     │  │  .100.10    │  │  .100.20    │      │
│  │  2GB RAM    │  │  8GB RAM    │  │  8GB RAM    │      │
│  │  32GB SD    │  │  128GB SD   │  │  128GB SD   │      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘      │
│         │                │                │              │
│         └────────┬───────┴────────┬───────┘              │
│                  │                │                      │
│           ┌──────┴──────┐  ┌──────┴──────┐              │
│           │  Pi4-Web    │  │  Switch/Hub │              │
│           │  (Frontend) │  │  (Network)  │              │
│           │  .100.30    │  └─────────────┘              │
│           │  2GB RAM    │                                │
│           │  32GB SD    │                                │
│           └─────────────┘                                │
│                                                          │
│  Your PC connects via WiFi to Pi4-Router (Access Point) │
└──────────────────────────────────────────────────────────┘
```

### Hardware Assignment

| Device | Role | Services | IP Address | Specs |
|--------|------|----------|------------|-------|
| **Pi 4 #1** | Network Gateway | WiFi AP, DHCP, DNS, SSH Access | 192.168.100.1 | 2GB, 32GB |
| **Pi 5 #1** | Main Server | PostgreSQL, FastAPI Backend | 192.168.100.10 | 8GB, 128GB |
| **Pi 5 #2** | AI Server | Ollama, LLM Model | 192.168.100.20 | 8GB, 128GB |
| **Pi 4 #2** | Web Server | Nginx, Frontend Static Files | 192.168.100.30 | 2GB, 32GB |

### Tools You'll Need

**Software (download first):**
- Raspberry Pi Imager (for flashing SD cards)
- PuTTY (SSH client for Windows)
- WinSCP (file transfer for Windows)

**Hardware:**
- 4x Raspberry Pis (as listed above)
- 4x Power supplies (USB-C for Pi5, micro-USB for Pi4)
- 4x MicroSD cards (2x 128GB, 2x 32GB)
- 1x USB keyboard (for initial setup)
- 1x HDMI cable + monitor (for initial setup)
- 1x Network switch (5-port gigabit recommended)
- 4x Ethernet cables
- 2-3x USB flash drives (for transferring files)

---

## PHASE 1: PREPARE DOWNLOADS

**⚠️ CRITICAL: Do this BEFORE going air-gapped!**

Follow the [PREPARE_OFFLINE_DEPLOYMENT.md](./PREPARE_OFFLINE_DEPLOYMENT.md) guide to download:
- Raspberry Pi OS images
- Docker installation files
- Ollama AI model
- Python packages
- Your application code

**Checklist:**
- [ ] Downloaded Raspberry Pi OS Lite (64-bit)
- [ ] Downloaded all Docker images
- [ ] Downloaded Ollama llama3.2:3b model (~3GB)
- [ ] Downloaded all Python packages
- [ ] Backed up application source code
- [ ] Downloaded PuTTY and WinSCP

---

## PHASE 2: FLASH MICROSD CARDS

### Step 2.1: Flash Pi4-Router (Gateway)

1. **Insert 32GB microSD** into your card reader
2. **Open Raspberry Pi Imager**
3. Click **"Choose Device"** → Select **Raspberry Pi 4**
4. Click **"Choose OS"** → **Raspberry Pi OS (other)** → **Raspberry Pi OS Lite (64-bit)**
5. Click **"Choose Storage"** → Select your 32GB SD card
6. Click **⚙️ Settings Icon** (bottom right)

**Configure Settings:**
```
Hostname: pi4-router
Enable SSH: ✓ Use password authentication
Username: locket
Password: [CREATE A STRONG PASSWORD]
Configure WiFi: [SKIP - we'll do this later]
Locale: Your timezone and keyboard layout
```

7. Click **"Save"** → Click **"Yes"** → Click **"Yes"** to erase
8. **Wait for imaging to complete** (~5-10 minutes)
9. **Label the SD card** with a sticker: "Pi4-Router"

### Step 2.2: Flash Pi5-Main (Backend)

Repeat the same process:
- Use **128GB microSD**
- Device: **Raspberry Pi 5**
- Hostname: **pi5-main**
- Username: **locket**
- Same password
- Label: **"Pi5-Main"**

### Step 2.3: Flash Pi5-AI (Ollama)

Repeat:
- Use **128GB microSD**
- Device: **Raspberry Pi 5**
- Hostname: **pi5-ai**
- Username: **locket**
- Same password
- Label: **"Pi5-AI"**

### Step 2.4: Flash Pi4-Web (Frontend)

Repeat:
- Use **32GB microSD**
- Device: **Raspberry Pi 4**
- Hostname: **pi4-web**
- Username: **locket**
- Same password
- Label: **"Pi4-Web"**

**✓ Checkpoint:** You now have 4 labeled microSD cards ready to boot!

---

## PHASE 3: INITIAL PI SETUP

We'll set up each Pi one at a time using keyboard + monitor.

### Step 3.1: Boot Pi4-Router

1. **Insert "Pi4-Router" microSD** into Pi 4 #1
2. **Connect:**
   - HDMI cable to monitor
   - USB keyboard
   - Ethernet cable to your home router (temporary, for setup)
   - Power supply (boot will start automatically)

3. **Wait for boot** (~30-60 seconds)
4. **Login:**
   ```
   login: locket
   password: [your password]
   ```

5. **Update system** (while you still have internet):
   ```bash
   sudo apt update
   sudo apt upgrade -y
   ```

6. **Install essential tools:**
   ```bash
   sudo apt install -y git curl wget vim hostapd dnsmasq iptables-persistent
   ```

7. **Check the IP address:**
   ```bash
   ip addr show
   ```
   Look for `inet` under `eth0` - this is your current IP (e.g., 192.168.1.X)

8. **Test SSH from your Windows PC:**
   - Open **PuTTY**
   - Host: [the IP you found]
   - Port: 22
   - Click "Open"
   - Login as `locket`

**✓ Checkpoint:** You can now SSH into Pi4-Router from your PC!

### Step 3.2: Boot Pi5-Main (Backend Server)

Repeat the same process:
1. Remove Pi4-Router, insert "Pi5-Main" SD into Pi 5 #1
2. Boot, login as `locket`
3. Update system: `sudo apt update && sudo apt upgrade -y`
4. Install Docker dependencies:
   ```bash
   sudo apt install -y ca-certificates curl gnupg lsb-release
   ```
5. Install Docker (while online):
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker locket
   ```
6. **Reboot:** `sudo reboot`
7. After reboot, test Docker:
   ```bash
   docker --version
   docker ps
   ```

### Step 3.3: Boot Pi5-AI (Ollama Server)

Same process as Pi5-Main:
1. Use "Pi5-AI" SD card in Pi 5 #2
2. Update system
3. Install Docker
4. Reboot

### Step 3.4: Boot Pi4-Web (Frontend Server)

Same process:
1. Use "Pi4-Web" SD card in Pi 4 #2
2. Update system
3. Install Docker
4. Reboot

**✓ Checkpoint:** All 4 Pis are now booted with Docker installed!

---

## PHASE 4: NETWORK CONFIGURATION

### Step 4.1: Configure Pi4-Router as Access Point

SSH into Pi4-Router:

1. **Set static IP:**
   ```bash
   sudo nano /etc/dhcpcd.conf
   ```

   Add at the end:
   ```
   interface wlan0
   static ip_address=192.168.100.1/24
   nohook wpa_supplicant
   ```

   Save: `Ctrl+X`, `Y`, `Enter`

2. **Configure DHCP server (dnsmasq):**
   ```bash
   sudo mv /etc/dnsmasq.conf /etc/dnsmasq.conf.backup
   sudo nano /etc/dnsmasq.conf
   ```

   Add:
   ```
   interface=wlan0
   dhcp-range=192.168.100.50,192.168.100.150,255.255.255.0,24h
   domain=locket.local
   address=/locket.local/192.168.100.1
   ```

   Save and exit.

3. **Configure WiFi Access Point (hostapd):**
   ```bash
   sudo nano /etc/hostapd/hostapd.conf
   ```

   Add:
   ```
   interface=wlan0
   driver=nl80211
   ssid=Locket-AirGap
   hw_mode=g
   channel=7
   wmm_enabled=0
   macaddr_acl=0
   auth_algs=1
   ignore_broadcast_ssid=0
   wpa=2
   wpa_passphrase=LocketSecure2024!
   wpa_key_mgmt=WPA-PSK
   wpa_pairwise=TKIP
   rsn_pairwise=CCMP
   ```

   **Change `wpa_passphrase` to your own secure password!**

   Save and exit.

4. **Tell system to use this config:**
   ```bash
   sudo nano /etc/default/hostapd
   ```

   Find `#DAEMON_CONF=""` and replace with:
   ```
   DAEMON_CONF="/etc/hostapd/hostapd.conf"
   ```

   Save and exit.

5. **Enable and start services:**
   ```bash
   sudo systemctl unmask hostapd
   sudo systemctl enable hostapd
   sudo systemctl enable dnsmasq
   sudo systemctl start hostapd
   sudo systemctl start dnsmasq
   ```

6. **Reboot:**
   ```bash
   sudo reboot
   ```

7. **Test:** Look for WiFi network "Locket-AirGap" on your PC!

### Step 4.2: Configure Static IPs for Other Pis

**For Pi5-Main:**
```bash
sudo nano /etc/dhcpcd.conf
```

Add:
```
interface eth0
static ip_address=192.168.100.10/24
static routers=192.168.100.1
static domain_name_servers=192.168.100.1
```

Save and reboot: `sudo reboot`

**For Pi5-AI:**
```bash
sudo nano /etc/dhcpcd.conf
```

Add:
```
interface eth0
static ip_address=192.168.100.20/24
static routers=192.168.100.1
static domain_name_servers=192.168.100.1
```

Save and reboot: `sudo reboot`

**For Pi4-Web:**
```bash
sudo nano /etc/dhcpcd.conf
```

Add:
```
interface eth0
static ip_address=192.168.100.30/24
static routers=192.168.100.1
static domain_name_servers=192.168.100.1
```

Save and reboot: `sudo reboot`

### Step 4.3: Connect Everything

1. **Connect all Pis to network switch via Ethernet**
2. **Connect your PC to "Locket-AirGap" WiFi** (password you set)
3. **Test connectivity from your PC:**

Open PuTTY and connect to each:
- Pi4-Router: `192.168.100.1`
- Pi5-Main: `192.168.100.10`
- Pi5-AI: `192.168.100.20`
- Pi4-Web: `192.168.100.30`

**✓ Checkpoint:** You can SSH into all 4 Pis from your PC via WiFi!

---

## PHASE 5: INSTALL DOCKER & DEPENDENCIES

### Step 5.1: Transfer Files to Pis

Use **WinSCP** to transfer files:

1. **Open WinSCP**
2. Connect to **Pi5-Main** (192.168.100.10)
   - Protocol: SFTP
   - Host: 192.168.100.10
   - Username: locket
   - Password: [your password]

3. **Navigate** on the right pane to `/home/locket/`
4. **Create folder:** Right-click → New → Directory → `locket-app`
5. **Upload your application code:**
   - Drag and drop your entire `senior-design-document-ai-retrieval-agent` folder
   - This will take a few minutes

6. **Upload Docker images:**
   - Upload `postgres-15-alpine.tar`
   - Upload `ollama-latest.tar`

Repeat for other Pis as needed.

### Step 5.2: Load Docker Images on Pi5-Main

SSH into Pi5-Main:

```bash
cd /home/locket/
docker load -i postgres-15-alpine.tar
docker load -i ollama-latest.tar
docker images  # Verify images are loaded
```

### Step 5.3: Install Python Dependencies on Pi5-Main

```bash
cd /home/locket/locket-app/backend/
pip3 install -r requirements.txt --no-index --find-links=/home/locket/python-packages/
```

### Step 5.4: Setup Ollama on Pi5-AI

SSH into Pi5-AI:

```bash
# Load Docker image
docker load -i /home/locket/ollama-latest.tar

# Create volume for models
docker volume create ollama_data

# Copy pre-downloaded model to volume
# (This is complex - easier to run Ollama and let it download once while online)

# Start Ollama container
docker run -d --name ollama -p 11434:11434 -v ollama_data:/root/.ollama ollama/ollama:latest

# Copy model files
# You'll need to copy the model files from your USB to the Docker volume
# This is advanced - let me know if you need detailed steps
```

**Recommended:** Download the model while Pi5-AI is temporarily online:
```bash
docker exec -it ollama ollama pull llama3.2:3b
```

---

## PHASE 6: DEPLOY APPLICATION

### Step 6.1: Configure Environment Variables on Pi5-Main

SSH into Pi5-Main:

```bash
cd /home/locket/locket-app/backend/
cp .env.example .env
nano .env
```

Update these critical values:
```env
ENVIRONMENT=production
DATABASE_URL=postgresql://doc_user:seniordesign4@192.168.100.10:5432/document_retrieval
PROD_SECRET_KEY=[GENERATE A STRONG RANDOM STRING]
DEBUG=False
HOST=0.0.0.0
PORT=8001
CORS_ORIGINS=http://192.168.100.30,http://192.168.100.1

# AI Configuration
AI_PROVIDER=ollama
OLLAMA_HOST=http://192.168.100.20:11434
```

**Generate a secure secret key:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copy the output and use it for `PROD_SECRET_KEY`.

Save and exit.

### Step 6.2: Create Docker Compose for Production

Create a new production docker-compose file:

```bash
cd /home/locket/locket-app/
nano docker-compose.production.yml
```

Add:
```yaml
services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: locket-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: doc_user
      POSTGRES_PASSWORD: seniordesign4
      POSTGRES_DB: document_retrieval
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - locket-network

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: locket-backend
    restart: unless-stopped
    env_file:
      - ./backend/.env
    ports:
      - "8001:8001"
    volumes:
      - ./backend:/app
      - ./backend/uploads:/app/uploads
      - model_cache:/root/.cache/torch/sentence_transformers
    depends_on:
      - postgres
    networks:
      - locket-network
    environment:
      - OLLAMA_HOST=http://192.168.100.20:11434

volumes:
  postgres_data:
  model_cache:

networks:
  locket-network:
    driver: bridge
```

Save and exit.

### Step 6.3: Start Services on Pi5-Main

```bash
cd /home/locket/locket-app/
docker compose -f docker-compose.production.yml up -d

# Check status
docker compose -f docker-compose.production.yml ps

# View logs
docker compose -f docker-compose.production.yml logs -f
```

### Step 6.4: Initialize Database

```bash
# SSH into the backend container
docker exec -it locket-backend bash

# Run database initialization
python init_database.py

# Exit container
exit
```

### Step 6.5: Deploy Ollama on Pi5-AI

SSH into Pi5-AI:

```bash
# Start Ollama container
docker run -d \
  --name ollama \
  -p 11434:11434 \
  -v ollama_data:/root/.ollama \
  --restart unless-stopped \
  ollama/ollama:latest

# Verify it's running
docker ps

# Test Ollama API
curl http://localhost:11434/api/tags
```

### Step 6.6: Deploy Frontend on Pi4-Web

SSH into Pi4-Web:

```bash
# Install Nginx
sudo apt install -y nginx

# Create directory for frontend
sudo mkdir -p /var/www/locket

# Transfer frontend build files using WinSCP to /var/www/locket/

# Configure Nginx
sudo nano /etc/nginx/sites-available/locket
```

Add:
```nginx
server {
    listen 80;
    server_name locket.local 192.168.100.30;

    root /var/www/locket;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://192.168.100.10:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Save and enable:
```bash
sudo ln -s /etc/nginx/sites-available/locket /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## PHASE 7: TESTING & VERIFICATION

### Step 7.1: Test Backend API

From your PC (connected to Locket-AirGap WiFi):

```
Open browser: http://192.168.100.10:8001/api/health
```

You should see:
```json
{"status": "healthy"}
```

### Step 7.2: Test Ollama

```
Open browser: http://192.168.100.20:11434/api/tags
```

Should show available models.

### Step 7.3: Test Frontend

```
Open browser: http://192.168.100.30
```

You should see the Locket login page!

### Step 7.4: Create Test User

SSH into Pi5-Main:

```bash
docker exec -it locket-backend bash
python init_database.py  # This creates a test user if configured
exit
```

Or use the API to register a new user.

---

## TROUBLESHOOTING

### Pi won't boot
- Check power supply (Pi 5 needs USB-C with 5V/3A minimum)
- Try re-flashing the SD card
- Test SD card in another device

### Can't SSH into Pi
- Check IP address: `ip addr show` on the Pi itself
- Verify Pi and PC are on same network
- Check firewall on Windows PC

### Docker containers won't start
- Check logs: `docker logs [container-name]`
- Verify environment variables: `docker exec [container] env`
- Check disk space: `df -h`

### Ollama model not found
- Check if model was properly transferred
- List models: `docker exec ollama ollama list`
- Re-pull model (while online): `docker exec ollama ollama pull llama3.2:3b`

### Frontend can't reach backend
- Check CORS settings in backend `.env`
- Verify network connectivity: `ping 192.168.100.10` from Pi4-Web
- Check Nginx proxy configuration

---

## MAINTENANCE

### Backing Up Data

**Database backup:**
```bash
# On Pi5-Main
docker exec locket-postgres pg_dump -U doc_user document_retrieval > backup.sql
```

**Full system backup:**
```bash
# Shutdown Pi gracefully
sudo shutdown -h now

# Remove SD card and use a backup tool like Win32DiskImager to create .img backup
```

### Monitoring

**Check system resources:**
```bash
# CPU and memory
htop

# Disk usage
df -h

# Docker stats
docker stats
```

**Check logs:**
```bash
# Backend logs
docker logs locket-backend -f

# Ollama logs
docker logs ollama -f
```

---

## SECURITY NOTES

1. **Change default passwords** for all Pis
2. **Use strong WiFi password** for Locket-AirGap network
3. **Generate unique SECRET_KEY** for production
4. **Disable SSH password authentication** (use SSH keys instead)
5. **Keep firmware updated** (while you have internet access)
6. **Regular backups** of all data

---

## SUMMARY

You now have a fully air-gapped Locket deployment:
- ✓ Pi4-Router: WiFi access point (your PC connects here)
- ✓ Pi5-Main: PostgreSQL database + FastAPI backend
- ✓ Pi5-AI: Ollama AI service with llama3.2:3b
- ✓ Pi4-Web: Nginx serving frontend

**Access from your PC:**
1. Connect to "Locket-AirGap" WiFi
2. Open browser: http://192.168.100.30
3. Use SSH/WinSCP to manage: 192.168.100.X

**Need help?** Review the troubleshooting section or check Docker logs!
