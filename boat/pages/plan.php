<?php
// Boat plan booklet: top view, side view, steering, and the choices the kids get to make.
// All drawings are inline SVG drawn from the sizes below (units = cm), so change a number here
// and every picture follows. Printed to media/boat-plan.pdf by: node tools/steps-pdf.mjs plan
$D = [
  'deckW' => 23, 'deckL' => 40,          // corrugated sign board, 9 x 16 in
  'hullX' => 10, 'bottleL' => 34, 'bottleD' => 9,    // each pontoon = 8 small bottles taped together (size: measure!)
  'pontoon' => '8 small bottles',
  'prop' => 7,                            // prop diameter (measure yours! 80 mm props = 8)
  'post' => 0,                            // no post: fans hang off the back edge (choice A2, 2026-09-19)
  'axis' => 1.6,                          // holder base to motor shaft
];
$propR = $D['prop'] / 2;
$gap = round($D['post'] + $D['axis'] - $propR, 1);   // blade tip above the deck

// ---------- tiny SVG helpers (all in cm) ----------
function t($x, $y, $s, $o = []) {
  $a = $o['a'] ?? 'middle'; $f = $o['f'] ?? 1.1; $c = $o['c'] ?? '#111'; $w = $o['w'] ?? 400;
  return "<text x='$x' y='$y' font-size='$f' text-anchor='$a' fill='$c' font-weight='$w'>" . htmlspecialchars($s) . "</text>";
}
function arrow($x1, $y1, $x2, $y2, $c = '#111', $w = .25) {
  $ang = atan2($y2 - $y1, $x2 - $x1); $h = max(.8, $w * 3);
  $p1 = [$x2 - $h * cos($ang - .45), $y2 - $h * sin($ang - .45)];
  $p2 = [$x2 - $h * cos($ang + .45), $y2 - $h * sin($ang + .45)];
  return "<line x1='$x1' y1='$y1' x2='$x2' y2='$y2' stroke='$c' stroke-width='$w' stroke-linecap='round'/>"
    . "<polygon points='$x2,$y2 {$p1[0]},{$p1[1]} {$p2[0]},{$p2[1]}' fill='$c'/>";
}
function leader($x, $y, $tx, $ty, $s, $a = 'start', $f = 1) {
  $dy = $ty - .35;
  return "<line x1='$x' y1='$y' x2='$tx' y2='$dy' stroke='#555' stroke-width='.08'/>"
    . "<circle cx='$x' cy='$y' r='.25' fill='#555'/>" . t($tx + ($a === 'start' ? .3 : ($a === 'end' ? -.3 : 0)), $ty, $s, ['a' => $a, 'f' => $f]);
}
function svg($vb, $body, $maxw = '100%') {
  return "<svg viewBox='$vb' style='width:100%;max-width:$maxw;display:block;margin:0 auto' font-family='Fredoka, system-ui, sans-serif'>$body</svg>";
}

