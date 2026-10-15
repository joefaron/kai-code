<?php
// Everything that DRAWS the plane. All of it comes from data/plane.json, so the template,
// the build-step pictures and the wiring picture can't disagree. Units are millimetres.
//   draw_wiring($o)          the two boards at real size + every wire (used by ?p=plane)
//                            default = TOP-DOWN (chip side up); ['flip'=>true] = pins toward you
//   draw_template()          the cut-and-fold sheet, TRUE SIZE on Letter paper
//   draw_airframe($o)        top view for a build step: $o['new'] = layers added in this step
//   draw_front($o)           the plane seen from the nose (keel, wings, motors, props)

function plane_data() {
  static $P;
  if (!$P) $P = json_decode(file_get_contents(__DIR__ . '/../data/plane.json'), true);
  return $P;
}

/* ------------------------------------------------------------------ wiring (boards) */

// The json stores both boards TOP-DOWN (chip side up). $flip mirrors left/right to give
// the view you actually see while plugging wires in: board turned over, pins toward you,
// printed names facing you. Text is never mirrored, only positions.
const PLANE_MIRROR = 38;                       // flip: x -> PLANE_MIRROR - x
function plane_fx($x, $flip) { return $flip ? PLANE_MIRROR - $x : $x; }

// Every place a wire can land, in mm (already flipped if asked).
function plane_anchors($flip = false) {
  $P = plane_data(); $A = [];
  foreach ([['XIAO', $P['xiao']], ['DRV', $P['drv']]] as [$name, $b]) {
    foreach (['left' => 0, 'right' => 1] as $side => $k) {
      foreach ($b[$side] as $i => $n) $A["$name $n"] = [plane_fx($b['x'] + $b['pinX'][$k], $flip), $b['y'] + $b['pin0'] + $i * $b['pitch']];
    }
  }
  [$bx, $by] = $P['battery'];
  $A['BAT -'] = [plane_fx($bx + 7.8, $flip), $by];
  $A['BAT +'] = [plane_fx($bx + 10.2, $flip), $by];
  [$sx, $sy] = $P['split'];
  $A['SPLIT -'] = [plane_fx($sx - 1.2, $flip), $sy];
  $A['SPLIT +'] = [plane_fx($sx + 1.2, $flip), $sy];
  foreach ($P['motors'] as $n => [$mx, $my]) $A[$n] = [plane_fx($mx, $flip), $my];
  return $A;
}

// A board outline + its pins. Gold pin = gets a wire, dark = stays empty. Each pin's name
// sits just inside the board, beside its pin.
function plane_board($b, $name, $A, $used, $flip, $title, $sub) {
  $x = $flip ? PLANE_MIRROR - $b['x'] - $b['w'] : $b['x']; $y = $b['y']; $cx = $x + $b['w'] / 2;
  $s = "<rect x='$x' y='$y' width='{$b['w']}' height='{$b['h']}' rx='1.2' fill='#14171c' stroke='#3b4250' stroke-width='.25'/>";
  if ($name === 'XIAO') {
    if ($flip) {
      $s .= "<rect x='" . ($cx - 2.5) . "' y='" . ($y + 9.5) . "' width='5' height='4' fill='#b8954a' opacity='.35'/>";    // big gold pad on the back
    } else {
      $s .= "<rect x='" . ($x + 6) . "' y='" . ($y + 6.5) . "' width='" . ($b['w'] - 12) . "' height='8.5' rx='.4' fill='#d9dde3' opacity='.35'/>"   // the white module can
          . "<text x='$cx' y='" . ($y + 11.4) . "' font-size='.9' fill='#cfd6e0' text-anchor='middle'>chip</text>";
      foreach ([[6.4, 'B'], [8.9, 'antenna'], [11.4, 'R']] as [$ox, $t]) {                                   // buttons + antenna socket, bottom edge
        $s .= "<rect x='" . ($x + $ox - .8) . "' y='" . ($y + 18.4) . "' width='1.6' height='1.6' rx='.3' fill='#8b93a1'/>";
      }
      $s .= "<text x='$cx' y='" . ($y + 17.6) . "' font-size='.8' fill='#cfd6e0' text-anchor='middle'>B · antenna · R</text>";
    }
    $s .= "<rect x='" . ($cx - $b['usb']['w'] / 2) . "' y='" . ($y - $b['usb']['out']) . "' width='{$b['usb']['w']}' height='3' rx='.6' fill='#a9b1bd'/>"
        . "<text x='$cx' y='" . ($y - 2.2) . "' font-size='1.5' fill='#cfd6e0' text-anchor='middle'>USB-C</text>";
  } else {
    $s .= $flip ? "<text x='$cx' y='" . ($y + 2.2) . "' font-size='1.1' fill='#7d8796' text-anchor='middle'>J1</text>"
                : "<rect x='" . ($cx - 3.5) . "' y='" . ($y + 4.7) . "' width='7' height='7' rx='.4' fill='#2b2f36' stroke='#4b5260' stroke-width='.2'/>"
                . "<text x='$cx' y='" . ($y + 8.6) . "' font-size='1' fill='#8b93a1' text-anchor='middle'>chip</text>";
  }
  $s .= "<text x='$cx' y='" . ($y + $b['h'] + ($name === 'XIAO' ? 3.6 : 2.3)) . "' font-size='1.7' font-weight='700' fill='#e7ecf4' text-anchor='middle'>$title</text>"
      . "<text x='$cx' y='" . ($y + $b['h'] + ($name === 'XIAO' ? 5.4 : 4.1)) . "' font-size='1.1' fill='#7d8796' text-anchor='middle'>$sub</text>";
  foreach (['left', 'right'] as $side) foreach ($b[$side] as $n) {
    [$px, $py] = $A["$name $n"]; $on = isset($used["$name $n"]);
    $dir = $px < $cx ? 1 : -1;                                       // label goes inboard
    $s .= "<rect x='" . ($px - .85) . "' y='" . ($py - .85) . "' width='1.7' height='1.7' rx='.3' fill='" . ($on ? '#e8c66a' : '#6b6553') . "'/>"
        . "<circle cx='$px' cy='$py' r='.45' fill='#1a1a1a'/>"
        . "<text x='" . ($px + $dir * 1.4) . "' y='" . ($py + .55) . "' font-size='1.45' font-weight='700' fill='" . ($on ? '#fff' : '#8b93a1') . "' text-anchor='" . ($dir > 0 ? 'start' : 'end') . "'>$n</text>";
  }
  return $s;
}

