<?php
// Wi-Fi paper plane. The picture and the wire table are both drawn from data/plane.json,
// so they can't disagree. Firmware: plane/arduino/firmware.ino (same pins).
// The two boards are drawn TO SCALE: the SVG's units ARE millimetres, taken from
// measurements of the real parts (see "measured" in the json).
require_once __DIR__ . '/../lib/plane.php';
$P = plane_data();
?>
<section class="card">
  <h2>✈️ The Wi-Fi paper plane</h2>
  <p>A paper plane with two tiny motors and no rudder. It steers like the boat does: speed up
  the <b>left</b> motor and the plane turns <b>right</b>. Speed up both and it climbs. If the
  tablet loses the plane, the motors cut after 0.8 s and it glides down.</p>
  <p><b>Weight is everything.</b> All the parts together come to about 25 g, so there's no
  breadboard. Short wires go straight from pin to pin. <b>No soldering:</b> every wire plugs on.</p>
</section>

<section class="card">
  <h2>🖨️ Print these two things first</h2>
  <p><b>1. The template</b> (print on card stock at 100%): the plane's outline with the cut lines, dashed fold lines,
  and real-size boxes showing where every part goes.<br>
  <b>2. The build booklet</b>: 12 steps, one per page, like LEGO. Each picture shows the plane so far, with the new part glowing.</p>
  <p class="bkbar" style="display:flex;gap:10px;flex-wrap:wrap">
    <a class="printbtn" style="text-decoration:none" href="/media/builds/plane-template.pdf?v=<?= @filemtime(__DIR__ . '/../media/builds/plane-template.pdf') ?>">✂️ Template PDF</a>
    <a class="printbtn" style="text-decoration:none" href="/media/builds/plane-steps.pdf?v=<?= @filemtime(__DIR__ . '/../media/builds/plane-steps.pdf') ?>">📄 Booklet PDF</a>
    <a class="printbtn" style="text-decoration:none" href="/?p=build&b=plane">👀 Booklet on screen</a>
  </p>
  <a href="/template.php?b=plane"><img src="/media/builds/plane-template.png?v=<?= @filemtime(__DIR__ . '/../media/builds/plane-template.png') ?>" alt="the template" style="max-width:260px;width:100%;border-radius:6px;background:#fff"></a>
</section>

<section class="card">
  <h2>1. Know your two boards first</h2>
  <p>Pinout pictures are always drawn <b>top-down: chip side up</b>. But the pin names are printed on the
  <b>bottom</b> of both boards, and the pins stick out of the bottom too. So when you plug wires on, the board is
  <b>turned over</b> and everything swaps left↔right. Step 2 shows both views.</p>
  <div style="display:flex;gap:14px;flex-wrap:wrap">
    <figure style="margin:0;flex:1;min-width:200px"><?php if (is_file(__DIR__ . '/../media/plane/xiao-front.jpg')): ?><img src="/media/plane/xiao-front.jpg" alt="XIAO chip side" style="width:100%;border-radius:8px;background:#fff"><?php else: ?><i class="dim">(photo not included in the open-source copy: it's someone else's picture)</i><?php endif; ?>
      <figcaption><b>XIAO, top-down (chip side up), USB-C at the top.</b> Left edge: D0–D6 (green).
      Right edge: 5V, GND, 3V3 (red, black, red), then D10, D9, D8, D7. Along the bottom: <b>B</b> button,
      antenna socket, <b>R</b> button. Plug the stick-on antenna in, or the Wi-Fi won't reach past one room.</figcaption></figure>
    <figure style="margin:0;flex:1;min-width:200px"><?php if (is_file(__DIR__ . '/../media/plane/xiao-back.jpg')): ?><img src="/media/plane/xiao-back.jpg" alt="XIAO back side" style="width:100%;border-radius:8px;background:#fff"><?php else: ?><i class="dim">(photo not included in the open-source copy: it's someone else's picture)</i><?php endif; ?>
      <figcaption><b>XIAO, turned over (the printed names).</b> This side faces UP on the plane, so the pins point up.
      D0–D6 are now on the <b>right</b>. Ignore the gold BAT pads: we don't use them (no soldering).</figcaption></figure>
  </div>
  <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:12px">
    <figure style="margin:0;flex:1;min-width:200px"><?php if (is_file(__DIR__ . '/../media/plane/drv-chip.jpg')): ?><img src="/media/plane/drv-chip.jpg" alt="driver chip side" style="width:100%;border-radius:8px"><?php else: ?><i class="dim">(photo not included in the open-source copy: it's someone else's picture)</i><?php endif; ?>
      <figcaption><b>Driver, top-down (chip side up).</b> No names on this side. Left edge, top to bottom:
      EEP OUT1 OUT2 OUT3 OUT4 ULT. Right edge: IN4 IN3 GND VCC IN2 IN1. (The photo is rotated a quarter turn.)</figcaption></figure>
    <figure style="margin:0;flex:1;min-width:200px"><?php if (is_file(__DIR__ . '/../media/plane/drv-labels.jpg')): ?><img src="/media/plane/drv-labels.jpg" alt="driver label side" style="width:100%;border-radius:8px"><?php else: ?><i class="dim">(photo not included in the open-source copy: it's someone else's picture)</i><?php endif; ?>
      <figcaption><b>Driver, turned over (the printed names).</b> This side faces UP on the plane. Left: IN4 IN3 GND
      VCC IN2 IN1. Right: EEP OUT1–OUT4 ULT. Use the <b>boat's</b> driver: the new ones come with loose pins that would
      need soldering.</figcaption></figure>
  </div>
