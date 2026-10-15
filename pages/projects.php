<section class="card">
  <h2>Projects</h2>
<?php if (!$PROJECTS): ?>
  <p class="todo">Nothing yet — add entries to <code>data/projects.json</code>.</p>
<?php else: foreach ($PROJECTS as $p): ?>
  <article class="row">
    <strong><?= htmlspecialchars($p['name']) ?></strong>
    <span><?= htmlspecialchars($p['status'] ?? '') ?></span>
    <p><?= htmlspecialchars($p['note'] ?? '') ?></p>
  </article>
<?php endforeach; endif; ?>
</section>
