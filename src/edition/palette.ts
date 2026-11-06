import type { EditionPalette } from "../core/edition";

// Public edition: colours for the 3D world.
// The six core colours from the brief, plus supporting tones mixed from them.
export const C = {
  ivory: "#FAF8F1",
  sky: "#A9D6EB",
  powder: "#C7E5F2",
  sage: "#A7B99A",
  yellow: "#F5DF9B",
  pink: "#E8BFC0",

  robotBlue: "#7FBCE2",
  deepSage: "#8DA383",
  leaf: "#B9CAA7",
  soil: "#E2C3A0",
  soilDeep: "#CDA88E",
  rock: "#B9A6A8",
  stone: "#ECE5D8",
  trunk: "#CDAE90",
  gold: "#E9C878",
  lilac: "#D5C5E8",
  peach: "#F5C8A9",
  rose: "#F0A9B5",
  bluebell: "#9CCBEA",
  ink: "#4E4A47",
} as const satisfies EditionPalette;

export const FLOWER_TONES = [C.pink, C.yellow, C.ivory, C.powder, C.lilac, C.peach, C.rose, C.bluebell] as const;
