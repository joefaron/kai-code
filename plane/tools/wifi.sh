#!/usr/bin/env bash
# Join / leave the device's own Wi-Fi from this Windows box, so you (or Claude)
# can test and flash it without a cable. Ethernet stays the default route, so
# the internet keeps working while you are joined.
#   bash tools/wifi.sh join
#   bash tools/wifi.sh leave
set -euo pipefail
cd "$(dirname "$0")/.."
SSID="$(sed -n 's/.*AP_SSID *= *"\([^"]*\)".*/\1/p' arduino/firmware.ino)"
PASS="$(sed -n 's/.*AP_PASS *= *"\([^"]*\)".*/\1/p' arduino/firmware.ino)"
IFACE="${IFACE:-Wi-Fi}"

case "${1:-join}" in
  join)
    mkdir -p tmp
    cat > tmp/wifi-profile.xml <<XML
<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
  <name>$SSID</name>
  <SSIDConfig><SSID><name>$SSID</name></SSID></SSIDConfig>
  <connectionType>ESS</connectionType>
  <connectionMode>manual</connectionMode>
  <MSM><security>
    <authEncryption><authentication>WPA2PSK</authentication><encryption>AES</encryption><useOneX>false</useOneX></authEncryption>
    <sharedKey><keyType>passPhrase</keyType><protected>false</protected><keyMaterial>$PASS</keyMaterial></sharedKey>
  </security></MSM>
</WLANProfile>
XML
    netsh wlan add profile filename="$(pwd -W 2>/dev/null || pwd)/tmp/wifi-profile.xml" interface="$IFACE" > /dev/null
    netsh wlan connect name="$SSID" interface="$IFACE" > /dev/null
    rm -f tmp/wifi-profile.xml           # don't leave the password lying around
    for i in $(seq 15); do
      sleep 2
      if curl -s -m 3 http://192.168.4.1/version > /dev/null; then
        echo "joined $SSID -> $(curl -s -m 3 http://192.168.4.1/version)"; exit 0
      fi
    done
    echo "could not reach 192.168.4.1 - is the device powered on?"; exit 1;;
  leave)
    netsh wlan disconnect interface="$IFACE" > /dev/null || true
    netsh wlan delete profile name="$SSID" > /dev/null || true
    echo "left $SSID";;
  *) echo "usage: bash tools/wifi.sh join|leave"; exit 1;;
esac
