/* ===========================================================================
   Kai's Paper Plane  -  ESP32 over Wi-Fi, no USB cable after the first flash

   The board MAKES its own Wi-Fi. Join "KAI-PLANE" on a phone/tablet/laptop and
   open http://192.168.4.1 (or http://kai - every name works).

   What you get for free (all tested on Kai's boat, 2026-09-20):
     /            the control page, generated from web/page.html
     /cfg         settings kept ON THE DEVICE, so every phone sees the same ones
     /update      NEW CODE OVER WI-FI     -> bash tools/flash-wifi.sh
     /version     which code is really running (build time + md5 fingerprint)
     captive-portal answers so phones don't say "no internet" and drop the Wi-Fi

   Board: "XIAO_ESP32C3" (Seeed). Libraries: none beyond the ESP32 core.

   Wiring (no breadboard - jumpers + a few solder joints). Picture: the kai site's ?p=plane
   Pin map source of truth: data/plane.json. Both boards wired upside down (pins up),
   so the XIAO's D0-D6 row lines up pin-for-pin with the driver's IN row:
     XIAO D1 -> DRV8833 IN4     XIAO D2 -> IN3     (right motor = OUT3/OUT4)
     XIAO D5 -> DRV8833 IN2     XIAO D6 -> IN1     (left motor  = OUT1/OUT2)
     XIAO D10 -> DRV8833 EEP    (the driver's ON switch, set HIGH below)
     D3 / D4 face the driver's GND / VCC and stay EMPTY.
     Battery - (black) -> XIAO BAT- pad -> DRV8833 GND
     Battery + (red)   -> XIAO BAT+ pad -> DRV8833 VCC
   D6 is also the chip's boot-log pin, so it flickers for a moment at power-on.
   Harmless: EEP is low until setup() runs, so the driver is still asleep then.
   One 1S LiPo runs everything. The XIAO charges it from USB-C. UNPLUG the
   battery to switch the plane off.
   =========================================================================== */
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <Update.h>

// ---- name and password. At least 8 characters or the Wi-Fi won't start. ----
const char* AP_SSID = "KAI-PLANE";
const char* AP_PASS = "change-me-2026";

WebServer server(80);
DNSServer dns;
Preferences prefs;

/* ===========================================================================
   YOUR DEVICE CODE  -  everything above and below this block is the plumbing.
   Replace the demo (the onboard LED) with your motors / lights / sensor.
   =========================================================================== */
// The plane steers like the boat: no rudder, just one motor faster than the
// other. Left faster = turn RIGHT. Both faster = climb, both slower = glide down.
const int L_IN1 = D6, L_IN2 = D5;        // driver IN1/IN2 -> left motor
const int R_IN1 = D2, R_IN2 = D1;        // driver IN3/IN4 -> right motor
const int DRV_EEP = D10;                 // driver ON switch (HIGH = awake)

const int PWM_FREQ = 20000;              // 20 kHz: no motor whine
const int PWM_BITS = 8;                  // 0..255

// ---- FAIL-SAFE: if the tablet goes quiet, motors OFF and the plane glides down.
// The page re-sends its command ~10x a second, so 800 ms of silence means
// nobody is in control (out of range, tablet asleep, page closed).
const unsigned long FAILSAFE_MS = 800;
unsigned long lastCommand = 0;

#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  #define PWM_SETUP(pin, ch) ledcAttach(pin, PWM_FREQ, PWM_BITS)
  #define PWM_WRITE(pin, ch, duty) ledcWrite(pin, duty)
#else
  #define PWM_SETUP(pin, ch) do { ledcSetup(ch, PWM_FREQ, PWM_BITS); ledcAttachPin(pin, ch); } while (0)
  #define PWM_WRITE(pin, ch, duty) ledcWrite(ch, duty)
#endif

// speed is -100..100. The sign picks the spin direction (the page's "flip"
// boxes use it when a motor was soldered backwards), the size picks the power.
void motor(int in1, int in2, int ch1, int ch2, int speed) {
  speed = constrain(speed, -100, 100);
  int duty = map(abs(speed), 0, 100, 0, 255);
  if (speed >= 0) { PWM_WRITE(in1, ch1, duty); PWM_WRITE(in2, ch2, 0); }
  else            { PWM_WRITE(in1, ch1, 0);    PWM_WRITE(in2, ch2, duty); }
}

// ---- SOFT START: walk toward the target, never jump. ---------------------
// A motor slammed to full gulps current, the little battery's voltage dips, and
// the ESP32 can reset in mid-air. Ramping up over ~0.25 s avoids that.
// Stopping is allowed to be instant.
int targetL = 0, targetR = 0, outL = 0, outR = 0;
const int SLEW_PER_STEP = 4;             // % per 10 ms
unsigned long lastSlew = 0;
int slew(int now, int want) {
  if (want == 0) return 0;
  if (now < want) return min(now + SLEW_PER_STEP, want);
  if (now > want) return max(now - SLEW_PER_STEP, want);
  return now;
}
void drive(int l, int r) {
  motor(L_IN1, L_IN2, 0, 1, l);
  motor(R_IN1, R_IN2, 2, 3, r);
}
void allStop() { targetL = targetR = outL = outR = 0; drive(0, 0); }
void applyPower(int p) { if (p == 0) allStop(); }   // used by the OTA code below

void handleCmd() {                       // the page calls /cmd?l=NN&r=NN ten times a second
  targetL = server.hasArg("l") ? constrain(server.arg("l").toInt(), -100, 100) : 0;
  targetR = server.hasArg("r") ? constrain(server.arg("r").toInt(), -100, 100) : 0;
  lastCommand = millis();
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/plain", "ok");
}

