<?php
// 3D-printed parts: every STL in media/3d/ gets a spinning 3D preview (three.js, the same
// copy the talk uses) plus links to the .stl and the OpenSCAD source in 3d/.
$PARTS = [
  'shaft_coupler'      => ['Spiral shaft coupler', 'Joins the 2 mm motor shaft to the 2 mm prop rod. Holes are 1.9 mm so the shafts jam in: no glue.', 'shaft_coupler.scad'],
  'shaft_fit_test'     => ['Hole fit-test strip', 'Holes from 1.7 to 2.1 mm. Print this first (5 minutes) and see which hole grips your shaft.', 'shaft_fit_test.scad'],
  'motor_holder_kai'   => ['Motor holder', 'Holds a 24 mm motor at 45 degrees on the deck, with a name engraved on the side (set name = "..." in the .scad).', 'motor_holder.scad'],
];
?>
<section class="hero">
  <h2>&#129513; 3D-printed parts</h2>
  <p class="lede">These parts are written as <b>code</b> in OpenSCAD: the file describes the shape with numbers.
  Change <code>bore_motor = 1.9;</code> to <code>1.8</code>, render, print. Drag a part to spin it.</p>
</section>

<section class="callout">
  <h3>The prompt that made the coupler</h3>
  <p><i>"Design a coupler that joins a 2 mm motor shaft to a 2 mm steel prop rod. It should print standing up
  with no supports, and be a tight press fit, no glue. Give me the OpenSCAD file."</i></p>
  <p>Version 1 had 2.2 mm holes and the shafts slid straight through. Version 2 uses 1.9 mm, and the
  fit-test strip checks 1.7&ndash;2.1 mm before printing the real part.</p>
</section>

<div class="cards">
<?php foreach ($PARTS as $file => [$name, $what, $scad]): if (!is_file(__DIR__ . "/../media/3d/$file.stl")) continue; ?>
  <div class="card">
    <h3><?= htmlspecialchars($name) ?></h3>
    <canvas class="stlview" data-stl="/media/3d/<?= $file ?>.stl" style="width:100%;height:240px;display:block;border-radius:8px;background:#0b1020;touch-action:none"></canvas>
    <p><?= htmlspecialchars($what) ?></p>
    <p><small><a href="/media/3d/<?= $file ?>.stl" download>download .stl</a> &middot; source <code>3d/<?= $scad ?></code></small></p>
  </div>
<?php endforeach; ?>
</div>

<script type="importmap">{ "imports": { "three": "/talk/vendor/three.module.js" } }</script>
<script type="module">
import * as THREE from 'three';
import { STLLoader } from '/talk/vendor/STLLoader.js';
for (const cv of document.querySelectorAll('.stlview')) {
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(35, 1, .1, 1000);
  scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x202030, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(3, 5, 4); scene.add(sun);
  const holder = new THREE.Group(); scene.add(holder);
  new STLLoader().load(cv.dataset.stl, geo => {
    geo.center(); geo.computeVertexNormals(); geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x7ce07c, roughness: .4 }));
    m.rotation.x = -Math.PI / 2; holder.add(m);
    const R = geo.boundingSphere.radius; cam.position.set(0, R * .9, R * 3.2); cam.lookAt(0, 0, 0);
  });
  let drag = null, spin = .6, vy = 0;
  cv.addEventListener('pointerdown', e => { drag = e.clientX; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (drag !== null) { vy = (e.clientX - drag) * .01; holder.rotation.y += vy; drag = e.clientX; } });
  cv.addEventListener('pointerup', () => { drag = null; });
  const clock = new THREE.Timer();
  r.setAnimationLoop(() => {
    clock.update();
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * r.getPixelRatio())) { r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    if (drag === null) holder.rotation.y += clock.getDelta() * spin;
    r.render(scene, cam);
  });
}
</script>
