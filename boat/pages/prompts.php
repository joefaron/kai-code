<?php
$PROMPTS = json_decode(file_get_contents(__DIR__ . '/../data/prompts.json'), true) ?: [];
$NAMES = ['joe' => 'Dad', 'kai' => 'Kai', 'friend' => 'a teammate'];
?>
<section class="hero">
  <h2>How we built this with AI</h2>
  <p class="lede">Every message we sent to the AI, word for word (a few private details removed), in order &mdash; typos and all.
  Nothing here was written by a programmer. If you copy these messages into your own AI
  coding assistant, you can build the same thing.</p>
  <p><button class="printbtn" onclick="window.print()">&#128424; Print this page</button></p>
</section>

<section>
  <h2>How it works</h2>
  <ul class="ticks">
    <li><strong>The AI is Claude Code</strong>, running on a home computer. It can read and write
    files, run programs, search the web and drive a web browser &mdash; not just chat.</li>
    <li><strong>We talk to it in Slack</strong>, in a channel called <code>#boat</code>. Type a
    message, it does the work, it replies in the thread.</li>
    <li><strong>Its folder is live on the internet.</strong> The files it writes on the home
    computer <em>are</em> this website, so a change shows up at the boat site the moment it's saved.</li>
    <li><strong>Want to do it without that setup?</strong> Any AI coding tool can write the same
    files. To put them online for free, drag the folder onto
    <a href="https://app.netlify.com/drop">Netlify Drop</a>, or push it to GitHub Pages.
    (Those host plain HTML; this site uses a little PHP, so ask the AI to convert it to plain
    HTML first &mdash; that is a one-message job.)</li>
    <li><strong>The prompts are messy on purpose.</strong> Most were spoken into a phone. You do
    not need to write perfectly. You need to say what you want, test what you get, and say what
    is wrong with it.</li>
  </ul>
</section>

<section>
  <h2>The messages</h2>
  <ol class="prompts">
  <?php foreach ($PROMPTS as $i => $p):
    $who = isset($NAMES[$p['who']]) ? $NAMES[$p['who']] : ucfirst($p['who']);
    $when = (new DateTime($p['ts'] . 'Z'))->setTimezone(new DateTimeZone('America/Los_Angeles'));
  ?>
    <li>
      <div class="pmeta"><strong>#<?= $i + 1 ?> &middot; <?= htmlspecialchars($who) ?></strong>
        &middot; <?= $when->format('M j, g:ia') ?></div>
      <blockquote class="ptext"><?= nl2br(htmlspecialchars($p['text'])) ?></blockquote>
      <?php if (!empty($p['image'])): ?>
        <a href="<?= htmlspecialchars($p['image']) ?>" target="_blank"><img class="pimg"
           src="<?= htmlspecialchars($p['image']) ?>" alt="image made from this prompt"></a>
      <?php endif; ?>
      <?php if (!empty($p['outcome'])): ?>
        <p class="pout"><strong>What happened:</strong> <?= htmlspecialchars($p['outcome']) ?></p>
      <?php endif; ?>
    </li>
  <?php endforeach; ?>
  </ol>
</section>

<section class="callout">
  <h3>&#128161; What we learned about working with AI</h3>
  <p><strong>Test it yourself.</strong> The first steering was wrong, and the AI didn't know until
  a human drove it. <strong>Ask it to attack its own work.</strong> "Adversary review the cart"
  found two mistakes that would have wrecked the boat. <strong>Tell it what you already
  have.</strong> A power bank from an old kit cut the cost in half. <strong>Make it show the
  numbers.</strong> "Will it tip over?" got a calculation, and then a real test to prove it.</p>
</section>
