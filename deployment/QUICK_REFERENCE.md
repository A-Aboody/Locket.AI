# LOCKET AIR-GAPPED - QUICK REFERENCE CARD

Print this out and keep it handy!

---

## NETWORK MAP

```
Device          IP Address        Role                SSH Command
─────────────────────────────────────────────────────────────────
Pi4-Router      192.168.100.1     WiFi Gateway        ssh locket@192.168.100.1
Pi5-Main        192.168.100.10    Backend+Database    ssh locket@192.168.100.10
Pi5-AI          192.168.100.20    Ollama AI           ssh locket@192.168.100.20
Pi4-Web         192.168.100.30    Frontend Server     ssh locket@192.168.100.30
```

**WiFi Network:** Locket-AirGap
**WiFi Password:** [Your WiFi password]
**SSH Username:** locket
**SSH Password:** [Your Pi password]

---

## ACCESS URLS

From your PC (connected to Locket-AirGap WiFi):

- **Locket Application:** http://192.168.100.30
- **Backend API:** http://192.168.100.10:8001
- **API Health Check:** http://192.168.100.10:8001/api/health
- **Ollama API:** http://192.168.100.20:11434
- **API Documentation:** http://192.168.100.10:8001/docs

---

## COMMON COMMANDS

### Check if services are running

**On Pi5-Main (Backend):**
```bash
ssh locket@192.168.100.10
docker ps
docker compose -f docker-compose.production.yml ps
```

**On Pi5-AI (Ollama):**
```bash
ssh locket@192.168.100.20
docker ps
curl http://localhost:11434/api/tags
```

**On Pi4-Web (Frontend):**
```bash
ssh locket@192.168.100.30
sudo systemctl status nginx
```

### Restart services

**Restart Backend:**
```bash
ssh locket@192.168.100.10
cd /home/locket/locket-app
docker compose -f docker-compose.production.yml restart
```

**Restart Ollama:**
```bash
ssh locket@192.168.100.20
docker restart ollama
```

**Restart Frontend:**
```bash
ssh locket@192.168.100.30
sudo systemctl restart nginx
```

### View logs

**Backend logs:**
```bash
ssh locket@192.168.100.10
docker logs locket-backend -f
```

**Database logs:**
```bash
ssh locket@192.168.100.10
docker logs locket-postgres -f
```

**Ollama logs:**
```bash
ssh locket@192.168.100.20
docker logs ollama -f
```

**Nginx logs:**
```bash
ssh locket@192.168.100.30
sudo tail -f /var/log/nginx/error.log
```

### Stop everything

**Stop Backend:**
```bash
ssh locket@192.168.100.10
cd /home/locket/locket-app
docker compose -f docker-compose.production.yml down
```

**Stop Ollama:**
```bash
ssh locket@192.168.100.20
docker stop ollama
```

**Stop Frontend:**
```bash
ssh locket@192.168.100.30
sudo systemctl stop nginx
```

### Start everything

```bash
# Start Ollama first
ssh locket@192.168.100.20 "docker start ollama"

# Wait 10 seconds, then start Backend
ssh locket@192.168.100.10 "cd /home/locket/locket-app && docker compose -f docker-compose.production.yml up -d"

# Start Frontend
ssh locket@192.168.100.30 "sudo systemctl start nginx"
```

---

## SYSTEM HEALTH CHECKS

### Check disk space
```bash
df -h
```

### Check memory usage
```bash
free -h
```

### Check CPU temperature (important for Pis!)
```bash
vcgencmd measure_temp
```

### Check all Docker containers
```bash
docker ps -a
```

### Check Docker disk usage
```bash
docker system df
```

---

## BACKUP COMMANDS

### Backup database
```bash
ssh locket@192.168.100.10
docker exec locket-postgres pg_dump -U doc_user document_retrieval > ~/backup-$(date +%Y%m%d).sql
```

### Backup uploaded documents
```bash
# From your PC using WinSCP
# Connect to 192.168.100.10
# Download: /home/locket/locket-app/backend/uploads
```

### Backup configuration files
```bash
ssh locket@192.168.100.10
cd /home/locket/locket-app
tar -czf config-backup-$(date +%Y%m%d).tar.gz backend/.env docker-compose.production.yml
```

---

## TROUBLESHOOTING QUICK FIXES

### Application won't load
1. Check if WiFi is connected to "Locket-AirGap"
2. Ping backend: `ping 192.168.100.10`
3. Check backend status: `ssh locket@192.168.100.10 "docker ps"`
4. Check Nginx: `ssh locket@192.168.100.30 "sudo systemctl status nginx"`

### "AI not responding"
1. Check Ollama: `ssh locket@192.168.100.20 "docker ps"`
2. Test Ollama: `curl http://192.168.100.20:11434/api/tags`
3. Restart Ollama: `ssh locket@192.168.100.20 "docker restart ollama"`
4. Check if model is loaded: `ssh locket@192.168.100.20 "docker exec ollama ollama list"`

### Database connection error
1. Check if PostgreSQL is running: `ssh locket@192.168.100.10 "docker ps | grep postgres"`
2. Check logs: `ssh locket@192.168.100.10 "docker logs locket-postgres"`
3. Restart database: `ssh locket@192.168.100.10 "docker restart locket-postgres"`

