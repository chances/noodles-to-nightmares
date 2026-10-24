import { assertEquals } from "@std/assert";
import { enumsFor } from "./enums.ts";

Deno.test("GTA III lists its special characters from the data file", () => {
  const names = enumsFor("gta3").SpecialCharacter.map((m) => m.name);
  assertEquals(names.length, 42);
  assertEquals(names.includes("FRANKIE"), true);
  assertEquals(names.includes("PLAYER"), true);
});

Deno.test("a game with no special character list has no SpecialCharacter members", () => {
  assertEquals(enumsFor("vc").SpecialCharacter, undefined);
});

Deno.test("only GTA III gets the Sanny library enums", () => {
  assertEquals(enumsFor("vc").RadarSprite, undefined);
  assertEquals(enumsFor("gta3").RadarSprite.length > 0, true);
});
