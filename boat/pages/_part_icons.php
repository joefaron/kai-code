<?php
// LEGO-style "you need" box: turns a plain need string ("green + blue jumper wires") into a small
// drawing of the actual part, in the actual colours. Pure inline SVG, so it prints and needs no
// icon library. Unknown parts fall back to a plain label.

function pi_colors() {
  return ['black' => '#222', 'red' => '#e11d48', 'green' => '#16a34a', 'blue' => '#2563eb',
          'yellow' => '#facc15', 'orange' => '#f97316', 'purple' => '#9333ea'];
}

function pi_svg($body, $vb = '0 0 64 64') {
  return '<svg viewBox="' . $vb . '" width="64" height="64" aria-hidden="true">' . $body . '</svg>';
}

// One jumper wire: coloured cable, black plastic housing at each end, silver pin (or socket).
function pi_wire($c, $dx = 0, $female = false) {
  $s = '<path d="M' . (12 + $dx) . ' 50 C ' . (12 + $dx) . ' 20, ' . (52 + $dx) . ' 44, ' . (52 + $dx) . ' 14" fill="none" stroke="' . $c . '" stroke-width="5" stroke-linecap="round"/>';
  $s .= '<rect x="' . (8 + $dx) . '" y="48" width="8" height="10" rx="1" fill="#111"/><rect x="' . (11 + $dx) . '" y="58" width="2" height="5" fill="#bbb"/>';
  $s .= '<rect x="' . (48 + $dx) . '" y="6" width="8" height="' . ($female ? 12 : 10) . '" rx="1" fill="#111"/>';
  if (!$female) $s .= '<rect x="' . (51 + $dx) . '" y="1" width="2" height="5" fill="#bbb"/>';
  else $s .= '<rect x="' . (50.5 + $dx) . '" y="6" width="3" height="3" fill="#555"/>';
  return $s;
}

function pi_led($c, $dx = 0) {
  return '<path d="M' . (22 + $dx) . ' 34 v-12 a10 10 0 0 1 20 0 v12 z" fill="' . $c . '" opacity=".9" stroke="#0003"/>'
    . '<rect x="' . (20 + $dx) . '" y="33" width="24" height="4" rx="1" fill="' . $c . '"/>'
    . '<line x1="' . (27 + $dx) . '" y1="37" x2="' . (27 + $dx) . '" y2="62" stroke="#999" stroke-width="2"/>'
    . '<line x1="' . (37 + $dx) . '" y1="37" x2="' . (37 + $dx) . '" y2="54" stroke="#999" stroke-width="2"/>';
}

