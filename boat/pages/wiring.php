<?php
// Wiring diagram: power bank + ESP32 DevKit (30-pin) + DRV8833 + 2 motors + 3 nav LEDs.
// Pin numbers MUST match arduino/boat.ino (L_IN1=32, L_IN2=33, R_IN1=25, R_IN2=26,
// LED_PORT=21, LED_STBD=19, LED_STERN=18).
// Both boards are drawn with their pins in REAL order (checked against the photo
// of the actual parts, 2026-09-18), so "count down from the top" works on the bench.
// The ESP32 sits antenna-up, USB-down. The DRV8833 is turned upside-down (IN pins
// facing the ESP32), which is why its labels read bottom-to-top vs the board.

$espLeft  = ['EN','VP','VN','D34','D35','D32','D33','D25','D26','D27','D14','D12','D13','GND','VIN'];
$espRight = ['D23','D22','TX0','RX0','D21','D19','D18','D5','TX2','RX2','D4','D2','D15','GND','3V3'];
$used     = ['D32','D33','D25','D26','GND','3V3','D21','D19','D18'];
$py = function ($i) { return 185 + $i * 27; };

// DRV8833 (the purple 12-pin module), rotated 180 degrees: [label, y]
$drvRight = [['IN1',300],['IN2',340],['VCC',380],['GND',420],['IN3',460],['IN4',500]];
$drvLeft  = [['ULT',300],['OUT4',340],['OUT3',380],['OUT2',420],['OUT1',460],['EEP',500]];

// [svg path, colour, dashed?]
$wires = [
  ['M600 320 H560 V300 H440', '#1f9d55'],          // D32 -> IN1
  ['M600 347 H540 V340 H440', '#2563eb'],          // D33 -> IN2
  ['M600 374 H500 V460 H440', '#d4a300'],          // D25 -> IN3
  ['M600 401 H520 V500 H440', '#ea6a0a'],          // D26 -> IN4
  ['M440 380 H470 V745 H600', '#dc2626'],          // VCC <- bank red
  ['M440 420 H490 V715 H600', '#111'],             // GND <- bank black
  ['M490 536 H600', '#111'],                       // ESP GND joins it
  ['M260 500 H225 V840 H860 V563 H800', '#8b5cf6', true], // EEP <- 3V3
  ['M260 340 H178', '#444'], ['M260 380 H178', '#999'],   // right motor
  ['M260 420 H178', '#999'], ['M260 460 H178', '#444'],   // left motor
  ['M1010 293 V536 H800', '#111'],                 // LED ground rail
];
$leds = [[293,'D21','#ef4444','RED = PORT (left side)'],[320,'D19','#22c55e','GREEN = STARBOARD (right)'],[347,'D18','#eab308','YELLOW = stern / status']];
?>
<section class="hero">
  <h2>Wiring diagram</h2>
  <p class="lede">Every wire on the boat, on one page, matched to the real parts on the bench.
  The ESP32 sits <strong>antenna up, USB plug down</strong>. The little purple motor driver is
  turned <strong>upside-down</strong> so its IN pins face the ESP32 &mdash; that&rsquo;s why its
  labels run backwards compared with the board in your hand. On the breadboard the ESP32 goes at
  the <strong>right-hand end</strong> so its USB plug hangs off the edge into thin air (the plug is
  18&nbsp;mm deep &mdash; 7 columns &mdash; and will sit on top of anything you put beside it), and the
  driver goes at the left-hand end. Build it on the breadboard first;
  nothing goes in the boat until the motors spin on the bench.</p>
  <p><button class="printbtn" onclick="window.print()">&#128424; Print this page</button></p>
</section>

<section>
  <h2>Breadboard view: start here</h2>
  <p>Every wire goes from one numbered hole to another. The rule that makes it work:
  <strong>holes with the same column number, on the same side of the middle groove, are
  joined inside the board.</strong> The ESP32 is so wide that only row <strong>a</strong> has a
  free hole beside its pins, so every ESP32 wire uses the D32&hellip;GND side. Nothing plugs
  into the other side &mdash; and nothing in this build needs to. This is generated from the same one description as the
  <a href="/?p=steps">build booklet</a>, so the hole numbers here can never drift from the steps.</p>
  <p><img src="/media/steps/step-all.svg?v=<?= @filemtime(__DIR__ . '/../media/steps/step-all.svg') ?>" alt="Breadboard view: ESP32, motor driver and every jumper wire hole to hole" style="width:100%;background:#fff;border-radius:10px"></p>
