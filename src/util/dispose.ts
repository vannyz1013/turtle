import { Material, Mesh, Object3D, Points, Sprite, Texture } from "three";

/** Frees every geometry, material and texture under `root`. */
export function disposeTree(root: Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof Mesh || obj instanceof Points || obj instanceof Sprite) {
      obj.geometry?.dispose();
      const mats: Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach(disposeMaterial);
    }
  });
}

export function disposeMaterial(mat: Material | undefined): void {
  if (!mat) return;
  for (const value of Object.values(mat)) {
    if (value instanceof Texture) value.dispose();
  }
  mat.dispose();
}
