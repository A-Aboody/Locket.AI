# LOCKET AIR-GAPPED DEPLOYMENT - PRE-FLIGHT CHECKLIST

Print this checklist and check off items as you complete them!

---

## 📦 HARDWARE CHECKLIST

### Raspberry Pi Equipment
- [ ] 2x Raspberry Pi 5 (8GB) - serial numbers: __________, __________
- [ ] 2x Raspberry Pi 4 (2GB) - serial numbers: __________, __________
- [ ] 4x Official power supplies (USB-C for Pi5, micro-USB for Pi4)
- [ ] 2x 128GB microSD cards (Class 10 or better)
- [ ] 2x 32GB microSD cards (Class 10 or better)
- [ ] 1x microSD card reader for PC
- [ ] Labels/stickers for marking SD cards

### Network Equipment
- [ ] 1x Gigabit Ethernet switch (5+ ports recommended)
- [ ] 4x Ethernet cables (Cat5e or Cat6, minimum 3 feet each)
- [ ] Optional: Extra Ethernet cables for redundancy

### Peripherals (for initial setup)
- [ ] 1x USB keyboard
- [ ] 1x HDMI cable
- [ ] 1x HDMI-compatible monitor or TV
- [ ] Optional: 4x Raspberry Pi cases (for cooling and protection)
- [ ] Optional: Heatsinks or cooling fans for Pi 5s (recommended for Ollama)

### Storage & Transfer
- [ ] 2-3x USB flash drives (16GB+ each)
- [ ] 1x USB hub (if needed for file transfers)
- [ ] External hard drive for backups (optional but recommended)

---

## 💻 SOFTWARE DOWNLOADS (Do BEFORE going air-gapped!)

### Essential Tools for Windows PC
- [ ] Raspberry Pi Imager (latest version)
  - Downloaded from: https://www.raspberrypi.com/software/
  - Version: __________
  - Saved to: C:\locket-deployment\tools\

- [ ] PuTTY (SSH client)
  - Downloaded from: https://www.putty.org/
  - Version: __________
  - Saved to: C:\locket-deployment\tools\

- [ ] WinSCP (file transfer)
  - Downloaded from: https://winscp.net/
  - Version: __________
  - Saved to: C:\locket-deployment\tools\

### Raspberry Pi Operating System
- [ ] Raspberry Pi OS Lite (64-bit, Debian Bookworm)
  - Downloaded via Raspberry Pi Imager
  - Image size: ~1.5GB
  - SHA-256 verified: Yes / No
  - Saved to: C:\locket-deployment\raspbian-images\

### Docker Images
- [ ] PostgreSQL 15 Alpine
  - Downloaded: Yes / No
  - File: postgres-15-alpine.tar
  - Size: ~250MB
  - Saved to: C:\locket-deployment\docker-images\

- [ ] Ollama Latest
  - Downloaded: Yes / No
  - File: ollama-latest.tar
  - Size: ~500MB
  - Saved to: C:\locket-deployment\docker-images\

### AI Model
- [ ] Ollama llama3.2:3b model
  - Downloaded: Yes / No
  - Size: ~2-3GB
  - Location: C:\locket-deployment\ollama-model\
  - Model files present in `models/` directory: Yes / No

### Application Dependencies
- [ ] Python packages (from requirements.txt)
  - Downloaded: Yes / No
  - Location: C:\locket-deployment\python-packages\
  - Number of packages: __________

- [ ] Sentence Transformers model (all-MiniLM-L6-v2)
  - Downloaded: Yes / No
  - Location: C:\locket-deployment\sentence-transformers\
  - Size: ~100MB

### Application Code
- [ ] Full application source code backed up
  - Location: C:\locket-deployment\app-source\
  - Includes:
    - [ ] Backend code
    - [ ] Frontend code (built/production version)
    - [ ] Docker compose files
    - [ ] Environment file templates (.env.example)
    - [ ] Database initialization scripts
    - [ ] Documentation

### Setup Scripts
- [ ] Deployment scripts copied to USB
  - [ ] setup-pi.sh
  - [ ] configure-network.sh
  - [ ] install-docker-offline.sh

---

## 📝 CONFIGURATION PREPARATION

### Passwords & Security
- [ ] Strong WiFi password chosen
  - Network Name (SSID): Locket-AirGap
  - Password: __________ (Write it down securely!)

- [ ] Strong SSH password chosen for 'locket' user
  - Password: __________ (Same for all Pis - write it down!)

- [ ] Production secret key generated
  - Generated with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
  - Key: __________ (Write it down - goes in .env file!)

- [ ] Database password decided (or keep default)
  - Current: seniordesign4
  - New (optional): __________