// $o['flip'] = true: the pins-toward-you view. Default: top-down, chip side up.
function draw_wiring($o = []) {
  $P = plane_data(); $flip = !empty($o['flip']); $A = plane_anchors($flip);
  $fx = function ($x) use ($flip) { return plane_fx($x, $flip); };
  [$bx, $by, $bw, $bh] = $P['battery'];
  $used = [];
  foreach ($P['wires'] as $w) { $used[$w['from']] = 1; $used[$w['to']] = 1; }
  $style = $o['style'] ?? 'width:100%;max-width:900px';
  $drvC = $fx($P['drv']['x'] + $P['drv']['w'] / 2);
  $s = "<svg viewBox='-27 -12 92 64' style='$style;background:#0a0d13;border-radius:10px;font-family:system-ui,sans-serif'>";
  $s .= "<text x='-25.5' y='-8.5' font-size='2' font-weight='700' fill='#fde047'>" . ($flip ? 'FLIPPED OVER: pins toward you' : 'TOP-DOWN: chip side up') . "</text>"
      . "<text x='-25.5' y='-6.4' font-size='1.25' fill='#9aa4b2'>" . ($flip ? 'What you see while you push the wires on. The pin names are printed on this side.' : 'The pin names are printed on the BOTTOM of the real boards, so they are written in here.') . "</text>";
  // battery, splitter and motors (NOT to scale)
  $s .= "<rect x='" . ($flip ? $fx($bx + $bw) : $bx) . "' y='$by' width='$bw' height='$bh' rx='1' fill='#3a3f4a' stroke='#9aa4b2' stroke-width='.25'/>"
      . "<text x='" . $fx($bx + $bw / 2) . "' y='" . ($by + 4) . "' font-size='1.5' fill='#e7ecf4' text-anchor='middle'>battery + plug lead</text>";
  [$sx, $sy] = $P['split'];
  $s .= "<rect x='" . ($fx($sx) - 2.6) . "' y='" . ($sy - .9) . "' width='5.2' height='2.4' rx='.4' fill='#1f2937' stroke='#e7ecf4' stroke-width='.2'/>"
      . "<text x='" . ($fx($sx) + ($flip ? -3.4 : 3.4)) . "' y='" . ($sy + 1.4) . "' font-size='1.2' fill='#cfd6e0' text-anchor='" . ($flip ? 'end' : 'start') . "'>splitter (1 plug → 2)</text>";
  foreach ($P['motors'] as $n => [, $my]) {
    [$ax] = $A[$n]; $cx = $ax + ($ax < $drvC ? -3 : 3);
    $s .= "<circle cx='$cx' cy='$my' r='3' fill='#3a3f4a' stroke='#d98c3a' stroke-width='.3'/>"
        . "<text x='$cx' y='" . ($my + .5) . "' font-size='1.2' fill='#e7ecf4' text-anchor='middle'>" . explode(' ', $n)[0] . "</text>";
  }
  foreach ($P['wires'] as $w) {
    [$x1, $y1] = $A[$w['from']]; [$x2, $y2] = $A[$w['to']];
    if (!empty($w['via'])) {
      $d = "M$x1 $y1"; foreach ($w['via'] as [$vx, $vy]) $d .= " L" . $fx($vx) . " $vy"; $d .= " L$x2 $y2";
    } else {
      $k = $x2 > $x1 ? 9 : -9;
      $d = "M$x1 $y1 C" . ($x1 + $k) . " $y1 " . ($x2 - $k) . " $y2 $x2 $y2";
    }
    $s .= "<path d='$d' fill='none' stroke='{$w['color']}' stroke-width='.6' stroke-linecap='round' stroke-linejoin='round' opacity='.9'/>";
  }
  // the splitter's two 2-pin plugs, outlined, so you can see they each cover a PAIR of pins
  foreach ([['XIAO 5V', 'XIAO GND'], ['DRV VCC', 'DRV GND']] as [$p, $m]) {
    [$px, $py] = $A[$p]; [, $my] = $A[$m];
    $s .= "<rect x='" . ($px - 1.3) . "' y='" . (min($py, $my) - 1.3) . "' width='2.6' height='" . (abs($py - $my) + 2.6) . "' rx='.4' fill='none' stroke='#ff3b3b' stroke-width='.3' stroke-dasharray='.7 .45'/>";
  }
  $s .= plane_board($P['xiao'], 'XIAO', $A, $used, $flip, 'XIAO', $flip ? 'turned over: D0-D6 on the RIGHT' : 'D0-D6 on the LEFT');
  $s .= plane_board($P['drv'], 'DRV', $A, $used, $flip, 'DRIVER', $flip ? 'turned over: IN on the LEFT' : 'IN pins on the RIGHT');
  $s .= "<text x='-25.5' y='48' font-size='1.25' fill='#7d8796'>Boards at real size (17.8 × 21 mm and ~18.5 × 16.5 mm). Battery, splitter and motors are not. Gold pins get a wire.</text>"
      . "<text x='-25.5' y='50.2' font-size='1.25' fill='#7d8796'>Dashed red box = one 2-pin splitter plug. Red (+) goes on 5V at the XIAO but on VCC (the LOWER pin) at the driver: the two plugs face opposite ways.</text>";
  return $s . "</svg>";
}

