/* ===========================================================================
   S.S. Jack-o'-Lantern  -  ESP32 airboat controller
   6th grade STEM Boat Challenge, a calm beach - fall 2026

   The boat MAKES its own Wi-Fi. There is no internet at the beach and it does
   not need any. The tablet joins "SS-JACKOLANTERN" and opens http://192.168.4.1

   Wiring (ESP32 DevKit 30-pin -> purple DRV8833 module). Diagram: the boat site's ?p=wiring
     GPIO 32 -> IN1       GPIO 33 -> IN2      (left motor,  OUT1/OUT2)
     GPIO 25 -> IN3       GPIO 26 -> IN4      (right motor, OUT3/OUT4)
     GND     -> GND       (MUST share ground with the ESP32)
     GPIO 27 -> EEP       (the driver's ON switch - the code sets it HIGH at start-up)
     GPIO 14 -> 220 ohm -> RED LED    -> GND   (port, left side)
     GPIO 12 -> 220 ohm -> GREEN LED  -> GND   (starboard, right side)
     GPIO 13 -> 220 ohm -> YELLOW LED -> GND   (stern: blinks = waiting for tablet)
     GPIO  2 -> onboard blue LED (on while the motors are running)
   EVERY wire uses ONE side of the ESP32 (the D32..GND row). On a breadboard the
   ESP32 is so wide that only that side has a free hole next to each pin, so
   nothing is wired to the 3V3/D21/D19/D18 side.

   POWER:
     USB-C power bank -> USB-C to micro-USB cable -> ESP32   (the brain)
     AA holder red -> breadboard + rail -> DRV8833 VCC        (the motors)
     AA holder black -> breadboard - rail, joined to ESP32 GND and DRV8833 GND
     Our holder takes 8 AA: load 6 AA + 2 dummy cells = 9 V. NEVER 8 real AA:
     12 V is over the DRV8833's 10.8 V limit. (The ESP32 is not at risk - it
     runs on the USB bank; the AA pack only feeds the driver.)
   FOUR FANS: the DRV8833 has 2 channels, so wire a 2nd motor in PARALLEL with
     each one (left pair j8/j9 + i8/i9, right pair j6/j7 + i6/i7).
     No code change: each pair gets the same signal. The code cannot tell if
     the extra motors are plugged in (this module ties its current-sense pins
     to GND), and it doesn't need to.
     (Use C-to-micro cables, not C-to-A: a USB-C bank only switches its power
     on when the cable says "a device is plugged in", and C-to-A cables don't.)
   Two batteries so a motor starting up can't starve the ESP32 and reboot it.

   TWO THINGS TO WATCH:
   1. Some banks SHUT OFF when the draw falls below ~50-100 mA. An ESP32 running
      a Wi-Fi AP pulls ~120-160 mA, which normally keeps it awake - but test it
      idling on the bench for 10 minutes before you trust it on the water.
   2. If the bank trips on motor start-up, add a 1000 uF capacitor across its
      5 V output (long leg to +). The soft-start ramp below already helps.
   Thrust: 6 AA (9 V) spins the fans ~1.5x faster than 4 AA (6 V) = ~2x the push.
   Never exceed 10.8 V - the DRV8833's limit.

   WHY Wi-Fi AND NOT BLUETOOTH: ESP32 Wi-Fi reaches 150-240 m line-of-sight;
   plain BLE is more like 10-30 m. A tablet browser also cannot open a classic
   Bluetooth serial port at all - only BLE GATT, and only with a fussy Web
   Bluetooth permission dance. Wi-Fi AP needs no app and no pairing.
   Keep the ESP32 HIGH and DRY: 2.4 GHz is absorbed by water, so an antenna
   sitting at deck level loses far more range than one a few inches up.

   Board: "ESP32 Dev Module". Libraries: none beyond the ESP32 core.
   =========================================================================== */

#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <Update.h>
#include <LittleFS.h>

// ---- KAI: the boat's Wi-Fi name and password. Change them here, then re-flash. ----
// Name: up to 32 letters/numbers, dashes OK. Password: AT LEAST 8 characters or the
// Wi-Fi won't start at all. Tell your team the new password before race day!
// The BACKUP boat runs this SAME code: flash it with `bash tools/flash.sh COM3 2` and it
// comes up as SS-JACKOLANTERN-2, so the two boats never fight over one Wi-Fi name.
#ifndef BOAT_ID
#define BOAT_ID 1
#endif
#define STR_(x) #x
#define STR(x) STR_(x)
#if BOAT_ID == 1
const char* AP_SSID = "SS-JACKOLANTERN";
#else
const char* AP_SSID = "SS-JACKOLANTERN-" STR(BOAT_ID);
#endif
const char* AP_PASS = "change-me-2026";