### Network Planning
- [ ] Network range confirmed: 192.168.100.0/24
- [ ] IP addresses assigned:
  - [ ] Pi4-Router: 192.168.100.1
  - [ ] Pi5-Main: 192.168.100.10
  - [ ] Pi5-AI: 192.168.100.20
  - [ ] Pi4-Web: 192.168.100.30

### Environment Configuration
- [ ] Production .env file prepared
  - [ ] ENVIRONMENT=production
  - [ ] DATABASE_URL configured
  - [ ] PROD_SECRET_KEY set
  - [ ] DEBUG=False
  - [ ] AI_PROVIDER=ollama
  - [ ] OLLAMA_HOST=http://192.168.100.20:11434
  - [ ] CORS_ORIGINS updated with production IPs

---

## 🔧 PHYSICAL SETUP

### Workspace Preparation
- [ ] Clean, static-free workspace prepared
- [ ] Power strip with enough outlets (minimum 5)
- [ ] Good lighting for reading small text on Pis
- [ ] Ventilation/cooling for Raspberry Pis (they can get hot!)

### SD Card Preparation
- [ ] All 4 SD cards tested (no errors)
- [ ] All 4 SD cards formatted
- [ ] Labels prepared for each SD card:
  - [ ] "Pi4-Router - 192.168.100.1"
  - [ ] "Pi5-Main - 192.168.100.10"
  - [ ] "Pi5-AI - 192.168.100.20"
  - [ ] "Pi4-Web - 192.168.100.30"

---

## 🚀 DEPLOYMENT PHASES CHECKLIST

### Phase 1: Flash SD Cards ✓
- [ ] Pi4-Router SD card flashed
  - [ ] Hostname: pi4-router
  - [ ] SSH enabled
  - [ ] User: locket
  - [ ] Labeled and set aside

- [ ] Pi5-Main SD card flashed
  - [ ] Hostname: pi5-main
  - [ ] SSH enabled
  - [ ] User: locket
  - [ ] Labeled and set aside

- [ ] Pi5-AI SD card flashed
  - [ ] Hostname: pi5-ai
  - [ ] SSH enabled
  - [ ] User: locket
  - [ ] Labeled and set aside

- [ ] Pi4-Web SD card flashed
  - [ ] Hostname: pi4-web
  - [ ] SSH enabled
  - [ ] User: locket
  - [ ] Labeled and set aside

### Phase 2: Initial Setup (with internet)
- [ ] Pi4-Router initial boot
  - [ ] System updated: `sudo apt update && sudo apt upgrade -y`
  - [ ] Essential tools installed: hostapd, dnsmasq, iptables-persistent
  - [ ] SSH working from PC
  - [ ] IP address recorded: __________

- [ ] Pi5-Main initial boot
  - [ ] System updated
  - [ ] Docker installed
  - [ ] SSH working from PC
  - [ ] IP address recorded: __________

- [ ] Pi5-AI initial boot
  - [ ] System updated
  - [ ] Docker installed
  - [ ] SSH working from PC
  - [ ] IP address recorded: __________

- [ ] Pi4-Web initial boot
  - [ ] System updated
  - [ ] Docker installed (or Nginx if not using Docker)
  - [ ] SSH working from PC
  - [ ] IP address recorded: __________

### Phase 3: Network Configuration
- [ ] Pi4-Router configured as WiFi Access Point
  - [ ] Static IP set: 192.168.100.1
  - [ ] hostapd configured
  - [ ] dnsmasq (DHCP) configured
  - [ ] WiFi network "Locket-AirGap" visible
  - [ ] Can connect to WiFi from PC

- [ ] Static IPs configured
  - [ ] Pi5-Main: 192.168.100.10
  - [ ] Pi5-AI: 192.168.100.20
  - [ ] Pi4-Web: 192.168.100.30

- [ ] Network connectivity tested
  - [ ] Can ping Pi4-Router from all Pis
  - [ ] Can ping all Pis from PC via WiFi
  - [ ] Can SSH into all Pis from PC

### Phase 4: File Transfers
- [ ] Docker images transferred to Pi5-Main
  - [ ] postgres-15-alpine.tar uploaded
  - [ ] Images loaded: `docker load -i *.tar`
  - [ ] Images verified: `docker images`

- [ ] Docker images transferred to Pi5-AI
  - [ ] ollama-latest.tar uploaded
  - [ ] Image loaded
  - [ ] Image verified

- [ ] Application code transferred to Pi5-Main
  - [ ] Backend code uploaded to /home/locket/locket-app/
  - [ ] Frontend code uploaded (if serving from Main)
  - [ ] .env file uploaded and configured
  - [ ] docker-compose.production.yml uploaded

- [ ] Frontend files transferred to Pi4-Web
  - [ ] Production build files uploaded to /var/www/locket/
  - [ ] Nginx configured

- [ ] Ollama model transferred to Pi5-AI
  - [ ] Model files uploaded
  - [ ] Model accessible by Ollama container

