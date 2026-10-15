<?php
// A project's cut/fold template, alone on a Letter page with NO margins, so it prints at
// TRUE SIZE. Which drawing: "template" in data/builds/<b>.json.  /template.php?b=plane
$B = isset($_GET['b']) ? preg_replace('/[^a-z0-9-]/', '', $_GET['b']) : '';
$file = __DIR__ . "/data/builds/$B.json";
if (!$B || !is_file($file)) { http_response_code(404); exit('no such build'); }
$J = json_decode(file_get_contents($file), true);
require_once __DIR__ . '/lib/' . ($J['lib'] ?? $B) . '.php';
?>
<!doctype html>
<html><head><meta charset="utf-8"><title><?= htmlspecialchars($J['title']) ?> - template</title>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: 8.5in 11in; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  @media screen { body { background: #ccc; padding: 20px; } svg { background: #fff; margin: auto; box-shadow: 0 2px 12px #0005; } }
</style></head>
<body><?= call_user_func('draw_' . $J['template']['draw']) ?></body></html>
