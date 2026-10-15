// Shaft fit test: one strip with 5 holes, 1.7 to 2.1 mm, each with its size printed beside it.
// Push the real 2 mm shaft into each hole. The best hole is the smallest one you can push the
// shaft into by hand without the plastic cracking. Then put that number in shaft_coupler.scad.
// Prints in a few minutes. Print it flat, at the same settings as the coupler.
//
// Render:  tmp/openscad-2021.01/openscad.com -o media/3d/shaft_fit_test.stl 3d/shaft_fit_test.scad

sizes = [1.7, 1.8, 1.9, 2.0, 2.1];
pitch = 9;          // hole spacing
h = 10;             // strip height = how deep the shaft goes in
w = 8;              // strip width
$fn = 32;           // same hole resolution as the coupler, so the test matches it

difference() {
    cube([pitch * len(sizes), w, h]);
    for (i = [0 : len(sizes) - 1]) {
        translate([pitch * (i + 0.5), w / 2, 1]) cylinder(d = sizes[i], h = h);                  // blind hole, 1 mm floor
        translate([pitch * (i + 0.5), w / 2, h - 0.8]) cylinder(d1 = sizes[i], d2 = sizes[i] + 1, h = 0.81);  // lead-in
        translate([pitch * (i + 0.5), 0.4, 2]) rotate([90, 0, 0])                               // size on the front face
            linear_extrude(0.6) text(str(sizes[i]), size = 2.6, halign = "center", font = "Liberation Sans:style=Bold");
    }
}
