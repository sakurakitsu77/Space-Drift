# Space Drift

A cozy mobile space game built as a small multi-file HTML project.

## What is included

- `index.html` — app shell
- `styles.css` — full-screen mobile layout and cozy cosmic theme
- `game.js` — gameplay, canvas rendering, touch steering, audio, and UI wiring

## Liquid Glass UI

This project is wired to the Liquid Glass JS library from the repository you linked. The repo’s README shows the documented setup with `html2canvas`, `container.js`, and `button.js`, and describes the library as a WebGL-powered glass UI system with rounded, circle, and pill shapes. It also notes the browser support / WebGL requirements and the file layout used by the library. citeturn420454view0

The start and pause buttons are created through the library when it is available. If the library fails to load, the game falls back to clean styled HTML buttons.

## Gameplay

- Drag anywhere in the lower part of the screen to steer the ship
- Collect glowing shards to build harmony and score
- Avoid comets for soft penalties, not game-ending punishment
- Zones shift over time into different ambient looks
- No harsh fail loop; it is meant to feel calm and drifting

## Notes

- The layout uses `100dvh`, dark theme colors, and safe-area spacing to avoid the white-bar / mobile browser frame issue.
- It is designed to work well on mobile first, but keyboard input still works on desktop.

## Run it

Open `index.html` from a local web server or host the folder on GitHub Pages.
