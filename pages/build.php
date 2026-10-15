<?php
// Printable build booklets, one per project. EVERY project gets one:
//   1. write data/builds/<name>.json   (title, parts, steps; title, emoji, lib, parts, steps)
//   2. pictures come from draw_<thing>() functions in lib/<lib>.php (or an "img" path)
//   3. node tools/build-pdf.mjs <name>  -> media/builds/<name>-steps.pdf (+ -template.pdf)
// ?p=build lists them all; ?p=build&b=<name> shows one. One step = one printed page.
$B = isset($_GET['b']) ? preg_replace('/[^a-z0-9-]/', '', $_GET['b']) : '';
$file = __DIR__ . "/../data/builds/$B.json";

function build_pdf($name, $kind) {
  $f = __DIR__ . "/../media/builds/$name-$kind.pdf";
  return is_file($f) ? "/media/builds/$name-$kind.pdf?v=" . filemtime($f) : '';
}
function build_draw($lib, $d) {
  [$name, $opt] = $d + [1 => []];
  if ($name === 'img') return '<img src="' . htmlspecialchars($opt) . '" alt="">';
  require_once __DIR__ . "/../lib/$lib.php";
  return call_user_func("draw_$name", $opt);
}

if (!$B || !is_file($file)):
  $all = glob(__DIR__ . '/../data/builds/*.json'); ?>
<section class="card">
  <h2>🛠️ Build booklets</h2>
  <p>Every project gets printable step-by-step instructions, one step per page, like LEGO.</p>
  <ul class="steps">
<?php foreach ($all as $f): $j = json_decode(file_get_contents($f), true); $n = basename($f, '.json'); ?>
    <li><a href="/?p=build&b=<?= $n ?>"><b><?= ($j['emoji'] ?? '') . ' ' . htmlspecialchars($j['title']) ?></b></a>
      · <?= count($j['steps']) ?> steps
      <?php if ($u = build_pdf($n, 'steps')): ?> · <a href="<?= $u ?>">booklet PDF</a><?php endif; ?>
      <?php if ($u = build_pdf($n, 'template')): ?> · <a href="<?= $u ?>">template PDF</a><?php endif; ?></li>
<?php endforeach; ?>
<?php if (!$all): ?>    <li>None here yet. The airboat's step-by-step booklet lives on the boat's own site (Build Steps tab).</li><?php endif; ?>
  </ul>
  <p class="tradeoff">New project? Tell Bugsy in Slack: <i>"make build instructions for my ___"</i>. Bugsy writes
  <code>data/builds/&lt;name&gt;.json</code>, draws the pictures, and makes the PDF.</p>
</section>
<?php return; endif;

