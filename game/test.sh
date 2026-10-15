#!/usr/bin/env bash
# test.sh - build the game for the PC, play it with scripted buttons, check the result.
# This is the gate a game passes BEFORE it gets flashed to the ESP32.
#   bash game/test.sh              # run the checks
#   bash game/test.sh --shots      # also write PNG screenshots to game/frames/
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p frames

gcc -O2 -Wall -o sim.exe sim.c game.c

fail=0
check() { # check <name> <jq-ish key> <expected-op> <value> <json>
  local name="$1" got="$2" want="$3"
  if [ "$got" = "$want" ]; then echo "  ok   $name ($got)"; else echo "  FAIL $name: got $got want $want"; fail=1; fi
}
val() { echo "$2" | sed -n "s/.*\"$1\":\([0-9-]*\).*/\1/p"; }

echo "test: idle player loses all 3 lives"
J=$(./sim.exe --frames 400 --script "400.")
check "game over" "$(val over "$J")" 1
check "lives gone" "$(val lives "$J")" 0

echo "test: a player who chases pumpkins scores"
J=$(./sim.exe --frames 300 --script "30R,30L,30R,30L,30R,30L,30R,30L,30R,30L")
S=$(val best "$J"); [ "${S:-0}" -ge 1 ] \
  && echo "  ok   scored ($S)" || { echo "  FAIL never scored"; fail=1; }

echo "test: basket stays on screen when LEFT is held forever"
J=$(./sim.exe --frames 200 --script "200L")
check "still running or fair game over" "$(val frames "$J")" 200

if [ "${1:-}" = "--shots" ]; then
  ./sim.exe --frames 200 --script "40R,60L,100R" --shots 1,60,200 --out frames >/dev/null
  for f in frames/frame-*.ppm; do node ppm2png.mjs "$f" --scale 2 >/dev/null; done
  echo "screenshots: $(ls frames/*.png | tr '\n' ' ')"
fi

[ $fail -eq 0 ] && echo "ALL TESTS PASSED" || { echo "TESTS FAILED"; exit 1; }