/* ------------------------------------------------------------------ the paper plane */

// Build order. A step picture shows earlier layers faded, this step's layers glowing,
// later layers hidden - like a LEGO booklet.
const PLANE_LAYERS = ['sheet', 'outline', 'cuts', 'keel', 'spine', 'coins', 'stick', 'motors',
                      'boards', 'wires', 'battery', 'antenna', 'cg', 'elevons'];

function plane_state($id, $o) {
  if (($o['mode'] ?? '') === 'template') return $id === 'coins' ? 'hide' : 'tpl';
  if (($o['mode'] ?? '') === 'all') return in_array($id, ['sheet', 'coins']) ? 'hide' : 'done';
  $new = $o['new'] ?? [];
  if (in_array($id, $new)) return 'new';
  if ($id === 'coins') return 'hide';                              // the coins come off again after the test
  $last = -1;
  foreach ($new as $n) if ($n !== 'cg' || count($new) === 1) $last = max($last, array_search($n, PLANE_LAYERS));   // cg is drawn early (coin test) without pulling in later layers
  $i = array_search($id, PLANE_LAYERS);
  if ($id === 'sheet') return $last <= 1 ? 'done' : 'hide';      // the sheet is gone once it's cut out
  return $i < $last ? 'done' : 'hide';
}

// Line / fill colours for each state. tpl = black ink for printing.
function plane_ink($st, $kind = 'line') {
  $ink = ['tpl' => '#111', 'done' => '#9ca3af', 'new' => '#ea580c'];
  if ($kind === 'fill') return ['tpl' => '#fff', 'done' => '#f3f4f6', 'new' => '#ffedd5'][$st] ?? 'none';
  return $ink[$st] ?? 'none';
}

// One SVG element; new ones get a fat yellow glow drawn underneath.
function plane_el($st, $tag, $attrs, $glowW = 2.4) {
  if ($st === 'hide') return '';
  $a = ''; foreach ($attrs as $k => $v) $a .= " $k=\"$v\"";
  $s = '';
  if ($st === 'new' && empty($attrs['_noglow'])) {
    $g = $attrs; $g['stroke'] = '#fde047'; $g['stroke-width'] = $glowW; $g['fill'] = $attrs['fill'] ?? 'none';
    if (isset($g['stroke-dasharray'])) unset($g['stroke-dasharray']);
    $ga = ''; foreach ($g as $k => $v) if ($k[0] !== '_') $ga .= " $k=\"$v\"";
    $s .= "<$tag$ga opacity=\".85\"/>";
  }
  return $s . "<$tag" . preg_replace('/ _noglow="[^"]*"/', '', $a) . "/>";
}

function plane_text($st, $x, $y, $txt, $size = 3.2, $extra = '') {
  if ($st === 'hide') return '';
  $fill = $st === 'new' ? '#c2410c' : ($st === 'done' ? '#9ca3af' : '#111');
  $w = $st === 'new' ? 700 : 600;
  return "<text x=\"$x\" y=\"$y\" font-size=\"$size\" font-weight=\"$w\" fill=\"$fill\" $extra>$txt</text>";
}

// The plane outline as a polygon (nose at 0,0).
function plane_outline() {
  $F = plane_data()['airframe'];
  [$h, $tl, $r] = [$F['half'], $F['tipLE'], $F['root']];
  return "0,0 $h,$tl $h,$r -$h,$r -$h,$tl";
}
function plane_le($x) { $F = plane_data()['airframe']; return abs($x) * $F['tipLE'] / $F['half']; }   // leading edge y at x

