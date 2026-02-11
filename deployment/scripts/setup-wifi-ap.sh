#!/bin/bash
# WiFi Access Point Setup Script for Pi4-Router
# This configures the Pi4-Router as a WiFi Access Point for the air-gapped network

set -e  # Exit on error

echo "============================================"
echo "  Locket WiFi Access Point Setup"
echo "  Pi4-Router Configuration"
echo "============================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: This script must be run as root"
    echo "Please run: sudo bash setup-wifi-ap.sh"
    exit 1
fi

# Check if running on pi4-router
CURRENT_HOSTNAME=$(hostname)
if [ "$CURRENT_HOSTNAME" != "pi4-router" ]; then
    echo "WARNING: Current hostname is '$CURRENT_HOSTNAME'"
    echo "This script is designed for 'pi4-router'"
    echo ""
    read -p "Continue anyway? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
        exit 0
    fi
fi

# Check if required packages are installed
echo "Checking required packages..."
REQUIRED_PACKAGES="hostapd dnsmasq iptables-persistent"
MISSING_PACKAGES=""

for pkg in $REQUIRED_PACKAGES; do
    if ! dpkg -l | grep -q "^ii  $pkg"; then
        MISSING_PACKAGES="$MISSING_PACKAGES $pkg"
    fi
done

if [ -n "$MISSING_PACKAGES" ]; then
    echo "Missing packages:$MISSING_PACKAGES"
    echo ""
    read -p "Install missing packages? (y/n): " INSTALL
    if [ "$INSTALL" = "y" ] || [ "$INSTALL" = "Y" ]; then
        apt update
        apt install -y $MISSING_PACKAGES
        echo "✓ Packages installed"
    else
        echo "ERROR: Required packages not installed. Aborting."
        exit 1
    fi
else
    echo "✓ All required packages installed"
fi

echo ""
echo "WiFi Access Point Configuration"
echo "================================"
echo ""

