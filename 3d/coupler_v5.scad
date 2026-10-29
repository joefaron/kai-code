// Coupler v5: joins the 2 mm motor shaft to the 2 mm steel prop rod (long-tail boat).
// Built for Joe's printer: FlashForge Adventurer 5M, 0.4 mm nozzle, printed STANDING UP.
//
// Why it looks like this (2026-10-29 - the plain 10 mm tube was slow and mostly zigzag infill):
//  * CRUSH RIBS, not a tight round hole. The hole is drawn loose (2.6) and 3 thin ribs reach in to
//    grip the rod. Pushing the rod in shaves the ribs to fit, so it grips even when the printer
//    makes holes a bit big or small. That ends the 2.0/2.1/2.2/2.4 guessing in the fit history
//    in shaft_coupler.scad: a rib can be shaved, a solid wall can't.
//  * 7 mm across. The wall is ~2.2 mm, about 5 lines of a 0.4 nozzle, so the slicer prints it
//    all as solid walls (strongest, no zigzag infill). The motor is tiny, so a thicker part
//    only adds print time.
//  * Solid 4 mm in the middle, no pin-hole vent: the strongest spot, where the two shafts meet.
//  * A funnel at each end so the rod finds the hole, and a chamfer at the bottom so the first
//    layer's squish doesn't make a lip.
//
// Render: tmp/openscad-2021.01/openscad.com --export-format binstl -o media/3d/coupler_v5.stl 3d/coupler_v5.scad

od        = 7;      // outside diameter
length    = 32;     // total length
depth     = 14;     // how far each shaft goes in
clear_d   = 2.6;    // loose hole the rod sits in (it never touches this)
rib_tip_d = 2.0;    // circle through the rib tips (smaller = tighter grip)
ribs      = 3;
rib_w     = 0.9;    // rib width where it meets the wall
flare_d   = 4.2;    // funnel width at the mouth
flare_h   = 4;      // funnel depth
ramp      = 1.5;    // ribs rise over this length so the rod doesn't stub on them
chamfer   = 0.5;
$fn = 96;

module rib_2d(tip_r) {
    // thin wedge from the wall (r = clear_d/2 + 0.2, overlapping it) in to tip_r
    polygon([[clear_d / 2 + 0.2, -rib_w / 2], [clear_d / 2 + 0.2, rib_w / 2], [tip_r, 0]]);
}

// one socket from the mouth (z=0) inward
module socket() {
    // funnel into the loose hole
    translate([0, 0, -0.01]) cylinder(d1 = flare_d, d2 = clear_d, h = flare_h);
    difference() {
        translate([0, 0, flare_h - 0.02]) cylinder(d = clear_d, h = depth - flare_h + 0.02);
        for (i = [0 : ribs - 1]) rotate(i * 360 / ribs)
            hull() {
                translate([0, 0, flare_h]) linear_extrude(0.01) rib_2d(clear_d / 2 - 0.01);
                translate([0, 0, flare_h + ramp]) linear_extrude(depth - flare_h - ramp + 0.1)
                    rib_2d(rib_tip_d / 2);
            }
    }
}

difference() {
    union() {
        cylinder(d1 = od - 2 * chamfer, d2 = od, h = chamfer);
        translate([0, 0, chamfer]) cylinder(d = od, h = length - chamfer);
    }
    socket();
    translate([0, 0, length]) mirror([0, 0, 1]) socket();
}
