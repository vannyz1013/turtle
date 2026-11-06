# Design

## Feeling

Warm, cute, dreamy, healing. Soft light, rounded shapes, slow gentle motion. Nothing loud or sudden.

## Palette (starting point)

| Token | Colour | Use |
|---|---|---|
| `--sun` | `#FFD36E` | Sunlight, highlights |
| `--cream` | `#FFF4D6` | Background, paper |
| `--sky` | `#BFE3FF` | Sky, the robot's blue family |
| `--ink` | `#4A3B2F` | Text |

## Experience (draft order)

1. Arrive in the magical garden; the companion robot greets the visitor.
2. Flowers respond when touched or hovered.
3. The magical door opens onto the next part of the garden.
4. The surprise box opens.
5. The personal letter appears.

## Originality

The companion robot, the door and the box are **original designs**. In particular the robot must not
resemble Doraemon or any other existing character: no cat features, no bell, no belly pocket,
and the door is not a pink "Anywhere Door". Its shape, face and colours are our own.

## Performance budget

- Target phones as well as laptops: keep draw calls and texture sizes small.
- Compress models (glTF/GLB, Draco or Meshopt) and textures (WebP/KTX2) before adding them.
- Respect `prefers-reduced-motion`.