function pi_icon($need) {
  $t = strtolower($need);
  $cols = pi_colors();
  if (strpos($t, 'jumper') !== false) {
    $found = [];
    foreach ($cols as $name => $hex) if (preg_match('/\b' . $name . '\b/', $t)) $found[] = $hex;
    if (!$found) $found = ['#9ca3af', '#6b7280'];
    $female = strpos($t, 'male-female') !== false;
    $s = ''; $n = count($found);
    foreach ($found as $i => $hex) $s .= pi_wire($hex, ($i - ($n - 1) / 2) * 9, $female);
    return pi_svg($s, '-6 0 76 64');
  }
  if (strpos($t, 'led') !== false) {
    $s = ''; $l = [$cols['red'], $cols['green'], $cols['yellow']];
    foreach ($l as $i => $hex) $s .= pi_led($hex, ($i - 1) * 22);
    return pi_svg($s, '-22 0 108 64');
  }
  if (strpos($t, 'resistor') !== false)
    return pi_svg('<line x1="2" y1="32" x2="62" y2="32" stroke="#999" stroke-width="2"/><rect x="18" y="24" width="28" height="16" rx="7" fill="#e8d5a8"/>'
      . '<rect x="23" y="24" width="3" height="16" fill="#e11d48"/><rect x="29" y="24" width="3" height="16" fill="#e11d48"/><rect x="35" y="24" width="3" height="16" fill="#7c2d12"/><rect x="41" y="24" width="2" height="16" fill="#ca8a04"/>');
  if (strpos($t, 'drv8833') !== false)
    return pi_svg('<rect x="8" y="12" width="48" height="40" rx="3" fill="#7e22ce"/><rect x="24" y="24" width="16" height="16" fill="#111"/>'
      . implode('', array_map(function ($i) { $x = 12 + $i * 8; return "<circle cx='$x' cy='17' r='2' fill='#fbbf24'/><circle cx='$x' cy='47' r='2' fill='#fbbf24'/>"; }, range(0, 5))));
  if (strpos($t, 'esp32') !== false)
    return pi_svg('<rect x="4" y="16" width="56" height="32" rx="3" fill="#1f2937"/><rect x="6" y="20" width="14" height="24" fill="#d4a017" opacity=".8"/><rect x="24" y="22" width="20" height="20" rx="2" fill="#cbd5e1"/><rect x="52" y="27" width="8" height="10" fill="#9ca3af"/>'
      . implode('', array_map(function ($i) { $x = 8 + $i * 7; return "<circle cx='$x' cy='18' r='1.4' fill='#fbbf24'/><circle cx='$x' cy='46' r='1.4' fill='#fbbf24'/>"; }, range(0, 7))));
  if (strpos($t, 'breadboard') !== false) {
    $s = '<rect x="2" y="10" width="60" height="44" rx="3" fill="#f5f5f0" stroke="#bbb"/><line x1="4" y1="14" x2="60" y2="14" stroke="#e11d48"/><line x1="4" y1="50" x2="60" y2="50" stroke="#2563eb"/><rect x="4" y="30" width="56" height="4" fill="#ddd"/>';
    for ($x = 8; $x < 60; $x += 6) foreach ([19, 24, 39, 44] as $y) $s .= "<rect x='$x' y='$y' width='2' height='2' fill='#555'/>";
    return pi_svg($s);
  }
  if (strpos($t, 'power bank') !== false)
    return pi_svg('<rect x="10" y="8" width="44" height="50" rx="8" fill="#e5e7eb" stroke="#6b7280" stroke-width="2"/><rect x="18" y="18" width="28" height="7" rx="2" fill="#22c55e"/><rect x="18" y="28" width="28" height="7" rx="2" fill="#22c55e"/><rect x="18" y="38" width="28" height="7" rx="2" fill="#22c55e"/><path d="M34 47 l-5 7 h4 l-2 5 6-8 h-4 z" fill="#f59e0b"/>');
  if (strpos($t, 'cable') !== false)
    return pi_svg('<path d="M14 18 C 14 50, 50 14, 50 46" fill="none" stroke="#111" stroke-width="4"/><rect x="8" y="4" width="12" height="16" rx="3" fill="#6b7280"/><rect x="45" y="44" width="10" height="14" rx="1" fill="#6b7280"/><text x="14" y="15" font-size="6" text-anchor="middle" fill="#fff">C</text>');
  if (strpos($t, 'tablet') !== false)
    return pi_svg('<rect x="14" y="6" width="36" height="54" rx="5" fill="#111"/><rect x="18" y="12" width="28" height="40" fill="#bfdbfe"/><path d="M24 30 a11 11 0 0 1 16 0 M27 34 a6 6 0 0 1 10 0" fill="none" stroke="#1d4ed8" stroke-width="2.5" stroke-linecap="round"/><circle cx="32" cy="38" r="2" fill="#1d4ed8"/>');
  if (strpos($t, 'motor') !== false)
    return pi_svg('<rect x="10" y="20" width="36" height="26" rx="4" fill="#9ca3af" stroke="#4b5563"/><rect x="46" y="30" width="14" height="4" fill="#6b7280"/><path d="M14 46 q-4 10 -8 14 M20 46 q0 10 4 16" stroke="#e11d48" stroke-width="2" fill="none"/><path d="M20 46 q0 10 4 16" stroke="#111" stroke-width="2" fill="none"/>'
      . '<text x="28" y="37" font-size="9" text-anchor="middle" font-weight="700" fill="#fff">M</text>');
  if (strpos($t, 'wago') !== false)
    return pi_svg('<rect x="12" y="24" width="40" height="28" rx="3" fill="#d1d5db" stroke="#6b7280"/><rect x="14" y="12" width="15" height="14" rx="2" fill="#f97316"/><rect x="35" y="12" width="15" height="14" rx="2" fill="#f97316"/><circle cx="21" cy="44" r="4" fill="#374151"/><circle cx="43" cy="44" r="4" fill="#374151"/>');
  if (strpos($t, 'aa') !== false)
    return pi_svg('<rect x="4" y="12" width="56" height="40" rx="3" fill="#1f2937"/>'
      . implode('', array_map(function ($i) { $x = 8 + $i * 13; return "<rect x='$x' y='16' width='10' height='32' rx='3' fill='#f59e0b'/><rect x='$x' y='16' width='10' height='8' fill='#111' opacity='.7'/>"; }, range(0, 3)))
      . '<path d="M60 20 q4 0 4 -8" stroke="#e11d48" stroke-width="2" fill="none"/><path d="M60 26 q4 0 4 -12" stroke="#111" stroke-width="2" fill="none"/>');
  return '';
}

// Whole parts box for one step. Returns '' when the step needs nothing new.
function part_box($needs) {
  if (!$needs) return '';
  $h = '<div class="parts"><div class="parts-h">You need</div><div class="parts-row">';
  foreach ($needs as $n) {
    $cnt = preg_match('/^(\d+)\s/', $n, $m) ? $m[1] : '';
    $icon = pi_icon($n);
    $h .= '<div class="part">' . ($icon ? '<div class="pic">' . $icon . ($cnt && $cnt !== '1' ? '<b class="cnt">×' . $cnt . '</b>' : '') . '</div>' : '')
        . '<div class="lbl">' . htmlspecialchars($n) . '</div></div>';
  }
  return $h . '</div></div>';
}
