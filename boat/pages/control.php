<link rel="stylesheet" href="/assets/helm.css?v=4">
<section>
  <h2>Helm</h2>
  <p class="lede"><strong>Up is forward. Right is right.</strong> One pad &mdash; but the two
  axes behave differently, which is the whole trick: <em>up/down sets the speed and it stays
  there</em>, while <em>left/right springs back to straight</em> when you let go. Shove up,
  flick right, release &mdash; the boat carries on at the same speed on its new heading.</p>
</section>

<!-- helm:start (tools/build-helm.mjs copies this block into the boat's own page) -->
<!-- GAME HUD v2.3 (Kai + Joe 2026-10-28). Looks: assets/helm.css. Every id is used by control.js. -->
<div class="gamehud">
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-up" viewBox="0 0 24 24"><path d="M12 5l9 9-3 3-6-6-6 6-3-3z"/></symbol>
  <symbol id="i-stop" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M7.3 1h9.4L23 7.3v9.4L16.7 23H7.3L1 16.7V7.3zM8.1 3.4L3.4 8.1v7.8l4.7 4.7h7.8l4.7-4.7V8.1l-4.7-4.7zM10.4 6h3.2v7.6h-3.2zM10.4 15.2h3.2v3.2h-3.2z"/></symbol>
  <symbol id="i-laser" viewBox="0 0 28 24"><path d="M1 7.5L3 6h3.5V4.5h3V6H16l2-1.5h2.5v9H18L16 12h-4.5l-2 8.5H4.2L6.4 12H3l-2-1.5z"/><path d="M21.5 7.4h6.3v1.8h-6.3zM21.5 10.6h4.6v1.4h-4.6zM21.8 4.6l4.6-2.2.6 1.3-4.6 2.2z"/></symbol>
  <symbol id="i-gauge" viewBox="0 0 24 24"><path d="M12 4A10.5 10.5 0 0 0 1.5 14.5h3a7.5 7.5 0 0 1 15 0h3A10.5 10.5 0 0 0 12 4z"/><path d="M10.6 13.2l6-6.2 1.2 1-4.6 7a2 2 0 1 1-2.6-1.8z"/></symbol>
  <symbol id="i-batt" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M1 6.5h18v3h3v5h-3v3H1zM3 8.5v7h14v-7zM10.5 9l-3.5 4h2.6l-1 2.6 3.9-4.3H10z"/></symbol>
  <symbol id="i-spk" viewBox="0 0 24 24"><path d="M2 9h4.5L12 4.5v15L6.5 15H2z"/></symbol>
  <symbol id="i-knobs" viewBox="0 0 24 24"><path d="M2 5h9v2.4H2zM17 5h5v2.4h-5zM11.5 3h4.5v6.4h-4.5zM2 11h4v2.4H2zM12 11h10v2.4H12zM6.5 9h4.5v6.4H6.5zM2 17h11v2.4H2zM19 17h3v2.4h-3zM13.5 15H18v6.4h-4.5z"/></symbol>
  <symbol id="i-log" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4 2h12l4 4v16H4zM7 9v2h10V9zM7 13v2h10v-2zM7 17v2h7v-2z"/></symbol>
</svg>

<!-- Shown ONLY when the boat stops answering. Joe lost the link at the hot tub and the page
     still looked alive (small red line, fans still reading 17%), so this is deliberately loud. -->
<div id="linkloss" class="linkloss" hidden>
  <b>&#9888; NO LINK TO THE BOAT</b>
  <span>Its fans stopped by themselves after 0.8&nbsp;s. The helm has been put back to zero.
  Check the tablet is still on <code>SS-JACKOLANTERN-v2.4</code> (phones jump to a known Wi-Fi when the boat is switched off).</span>
</div>
<!-- Shown when the boat says new code is on its way (v2.4, Joe 2026-10-28: the helm looked
     "connected" all through an update). Replaces the NO LINK banner until the boat is back. -->
<div id="otabanner" class="linkloss otabanner" hidden>
  <b>&#128295; NEW CODE ARRIVING</b>
  <span>The boat is updating itself. Fans are OFF. <strong>Don't switch it off.</strong>
  It restarts in about 30&nbsp;s as <code id="otaSsid">a new Wi-Fi name</code>: join that Wi-Fi and this page reloads by itself.
  <em id="otaClock"></em></span>
</div>

<header class="hudlogo">
  <svg class="emblem" viewBox="0 0 64 70" aria-hidden="true">
    <defs>
      <linearGradient id="hudSh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a46bff"/><stop offset="1" stop-color="#2a0f8a"/></linearGradient>
      <radialGradient id="hudPk" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#ffd86b"/><stop offset=".55" stop-color="#ff8a00"/><stop offset="1" stop-color="#c24400"/></radialGradient>
    </defs>
    <path d="M32 3L60 12V34C60 52 47 62 32 68C17 62 4 52 4 34V12Z" fill="url(#hudSh)" stroke="#ffe14d" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M32 9L54 16V34C54 48 44 56 32 61" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>
    <path d="M30 24c0-5 1.5-8 5-9.5l2.4 2.4C35 18 34.6 20.5 34.6 24z" fill="#3fd16b" stroke="#12043a" stroke-width="1.6" stroke-linejoin="round"/>
    <g fill="url(#hudPk)" stroke="#12043a" stroke-width="2">
      <ellipse cx="21.5" cy="40" rx="10.5" ry="13.5"/><ellipse cx="42.5" cy="40" rx="10.5" ry="13.5"/><ellipse cx="32" cy="40" rx="11.5" ry="15"/>
    </g>
    <g fill="#fff6a8" stroke="#12043a" stroke-width="1.2" stroke-linejoin="round">
      <path d="M19.5 38.5h8l-4-7z"/><path d="M36.5 38.5h8l-4-7z"/>
      <path d="M20 44h24l-3 6-3-2.6-3 3.4-3-3.4-3 3.4-3-3.4-3 2.6z"/>
    </g>
  </svg>
  <div class="wm">
    <span class="ss hf">S.S.</span>
    <span class="name hf">JACK-O&rsquo;-LANTERN</span>
    <span class="tagline hf">BOAT COMMAND <i>v2.3</i></span>
  </div>
</header>
<!-- boatlinks -->

<div class="hudbar">
  <div id="status" class="status ok">simulator ready &middot; speed <em id="spd">0 px/s</em></div>
  <div class="chip"><svg><use href="#i-gauge"/></svg><span><small>Throttle</small><em id="thrPct">idle</em></span></div>
  <div class="chip" title="The AA pack that drives the fans, measured by the boat. The USB bank that runs the brain shows its own % on its lights."><svg><use href="#i-batt"/></svg><span><small>Motor battery</small><em id="battPct">&ndash;</em></span></div>
</div>

<div class="hudgrid">
  <div class="hudcol">
    <div id="pad" class="gpad">
      <svg class="padart" viewBox="0 0 100 100" aria-hidden="true">
        <g fill="none" stroke="#3ef0ff" vector-effect="non-scaling-stroke">
          <circle cx="50" cy="50" r="15" stroke-opacity=".45" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
          <circle cx="50" cy="50" r="30" stroke-opacity=".3" stroke-width="1.5" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>
          <circle cx="50" cy="50" r="45" stroke-opacity=".22" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
          <path d="M50 4V96M4 50H96" stroke-opacity=".45" stroke-width="2" vector-effect="non-scaling-stroke"/>
          <path d="M3 15V3H15M85 3H97V15M97 85V97H85M15 97H3V85" stroke="#ffe14d" stroke-width="4" vector-effect="non-scaling-stroke"/>
        </g>
      </svg>
      <div id="knob" class="gknob"><svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 1 0 0-17zm0 3a5.5 5.5 0 1 1 0 11 5.5 5.5 0 1 1 0-11zM10.6 10.6h2.8v2.8h-2.8zM11 0h2v5h-2zM11 19h2v5h-2zM0 11h5v2H0zM19 11h5v2h-5z"/></svg></div>
      <span class="ghint hf n"><svg><use href="#i-up"/></svg>FWD</span>
      <span class="ghint hf s">REV<svg style="transform:rotate(180deg)"><use href="#i-up"/></svg></span>
      <span class="ghint w"><svg style="transform:rotate(-90deg)"><use href="#i-up"/></svg></span>
      <span class="ghint e"><svg style="transform:rotate(90deg)"><use href="#i-up"/></svg></span>
    </div>
    <div class="gbtns">
      <button id="stopBtn" class="gbtn g-stop" title="Throttle is sticky, so letting go does NOT stop the boat. This does. (space)"><span style="display:flex;align-items:center;gap:12px"><svg><use href="#i-stop"/></svg>ALL STOP</span></button>
      <button id="laserBtn" class="gbtn g-laser" title="PEW PEW (L)"><span style="display:flex;align-items:center;gap:10px"><svg viewBox="0 0 28 24" style="width:36px"><use href="#i-laser"/></svg>LASERS</span><i class="charge"></i></button>
      <button id="soundBtn" class="gbtn g-sound" title="Motor sounds on/off"><span style="display:flex;flex-direction:column;align-items:center;gap:3px">
        <svg viewBox="0 0 24 24"><use href="#i-spk"/><g class="on-i" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M15 9a4 4 0 0 1 0 6M17.8 6.2a8 8 0 0 1 0 11.6"/></g><g class="off-i" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M15.5 9.5l5 5M20.5 9.5l-5 5"/></g></svg>
        <b>SOUND</b></span></button>
    </div>
  </div>

  <div class="hudtelem gtelem">
    <div class="gfans">
      <div class="gfan">
        <svg id="fanL" class="prop" viewBox="-20 -20 40 40"><g><path d="M0 0C4-6 3-16 0-17C-3-16-4-6 0 0Z"/><path d="M0 0C4-6 3-16 0-17C-3-16-4-6 0 0Z" transform="rotate(120)"/><path d="M0 0C4-6 3-16 0-17C-3-16-4-6 0 0Z" transform="rotate(240)"/><circle r="3"/></g></svg>
        <div style="min-width:0"><span class="hf">LEFT FAN</span><b id="numL">0%</b><small id="dirL">stopped</small></div>
      </div>
      <div class="gfan">
        <svg id="fanR" class="prop" viewBox="-20 -20 40 40"><g><path d="M0 0C4-6 3-16 0-17C-3-16-4-6 0 0Z"/><path d="M0 0C4-6 3-16 0-17C-3-16-4-6 0 0Z" transform="rotate(120)"/><path d="M0 0C4-6 3-16 0-17C-3-16-4-6 0 0Z" transform="rotate(240)"/><circle r="3"/></g></svg>
        <div style="min-width:0"><span class="hf">RIGHT FAN</span><b id="numR">0%</b><small id="dirR">stopped</small></div>
      </div>
    </div>
    <div class="ggauge"><span class="hf">L</span><div class="bar"><i id="barL"></i></div></div>
    <div class="ggauge"><span class="hf">R</span><div class="bar"><i id="barR"></i></div></div>
    <!-- A public https site is NOT allowed to talk to a gadget on your local Wi-Fi (Chrome
         blocks it), so this page only drives the simulator. The real boat serves its own copy. -->
    <p class="field" id="targetField"><strong>Drive the real boat:</strong> join the Wi-Fi
    <code>SS-JACKOLANTERN-v2.3</code> (the password is in <code>boat.ino</code>; don't post it, or anyone at the beach could drive your boat), then open
    <a href="http://192.168.4.1">http://192.168.4.1</a> (or just type <code>http://boat</code>).
    Same page, served by the boat.</p>

    <details class="knobs" open>
      <summary><svg><use href="#i-knobs"/></svg>Tuning knobs <small>(they stay set when you reload)</small></summary>
      <label class="field">Trim <em id="v-trim"></em>
        <input type="range" id="s-trim" min="-20" max="20" step="1"></label>
      <label class="field">Steering strength <em id="v-steer"></em>
        <input type="range" id="s-steer" min="20" max="100" step="5"></label>
      <label class="field">Steering feel <em id="v-expo"></em>
        <input type="range" id="s-expo" min="0" max="100" step="10"></label>
      <label class="field">Throttle response <em id="v-accel"></em>
        <input type="range" id="s-accel" min="0" max="2" step="1"></label>
      <label class="field">Top speed limit <em id="v-maxp"></em>
        <input type="range" id="s-maxp" min="30" max="100" step="5"></label>
      <label class="field">Motor start power <em id="v-minp"></em>
        <input type="range" id="s-minp" min="0" max="60" step="5"></label>
      <div class="checks">
        <label><input type="checkbox" id="s-invL"> flip left fan</label>
        <label><input type="checkbox" id="s-invR"> flip right fan</label>
        <label><input type="checkbox" id="s-swap"> swap left/right</label>
      </div>
      <button id="defaults" class="linkbtn">reset knobs to default</button>
    </details>

    <details class="knobs">
      <summary><svg><use href="#i-log"/></svg>Helm log <small>(what this phone saw &mdash; newest first)</small></summary>
      <pre id="helmlog" style="max-height:240px;overflow:auto;font-size:11px;white-space:pre-wrap;margin:6px 0"></pre>
      <button id="helmlogClear" class="linkbtn">clear this log</button>
      <a class="linkbtn" href="http://192.168.4.1/debug">boat's debug page</a>
      <a class="linkbtn" href="http://192.168.4.1/log">boat's full log</a>
    </details>

    <p class="kbd"><strong>At a desk:</strong> hold <kbd>&uarr;</kbd>/<kbd>&darr;</kbd> to ramp
    the throttle, <kbd>&larr;</kbd>/<kbd>&rarr;</kbd> to steer while held,
    <kbd>space</kbd> for all stop, <kbd>L</kbd> for lasers.</p>
  </div>
</div>

<div id="laserFx" class="laserfx" aria-hidden="true"></div>
<div id="laserMsg" class="lasermsg" role="status" hidden><b>PEW PEW PEW!</b><span id="laserTxt">Lasers not installed yet &mdash; flashing the red + green lights instead!</span></div>
</div>
<!-- helm:end -->

<div class="simwrap">
  <canvas id="sim" class="sim" width="900" height="420"></canvas>
  <button id="resetBtn" class="simreset" title="Simulator only - puts the boat back at the start">&#8634; back to start</button>
</div>
<p class="caption">Drive it around the buoys. The hull slides outward through a turn the
way a real one does, and full steering is about 60&deg; per second. If it feels wrong here,
it will feel wrong at the beach. Every tuning knob above changes the simulator too, so try
them here first.</p>

<section>
  <h2>What the knobs do</h2>
  <ul class="ticks">
    <li><strong>Trim.</strong> Two cheap motors never spin at exactly the same speed, so the
    boat pulls to one side. Trim slows the stronger fan a little. Nudge it until the boat runs
    straight with the pad centred. Same idea as trimming a plane.</li>
    <li><strong>Steering strength.</strong> How much of the power steering is allowed to move
    from one fan to the other. At 60%, full ahead + full right = left 100 / right 40. Turn it
    up and the boat turns tighter. At 100% one fan stops and the boat spins on the spot.</li>
    <li><strong>Steering feel.</strong> At 0 the steering is &ldquo;straight line&rdquo;:
    half-way on the pad means half a turn. Turn it up and small moves near the middle do much
    less, so it's easier to make tiny corrections, but a full push still gives a full turn.
    RC pilots call this <em>expo</em>.</li>
    <li><strong>Throttle response.</strong> How fast the fans are allowed to speed up. A
    gentle start is easier on the batteries and the prop clips. ALL STOP always stops at once.</li>
    <li><strong>Top speed limit.</strong> Handy for learning to drive, and to save battery.</li>
    <li><strong>Motor start power.</strong> A motor sitting still has to beat its own friction,
    so below about a third power it just buzzes and does nothing &mdash; that's the dead zone Joe
    found under ~40%. This squeezes 1&ndash;100% of the stick into <em>start power</em>&ndash;100%
    of real power, so the tiniest nudge already spins the fan. Find your number: creep the throttle
    up until the fan just turns, and set it there.</li>
    <li><strong>Flip / swap.</strong> Use these if a fan blows the wrong way or the wires to
    the left and right motors got crossed. It's the software way to fix a wiring mistake.</li>
  </ul>
</section>

<section>
  <h2>Why it's built this way</h2>
  <ul class="ticks">
    <li><strong>Sticky throttle, springy steering.</strong> A boat holds its speed and wants
    to go straight &mdash; so the control should too. Holding a stick at full deflection the
    whole run is what made the first two versions exhausting to drive.</li>
    <li><strong>Why ALL STOP exists.</strong> Because the throttle is sticky, letting go of
    the pad does <em>not</em> stop the boat. One big button (or <kbd>space</kbd>) turns both
    fans off at once. At the beach it's your brake.</li>
    <li><strong>The one thing no interface can fix:</strong> when the boat is coming back
    <em>toward</em> you, its left is your right. Every RC driver has to learn this. Practise
    figure-eights in the pool, not at the beach.</li>
  </ul>
</section>

<section>
  <h2>Change this page</h2>
  <p>It's all in <code>/assets/control.js</code> (how it drives) and
  <code>/assets/app.css</code> (how it looks). Ask in Slack <code>#boat</code> &mdash; e.g.
  <em>"make the pad bigger"</em> or <em>"add a turbo button"</em>. The boat serves its
  own copy of this page at <code>http://192.168.4.1</code> (there's no internet at the beach).
  That copy is <em>built from these same files</em> every time the boat is flashed
  (<code>tools/build-helm.mjs</code>), so what you change here is what you drive at the beach.
  On the boat's page the knobs are saved <em>on the boat itself</em>, so every tablet that
  drives it gets the same trim. The knobs here only change the simulator.</p>
</section>

<script src="/assets/control.js?v=24"></script>
