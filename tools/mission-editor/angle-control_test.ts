import { assert, assertEquals } from "@std/assert";
import { stepDescriptors } from "@noodles/fsm";
import {
  angleFromPoint,
  literal,
  modeFor,
  placeValue,
  sliderKind,
  snapAngle,
  stepFor,
  constantDegrees,
  onDialFace,
} from "./ui/angle-control.js";

const heading = { name: "angle", min: 0, max: 360, angle: true };
const percent = { name: "percent", min: 0, max: 100 };

Deno.test("angleFromPoint reads 0 at north and grows clockwise", () => {
  assertEquals(angleFromPoint(0, -1), 0);
  assertEquals(angleFromPoint(1, 0), 90);
  assertEquals(angleFromPoint(0, 1), 180);
  assertEquals(angleFromPoint(-1, 0), 270);
});

Deno.test("snapAngle rounds to the step and wraps into 0 to 360", () => {
  assertEquals(snapAngle(93, 5), 95);
  assertEquals(snapAngle(358, 5), 0);
  assertEquals(snapAngle(-3, 5), 355);
  assertEquals(snapAngle(91, 22.5), 90);
  assertEquals(snapAngle(93, 1), 93);
});

Deno.test("stepFor gives Ctrl 22.5, Shift 1, and 5 otherwise", () => {
  assertEquals(stepFor({ shift: false, ctrl: false }), 5);
  assertEquals(stepFor({ shift: true, ctrl: false }), 1);
  assertEquals(stepFor({ shift: false, ctrl: true }), 22.5);
  assertEquals(stepFor({ shift: true, ctrl: true }), 22.5);
});

Deno.test("literal writes a float with a decimal point, or a whole number for int variables", () => {
  assertEquals(literal(90, false), "90.0");
  assertEquals(literal(22.5, false), "22.5");
  assertEquals(literal(90.4, false), "90.5");
  assertEquals(literal(90.4, true), "90");
});

Deno.test("sliderKind treats a plain number as slider and a name as expression", () => {
  assertEquals(sliderKind("90.0"), "slider");
  assertEquals(sliderKind("-3"), "slider");
  assertEquals(sliderKind("faceSalHeading"), "expr");
  assertEquals(sliderKind(""), "expr");
});

Deno.test("modeFor keeps a toggle only while the value's auto mode is unchanged", () => {
  assertEquals(modeFor({ mode: "slider", auto: "expr" }, "expr"), "slider");
  assertEquals(modeFor({ mode: "slider", auto: "expr" }, "slider"), "slider");
  assertEquals(modeFor({ mode: "expr", auto: "slider" }, "expr"), "expr");
  assertEquals(modeFor({ mode: null, auto: "expr" }, "expr"), "expr");
});

Deno.test("placeValue wraps an angle at 360 and clamps other ranges", () => {
  assertEquals(placeValue(357, heading, 5, false), 355);
  assertEquals(placeValue(359.9, heading, 1, false), 0);
  assertEquals(placeValue(150, percent, 1, true), 100);
  assertEquals(placeValue(-5, percent, 1, true), 0);
});

Deno.test("constantDegrees reads a named constant's value, or null when it has none", () => {
  const constants = [{ name: "FACE", kind: "float", value: "45.0" }];
  assertEquals(constantDegrees("FACE", constants), 45);
  assertEquals(constantDegrees("NOPE", constants), null);
});

Deno.test("onDialFace accepts a point on the drawn face and rejects the ring around it", () => {
  // A 50px dial: the button's border-box radius is 25px, and the drawn face is 21px.
  assert(onDialFace(0, 0, 25));
  assert(onDialFace(20, 0, 25));
  assert(!onDialFace(22, 0, 25));
  assert(!onDialFace(0, -24, 25));
});

Deno.test("the heading fields declare the 0 to 360 angle range", () => {
  for (const name of ["playerHeading", "carSetHeading", "charSetHeading"]) {
    const card = stepDescriptors.find((d) => d.name === name);
    const field = card?.fields.find((f) => f.name === "angle");
    assert(field, `${name} has an angle field`);
    assertEquals(field.min, 0);
    assertEquals(field.max, 360);
    assertEquals(field.angle, true);
  }
});
