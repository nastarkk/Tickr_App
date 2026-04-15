# Tickr (Tauri)

A minimal desktop cross-platform ambient focus timer built with Tauri + Vanilla JS, featuring LCD-style command controls and break mode.

## Run

1. Install dependencies:
   npm install
2. Start in dev mode:
   npm run tauri dev

## Build

```bash
npm run tauri build
```

## Journey

1. App opens in the center with a setup window.
2. Enter task + minutes, choose placement (BR/TR/BL/TL), then click **Start Focus Session**.
3. Setup view transitions into compact running widget.
4. Running controls are command-driven via the top LCD task strip.

## Commands

- `\PAUSE>`
- `\RESUME>`
- `\HALF>`
- `\RUSH>`
- `\BREAK N>`
- `\BACK>`
- `\RESET>`
- `\RESTART>`
- `\END>`
- `\+N>`
- `\-N>`

## Notes

- Click the scrolling task text to open command input.
- Press `Esc` to close command input without action.
- Window behavior and startup size are in `src-tauri/tauri.conf.json`.

## Open Source

- License: MIT (see `LICENSE`)
- Contribution guide: `CONTRIBUTING.md`
- Font attributions/licenses: `FONT_LICENSES.md`

## Screenshots

### 1. Setup Window
Enter your task, set timer duration, choose where the running widget should appear, and start the focus session.

![Setup Window](./docs/screenshots/setup-window.png)

### 2. Running Window
Compact always-on-top timer with LCD strip, countdown display, and visual urgency as time gets low.

![Running Window](./docs/screenshots/running-window.png)

### 3. Command Input
Click the moving LCD task text to open command mode and control the timer with quick commands.

![Command Input](./docs/screenshots/command-input.png)