### Pi not responding
1. Check power cable connection
2. Look at LED lights on Pi (should be solid red power, flashing green activity)
3. Try connecting monitor + keyboard directly
4. Last resort: Power cycle the Pi (unplug, wait 10 seconds, plug back in)

---

## POWER MANAGEMENT

### Safe shutdown order
```bash
# 1. Stop application services first
ssh locket@192.168.100.10 "cd /home/locket/locket-app && docker compose -f docker-compose.production.yml down"

# 2. Stop Ollama
ssh locket@192.168.100.20 "docker stop ollama"

# 3. Stop frontend
ssh locket@192.168.100.30 "sudo systemctl stop nginx"

# 4. Shutdown each Pi
ssh locket@192.168.100.10 "sudo shutdown -h now"
ssh locket@192.168.100.20 "sudo shutdown -h now"
ssh locket@192.168.100.30 "sudo shutdown -h now"
ssh locket@192.168.100.1 "sudo shutdown -h now"

# 5. Wait 30 seconds for all Pis to shutdown (green LEDs stop flashing)
# 6. Now safe to unplug power
```

### Startup order
```bash
# 1. Power on all Pis (wait 1-2 minutes for boot)

# 2. Verify network is up
ping 192.168.100.1

# 3. Start Ollama
ssh locket@192.168.100.20 "docker start ollama"

# 4. Wait 30 seconds, then start backend
ssh locket@192.168.100.10 "cd /home/locket/locket-app && docker compose -f docker-compose.production.yml up -d"

# 5. Start frontend (if not auto-started)
ssh locket@192.168.100.30 "sudo systemctl start nginx"

# 6. Wait 1 minute, then test: http://192.168.100.30
```

---

## UPDATING THE APPLICATION

### Update backend code
```bash
# 1. Transfer new code via WinSCP to Pi5-Main
# 2. SSH into Pi5-Main
ssh locket@192.168.100.10

# 3. Navigate to app directory
cd /home/locket/locket-app

# 4. Rebuild and restart
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml build --no-cache
docker compose -f docker-compose.production.yml up -d

# 5. Check logs
docker logs locket-backend -f
```

### Update frontend
```bash
# 1. Transfer new build files via WinSCP to Pi4-Web
# Upload to: /var/www/locket/

# 2. Restart Nginx
ssh locket@192.168.100.30
sudo systemctl restart nginx

# 3. Clear browser cache and reload: http://192.168.100.30
```

---

## FILE TRANSFER WITH WINSCP

**Quick Steps:**
1. Open WinSCP
2. New Session
   - Protocol: SFTP
   - Host: 192.168.100.[1|10|20|30]
   - Port: 22
   - Username: locket
   - Password: [your password]
3. Click "Login"
4. Drag and drop files between local (left) and remote (right)

**Common Transfer Locations:**
- Application code: `/home/locket/locket-app/`
- Backend uploads: `/home/locket/locket-app/backend/uploads/`
- Frontend files: `/var/www/locket/`
- Database backups: `/home/locket/`

---

## PERFORMANCE MONITORING

### Check system stats on all Pis

**Quick script to run from your PC (Git Bash or WSL):**
```bash
# Save this as check-all-pis.sh
#!/bin/bash
echo "=== Pi4-Router (Gateway) ==="
ssh locket@192.168.100.1 "echo 'Temp:' && vcgencmd measure_temp && echo 'Memory:' && free -h | grep Mem && echo 'Disk:' && df -h / | tail -1"

echo -e "\n=== Pi5-Main (Backend) ==="
ssh locket@192.168.100.10 "echo 'Temp:' && vcgencmd measure_temp && echo 'Memory:' && free -h | grep Mem && echo 'Disk:' && df -h / | tail -1 && echo 'Docker:' && docker stats --no-stream"

echo -e "\n=== Pi5-AI (Ollama) ==="
ssh locket@192.168.100.20 "echo 'Temp:' && vcgencmd measure_temp && echo 'Memory:' && free -h | grep Mem && echo 'Disk:' && df -h / | tail -1 && echo 'Docker:' && docker stats --no-stream"

echo -e "\n=== Pi4-Web (Frontend) ==="
ssh locket@192.168.100.30 "echo 'Temp:' && vcgencmd measure_temp && echo 'Memory:' && free -h | grep Mem && echo 'Disk:' && df -h / | tail -1"
```

Run: `bash check-all-pis.sh`

---

## EMERGENCY CONTACTS

**If something breaks:**
1. Check this guide first
2. Check the full deployment guide: AIR_GAPPED_DEPLOYMENT_GUIDE.md
3. Check Docker logs
4. If all else fails, safely shutdown and restart everything

**Important:** Never force power off a Raspberry Pi! Always use `sudo shutdown -h now`

---

## QUICK PIN REFERENCE

Default credentials (CHANGE THESE!):
- SSH Username: `locket`
- SSH Password: `[you set this during SD card flashing]`
- WiFi SSID: `Locket-AirGap`
- WiFi Password: `[you set this in hostapd.conf]`
- Database User: `doc_user`
- Database Password: `seniordesign4` (change in production!)

---

**Last Updated:** [DATE]
**Deployed By:** [YOUR NAME]
**Support:** Check deployment documentation in `/deployment/` folder