const int L_IN1 = 32, L_IN2 = 33;          // driver IN1/IN2 -> left motor
const int R_IN1 = 25, R_IN2 = 26;          // driver IN3/IN4 -> right motor
const int DRV_EEP = 27;                   // driver ON switch (HIGH = awake)
const int LED   = 2;
// Navigation lights, like a real boat: red on port (left), green on starboard (right).
const int LED_PORT = 14, LED_STBD = 12, LED_STERN = 13;

// 1 kHz, not 20 kHz: at low throttle slower pulses give these little brushed
// motors stronger shoves to get over their friction and start spinning (at
// 20 kHz they needed 60%+ to move at all). Cost: a faint whine. Worth it.
const int PWM_FREQ = 1000;
const int PWM_BITS = 8;                   // 0..255

// ---- FAIL-SAFE: if the tablet goes quiet, stop. Non-negotiable. ----
const unsigned long FAILSAFE_MS = 800;
unsigned long lastCommand = 0;
bool stopped = true;

WebServer server(80);

// ledc API changed in ESP32 Arduino core 3.x - handle both so this compiles
// whichever core version is installed.
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  #define PWM_SETUP(pin, ch) ledcAttach(pin, PWM_FREQ, PWM_BITS)
  #define PWM_WRITE(pin, ch, duty) ledcWrite(pin, duty)
#else
  #define PWM_SETUP(pin, ch) do { ledcSetup(ch, PWM_FREQ, PWM_BITS); ledcAttachPin(pin, ch); } while (0)
  #define PWM_WRITE(pin, ch, duty) ledcWrite(ch, duty)
#endif

// ---- DEAD ZONE (Joe, hot tub test 2026-10-07) ------------------------------
// Below ~60% duty the motors just hum and don't turn: not enough push to beat
// their own friction (worse with two motors sharing one driver channel). So the
// slider's 1..100 is squeezed into MIN_DUTY..255: 1% is the weakest spin that
// still turns, 100% is still full power. 0 is still OFF.
// Raise MIN_DUTY if small throttle still won't start them; lower it if 1% lurches.
const int MIN_DUTY = 140;                 // ~55% of 255

// speed is -100..100. Sign picks direction, magnitude picks PWM duty.
void motor(int in1, int in2, int ch1, int ch2, int speed) {
  speed = constrain(speed, -100, 100);
  int duty = speed == 0 ? 0 : map(abs(speed), 1, 100, MIN_DUTY, 255);
  if (speed >= 0) { PWM_WRITE(in1, ch1, duty); PWM_WRITE(in2, ch2, 0); }
  else            { PWM_WRITE(in1, ch1, 0);    PWM_WRITE(in2, ch2, duty); }
}

// ---- SOFT START ----------------------------------------------------------
// The DRV8833 is good for 1.5 A per channel. A little motor slammed from 0 to
// full pulls several times its running current for a few milliseconds, which
// trips the driver's overcurrent shutdown (and drags the battery down with it).
// So we never jump: the tablet sets a TARGET and we walk the actual output
// toward it a few percent at a time. Stopping is allowed to be instant.
int targetL = 0, targetR = 0;      // what the tablet asked for
int outL = 0, outR = 0;            // what the motors are actually getting
String driver = "?";               // IP of the tablet that sent the last /drive
const int SLEW_PER_STEP = 4;       // % per 10 ms  -> 0..100 in ~0.25 s
unsigned long lastSlew = 0;

int slew(int now, int want) {
  if (want == 0) return 0;                       // ALL STOP is immediate
  if (now < want) return min(now + SLEW_PER_STEP, want);
  if (now > want) return max(now - SLEW_PER_STEP, want);
  return now;
}

void drive(int l, int r) {         // called by the slew loop, not directly
  motor(L_IN1, L_IN2, 0, 1, l);
  motor(R_IN1, R_IN2, 2, 3, r);
  stopped = (l == 0 && r == 0);
  trackRun(l, r);
  digitalWrite(LED, stopped ? LOW : HIGH);
}

