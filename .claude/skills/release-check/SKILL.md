---
name: release-check
description: Build the installer and check it against Sputnik's size budget and hardening. Use before publishing a version, after upgrading Electron or electron-builder, or before adding any dependency.
---

# Release check

Size matters for this project: every megabyte must be justified.

## Budget (Windows x64, Electron 44)

|                                    | Budget   | Last measured |
| ---------------------------------- | -------- | ------------- |
| NSIS installer                     | ≤ 90 MB  | 86.4 MB       |
| Installed (`release/win-unpacked`) | ≤ 300 MB | 296 MB        |
| `resources/app.asar`               | ≤ 2 MB   | 0.7 MB        |

Without the optimizations the same build is 111.5 MB / 369 MB.

## Steps

1. Stop `pnpm dev` / `pnpm dev:web` (Windows: a watched `release/` breaks packaging
   with `EPERM`). Then `pnpm typecheck && pnpm lint && pnpm test`.
2. `pnpm dist:win` and measure:
   ```bash
   ls -la release/*.exe
   du -sh release/win-unpacked release/win-unpacked/resources/app.asar
   ```
3. **Nothing extra in the asar** (only `dist/`, `dist-electron/` and `package.json`):
   ```bash
   pnpm dlx @electron/asar list release/win-unpacked/resources/app.asar
   ```
   A `node_modules` entry means something leaked into `dependencies`; two hashed
   copies of the same chunk mean `dist-electron/` was not cleaned (`pnpm build` does it).
4. **Locales**: `ls release/win-unpacked/locales` shows only `en-US.pak` and `es.pak`.
5. **Fuses**: `pnpm dlx @electron/fuses read --app release/win-unpacked/Sputnik.exe`
   shows RunAsNode, NODE_OPTIONS and inspect disabled, asar integrity and
   only-load-from-asar enabled.
6. **Smoke test the packaged app** (copy it to a short path first if the repo path is
   long):
   ```bash
   release/win-unpacked/Sputnik.exe --remote-debugging-port=9333
   node scripts/devtools.mjs eval "location.href"   # sputnik://app/index.html
   node scripts/devtools.mjs eval "(() => { try { eval('1'); return 'CSP off!'; } catch { return 'CSP on'; } })()"
   node scripts/devtools.mjs screenshot packaged.png
   ```
   Play a song, check covers load, then close the app.
7. If `scripts/afterPack.cjs` removes files, confirm after Electron upgrades that the
   app still renders and plays without them.
8. Update the "Last measured" column above and the size table in the README.

macOS and Linux installers are built by CI (`.github/workflows/build.yml`); download
the artifacts and check their sizes too.
