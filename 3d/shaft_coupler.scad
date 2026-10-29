// Spiral shaft coupler: EUDAX motor shaft (2 mm) -> long steel prop rod (2 mm).
// Replaces the red silicone tube in the long-tail boat (media/longtail-boat.svg).
// Print standing up, no supports. Push both shafts in.
//
// Render (the defaults ARE the current pick - no flags needed):
//   tmp/openscad-2021.01/openscad.com --export-format binstl -o media/3d/shaft_coupler.stl 3d/shaft_coupler.scad
//
// FIT HISTORY - the holes print SMALLER than drawn, by a lot. Trust this list, not theory:
//   2026-10-15  2.2 straight   -> "slid straight through" (Joe)
//   2026-10-29  2.1 -> 2.0     -> too tight
//   2026-10-29  2.2 -> 2.1     -> "still way too tight with how it physically prints"
//   2026-10-29  2.4 -> 2.2     -> current default, not reported on yet
// The 10-15 "slid through" report doesn't match the later ones (maybe a different print or filament).
// Go by the latest result and only change bore sizes in 0.1-0.2 steps from Joe's last report.

bore_motor = 2.4;   // hole size at the mouth (motor end)
bore_rod   = 2.4;   // hole size at the mouth (rod end)
bore_mid   = 2.2;   // >0 = TAPERED: each hole narrows from the mouth size to this a quarter of the
                    // length in, so the middle half grips at bore_mid. 0 = straight holes.
depth_motor = 14;   // how far the motor shaft goes in
depth_rod   = 14;   // how far the rod goes in
length = 32;        // total length (Joe 10-29: twice the 16 mm short one)
core_d = 7;         // solid core diameter
ridge_d = 9.3;      // outer diameter across the spiral ridges
ridges = 4;         // number of spiral ridges
twist = 360;        // degrees the spiral turns end to end
end_d = 10.6;       // smooth collars at each end
end_h = 2;
dots = 0;           // tiny dimples on the top collar so look-alike sizes can be told apart
$fn = 72;
// Short 16 mm version: -D length=16 -D depth_motor=7 -D depth_rod=7 -D twist=180

module spiral_body() {
    linear_extrude(height = length, twist = twist, slices = 120, convexity = 6)
        union() {
            circle(d = core_d);
            for (i = [0 : ridges - 1])
                rotate(i * 360 / ridges)
                    translate([core_d / 2 - 0.6, 0]) circle(d = (ridge_d - core_d) + 1.2, $fn = 32);
        }
}

module collar() {
    // smooth ring with a small chamfer so the ends look finished
    cylinder(d1 = end_d - 1.2, d2 = end_d, h = 0.6);
    translate([0, 0, 0.6]) cylinder(d = end_d, h = end_h - 0.6);
}

// one hole from the mouth (z=0) inward; tapers from d to bore_mid when bore_mid > 0
module bore(d, depth) {
    t = min(length / 4, depth);
    if (bore_mid > 0) {
        cylinder(d1 = d, d2 = bore_mid, h = t, $fn = 64);
        translate([0, 0, t - 0.01]) cylinder(d = bore_mid, h = depth - t + 0.01, $fn = 64);
    } else cylinder(d = d, h = depth, $fn = 64);
}

module lead_in(d) {
    // small cone so the shaft finds the hole
    cylinder(d1 = d + 1.0, d2 = d, h = 0.8);
}

difference() {
    union() {
        spiral_body();
        collar();
        translate([0, 0, length]) mirror([0, 0, 1]) collar();
    }
    // motor end (bottom)
    translate([0, 0, -0.01]) bore(bore_motor, depth_motor);
    translate([0, 0, -0.01]) lead_in(bore_motor);
    // rod end (top)
    translate([0, 0, length + 0.01]) mirror([0, 0, 1]) bore(bore_rod, depth_rod + 0.01);
    translate([0, 0, length + 0.01]) mirror([0, 0, 1]) lead_in(bore_rod);
    // tiny vent between the two holes so air (and extra glue) can escape
    cylinder(d = 1.0, h = length, $fn = 16);
    // size marker dimples on the top face
    if (dots > 0) for (i = [0 : dots - 1])
        rotate(i * 40) translate([(end_d / 2 - 0.6 + bore_rod / 2 + 0.8) / 2, 0, length - 0.5])
            cylinder(d = 1.0, h = 1, $fn = 12);
}