// Top view, bow UP. $o: bank front|middle|back, thrust [l,r] (0..1), turn left|right, wires, labels, mini
function top_view($D, $o = []) {
  $W = $D['deckW'] / 2; $L = $D['deckL'] / 2; $hx = $D['hullX']; $bl = $D['bottleL'] / 2; $br = $D['bottleD'] / 2;
  $mini = !empty($o['mini']); $lab = !empty($o['labels']); $wires = !empty($o['wires']);
  $s = '';
  // water
  $s .= "<rect x='-30' y='-30' width='60' height='64' fill='#e0f2fe'/>";
  // bottles under the deck (dashed)
  foreach ([-$hx, $hx] as $x) {
    $s .= "<rect x='" . ($x - $br) . "' y='" . (-$bl + 3) . "' width='" . (2 * $br) . "' height='" . (2 * $bl - 3) . "' rx='3' fill='#bfdbfe' stroke='#3b82f6' stroke-width='.15' stroke-dasharray='.6 .4'/>";
    for ($i = 1; $i < 4; $i++) { $yy = -$bl + 3 + $i * (2 * $bl - 3) / 4; $s .= "<line x1='" . ($x - $br) . "' y1='$yy' x2='" . ($x + $br) . "' y2='$yy' stroke='#3b82f6' stroke-width='.1' stroke-dasharray='.4 .4'/>"; }
    $s .= "<line x1='$x' y1='" . (-$bl + 3) . "' x2='$x' y2='$bl' stroke='#3b82f6' stroke-width='.1' stroke-dasharray='.4 .4'/>";
  }
  // deck
  $s .= "<rect x='-$W' y='-$L' width='" . (2 * $W) . "' height='" . (2 * $L) . "' rx='1' fill='#1f2937' fill-opacity='.88' stroke='#111' stroke-width='.2'/>";
  // pumpkin face on the bow
  $s .= "<circle cx='0' cy='" . (-$L + 2.6) . "' r='1.9' fill='#f97316'/><path d='M-.9 " . (-$L + 2.1) . " l.4 -.6 .4 .6z M.1 " . (-$L + 2.1) . " l.4 -.6 .4 .6z M-1 " . (-$L + 3) . " q1 .9 2 0' fill='#111' stroke='#111' stroke-width='.1'/>";
  // electronics layout
  $bank = $o['bank'] ?? 'front';
  $lay = [   // bankX, bankY, box x, box y, AA holder y
    'front'  => [[-3.5, 3.5], [-15.5, -7.5], [-5.5, 5.5], [-4, 7], [9.5, 14]],
    'middle' => [[-9.5, -3], [-5, 3], [-1.5, 9.5], [-6, 5], [-16, -11.5]],
    'back'   => [[-3.5, 3.5], [7.5, 14.5], [-5.5, 5.5], [-9, 2], [-16, -11.5]],
  ][$bank];
  [$bankX, $bankY, $bx, $boxY, $aaY] = $lay;
  // dry box
  $s .= "<rect x='{$bx[0]}' y='{$boxY[0]}' width='" . ($bx[1] - $bx[0]) . "' height='" . ($boxY[1] - $boxY[0]) . "' rx='.8' fill='#f8fafc' stroke='#0ea5e9' stroke-width='.3'/>";
  if (!$mini) {
    $cx = ($bx[0] + $bx[1]) / 2; $cy = ($boxY[0] + $boxY[1]) / 2;
    $s .= "<rect x='" . ($cx - 4.5) . "' y='" . ($cy - 2.5) . "' width='9' height='5' fill='#fff' stroke='#bbb' stroke-width='.1'/>";
    $s .= "<rect x='" . ($cx - 4.2) . "' y='" . ($cy - 2) . "' width='4.6' height='2.6' fill='#1f2937'/>";
    $s .= "<rect x='" . ($cx + 1.2) . "' y='" . ($cy - 1.6) . "' width='2.2' height='2.2' fill='#7e22ce'/>";
  }
  // power bank + AA holder
  $s .= "<rect x='{$bankX[0]}' y='{$bankY[0]}' width='" . ($bankX[1] - $bankX[0]) . "' height='" . ($bankY[1] - $bankY[0]) . "' rx='1' fill='#e5e7eb' stroke='#6b7280' stroke-width='.2'/>";
  $s .= "<rect x='-3' y='{$aaY[0]}' width='6' height='" . ($aaY[1] - $aaY[0]) . "' rx='.4' fill='#111' stroke='#f59e0b' stroke-width='.2'/>";
  for ($i = 0; $i < 4; $i++) $s .= "<rect x='" . (-2.7 + $i * 1.45) . "' y='" . ($aaY[0] + .4) . "' width='1.2' height='" . ($aaY[1] - $aaY[0] - .8) . "' rx='.3' fill='#f59e0b'/>";
  // fans: post, motor, prop disc seen edge-on, air
  $th = $o['thrust'] ?? [1, 1];
  $four = ($o['fans'] ?? 2) == 4;   // 4 fans: two per side, wired in parallel
  $fx = $four ? [[-11.5, $th[0]], [-3.9, $th[0]], [3.9, $th[1]], [11.5, $th[1]]] : [[-$hx, $th[0]], [$hx, $th[1]]];
  foreach ($fx as [$x, $k]) {
    $s .= "<rect x='" . ($x - 1.6) . "' y='" . ($L - 2.2) . "' width='3.2' height='2.2' fill='#fff' stroke='#999' stroke-width='.1'/>";
    $s .= "<rect x='" . ($x - 1.3) . "' y='" . ($L - 2) . "' width='2.6' height='3' fill='#9ca3af' stroke='#4b5563' stroke-width='.1'/>";
    $s .= "<rect x='" . ($x - $D['prop'] / 2) . "' y='" . ($L + 1.4) . "' width='{$D['prop']}' height='.7' rx='.35' fill='#dc2626'/>";
    if ($k > 0) for ($j = -1; $j <= 1; $j++) $s .= arrow($x + $j * 2.2, $L + 3, $x + $j * 2.2, $L + 3 + 6 * $k, '#0284c7', .22);
  }
  // wires
  if ($wires) {
    $bxL = $bx[0]; $bxR = $bx[1]; $by = $boxY[1] - 1;
    $fw = $four ? [[-11.5, $bxL, -1], [-3.9, $bxL, -1], [3.9, $bxR, 1], [11.5, $bxR, 1]] : [[-$hx, $bxL, -1], [$hx, $bxR, 1]];
    foreach ($fw as [$x, $edge, $sgn]) {
      foreach ([['#dc2626', 0], ['#111', .35]] as [$c, $off]) {
        $xo = $x + $sgn * $off;
        $s .= "<polyline points='$xo," . ($L - 2.2) . " $xo," . ($by + $off) . " $edge," . ($by + $off) . "' fill='none' stroke='$c' stroke-width='.22'/>";
      }
      $s .= "<circle cx='$edge' cy='" . ($by + .17) . "' r='.45' fill='#facc15' stroke='#111' stroke-width='.08'/>";
    }
    // USB bank -> ESP32, AA -> box
    $s .= "<polyline points='0,{$bankY[1]} 0," . ($boxY[0]) . "' fill='none' stroke='#6b7280' stroke-width='.35'/>";
    $s .= "<polyline points='-.6,{$aaY[0]} -.6,{$boxY[1]}' stroke='#dc2626' stroke-width='.2'/><polyline points='.6,{$aaY[0]} .6,{$boxY[1]}' stroke='#111' stroke-width='.2'/>";
    // LEDs: red left (port), green right (starboard), yellow on the stern
    $ly = $boxY[0] + 1.5;
    $s .= "<polyline points='{$bx[0]},$ly " . (-$W + .8) . ",$ly' stroke='#dc2626' stroke-width='.12' stroke-dasharray='.5 .3'/>";
    $s .= "<polyline points='{$bx[1]},$ly " . ($W - .8) . ",$ly' stroke='#16a34a' stroke-width='.12' stroke-dasharray='.5 .3'/>";
    $s .= "<polyline points='4," . ($boxY[1]) . " 4," . ($L - 1) . " 1," . ($L - 1) . "' fill='none' stroke='#ca8a04' stroke-width='.12' stroke-dasharray='.5 .3'/>";
  }
  if ($wires || $lab) {
    $ly = $boxY[0] + 1.5;
    $s .= "<circle cx='" . (-$W + .6) . "' cy='$ly' r='.6' fill='#ef4444' stroke='#fff' stroke-width='.12'/>";
    $s .= "<circle cx='" . ($W - .6) . "' cy='$ly' r='.6' fill='#22c55e' stroke='#fff' stroke-width='.12'/>";
    $s .= "<circle cx='0' cy='" . ($L - .9) . "' r='.6' fill='#facc15' stroke='#fff' stroke-width='.12'/>";
  }
  // turning path
  if (!empty($o['turn'])) {
    $d = $o['turn'] === 'right' ? 1 : -1;
    $s .= "<path d='M0 " . (-$L - 1) . " q0 -5 " . (5 * $d) . " -7' fill='none' stroke='#16a34a' stroke-width='.35'/>";
    $s .= arrow(4.4 * $d, -$L - 7.7, 5.2 * $d, -$L - 8, '#16a34a', .35);
  } elseif (isset($o['thrust'])) {
    $s .= arrow(0, -$L - 1, 0, -$L - 7, '#16a34a', .35);
  }
  if ($lab) {
    $s .= t(0, -$L - 3.5, 'BOW (front)', ['f' => 1.3, 'w' => 600]);
    $s .= t(-$W - 1.5, -2, 'LEFT', ['a' => 'end', 'f' => 1.2, 'w' => 600, 'c' => '#dc2626']) . t(-$W - 1.5, -.5, '= port', ['a' => 'end', 'f' => .9, 'c' => '#dc2626']);
    $s .= t($W + 1.5, -2, 'RIGHT', ['a' => 'start', 'f' => 1.2, 'w' => 600, 'c' => '#16a34a']) . t($W + 1.5, -.5, '= starboard', ['a' => 'start', 'f' => .9, 'c' => '#16a34a']);
    $s .= leader(-$hx - 3.5, $L + .2, -$W - 1.5, $L + 3.5, 'left fan', 'end');
    $s .= leader($hx + 3.5, $L + .2, $W + 1.5, $L + 3.5, 'right fan', 'start');
    $s .= leader(-$hx - $br, 3, -$W - 1.5, 7, $D['pontoon'] . ' (under)', 'end', .9);
    $s .= leader($bankX[1], ($bankY[0] + $bankY[1]) / 2, $W + 1.5, -12, 'power bank', 'start', .9);
    $s .= leader($bx[1], $boxY[1] - 2, $W + 1.5, 6, 'dry box', 'start', .9);
    $s .= leader(3, ($aaY[0] + $aaY[1]) / 2, $W + 1.5, 12, 'AA holder (6 AA + 2 dummies)', 'start', .9);
    $s .= leader(-$hx - 1.6, $L - 1, -$W - 1.5, $L - 1.5, 'holder on the back edge', 'end', .9);
    $s .= t(0, $L + 11, 'air blows back = boat goes forward', ['f' => .95, 'c' => '#0369a1']);
  }
  $vb = $lab ? '-31 -26 62 59' : ($wires ? '-16 -22 32 51' : '-16 -29 32 58');
  return svg($vb, $s, $o['w'] ?? ($mini ? '220px' : ($lab ? '560px' : '330px')));
}

