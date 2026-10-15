<?php
// LEGO-style build sheet. Drawn by tools/build-steps.mjs (project folder) from one description
// of the circuit; this page only lays out data/steps.json. Re-run the generator after any change,
// then tools/steps-pdf.mjs for the printable PDF. Part pictures come from _part_icons.php.
require_once __DIR__ . '/_part_icons.php';
$steps = json_decode(@file_get_contents(__DIR__ . '/../data/steps.json'), true) ?: [];
$ver = @filemtime(__DIR__ . '/../data/steps.json');
$pdf = __DIR__ . '/../media/boat-build-steps.pdf';
?>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Creepster&family=Fredoka:wght@400;600&display=swap" rel="stylesheet">
<style>
  .spooky { font-family:'Creepster', system-ui, cursive; letter-spacing:.04em; font-weight:400; }
  .steps-hero h2 { font-family:'Creepster', system-ui, cursive; font-size:2.6em; font-weight:400; color:var(--pumpkin); margin:0 0 6px; letter-spacing:.04em; }
  .lego { font-family:'Fredoka', system-ui, sans-serif; background:#fff; color:#1f2937; border-radius:16px; padding:16px 20px 18px; margin:0 0 24px; border:3px solid #111; }
  .lego .head { display:flex; align-items:center; gap:14px; margin:0 0 10px; }
  .lego .num { font-family:'Creepster', system-ui, cursive; font-size:3.4em; line-height:1; color:#fff; background:#ff7a1a; border:3px solid #111; border-radius:14px; padding:4px 14px 2px; min-width:1.2em; text-align:center; }
  .lego h3 { font-family:'Fredoka', system-ui, sans-serif; font-weight:600; margin:0; font-size:1.55em; line-height:1.15; color:#111; }
  .lego h3 small { display:block; font-family:'Creepster', system-ui, cursive; font-weight:400; font-size:.7em; color:#ff7a1a; letter-spacing:.06em; }
  .lego h3 .opt { font-family:'Fredoka', sans-serif; font-size:.55em; background:#e5e7eb; color:#374151; border-radius:8px; padding:2px 8px; vertical-align:middle; }
  .parts { background:#eff6ff; border:2px solid #93c5fd; border-radius:12px; padding:6px 12px 10px; margin:0 0 10px; }
  .parts-h { font-weight:600; font-size:.8em; text-transform:uppercase; letter-spacing:.1em; color:#1d4ed8; margin:0 0 4px; }
  .parts-row { display:flex; flex-wrap:wrap; gap:10px 18px; }
  .part { display:flex; align-items:center; gap:8px; max-width:260px; }
  .part .pic { position:relative; flex:none; background:#fff; border-radius:10px; border:1px solid #bfdbfe; padding:2px; }
  .part .pic svg { display:block; }
  .part .cnt { position:absolute; right:-8px; bottom:-6px; background:#111; color:#fff; border-radius:999px; font-size:.8em; padding:1px 7px; }
  .part .lbl { font-size:.95em; line-height:1.2; }
  .lego img { width:100%; display:block; }
  .lego .do { font-size:1.2em; line-height:1.45; margin:10px 0 8px; }
  .lego .lchk { background:#dcfce7; border:2px solid #16a34a; padding:8px 12px; border-radius:10px; margin:8px 0; font-size:1.05em; }
  .lego .why { background:#f3f4f6; border-radius:10px; padding:6px 12px; color:#374151; font-size:.98em; margin:6px 0 0; }
  .lego .fun { display:flex; gap:10px; align-items:center; margin:10px 0 0; font-size:1em; color:#6b21a8; }
  .lego .fun .ghost { font-size:1.8em; flex:none; }
  .lego .fun span:last-child { background:#faf5ff; border:2px dashed #c084fc; border-radius:14px; padding:6px 12px; }
  @media print {
    nav.tabs, .printbtn, .pdflink, header, footer { display:none !important; }
    html, body, main, .hero { background:#fff !important; color:#111 !important; }
    .hero { break-after:page; page-break-after:always; border:none !important; }
    .hero a { color:#111 !important; }
    .lego { break-inside:avoid; page-break-inside:avoid; break-after:page; page-break-after:always; margin:0; }
    .lego:last-of-type { break-after:auto; page-break-after:auto; }
    .lego img { max-height:4.3in; object-fit:contain; }
    .lego { font-size:14px; padding:10px 16px 12px; }
  }
</style>

<section class="hero steps-hero">
  <h2>Build the Jack-o'-Lantern Airboat</h2>
  <p class="lede">One step at a time, like LEGO. Each picture shows the whole board: the pieces you
  already placed are faded, the <strong>new</strong> pieces glow yellow, and the black bubbles name
  the exact hole (column number + row letter) for each end of a new wire. Do the
  <strong>&#9989; check</strong> before you turn the page.</p>
  <p><button class="printbtn" onclick="window.print()">&#128424; Print the booklet</button>
  <?php if (is_file($pdf)): ?>
    <a class="pdflink" href="/media/boat-build-steps.pdf?v=<?= @filemtime($pdf) ?>">&#128196; Download the PDF</a>
  <?php endif; ?></p>
  <p style="font-size:.9em">Made by <code>tools/build-steps.mjs</code>: the parts and wires are described
  once, and every page is drawn from that description, so one change updates the whole booklet.
  The zoomable diagram and the pin list are on the <a href="/?p=wiring">Wiring</a> page.</p>
</section>

<?php foreach ($steps as $s): ?>
<section class="lego">
  <div class="head">
    <div class="num"><?= (int)$s['n'] ?></div>
    <h3><small>Step <?= (int)$s['n'] ?> of <?= count($steps) ?></small><?= htmlspecialchars($s['title']) ?><?php if (!empty($s['optional'])): ?> <span class="opt">optional</span><?php endif; ?></h3>
  </div>
  <?= part_box($s['need'] ?? []) ?>
  <img src="<?= htmlspecialchars($s['svg']) ?>?v=<?= $ver ?>" alt="Step <?= (int)$s['n'] ?> picture" loading="lazy">
  <p class="do"><?= htmlspecialchars($s['text']) ?></p>
  <?php if ($s['check']): ?><p class="lchk">&#9989; <strong>Check:</strong> <?= htmlspecialchars($s['check']) ?></p><?php endif; ?>
  <?php if ($s['why']): ?><p class="why">&#129504; <strong>Why:</strong> <?= htmlspecialchars($s['why']) ?></p><?php endif; ?>
  <?php if (!empty($s['fun'])): ?><p class="fun"><span class="ghost">&#128123;</span><span><?= htmlspecialchars($s['fun']) ?></span></p><?php endif; ?>
</section>
<?php endforeach; ?>
