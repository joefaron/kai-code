# Kai Code: build anything with an AI helper

A 6th grader (Kai), his dad and an AI helper (Claude, nicknamed "Bugsy") built these, and
we're giving all of it away under the MIT license. Copy it, change it, build your own.

| Project | What it is | Folder |
|---|---|---|
| Wi-Fi airboat | Recycled-bottle catamaran with two air propellers. An ESP32 makes its own Wi-Fi and serves a tablet steering page. | `boat/` |
| Wi-Fi paper plane | ~21 g card-stock dart, two coreless motors, XIAO ESP32-C3, steers by differential thrust. Printable template + step booklet. | `plane/`, `data/plane.json`, `media/builds/` |
| Pocket game console | ESP32-S3 handheld. Games are one C file, tested on the PC by a scripted "robot player" before flashing. | `game/` |
| 3D-printed parts | Shaft coupler, fit-test strip, motor holder, all in OpenSCAD. | `3d/`, `media/3d/` |
| The talk | "Build anything. You + AI." 30 minutes for grades 6-8, 16 slides, each with a live three.js scene. | `talk/` |

## Watch the talk

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

Printable plane booklet + cut template: run the site, then
`SITE=http://localhost:8080 node tools/build-pdf.mjs plane` (needs Chrome and
`npm i -g @playwright/cli`). Writes `media/builds/plane-steps.pdf` and `plane-template.pdf`.

A few files mention helper scripts we didn't publish (`tools/build-helm.mjs`,
`tools/build-steps.mjs`, ...). They only regenerate files that are already here, such as
`boat/arduino/helm_page.h`: edit those files directly.

## Flash the plane or the boat

**Before you flash, change `AP_PASS`** in `plane/arduino/firmware.ino` /
`boat/arduino/boat.ino`: it is both the Wi-Fi password and the password for over-the-air
updates, and the copy here is a public placeholder.

Install [arduino-cli](https://arduino.github.io/arduino-cli/) and the ESP32 core.

- Plane (Seeed XIAO ESP32-C3): `bash plane/tools/flash.sh <port>` over USB (port defaults
  to COM3), then `bash plane/tools/flash-wifi.sh` over Wi-Fi (on a Mac, swap `md5sum` for `md5`).
- Boat (30-pin ESP32 DevKit). arduino-cli wants the folder named like the sketch, so copy it first:

  ```
  mkdir -p tmp/boat && cp boat/arduino/* tmp/boat/
  arduino-cli compile --upload -p <port> --fqbn esp32:esp32:esp32 tmp/boat
  ```

If an upload keeps failing, try another USB port or cable: it's usually the cable.

## Test the game on your computer

```
cd game && bash test.sh          # needs gcc (and node for --shots)
```

## Safety

LiPo batteries: an adult charges them, on a hard surface; a puffy battery goes in the bin.
Soldering irons are hot and solder may contain lead: wash your hands, no snacks at the bench.

## The four-part prompt

1. **Goal**: what should exist when it's done?
2. **Context**: who it's for, what you already have.
3. **Limits**: budget, size, "no soldering", your grade.
4. **Check**: how will we KNOW it worked?
