<img src="build/icon.png" alt="" width="96" />

# Sputnik

A minimalist desktop music player for Windows, macOS and Linux.

- Drop songs or whole folders, or add them from the menu. Reorder by dragging (or
  Alt+↑/↓), shuffle, repeat the list or one song.
- Save playlists, rename them in place, and import or export them as M3U8 (they open
  in VLC, foobar2000 and most players).
- Light and dark themes, plus a calm tint taken from the cover of the song that is
  playing. Text contrast is guaranteed (WCAG AA) for any cover.
- Keyboard shortcuts, media keys and the OS media controls. Spanish and English.
- Your queue, volume and settings are restored on the next start.

Plays MP3, AAC/M4A, FLAC, WAV, Ogg Vorbis and Opus (WMA and ALAC are not supported).

## Keyboard shortcuts

| Key                | Action                       |
| ------------------ | ---------------------------- |
| Space              | Play / pause                 |
| ← / →              | Seek 5 seconds               |
| ↑ / ↓              | Move the selection           |
| Enter              | Play the selected song       |
| Delete / Backspace | Remove the selected song     |
| Alt + ↑ / ↓        | Move the selected song       |
| M / S / R          | Mute / shuffle / repeat mode |
| Ctrl/Cmd + O       | Add songs                    |
| Ctrl/Cmd + S       | Save the playlist            |
| Ctrl/Cmd + E       | Export the playlist          |

## Download

Installers for every platform are built by GitHub Actions on each push (see the
Build workflow artifacts). They are not code-signed yet, so Windows SmartScreen and
macOS Gatekeeper will warn on first launch.

Size on Windows x64 (Electron 44):

|                                             | Installer | Installed |
| ------------------------------------------- | --------- | --------- |
| Sputnik                                     | 86.4 MB   | 296 MB    |
| Same app, default electron-builder settings | 111.5 MB  | 369 MB    |

Almost all of it is Chromium: the app itself is under 1 MB.

## Development

Requirements: Node.js 24 and pnpm 10.

```bash
pnpm install
pnpm dev          # Electron with hot reload
pnpm dev:web      # UI only, in the browser, with demo data
pnpm test         # unit and integration tests
pnpm dist         # installer for the current OS, in release/
```

Built with Electron, React 19 (with React Compiler), TypeScript, Vite, Tailwind CSS,
Zustand, dnd-kit and music-metadata. Tested with Vitest and Testing Library.

Architecture, conventions and procedures are in [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE)
