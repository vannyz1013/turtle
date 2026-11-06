import { Color, DirectionalLight, HemisphereLight, Scene, Vector3 } from "three";
import type { Tier } from "../core/capabilities";

const DAY = {
  sun: new Color("#FFF2DA"),
  sunIntensity: 2.5,
  sky: new Color("#D3EAF5"),
  ground: new Color("#BCCBA6"),
  hemiIntensity: 1.25,
  offset: new Vector3(-7, 14, 9),
};
const GOLD = {
  sun: new Color("#FFC98E"),
  sunIntensity: 2.3,
  sky: new Color("#FFE1C2"),
  ground: new Color("#D9B997"),
  hemiIntensity: 1.15,
  offset: new Vector3(-9, 8, 10),
};

/**
 * Warm key light with soft shadows plus a sky/ground fill. The shadow camera follows
 * whichever part of the world the story is in, so shadows stay crisp with a small map.
 */
export class Lights {
  readonly sun = new DirectionalLight(DAY.sun, DAY.sunIntensity);
  readonly hemi = new HemisphereLight(DAY.sky, DAY.ground, DAY.hemiIntensity);
  private readonly focus = new Vector3();
  private readonly offset = DAY.offset.clone();

  constructor(scene: Scene, tier: Tier) {
    const s = this.sun;
    s.castShadow = tier !== "low";
    const size = tier === "high" ? 2048 : 1024;
    s.shadow.mapSize.set(size, size);
    const cam = s.shadow.camera;
    cam.left = cam.bottom = -13;
    cam.right = cam.top = 13;
    cam.near = 1;
    cam.far = 60;
    s.shadow.bias = -0.0004;
    s.shadow.normalBias = 0.03;
    s.shadow.radius = 4;
    scene.add(s, s.target, this.hemi);
    this.setFocus(new Vector3());
  }

  setFocus(p: Vector3): void {
    this.focus.copy(p);
    this.apply();
  }

  setGolden(g: number): void {
    this.sun.color.lerpColors(DAY.sun, GOLD.sun, g);
    this.sun.intensity = DAY.sunIntensity + (GOLD.sunIntensity - DAY.sunIntensity) * g;
    this.hemi.color.lerpColors(DAY.sky, GOLD.sky, g);
    this.hemi.groundColor.lerpColors(DAY.ground, GOLD.ground, g);
    this.hemi.intensity = DAY.hemiIntensity + (GOLD.hemiIntensity - DAY.hemiIntensity) * g;
    this.offset.lerpVectors(DAY.offset, GOLD.offset, g);
    this.apply();
  }

  private apply(): void {
    this.sun.target.position.copy(this.focus);
    this.sun.position.copy(this.focus).add(this.offset);
    this.sun.target.updateMatrixWorld();
  }
}
