<?php
// the kai site - Kai's coding + electronics projects hub.
// PHP 7.4 (Laragon www74 wildcard vhost). No framework on purpose - a 6th grader
// should be able to open a page file and change it. Same shape as the boat site.

date_default_timezone_set('America/Los_Angeles');

$PAGE  = isset($_GET['p']) ? preg_replace('/[^a-z]/', '', $_GET['p']) : 'home';
$PAGES = [
  'home'     => 'Home',
  'game'     => 'Game',
  'plane'    => 'Plane',
  'build'    => 'Build',
  'print'    => '3D Print',
  'talk'     => 'Talk',
  'projects' => 'Projects',
  'log'      => 'Log',
];
if (!isset($PAGES[$PAGE])) { $PAGE = 'home'; }

$LOG = [];
$logFile = __DIR__ . '/data/log.json';
if (is_file($logFile)) { $LOG = json_decode(file_get_contents($logFile), true) ?: []; }

$PROJECTS = [];
$projFile = __DIR__ . '/data/projects.json';
if (is_file($projFile)) { $PROJECTS = json_decode(file_get_contents($projFile), true) ?: []; }
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>Kai Code</title>
<link rel="stylesheet" href="/assets/app.css?v=1">
</head>
<body>

<header class="top">
  <div class="brand">
    <span class="pump">&#128187;</span>
    <div>
      <h1>Kai Code</h1>
      <p class="sub">Kai's coding &amp; electronics projects</p>
    </div>
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
  built by Kai + Dad + Bugsy &middot; free + open source (MIT) on <a href="https://github.com/joefaron/kai-code">GitHub</a> &middot;
  <?= date('M j, Y g:ia') ?>
</footer>

</body>
</html>