</section>

<section class="card">
  <h2>2. The wiring (boards drawn at real size)</h2>
  <p><b>Top-down</b> (chip side up), the standard way pinouts are drawn:</p>
  <?= draw_wiring() ?>
  <p style="margin-top:14px"><b>Turned over</b>, the way you hold the boards while you push the wires on (and how they sit on the plane):</p>
  <?= draw_wiring(['flip' => true]) ?>
  <p class="tradeoff">⚠️ <b>Trust the names printed on YOUR boards over these pictures.</b> Read each pin
  name on the real board before you push a wire on (boat lesson 4).</p>
  <details><summary>How we checked this drawing is right</summary>
    <p>The XIAO in the drawing came from real measurements. As a test, it was laid over Seeed's own picture
    of the board at the same scale: red = pins and outline, green = battery pads, blue = the big gold pad.
    Everything lands where it should. The driver came from your own boat photos. Its size is an estimate,
    so put a ruler on it, but the pin order is read straight off its printed labels.</p>
    <?php if (is_file(__DIR__ . '/../media/plane/xiao-overlay-check.png')): ?><img src="/media/plane/xiao-overlay-check.png" alt="drawing overlaid on the real XIAO" style="max-width:320px;border-radius:8px"><?php else: ?><i class="dim">(photo not included in the open-source copy: it's someone else's picture)</i><?php endif; ?>
  </details>

  <table class="parts">
    <tr><th>Wire</th><th>From</th><th>To</th><th>What it does</th></tr>
<?php foreach ($P['wires'] as $i => $w): ?>
    <tr><td><span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:<?= $w['color'] ?>"></span> <?= $i + 1 ?></td>
        <td><?= htmlspecialchars($w['from']) ?></td><td><?= htmlspecialchars($w['to']) ?></td><td><?= htmlspecialchars($w['what']) ?></td></tr>
<?php endforeach; ?>
  </table>
</section>

<section class="card">
  <h2>3. Connecting it all with no breadboard</h2>
  <ol class="steps">
    <li><b>The code is already flashed</b> (2026-10-14). Updates go over Wi-Fi, so the USB cable isn't needed again.</li>
    <li><b>Signal wires (1–5):</b> <b>female-to-female jumpers</b> (black sockets on both ends) push straight
      onto the pins. The four motor-signal wires run straight across, D1 to IN4 down to D6 to IN1.
      Wire 5 (white, D10 to EEP) goes the long way round the top. A dab of hot glue over each connection stops a crash knocking it off.</li>
    <li><b>Power (6–11), no soldering:</b> the battery plugs into a <b>battery plug lead</b> (Molex, in the cart).
      Its red and black wires push into the single end of a <b>2-pin splitter cable</b> (in the cart). Tape them in.
      One splitter plug goes on the XIAO's <b>5V + GND</b> pair, the other on the driver's <b>GND + VCC</b> pair.
      ⚠️ The two pairs run in opposite orders, so red is on the TOP pin at the XIAO (5V) but the LOWER pin at the driver (VCC).
      Mark the + wire with a red pen. <b>Unplugging the battery is the OFF switch.</b></li>
    <li><b>Motors (12–15):</b> a jumper from each OUT pin. Fold the motor's thin bare wire in half, push it into the
      jumper's free socket and tape it. Which way round doesn't matter yet: if a motor spins backwards, tick <i>flip</i> in the app.</li>
    <li>🔌 <b>NEVER plug the USB cable in while the battery is plugged in.</b> The XIAO's 5V pin is wired straight to USB,
      so 5 V would go into the battery. Charge the battery on the <b>SummitLink charger</b>, off the plane.</li>
    <li>🔥 <b>LiPo rules:</b> a grown-up charges it on a hard surface, never left alone.
      Never short red to black. If the battery ever puffs up like a pillow, throw it out.</li>
  </ol>