</section>

<section>
  <h2>Watch these first (about 20 minutes total)</h2>
  <ol>
    <li><a href="https://www.youtube.com/shorts/DRCy2WY1DYw" target="_blank">Breadboard basics in 60 seconds</a> (SparkFun, 1 min): which holes are secretly joined.</li>
    <li><a href="https://www.youtube.com/watch?v=W6mixXsn-Vc" target="_blank">How to use a breadboard</a> (LeftyMaker, 4 min): building a real circuit on one.</li>
    <li><a href="https://www.youtube.com/watch?v=Z0joOKaQ43A" target="_blank">How to solder headers</a> (Adafruit, 5.5 min): exactly the job the motor driver needs.</li>
    <li><a href="https://www.youtube.com/watch?v=NY6g7slq1FE" target="_blank">DRV8833 motor driver, as easily as possible</a> (6.5 min): the purple board and how it spins a motor both ways.</li>
    <li><a href="https://www.youtube.com/watch?v=29xBbLo0ORY" target="_blank">Lever-nut wire splicing</a> (2 min): joining the motor wires with no solder.</li>
  </ol>
  <p><strong>For inspiration:</strong>
  <a href="https://www.youtube.com/watch?v=BRU_5prjbnc" target="_blank">a DIY RC airboat</a> (4 min),
  <a href="https://www.youtube.com/watch?v=X3qaTCr-Cb8" target="_blank">a two-motor air-powered PVC boat</a> (5 min), and
  <a href="https://www.youtube.com/watch?v=B6w-RKSVKLU" target="_blank">an Arduino boat from a food container</a> (Science Buddies, 16 min).</p>
</section>

<?php
  // draw.io version: generated by tools/wiring-map.mjs in the project folder. Embedded here and
  // drawn by the diagrams.net viewer, so you can zoom, flip tabs, or open an editable copy.
  $drawio = @file_get_contents(__DIR__ . '/../media/wiring.drawio');
  $openUrl = 'https://app.diagrams.net/#U' . rawurlencode('https://raw.githubusercontent.com/joefaron/kai-code/main/boat/media/wiring.drawio');
?>
<?php if ($drawio): ?>
<section>
  <h2>Where everything goes (draw.io)</h2>
  <p>Two tabs: <strong>Where it goes</strong> (the layout) and <strong>Every wire</strong> (a
  tick-list). Made with <a href="https://www.drawio.com/" target="_blank">draw.io</a>, a free
  diagram tool &mdash; <a href="<?= htmlspecialchars($openUrl) ?>" target="_blank">open it in
  diagrams.net</a> to change it yourself, or <a href="/media/wiring.drawio" download>download the
  .drawio file</a>.</p>
  <div style="background:#fff;border-radius:10px;padding:6px">
    <div class="mxgraph" style="max-width:100%" data-mxgraph="<?= htmlspecialchars(json_encode([
      'xml' => $drawio, 'toolbar' => 'pages zoom lightbox', 'nav' => true,
      'lightbox' => true, 'highlight' => '#ff7a1a', 'resize' => true,
    ])) ?>"></div>
  </div>
  <script src="https://viewer.diagrams.net/js/viewer-static.min.js"></script>
</section>
<?php endif; ?>

<?php if (false): // Retired 2026-09-19: EEP moved to D27 and the LEDs to D14/D12/D13 so every
                   // wire uses the free side of the ESP32. Kept for reference; the breadboard view
                   // above is the final page of tools/build-steps.mjs, the ONE source of hole numbers. ?>
