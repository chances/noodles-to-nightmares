// Geography POI catalog and compile-time resolution for state machines.

import geoCatalog from "../../data/geography.json" with { type: "json" };
import { floatLiteral } from "./numeric.ts";

export interface GeoPoi {
  id: string;
  district?: string;
  group?: string;
  category?: string;
  tags?: string[];
  pos: [number, number, number];
  heading?: number;
  radius?: number;
  halfExtent?: [number, number];
  /** Notes carried into the generated txt as `//` lines above the POI's consts. */
  comment?: string;
}

export const GEOGRAPHY: Record<string, GeoPoi> = Object.fromEntries(
  (geoCatalog as GeoPoi[]).map((p) => [p.id, p]),
);

/** Returns a POI by its catalog ID or throws. */
export function getPoi(id: string): GeoPoi {
  const p = GEOGRAPHY[id];
  if (!p) throw new Error(`Unknown POI id: ${id}`);
  return p;
}

/** Resolves a POI's [x, y, z] coordinates at compile time. */
export function poiSpot(id: string): [number, number, number] {
  return getPoi(id).pos;
}

/** Resolves a POI's radius at compile time, with optional fallback. */
export function poiRadius(id: string, fallback = 3.0): number {
  return getPoi(id).radius ?? fallback;
}

/** Generates Sanny const definitions from data/geography.json. */
export function generateGeographyTxt(): string {
  const lines: string[] = [
    "//==========================================",
    "// GENERATED from data/geography.json",
    "// DO NOT EDIT MANUALLY. Run `deno task build`",
    "//==========================================",
    "",
  ];

  for (const poi of geoCatalog as GeoPoi[]) {
    lines.push(`// ${poi.district ?? "portland"}: ${poi.id}`);
    for (const note of poi.comment?.split("\n") ?? []) {
      lines.push(`// ${note}`);
    }
    // Every value is a float in game, and Sanny reads a literal without a decimal point as an int.
    lines.push(`const ${poi.id}_X = ${floatLiteral(poi.pos[0])}`);
    lines.push(`const ${poi.id}_Y = ${floatLiteral(poi.pos[1])}`);
    lines.push(`const ${poi.id}_Z = ${floatLiteral(poi.pos[2])}`);
    if (poi.heading !== undefined) {
      lines.push(`const ${poi.id}_HEADING = ${floatLiteral(poi.heading)}`);
    }
    if (poi.radius !== undefined) {
      lines.push(`const ${poi.id}_RADIUS = ${floatLiteral(poi.radius)}`);
    }
    if (poi.halfExtent) {
      lines.push(
        `const ${poi.id}_HALF_EXTENT_X = ${floatLiteral(poi.halfExtent[0])}`,
      );
      lines.push(
        `const ${poi.id}_HALF_EXTENT_Y = ${floatLiteral(poi.halfExtent[1])}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
