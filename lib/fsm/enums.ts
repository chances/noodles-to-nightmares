// The enums the vocabulary's `enum` fields draw from, per game. `RadarSprite` is the map icon list of the Sanny GTA III
// library (`enum RadarSprite` in data/gta3_sbl/enums.txt, where `None = 0` draws nothing and is left out). The special
// character lists are GTA III's valid model names for opcode 023C, from the GTAMods wiki; a game without a list in
// data/special-characters.json gets no SpecialCharacter members.

import radarSprites from "../../data/radar-sprites.json" with { type: "json" };
import gta3Enums from "../../data/gta3-enums.json" with { type: "json" };
import specialCharacters from "../../data/special-characters.json" with {
  type: "json",
};

/** 3D-era games the mission editor targets. */
export type Game = "gta3" | "vc" | "sa" | "vcs" | "lcs";

export interface EnumMember {
  name: string;
  /** Null where the Sanny library lists the name without a number. */
  id: number | null;
}

const SPECIAL_CHARACTERS: Partial<Record<Game, string[]>> = specialCharacters;

/** The Sanny enums a game's `enum` fields draw from, keyed by enum name. */
export function enumsFor(game: Game): Record<string, EnumMember[]> {
  const names = SPECIAL_CHARACTERS[game];
  return {
    ...(game === "gta3" ? { RadarSprite: radarSprites, ...gta3Enums } : {}),
    ...(names
      ? { SpecialCharacter: names.map((name) => ({ name, id: null })) }
      : {}),
  };
}