<section>
<h2>Pin-by-pin schematic</h2>
<svg id="wiring" viewBox="0 0 1480 880" xmlns="http://www.w3.org/2000/svg"
     style="width:100%;height:auto;background:#fff;border-radius:10px;font-family:Segoe UI,Arial,sans-serif">
  <style>
    .box{fill:#f6f7f9;stroke:#222;stroke-width:2}
    .pin{fill:#bbb;stroke:#555}
    .pinu{fill:#f59e0b;stroke:#222}
    .pl{font-size:13px;fill:#9aa1ab}
    .plu{font-size:14px;fill:#111;font-weight:700}
    .t{font-size:18px;font-weight:700;fill:#111}
    .s{font-size:12px;fill:#555}
    .w{fill:none;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}
    .halo{fill:none;stroke:#fff;stroke-width:11;stroke-linejoin:round}
    .wl{font-size:13px;font-weight:700}
    .n{font-size:14px;fill:#222}
    .nh{font-size:15px;font-weight:700;fill:#111}
  </style>

  <text x="30" y="45" style="font-size:26px;font-weight:800;fill:#111">S.S. Jack-o'-Lantern &mdash; wiring</text>
  <text x="30" y="70" class="s">Matches arduino/boat.ino &middot; pins in real order &middot; a white gap in a wire = it crosses OVER, not connected</text>

  <!-- wires: white halo under each so crossings read as over/under, not joins -->
  <?php foreach ($wires as $w): ?>
    <path class="halo" d="<?= $w[0] ?>"/>
    <path class="w" d="<?= $w[0] ?>" stroke="<?= $w[1] ?>"<?= !empty($w[2]) ? ' stroke-dasharray="10 6"' : '' ?>/>
  <?php endforeach; ?>
  <circle cx="490" cy="536" r="7" fill="#111"/>
  <text class="wl" x="560" y="529" text-anchor="middle" fill="#111">GND</text>
  <text class="wl" x="540" y="834" text-anchor="middle" fill="#8b5cf6">3V3 &#8594; EEP (the driver&rsquo;s ON switch &mdash; motors stay dead without it)</text>

  <!-- USB cable bank -> ESP32 -->
  <path d="M700 690 V612" stroke="#6b7280" stroke-width="12" stroke-linecap="round"/>
  <text x="712" y="650" class="s">USB-C &#8594; micro-USB cable</text>

  <!-- ===== LEDs ===== -->
  <?php foreach ($leds as $l): $y = $l[0]; ?>
    <path class="w" d="M800 <?= $y ?> H850 M900 <?= $y ?> H925 M941 <?= $y ?> H1010" stroke="<?= $l[2] ?>" style="stroke-width:3"/>
    <path d="M850 <?= $y ?> l5 -6 l10 12 l10 -12 l10 12 l10 -12 l5 6" fill="none" stroke="#333" stroke-width="2"/>
    <polygon points="925,<?= $y - 9 ?> 925,<?= $y + 9 ?> 941,<?= $y ?>" fill="<?= $l[2] ?>" stroke="#222"/>
    <path d="M941 <?= $y - 9 ?> V<?= $y + 9 ?>" stroke="#222" stroke-width="2.5"/>
    <text x="1020" y="<?= $y + 5 ?>" class="plu" style="fill:<?= $l[2] ?>"><?= $l[3] ?></text>
  <?php endforeach; ?>
  <text x="875" y="274" text-anchor="middle" class="s">220 &Omega; resistor</text>
  <text x="933" y="274" text-anchor="middle" class="s">LED</text>
  <text x="1030" y="385" class="s">LED: LONG leg toward the pin,</text>
  <text x="1030" y="401" class="s">short leg / flat edge to GND</text>

  <!-- ===== DRV8833 ===== -->
  <rect class="box" x="260" y="270" width="180" height="260" rx="8" style="fill:#efe7ff"/>
  <text x="350" y="240" text-anchor="middle" class="t">DRV8833</text>
  <text x="350" y="258" text-anchor="middle" class="s">motor driver (upside-down)</text>
  <?php foreach ($drvRight as $p): ?>
    <rect class="pinu" x="434" y="<?= $p[1] - 6 ?>" width="12" height="12"/>
    <text class="plu" x="428" y="<?= $p[1] + 5 ?>" text-anchor="end"><?= $p[0] ?></text>
  <?php endforeach; ?>
  <?php foreach ($drvLeft as $p): ?>
    <rect class="<?= $p[0] === 'ULT' ? 'pin' : 'pinu' ?>" x="254" y="<?= $p[1] - 6 ?>" width="12" height="12"/>
    <text class="<?= $p[0] === 'ULT' ? 'pl' : 'plu' ?>" x="272" y="<?= $p[1] + 5 ?>"><?= $p[0] ?></text>
  <?php endforeach; ?>
  <text x="350" y="555" text-anchor="middle" class="s">ULT = fault light, leave empty</text>

  <!-- ===== motors ===== -->
  <?php foreach ([[360,'RIGHT motor','OUT3 + OUT4'],[440,'LEFT motor','OUT1 + OUT2']] as $mo): ?>
    <circle cx="146" cy="<?= $mo[0] ?>" r="34" fill="#fff7ed" stroke="#222" stroke-width="2"/>
    <text x="146" y="<?= $mo[0] + 9 ?>" text-anchor="middle" style="font-size:24px;font-weight:800">M</text>
    <text x="104" y="<?= $mo[0] - 2 ?>" text-anchor="end" class="nh"><?= $mo[1] ?></text>
    <text x="104" y="<?= $mo[0] + 15 ?>" text-anchor="end" class="s"><?= $mo[2] ?></text>
  <?php endforeach; ?>
  <text x="140" y="505" text-anchor="middle" class="s">spins backwards?</text>
  <text x="140" y="521" text-anchor="middle" class="s">swap its 2 wires</text>
  <text x="140" y="300" text-anchor="middle" class="s">motor leads join</text>
  <text x="140" y="316" text-anchor="middle" class="s">via lever clips</text>

  <!-- ===== ESP32 ===== -->
  <rect class="box" x="600" y="150" width="200" height="450" rx="8" style="fill:#eef8f1"/>
  <rect x="650" y="152" width="100" height="22" fill="#cfd8d3" stroke="#555"/>
  <text x="700" y="168" text-anchor="middle" class="s">antenna (top)</text>
  <rect x="682" y="598" width="36" height="14" fill="#9ca3af" stroke="#222"/>
  <text x="700" y="140" text-anchor="middle" class="t">ESP32 DevKit (30-pin)</text>
  <text x="700" y="450" text-anchor="middle" class="s">the brain +</text>
  <text x="700" y="466" text-anchor="middle" class="s">Wi-Fi hotspot</text>
  <text x="700" y="590" text-anchor="middle" class="s">micro-USB</text>
  <?php foreach ($espLeft as $i => $l): $u = in_array($l, $used); ?>
    <rect class="<?= $u ? 'pinu' : 'pin' ?>" x="594" y="<?= $py($i) - 6 ?>" width="12" height="12"/>
    <text class="<?= $u ? 'plu' : 'pl' ?>" x="612" y="<?= $py($i) + 5 ?>"><?= $l ?></text>
  <?php endforeach; ?>
  <?php foreach ($espRight as $i => $l): $u = in_array($l, $used); ?>
    <rect class="<?= $u ? 'pinu' : 'pin' ?>" x="794" y="<?= $py($i) - 6 ?>" width="12" height="12"/>
    <text class="<?= $u ? 'plu' : 'pl' ?>" x="788" y="<?= $py($i) + 5 ?>" text-anchor="end"><?= $l ?></text>
  <?php endforeach; ?>

  <!-- ===== power bank ===== -->
  <rect class="box" x="600" y="690" width="240" height="80" rx="14" style="fill:#fef3c7"/>
  <text x="720" y="728" text-anchor="middle" class="t">USB-C power bank</text>
  <text x="720" y="748" text-anchor="middle" class="s">port 1 &#8593; ESP32 &middot; port 2 &#8592; cut cable</text>
  <text x="250" y="705" class="wl" fill="#111">motor battery: black = GND</text>
  <text x="250" y="760" class="wl" fill="#dc2626">motor battery: red = + (9 V max)</text>
  <text x="250" y="778" class="s">(8&times;AA holder, 6 AA + 2 dummies, switch = motor kill switch;</text>
  <text x="250" y="794" class="s">or a cut USB cable from bank port 2)</text>

  <!-- ===== notes ===== -->
  <g transform="translate(1110,470)">
    <text class="nh" y="0">Before you plug in</text>
    <text class="n" y="26">1. Bank UNPLUGGED while wiring.</text>
    <text class="n" y="50">2. Every GND joins (one breadboard</text>
    <text class="n" y="68" x="18">row = one connection).</text>
    <text class="n" y="92">3. Red 5 V goes ONLY to VCC.</text>
    <text class="n" y="116">4. First test: props OFF.</text>
    <text class="n" y="140">5. LEDs need their resistor, or</text>
    <text class="n" y="158" x="18">they burn out in a second.</text>
    <text class="n" y="182">6. Match the printed LABELS if</text>
    <text class="n" y="200" x="18">your board looks different.</text>
  </g>
</svg>
</section>
<?php endif; ?>

<section>
  <h2>What&rsquo;s in the box (and what each part does)</h2>
  <ul class="steps">
    <li><strong>ESP32 (the black board with the silver can).</strong> The brain and the Wi-Fi
      hotspot. Its plug is <em>micro-USB</em> &mdash; a small flat plug, not USB-C. You don&rsquo;t
      need a new battery, just a <strong>USB-C to micro-USB cable</strong>.</li>
    <li><strong>The two tiny purple chips (DRV8833).</strong> Motor drivers. The ESP32 can only
      whisper 3.3&nbsp;V at a tiny current; this chip listens to that whisper and switches the
      big 5&nbsp;V from the battery into the motors. You only need <em>one</em>; the other is a
      spare.</li>
    <li><strong>The strips of pins on a black plastic bar (headers).</strong> These get
      <em>soldered</em> into the driver&rsquo;s 12 holes so it can plug into the breadboard.
      Snap two 6-pin pieces off the strip. Push-fit won&rsquo;t hold &mdash; the pins just touch
      the holes and the motors cut in and out. This is the one soldering job in the whole build
      (12 joints, a grown-up with a soldering iron, 10 minutes). The ESP32&rsquo;s pins are
      already on.</li>
    <li><strong>4 round motors + 4 white C-clip brackets.</strong> Two for the boat, two spares.
      The props push straight onto the motor&rsquo;s shaft &mdash; no rod needed.</li>
    <li><strong>The thin metal rods + the bag of yellow wheels and gears.</strong> Axles for a
      car kit. Not needed for an airboat; keep them for the backup plan or a rudder hinge.</li>
    <li><strong>The white lever clips.</strong> Wire joiners with no solder: lift the lever,
      push the wire in, snap it shut. Each one joins two pairs. Use them to join each motor
      lead to half a jumper wire.</li>
    <li><strong>3 little LEDs (red, green, yellow).</strong> Navigation lights! Real boats show
      <strong style="color:#ef4444">red on the port (left) side</strong> and
      <strong style="color:#22c55e">green on starboard (right)</strong> &mdash; remember it as
      &ldquo;port wine is red&rdquo;. Yellow goes on the stern and blinks while the boat is
      waiting for the tablet. Each LED needs a <strong>220&nbsp;&Omega; resistor</strong>
      (anything from 150 to 330 works).</li>
  </ul>
</section>

<section>
  <h2>Joining the motor wires (no solder)</h2>
  <ol class="steps build">
    <li>No cutting needed: a male-to-male jumper&rsquo;s metal pin fits straight into a lever
      clip (WAGO).</li>
    <li>Motor leads are thin: <strong>fold the bare end back on itself</strong> and twist, so
      it&rsquo;s twice as thick. Now the lever clip can grip it.</li>
    <li>Lift a lever, push in a motor lead, close it. Same on the other side with one pin of a
      jumper. <strong>Tug test:</strong> pull gently. If it slides out, redo it.</li>
    <li>Push the jumper&rsquo;s other pin into the breadboard: holes j8 + j9 (OUT2, OUT1) for the
      left motor, j6 + j7 (OUT4, OUT3) for the right motor.</li>
    <li>Tape each clip down so the wire can&rsquo;t pull on it.</li>
  </ol>
</section>

<section>
  <h2>Build order &mdash; a check after every step</h2>
  <ol class="steps build">
    <li><strong>Solder the driver&rsquo;s pins</strong> (grown-up job).
      <em>Check:</em> every pin is shiny and doesn&rsquo;t wiggle.</li>
    <li><strong>ESP32 on the breadboard</strong>, antenna left, USB right, the D32 row of pins
      in row <strong>b</strong> (columns 1-15) so row a stays free.
      <em>Check:</em> plug in the USB cable and the ESP32&rsquo;s red power light comes on.</li>
    <li><strong>Upload the code</strong> (<code>arduino/boat.ino</code>).
      <em>Check:</em> a Wi-Fi network called <strong>SS-JACKOLANTERN</strong> shows up on the
      tablet.</li>
    <li><strong>The 3 LEDs + resistors.</strong>
      <em>Check:</em> red and green glow, yellow blinks. Open
      <code>http://192.168.4.1</code> on the tablet and yellow goes solid.</li>
    <li><strong>Driver across the middle groove of the breadboard</strong>, the 4 coloured signal
      wires, GND, and EEP &#8594; D27 (columns 22-27, see the breadboard view).</li>
    <li><strong>Motors, props OFF,</strong> then the AA holder last (switch OFF until the end).
      <em>Check:</em> push the stick forward and both motors spin; left/right changes
      which spins faster.</li>
    <li><strong>Props on, prop guards on.</strong> Measure the thrust (Design page) and write the
      number in the Build Log.</li>
  </ol>
</section>
