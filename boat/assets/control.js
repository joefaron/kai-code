/* ===========================================================================
   Helm v4 - ONE pad. The two axes behave DIFFERENTLY, and that is the trick.

     UP/DOWN  = throttle, and it STAYS where you put it (sticky).
     LEFT/RIGHT = steering, and it SPRINGS BACK to straight when you let go.

   So: shove up to set a speed, flick right to turn, release -> the boat keeps
   going at the same speed, now pointed the new way. That is "up is forward,
   right is right" without needing two thumbs.

   v1 was one pad with BOTH axes springing back (you had to hold everything).
   v2 was two separate sticks (fine on a tablet, awful with one mouse).
   v3 is one pad that behaves like a throttle lever and a tiller at once.
   v4 adds tuning knobs (saved in this browser), fan % readouts and sound.

   Keyboard, for driving at a desk:
     Up / Down  ramp the throttle up and down (hold them)
     Left / Right steer while held
     Space      all stop
   =========================================================================== */
(function () {
  var L = 0, R = 0;                 // what the fans are ACTUALLY doing, -100..100
  var tL = 0, tR = 0;               // what the mix WANTS (L/R chase these)
  var throttle = 0, steer = 0;      // -1..1

  /* ---------- tuning knobs, saved in localStorage so a reload keeps them ---------- */
  var DEFAULTS = { trim: 0, steer: 60, expo: 0, accel: 2, maxp: 100, minp: 30,
                   invL: false, invR: false, swap: false, sound: false };
  // seconds to go from 0 to full power, per "Throttle response" notch. 0.25 s is
  // the fastest there is: the boat's own soft start (boat.ino) never goes quicker,
  // because slamming a motor from 0 to full trips the driver's overcurrent cut-out.
  var RAMP = [1, 0.5, 0.25];
  var RAMP_NAME = ['gentle (1 s to full)', 'smooth (0.5 s)', 'normal (0.25 s, fastest)'];
  var KEY = 'boatHelm';
  var cfg = load();

  function load() {
    var c = {}, saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
    for (var k in DEFAULTS) c[k] = (k in saved) ? saved[k] : DEFAULTS[k];
    if (!(c.accel in RAMP)) c.accel = DEFAULTS.accel;   // older saves had 5 notches
    return c;
  }
  // On the boat's own page the knobs are ALSO kept on the boat (/cfg), so every
  // tablet or phone that drives it gets the same trim. Sound stays per device.
  var boatSave = 0;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {}
    if (!window.BOAT_LOCAL) return;
    clearTimeout(boatSave);                    // wait for the slider to stop moving,
    boatSave = setTimeout(function () {        // so flash isn't written 50 times a second
      var c = {}; for (var k in cfg) if (k !== 'sound') c[k] = cfg[k];
      fetch('/cfg', { method: 'POST', body: JSON.stringify(c) }).catch(function () {});
    }, 800);
  }
  if (window.BOAT_LOCAL) {
    fetch('/cfg').then(function (r) { return r.json(); }).then(function (b) {
      for (var k in b) if (k in DEFAULTS && k !== 'sound') cfg[k] = b[k];
      if (!(cfg.accel in RAMP)) cfg.accel = DEFAULTS.accel;
      try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {}
      showKnobs(); mix();
    }).catch(function () {});
  }

  var LABEL = {
    trim: function (v) { return v === 0 ? 'centred' : (v > 0 ? 'pull right ' : 'pull left ') + Math.abs(v); },
    steer: function (v) { return v + '%' + (v === 60 ? ' (default)' : v >= 100 ? ' (spins on the spot)' : ''); },
    expo: function (v) { return v === 0 ? 'straight line' : v + '% softer in the middle'; },
    accel: function (v) { return RAMP_NAME[v]; },
    maxp: function (v) { return v + '%' + (v === 100 ? ' (no limit)' : ''); },
    minp: function (v) { return v === 0 ? 'off (raw power)' : 'fans start at ' + v + '%'; }
  };
  function showKnobs() {
    Object.keys(LABEL).forEach(function (k) {
      document.getElementById('s-' + k).value = cfg[k];
      document.getElementById('v-' + k).textContent = LABEL[k](cfg[k]);
    });
    ['invL', 'invR', 'swap'].forEach(function (k) { document.getElementById('s-' + k).checked = cfg[k]; });
    document.getElementById('soundBtn').innerHTML = cfg.sound ? '&#128266; SOUND' : '&#128263; SOUND';
    document.getElementById('soundBtn').classList.toggle('on', cfg.sound);
  }
  Object.keys(LABEL).forEach(function (k) {
    document.getElementById('s-' + k).addEventListener('input', function (e) {
      cfg[k] = parseInt(e.target.value, 10); save(); showKnobs(); mix();
    });
  });
  ['invL', 'invR', 'swap'].forEach(function (k) {
    document.getElementById('s-' + k).addEventListener('change', function (e) { cfg[k] = e.target.checked; save(); });
  });
  document.getElementById('defaults').addEventListener('click', function () {
    for (var k in DEFAULTS) if (k !== 'sound') cfg[k] = DEFAULTS[k];
    save(); showKnobs(); mix();
  });

  /* ---------- the mix: two axes -> two fan speeds ----------
     The ONE piece of math that also lives in the Arduino sketch. */
  function mix() {
    var e = cfg.expo / 100;
    var s = steer * (1 - e) + steer * steer * steer * e;   // expo: gentle near the middle
    var a = cfg.steer / 100, top = cfg.maxp / 100;
    var l = clamp(throttle + s * a), r = clamp(throttle - s * a);
    var t = cfg.trim / 100;                               // trim slows the STRONGER fan,
    if (t > 0) r *= 1 - t; else l *= 1 + t;               // so nothing spins at idle
    tL = Math.round(l * top * 100);
    tR = Math.round(r * top * 100);
    if (RAMP[cfg.accel] === 0) { L = tL; R = tR; paint(); }
  }
  function clamp(v) { return v < -1 ? -1 : v > 1 ? 1 : v; }

  // Throttle response: the fans may only change so fast (percent per second).
  function slew(dt) {
    var sec = RAMP[cfg.accel];
    if (sec === 0) return;
    var max = 100 / sec * dt;
    var nl = L + Math.max(-max, Math.min(max, tL - L));
    var nr = R + Math.max(-max, Math.min(max, tR - R));
    if (nl !== L || nr !== R) { L = nl; R = nr; paint(); }
  }

  /* ---------- the pad ---------- */
  var pad = document.getElementById('pad'), knob = document.getElementById('knob');
  var dragging = false;

  function at(e) {
    var b = pad.getBoundingClientRect(), p = e.touches ? e.touches[0] : e;
    steer = clamp((p.clientX - b.left) / b.width * 2 - 1);
    throttle = clamp(-((p.clientY - b.top) / b.height * 2 - 1));
    if (Math.abs(steer) < 0.08) steer = 0;        // centre detent
    if (Math.abs(throttle) < 0.08) throttle = 0;
    render();
  }
  function render() {
    var b = pad.getBoundingClientRect();
    var hw = (b.width - knob.offsetWidth) / 2, hh = (b.height - knob.offsetHeight) / 2;
    knob.style.left = (hw + steer * hw) + 'px';
    knob.style.top = (hh - throttle * hh) + 'px';
    mix();
    var t = document.getElementById('thrPct');
    if (t) t.textContent = (throttle === 0 ? 'idle'
      : (throttle > 0 ? 'ahead ' : 'astern ') + Math.abs(Math.round(throttle * 100)) + '%');
  }
  // Letting go re-centres ONLY the steering. The throttle stays put.
  function release() { dragging = false; steer = 0; render(); }

  pad.addEventListener('mousedown', function (e) { dragging = true; at(e); });
  window.addEventListener('mousemove', function (e) { if (dragging) at(e); });
  window.addEventListener('mouseup', function () { if (dragging) release(); });
  pad.addEventListener('touchstart', function (e) { dragging = true; at(e); e.preventDefault(); }, { passive: false });
  pad.addEventListener('touchmove', function (e) { if (dragging) { at(e); e.preventDefault(); } }, { passive: false });
  pad.addEventListener('touchend', function (e) { release(); e.preventDefault(); }, { passive: false });

  // ALL STOP skips the throttle-response ramp: stopping is always instant.
  function allStop() { throttle = 0; steer = 0; render(); L = R = 0; paint(); beep(); }
  document.getElementById('stopBtn').addEventListener('click', allStop);
  var resetBtn = document.getElementById('resetBtn');
  if (resetBtn) resetBtn.addEventListener('click', function () { allStop(); resetBoat(); });
  document.getElementById('soundBtn').addEventListener('click', function () {
    cfg.sound = !cfg.sound; save(); showKnobs();
    if (cfg.sound) audioOn();
  });

  /* ---------- keyboard: ramp the throttle, hold to steer ---------- */
  var keys = {};
  window.addEventListener('keydown', function (e) {
    if (/^(INPUT|SELECT)$/.test(e.target.tagName)) return;   // let the sliders use arrows
    if (e.key.indexOf('Arrow') === 0 || e.key === ' ') {
      if (e.key === ' ') allStop(); else keys[e.key] = 1;
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', function (e) { keys[e.key] = 0; });
  var lastK = 0;
  function keyTick(now) {
    var dt = Math.min(100, now - (lastK || now)); lastK = now;
    var changed = false;
    var ramp = (dt / 1000) * 1.2;                       // full throttle in ~0.8s
    if (keys.ArrowUp) { throttle = clamp(throttle + ramp); changed = true; }
    if (keys.ArrowDown) { throttle = clamp(throttle - ramp); changed = true; }
    var want = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
    if (!dragging && want !== steer) { steer = want; changed = true; }
    if (changed) render();
    slew(dt / 1000);
    spin(dt / 1000);
    hum();
    requestAnimationFrame(keyTick);
  }
  requestAnimationFrame(keyTick);

  /* ---------- readout: % per fan, and the fan icons spin at that speed ---------- */
  function paint() {
    [['L', L], ['R', R]].forEach(function (m) {
      var v = Math.round(m[1]);
      setBar('bar' + m[0], v);
      document.getElementById('num' + m[0]).textContent = Math.abs(v) + '%';
      var d = document.getElementById('dir' + m[0]);
      d.textContent = v > 0 ? 'pushing forward' : v < 0 ? 'blowing backward' : 'stopped';
      d.className = v < 0 ? 'rev' : '';
    });
  }
  function setBar(id, v) {
    var el = document.getElementById(id), w = Math.abs(v) / 2;
    el.style.left = (v >= 0 ? 50 : 50 - w) + '%';
    el.style.width = w + '%';
    el.style.background = v >= 0 ? 'var(--ghost)' : 'var(--pumpkin)';
  }
  var fanL = document.querySelector('#fanL g'), fanR = document.querySelector('#fanR g'), angL = 0, angR = 0;
  function spin(dt) {
    angL += L * 12 * dt; angR -= R * 12 * dt;       // full power ~ 3 turns a second
    fanL.setAttribute('transform', 'rotate(' + (angL % 360) + ')');
    fanR.setAttribute('transform', 'rotate(' + (angR % 360) + ')');
  }

  /* ---------- sound: a buzzy hum per fan, pitch follows power ----------
     Browsers only allow audio after a click, so it starts from the SOUND button. */
  var ac = null, motors = [];
  function audioOn() {
    if (!ac) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      lp.connect(ac.destination);
      for (var i = 0; i < 2; i++) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sawtooth'; o.frequency.value = 60; g.gain.value = 0;
        o.connect(g); g.connect(lp); o.start();
        motors.push({ o: o, g: g });
      }
    }
    if (ac.state === 'suspended') ac.resume();
  }
  function hum() {
    if (!ac) return;
    [L, R].forEach(function (v, i) {
      var p = Math.abs(v) / 100, m = motors[i], now = ac.currentTime;
      m.o.frequency.setTargetAtTime(70 + 260 * p + i * 3, now, 0.05);   // i*3: a slight beat
      m.g.gain.setTargetAtTime(cfg.sound && p > 0 ? 0.03 + 0.07 * p : 0, now, 0.05);
    });
  }
  function tone(freq, len, type, vol) {
    if (!ac || !cfg.sound) return;
    var o = ac.createOscillator(), g = ac.createGain(), now = ac.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, now);
    o.frequency.exponentialRampToValueAtTime(freq / 3, now + len);
    g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + len);
    o.connect(g); g.connect(ac.destination); o.start(now); o.stop(now + len);
  }
  function beep() { tone(880, 0.25, 'square', 0.08); }
  function thud() { tone(140, 0.18, 'triangle', 0.25); }
  if (cfg.sound) {                                  // a reload can't auto-start audio,
    var wake = function () { audioOn(); window.removeEventListener('pointerdown', wake); window.removeEventListener('keydown', wake); };
    window.addEventListener('pointerdown', wake);   // so wake it on the first touch
    window.addEventListener('keydown', wake);
  }

  /* ---------- send to the boat, 10x a second (also the fail-safe heartbeat) ----------
     Flip/swap are applied HERE, only on the way to the hardware: they fix wiring,
     so the readout and simulator always show what the boat SHOULD do. */
  // BOAT_LOCAL is set when the boat itself serves this page (http://192.168.4.1):
  // then there is nothing to choose, it always drives the boat it came from.
  var LOCAL = !!window.BOAT_LOCAL;
  var targetSel = document.getElementById('target'), status = document.getElementById('status');
  if (LOCAL) { document.getElementById('targetField').style.display = 'none'; say('looking for the boat...', true); }
  function kick(v) {
    var m = cfg.minp || 0;
    if (!v || !m) return v;
    return (v < 0 ? -1 : 1) * Math.round(m + (100 - m) * Math.abs(v) / 100);
  }
  var busy = false;
  // Link watchdog. THREE misses in a row (~0.3 s) before we shout, so one dropped packet
  // does not flash the banner; a single success clears it.
  var misses = 0, lost = false, banner = document.getElementById('linkloss');
  function linkLost() {
    if (lost) return;
    lost = true;
    if (banner) banner.hidden = false;
    document.body.classList.add('lost');
    // The boat has already fail-safed its fans. Put the HELM back to zero too, so that
    // reconnecting does not slam it straight back to whatever the stick was left at.
    throttle = 0; steer = 0; render(); L = R = 0; paint();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
    thud();
  }
  function linkOk() {
    if (!lost) return;
    lost = false;
    if (banner) banner.hidden = true;
    document.body.classList.remove('lost');
    beep();
  }
  setInterval(function () {
    var base = LOCAL ? '' : (targetSel ? targetSel.value : 'sim');
    if (base === 'sim' || busy) return;
    busy = true;
    // Motor start power: a motor does nothing at all below ~30-40% PWM (it cannot break
    // its own friction), so 1-100% of stick is squeezed into minp-100% of power. Same
    // place as flip/swap: it fixes the HARDWARE, so the readout still shows 1% as 1%.
    var l = kick(Math.round(L)) * (cfg.invL ? -1 : 1), r = kick(Math.round(R)) * (cfg.invR ? -1 : 1);
    if (cfg.swap) { var x = l; l = r; r = x; }
    fetch(base + '/drive?l=' + l + '&r=' + r, { mode: 'cors' })
      // A different router (or a captive portal) can answer with a page of its own, so a
      // reply only counts if it is actually an OK from the boat's /drive.
      .then(function (r) { if (r && r.ok === false) throw 0; misses = 0; linkOk(); say('connected to boat', true); })
      .catch(function () {
        if (++misses >= 3) linkLost();
        say(LOCAL ? 'lost the boat - its fans stop by themselves after 0.8 s' : 'no boat at ' + base + ' - is the tablet on its Wi-Fi?', false);
      })
      .then(function () { busy = false; });
  }, 100);
  // A phone that hops to another Wi-Fi fires this long before a fetch times out.
  window.addEventListener('offline', function () { if (!LOCAL) return; misses = 3; linkLost(); });
  function say(t, ok) { status.textContent = t; status.className = 'status ' + (ok ? 'ok' : 'err'); }
  if (targetSel) targetSel.addEventListener('change', function () {
    say(targetSel.value === 'sim' ? 'simulator ready' : 'trying ' + targetSel.value + '...', true);
  });

  /* ===========================================================================
     SIMULATOR
     Velocity is a real 2D vector, split into forward and sideways every frame.
     Forward is pushed by the props and bleeds off slowly; sideways is bled off
     FAST (that is what a hull does). So the boat slides a little through a
     turn instead of pivoting on the spot.
     Tuned so: cruise ~150 px/s (~6s to cross), full steer ~60 deg/s.
     =========================================================================== */
  var ACCEL = 0.05, FWD_DRAG = 0.98, SIDE_DRAG = 0.86;
  var TURN_ACCEL = 0.0021, TURN_DRAG = 0.88, PIVOT_FRACTION = 0.45;

  // EVERY constant above is "per 1/60th of a second". They MUST be scaled by
  // real elapsed time or the boat behaves differently on different screens:
  // on a 165 Hz monitor the old loop ran 2.75x per frame-budget, which made it
  // accelerate like a rocket and spin on the spot. That was the actual bug.
  var lastT = 0;

  var cv = document.getElementById('sim'), ctx = cv && cv.getContext('2d');   // no sim on the boat's page
  var START = { x: 160, y: 200, a: 0 };
  var boat = { x: START.x, y: START.y, a: 0, vx: 0, vy: 0, w: 0 };
  var buoys = [[320, 90], [640, 110], [720, 290], [400, 315]];
  var wakeTrail = [];
  var bumped = false;

  function step(now) {
    if (!lastT) lastT = now || 0;
    var dt = ((now || 0) - lastT) / 16.667;     // 1.0 == one 60 Hz frame
    lastT = now || 0;
    if (!(dt > 0)) dt = 1;
    if (dt > 3) dt = 3;                         // tab was backgrounded - don't teleport

    var thrust = (L + R) / 200;                 // -1..1  both motors together
    var diff = (L - R) / 200;                   // -1..1  the difference turns it

    var ca = Math.cos(boat.a), sa = Math.sin(boat.a);
    var f = boat.vx * ca + boat.vy * sa;        // forward component
    var s = -boat.vx * sa + boat.vy * ca;       // sideways component

    f += thrust * ACCEL * dt;
    f *= Math.pow(FWD_DRAG, dt);
    s *= Math.pow(SIDE_DRAG, dt);

    // A boat turns better when it is moving; an airboat can still pivot when
    // stopped, just more slowly. That's the PIVOT_FRACTION floor.
    var speedFactor = PIVOT_FRACTION + (1 - PIVOT_FRACTION) * Math.min(1, Math.abs(f) / 2.5);
    boat.w += diff * TURN_ACCEL * speedFactor * dt;
    boat.w *= Math.pow(TURN_DRAG, dt);
    boat.a += boat.w * dt;

    ca = Math.cos(boat.a); sa = Math.sin(boat.a);
    boat.vx = f * ca - s * sa;
    boat.vy = f * sa + s * ca;
    boat.x += boat.vx * dt; boat.y += boat.vy * dt;

    // Touching the shore kills the speed INTO the bank but keeps the speed
    // ALONG it, so you graze the edge and keep going instead of getting stuck
    // grinding against it with the throttle open.
    var m = 22, hit = 0;
    if (boat.x < m) { boat.x = m; if (boat.vx < 0) { hit = -boat.vx; boat.vx = 0; } }
    if (boat.x > cv.width - m) { boat.x = cv.width - m; if (boat.vx > 0) { hit = boat.vx; boat.vx = 0; } }
    if (boat.y < m) { boat.y = m; if (boat.vy < 0) { hit = Math.max(hit, -boat.vy); boat.vy = 0; } }
    if (boat.y > cv.height - m) { boat.y = cv.height - m; if (boat.vy > 0) { hit = Math.max(hit, boat.vy); boat.vy = 0; } }
    if (hit > 0.8 && !bumped) thud();           // one thud per bump, not one per frame
    bumped = hit > 0;

    var spd = Math.sqrt(boat.vx * boat.vx + boat.vy * boat.vy);
    if (spd > 0.15) wakeTrail.push({ x: boat.x, y: boat.y, t: 1 });
    if (wakeTrail.length > 400) wakeTrail.shift();

    // ---- draw ----
    ctx.fillStyle = '#09202c'; ctx.fillRect(0, 0, cv.width, cv.height);
    for (var i = 0; i < wakeTrail.length; i++) {
      var p = wakeTrail[i]; p.t -= 0.0035 * dt;
      ctx.fillStyle = 'rgba(124,224,198,' + Math.max(0, p.t) * 0.3 + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, (1 - p.t) * 8 + 2, 0, 7); ctx.fill();
    }
    buoys.forEach(function (b) {
      ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.arc(b[0], b[1], 7, 0, 7); ctx.fill();
    });
    ctx.save();
    ctx.translate(boat.x, boat.y); ctx.rotate(boat.a);
    ctx.fillStyle = '#e7ecf4';
    ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-12, -10); ctx.lineTo(-12, 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = L >= 0 ? '#7ce0c6' : '#ff5470';
    ctx.fillRect(-15, -12, 5, -(6 * Math.abs(L) / 100 + 2) * (L >= 0 ? -1 : 1));
    ctx.fillStyle = R >= 0 ? '#7ce0c6' : '#ff5470';
    ctx.fillRect(-15, 7, 5, (6 * Math.abs(R) / 100 + 2));
    ctx.restore();

    var sp = document.getElementById('spd');
    if (sp) sp.textContent = Math.round(spd * 60) + ' px/s';

    requestAnimationFrame(step);
  }

  function resetBoat() {
    boat.x = START.x; boat.y = START.y; boat.a = START.a;
    boat.vx = boat.vy = boat.w = 0; wakeTrail.length = 0;
  }

  // render() puts the knob in the centre; without it the knob starts in the top-left corner
  window.addEventListener('resize', render);
  showKnobs(); render(); paint(); if (cv) step();
})();