// All the plane's layers, top view. Returns the inner SVG (no <svg> wrapper).
function plane_layers($o) {
  $F = plane_data()['airframe'];
  $tpl = ($o['mode'] ?? '') === 'template';
  $S = function ($id) use ($o) { return plane_state($id, $o); };
  [$h, $r, $K] = [$F['half'], $F['root'], $F['keel']];
  $lw = $tpl ? .45 : .9;          // line width
  $s = '';

  // the sheet of card stock (only before it's cut out)
  if (!$tpl && $S('sheet') !== 'hide') {
    [$pw, $ph] = $F['paper'];
    $s .= "<rect x=\"" . (-$pw / 2) . "\" y=\"" . (-$F['noseAt']) . "\" width=\"$pw\" height=\"$ph\" fill=\"#fff\" stroke=\"#9ca3af\" stroke-width=\".8\"/>";
  }
  // 1. outline = CUT
  $st = $S('outline');
  $s .= plane_el($st, 'polygon', ['points' => plane_outline(), 'fill' => $tpl ? 'none' : '#fff',
        'stroke' => plane_ink($st), 'stroke-width' => $tpl ? .6 : 1.2, 'stroke-linejoin' => 'round'], 3.5);
  if ($tpl) {     // scissors marks
    $s .= "<text x=\"-58\" y=\"108\" font-size=\"6\" transform=\"rotate(61 -58 108)\">✂</text>";
    $s .= "<text x=\"" . ($h + 2) . "\" y=\"225\" font-size=\"6\" transform=\"rotate(90 " . ($h + 2) . " 225)\">✂</text>";
  }

  // 2. elevator slits = 4 short CUTS
  $st = $S('cuts'); $E = $F['elevon'];
  foreach ([-1, 1] as $sd) foreach ([$E['from'], $E['to']] as $ex) {
    $s .= plane_el($st, 'line', ['x1' => $sd * $ex, 'y1' => $r - $E['depth'], 'x2' => $sd * $ex, 'y2' => $r,
          'stroke' => plane_ink($st), 'stroke-width' => $tpl ? 1 : 1.2]);
  }
  if ($tpl) $s .= plane_text('tpl', -$E['to'] + 1.5, $r - $E['depth'] - 1.2, '✂ cut the 4 short slits', 2.6);

  // 3. the keel: ① fold in half along the middle (printed side OUT), ② fold each wing back out
  //    along its keel line. The 15 mm strip between them hangs underneath as the keel.
  $st = $S('keel');
  if ($st === 'new') {
    foreach ([-1, 1] as $sd) $s .= "<polygon points=\"0,0 " . ($sd * $K) . "," . plane_le($K) . " " . ($sd * $K) . ",$r 0,$r\" fill=\"#fed7aa\"/>";
  }
  $s .= plane_el($st, 'line', ['x1' => 0, 'y1' => 0, 'x2' => 0, 'y2' => $r, 'stroke' => plane_ink($st),
        'stroke-width' => $lw, 'stroke-dasharray' => '3 2']);
  foreach ([-1, 1] as $sd) $s .= plane_el($st, 'line', ['x1' => $sd * $K, 'y1' => plane_le($K), 'x2' => $sd * $K, 'y2' => $r,
        'stroke' => plane_ink($st), 'stroke-width' => $lw, 'stroke-dasharray' => '3 2']);
  $s .= plane_text($st, 2, $r - 8, '①', $tpl ? 3.4 : 5);
  $s .= plane_text($st, $K + 1.5, $r - 30, '②', $tpl ? 3.4 : 5);
  $s .= plane_text($st, -$K - 6, $r - 30, '②', $tpl ? 3.4 : 5);
  if ($st === 'new') $s .= plane_text('new', 0, 40, 'KEEL', 4.2, 'text-anchor="middle"');
  if ($tpl) $s .= plane_text('tpl', $K + 2, $r - 22, 'keel', 2.2) . plane_text('tpl', -$K - 2, $r - 22, 'keel', 2.2, 'text-anchor="end"');
  if ($st !== 'hide') $s .= plane_text($st === 'new' ? 'new' : ($tpl ? 'tpl' : 'done'), $K / 2 + 1.2, 150, 'KEEL: folds UNDER, no parts here',
        $tpl ? 2.2 : 3.4, "transform=\"rotate(-90 " . ($K / 2 + 1.2) . " 150)\" text-anchor=\"middle\"");

  // 4. skewer spine, INSIDE the bottom of the keel
  $st = $S('spine'); [$s0, $s1] = $F['spine'];
  $s .= plane_el($st, 'rect', ['x' => -1.5, 'y' => $s0, 'width' => 3, 'height' => $s1 - $s0, 'rx' => 1.5,
        'fill' => $st === 'tpl' ? 'none' : ($st === 'new' ? '#d6a35c' : plane_ink($st, 'fill')), 'stroke' => plane_ink($st), 'stroke-width' => $lw * .7,
        'stroke-dasharray' => $tpl ? '.6 1.2' : 'none']);
  $s .= plane_text($st, -3, 200, 'SPINE: skewer inside the keel', $tpl ? 2.4 : 4.2, "transform=\"rotate(-90 -3 200)\"");

  // 5. coin test: the electronics' weight, taped on the balance point, for a test glide
  $st = $S('coins');
  if ($st === 'new') {             // sits across the top seam, so on the flat sheet it shows as two halves either side of the keel
    $cy = $F['cg'] - 4; $cr = 10.6;
    foreach ([-1, 1] as $sd) $s .= plane_el('new', 'path', ['d' => "M" . ($sd * $K) . " " . ($cy - $cr) . " A$cr $cr 0 0 " . ($sd > 0 ? 1 : 0) . " " . ($sd * $K) . " " . ($cy + $cr) . " Z",
          'fill' => '#d1d5db', 'stroke' => '#ea580c', 'stroke-width' => 1]);
    $s .= plane_text('new', 0, $cy - $cr - 3, $F['coins'] . ' nickels on the top seam', 3.6, 'text-anchor="middle"');
    $s .= plane_text('new', 0, $cy + $cr + 6, '≈ ' . ($F['coins'] * 5) . ' g, taped on top', 3.4, 'text-anchor="middle"');
  }

  // 6. motor stick (bamboo skewer) across the nose
  $st = $S('stick'); $Kk = $F['stick'];
  $s .= plane_el($st, 'rect', ['x' => -$Kk['half'], 'y' => $Kk['y'] - $Kk['w'] / 2, 'width' => 2 * $Kk['half'], 'height' => $Kk['w'],
        'rx' => 1, 'fill' => $tpl ? 'none' : ($st === 'new' ? '#d6a35c' : '#e5e7eb'), 'stroke' => plane_ink($st), 'stroke-width' => $lw * .8]);
  $s .= plane_text($st, 0, $Kk['y'] + ($tpl ? 6.5 : 8), 'MOTOR STICK  (skewer, ' . (2 * $Kk['half'] / 10) . ' cm)', $tpl ? 2.6 : 4.2, 'text-anchor="middle"');
  if ($tpl) $s .= plane_text('tpl', 0, $Kk['y'] - 3, 'centre ↓', 2.2, 'text-anchor="middle"');

  // 7. motors at the stick ends, props spinning IN FRONT of the wing
  $st = $S('motors'); $M = $F['motor'];
  foreach ([-1, 1] as $sd) {
    $mx = $sd * $M['x']; $py = $Kk['y'] - $M['len'] / 2 - 2.5;
    $s .= plane_el($st, 'rect', ['x' => $mx - $M['dia'] / 2, 'y' => $Kk['y'] - $M['len'] / 2, 'width' => $M['dia'], 'height' => $M['len'],
          'rx' => 2, 'fill' => $tpl ? 'none' : ($st === 'new' ? '#78716c' : '#e5e7eb'), 'stroke' => plane_ink($st), 'stroke-width' => $lw]);
    $pin = $M['x'] - $M['prop'] / 2; $pout = min($M['x'] + $M['prop'] / 2, 105);
    $s .= plane_el($st, 'line', ['x1' => $sd * $pin, 'y1' => $py, 'x2' => $sd * $pout, 'y2' => $py, 'stroke' => plane_ink($st),
          'stroke-width' => $lw * 1.6, 'stroke-linecap' => 'round', '_noglow' => 1]);
    $s .= plane_text($st, $mx, $py - 3, ($sd < 0 ? 'LEFT' : 'RIGHT') . ' motor', $tpl ? 2.6 : 4.2, 'text-anchor="middle"');
  }

  // 8. the two boards, at real size, turned over (pins UP): XIAO on the LEFT, driver on the RIGHT,
  //    so the XIAO's D pins face the driver's IN pins across the middle. USB-C toward the nose.
  //    airframe.xiao/drv x are measured from the TOP SEAM of the folded plane; on the flat sheet
  //    the keel strip sits between, so they move out by K.
  $st = $S('boards'); $P = plane_data(); $X = $P['xiao']; $D = $P['drv'];
  [$xx, $xy] = $F['xiao']; [$dx, $dy] = $F['drv']; $xx -= $K; $dx += $K;
  $s .= plane_el($st, 'rect', ['x' => $xx, 'y' => $xy, 'width' => $X['w'], 'height' => $X['h'], 'rx' => 1.5,
        'fill' => $tpl ? 'none' : ($st === 'new' ? '#1f2937' : '#e5e7eb'), 'stroke' => plane_ink($st), 'stroke-width' => $lw]);
  $s .= plane_el($st, 'rect', ['x' => $xx + ($X['w'] - $X['usb']['w']) / 2, 'y' => $xy - 1.5, 'width' => $X['usb']['w'],
        'height' => 3, 'rx' => .6, 'fill' => $tpl ? 'none' : '#9ca3af', 'stroke' => plane_ink($st), 'stroke-width' => $lw * .7, '_noglow' => 1]);
  $s .= plane_el($st, 'rect', ['x' => $dx, 'y' => $dy, 'width' => $D['w'], 'height' => $D['h'], 'rx' => .6,
        'fill' => $tpl ? 'none' : ($st === 'new' ? '#1f2937' : '#e5e7eb'), 'stroke' => plane_ink($st), 'stroke-width' => $lw]);
  $lab = $tpl ? '#111' : ($st === 'new' ? '#fff' : '#6b7280');
  if ($st !== 'hide') {
    $fs = $tpl ? 2.4 : 3;
    $s .= "<text x=\"" . ($xx + $X['w'] / 2) . "\" y=\"" . ($xy + 6) . "\" font-size=\"" . ($fs * .75) . "\" fill=\"$lab\" text-anchor=\"middle\">USB ↑</text>"
        . "<text x=\"" . ($xx + $X['w'] / 2) . "\" y=\"" . ($xy + 11) . "\" font-size=\"$fs\" font-weight=\"700\" fill=\"$lab\" text-anchor=\"middle\">XIAO</text>"
        . "<text x=\"" . ($xx + $X['w'] / 2) . "\" y=\"" . ($xy + 14.5) . "\" font-size=\"" . ($fs * .75) . "\" fill=\"$lab\" text-anchor=\"middle\">pins up</text>"
        . "<text x=\"" . ($dx + $D['w'] / 2) . "\" y=\"" . ($dy + 7) . "\" font-size=\"$fs\" font-weight=\"700\" fill=\"$lab\" text-anchor=\"middle\">DRIVER</text>"
        . "<text x=\"" . ($dx + $D['w'] / 2) . "\" y=\"" . ($dy + 10.5) . "\" font-size=\"" . ($fs * .75) . "\" fill=\"$lab\" text-anchor=\"middle\">pins up</text>"
        . "<text x=\"" . ($dx + $D['w'] - 1) . "\" y=\"" . ($dy + 15) . "\" font-size=\"" . ($fs * .7) . "\" fill=\"$lab\" text-anchor=\"end\">OUT →</text>";
  }

  // 9. wires (simplified - the full pin-by-pin picture is draw_wiring). Not on the template.
  $st = $tpl ? 'hide' : $S('wires');
  if ($st !== 'hide') {
    $sig = ['#16a34a', '#7c3aed', '#0891b2', '#f59e0b'];
    foreach ($sig as $i => $c) {
      $y = $dy + 3 + $i * 3;
      $s .= plane_el($st === 'new' ? 'new' : $st, 'line', ['x1' => $xx + $X['w'], 'y1' => $y - 1, 'x2' => $dx, 'y2' => $y,
            'stroke' => $st === 'done' ? '#9ca3af' : $c, 'stroke-width' => .9, '_noglow' => 1]);
    }
    $mc = $st === 'done' ? '#9ca3af' : '#b45309';
    $ox = $dx + $D['w'];
    $s .= "<path d=\"M$ox " . ($dy + 6) . " C" . ($ox + 15) . " " . ($dy + 4) . " 50 " . ($Kk['y'] + 3) . " " . ($M['x'] - 4) . " " . ($Kk['y'] + 4) . "\" fill=\"none\" stroke=\"$mc\" stroke-width=\".9\"/>"
        . "<path d=\"M$ox " . ($dy + 10) . " C" . ($ox + 8) . " " . ($dy + 10) . " 20 " . ($Kk['y'] + 3) . " 0 " . ($Kk['y'] + 2.5) . " L-" . ($M['x'] - 4) . " " . ($Kk['y'] + 2.5) . "\" fill=\"none\" stroke=\"$mc\" stroke-width=\".9\"/>"
        . "<path d=\"M" . ($xx + 3) . " " . ($xy + $X['h']) . " C" . ($xx + 3) . " " . ($xy + $X['h'] + 10) . " " . (-$K - 2) . " " . ($xy + $X['h'] + 8) . " " . (-$K - 1.5) . " " . ($xy + $X['h'] + 14) . "\" fill=\"none\" stroke=\"" . ($st === 'done' ? '#9ca3af' : '#dc2626') . "\" stroke-width=\".9\"/>";
  }

  // 10. battery: sits on the middle seam between the boards, slides fore/aft to balance the plane
  //     It straddles the seam, so on the flat sheet it's two half-boxes either side of the keel.
  $st = $S('battery'); [$bx, $by, $bw, $bh] = $F['battery'];
  foreach ([-1, 1] as $sd) {
    $hx = $sd < 0 ? -$K - $bw / 2 : $K;
    $s .= plane_el($st, 'rect', ['x' => $hx, 'y' => $by, 'width' => $bw / 2, 'height' => $bh, 'rx' => 1,
          'fill' => $tpl ? 'none' : ($st === 'new' ? '#fca5a5' : '#e5e7eb'), 'stroke' => plane_ink($st), 'stroke-width' => $lw, 'stroke-dasharray' => $tpl ? '2 1' : 'none']);
    $s .= plane_text($st, $hx + $bw / 4, $by + $bh / 2, 'BAT ↕', $tpl ? 1.7 : 2.4, "text-anchor=\"middle\" transform=\"rotate(-90 " . ($hx + $bw / 4) . " " . ($by + $bh / 2) . ")\"");
  }

  // 11. antenna sticker on the left wing (the XIAO is on the left now)
  $st = $S('antenna'); [$ax, $ay, $aw, $ah] = $F['antenna'];
  $s .= plane_el($st, 'rect', ['x' => $ax, 'y' => $ay, 'width' => $aw, 'height' => $ah, 'rx' => 1,
        'fill' => $tpl ? 'none' : ($st === 'new' ? '#bfdbfe' : '#f3f4f6'), 'stroke' => plane_ink($st), 'stroke-width' => $lw]);
  $s .= plane_el($st, 'path', ['d' => "M" . ($xx + $X['w'] / 2) . " " . ($xy + $X['h']) . " C" . ($xx + 4) . " " . ($xy + 40) . " " . ($ax + $aw + 6) . " " . ($ay - 20) . " " . ($ax + $aw) . " " . ($ay + $ah / 2),
        'fill' => 'none', 'stroke' => plane_ink($st), 'stroke-width' => $lw * .7, 'stroke-dasharray' => '1.5 1', '_noglow' => 1]);
  $s .= plane_text($st, $ax + $aw / 2, $ay + $ah / 2 + 1, 'ANTENNA', $tpl ? 2.4 : 3, 'text-anchor="middle"');

  // 12. balance point: fingertips go here
  $st = $S('cg'); $cy = $F['cg'];
  $bxd = 48;                       // fingertip spots, out past the boards but inside the leading edge
  $s .= plane_el($st, 'line', ['x1' => -$bxd - 4, 'y1' => $cy, 'x2' => $bxd + 4, 'y2' => $cy, 'stroke' => plane_ink($st),
        'stroke-width' => $lw * .8, 'stroke-dasharray' => '5 1.5 1 1.5', '_noglow' => 1]);
  foreach ([-1, 1] as $sd) $s .= plane_el($st, 'circle', ['cx' => $sd * $bxd, 'cy' => $cy, 'r' => $tpl ? 2.2 : 3,
        'fill' => $tpl ? 'none' : ($st === 'new' ? '#ea580c' : '#d1d5db'), 'stroke' => plane_ink($st), 'stroke-width' => $lw]);
  $s .= plane_text($st, -$bxd, $cy + ($tpl ? 6 : 8), 'BALANCE', $tpl ? 2.4 : 3.8, 'text-anchor="middle"');
  $s .= plane_text($st, $bxd, $cy + ($tpl ? 6 : 8), 'BALANCE', $tpl ? 2.4 : 3.8, 'text-anchor="middle"');
  if ($tpl) $s .= plane_text('tpl', $bxd, $cy + 9.5, ($cy / 10) . ' cm from the nose', 1.9, 'text-anchor="middle"');

  // 13. elevators: bend the back edge UP a little
  $st = $S('elevons');
  if ($st !== 'hide') foreach ([-1, 1] as $sd) {
    $x0 = $sd * $E['from']; $x1 = $sd * $E['to'];
    $s .= plane_el($st, 'polygon', ['points' => "$x0," . ($r - $E['depth']) . " $x1," . ($r - $E['depth']) . " $x1,$r $x0,$r",
          'fill' => $tpl ? 'none' : ($st === 'new' ? '#fed7aa' : '#f3f4f6'), 'stroke' => plane_ink($st), 'stroke-width' => $lw * .6,
          'stroke-dasharray' => '3 2']);
    $s .= plane_text($st, ($x0 + $x1) / 2, $r - 5, '③ bend UP 2 mm', $tpl ? 2.4 : 3.6, 'text-anchor="middle"');
  }
  return $s;
}

