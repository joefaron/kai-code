// Mini spider - copy of the little Halloween spiders (Kai, 2026-10-16).
// v2 (2026-10-16): prints with NO supports. Every part is solid straight
// down to the bed (nothing hangs over air), so the knee "arch" is a raised
// ridge, tallest at the knee, instead of a bridge.
// Render: openscad -o mini_spider.stl -D span=40 mini_spider.scad

span      = 40;   // tip-to-tip leg span in mm (the real ones are about 30)
knee_lift = 1.5;  // how much taller the leg is at the knee
$fn = 32;

s = span / 30;    // everything below is drawn for a 30 mm spider

// a ball plus its shadow on the bed, hulled = a pillar with a round top
module post(p, r) hull() {
    translate(p) sphere(r);
    translate([p[0], p[1], 0]) cylinder(r = r, h = 0.01);
}

// an ellipsoid with straight walls below its middle (no undercut)
module dome(p, rx, ry, rz) hull() {
    translate(p) scale([rx, ry, rz]) sphere(1);
    translate([p[0], p[1], 0]) scale([rx, ry, 1]) cylinder(r = 1, h = 0.01);
}

// one leg: hip -> knee -> foot
module leg(a, curl) {
    hip  = [2.6 * cos(a), 2.6 * sin(a), 0.9];
    knee = [7.5 * cos(a), 7.5 * sin(a), 0.9 + knee_lift];
    b = a + curl;
    foot = [14 * cos(b), 14 * sin(b), 0.35];
    hull() { post(hip, 0.95); post(knee, 0.8); }
    hull() { post(knee, 0.8); post(foot, 0.6); }
}

module spider() {
    // abdomen (big back bulb), thorax, little head
    dome([-6, 0, 1.6],  5,   4,   3.2);
    dome([0, 0, 1.0],   3.3, 3.1, 2.4);
    dome([3.6, 0, 0.8], 1.8, 1.7, 1.4);
    // 4 legs a side: front pair reaches forward, back pair sweeps back
    for (side = [1, -1]) {
        leg(side * 35,  side * -12);
        leg(side * 70,  side * -6);
        leg(side * 110, side * 8);
        leg(side * 145, side * 14);
    }
}

// squash < 1 makes a lower spider: less plastic, fewer layers, faster print
squash = 1;

scale([s, s, s * squash]) intersection() {
    spider();
    translate([-50, -50, 0]) cube(100);   // flat bottom
}