</section>

<section class="card">
  <h2>4. Putting it on the plane</h2>
  <p>The <a href="/?p=build&b=plane">build booklet</a> does this one step per page. The short version:</p>
  <ol class="steps">
    <li><b>A dart with a keel, cut from card stock</b> (redesigned 2026-10-14). It's a normal paper-plane shape: fold in half,
      then fold each wing back out, leaving a 1.5 cm keel underneath with a <b>skewer spine</b> inside it. The same idea as
      PowerUp 4.0, which flies a ~19 g twin-motor pod on an ordinary folded dart. The earlier flat delta had no keel and never flew.</li>
    <li><b>Coin test first:</b> before any electronics, tape 5 nickels (~25 g, the weight of all the parts) on the balance line
      and glide it. If it can't glide with coins, it won't fly with the boards.</li>
    <li><b>Motor stick:</b> a 16 cm bamboo skewer goes <b>across</b> the top, 6 cm behind the nose.
      There's one motor at each end, <b>14 cm apart</b>, shafts pointing at the nose. The props spin in front of the wing,
      so they can't hit it. Hot-glue the motors on.</li>
    <li><b>Props:</b> one motor gets the A prop, the other gets the B prop (the CW and CCW pair).
      Each one must blow air <b>backwards</b> over the wing. Test by holding a strip of paper behind it.
      Blowing forward? Tick <i>flip</i> for that motor in the app. Still weak? Swap the two props.</li>
    <li><b>Boards:</b> foam-tape each one, <b>turned over (pins up)</b>, inside its real-size box on the template. The XIAO
      goes on the LEFT with the USB-C toward the nose, and the driver on the RIGHT. The <b>LEFT</b> motor must go on OUT1/OUT2, or the steering
      comes out backwards. The battery sits on the middle seam between the boards, and the antenna sticks flat on the left wing.</li>
    <li><b>Balance (the most important part):</b> put a fingertip under each BALANCE dot, 10 cm from the nose.
      Slide the battery until the plane sits level or dips its nose a little, never tail-down.</li>
    <li><b>First flight:</b> glide it with no power first. Then go outside with no wind, over grass. Throttle about 60%,
      throw it gently straight ahead, and steer with small touches. If it always pulls one way, nudge <i>Trim</i>.
      <b>Cut the throttle just before it lands</b> so the props stop before they hit the grass.</li>
  </ol>
</section>

<section class="card">
  <h2>5. The code</h2>
  <p>It lives in <code>plane/arduino/firmware.ino</code>. It's the boat's code, cut down for the XIAO:
  two thumb sticks like a real RC transmitter (left = throttle, right = steer + climb, phone held sideways), live motor bars, a soft start so a motor kick can't reset
  the board in mid-air, and the 0.8 s fail-safe.</p>
  <ol class="steps">
    <li><b>First time, with the USB-C cable:</b> <code>bash plane/tools/flash.sh COM5</code> (use whichever COM port
      the XIAO shows up as). If the upload won't start, hold the tiny <b>B</b> button while you
      plug the cable in, then let go.</li>
    <li>Plug in the battery. On the tablet, join Wi-Fi <b>KAI-PLANE</b> with password <b>change-me-2026</b>,
      then open <b>http://192.168.4.1</b>.</li>
    <li>Every change after that goes over Wi-Fi, no cable: <code>bash plane/tools/flash-wifi.sh</code>.</li>
  </ol>
</section>