void setupDevice() {                     // called once at start-up
  pinMode(DRV_EEP, OUTPUT); digitalWrite(DRV_EEP, HIGH);   // wake the motor driver
  PWM_SETUP(L_IN1, 0); PWM_SETUP(L_IN2, 1);
  PWM_SETUP(R_IN1, 2); PWM_SETUP(R_IN2, 3);
  allStop();
}

void loopDevice() {                      // called over and over
  if (millis() - lastCommand > FAILSAFE_MS && (targetL || targetR)) {
    Serial.println("FAILSAFE: lost the tablet, motors off - gliding");
    allStop();
  }
  if (millis() - lastSlew >= 10) {
    lastSlew = millis();
    int nl = slew(outL, targetL), nr = slew(outR, targetR);
    if (nl != outL || nr != outR) { outL = nl; outR = nr; drive(outL, outR); }
  }
}
/* ======================= end of YOUR DEVICE CODE ========================== */

// The control page, GENERATED from web/page.html by tools/build-page.mjs
// (both flash scripts run it). Never edit page.h by hand.
#include "page.h"
void sendPage() { server.send_P(200, "text/html", PAGE); }

// ---- SETTINGS LIVE ON THE DEVICE -------------------------------------------
// Settings belong to THIS device, not to whichever phone is holding it. The page
// reads /cfg when it opens and posts it back when something changes. Kept in
// flash, so they survive power-off and survive an over-the-air update.
void handleCfg() {
  if (server.method() == HTTP_POST) {
    String j = server.arg("plain");
    if (j.length() > 0 && j.length() < 400 && j[0] == '{') {
      if (prefs.getString("cfg", "") != j) prefs.putString("cfg", j);   // only write if changed
      server.send(200, "text/plain", "saved");
    } else server.send(400, "text/plain", "bad");
    return;
  }
  server.send(200, "application/json", prefs.getString("cfg", "{}"));
}

// ---- STAY CONNECTED ---------------------------------------------------------
// Phones test a joined Wi-Fi by fetching a known address. If that fails they say
// "no internet" and many quietly switch back to mobile data, losing the device.
// So answer every name (DNS) and give each phone the reply it is looking for.
void handleOther() {
  String u = server.uri();
  if (u == "/generate_204" || u == "/gen_204") { server.send(204); return; }        // Android, Chrome
  if (u == "/hotspot-detect.html" || u.startsWith("/library/test/success")) {       // Apple
    server.send(200, "text/html", "<HTML><HEAD><TITLE>Success</TITLE></HEAD><BODY>Success</BODY></HTML>");
    return;
  }
  if (u == "/connecttest.txt") { server.send(200, "text/plain", "Microsoft Connect Test"); return; }
  if (u == "/ncsi.txt") { server.send(200, "text/plain", "Microsoft NCSI"); return; }
  if (u == "/success.txt") { server.send(200, "text/plain", "success\n"); return; }  // Firefox
  sendPage();                            // anything else: just show the page
}

// ---- NEW CODE OVER WI-FI (OTA) ---------------------------------------------
// `bash tools/flash-wifi.sh` compiles and posts the firmware here. The ESP32
// writes it to the SPARE half of its flash and only switches over once the whole
// file has arrived, so a dropped Wi-Fi leaves the old, working code running.
// USB is always the way back if an upload ever does go bad.
const char* FW_BUILT = __DATE__ " " __TIME__;
bool otaOK = false;                      // did a REAL update, with the password, finish?
void handleUpdateDone() {
  server.sendHeader("Connection", "close");
  if (!otaOK) { server.send(403, "text/plain", "no - wrong password or bad file"); return; }
  server.send(200, "text/plain", "OK - rebooting");
  delay(300);
  ESP.restart();                         // ONLY after a good upload: a stranger on
}                                        // the Wi-Fi must not be able to reboot it
void handleUpdateData() {
  HTTPUpload& up = server.upload();
  if (up.status == UPLOAD_FILE_START) {
    otaOK = false;
    if (server.arg("key") != String(AP_PASS)) { Serial.println("OTA: wrong password, ignored"); return; }
    applyPower(0);                       // hardware OFF while flashing
    Serial.printf("OTA: receiving %s\n", up.filename.c_str());
    Update.begin(UPDATE_SIZE_UNKNOWN);
  } else if (up.status == UPLOAD_FILE_WRITE) {
    if (Update.isRunning()) Update.write(up.buf, up.currentSize);
  } else if (up.status == UPLOAD_FILE_END) {
    if (Update.isRunning() && Update.end(true)) {
      otaOK = true;
      Serial.printf("OTA: %u bytes OK, rebooting\n", up.totalSize);
    } else Update.printError(Serial);
  }
}

void setup() {
  Serial.begin(115200);
  setupDevice();

  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.println();
  Serial.print("Wi-Fi: "); Serial.println(AP_SSID);
  Serial.print("Open:  http://"); Serial.println(WiFi.softAPIP());    // 192.168.4.1
  Serial.print("Built: "); Serial.println(FW_BUILT);

  prefs.begin("cfg", false);
  dns.start(53, "*", WiFi.softAPIP());   // every name -> this device

  server.on("/", sendPage);
  server.on("/cmd", handleCmd);
  server.on("/cfg", handleCfg);
  // getSketchMD5() fingerprints the code actually RUNNING, so an update can be
  // proved to have landed even when two builds look identical.
  server.on("/version", []() {
    server.send(200, "text/plain", String(FW_BUILT) + " md5 " + ESP.getSketchMD5());
  });
  server.on("/update", HTTP_POST, handleUpdateDone, handleUpdateData);
  server.on("/favicon.ico", []() { server.send(204); });
  server.onNotFound(handleOther);
  server.begin();
}

void loop() {
  dns.processNextRequest();
  server.handleClient();
  loopDevice();
}
