# ICPC HUE Lesson Video: Blue Design System

## Style Prompt
Clean, confident, technical. A deep navy canvas with one saturated brand blue and a cool sky highlight. Big, tight type, lots of breathing room, motion that is quick and decisive (blue panels sweep across the frame, text rises into place). It should feel like a coding-community lesson, not a corporate deck.

## Colors
| Role | Hex |
|---|---|
| Ground (deep navy) | `#06152B` |
| Surface (navy) | `#0B2A55` |
| Brand blue (logo blue, transition panel) | `#1F65A4` |
| Sky (highlights, Arabic text, progress) | `#5AB0FF` |
| Ink (main text) | `#F4F8FF` |
| Muted ink (sub text) | `#9DB6D6` |

The ICPC HUE logo keeps its own gold; do not recolor it and do not use gold anywhere else.

## Typography
- Display and UI: **Inter**, weight 800 for titles, 600 for labels. Tight tracking (-0.02em) on big type, +0.18em on small uppercase labels.
- Arabic: **Noto Kufi Arabic**, weight 700, right-to-left. Sits under or next to the English title, in Sky.

## Motion
- Entrance only inside a card. The exit is the blue panel sweep, so the first and last frame of every card is solid brand blue `#1F65A4`. The video fades in from and out to that same blue.
- Eases: `power4.out` for panels, `expo.out` for titles, `power2.out` for small labels. Stagger 0.08-0.12s.
- Card length 3.6s. Lower third 7s, enters at 0.4s, leaves at 6.3s.

## What NOT to Do
- No gold, red or green accents; no pure black.
- No drop shadows heavier than a soft glow; no gradients across the full frame on the navy (banding), use radial glows.
- No text under 24px; never cover the centre of the screen-share with the lower third.
- No `Math.random()` or infinite repeats.
