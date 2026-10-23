import dgram from "node:dgram";
import { assert, assertEquals } from "@std/assert";
import { debugNames, parsePacket, startCapture } from "./telemetry.ts";

Deno.test("a capture logs debug readings and summarizes each channel", async () => {
  const dir = await Deno.makeTempDir();
  const logPath = `${dir}/capture.jsonl`;
  const capture = await startCapture(18089, logPath);
  assert(capture);
  const sender = dgram.createSocket("udp4");
  await new Promise<void>((resolve) =>
    sender.bind(0, "127.0.0.1", () => resolve())
  );
  const send = (text: string) =>
    new Promise<void>((resolve) =>
      sender.send(text, 18089, "127.0.0.1", () => resolve())
    );
  await send("DBG:9,i,5");
  await send("DBG:9,i,12");
  await send("DBG:20,t,3");
  await send("POS:1,2,3,4");
  await send("POS:1,2,3,5");
  await send("CAPTURE:1,2,3,4");
  await send("garbage");
  const summary = await capture.stop();
  sender.close();

  assertEquals(summary.packets, 6);
  assertEquals(summary.channels.get(9), {
    kind: "i",
    count: 2,
    last: 12,
    min: 5,
    max: 12,
  });
  assertEquals(summary.channels.get(20)?.last, 3);
  assertEquals(summary.positions, 2);
  assertEquals(summary.captures, 1);
  const lines = (await Deno.readTextFile(logPath)).trim().split("\n");
  // Two debug readings on channel 9, one trace, one position (the second falls inside a second), one capture
  assertEquals(lines.length, 5);
  assertEquals(JSON.parse(lines[0]).channel, 9);
  await Deno.remove(dir, { recursive: true });
});

Deno.test("a capture on a taken port returns null", async () => {
  const taken = dgram.createSocket("udp4");
  await new Promise<void>((resolve) =>
    taken.bind(18090, "127.0.0.1", () => resolve())
  );
  const dir = await Deno.makeTempDir();
  assertEquals(await startCapture(18090, `${dir}/capture.jsonl`), null);
  taken.close();
  await Deno.remove(dir, { recursive: true });
});

Deno.test("a debug packet carries its channel, kind, and value", () => {
  assertEquals(parsePacket("DBG:9,i,13570"), {
    type: "debug",
    channel: 9,
    kind: "i",
    value: 13570,
  });
  assertEquals(parsePacket("DBG:3,f,-12.5000\n"), {
    type: "debug",
    channel: 3,
    kind: "f",
    value: -12.5,
  });
  assertEquals(parsePacket("DBG:14,c,7")?.type, "debug");
  assertEquals(parsePacket("DBG:20,t,2"), {
    type: "debug",
    channel: 20,
    kind: "t",
    value: 2,
  });
});

Deno.test("a malformed debug packet is ignored", () => {
  assertEquals(parsePacket("DBG:x,i,1"), null);
  assertEquals(parsePacket("DBG:1,q,1"), null);
  assertEquals(parsePacket("DBG:1,i"), null);
  assertEquals(parsePacket("DBG:1,i,abc"), null);
  assertEquals(parsePacket("DBG:1,ii,1"), null);
});

Deno.test("position and capture packets keep their coordinates", () => {
  assertEquals(parsePacket("POS:1144.000,-596.000,14.970,90.00"), {
    type: "pos",
    pos: [1144, -596, 14.97],
    heading: 90,
  });
  assertEquals(parsePacket("CAPTURE:1,2,3,4")?.type, "capture");
  assertEquals(parsePacket("POS:1,2"), null);
});

Deno.test("an unknown packet is ignored", () => {
  assertEquals(parsePacket("hello"), null);
  assertEquals(parsePacket(""), null);
});

Deno.test("debug channel names come from the DEBUG_ constants", () => {
  const names = debugNames(
    "const TELEMETRY_PORT = 8089\nconst DEBUG_MY_CAR = 9\nconst DEBUG_VAN = 7 // note\nconst REWARD = 800\n",
  );
  assertEquals(names.get(9), "MY_CAR");
  assertEquals(names.get(7), "VAN");
  assertEquals(names.size, 2);
});