void setTarget(int l, int r) { targetL = l; targetR = r; }

void handleDrive() {
  int l = server.hasArg("l") ? server.arg("l").toInt() : 0;
  int r = server.hasArg("r") ? server.arg("r").toInt() : 0;
  setTarget(l, r);
  lastCommand = millis();
  driver = server.client().remoteIP().toString();
  server.sendHeader("Access-Control-Allow-Origin", "*");   // so the boat site can drive it too
  server.send(200, "text/plain", "ok");
}

// The control page, served by the boat itself. It is GENERATED from the same
// files as the boat site's ?p=control by tools/build-helm.mjs (flash.sh runs it),
// so every knob on the website is on the boat too. Don't edit helm_page.h.
#include "helm_page.h"

// ---- TUNING KNOBS LIVE ON THE BOAT ----------------------------------------
// Trim etc. belong to THIS boat's motors, not to whichever tablet is driving.
// So the page reads them from /cfg when it opens and writes them back when a
// knob moves. They are kept in flash (Preferences), so they survive power-off.
Preferences prefs;
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

// ---- CAPTAIN'S LOG ----------------------------------------------------------
// Every boot and every run (motors on -> off) is written to /log.txt in the
// boat's own flash (LittleFS). Read it at http://192.168.4.1/log
// No sign-in (removed 2026-10-09, Joe: the name pop-up didn't show on the Galaxy
// tablet and blocked Kai's laptop). Join the Wi-Fi, open 192.168.4.1, drive.
DNSServer dns;
long long epochAtBoot = 0;                 // no clock on the ESP32, so times are t+seconds
unsigned long runStart = 0; bool running = false; int runPeak = 0;

String stamp() {                           // "2026-10-08 19:42:07" if a phone told us the time
  if (!epochAtBoot) return "t+" + String(millis() / 1000) + "s";
  time_t t = (epochAtBoot + millis()) / 1000;
  char b[24]; strftime(b, sizeof b, "%Y-%m-%d %H:%M:%S", localtime(&t));
  return b;
}
void logLine(const String& s) {
  File f = LittleFS.open("/log.txt", "a");
  if (f) { f.println(stamp() + "  " + s); f.close(); }
  Serial.println("LOG " + s);
}

void handleLog() {
  File f = LittleFS.open("/log.txt", "r");
  String head = "CAPTAIN'S LOG - S.S. Jack-o'-Lantern\nstorage used " +
    String(LittleFS.usedBytes() / 1024) + " KB of " + String(LittleFS.totalBytes() / 1024) + " KB\n\n";
  server.setContentLength(head.length() + (f ? f.size() : 0));
  server.send(200, "text/plain; charset=utf-8", "");
  server.sendContent(head);
  if (f) { server.client().write(f); f.close(); }
}
// called whenever the motors' real output changes: a run = motors on until they stop
void trackRun(int l, int r) {
  int p = max(abs(l), abs(r));
  if (p && !running) { running = true; runStart = millis(); runPeak = 0; }
  if (running) runPeak = max(runPeak, p);
  if (!p && running) {
    running = false;
    logLine("RUN      " + driver + "  " + String((millis() - runStart) / 1000.0, 1) + " s, top power " + String(runPeak) + "%");
  }
}

// ---- STAY CONNECTED ---------------------------------------------------------
// Phones and laptops test a joined Wi-Fi by fetching a known address. They all
// get the exact "all good" reply they are checking for, so they stay on the
// boat's Wi-Fi instead of drifting back to mobile data, and never pop up a
// "Sign in to network" page.
// Bonus: any http:// address typed while on the boat's Wi-Fi opens the helm.
void sendHelm() { server.send_P(200, "text/html", PAGE); }

