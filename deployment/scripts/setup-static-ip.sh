#!/bin/bash
# Static IP Configuration Script for Locket Air-Gapped Deployment
# Run this on each Raspberry Pi to set static IP

set -e  # Exit on error

echo "========================================"
echo "  Locket Static IP Configuration"
echo "========================================"
echo ""

# Check if running as locket user
if [ "$USER" != "locket" ]; then
    echo "ERROR: This script must be run as the 'locket' user"
    echo "Current user: $USER"
    exit 1
fi

# Display current hostname
CURRENT_HOSTNAME=$(hostname)
echo "Current hostname: $CURRENT_HOSTNAME"
echo ""

# Determine IP based on hostname
case "$CURRENT_HOSTNAME" in
    "pi4-router")
        STATIC_IP="192.168.100.1"
        ROLE="Gateway / WiFi Access Point"
        ;;
    "pi5-main")
        STATIC_IP="192.168.100.10"
        ROLE="Backend + Database Server"
        ;;
    "pi5-ai")
        STATIC_IP="192.168.100.20"
        ROLE="Ollama AI Server"
        ;;
    "pi4-web")
        STATIC_IP="192.168.100.30"
        ROLE="Frontend Web Server"
        ;;
    *)
        echo "ERROR: Unknown hostname '$CURRENT_HOSTNAME'"
        echo "Expected one of: pi4-router, pi5-main, pi5-ai, pi4-web"
        echo ""
        echo "Set hostname first with: sudo hostnamectl set-hostname [hostname]"
        exit 1
        ;;
esac

echo "Detected Configuration:"
echo "  Hostname: $CURRENT_HOSTNAME"
echo "  Role: $ROLE"
echo "  Static IP: $STATIC_IP"
echo ""
read -p "Is this correct? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Configuring static IP..."

# Backup existing configuration
if [ -f /etc/dhcpcd.conf ]; then
    sudo cp /etc/dhcpcd.conf /etc/dhcpcd.conf.backup.$(date +%Y%m%d_%H%M%S)
    echo "✓ Backed up existing dhcpcd.conf"
fi

# For Pi4-Router (WiFi AP), configure wlan0
if [ "$CURRENT_HOSTNAME" = "pi4-router" ]; then
    echo ""
    echo "Configuring WiFi Access Point (wlan0)..."

    sudo tee -a /etc/dhcpcd.conf > /dev/null <<EOF

# Static IP for Locket Air-Gapped Network (WiFi AP)
interface wlan0
static ip_address=$STATIC_IP/24
nohook wpa_supplicant
EOF

    echo "✓ WiFi static IP configured: $STATIC_IP"
else
    # For all other Pis, configure Ethernet (eth0)
    echo ""
    echo "Configuring Ethernet (eth0)..."

    sudo tee -a /etc/dhcpcd.conf > /dev/null <<EOF

# Static IP for Locket Air-Gapped Network
interface eth0
static ip_address=$STATIC_IP/24
static routers=192.168.100.1
static domain_name_servers=192.168.100.1 8.8.8.8
EOF

    echo "✓ Ethernet static IP configured: $STATIC_IP"
fi

echo ""
echo "=========================================="
echo "  Configuration Complete!"
echo "=========================================="
echo ""
echo "Changes made:"
echo "  - Static IP set to: $STATIC_IP"
echo "  - Gateway: 192.168.100.1"
echo "  - DNS: 192.168.100.1, 8.8.8.8"
echo ""
echo "⚠️  REBOOT REQUIRED for changes to take effect"
echo ""
read -p "Reboot now? (y/n): " REBOOT

if [ "$REBOOT" = "y" ] || [ "$REBOOT" = "Y" ]; then
    echo "Rebooting in 3 seconds..."
    sleep 3
    sudo reboot
else
    echo ""
    echo "Remember to reboot later with: sudo reboot"
    echo ""
    echo "After reboot, verify with:"
    echo "  ip addr show"
    echo "  ping 192.168.100.1"
fi
