<section>
  <h2>Shopping list</h2>
  <p class="lede">Roughly <strong>$<?= number_format($total, 0) ?></strong> for everything
  needed to make it run, plus about $28 of optional spares. Prices are ballpark US retail as
  of Sept 2026 &mdash; check before ordering, and buying the multi-packs is usually cheaper
  than the single.</p>

  <table class="parts">
    <tr><th>Part</th><th>Qty</th><th class="r">Est. $</th><th>Why it's on the list</th></tr>
    <?php foreach ($PARTS as $p): ?>
    <tr class="<?= !empty($p['optional']) ? 'opt' : '' ?>">
      <td><strong><?= htmlspecialchars($p['name']) ?></strong>
          <?php if (!empty($p['optional'])): ?><span class="tag">optional</span><?php endif; ?>
          <br><small><?= htmlspecialchars($p['where']) ?></small></td>
      <td><?= (int)$p['qty'] ?></td>
      <td class="r"><?= $p['price'] ? '$' . number_format($p['price'] * $p['qty'], 0) : 'free' ?></td>
      <td><?= htmlspecialchars($p['why']) ?></td>
    </tr>
    <?php endforeach; ?>
    <tr class="tot"><td colspan="2">Required total</td><td class="r">$<?= number_format($total, 0) ?></td><td></td></tr>
  </table>
</section>

<section class="callout">
  <h3>&#9889; Why AA NiMH and not a LiPo</h3>
  <p>Every RC tutorial reaches for a 2S LiPo because it's lighter and punchier. A LiPo also
  catches fire if it's punctured, over-discharged, or charged unattended &mdash; which is a
  bad combination with a 6th grader, a hot glue gun and a boat that might swamp. Four NiMH
  AAs give 4.8&ndash;6V, weigh almost nothing on a boat this size, cost less, and the worst
  case if they get wet is that they stop working. Take the weight penalty.</p>
</section>


<section class="callout">
  <h3>&#128722; Exactly what to search for</h3>
  <p style="margin-bottom:8px">Ordering today? These are the search strings that land on the
  right part, plus the one spec that actually matters for each:</p>
  <ul class="ticks" style="margin-top:6px">
    <li><code>ESP32 development board 3 pack</code> &mdash; want the plain <strong>ESP32-WROOM-32</strong>
    (not S3, not C3, not "ESP32-CAM"). USB-C is nicer. Buy the 3-pack.</li>
    <li><code>DRV8833 motor driver module 2 pack</code> &mdash; a <em>breakout board</em> with screw or
    header pins, not a bare chip. L298N also works but wastes ~2V of a 6V battery as heat.</li>
    <li><code>DC 3-6V motor with propeller DIY kit</code> or <code>130 motor fan blade kit</code> &mdash;
    <strong>check the shaft: 2mm.</strong> Buying a motor and a prop separately is the classic
    way to end up with a prop that won't fit. Get them as a matched kit.</li>
    <li><code>AA battery holder with switch and leads</code> &mdash; wants bare wire leads, not a
    barrel plug. We already had an 8&times;AA one: load <strong>6 AA + 2 dummy cells</strong> (9&nbsp;V).
    8 real AA = 12&nbsp;V, which breaks the driver.</li>
    <li><code>Dupont jumper wires male to female</code> + a <code>170 point mini breadboard</code>
    &mdash; so the first build needs no soldering.</li>
  </ul>
  <p style="margin-top:10px"><strong>Buy two of everything small</strong> (board, driver, motors).
  Spares cost a few dollars now and are impossible to get the night before the beach.</p>
</section>

<section>
  <h2>What to do the day it all arrives</h2>
  <ol class="steps">
    <li>Plug the ESP32 into USB. Flash the blink example. <em>Prove the toolchain works before anything is glued.</em></li>
    <li>Flash the boat sketch. Join the <code>SS-JACKOLANTERN</code> Wi-Fi from a phone, open <code>192.168.4.1</code>, see the controls.</li>
    <li>Wire one motor. Make it spin both directions from the tablet. Then the second.</li>
    <li>Tape everything to a piece of cardboard and drive it across the kitchen floor.</li>
    <li>Only now start building the actual hull.</li>
  </ol>
</section>
