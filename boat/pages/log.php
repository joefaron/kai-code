<section>
  <h2>Build log</h2>
  <p class="lede">Design &rarr; Build &rarr; Test &rarr; Improve. The teacher wants the boat
  tested and improved before the beach &mdash; this is the evidence. Every water test gets an
  entry, including the ones that sink.</p>
</section>

<?php if (!$LOG): ?>
  <p class="empty">No entries yet. Add one by saying so in Slack <code>#boat</code>, or edit
  <code>data/log.json</code>.</p>
<?php else: ?>
  <ol class="timeline">
  <?php foreach ($LOG as $e): ?>
    <li>
      <div class="when"><?= htmlspecialchars($e['date']) ?></div>
      <h3><?= htmlspecialchars($e['title']) ?></h3>
      <p><?= nl2br(htmlspecialchars($e['body'])) ?></p>
      <?php if (!empty($e['learned'])): ?>
        <p class="learned"><strong>What we'd change:</strong> <?= htmlspecialchars($e['learned']) ?></p>
      <?php endif; ?>
    </li>
  <?php endforeach; ?>
  </ol>
<?php endif; ?>

<section>
  <h2>Test checklist before the beach</h2>
  <ul class="ticks">
    <li>Floats level with the battery box on board, in a bathtub</li>
    <li>Still floats with the dry box deliberately half-full of water (buoyancy margin)</li>
    <li>Drives forward, reverse, and turns both ways in a pool</li>
    <li>Fail-safe: walk out of Wi-Fi range &mdash; both motors stop within a second</li>
    <li>Runs 15 minutes continuously on one set of AAs (the race day is longer than you think)</li>
    <li>Dry box opened after a 15-minute run: <strong>zero</strong> water inside</li>
    <li>Prop guards on, and nothing sheds, dissolves or leaks into the water</li>
    <li>Kai can explain every material choice out loud, without notes</li>
  </ul>
</section>
