# Tickr Release Guide

## 1) Prepare a Release Build

Run from project root:

```bash
npm install
npm run tauri build
```

Output installer path:

`src-tauri/target/release/bundle/msi/`

Recommended installer filename format:

`Tickr-v1.0.0-windows-x64.msi`

## 2) Quick QA Before Sharing

Install the generated `.msi` on your machine and verify:

- Setup window opens
- Start launches running widget
- LCD task scroll works
- Commands work (`\PAUSE>`, `\RESUME>`, `\HALF>`, `\RUSH>`, `\BREAK N>`, `\BACK>`, `\RESET>`, `\RESTART>`, `\END>`, `\+N>`, `\-N>`)
- Final 15 seconds show danger color + ticking sound
- Completion message appears and restart/end commands work

## 3) Share With Users

Best options:

- GitHub Release (recommended)
- Product site download page
- Drive/Dropbox for private beta

Include these in your release post:

- App name: Tickr
- Version: `v1.0.0`
- Platform: Windows x64
- Installer file size
- Changelog highlights

## 4) SmartScreen Note (Unsigned Builds)

Unsigned Windows apps can show warnings.
Tell users:

1. Click **More info**
2. Click **Run anyway**

For public launch, use code signing to reduce warnings.

## 5) Suggested GitHub Release Template

Title:

`Tickr v1.0.0`

Body:

- Minimal ambient focus timer for Windows
- Command-driven running mode in LCD strip
- Placement presets (BR/TR/BL/TL)
- Time controls: `\HALF>`, `\RUSH>`, `\+N>`, `\-N>`
- Break flow: `\BREAK N>` and `\BACK>`

Download:

- `Tickr-v1.0.0-windows-x64.msi`

## 6) Version Bump Checklist (Next Releases)

Update before each release:

- `package.json` version
- `src-tauri/tauri.conf.json` version
- Changelog notes
- Build again with `npm run tauri build`

## 7) Optional Polish For Public Distribution

- Add code signing certificate
- Add privacy/support links in README
- Add in-app "About" with version
- Test install + uninstall on a clean Windows machine

## 8) Open Source Repo Notes

- License: MIT (`LICENSE`)
- Contributions: `CONTRIBUTING.md`
- Font attribution and license notes: `FONT_LICENSES.md`
