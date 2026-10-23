import { assertEquals } from "@std/assert";
import { diagnoseExit } from "./game-exit.ts";

const cleanCleo = "Unloaded plugin sockets.cleo\n--Game Shutdown--\n";
const cleanScr = "> Logging finished: 08:18:48\n";
const modloader = "Mod Loader has been shutdown.\n";

Deno.test("a quit with both footers is normal, whatever the exit code", () => {
  assertEquals(
    diagnoseExit({ cleo: cleanCleo, scrlog: cleanScr, modloader }),
    { known: true, crashed: false, signs: [], exception: undefined },
  );
});

Deno.test("a missing CLEO marker and SCRLog footer are signs of a crash", () => {
  const diagnosis = diagnoseExit({
    cleo: "Unloaded plugin sockets.cleo\n",
    scrlog: "00019333&0: [0001] WAIT\n",
    modloader: "",
  });
  assertEquals(diagnosis.crashed, true);
  assertEquals(diagnosis.signs, [
    "cleo.log has no shutdown marker",
    "scrlog.log has no footer",
  ]);
});

Deno.test("ModLoader's unhandled exception is reported with its line", () => {
  const line =
    "Unhandled exception at 0x004A1002 in gta3-game.exe (+0xa1002): 0xC0000005: Access violation reading location 0x00001136.";
  const diagnosis = diagnoseExit({
    cleo: cleanCleo,
    scrlog: cleanScr,
    modloader: `Shutting down menu...\n${line}\n`,
  });
  assertEquals(diagnosis.crashed, true);
  assertEquals(diagnosis.exception, line);
});

Deno.test("with no log written, a crash is neither ruled in nor out", () => {
  assertEquals(
    diagnoseExit({ cleo: "", scrlog: "", modloader }),
    { known: false, crashed: false, signs: [] },
  );
});

Deno.test("a log the game did not write is not held against it", () => {
  // SCRLog is optional; a clean CLEO log alone is a clean quit
  assertEquals(
    diagnoseExit({ cleo: cleanCleo, scrlog: "", modloader }).crashed,
    false,
  );
});
