# Kai Code: build a Wi-Fi airboat (and more) with an AI helper

A 6th grader (Kai), his dad and an AI helper built a phone-controlled airboat for a school
boat race, and we're giving all of it away (MIT license): the parts list, the step-by-step
wiring booklet, the chip's code, the steering app, a 3D model, the talk Kai gave his
class, and **every message we typed to the AI**, mistakes included.

This is for **parents and kids who want to build something real with AI and robotics**.
You don't need to know how to code. You do need about $60, a few evenings, and patience
for the first version not working.

## Start here (nothing to install)

| | |
|---|---|
| 🌐 **The website** | **[joefaron.github.io/kai-code](https://joefaron.github.io/kai-code/)**, everything below, clickable |
| 🚤 **Build the boat** | **[the boat site](https://joefaron.github.io/kai-code/boat/)**: mission, parts, hull, wiring, steering |
| 🎮 **Try the steering app** | **[Control page](https://joefaron.github.io/kai-code/boat/control.html)**: a simulator, works in any browser |
| 🎬 **Watch the talk** | **[for kids](https://joefaron.github.io/kai-code/talk/kids.html)** · **[grades 6-8](https://joefaron.github.io/kai-code/talk/)** (arrow keys to move) |
| 💬 **How we asked the AI** | **[AI Prompts](https://joefaron.github.io/kai-code/boat/prompts.html)**: all our messages, in order |

## Build the boat, in order

1. **[Parts](https://joefaron.github.io/kai-code/boat/parts.html)**: an ESP32 DevKit (the brain), a DRV8833 motor driver, 4 small motors + props, AA pack, USB power bank, breadboard, jumper wires. No soldering.
2. **[Design](https://joefaron.github.io/kai-code/boat/design.html)**: plastic bottles + a corrugated plastic sign + zip ties. Fans in the *air*, so nothing underwater can leak.
3. **[Build Steps](https://joefaron.github.io/kai-code/boat/steps.html)**: LEGO-style, one wire per page, every breadboard hole labelled. Print it and build at the table.
4. **[Wiring](https://joefaron.github.io/kai-code/boat/wiring.html)**: the whole circuit on one page, to check your work.
5. **Put the code on the chip**: [`boat/arduino/boat.ino`](boat/arduino/boat.ino), see *Flash the boat* below. After the first USB flash, updates go over Wi-Fi.
6. **[Drive it](https://joefaron.github.io/kai-code/boat/control.html)**: join the boat's Wi-Fi on a phone, open `http://192.168.4.1`. No internet, no app store, no pairing.
7. **[Build Log](https://joefaron.github.io/kai-code/boat/log.html)**: what broke and how we fixed it (hot-tub tests, fans that only hummed, a boat that "just stopped").

## How we used AI (the honest version)

We used **[Claude Code](https://claude.com/claude-code)** (Anthropic's coding agent) running **Claude Opus 5.5**.
Dad hooked it up to a Slack channel so Kai could message it like a teammate, nicknamed "Bugsy". It ran on our home PC
with access to this folder, the Arduino compiler, a web browser it could drive, and an Amazon cart it could add to (never buy).

The loop, every time:

1. **Say it in words.** Goal, what we have, the limits, how we'll know it worked. ("Make a boat for a 6th grade project. A tablet controls the motors and the steering. It needs to be waterproof.")
2. **AI drafts it**: the parts list with prices, the web page, the wiring booklet, the chip's code.
3. **AI tests it first**: compiles the code, opens the page in a browser, drives the simulator, screenshots it.
4. **We test the real thing**: hot tub, then the beach. Phone screenshots and "it just stops" go straight back to the AI.
5. **It fixes, we re-test.** Version 2.4 is the 9th version of the boat's code.

What the AI got wrong (so you can watch for it): it called windmill blades "propellers" until we asked it to check its own work;
its first wiring drawings didn't match the real board's labels (trust the printed labels on the chip); and it said things
worked before testing them, until we made "test before you say done" a rule. Read the [prompts](https://joefaron.github.io/kai-code/boat/prompts.html) to see it all.

### The four-part prompt

1. **Goal**: what should exist when it's done?
2. **Context**: who it's for, what you already have.
3. **Limits**: budget, size, "no soldering", your grade.
4. **Check**: how will we KNOW it worked?

## Tech details (for the grown-ups)

- **Board**: 30-pin ESP32 DevKit ("ESP32 Dev Module"). **Driver**: DRV8833 (2 channels; two motors in parallel per side). Motors on 6 AA (9 V, under the DRV8833's 10.8 V max); the ESP32 runs on its own USB power bank so motor start-up can't brown it out.
- **Wi-Fi**: the ESP32 is an access point (`SS-JACKOLANTERN-v<version>`, 192.168.4.1). A DNS catch-all plus the exact "connectivity check" replies Android/iOS/Windows expect keep phones from drifting back to mobile data.
- **Steering app**: one HTML page compiled into the firmware (`boat/arduino/helm_page.h`, generated from `boat/pages/control.php` + `boat/assets/`). It sends `/drive?l=<-100..100>&r=<-100..100>` 10x a second; the reply carries real fan power and battery voltage.
- **Safety**: if no command arrives for 0.8 s the fans stop (fail-safe); the app shows a loud NO LINK banner at 0.6 s. Soft-start ramps power so motors don't trip the driver's over-current shutdown. ALL STOP is instant.
- **Over-the-air updates**: `POST /update?key=<wifi password>` writes the new code to the spare half of the flash and only switches if the whole file arrived. `/ota-start` first tells every open app "new code arriving" so nobody thinks they're still driving.
- **Debugging**: `http://192.168.4.1/debug` (live: gaps between commands, fail-safes, each phone's signal strength, last reset reason) and `/log` (a captain's log kept in the chip's own flash, survives power-off).
- **Tuning knobs** (trim, steering strength, motor start power...) are saved on the boat, not the phone.

## Repo map

| Folder | What it is |
|---|---|
| `boat/` | The boat site (PHP + rendered `.html`), `boat/arduino/` = the chip's code, `boat/data/` = parts, steps, prompts as JSON |
| `talk/` | "Build anything. You + AI.": slides with live three.js scenes and sound |
| `game/` | Pocket game console: games are one C file, tested on the PC by a robot player |
| `3d/`, `media/3d/` | OpenSCAD parts: shaft coupler, motor holders, fit-test strip |
| `pages/`, `index.php` | The project site (also rendered to `.html` for GitHub Pages) |
| `tools/` | `static-site.mjs` (PHP -> HTML), `helm-video.mjs` (films the app), `build-pdf.mjs` (booklets) |

## Flash the boat

**Before you flash, change `AP_PASS`** in `boat/arduino/boat.ino`: it is both the boat's Wi-Fi password and the
password for over-the-air updates, and the one here is a public placeholder. Also give the boat your own name in `AP_SSID`.

*Easiest (Arduino IDE):* install [Arduino IDE 2](https://www.arduino.cc/en/software), add the ESP32 boards
(Boards Manager -> "esp32 by Espressif"), open `boat/arduino/boat.ino`, pick **ESP32 Dev Module** and your USB port,
press Upload. No extra libraries needed.

*Command line:* arduino-cli wants the folder named like the sketch, so copy it first:

```
mkdir -p tmp/boat && cp boat/arduino/* tmp/boat/
arduino-cli compile --upload -p <port> --fqbn esp32:esp32:esp32 tmp/boat
```

If an upload keeps failing, try another USB port or cable: it's usually the cable (we needed 6 tries once).

*Next time, over Wi-Fi:* join the boat's Wi-Fi, then (Arduino IDE: Sketch -> Export Compiled Binary)

```
curl "http://192.168.4.1/ota-start?key=<your password>&v=<version>"     # warns open apps
curl -F "firmware=@boat.ino.bin" "http://192.168.4.1/update?key=<your password>"
```

## Safety

The AA pack must stay under 10.8 V (6 AA, never 8). LiPo batteries: an adult charges them, on a hard surface;
a puffy battery goes in the bin. Spinning props are at finger height: ALL STOP before you pick the boat up.
An adult at the water, always.

## Watch the talk offline

Open `talk/index.html` through any web server (ES modules don't load from `file://`):

```
cd kai-code
python -m http.server 8000      # then open http://localhost:8000/talk/
```

Keys: arrows / space / clicker to move, **P** = presenter window with notes and a timer,
**F** = full screen, **Ctrl+P** = printable handout with the speaker notes.

## Run the website

The site is plain PHP 7.4+ with no framework, so a kid can read every file:

```
php -S localhost:8080            # then open http://localhost:8080/
```

`index.php` is the whole layout plus a `?p=<page>` router; each tab is one file in `pages/`;
content lives in `data/*.json`. The boat is its own site and must be served from its own
folder (its links start with `/`): `cd boat && php -S localhost:8081`.

Printable LEGO-style booklets: describe a build in `data/builds/<name>.json`, run the site, then
`SITE=http://localhost:8080 node tools/build-pdf.mjs <name>` (needs Chrome and
`npm i -g @playwright/cli`). Writes `media/builds/<name>-steps.pdf`.

A few files mention helper scripts we didn't publish (`tools/build-helm.mjs`,
`tools/build-steps.mjs`, ...). They only regenerate files that are already here, such as
`boat/arduino/helm_page.h`: edit those files directly.

## Test the game console on your computer

```
cd game && bash test.sh          # needs gcc (and node for --shots)
```

## Questions, ideas, your own boat?

Open an [issue](https://github.com/joefaron/kai-code/issues). Built one? We'd love a photo.
