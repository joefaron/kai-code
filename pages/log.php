<section class="card">
  <h2>Build Log</h2>
<?php if (!$LOG): ?>
  <p class="todo">Empty — append entries to <code>data/log.json</code> as work lands.</p>
<?php else: foreach (array_reverse($LOG) as $e): ?>
  <article class="row">
    <strong><?= htmlspecialchars($e['date'] ?? '') ?></strong>
    <p><?= htmlspecialchars($e['text'] ?? '') ?></p>
  </article>
<?php endforeach; endif; ?>
</section>
