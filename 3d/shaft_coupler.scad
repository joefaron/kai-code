// Spiral shaft coupler: EUDAX motor shaft (2 mm) -> long steel prop rod (2 mm).
// Replaces the red silicone tube in the long-tail boat (media/longtail-boat.svg).
// Print standing up, no supports. Press both shafts in hard: it's meant to be a JAM fit, no glue.
//
// Render:  tmp/openscad-2021.01/openscad.com -o media/3d/shaft_coupler.stl 3d/shaft_coupler.scad
// Other sizes:  add  -D bore_rod=1.8 -D bore_motor=1.8   (pick the number from shaft_fit_test.scad)
//
// 2026-10-15: 2.2 let the 2 mm shafts slide straight through (Joe). On Joe's printer the holes print
// true to size, so a press fit needs a hole a bit SMALLER than the shaft. A 3 mm shaft press-fits a 3.0 hole
// and floats in a 3.1 one (Ultimaker forum). Small holes shrink more, so 1.9 should jam a 2 mm shaft. The
// fit-test strip checks 1.7-2.1 at once.

bore_motor = 1.9;   // motor shaft hole: 0.1 under the 2 mm shaft = jam fit
bore_rod   = 1.9;   // prop rod hole
depth_motor = 12;   // how far the motor shaft goes in
depth_rod   = 14;   // how far the rod goes in
length = 32;        // total length
core_d = 9;         // solid core diameter (red tube was ~6 mm)
ridge_d = 12;       // outer diameter across the spiral ridges
ridges = 4;         // number of spiral ridges
twist = 360;        // degrees the spiral turns end to end
end_d = 12.6;        // smooth collars at each end
end_h = 3;
$fn = 72;

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
    translate([0, 0, -0.01]) cylinder(d = bore_motor, h = depth_motor, $fn = 32);
    translate([0, 0, -0.01]) lead_in(bore_motor);
    // rod end (top)
    translate([0, 0, length - depth_rod]) cylinder(d = bore_rod, h = depth_rod + 0.01, $fn = 32);
    translate([0, 0, length + 0.01]) mirror([0, 0, 1]) lead_in(bore_rod);
    // tiny vent between the two holes so air (and extra glue) can escape
    cylinder(d = 1.0, h = length, $fn = 16);
}