# Get WiFi password
echo "Enter WiFi password for 'Locket-AirGap' network"
echo "(Minimum 8 characters, recommended: 12+ with mixed characters)"
while true; do
    read -sp "WiFi Password: " WIFI_PASSWORD
    echo ""
    read -sp "Confirm Password: " WIFI_PASSWORD_CONFIRM
    echo ""

    if [ "$WIFI_PASSWORD" != "$WIFI_PASSWORD_CONFIRM" ]; then
        echo "ERROR: Passwords do not match. Try again."
        continue
    fi

    if [ ${#WIFI_PASSWORD} -lt 8 ]; then
        echo "ERROR: Password must be at least 8 characters. Try again."
        continue
    fi

    break
done

echo ""
echo "Configuration Summary:"
echo "  SSID: Locket-AirGap"
echo "  Password: ********** (${#WIFI_PASSWORD} characters)"
echo "  IP Address: 192.168.100.1"
echo "  DHCP Range: 192.168.100.50 - 192.168.100.150"
echo "  Channel: 7"
echo ""
read -p "Proceed with this configuration? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Step 1/5: Configuring hostapd (WiFi Access Point)..."

# Backup existing config
if [ -f /etc/hostapd/hostapd.conf ]; then
    cp /etc/hostapd/hostapd.conf /etc/hostapd/hostapd.conf.backup.$(date +%Y%m%d_%H%M%S)
fi

# Create hostapd configuration
cat > /etc/hostapd/hostapd.conf <<EOF
# Locket Air-Gapped Network - WiFi Access Point Configuration
# Interface configuration
interface=wlan0
driver=nl80211

# Network configuration
ssid=Locket-AirGap
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0

# Security configuration (WPA2)
wpa=2
wpa_passphrase=$WIFI_PASSWORD
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP

# Optional: Limit to 802.11g/n for better compatibility
ieee80211n=1
country_code=US
EOF

chmod 600 /etc/hostapd/hostapd.conf
echo "✓ hostapd configured"

# Update hostapd defaults
sed -i 's|^#DAEMON_CONF=.*|DAEMON_CONF="/etc/hostapd/hostapd.conf"|' /etc/default/hostapd
echo "✓ hostapd defaults updated"

echo ""
echo "Step 2/5: Configuring dnsmasq (DHCP server)..."

# Backup existing config
if [ -f /etc/dnsmasq.conf ]; then
    mv /etc/dnsmasq.conf /etc/dnsmasq.conf.backup.$(date +%Y%m%d_%H%M%S)
fi

# Create dnsmasq configuration
cat > /etc/dnsmasq.conf <<EOF
# Locket Air-Gapped Network - DHCP Server Configuration
interface=wlan0
dhcp-range=192.168.100.50,192.168.100.150,255.255.255.0,24h
domain=locket.local
address=/locket.local/192.168.100.1

# Static IP reservations (optional - add MAC addresses as needed)
# dhcp-host=aa:bb:cc:dd:ee:ff,192.168.100.100

# Logging (optional)
log-dhcp
log-queries
EOF

echo "✓ dnsmasq configured"

echo ""
echo "Step 3/5: Configuring network interface (dhcpcd)..."

# The static IP should already be set by setup-static-ip.sh
# Just verify it exists
if ! grep -q "interface wlan0" /etc/dhcpcd.conf; then
    echo "Adding static IP configuration to dhcpcd.conf..."
    cat >> /etc/dhcpcd.conf <<EOF

# Static IP for Locket Air-Gapped Network (WiFi AP)
interface wlan0
static ip_address=192.168.100.1/24
nohook wpa_supplicant
EOF
    echo "✓ Static IP configured"
else
    echo "✓ Static IP already configured"
fi

echo ""
echo "Step 4/5: Configuring IP forwarding (optional)..."

# Enable IP forwarding (useful if you want to route traffic between networks)
if ! grep -q "^net.ipv4.ip_forward=1" /etc/sysctl.conf; then
    echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
    sysctl -w net.ipv4.ip_forward=1
    echo "✓ IP forwarding enabled"
else
    echo "✓ IP forwarding already enabled"
fi

echo ""
echo "Step 5/5: Enabling and starting services..."

# Unmask and enable services
systemctl unmask hostapd
systemctl enable hostapd
systemctl enable dnsmasq
echo "✓ Services enabled"

# Stop services (if running) before starting with new config
systemctl stop hostapd 2>/dev/null || true
systemctl stop dnsmasq 2>/dev/null || true

# Start services
systemctl start hostapd
systemctl start dnsmasq
echo "✓ Services started"

echo ""
echo "Checking service status..."
sleep 2

HOSTAPD_STATUS=$(systemctl is-active hostapd)
DNSMASQ_STATUS=$(systemctl is-active dnsmasq)

echo "  hostapd: $HOSTAPD_STATUS"
echo "  dnsmasq: $DNSMASQ_STATUS"

if [ "$HOSTAPD_STATUS" != "active" ] || [ "$DNSMASQ_STATUS" != "active" ]; then
    echo ""
    echo "⚠️  WARNING: One or more services failed to start"
    echo ""
    echo "Check logs with:"
    echo "  sudo journalctl -u hostapd -n 50"
    echo "  sudo journalctl -u dnsmasq -n 50"
    exit 1
fi

echo ""
echo "=============================================="
echo "  WiFi Access Point Setup Complete! ✓"
echo "=============================================="
echo ""
echo "Network Details:"
echo "  SSID: Locket-AirGap"
echo "  Password: [You chose this - write it down!]"
echo "  Gateway IP: 192.168.100.1"
echo "  DHCP Range: 192.168.100.50 - 192.168.100.150"
echo ""
echo "Next Steps:"
echo "  1. Look for 'Locket-AirGap' WiFi network on your devices"
echo "  2. Connect using the password you set"
echo "  3. Once connected, you should receive an IP in the 192.168.100.x range"
echo "  4. Test by SSHing to this Pi: ssh locket@192.168.100.1"
echo ""
echo "⚠️  REBOOT RECOMMENDED for all changes to take full effect"
echo ""
read -p "Reboot now? (y/n): " REBOOT

if [ "$REBOOT" = "y" ] || [ "$REBOOT" = "Y" ]; then
    echo "Rebooting in 5 seconds..."
    sleep 5
    reboot
else
    echo ""
    echo "Remember to reboot later with: sudo reboot"
fi
