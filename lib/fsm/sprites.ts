// The enums the vocabulary's `enum` fields draw from. `RadarSprite` is the map icon list of the Sanny GTA III
// library (`enum RadarSprite` in data/gta3_sbl/enums.txt, where `None = 0` draws nothing and is left out).

import radarSprites from "../../data/radar-sprites.json" with { type: "json" };

export interface EnumMember {
  name: string;
  id: number;
}

export const ENUMS: Record<string, EnumMember[]> = {
  RadarSprite: radarSprites,
};
