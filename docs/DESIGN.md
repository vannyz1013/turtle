# Design

## Feeling

Warm, comforting, whimsical, gentle. A small magical world in the clouds rather than a web page.
Soft light, rounded shapes, slow motion. Nothing loud or sudden, no goals, timers or scores.

## Palette

| Token | Colour | Use |
|---|---|---|
| `--ivory` | `#FAF8F1` | Horizon, paper, robot accents |
| `--sky` | `#A9D6EB` | Sky, door, pocket lid, robot family |
| `--powder` | `#C7E5F2` | Upper sky haze |
| `--sage` | `#A7B99A` | Grass, leaves |
| `--yellow` | `#F5DF9B` | Sunlight, door frame, star charms, buttons |
| `--pink` | `#E8BFC0` | Blossoms, blush, envelope |

Supporting tones live in `src/edition/palette.ts`; interface tokens in `src/edition/theme.css`. Text uses warm ink `#4E4A47`.
Fonts: Fredoka (headings) and Nunito (body), self-hosted; Chinese falls back to the system CJK font
(PingFang SC, Microsoft YaHei, Noto Sans SC). Text is Simplified Chinese first, with natural English touches.

## Experience

One continuous 3D world: a welcome island and a garden island, joined by the magical door.
The camera travels between "shots" defined in `src/scene/layout.ts`.

1. **Welcome**: the camera drifts in to Sunny, who waves. Button: "出发吧！".
2. **The magical door**: hover glows, a tap swings it open, the camera passes through the light.
3. **A pocket full of happiness**: a floating capsule; each tap opens it with sparkles and a new wish.
4. **A garden of wishes**: twelve flowers bloom on tap; the whole garden gains colour and butterflies.
5. **A little message**: an envelope opens and the letter unfolds (`src/edition/greeting.ts`).
6. **See you soon**: golden sky, stars, petals; the camera pulls back over both islands. Button: "再逛一次花园".

Every 3D interaction also has a button, so the whole journey works with a keyboard.

## Originality

The companion robot, the door and the box are **original designs**. In particular the robot must not
resemble Doraemon or any other existing character: no cat features, no bell, no belly pocket,
and the door is not a pink "Anywhere Door". Its shape, face and colours are our own.

How the current designs meet this:

- **Sunny (robot)**: one gumdrop-shaped body (no separate head), no legs (hovers on a ring of light),
  a dark glossy screen face with glowing eyes, ivory ear-pods, and a small star on its antenna.
- **Door**: free-standing arch in pale gold and powder blue, round porthole with a star, sun keystone,
  climbing blossoms, orbiting lights.
- **Pocket**: a floating yellow-and-blue capsule with a sun emblem and gold rings above a pedestal.

## Audio

Generated in code (Web Audio): calm piano in F major, a soft pad, small chimes. Off until the visitor
presses "Music on".

## Performance and accessibility

- Everything is procedural; there are no model, texture or audio files.
- three.js loads lazily behind the loading screen.
- Quality tiers by device. Bloom is computed at half resolution. If frames are slow at runtime,
  anti-aliasing drops from 4x to 2x MSAA first, then the pixel ratio drops, then bloom turns off.
- Portrait screens get their own finale framing (`portrait` in `src/scene/layout.ts`), so both islands stay in view.
- `prefers-reduced-motion`: camera flights become fades and idle motion is calmer.
- No WebGL 2: a 2D page with the same messages and letter.
- Test switches: `?quality=low|medium|high`, `?motion=reduced`, `?no3d`.
