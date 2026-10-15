# Kai's handheld game console — plan (2026-09-20)

Goal (Joe): a little Game Boy Kai can (a) play retro games on, and (b) write his OWN
games for — inventing the game, coding it with Bugsy in #kai_code, having Bugsy test it
automatically, then flashing it to the device.

## Decision 1 — the brain: ESP32-S3 with PSRAM (not plain ESP32, not a Pi)

| option | why | why not |
|---|---|---|
| **ESP32-S3 N16R8 (16MB flash / 8MB PSRAM)** ✅ | instant-on, $6–19, Kai + Joe already know ESP32 from the boat, and the PSRAM is exactly what Game Boy / NES emulation (retro-go) needs | you wire the screen + buttons yourself (that's the fun, and `breadboard-steps` generates the booklet) |
| plain ESP32 / CYD (ESP32-2432S028R) | complete board, screen soldered on, $17 | most units have **no PSRAM** → GB emulation is off the table; touch instead of buttons |
| Raspberry Pi Zero 2 W + RetroPie | real emulation of everything through GBA, games in Python/Pygame (much easier for a 6th grader) | boots like a computer (~20s), SD-card corruption, less "I built this", and Kai's code stops being close to the metal |

Recommended: **ESP32-S3**, and treat a Pi handheld as a later upgrade if he wants GBA/SNES.

## Decision 2 — how the games get written and tested (built + proven 2026-09-20)

The thing Joe asked for — "you could be like self-testing it before deploying it" — is
already working in `game/`:

- `engine.h` — a tiny API (`clear`, `rect`, `text`, `btn`, `rnd`, `beep`), 320×240, RGB565.
- `game.c` — **the only file Kai edits.** Starter game: Pumpkin Catch.
- `sim.c` — the PC backend. Compiles with gcc, runs the exact same `game.c` headlessly
  with **scripted button presses** (`--script "40R,60L,100."`), a fixed random seed so
  every run is identical, screenshots dumped as `.ppm`, and a JSON summary on stdout.
- `ppm2png.mjs` — frames → PNG (pure node, no image library), so Bugsy can post a picture
  of the game into Slack.
- `test.sh` — the gate: builds, plays the game three different ways, asserts the rules
  hold ("idle player loses 3 lives", "a player who chases pumpkins scores"). Passing this
  is the precondition for flashing.

Later, `device.ino` becomes the second backend: same `game.c`, framebuffer pushed to the
TFT, `btn()` reading real pins. **The game never talks to hardware**, so what passes on
the PC is what runs on the device.

Why C and not MicroPython/Lua: one source file runs in both places with no interpreter,
frame rates stay fast, and it's the same language the emulator firmware uses. Kai edits
numbers and rules in `game.c`; nothing else.

## Decision 3 — emulation

`retro-go` (ducalex/retro-go) is the open-source firmware behind the ODROID-GO and most
ESP32 handhelds: NES, Game Boy, Game Boy Color, Game & Watch, Sega. It wants PSRAM + an
SD card. Plan: run retro-go for playing, and flash our own sketch when Kai wants his game.
(Roms are Joe's call; the firmware ships none.)

## Shopping — two carts, on purpose

**A. Amazon, arrives in 2 days, start building this week (~$45)**
- ESP32-S3 N16R8 dev board — Hosyond 3-pack, $18.99 (`B0F5QCK6X5`) — spares matter
- 2.8" SPI TFT (ILI9341) or the ESP32-2432S028R combo board for screen practice, ~$17
- Tactile button assortment, $8.99 (`B07CG7VTGD`) — 6 buttons = D-pad + A/B
- Breadboard + jumpers + microSD module: likely already in the boat kit — check first

**B. AliExpress, 2–4 weeks, the "it looks like a Game Boy" version (~$25–40, unverified)**
- A prebuilt ESP32-S3 retro handheld (2.4" IPS, case, buttons, retro-go preloaded).
  Worth ordering now precisely because it's slow; it becomes the nice case for Kai's own
  games too. Price to be confirmed before ordering.

Amazon prices above were checked live on 2026-09-20 by an AI shopping helper that can add to Joe's cart. It never buys — checkout stays human.

## Next steps
1. Joe picks a cart → `shop-helper cart-add` each ASIN, Joe checks out.
2. Kai designs his own game in the thread (rules first, in words). Bugsy writes `game.c`,
   `test.sh` proves it, screenshot posts to Slack, Kai reacts, repeat.
3. When parts land: `breadboard-steps` generates the wiring booklet; then `device.ino`.
4. Then retro-go for the emulator side.
