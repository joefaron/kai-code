<section>
  <h2>Helm</h2>
  <p class="lede"><strong>Up is forward. Right is right.</strong> One pad &mdash; but the two
  axes behave differently, which is the whole trick: <em>up/down sets the speed and it stays
  there</em>, while <em>left/right springs back to straight</em> when you let go. Shove up,
  flick right, release &mdash; the boat carries on at the same speed on its new heading.</p>
</section>

<!-- helm:start (tools/build-helm.mjs copies this block into the boat's own page) -->
<!-- Shown ONLY when the boat stops answering. Joe lost the link at the hot tub and the page
     still looked alive (small red line, fans still reading 17%), so this is deliberately loud. -->
<div id="linkloss" class="linkloss" hidden>
  <b>&#9888; NO LINK TO THE BOAT</b>
  <span>Its fans stopped by themselves after 0.8&nbsp;s. The helm has been put back to zero.
  Check the tablet is still on <code>SS-JACKOLANTERN</code> (phones jump to a known Wi-Fi when the boat is switched off).</span>
</div>

<div class="helm3">
  <div class="padcol">
    <div id="pad" class="pad">
      <div class="crosshair"></div>
      <div id="knob" class="knob"></div>
      <span class="hint hn">FWD</span><span class="hint hs">REV</span>
      <span class="hint hw">&#9664;</span><span class="hint he">&#9654;</span>
    </div>
    <div class="btnrow">
      <button id="stopBtn" class="stop" title="Throttle is sticky, so letting go does NOT stop the boat. This does. (space)">ALL STOP</button>
      <button id="soundBtn" class="reset" title="Motor sounds on/off">&#128263; SOUND</button>
    </div>
  </div>

  <div class="telem">
    <div class="fans">
      <div class="fan">
        <svg id="fanL" class="prop" viewBox="-20 -20 40 40"><g><path d="M0 0C4-6 3-16 0-17C-3-16-4-6 0 0Z"/><path d="M0 0C4-6 3-16 0-17C-3-16-4-6 0 0Z" transform="rotate(120)"/><path d="M0 0C4-6 3-16 0-17C-3-16-4-6 0 0Z" transform="rotate(240)"/><circle r="3"/></g></svg>
        <div><span>LEFT FAN</span><b id="numL">0%</b><small id="dirL">stopped</small></div>
      </div>
      <div class="fan">
        <svg id="fanR" class="prop" viewBox="-20 -20 40 40"><g><path d="M0 0C4-6 3-16 0-17C-3-16-4-6 0 0Z"/><path d="M0 0C4-6 3-16 0-17C-3-16-4-6 0 0Z" transform="rotate(120)"/><path d="M0 0C4-6 3-16 0-17C-3-16-4-6 0 0Z" transform="rotate(240)"/><circle r="3"/></g></svg>
        <div><span>RIGHT FAN</span><b id="numR">0%</b><small id="dirR">stopped</small></div>
      </div>
    </div>
    <div class="gauge"><span>L</span><div class="bar"><i id="barL"></i></div></div>
    <div class="gauge"><span>R</span><div class="bar"><i id="barR"></i></div></div>
    <div class="throttlebadge">Throttle: <em id="thrPct">idle</em></div>
    <!-- A public https site is NOT allowed to talk to a gadget on your local Wi-Fi (Chrome
         blocks it), so this page only drives the simulator. The real boat serves its own copy. -->
    <p class="field" id="targetField"><strong>Drive the real boat:</strong> join the Wi-Fi
    <code>SS-JACKOLANTERN</code> (the password is in <code>boat.ino</code>; don't post it, or anyone at the beach could drive your boat), then open
    <a href="http://192.168.4.1">http://192.168.4.1</a> (or just type <code>http://boat</code>).
    Same page, served by the boat.</p>
    <div id="status" class="status ok">simulator ready &middot; speed <em id="spd">0 px/s</em></div>

    <details class="knobs" open>
      <summary>&#9881; Tuning knobs <small>(they stay set when you reload)</small></summary>
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

    <p class="kbd"><strong>At a desk:</strong> hold <kbd>&uarr;</kbd>/<kbd>&darr;</kbd> to ramp
    the throttle, <kbd>&larr;</kbd>/<kbd>&rarr;</kbd> to steer while held,
    <kbd>space</kbd> for all stop.</p>
  </div>
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

<script src="/assets/control.js?v=18"></script>
