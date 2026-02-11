# LOCKET AIR-GAPPED DEPLOYMENT - START HERE

Welcome to the Locket Air-Gapped Deployment Guide! This README will guide you through deploying your document AI system on 4 Raspberry Pis in a completely offline environment.

---

## 📚 DOCUMENTATION INDEX

Your complete deployment documentation:

1. **[README.md](./README.md)** ← You are here! Start here for overview and roadmap
2. **[PRE_FLIGHT_CHECKLIST.md](./PRE_FLIGHT_CHECKLIST.md)** - Print this! Check off items as you go
3. **[PREPARE_OFFLINE_DEPLOYMENT.md](./PREPARE_OFFLINE_DEPLOYMENT.md)** - Download all dependencies BEFORE going offline
4. **[AIR_GAPPED_DEPLOYMENT_GUIDE.md](./AIR_GAPPED_DEPLOYMENT_GUIDE.md)** - Complete step-by-step deployment guide
5. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Print this! Keep it handy for daily operations

### Automation Scripts (in `scripts/` folder)
- `setup-static-ip.sh` - Automatically configure static IP on each Pi
- `setup-wifi-ap.sh` - Configure Pi4-Router as WiFi access point

---

## 🎯 QUICK START (5-MINUTE OVERVIEW)

### What You're Building

A completely **air-gapped** (offline) document AI system on 4 Raspberry Pis:

```
┌─────────────────────────────────────────────┐
│      Locket Air-Gapped Network              │
│                                             │
│  [Pi4-Router] ──┬── [Pi5-Main]             │
│   WiFi Gateway  │    Backend+DB            │
│                 │                           │
│                 ├── [Pi5-AI]               │
│                 │    Ollama AI             │
│                 │                           │
│                 └── [Pi4-Web]              │
│                      Frontend              │
│                                             │
│  Your PC connects via WiFi                 │
└─────────────────────────────────────────────┘
```

### Your Hardware
- **Pi4-Router** (2GB, 32GB): Network gateway with WiFi access point
- **Pi5-Main** (8GB, 128GB): PostgreSQL database + FastAPI backend
- **Pi5-AI** (8GB, 128GB): Ollama AI service with LLM
- **Pi4-Web** (2GB, 32GB): Nginx frontend web server

### How You'll Connect
- **PuTTY** - SSH into Pis from your Windows PC (terminal access)
- **WinSCP** - Transfer files between your PC and Pis (drag & drop)
- **WiFi** - Your PC connects to "Locket-AirGap" network created by Pi4-Router

---

## 🚀 DEPLOYMENT ROADMAP

Follow this order:

### Phase 0: Pre-Deployment (CRITICAL - Do First!)
⏱️ **Time:** 2-4 hours
📍 **Location:** Any place with good internet

**What to do:**
1. Read [PREPARE_OFFLINE_DEPLOYMENT.md](./PREPARE_OFFLINE_DEPLOYMENT.md)
2. Download ALL required files:
   - Raspberry Pi OS images
   - Docker images
   - Ollama AI model (~3GB)
   - Python packages
   - Your application code
3. Print out [PRE_FLIGHT_CHECKLIST.md](./PRE_FLIGHT_CHECKLIST.md)
4. Download and install PuTTY and WinSCP on your Windows PC

**⚠️ DON'T SKIP THIS!** You can't download anything once you're air-gapped!

---

### Phase 1: Flash SD Cards
⏱️ **Time:** 1-2 hours
📍 **Location:** Can be done offline

**What to do:**
1. Use Raspberry Pi Imager to flash all 4 microSD cards
2. Configure SSH, username (locket), and hostname for each
3. Label each card clearly: Pi4-Router, Pi5-Main, Pi5-AI, Pi4-Web