// Top view for a build step.  $o = ['new' => [...layers], 'w' => css width]
function draw_airframe($o = []) {
  $F = plane_data()['airframe'];
  $pad = 8; $W = 2 * $F['half'] + 2 * $pad + 8;
  $vb = (-$W / 2) . " " . (-$F['noseAt'] - 2) . " $W " . ($F['paper'][1] + 4);
  return "<svg viewBox=\"$vb\" class=\"bdraw plan\" style=\"font-family:Fredoka,system-ui,sans-serif\">"
    . "<text x=\"0\" y=\"-4\" font-size=\"5\" font-weight=\"700\" fill=\"#6b7280\" text-anchor=\"middle\">▲ NOSE</text>"
    . plane_layers($o)
    . "<text x=\"" . (-$F['half'] / 2) . "\" y=\"" . ($F['root'] + 9) . "\" font-size=\"4\" fill=\"#6b7280\" text-anchor=\"middle\">left wing</text>"
    . "<text x=\"" . ($F['half'] / 2) . "\" y=\"" . ($F['root'] + 9) . "\" font-size=\"4\" fill=\"#6b7280\" text-anchor=\"middle\">right wing</text>"
    . "</svg>";
}

// Seen from the nose, looking back: the keel hanging under the middle, wings tilted up a
// little (a shallow Y), the motor stick and props on top.
//   $o['new'] uses the same layer names: keel, spine, stick, motors, boards
function draw_front($o = []) {
  $F = plane_data()['airframe']; $M = $F['motor'];
  $S = function ($id) use ($o) { return plane_state($id, $o); };
  $K = $F['keel']; $wx = $F['half'] - $K; $up = $wx * tan(deg2rad(5));
  $s = "<svg viewBox=\"-112 -52 224 100\" class=\"bdraw front\" style=\"font-family:Fredoka,system-ui,sans-serif\">";
  $s .= "<text x=\"0\" y=\"45\" font-size=\"4.5\" fill=\"#6b7280\" text-anchor=\"middle\">seen from the nose ▲</text>";
  // props first so they sit behind
  $ms = $S('motors');
  if ($ms !== 'hide') foreach ([-1, 1] as $sd) {
    $s .= "<circle cx=\"" . ($sd * $M['x']) . "\" cy=\"-5\" r=\"" . ($M['prop'] / 2) . "\" fill=\"" . ($ms === 'new' ? '#ffedd5' : '#f9fafb') . "\" stroke=\"" . plane_ink($ms) . "\" stroke-width=\".6\" stroke-dasharray=\"2 1.5\"/>";
  }
  $c = $S('keel'); $folded = $c !== 'hide';
  if ($folded) {
    // wings: a shallow Y. Keel: two layers hanging straight down from the middle.
    $wing = "M" . (-$wx) . " " . (-$up) . " L0 0 L$wx " . (-$up);
    $s .= plane_el($c === 'new' ? 'new' : 'done', 'path', ['d' => $wing, 'fill' => 'none', 'stroke' => $c === 'new' ? '#ea580c' : '#4b5563', 'stroke-width' => 1.6, 'stroke-linejoin' => 'round'], 4);
    $s .= plane_el($c === 'new' ? 'new' : 'done', 'path', ['d' => "M-.8 0 L-.8 $K L.8 $K L.8 0", 'fill' => 'none', 'stroke' => $c === 'new' ? '#ea580c' : '#4b5563', 'stroke-width' => 1.2, 'stroke-linejoin' => 'round'], 4);
    if ($c === 'new') $s .= "<text x=\"6\" y=\"" . ($K + 1) . "\" font-size=\"4\" font-weight=\"700\" fill=\"#c2410c\">← the keel, " . ($K / 10) . " cm deep</text>"
                         . "<text x=\"0\" y=\"-14\" font-size=\"4\" font-weight=\"700\" fill=\"#c2410c\" text-anchor=\"middle\">wings tilt up a little: a shallow Y</text>";
  } else {
    $s .= "<path d=\"M" . (-$F['half']) . " 0 L" . $F['half'] . " 0\" stroke=\"#4b5563\" stroke-width=\"1.6\"/>";
  }
  $ss = $S('spine');
  if ($ss !== 'hide' && $folded) $s .= plane_el($ss, 'circle', ['cx' => 0, 'cy' => $K - 1.6, 'r' => 1.5, 'fill' => $ss === 'new' ? '#d6a35c' : '#d1d5db', 'stroke' => plane_ink($ss), 'stroke-width' => .5], 3);
  if ($ss === 'new') $s .= "<text x=\"6\" y=\"" . ($K + 7) . "\" font-size=\"4\" font-weight=\"700\" fill=\"#c2410c\">← skewer spine inside the keel</text>";
  // stick + motors
  $ks = $S('stick');
  if ($ks !== 'hide') $s .= plane_el($ks, 'line', ['x1' => -$F['stick']['half'], 'y1' => -2.5, 'x2' => $F['stick']['half'], 'y2' => -2.5, 'stroke' => $ks === 'new' ? '#b45309' : '#9ca3af', 'stroke-width' => 2.2, 'stroke-linecap' => 'round']);
  if ($ms !== 'hide') foreach ([-1, 1] as $sd) {
    $s .= plane_el($ms, 'circle', ['cx' => $sd * $M['x'], 'cy' => -5, 'r' => $M['dia'] / 2, 'fill' => $ms === 'new' ? '#57534e' : '#d1d5db', 'stroke' => plane_ink($ms), 'stroke-width' => .6]);
  }
  if ($ms === 'new') $s .= "<text x=\"0\" y=\"-44\" font-size=\"4\" font-weight=\"700\" fill=\"#c2410c\" text-anchor=\"middle\">props spin in FRONT of the wing, so they can't hit it</text>";
  $bs = $S('boards');
  if ($bs !== 'hide') $s .= plane_el($bs, 'rect', ['x' => -27, 'y' => -6.5, 'width' => 54, 'height' => 3, 'rx' => .8, 'fill' => $bs === 'new' ? '#1f2937' : '#d1d5db', 'stroke' => 'none']);
  return $s . "</svg>";
}

