<?php
// the boat site - Kai's 6th grade STEM Boat Challenge (fall 2026)
// PHP 7.4 (Laragon www74 wildcard vhost). No framework on purpose - it should be
// readable by a 6th grader who wants to change it.

date_default_timezone_set('America/Los_Angeles');

$PAGE = isset($_GET['p']) ? preg_replace('/[^a-z]/', '', $_GET['p']) : 'home';
$PAGES = [
  'home'    => 'Mission',
  'design'  => 'Design',
  'parts'   => 'Parts',
  'plan'    => 'Boat Plan',
  'steps'   => 'Build Steps',
  'wiring'  => 'Wiring',
  'control' => 'Control',
  'log'     => 'Build Log',
  'prompts' => 'AI Prompts',
];
if (!isset($PAGES[$PAGE])) { $PAGE = 'home'; }

// ---- countdown to the beach day (placeholder date) ----
$BEACH = new DateTime('2026-10-31 12:00:00');
$now   = new DateTime();
$days  = (int)$now->diff($BEACH)->format('%r%a');

$LOG = [];
$logFile = __DIR__ . '/data/log.json';
if (is_file($logFile)) { $LOG = json_decode(file_get_contents($logFile), true) ?: []; }

$PARTS = json_decode(file_get_contents(__DIR__ . '/data/parts.json'), true) ?: [];
$total = 0.0;
foreach ($PARTS as $p) { if (empty($p['optional'])) { $total += $p['price'] * $p['qty']; } }
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>S.S. Jack-o'-Lantern &middot; STEM Boat Challenge</title>
<link rel="stylesheet" href="/assets/app.css?v=12">
</head>
<body>

<header class="top">
  <div class="brand">
    <span class="pump">&#127875;</span>
    <div>
      <h1>S.S. Jack-o'-Lantern</h1>
      <p class="sub">6th Grade STEM Boat Challenge &middot; a calm beach</p>
    </div>
  </div>
  <div class="count <?= $days <= 7 ? 'hot' : '' ?>">
    <strong><?= $days ?></strong><span>days to launch</span>
  </div>
</header>

<nav class="tabs">
<?php foreach ($PAGES as $slug => $label): ?>
  <a href="/?p=<?= $slug ?>" class="<?= $slug === $PAGE ? 'on' : '' ?>"><?= $label ?></a>
<?php endforeach; ?>
</nav>

<main>
<?php include __DIR__ . "/pages/$PAGE.php"; ?>
</main>

<footer>
  built by Kai + a teammate + Dad + Bugsy &middot; talk to this site in Slack <code>#boat</code> &middot;
  <?= date('M j, Y g:ia') ?>
</footer>

</body>
</html>
