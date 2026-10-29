<section class="hero">
  <h2>Kai builds things with an AI helper.</h2>
  <p class="lede">A Wi&#8209;Fi boat, a pocket game console and 3D&#8209;printed parts &mdash;
  each one designed, coded, shopped for and tested by talking to an AI called <b>Bugsy</b>.
  Everything here is free and open source (MIT): copy it and build your own.</p>
  <p class="btnrow">
    <a class="linkbtn" href="/talk/">&#127916; Watch the talk: <b>Build anything. You + AI.</b></a>
    <a class="linkbtn" href="https://github.com/joefaron/kai-code">&#128230; Get all the code on GitHub</a>
  </p>
</section>

<!-- START HERE (Joe, 2026-10-29): parents and kids land here from GitHub; walk them through
     building the boat in order. Links point at the boat site; the public export rewrites them. -->
<section class="callout starthere">
  <h3>&#128674; Build the Wi&#8209;Fi airboat yourself: start here</h3>
  <p>About $60 of parts, no soldering, a phone as the remote. A grown&#8209;up and a kid can
  build it over a few evenings. Every page below is the real one we used.</p>
  <ol class="steps">
    <li><a href="boat/"><b>The idea</b></a>: why an airboat (nothing underwater can leak) and how it's judged.</li>
    <li><a href="boat/parts.html"><b>Buy the parts</b></a>: every part, the price we paid, and what you can skip.</li>
    <li><a href="boat/design.html"><b>Build the hull</b></a>: plastic bottles, a plastic sign, zip ties.</li>
    <li><a href="boat/steps.html"><b>Wire it, one step per page</b></a>: LEGO&#8209;style, every hole labelled. Print it.</li>
    <li><a href="https://github.com/joefaron/kai-code/tree/main/boat/arduino"><b>Put the code on the chip</b></a>: one file, <code>boat.ino</code>. After the first time, updates go over Wi&#8209;Fi.</li>
    <li><a href="boat/control.html"><b>Drive it</b></a>: try the steering page right now in the simulator, then on the real boat from your phone.</li>
    <li><a href="boat/prompts.html"><b>See how we asked the AI</b></a>: all the messages we sent, word for word, mistakes included.</li>
  </ol>
  <p><small>Made with <b>Claude Code</b> running <b>Claude Opus 5.5</b> (Anthropic). We talked to it from Slack
  as "Bugsy"; it wrote the code, the web pages and the wiring drawings, and tested them before we trusted them.</small></p>
</section>

<h2>The projects</h2>
<div class="cards">
<?php foreach ($PROJECTS as $p): ?>
  <div class="card">
    <h3><?= $p['emoji'] ?? '' ?> <a href="<?= htmlspecialchars($p['url']) ?>"><?= htmlspecialchars($p['name']) ?></a></h3>
    <p><span class="tag"><?= htmlspecialchars($p['status'] ?? '') ?></span></p>
    <p><?= htmlspecialchars($p['note'] ?? '') ?></p>
    <?php if (!empty($p['code'])): ?><p><small>code: <a href="https://github.com/joefaron/kai-code/tree/main/<?= htmlspecialchars($p['code']) ?>"><code><?= htmlspecialchars($p['code']) ?></code></a></small></p><?php endif; ?>
  </div>
<?php endforeach; ?>
</div>

<section class="callout">
  <h3>How every project gets built</h3>
  <ol class="steps">
    <li><b>Say it in words.</b> Goal, what we have, the limits, and how we'll check it worked.</li>
    <li><b>AI drafts it</b> &mdash; the web page, the 3D shape, the parts list, the chip's code.</li>
    <li><b>Test before trusting.</b> A robot plays the game, a browser drives the page, a test strip gets printed.</li>
    <li><b>Look at the real thing.</b> The chip's printed labels beat any drawing; the box beats the listing photo.</li>
    <li><b>Flash it</b> &mdash; over USB the first time, then over Wi&#8209;Fi.</li>
  </ol>
</section>

<section class="card">
  <h3>Add your own page</h3>
  <ol>
    <li>Make a file in <code>pages/</code>, e.g. <code>pages/robot.php</code></li>
    <li>Add <code>'robot' =&gt; 'Robot'</code> to <code>$PAGES</code> in <code>index.php</code></li>
    <li>Visit <code>/?p=robot</code></li>
  </ol>
</section>