$J = json_decode(file_get_contents($file), true);
$lib = $J['lib'] ?? $B;
$n = count($J['steps']);
?>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  .bk { font-family:Fredoka, system-ui, sans-serif; background:#fff; color:#1f2937; border:3px solid #111; border-radius:16px; padding:16px 20px; margin:0 0 24px; }
  .bk h2 { color:#111; font-size:1.9em; margin:0 0 6px; }
  .bk .head { display:flex; align-items:center; gap:14px; margin:0 0 10px; }
  .bk .num { font-size:2.6em; font-weight:700; line-height:1; color:#fff; background:#ea580c; border:3px solid #111; border-radius:14px; padding:4px 14px; min-width:1.2em; text-align:center; }
  .bk h3 { margin:0; font-size:1.5em; line-height:1.15; color:#111; }
  .bk h3 small { display:block; font-size:.55em; color:#ea580c; letter-spacing:.08em; text-transform:uppercase; }
  .bk .chips { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 8px; }
  .bk .chips span { background:#eff6ff; border:2px solid #93c5fd; border-radius:999px; padding:2px 10px; font-size:.95em; }
  .bk .pics { display:flex; gap:12px; align-items:flex-start; justify-content:center; flex-wrap:wrap; }
  .bk .pics > * { flex:1 1 280px; min-width:0; }
  .bk .pics.stack { flex-direction:column; align-items:stretch; }
  .bk .pics.stack > * { flex:none; width:100%; }
  .bk .bdraw { display:block; width:100%; height:auto; }
  .bk .bdraw.plan { max-height:62vh; }
  .bk .bdraw.front { max-width:420px; margin:auto; }
  .bk .do { font-size:1.18em; line-height:1.45; margin:10px 0 8px; }
  .bk .chk { background:#dcfce7; border:2px solid #16a34a; padding:8px 12px; border-radius:10px; margin:8px 0; font-size:1.05em; color:#14532d; }
  .bk .chk:before { content:none; }
  .bk .why { background:#f3f4f6; border-radius:10px; padding:6px 12px; color:#374151; margin:6px 0 0; }
  .bk ul { margin:6px 0; padding-left:20px; } .bk li { margin:3px 0; }
  .bk .safe { background:#fef2f2; border:2px solid #f87171; border-radius:10px; padding:8px 12px; }
  .bk .tplthumb { border:2px dashed #9ca3af; border-radius:8px; }
  .bkbar { display:flex; gap:10px; flex-wrap:wrap; margin:0 0 16px; }
  .bkbar a, .bkbar button { padding:10px 16px; border:1px solid var(--pumpkin); border-radius:10px; background:transparent; color:var(--pumpkin); font-weight:700; text-decoration:none; cursor:pointer; font-size:15px; }
  @media print {
    @page { size: letter; margin: .4in; }
    .top, nav.tabs, footer, .bkbar { display:none !important; }
    html, body, main { background:#fff !important; margin:0; padding:0; max-width:none; }
    .bk { break-inside:avoid; break-after:page; margin:0; height:10in; overflow:hidden; font-size:13px; padding:10px 16px; }
    .bk:last-of-type { break-after:auto; }
    .bk .bdraw.plan { height:5.4in; max-height:none; width:100%; }
    .bk .pics.two .bdraw.plan { height:5in; }
    .bk.cover .pics.two .bdraw.plan { height:3.6in; }
    .bk .pics.two.stack .bdraw.plan { height:2.5in; }
    .bk .pics.stack svg:not(.bdraw) { height:2.9in; }
    .bk .pics.two:not(.stack) > div:first-child { flex:0 0 58%; }
  }
</style>

<div class="bkbar">
  <button onclick="window.print()">🖨️ Print the booklet</button>
  <?php if ($u = build_pdf($B, 'steps')): ?><a href="<?= $u ?>">📄 Booklet PDF</a><?php endif; ?>
  <?php if (!empty($J['template'])): ?><a href="<?= build_pdf($B, 'template') ?: "/template.php?b=$B" ?>">✂️ Template (print on card stock)</a><?php endif; ?>
  <?php if (!empty($J['page'])): ?><a href="/?p=<?= $J['page'] ?>">↩ <?= ucfirst($J['page']) ?> page</a><?php endif; ?>
</div>

<section class="bk cover">
  <h2><?= ($J['emoji'] ?? '') . ' ' . htmlspecialchars($J['title']) ?></h2>
  <p class="do"><?= htmlspecialchars($J['intro']) ?></p>
  <div class="pics two">
    <?php foreach ($J['cover'] ?? [] as $d) echo '<div>' . build_draw($lib, $d) . '</div>'; ?>
  </div>
  <h3 style="font-size:1.2em;margin-top:8px">You need</h3>
  <ul><?php foreach ($J['need'] as $x) echo '<li>' . htmlspecialchars($x) . '</li>'; ?></ul>
  <?php if (!empty($J['template'])): ?><p class="chk">✂️ <b>Template:</b> <?= htmlspecialchars($J['template']['what']) ?> It's the separate one-page PDF.</p><?php endif; ?>
  <?php if (!empty($J['safety'])): ?><p class="safe"><?= htmlspecialchars($J['safety']) ?></p><?php endif; ?>
</section>

<?php foreach ($J['steps'] as $i => $s): $k = $i + 1; $two = count($s['draw'] ?? []) > 1; ?>
<section class="bk">
  <div class="head">
    <div class="num"><?= $k ?></div>
    <h3><small>Step <?= $k ?> of <?= $n ?></small><?= htmlspecialchars($s['title']) ?></h3>
  </div>
  <?php if (!empty($s['need'])): ?><div class="chips"><?php foreach ($s['need'] as $x) echo '<span>' . htmlspecialchars($x) . '</span>'; ?></div><?php endif; ?>
  <div class="pics<?= $two ? ' two' : '' ?><?= !empty($s['stack']) ? ' stack' : '' ?>">
    <?php foreach ($s['draw'] ?? [] as $d) echo '<div>' . build_draw($lib, $d) . '</div>'; ?>
  </div>
  <p class="do"><?= htmlspecialchars($s['do']) ?></p>
  <?php if (!empty($s['check'])): ?><p class="chk">✅ <b>Check:</b> <?= htmlspecialchars($s['check']) ?></p><?php endif; ?>
  <?php if (!empty($s['why'])): ?><p class="why">🧠 <b>Why:</b> <?= htmlspecialchars($s['why']) ?></p><?php endif; ?>
</section>
<?php endforeach; ?>
