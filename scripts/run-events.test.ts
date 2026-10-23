import { assertEquals } from "@std/assert";
import { eventLine, parseEventLine } from "./run-events.ts";

Deno.test("an event survives a round trip through a line", () => {
  const event = {
    kind: "packet",
    event: { type: "debug", channel: 9, kind: "i", value: 5, t: 1200 },
  } as const;
  assertEquals(parseEventLine(eventLine(event)), event);
});

Deno.test("an ordinary output line is not an event", () => {
  assertEquals(parseEventLine("✅ Compiled main.txt"), null);
  assertEquals(parseEventLine(""), null);
});

Deno.test("a damaged event line is not an event", () => {
  assertEquals(parseEventLine("@telemetry {not json"), null);
  assertEquals(parseEventLine('@telemetry {"no":"kind"}'), null);
});