- [ ] Python packages transferred to Pi5-Main
  - [ ] All packages uploaded
  - [ ] Dependencies installed offline

### Phase 5: Service Deployment
- [ ] PostgreSQL deployed on Pi5-Main
  - [ ] Container started
  - [ ] Database initialized
  - [ ] Test connection successful
  - [ ] Health check passing

- [ ] Backend API deployed on Pi5-Main
  - [ ] Container built
  - [ ] Container started
  - [ ] Environment variables verified
  - [ ] API health endpoint responding: http://192.168.100.10:8001/api/health
  - [ ] Logs show no errors

- [ ] Ollama deployed on Pi5-AI
  - [ ] Container started
  - [ ] Model loaded
  - [ ] API responding: http://192.168.100.20:11434/api/tags
  - [ ] Test generation successful

- [ ] Frontend deployed on Pi4-Web
  - [ ] Nginx installed and configured
  - [ ] Static files served correctly
  - [ ] Proxy to backend working
  - [ ] Application accessible: http://192.168.100.30

### Phase 6: Integration Testing
- [ ] End-to-end test from PC
  - [ ] Connected to Locket-AirGap WiFi
  - [ ] Can access frontend at http://192.168.100.30
  - [ ] Can register/login
  - [ ] Can upload document
  - [ ] Can search documents
  - [ ] Can chat with AI
  - [ ] AI responses working correctly

- [ ] Performance testing
  - [ ] Document upload speed acceptable
  - [ ] Search response time acceptable (<2s)
  - [ ] AI chat response time acceptable (<10s)
  - [ ] No memory issues on any Pi
  - [ ] CPU temperatures within safe range (<80°C)

- [ ] Stress testing
  - [ ] Multiple users can connect simultaneously
  - [ ] Large document upload (50+ MB) works
  - [ ] Multiple concurrent searches work
  - [ ] System remains stable under load

### Phase 7: Documentation & Handoff
- [ ] Documentation finalized
  - [ ] Network diagram updated with actual IPs
  - [ ] Passwords documented securely
  - [ ] Quick reference card printed
  - [ ] Troubleshooting guide reviewed

- [ ] Backup procedures established
  - [ ] Initial backup created
  - [ ] Backup location documented
  - [ ] Restore procedure tested

- [ ] Monitoring setup
  - [ ] Health check script created
  - [ ] Log rotation configured
  - [ ] Alert mechanism established (if needed)

---

## ⚠️ CRITICAL CHECKS BEFORE GOING FULLY AIR-GAPPED

- [ ] All Pis are fully functional
- [ ] All services start automatically on boot
- [ ] Full system reboot test performed (all Pis powered off and back on)
- [ ] Application still works after reboot
- [ ] Backup of all SD cards created (disk images saved)
- [ ] All passwords documented and stored securely
- [ ] Team trained on basic operations (start/stop, logs, SSH)
- [ ] Emergency recovery plan documented

---

## 📋 POST-DEPLOYMENT CHECKLIST

### Daily Checks (First Week)
- [ ] Check CPU temperatures on all Pis
- [ ] Check disk space on all Pis
- [ ] Check Docker container status
- [ ] Review system logs for errors
- [ ] Test basic application functions

### Weekly Checks
- [ ] Full system health check
- [ ] Database backup created
- [ ] Application backup created
- [ ] Performance metrics reviewed
- [ ] Security audit performed

### Monthly Checks
- [ ] Full system backup (SD card images)
- [ ] Review and update documentation
- [ ] Test disaster recovery procedure
- [ ] Review and rotate logs

---

## 🆘 EMERGENCY CONTACT INFO

**System Administrator:** __________
**Phone:** __________
**Email:** __________

**Backup Contact:** __________
**Phone:** __________
**Email:** __________

**Deployment Date:** __________
**Last Updated:** __________
**Deployed By:** __________

---

## 📝 NOTES & ISSUES ENCOUNTERED

Use this space to document any issues you encountered and how you resolved them:

1. _______________________________________________________________
   _______________________________________________________________

2. _______________________________________________________________
   _______________________________________________________________

3. _______________________________________________________________
   _______________________________________________________________

4. _______________________________________________________________
   _______________________________________________________________

5. _______________________________________________________________
   _______________________________________________________________

---

## ✅ FINAL SIGN-OFF

- [ ] All checklist items completed
- [ ] System is fully operational
- [ ] Documentation is complete and accurate
- [ ] Backups are created and verified
- [ ] Team is trained and ready to manage the system
- [ ] Emergency procedures are documented and understood

**Signed:** _______________  **Date:** _______________

**Witnessed by:** _______________  **Date:** _______________

---

**CONGRATULATIONS! Your air-gapped Locket deployment is complete! 🎉**

Keep this checklist with your deployment documentation for future reference.
