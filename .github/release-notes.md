## Download

| System                | File                                  |
| --------------------- | ------------------------------------- |
| Windows 10/11 (x64)   | `Sputnik-*-setup.exe`                 |
| macOS (Apple Silicon) | `Sputnik-*-arm64.dmg`                 |
| macOS (Intel)         | `Sputnik-*-x64.dmg`                   |
| Linux                 | `Sputnik-*-x86_64.AppImage` or `.deb` |

## First launch: the installers are not signed

Signing needs paid certificates from Microsoft and Apple, so the system warns the
first time you open Sputnik. The app is safe to run:

- **Windows**: in "Windows protected your PC", click **More info**, then **Run
  anyway**.
- **macOS**: drag Sputnik to Applications, then right-click it and choose **Open**
  (twice). If macOS says the app "is damaged and can't be opened", run
  `xattr -cr /Applications/Sputnik.app` in Terminal once and open it again.
- **Linux**: `chmod +x Sputnik-*.AppImage`, or install the `.deb` with
  `sudo apt install ./Sputnik-*.deb`.