// Side view, bow LEFT. $mount: post|overhang|fold. $zoom: stern only.
function side_view($D, $mount = 'post', $zoom = false) {
  $L = $D['deckL'] / 2; $bl = $D['bottleL'] / 2; $R = $D['prop'] / 2;
  $deckTop = -6.9; $s = '';
  $s .= "<rect x='-30' y='0' width='60' height='8' fill='#bae6fd'/><line x1='-30' y1='0' x2='30' y2='0' stroke='#0284c7' stroke-width='.15'/>";
  $s .= "<path d='M" . (-$bl) . " -1.5 q0 -5 3 -5 h" . (2 * $bl - 5) . " q2 0 2 3 v5 q0 2 -2 2 h" . (-(2 * $bl - 5)) . " q-3 0 -3 -2 z' fill='#bfdbfe' stroke='#3b82f6' stroke-width='.15'/>";
  $s .= "<rect x='-$L' y='-6.9' width='" . (2 * $L) . "' height='.4' fill='#1f2937'/>";
  if (!$zoom) {
    $s .= "<rect x='-15.5' y='-8.9' width='8' height='2' rx='.5' fill='#e5e7eb' stroke='#6b7280' stroke-width='.12'/>";
    $s .= "<rect x='-4' y='-12.9' width='11' height='6' rx='.5' fill='#f8fafc' stroke='#0ea5e9' stroke-width='.25'/>";
    $s .= "<rect x='9.5' y='-8.9' width='4.5' height='2' fill='#111'/>";
    $s .= "<circle cx='-19' cy='-8.4' r='1.5' fill='#f97316'/>";
  }
  if ($mount === 'overhang') { $px = $L - 1.4; $base = $deckTop; }
  elseif ($mount === 'fold') { $px = $L - 4; $base = $deckTop - $D['post']; }
  else { $px = $L - 4; $base = $deckTop - $D['post']; }
  if ($mount === 'post') $s .= "<rect x='" . ($px - 1.2) . "' y='$base' width='2.4' height='{$D['post']}' rx='.3' fill='#d6a76b' stroke='#92400e' stroke-width='.12'/>";
  if ($mount === 'fold') $s .= "<polygon points='" . ($px - 2) . ",$deckTop " . ($px + 2) . ",$deckTop $px,$base' fill='#374151' stroke='#111' stroke-width='.12'/><rect x='" . ($px - 1.5) . "' y='" . ($base - .2) . "' width='3' height='.3' fill='#374151'/>";
  $ax = $base - $D['axis'];
  $s .= "<rect x='" . ($px - 1.5) . "' y='" . ($base - .3) . "' width='3' height='.3' fill='#fff' stroke='#999' stroke-width='.06'/>";
  $s .= "<rect x='" . ($px - 1.5) . "' y='" . ($ax - 1.25) . "' width='3' height='2.5' fill='#9ca3af' stroke='#4b5563' stroke-width='.1'/>";
  $pxx = $px + 2.4;
  $s .= "<line x1='" . ($px + 1.5) . "' y1='$ax' x2='$pxx' y2='$ax' stroke='#374151' stroke-width='.2'/>";
  $s .= "<ellipse cx='$pxx' cy='$ax' rx='.5' ry='$R' fill='#dc2626' fill-opacity='.85'/>";
  for ($j = -1; $j <= 1; $j++) $s .= arrow($pxx + 1, $ax + $j * 1.6, $pxx + 5, $ax + $j * 1.6, '#0284c7', .18);
  // clearance callout
  $tip = $ax + $R;
  if ($mount === 'overhang') {
    $s .= arrow($pxx + 6.5, $tip, $pxx + 6.5, -.2, '#b45309', .12) . arrow($pxx + 6.5, -.2, $pxx + 6.5, $tip, '#b45309', .12);
    $s .= t($pxx + 7.2, ($tip - .2) / 2 + .4, round(-$tip, 1) . ' cm above water', ['a' => 'start', 'f' => .9, 'c' => '#b45309']);
  } else {
    $s .= "<line x1='" . ($pxx - 1) . "' y1='$deckTop' x2='" . ($pxx + 1) . "' y2='$deckTop' stroke='#b45309' stroke-width='.1' stroke-dasharray='.3 .2'/>";
    $s .= arrow($pxx + 1.3, $deckTop, $pxx + 1.3, $tip, '#b45309', .1);
    $s .= t($pxx + 1.8, $tip + 1.4, 'gap ' . round($deckTop - $tip, 1) . ' cm', ['a' => 'start', 'f' => .9, 'c' => '#b45309']);
  }
  if (!$zoom) {
    $s .= t(-19, -11, 'BOW', ['f' => 1.1, 'w' => 600]);
    $s .= t(-11.5, -9.6, 'power bank', ['f' => .75]) . t(1.5, -13.5, 'dry box', ['f' => .8]) . t(11.7, -9.6, 'AA', ['f' => .75]);
    $s .= t(0, 3, 'water line', ['f' => .8, 'c' => '#0369a1']) . t(0, -3.5, $D['pontoon'], ['f' => .8, 'c' => '#1d4ed8']);
    if ($mount !== 'overhang') $s .= leader($px - 1.2, $base + 2, $px - 5, $base - 5, $mount === 'post' ? 'cork post' : 'post', 'end', .85);
    else $s .= leader($px - 1.2, $base - .2, $px - 4, -17, 'holder on the back edge', 'end', .85);
    return svg('-22 -20 58 26', $s, '720px');
  }
  return svg('4 -20 31 26', $s, '320px');
}
function choice_box($letter, $title, $body, $pros, $cons) {
  $h = "<div class='opt'><div class='ohead'><span class='olet'>$letter</span> <b>" . htmlspecialchars($title) . "</b></div>$body";
  $h .= "<p class='pro'>&#128077; " . htmlspecialchars($pros) . "</p><p class='con'>&#128078; " . htmlspecialchars($cons) . "</p>";
  return $h . "<p class='pick'>&#9744; We pick this</p></div>";
}
$pdf = __DIR__ . '/../media/boat-plan.pdf';
?>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Creepster&family=Fredoka:wght@400;600&display=swap" rel="stylesheet">
<style>
  .plan-hero h2 { font-family:'Creepster', system-ui, cursive; font-size:2.6em; font-weight:400; color:var(--pumpkin); margin:0 0 6px; letter-spacing:.04em; }
  .sheet { font-family:'Fredoka', system-ui, sans-serif; background:#fff; color:#1f2937; border-radius:16px; padding:16px 20px 18px; margin:0 0 24px; border:3px solid #111; }
  .sheet .head { display:flex; align-items:center; gap:14px; margin:0 0 10px; }
  .sheet .num { font-family:'Creepster', system-ui, cursive; font-size:2.6em; line-height:1; color:#fff; background:#7c3aed; border:3px solid #111; border-radius:14px; padding:6px 12px 2px; text-align:center; }
  .sheet .num.choice { background:#ff7a1a; }
  .sheet h3 { font-family:'Fredoka', system-ui, sans-serif; font-weight:600; margin:0; font-size:1.5em; line-height:1.15; color:#111; }
  .sheet h3 small { display:block; font-family:'Creepster', system-ui, cursive; font-weight:400; font-size:.7em; color:#ff7a1a; letter-spacing:.06em; }
  .sheet p, .sheet li { font-size:1.08em; line-height:1.45; }
  .sheet .note { background:#f3f4f6; border-radius:10px; padding:8px 12px; }
  .sheet .lchk { background:#dcfce7; border:2px solid #16a34a; padding:8px 12px; border-radius:10px; }
  .sheet .fun { color:#6b21a8; }
  .opts { display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:12px; margin:10px 0; }
  .opt { border:2px solid #d1d5db; border-radius:12px; padding:8px 10px; }
  .opt .ohead { font-size:1.1em; margin:0 0 4px; }
  .opt .olet { display:inline-block; background:#111; color:#fff; border-radius:8px; padding:0 8px; font-weight:600; }
  .opt p { font-size:.95em; margin:4px 0; }
  .opt .pick { font-size:1.15em; font-weight:600; margin-top:8px; }
  .wt { width:100%; border-collapse:collapse; font-size:.98em; }
  .wt th, .wt td { border:1px solid #d1d5db; padding:5px 8px; text-align:left; vertical-align:top; }
  .wt th { background:#eff6ff; }
  .wt td.blank { height:2.2em; }
  .sw { display:inline-block; width:12px; height:12px; border-radius:3px; vertical-align:-1px; margin-right:4px; border:1px solid #0003; }
  .steer { display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; text-align:center; }
  @media print {
    nav.tabs, .printbtn, .pdflink, header, footer { display:none !important; }
    html, body, main, .hero { background:#fff !important; color:#111 !important; }
    .hero { break-after:page; page-break-after:always; border:none !important; }
    .hero a { color:#111 !important; }
    .sheet { break-inside:avoid; page-break-inside:avoid; break-after:page; page-break-after:always; margin:0; font-size:13.5px; padding:10px 16px 12px; }
    .sheet:last-of-type { break-after:auto; page-break-after:auto; }
  }
</style>

<section class="hero plan-hero">
  <h2>Boat Plan</h2>
  <p class="lede">Where everything goes on the boat, how it steers, and the choices that are
  <strong>yours to make</strong>. Pages with an orange letter are choices: read the options, test if
  you can, tick one, and write down <em>why</em>. The judges will ask.</p>
  <p><button class="printbtn" onclick="window.print()">&#128424; Print</button>
  <?php if (is_file($pdf)): ?><a class="pdflink" href="/media/boat-plan.pdf?v=<?= @filemtime($pdf) ?>">&#128196; Download the PDF</a><?php endif; ?></p>
  <p style="font-size:.9em">Wiring on the breadboard itself is in the <a href="/?p=steps">Build Steps</a> booklet.
  Sizes used in these drawings: deck <?= $D['deckL'] ?> &times; <?= $D['deckW'] ?> cm, bottles <?= 2 * $D['hullX'] ?> cm apart,
  prop <?= $D['prop'] * 10 ?> mm, pontoons = <?= $D['pontoon'] ?> each. Measure yours and tell Bugsy to change them.</p>
</section>

<section class="sheet">
  <div class="head"><div class="num">1</div><h3><small>Page 1</small>The whole boat from above</h3></div>
  <?= top_view($D, ['labels' => true, 'thrust' => [1, 1]]) ?>
  <p>Front of the boat is at the <strong>top</strong>. "Left" and "right" always mean the boat's own
  left and right, as if you're sitting on it looking forward. Two fans at the back, one behind each
  bottle, blow air backwards. Nothing hangs in the water except the bottles.</p>
  <p class="note">&#129504; <strong>Why this layout:</strong> the fans are at the back, so the heavy power bank goes at the
  front to balance them. The dry box sits in the middle, away from spray. This is a
  <em>starting point</em>: choices A and B change it.</p>
</section>

<section class="sheet">
  <div class="head"><div class="num">2</div><h3><small>Page 2</small>From the side: fans hang off the back</h3></div>
  <?= side_view($D, 'overhang') ?>
  <p>Each prop blade reaches <?= $propR ?> cm from the motor shaft, but the holder's flat base is only <?= $D['axis'] ?> cm
  below the shaft. Flat on the deck, the blades would hit it. So the holder sits right on the <strong>back edge</strong>,
  with the motor pointing backwards: the prop spins behind the boat, where there's no deck to hit.</p>
  <p class="note">&#128295; <strong>Mounting:</strong> one small screw (#4 &times; &frac12;") through the hole in the holder's flat base
  into the deck, plus hot glue so it can't twist. Snap the motor in with its shaft pointing <strong>backwards</strong>.
  Stick the two holders at the same distance from the edge so the fans match.</p>
  <p class="lchk">&#9989; <strong>Check:</strong> spin each prop slowly by hand: it doesn't touch the deck, a bottle or a wire. Float the
  boat and measure how high the lowest blade tip is above the water: ______ cm. Less than 2 cm? Waves will splash it,
  so move the holder up (a small block under it).</p>
</section>

<section class="sheet">
  <div class="head"><div class="num">3</div><h3><small>Page 3</small>How two fans steer (no rudder!)</h3></div>
  <div class="steer">
    <div><?= top_view($D, ['mini' => true, 'thrust' => [1, 1]]) ?><b>Straight</b><br>both fans the same</div>
    <div><?= top_view($D, ['mini' => true, 'thrust' => [1, .35], 'turn' => 'right']) ?><b>Turn right</b><br>LEFT fan faster</div>
    <div><?= top_view($D, ['mini' => true, 'thrust' => [.35, 1], 'turn' => 'left']) ?><b>Turn left</b><br>RIGHT fan faster</div>
  </div>
  <p>It steers like a tank: push one side harder and the boat swings the other way. The code does it for
  you when you push the joystick sideways. Fans further apart = stronger turning (like pushing a door far
  from its hinges).</p>
  <p class="note">&#129514; <strong>Test and write it down:</strong> these props push much less air spinning backwards, so reverse
  and spinning on the spot will be weak. How long does a full circle take? Try it in the tub.</p>
  <p class="fun">&#128123; Real Everglades airboats use a rudder. Ours has zero moving parts except the fans. Tell the judges that.</p>
</section>

<section class="sheet">
  <div class="head"><div class="num choice">A</div><h3><small>Your choice</small>Where do the heavy things go?</h3></div>
  <div class="steer">
    <div><?= top_view($D, ['mini' => true, 'bank' => 'front']) ?><b>A1: bank at the front</b><br>balances the fans at the back</div>
    <div><?= top_view($D, ['mini' => true, 'bank' => 'middle']) ?><b>A2: bank in the middle</b><br>short cable, very stable</div>
    <div><?= top_view($D, ['mini' => true, 'bank' => 'back']) ?><b>A3: bank at the back</b><br>fans + bank all at the back</div>
  </div>
  <p>Grey = power bank, black = AA holder, blue outline = dry box. The power bank is the heaviest part.
  Where it sits decides whether the boat floats level, nose-up, or leaning.</p>
  <p class="note">&#129514; <strong>Test:</strong> put everything on the deck without gluing it, float the boat in the tub and look
  from the side. Level? Nose up? Leaning? Slide the bank until it sits flat, <em>then</em> fix it down.
  Sailors call this <strong>trim</strong>.</p>
  <p>&#9744; A1 &nbsp; &#9744; A2 &nbsp; &#9744; A3 &nbsp; &#9744; our own layout &nbsp;&nbsp; What we saw in the tub: ____________________________</p>
</section>

<section class="sheet">
  <div class="head"><div class="num">4</div><h3><small>Page 4</small>Which wires go where on the boat</h3></div>
  <?= top_view($D, ['wires' => true]) ?>
  <table class="wt">
    <tr><th>Wire</th><th>From</th><th>To (inside the dry box)</th><th>Build step</th></tr>
    <tr><td><span class="sw" style="background:#dc2626"></span><span class="sw" style="background:#111"></span>left motor, 2 wires</td><td>left fan</td><td>WAGO clips &rarr; <b>j8, j9</b></td><td>8</td></tr>
    <tr><td><span class="sw" style="background:#dc2626"></span><span class="sw" style="background:#111"></span>right motor, 2 wires</td><td>right fan</td><td>WAGO clips &rarr; <b>j6, j7</b></td><td>8</td></tr>
    <tr><td><span class="sw" style="background:#6b7280"></span>USB cable</td><td>power bank</td><td>ESP32 USB socket</td><td>7</td></tr>
    <tr><td><span class="sw" style="background:#dc2626"></span><span class="sw" style="background:#111"></span>AA holder</td><td>8&times;AA holder: 6 AA + 2 dummies</td><td>red &rarr; <b>+ rail</b>, black &rarr; <b>&minus; rail</b></td><td>9</td></tr>
    <tr><td><span class="sw" style="background:#ef4444"></span>red light</td><td>LEFT edge (port)</td><td><b>a26</b> (D14)</td><td>11</td></tr>
    <tr><td><span class="sw" style="background:#22c55e"></span>green light</td><td>RIGHT edge (starboard)</td><td><b>a27</b> (D12)</td><td>11</td></tr>
    <tr><td><span class="sw" style="background:#facc15"></span>yellow light</td><td>back (stern)</td><td><b>a28</b> (D13)</td><td>11</td></tr>
  </table>
  <p class="note">&#128161; Motor spins the wrong way (air blows forward)? Swap that motor's two wires at the WAGO clips.
  Don't change the code. Yellow dots = where wires go into the box.</p>
</section>

<section class="sheet">
  <div class="head"><div class="num choice">B</div><h3><small>Your choice</small>How do the wires get into the dry box?</h3></div>
  <div class="opts">
    <?= choice_box('B1', 'Small holes + glue', svg('-4 0 24 15', "<rect x='2' y='2' width='14' height='10' fill='#f8fafc' stroke='#0ea5e9' stroke-width='.4'/><circle cx='2' cy='8' r='.9' fill='#facc15' stroke='#111' stroke-width='.1'/><path d='M-2 12 q2 1 3 -1 l1 -3' fill='none' stroke='#dc2626' stroke-width='.35'/><path d='M2 8 h6' stroke='#dc2626' stroke-width='.35'/>" . t(10, 6, 'hot glue seal', ['f' => 1.1]) . t(3, 13.6, 'drip loop', ['f' => .9, 'c' => '#b45309']), '240px'), 'Sealed for good: the best at keeping water out.', 'Hard to change wires later. Drill the holes smaller than you think.') ?>
    <?= choice_box('B2', 'Notch under the lid', svg('0 0 20 14', "<rect x='2' y='4' width='14' height='8' fill='#f8fafc' stroke='#0ea5e9' stroke-width='.4'/><rect x='1.5' y='2.6' width='15' height='1.4' fill='#0ea5e9'/><rect x='5' y='3.6' width='2' height='.8' fill='#facc15'/><path d='M6 1 v3.5' stroke='#dc2626' stroke-width='.35'/>" . t(11, 8.5, 'foam in the notch', ['f' => 1]), '240px'), 'Easy to open and fix things at the beach.', 'Splash can sneak in. Keep the notch on the side away from the spray.') ?>
  </div>
  <p class="note">&#128167; <strong>Drip loop:</strong> let each wire dip <em>down</em> just before it goes into the box. Water running
  along the wire drips off at the low point instead of following it inside.</p>
  <p class="lchk">&#9989; <strong>Check (before any electronics go in):</strong> paper towel inside, lid shut, hold it under water for
  60 seconds. Dry towel = pass.</p>
</section>

<section class="sheet">
  <div class="head"><div class="num">5</div><h3><small>Prototype 1</small>Is it fast enough? Measure, then decide</h3></div>
  <p>Prototype 1 is <em>supposed</em> to teach you something. Two numbers tell you what to change:</p>
  <ol>
    <li><strong>Boat weight:</strong> everything on it, on a kitchen scale: ______ g</li>
    <li><strong>Thrust per fan:</strong> tape a motor + prop to a block blowing air <em>up</em>, stand it on the scale, zero it,
    switch on. The reading goes up by the thrust: ______ g</li>
  </ol>
  <table class="wt">
    <tr><th>If you see this</th><th>It means</th><th>Try this next</th></tr>
    <tr><td>Crawls, but steers</td><td>Not enough push</td><td>First try 6 AA (9 V) and 4 fans (see the 4-fan page). Still slow? Bigger motors (130 size) with bigger props.</td></tr>
    <tr><td>Sits deep in the water</td><td>Too heavy, or the floats are too small</td><td>Less tape, lighter parts. Deep floats drag a lot of water.</td></tr>
    <tr><td>Bumpy tape on the floats</td><td>Tape edges catch water</td><td>Smooth tape, running front to back.</td></tr>
    <tr><td>Stops in a light breeze</td><td>Wind pushes the tall parts</td><td>Keep everything low. Point it into the wind for the start.</td></tr>
  </table>
  <p class="note">&#9889; <strong>Batteries:</strong> our motors are rated 3 to 12 V, but the motor driver can take at most
  <strong>10.8 V</strong>. Each AA is 1.5 V: <strong>4 AA = 6 V</strong> works, <strong>6 AA = 9 V</strong> spins the fans about
  1.5&times; faster (about 2&times; the push), and <strong>8 AA = 12 V breaks the driver</strong>. Test it: measure thrust at 6 V and at 9 V.</p>
  <p class="fun">&#128123; A heavy boat isn't doomed: weight makes it slow to <em>start</em>. Top speed is decided by push vs drag.</p>
</section>

<section class="sheet">
  <div class="head"><div class="num choice">+</div><h3><small>Upgrade (optional)</small>4 fans instead of 2</h3></div>
  <?= top_view($D, ['wires' => true, 'fans' => 4, 'w' => '230px']) ?>
  <table class="wt">
    <tr><th>Motor</th><th>Plug into</th><th>Driver pins</th></tr>
    <tr><td>left outer fan</td><td><b>j8, j9</b> (step 8)</td><td rowspan="2">OUT1 + OUT2 (left channel)</td></tr>
    <tr><td>left inner fan</td><td><b>i8, i9</b> (step 12)</td></tr>
    <tr><td>right inner fan</td><td><b>i6, i7</b> (step 12)</td><td rowspan="2">OUT3 + OUT4 (right channel)</td></tr>
    <tr><td>right outer fan</td><td><b>j6, j7</b> (step 8)</td></tr>
  </table>
  <p>The driver chip has only <strong>2 channels</strong> (left and right), so the two fans on each side share one.
  Holes in the same column are joined inside the breadboard, so i8 is the same wire as j8. <strong>No code change:</strong>
  both fans on a side get the same signal, and steering still works like a tank. The code can't tell if the extra fans are plugged in, and it doesn't need to.</p>
  <p class="note">&#128207; <strong>Space:</strong> four <?= $D['prop'] ?> cm props need about <?= 4 * $D['prop'] + 2 ?> cm, and the deck is
  <?= $D['deckW'] ?> cm, so the outer fans hang a little past the sides. Bigger props? Widen the deck, or they'll hit each other.</p>
  <p class="lchk">&#9989; <strong>Check:</strong> all 4 fans blow backwards. One blows forward? Swap its two wires at the WAGO clip.
  Test with 6 AA (9 V): 4 fans pull twice the current, and the driver can handle it.</p>
</section>

<section class="sheet">
  <div class="head"><div class="num">6</div><h3><small>For the judges</small>Our design choices</h3></div>
  <table class="wt">
    <tr><th style="width:26%">Choice</th><th style="width:20%">We picked</th><th>Why (and what we tested)</th></tr>
    <tr><td>Fan mount</td><td>hang off the back</td><td>No post to build; the prop can't hit the deck.</td></tr>
    <tr><td>Floats</td><td><?= htmlspecialchars($D['pontoon']) ?> per side</td><td></td></tr>
    <tr><td>A. Heavy things</td><td class="blank"></td><td></td></tr>
    <tr><td>B. Wires into the box</td><td class="blank"></td><td></td></tr>
    <tr><td>Boat weight (g)</td><td class="blank"></td><td></td></tr>
    <tr><td>Thrust per fan (g)</td><td class="blank"></td><td></td></tr>
    <tr><td>Fan spacing (cm)</td><td class="blank"></td><td></td></tr>
    <tr><td>Prop size (mm)</td><td class="blank"></td><td></td></tr>
    <tr><td>Fins under the back?</td><td class="blank"></td><td></td></tr>
    <tr><td>Our own idea</td><td class="blank"></td><td></td></tr>
  </table>
  <p class="fun">&#128123; "We tested it and it didn't work, so we changed it" is a GREAT answer for a judge. It's what real engineers do.</p>
</section>
