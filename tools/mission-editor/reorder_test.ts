import { assertEquals } from "@std/assert";
import {
  clampY,
  dropIndex,
  HOLD_MS,
  inColumn,
  insertionTop,
  movedMessage,
  moveItem,
  SLOP_PX,
  wrapIndex,
} from "./ui/reorder.js";

Deno.test("a touch holds for 500 ms before a card lifts, and a move of more than 8 px scrolls instead", () => {
  assertEquals(HOLD_MS, 500);
  assertEquals(SLOP_PX, 8);
});

Deno.test("Alt+Up and Alt+Down wrap at either end of the list", () => {
  assertEquals(wrapIndex(0, -1, 3), 2);
  assertEquals(wrapIndex(2, 1, 3), 0);
  assertEquals(wrapIndex(1, 1, 3), 2);
  assertEquals(wrapIndex(1, -1, 3), 0);
  assertEquals(wrapIndex(0, 1, 1), 0);
});

Deno.test("a moved card takes the index it lands at, and the others keep their order", () => {
  assertEquals(moveItem(["a", "b", "c"], 0, 2), ["b", "c", "a"]);
  assertEquals(moveItem(["a", "b", "c"], 2, 0), ["c", "a", "b"]);
  assertEquals(moveItem(["a", "b", "c"], 1, 1), ["a", "b", "c"]);
});

Deno.test("a drop lands after every other card whose middle is above the pointer", () => {
  const mids = [10, 30, 50];
  assertEquals(dropIndex(mids, 5), 0);
  assertEquals(dropIndex(mids, 31), 2);
  assertEquals(dropIndex(mids, 99), 3);
});

Deno.test("a dragged card stays between the top and bottom of its list", () => {
  assertEquals(clampY(-40, 100, 300), 100);
  assertEquals(clampY(500, 100, 300), 300);
  assertEquals(clampY(200, 100, 300), 200);
});

Deno.test("a pointer outside the list's columns shows no drop cue, and a drop there is a cancel", () => {
  assertEquals(inColumn(50, 0, 100), true);
  assertEquals(inColumn(120, 0, 100), false);
  assertEquals(inColumn(-1, 0, 100), false);
});

Deno.test("the drop line is centred in the gap between the cards a drop falls between", () => {
  const others = [{ top: 0, bottom: 40 }, { top: 48, bottom: 88 }];
  assertEquals(insertionTop(others, 0, 8), -4);
  assertEquals(insertionTop(others, 1, 8), 44);
  assertEquals(insertionTop(others, 2, 8), 92);
  assertEquals(insertionTop([], 0, 8), null);
});

Deno.test("a move is announced with its new position and the list's length", () => {
  assertEquals(movedMessage(2, 5), "Moved to position 2 of 5");
});