// ---- NEW CODE OVER WI-FI (OTA) ---------------------------------------------
// You do NOT have to plug the boat into USB to change the code. Run
// `bash tools/flash-wifi.sh` while on the boat's Wi-Fi: it compiles and POSTs the
// new firmware here. The ESP32 writes it to the SPARE half of its flash and only
// switches over if the whole file arrived, so a dropped Wi-Fi leaves the old,
// working code running. USB is still the way back if an upload ever does go bad.
const char* FW_BUILT = __DATE__ " " __TIME__;      // proves which build is running
bool otaOK = false;                  // did a REAL update, with the password, finish?
void handleUpdateDone() {
  server.sendHeader("Connection", "close");
  if (!otaOK) { server.send(403, "text/plain", "no - wrong password or bad file"); return; }
  server.send(200, "text/plain", "OK - rebooting");
  delay(300);
  ESP.restart();                     // ONLY after a good upload: a stranger on the
}                                    // Wi-Fi must not be able to reboot the boat mid-race
void handleUpdateData() {
  HTTPUpload& up = server.upload();
  if (up.status == UPLOAD_FILE_START) {
    otaOK = false;
    if (server.arg("key") != String(AP_PASS)) { Serial.println("OTA: wrong password, ignored"); return; }
    setTarget(0, 0); drive(0, 0);                            // motors OFF while flashing
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
void handleOther() {
  String u = server.uri();
  if (u == "/generate_204" || u == "/gen_204") { server.send(204); return; }       // Android, Chrome
  if (u == "/hotspot-detect.html" || u.startsWith("/library/test/success")) {        // iPhone, iPad, Mac
    server.send(200, "text/html", "<HTML><HEAD><TITLE>Success</TITLE></HEAD><BODY>Success</BODY></HTML>");
    return;
  }
  if (u == "/connecttest.txt") { server.send(200, "text/plain", "Microsoft Connect Test"); return; }  // Windows
  if (u == "/ncsi.txt") { server.send(200, "text/plain", "Microsoft NCSI"); return; }
  if (u == "/success.txt") { server.send(200, "text/plain", "success\n"); return; }                   // Firefox
  sendHelm();                                  // anything else: show the helm
}

void setup() {
  Serial.begin(115200);
  pinMode(LED, OUTPUT);
  pinMode(DRV_EEP, OUTPUT);   digitalWrite(DRV_EEP, HIGH);    // wake the motor driver
  pinMode(LED_PORT, OUTPUT);  digitalWrite(LED_PORT, HIGH);   // nav lights always on
  pinMode(LED_STBD, OUTPUT);  digitalWrite(LED_STBD, HIGH);
  pinMode(LED_STERN, OUTPUT);

  PWM_SETUP(L_IN1, 0); PWM_SETUP(L_IN2, 1);
  PWM_SETUP(R_IN1, 2); PWM_SETUP(R_IN2, 3);
  setTarget(0, 0); drive(0, 0);

  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.println();
  Serial.print("Wi-Fi: "); Serial.println(AP_SSID);
  Serial.print("Open:  http://"); Serial.println(WiFi.softAPIP());   // 192.168.4.1
  Serial.print("Built: "); Serial.println(FW_BUILT);

  prefs.begin("helm", false);
  LittleFS.begin(true);                        // true = format it the first time
  logLine("BOOT     built " + String(FW_BUILT));
  dns.start(53, "*", WiFi.softAPIP());         // every name -> the boat (see STAY CONNECTED)

  server.on("/", sendHelm);
  server.on("/drive", handleDrive);
  server.on("/cfg", handleCfg);
  server.on("/log", handleLog);
  // getSketchMD5() is the fingerprint of the code actually running, so an update
  // can be PROVED to have landed even if two builds are otherwise identical.
  server.on("/version", []() {
    server.send(200, "text/plain", String(FW_BUILT) + " md5 " + ESP.getSketchMD5());
  });
  server.on("/update", HTTP_POST, handleUpdateDone, handleUpdateData);
  server.on("/favicon.ico", []() { server.send(204); });   // browsers always ask; no 404 in the console
  server.onNotFound(handleOther);
  server.begin();
}

void loop() {
  dns.processNextRequest();
  server.handleClient();

  if (millis() - lastCommand > FAILSAFE_MS) {
    if (!stopped) Serial.println("FAILSAFE: lost the tablet, motors stopped");
    setTarget(0, 0);
  }

  // stern light: solid = the tablet is talking to us, blinking = nobody's driving
  bool linked = (millis() - lastCommand <= FAILSAFE_MS);
  digitalWrite(LED_STERN, linked ? HIGH : ((millis() / 400) % 2));
  // walk the outputs toward the target every 10 ms (soft start)
  if (millis() - lastSlew >= 10) {
    lastSlew = millis();
    int nl = slew(outL, targetL), nr = slew(outR, targetR);
    if (nl != outL || nr != outR) { outL = nl; outR = nr; drive(outL, outR); }
  }
}
