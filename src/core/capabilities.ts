export type Tier = "high" | "medium" | "low";

export interface Capabilities {
  /** three.js needs WebGL 2. Without it we show the 2D garden instead. */
  webgl2: boolean;
  tier: Tier;
  coarsePointer: boolean;
}

/** Works out what this device can comfortably render. `?quality=low|medium|high` overrides it. */
export function detectCapabilities(): Capabilities {
  let webgl2 = false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    webgl2 = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl2 = false;
  }

  const coarsePointer = matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;

  let tier: Tier = coarsePointer ? "medium" : "high";
  if (cores <= 2 || memory <= 2) tier = "low";

  const forced = new URLSearchParams(location.search).get("quality");
  if (forced === "low" || forced === "medium" || forced === "high") tier = forced;
  if (new URLSearchParams(location.search).has("no3d")) webgl2 = false;

  return { webgl2, tier, coarsePointer };
}
