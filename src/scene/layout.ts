import { Vector3 } from "three";
import { shot } from "../core/cameraRig";

// Where everything sits in the world, and every camera shot in the story.
// The welcome island (A) holds the robot's greeting and the magical door.
// The door leads to the garden island (B): the pocket at its front, wishes in the middle.

export interface IslandSpec {
  center: Vector3;
  radius: number;
  depth: number;
  seed: number;
}

const v = (x: number, y: number, z: number) => new Vector3(x, y, z);

export const ISLAND_A: IslandSpec = { center: v(0, 0, 0), radius: 7.5, depth: 6.5, seed: 3 };
export const ISLAND_B: IslandSpec = { center: v(46, -3, -40), radius: 11.5, depth: 9, seed: 11 };

/** Little decorative islands drifting around the two main ones. */
export const ISLETS: IslandSpec[] = [
  { center: v(-15, 3.5, -13), radius: 2.4, depth: 2.8, seed: 21 },
  { center: v(19, 6, -20), radius: 1.6, depth: 2.0, seed: 33 },
  { center: v(27, -8, -4), radius: 2.0, depth: 2.4, seed: 45 },
  { center: v(66, 2, -60), radius: 2.6, depth: 3.0, seed: 57 },
  { center: v(63, -7, -22), radius: 1.8, depth: 2.2, seed: 68 },
  { center: v(-9, -5, 15), radius: 1.5, depth: 1.8, seed: 79 },
  { center: v(30, 5, -52), radius: 1.7, depth: 2.0, seed: 88 },
];

export const SPOT = {
  robotWelcome: v(1.7, 0, 4.2),
  door: v(-0.8, 0, -2.4),
  robotDoor: v(1.45, 0, -1.7),
  pocket: v(46, -3, -33.2),
  robotPocket: v(44.4, -3, -34.2),
  gardenCenter: v(46, -3, -41.6),
  robotGarden: v(45.5, -3, -38.4),
  robotLetter: v(44.2, -3, -40.4),
  robotFinale: v(46, -3, -35.4),
};

export const SHOTS = {
  welcomeStart: shot([19, 11, 33], [0, 1, 0]),
  welcomeEnd: shot([4.4, 2.3, 10.8], [1.0, 1.2, 2.6]),
  door: shot([-0.45, 1.75, 4.8], [-0.8, 1.45, -2.4]),
  doorThrough: shot([-0.8, 1.35, -3.7], [-0.8, 1.3, -9]),
  pocketArrive: shot([46, -1.2, -23.5], [46, -1.6, -33.2]),
  pocket: shot([46.9, -1.0, -28.3], [46, -1.75, -33.2]),
  garden: shot([50.8, 0.9, -33.6], [45.8, -2.3, -41.6]),
  letter: shot([43.6, -1.9, -35.6], [46.5, -0.4, -44]),
  finaleStart: shot([46.5, -1.55, -31.6], [46, -2.0, -35.4]),
  // Portrait screens look along the line between the islands, so they stack vertically
  // (garden island mid-frame, welcome island below) instead of falling off the sides.
  finaleEnd: shot([78, 13, 30], [25, -2, -20], { pos: [-21, 18, 23], target: [23, 1, -19] }),
};
