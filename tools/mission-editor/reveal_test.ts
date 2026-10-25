import { assertEquals } from "@std/assert";
import { coverOf, pinnedAlong, revealOffset } from "./ui/reveal.js";

Deno.test("a sticky element near a pinned edge covers its own width there, wherever it sits now", () => {
  // At scroll 0 the 200px column sits 12px in, so it still covers the start of the view once it pins.
  assertEquals(coverOf({ at: 12, size: 200, view: 756, startPinned: true, endPinned: false }), { before: 200, after: 0 });
  // Far from the edge, a sticky element is not pinned yet and covers nothing.
  assertEquals(coverOf({ at: 1000, size: 200, view: 756, startPinned: true, endPinned: false }), { before: 0, after: 0 });
  assertEquals(coverOf({ at: 600, size: 100, view: 756, startPinned: false, endPinned: true }), { before: 0, after: 100 });
});

Deno.test("a sticky element pinned to the inline edge is not pinned along the block axis, and the reverse", () => {
  // The timeline's name column pins its left edge; its ruler row pins its top edge and spans the full width.
  const column = { position: "sticky", left: "0px", top: "auto", right: "auto", bottom: "auto" };
  const ruler = { position: "sticky", left: "auto", top: "0px", right: "auto", bottom: "auto" };
  assertEquals(pinnedAlong(column, false), true);
  assertEquals(pinnedAlong(column, true), false);
  assertEquals(pinnedAlong(ruler, false), false);
  assertEquals(pinnedAlong(ruler, true), true);
  assertEquals(pinnedAlong({ ...column, position: "static" }, false), false);
});

Deno.test("a beat hanging off the view's end scrolls only as far as its card gap allows", () => {
  // The beat ends 16px past the view's end, so the view moves by that much and no further.
  assertEquals(revealOffset({ start: 589, size: 180, scroll: 0, view: 756, content: 1614, before: 203, after: 3 }), 16);
});

Deno.test("a beat reveals to the right of a sticky start column, not under it", () => {
  // The 120px column and the 20px margin both sit before the beat, so the scroll lands 140px short of the beat's start.
  assertEquals(revealOffset({ start: 300, size: 60, scroll: 0, view: 200, content: 1000, before: 20 + 120, after: 20 }), 160);
});

// A 1000px scroll range with a 200px view, and an element 50px tall.
const view = 200;
const content = 1000;

Deno.test("an element already in view with its margins keeps the scroll position", () => {
  assertEquals(revealOffset({ start: 100, size: 50, scroll: 0, view, content, before: 20, after: 20 }), 0);
});

Deno.test("an element above the view lands a margin below the top edge", () => {
  assertEquals(revealOffset({ start: 100, size: 50, scroll: 500, view, content, before: 20, after: 20 }), 80);
});

Deno.test("an element past the view's end scrolls the least that shows it", () => {
  assertEquals(revealOffset({ start: 900, size: 50, scroll: 0, view, content, before: 20, after: 20 }), 770);
});

Deno.test("the top padding of the scroller is kept when an element scrolls to the start", () => {
  // The margin before is the larger of the layout gap and the scroller's padding, so the padding stays in view.
  assertEquals(revealOffset({ start: 100, size: 50, scroll: 500, view, content, before: 32, after: 20 }), 68);
});

Deno.test("a scroll never leaves the content's range", () => {
  assertEquals(revealOffset({ start: 5, size: 50, scroll: 300, view, content, before: 20, after: 20 }), 0);
  assertEquals(revealOffset({ start: 990, size: 10, scroll: 0, view, content, before: 20, after: 20 }), 800);
});
