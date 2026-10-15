#!/usr/bin/env bash
# Update the code OVER THE DEVICE'S OWN WI-FI - no USB cable.
#   1. join the device's Wi-Fi on this computer
#   2. bash tools/flash-wifi.sh
# The device only switches to the new code once the whole file has arrived, so a
# dropped Wi-Fi leaves the old code running. USB (tools/flash.sh) is the way back.
set -euo pipefail
cd "$(dirname "$0")/.."
DEV="${1:-192.168.4.1}"
KEY="$(sed -n 's/.*AP_PASS *= *"\([^"]*\)".*/\1/p' arduino/firmware.ino)"
CLI="arduino-cli"

node tools/build-page.mjs
mkdir -p tmp/build/firmware
cp arduino/firmware.ino tmp/build/firmware/firmware.ino
cp arduino/page.h tmp/build/firmware/page.h
$CLI compile --fqbn esp32:esp32:XIAO_ESP32C3 --output-dir tmp/build/out tmp/build/firmware

want="$(md5sum tmp/build/out/firmware.ino.bin | cut -d' ' -f1)"
echo "device is running: $(curl -s -m 5 "http://$DEV/version" || echo '(no answer - are you on its Wi-Fi?)')"
echo "sending         :  $(du -h tmp/build/out/firmware.ino.bin | cut -f1), md5 $want"
curl -s -m 120 -F "firmware=@tmp/build/out/firmware.ino.bin" "http://$DEV/update?key=$KEY"; echo
# The device reports the md5 of the code it is RUNNING, so this PROVES the swap.
# Never verify by build timestamp: arduino-cli caches, so a rebuild can be identical.
for i in $(seq 25); do
  sleep 2
  now="$(curl -s -m 5 "http://$DEV/version" || true)"
  case "$now" in *"$want"*) echo "FLASHED OVER WI-FI -> now running: $now"; exit 0;; esac
done
echo "the device is not running the new code - rejoin its Wi-Fi, check http://$DEV/version,"
echo "and fall back to USB: bash tools/flash.sh COM3"
exit 1