**📖 Guide:** [AIR_GAPPED_DEPLOYMENT_GUIDE.md - Phase 2](./AIR_GAPPED_DEPLOYMENT_GUIDE.md#phase-2-flash-microsd-cards)

---

### Phase 2: Initial Setup (Temporarily use internet)
⏱️ **Time:** 2-3 hours
📍 **Location:** Needs internet connection (temporarily)

**What to do:**
1. Boot each Pi one at a time (use keyboard + monitor)
2. Update system: `sudo apt update && sudo apt upgrade`
3. Install Docker on Pi 5s
4. Test SSH connection from your Windows PC using PuTTY
5. Run initial setup while you have internet access

**💡 Tip:** This is your LAST chance to download anything!

**📖 Guide:** [AIR_GAPPED_DEPLOYMENT_GUIDE.md - Phase 3](./AIR_GAPPED_DEPLOYMENT_GUIDE.md#phase-3-initial-pi-setup)

---

### Phase 3: Network Configuration (Go Air-Gapped!)
⏱️ **Time:** 1-2 hours
📍 **Location:** Can now be offline

**What to do:**
1. Configure Pi4-Router as WiFi Access Point
   - Run script: `sudo bash setup-wifi-ap.sh`
   - Or follow manual steps in guide
2. Configure static IPs on all Pis
   - Run script: `bash setup-static-ip.sh` on each Pi
   - Or configure manually
3. Connect all Pis to network switch via Ethernet
4. Test connectivity: Connect your PC to "Locket-AirGap" WiFi

**📖 Guide:** [AIR_GAPPED_DEPLOYMENT_GUIDE.md - Phase 4](./AIR_GAPPED_DEPLOYMENT_GUIDE.md#phase-4-network-configuration)

---

### Phase 4: Transfer Files
⏱️ **Time:** 1-2 hours (depends on file sizes)
📍 **Location:** Offline

**What to do:**
1. Open WinSCP on your PC
2. Connect to each Pi via WiFi
3. Transfer files:
   - Application code to Pi5-Main
   - Docker images to Pi5-Main and Pi5-AI
   - Ollama model to Pi5-AI
   - Frontend build to Pi4-Web
   - Python packages to Pi5-Main

**💡 Tip:** Transfer can be slow over WiFi. Use Ethernet if possible!

**📖 Guide:** [AIR_GAPPED_DEPLOYMENT_GUIDE.md - Phase 5](./AIR_GAPPED_DEPLOYMENT_GUIDE.md#phase-5-install-docker--dependencies)

---

### Phase 5: Deploy Services
⏱️ **Time:** 2-3 hours
📍 **Location:** Offline

**What to do:**
1. **On Pi5-Main:** Deploy PostgreSQL and Backend
   - Load Docker images
   - Configure .env file
   - Run `docker compose up -d`
   - Initialize database

2. **On Pi5-AI:** Deploy Ollama
   - Load Docker image
   - Copy AI model
   - Start Ollama container
   - Verify model is accessible

3. **On Pi4-Web:** Deploy Frontend
   - Install Nginx
   - Copy frontend files
   - Configure reverse proxy to backend
   - Start Nginx

**📖 Guide:** [AIR_GAPPED_DEPLOYMENT_GUIDE.md - Phase 6](./AIR_GAPPED_DEPLOYMENT_GUIDE.md#phase-6-deploy-application)

---

### Phase 6: Testing
⏱️ **Time:** 1 hour
📍 **Location:** Offline

**What to do:**
1. From your PC (connected to Locket-AirGap WiFi):
   - Open http://192.168.100.30
   - Register a user account
   - Upload a test document
   - Search for the document
   - Test AI chat functionality
2. Verify all services are healthy
3. Check logs for errors
4. Test system reboot (power cycle all Pis)

**📖 Guide:** [AIR_GAPPED_DEPLOYMENT_GUIDE.md - Phase 7](./AIR_GAPPED_DEPLOYMENT_GUIDE.md#phase-7-testing--verification)

---

### Phase 7: Backup & Documentation
⏱️ **Time:** 30 minutes
📍 **Location:** Offline

**What to do:**
1. Create full system backup (SD card images)
2. Backup database
3. Document all passwords securely
4. Print [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for daily use
5. Test backup restore procedure

---

## ⏰ TOTAL TIME ESTIMATE

- **Minimum:** 10-12 hours (spread over 2-3 days)
- **Realistic:** 15-20 hours (including troubleshooting)
- **With help:** 8-10 hours (if someone experienced guides you)

**💡 Recommendation:** Don't rush! Take breaks. Do one phase per day.

---

## 🛠️ TOOLS YOU'LL NEED

### Software (Download First!)
- [ ] Raspberry Pi Imager - https://www.raspberrypi.com/software/
- [ ] PuTTY (SSH client) - https://www.putty.org/
- [ ] WinSCP (file transfer) - https://winscp.net/

### Hardware
- [ ] 4x Raspberry Pis (2x Pi5 8GB, 2x Pi4 2GB)
- [ ] 4x Power supplies
- [ ] 4x MicroSD cards (2x 128GB, 2x 32GB)
- [ ] 1x Network switch
- [ ] 4x Ethernet cables
- [ ] 1x USB keyboard + HDMI cable (for setup)
- [ ] 2-3x USB drives (for file transfer)

---

## 🔒 SECURITY CHECKLIST

- [ ] Strong WiFi password set (12+ characters)
- [ ] Strong SSH password set for 'locket' user
- [ ] Unique PROD_SECRET_KEY generated for backend
- [ ] Database password changed from default
- [ ] All passwords documented and stored securely
- [ ] Regular backups scheduled
- [ ] Physical security for Raspberry Pis ensured

---

## 🆘 GETTING HELP

### If you get stuck:

1. **Check the guides** - Most questions are answered in the detailed guides
2. **Check logs** - `docker logs [container-name]` shows what went wrong
3. **Check the troubleshooting section** - Common issues and solutions
4. **Print the Quick Reference** - Has all the commands you need

### Common Issues:

| Problem | Solution |
|---------|----------|
| Can't SSH into Pi | Check IP with `ip addr show`, verify network connection |
| Docker won't start | Check logs: `docker logs [container]`, verify .env file |
| WiFi network not visible | Verify hostapd is running: `sudo systemctl status hostapd` |
| Ollama not responding | Check if model is loaded: `docker exec ollama ollama list` |
| Frontend won't load | Check Nginx: `sudo systemctl status nginx`, check proxy config |

**📖 Full Troubleshooting:** [AIR_GAPPED_DEPLOYMENT_GUIDE.md - Troubleshooting](./AIR_GAPPED_DEPLOYMENT_GUIDE.md#troubleshooting)

---

## 📖 DETAILED GUIDES

Once you're ready to start:

1. **First:** Read [PREPARE_OFFLINE_DEPLOYMENT.md](./PREPARE_OFFLINE_DEPLOYMENT.md) - Download everything!
2. **Second:** Print [PRE_FLIGHT_CHECKLIST.md](./PRE_FLIGHT_CHECKLIST.md) - Track your progress
3. **Third:** Follow [AIR_GAPPED_DEPLOYMENT_GUIDE.md](./AIR_GAPPED_DEPLOYMENT_GUIDE.md) - Step-by-step deployment
4. **Keep handy:** [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Daily operations reference

---

## 🎓 BEGINNER'S GUIDE TO SSH (PuTTY) & FILE TRANSFER (WinSCP)

### Using PuTTY (SSH Terminal Access)

**What is SSH?** Secure Shell - lets you control a Pi remotely via command line.

**How to use PuTTY:**
1. Download and install PuTTY from https://www.putty.org/
2. Open PuTTY
3. Enter Pi's IP address (e.g., 192.168.100.10)
4. Port: 22 (default)
5. Connection type: SSH
6. Click "Open"
7. Login as: `locket`
8. Password: [your Pi password]
9. You're now controlling the Pi!

**Example:**
```
PuTTY Configuration:
  Host Name: 192.168.100.10
  Port: 22
  Connection type: SSH

After clicking "Open":
  login as: locket
  password: ********
  locket@pi5-main:~ $
```

### Using WinSCP (File Transfer)

**What is WinSCP?** Windows Secure Copy - lets you drag & drop files to/from Pis.

**How to use WinSCP:**
1. Download and install WinSCP from https://winscp.net/
2. Open WinSCP
3. Click "New Site"
4. File protocol: SFTP
5. Host name: 192.168.100.10 (Pi's IP)
6. Port: 22
7. User name: locket
8. Password: [your Pi password]
9. Click "Login"
10. Left side = Your PC, Right side = Raspberry Pi
11. Drag & drop files between them!

**Example:**
```
WinSCP New Site:
  File protocol: SFTP
  Host name: 192.168.100.10
  Port number: 22
  User name: locket
  Password: ********

After login:
  Left: C:\Users\YourName\Downloads\
  Right: /home/locket/

Just drag files from left to right to upload!
```

---

## ✅ WHAT SUCCESS LOOKS LIKE

When everything is working, you should be able to:

1. **Connect** to "Locket-AirGap" WiFi from your PC
2. **Access** the application at http://192.168.100.30
3. **Register** a user account
4. **Upload** documents (PDF, DOCX, TXT)
5. **Search** for documents
6. **Chat** with AI about your documents
7. **SSH** into any Pi for management
8. **Transfer** files using WinSCP

All of this **without any internet connection!**

---

## 🎉 READY TO BEGIN?

1. ✅ Read this README completely
2. ✅ Download PuTTY and WinSCP
3. ✅ Print [PRE_FLIGHT_CHECKLIST.md](./PRE_FLIGHT_CHECKLIST.md)
4. ✅ Follow [PREPARE_OFFLINE_DEPLOYMENT.md](./PREPARE_OFFLINE_DEPLOYMENT.md) to download all dependencies
5. ✅ Start [AIR_GAPPED_DEPLOYMENT_GUIDE.md](./AIR_GAPPED_DEPLOYMENT_GUIDE.md)

**Good luck! You've got this! 🚀**

---

## 📞 SUPPORT

If you encounter issues not covered in the documentation:
- Check the troubleshooting section in the main guide
- Review Docker logs for error messages
- Verify all prerequisites are met
- Double-check network connectivity

Remember: Take your time, follow the steps carefully, and don't skip the preparation phase!

---

**Last Updated:** February 2026
**Version:** 1.0
**For:** Locket Air-Gapped Deployment on Raspberry Pi