// The printable cut-and-fold sheet. TRUE SIZE: 1 SVG unit = 1 mm on Letter paper.
function draw_template() {
  $F = plane_data()['airframe']; [$pw, $ph] = $F['paper']; $n = $F['noseAt'];
  $L = -$pw / 2 + 8;                 // left text margin (printers can't ink the outer ~6 mm)
  $s = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{$pw}mm\" height=\"{$ph}mm\" viewBox=\"" . (-$pw / 2) . " " . (-$n) . " $pw $ph\" style=\"font-family:Fredoka,Arial,sans-serif;display:block\">";
  // title + legend, top-left corner (cut away later)
  $s .= "<text x=\"$L\" y=\"-3\" font-size=\"5.2\" font-weight=\"700\">Kai's Wi-Fi Plane</text>"
      . "<text x=\"$L\" y=\"2.5\" font-size=\"2.9\">Keel dart · cut-and-fold · one sheet</text>"
      . "<text x=\"$L\" y=\"8\" font-size=\"2.7\" font-weight=\"700\">Print on CARD STOCK, at 100%</text>"
      . "<text x=\"$L\" y=\"11.5\" font-size=\"2.7\">(\"Actual size\", not \"Fit to page\")</text>";
  $ly = 17;
  $leg = [
    ["<line x1='0' y1='0' x2='9' y2='0' stroke='#111' stroke-width='.6'/>", 'solid line = CUT'],
    ["<line x1='0' y1='0' x2='9' y2='0' stroke='#111' stroke-width='.45' stroke-dasharray='3 2'/>", 'dashed = FOLD (in number order)'],
    ["<line x1='0' y1='0' x2='9' y2='0' stroke='#111' stroke-width='.45' stroke-dasharray='.6 1.2'/>", 'dotted = skewer spine, inside the keel'],
    ["<rect x='1' y='-1.5' width='7' height='3' fill='none' stroke='#111' stroke-width='.45'/>", 'boxes = where parts go (real size)'],
  ];
  foreach ($leg as $i => [$sym, $txt]) {
    $y = $ly + $i * 4.6;
    $s .= "<g transform=\"translate($L $y)\">$sym</g><text x=\"" . ($L + 12) . "\" y=\"" . ($y + 1) . "\" font-size=\"2.6\">$txt</text>";
  }
  // scale check, top-right corner
  $sx = 40; $sy = -2;
  foreach (['① fold in half, printed side OUTSIDE', '② fold each wing back out flat', '③ bend the back flaps up 2 mm'] as $i => $t) {
    $s .= "<text x=\"" . ($sx + 25) . "\" y=\"" . ($sy + 35.5 + $i * 3.4) . "\" font-size=\"2.4\" font-weight=\"700\" text-anchor=\"middle\">$t</text>";
  }
  $s .= "<rect x=\"$sx\" y=\"$sy\" width=\"50\" height=\"3\" fill=\"#111\"/>";
  for ($i = 0; $i <= 5; $i++) $s .= "<line x1=\"" . ($sx + $i * 10) . "\" y1=\"" . ($sy + 3) . "\" x2=\"" . ($sx + $i * 10) . "\" y2=\"" . ($sy + 5) . "\" stroke=\"#111\" stroke-width=\".3\"/>";
  $s .= "<text x=\"" . ($sx + 25) . "\" y=\"" . ($sy + 9) . "\" font-size=\"2.8\" font-weight=\"700\" text-anchor=\"middle\">This bar must be 5 cm.</text>"
      . "<text x=\"" . ($sx + 25) . "\" y=\"" . ($sy + 12.5) . "\" font-size=\"2.4\" text-anchor=\"middle\">Check with a ruler. If it isn't,</text>"
      . "<text x=\"" . ($sx + 25) . "\" y=\"" . ($sy + 15.5) . "\" font-size=\"2.4\" text-anchor=\"middle\">reprint at 100% before you cut.</text>";
  $s .= "<text x=\"" . ($sx + 25) . "\" y=\"" . ($sy + 24) . "\" font-size=\"2.4\" text-anchor=\"middle\">Before cutting: lay the skewer on</text>"
      . "<text x=\"" . ($sx + 25) . "\" y=\"" . ($sy + 27) . "\" font-size=\"2.4\" text-anchor=\"middle\">the MOTOR STICK and mark both</text>"
      . "<text x=\"" . ($sx + 25) . "\" y=\"" . ($sy + 30) . "\" font-size=\"2.4\" text-anchor=\"middle\">motor spots + the centre on it.</text>";
  $s .= "<text x=\"0\" y=\"-4\" font-size=\"3.4\" font-weight=\"700\" text-anchor=\"middle\">▲ NOSE</text>";
  $s .= plane_layers(['mode' => 'template']);
  $s .= "<text x=\"" . (-$F['half'] / 2 - 4) . "\" y=\"200\" font-size=\"3.4\" font-weight=\"700\" text-anchor=\"middle\" fill=\"#999\">LEFT WING</text>"
      . "<text x=\"" . ($F['half'] / 2 + 4) . "\" y=\"200\" font-size=\"3.4\" font-weight=\"700\" text-anchor=\"middle\" fill=\"#999\">RIGHT WING</text>"
      . "<text x=\"" . (-$F['half'] / 2 - 4) . "\" y=\"205\" font-size=\"2.3\" text-anchor=\"middle\" fill=\"#999\">(this printed side is the TOP)</text>"
      . "<text x=\"48\" y=\"124\" font-size=\"2.2\" text-anchor=\"middle\">motor wires run along</text>"
      . "<text x=\"48\" y=\"127\" font-size=\"2.2\" text-anchor=\"middle\">the skewer to the DRIVER</text>";
  $s .= "<text x=\"0\" y=\"" . ($ph - $n - 5) . "\" font-size=\"2.2\" fill=\"#777\" text-anchor=\"middle\">github.com/joefaron/kai-code · drawn from data/plane.json · " . date('Y-m-d') . "</text>";
  return $s . "</svg>";
}
