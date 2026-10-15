// 45-degree motor holder for the long-tail boat. Replaces the PP-R 25 pipe clips.
// The motor snaps into the C ring with its shaft pointing DOWN and BACK at `tilt`,
// so the rod + prop reach the water without foam wedges. Two screw ears (on the
// diagonal, so it can't twist) take drywall screws.
// Screw it down at the back edge of the deck so the shaft hangs out over the water.
//
// Render:
//   openscad -D 'name="KAI"'   -o media/3d/motor_holder_kai.stl   3d/motor_holder.scad
//   openscad -D 'name="TEAMMATE"' -o media/3d/motor_holder_friend.stl 3d/motor_holder.scad
// Print it sitting on its flat base. Supports "touching buildplate" only if your
// printer droops on the tilted ring.

name = "KAI";        // engraved on the right side; a jack-o-lantern is on the left
tilt = 45;           // shaft angle below level
ghost = false;       // true = show the motor + coupler (for checking clearance)

motor_d = 24.6;      // EUDAX motor is ~24.4 mm round (the 25 mm pipe clip fit it)
motor_len = 12.4;    // can length, faces only
ring_od = 31;        // outside of the clip
ring_depth = 10;     // how thick the clip is along the motor
snap_gap = 22.5;      // C opening; smaller than the motor so it snaps in
H = 20;              // motor centre height above the deck
base_t = 4;          // base plate thickness
base_y0 = -5;        // base front edge (shaft side)
base_y1 = 16;        // base back edge
screw_d = 4.0;       // drywall screw shank hole
head_d = 8.6;        // countersink for the screw head
engrave = 0.8;
$fn = 64;

W = ring_od / 2;     // half width; the body sides are flat at x = +-W

// Place local motor coordinates (z = shaft direction, +y = C opening) in the world.
module motor_frame() {
    translate([0, 0, H]) rotate([90 + tilt, 0, 0]) children();
}

module clip_outline() {          // square-bottomed like the old clip
    union() {
        circle(d = ring_od);
        translate([-W, -W]) square([ring_od, W]);
    }
}

module body() {
    hull() {
        motor_frame()
            translate([0, 0, -ring_depth / 2])
                linear_extrude(ring_depth) intersection() {
                    clip_outline();
                    translate([-W, -W]) square([ring_od, W]);
                }
        translate([-W, base_y0, 0]) cube([ring_od, base_y1 - base_y0, base_t]);
    }
    motor_frame() translate([0, 0, -ring_depth / 2]) linear_extrude(ring_depth) clip_outline();
}

module ear(corner, dir) {
    hole = corner + 7 * dir;
    difference() {
        hull() {
            translate(corner - 3 * dir) cylinder(d = 11, h = base_t);
            translate(hole) cylinder(d = 11, h = base_t);
        }
        translate([hole[0], hole[1], -0.1]) cylinder(d = screw_d, h = base_t + 1, $fn = 32);
        translate([hole[0], hole[1], base_t - 2.4]) cylinder(d1 = screw_d, d2 = head_d, h = 2.41, $fn = 32);
    }
}

module pumpkin() {               // 2D, about 13 mm wide, engraved as an outline + face
    difference() {
        scale([1.15, 1]) circle(d = 11.5);
        scale([1.15, 1]) circle(d = 9.7);
    }
    translate([-0.7, 5.2]) square([1.4, 2.2]);                          // stem
    translate([-3.0, 1.0]) polygon([[-1.6, 0], [1.6, 0], [0, 2.2]]);   // eyes
    translate([ 3.0, 1.0]) polygon([[-1.6, 0], [1.6, 0], [0, 2.2]]);
    polygon([[-4, -1.2], [-2.7, -2.0], [-2, -1.2], [-1, -2.6], [0, -1.4],
             [1, -2.6], [2, -1.2], [2.7, -2.0], [4, -1.2], [2.6, -3.3], [-2.6, -3.3]]); // grin
}

module side_art() {
    // name on the +x side, reading left-to-right
    translate([W - engrave, 5.3, 8.8]) rotate([90, 0, 90])
        linear_extrude(engrave + 1)
            text(name, size = len(name) > 3 ? 3.6 : 6, font = "Liberation Sans:style=Bold",
                 halign = "center", valign = "center");
    // jack-o-lantern on the -x side
    translate([-W + engrave, 5, 11]) rotate([90, 0, -90])
        linear_extrude(engrave + 1) pumpkin();
}

difference() {
    union() {
        body();
        ear([-W, base_y1], [-0.7071, 0.7071]);   // back-left, kicked out at 45
        ear([ W, base_y0], [ 0.7071, -0.7071]);  // front-right, kicked out at 45
    }
    motor_frame() {
        // motor can (a little long so both faces are free)
        translate([0, 0, -motor_len / 2 - 0.3]) cylinder(d = motor_d, h = motor_len + 0.6);
        // snap opening
        translate([-snap_gap / 2, 0, -ring_depth]) cube([snap_gap, ring_od, ring_depth * 2]);
        // room for the bearing boss + spiral coupler on the shaft side
        translate([0, 0, motor_len / 2]) cylinder(d = 15, h = 60);
        // room for the solder tabs + wires on the back
        translate([0, 0, -motor_len / 2 - 10]) cylinder(d = motor_d + 1, h = 10.1);
    }
    side_art();
    translate([0, 0, -50]) cube(100, center = true);   // flat bottom
}

if (ghost) %motor_frame() {
    translate([0, 0, -motor_len / 2]) cylinder(d = 24.4, h = motor_len);
    translate([0, 0, motor_len / 2 + 1]) cylinder(d = 12.6, h = 32);   // spiral coupler
    translate([0, 0, motor_len / 2 + 33]) cylinder(d = 2, h = 80);     // rod
}
