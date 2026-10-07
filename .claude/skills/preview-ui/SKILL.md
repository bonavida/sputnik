---
name: preview-ui
description: See and iterate on Sputnik's UI. Use when changing layout, styles, themes, the cover tint or copy, or when asked to show how the app looks. Covers the browser demo with forced states and screenshots of the real Electron window.
---

# Preview the UI

## 1. Browser demo (fast iteration)

`pnpm dev:web` runs the renderer alone with `src/demo/demoBridge.ts`: demo songs,
generated cover art in different colors and a silent WAV so play, pause and seek
work. Open it in the built-in browser (launch config `sputnik-web`, port 5174, or
`pnpm dev:web --port 5174`).

Force a state with URL parameters:

| Parameter | Values                                               | Default   |
| --------- | ---------------------------------------------------- | --------- |
| `theme`   | `system`, `light`, `dark`                            | `system`  |
| `tint`    | `1` (cover color on), `0`                            | `1`       |
| `locale`  | `system`, `es`, `en`                                 | `system`  |
| `state`   | `playing`, `empty`, `long-names`, `many` (500 songs) | `playing` |

Example: `http://localhost:5174/?theme=dark&state=long-names&locale=en`

For every visual change, check at least:

- Widths 380, 720 and 1200 px (resize the browser viewport), light and dark,
  with tint on and off, and `long-names` (truncation) and `empty`.
- Double click a song with another cover color: the whole palette changes and text
  stays readable. Contrast is guaranteed by `src/utils/color.ts`; never hardcode colors.
- Keyboard: Tab through the controls (visible focus), arrows in the list, menus with
  arrows and Escape.

The demo has no native title bar overlay and no real files; anything involving the
main process must be checked in Electron (below).

## 2. Real Electron window

```bash
REMOTE_DEBUGGING_PORT=9333 pnpm dev
node scripts/devtools.mjs screenshot window.png
node scripts/devtools.mjs eval "document.querySelectorAll('[role=option]').length"
```

In dev, `eval` can reach the app modules, for example
`(await import('/src/app/actions.ts')).importPaths(['C:\\path\\to\\music'])`. Test audio with
cover art can be generated with `electron/testing/makeAudio.ts`. Stop the dev process
when done (it also locks folders on Windows).

Packaged build: `release/win-unpacked/Sputnik.exe --remote-debugging-port=9333`
(production loads from `sputnik://app/`, with the CSP active).
