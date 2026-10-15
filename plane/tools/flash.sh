#!/usr/bin/env bash
# FIRST flash, over USB. After this you can use tools/flash-wifi.sh instead.
#   bash tools/flash.sh [COMPORT]       (default COM3)
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${1:-COM3}"
CLI="arduino-cli"

node tools/build-page.mjs
mkdir -p tmp/build/firmware
cp arduino/firmware.ino tmp/build/firmware/firmware.ino     # folder name must match the .ino
cp arduino/page.h tmp/build/firmware/page.h

$CLI core list | grep -q '^esp32:esp32' || $CLI core install esp32:esp32
$CLI compile --fqbn esp32:esp32:XIAO_ESP32C3 tmp/build/firmware
$CLI upload  --fqbn esp32:esp32:XIAO_ESP32C3 -p "$PORT" tmp/build/firmware
echo "FLASHED OK -> join the Wi-Fi, open http://192.168.4.1"
