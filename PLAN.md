# Cozy Clock - Project Plan

## Project Overview
A customizable sit/stand, pomodoro, and generic timer desktop app with a cute, modular dashboard for Windows. Built with Electron, React, Vite, and TypeScript.

**Repository:** https://github.com/itsjesski/CozyClock.git

## Key Features

### Timer Types
- **Sit/Stand Timer** — configurable sit/stand duration, auto-loop
- **Pomodoro Timer** — work interval, short/long breaks, configurable rounds
- **Generic Timer** — simple countdown or count-up with label

### Display & Personalization
- **Clock Display Modes** (per-tile): Digital, Analog, Progress Ring, Flip Clock, Minimal Text
- **Themes**: Cozy Light, Cozy Dark, Sakura, Forest, Neon, Paper
- **User Mascot** — upload custom image for character/mascot display
- **Per-Tile Settings** — accent color, display mode, alert sounds, inspirational messages

### Advanced Features
- **Streamer Mode** — pop-out transparent timer windows for OBS capture (separate BrowserWindow, frameless, configurable chroma key)
- **Timer Continuity**
  - "Continue from last time" — resume at saved position (paused state)
  - "Continue while app closed" — tracks wall-clock time, fast-forwards when resumed
- **Alert Sounds** — user-supplied audio files, per-event per-tile, volume control
- **Inspirational Messages** — configurable % thresholds, toast overlay display
- **Stats Dashboard**
  - Rolling stats: Today, Yesterday, Last 7 Days, This Month
  - Lifetime stats (never auto-resets)
  - Manual reset + auto-reset schedule options (daily/weekly/monthly)
  - Visual charts + counters
  - Export to JSON/CSV

### UX & Performance
- Low resource usage (tick engine in main process, optimized renderer)
- System tray integration (minimize to tray, restore, quit)
- Always-on-top toggle per window
- Keyboard shortcuts (space = pause/resume, R = reset)
- First-launch onboarding
- Auto-update via electron-updater (checks GitHub Releases on startup)

## Tech Stack

| Layer | Choice |
|---|---|
| Shell | Electron 27+ |
| Frontend | React 18 + Vite 5 |
| Language | TypeScript |
| Styling | CSS Modules + CSS Variables |
| State | Zustand (slice per timer + global) |
| Storage | electron-store (typed schema) |
| Audio | Howler.js |
| Charts | Recharts |
| Packaging | electron-builder |
| Auto-update | electron-updater |
| Release CI | GitHub Actions |

## Folder Structure

```
src/
  main/                      # Electron main process
    index.ts               # App entry, BrowserWindow setup
    updater.ts             # electron-updater logic
    tray.ts                # System tray management
    store.ts               # electron-store typed wrapper + IPC handlers
    timerEngine.ts         # setInterval tick engine, IPC broadcast
    resumeEngine.ts        # Timer continuity logic
    streamerWindows.ts     # Manages transparent BrowserWindows for streaming
    ipcHandlers/           # IPC event handlers (organized by domain)
      timerHandlers.ts
      settingsHandlers.ts
      statsHandlers.ts
      streamerHandlers.ts
  renderer/                  # React app (Vite)
    components/
      Dashboard/           # Main dashboard layout + grid
      TimerTile/           # Reusable timer tile component
      ClockFaces/          # Display mode implementations
        DigitalClock.tsx
        AnalogClock.tsx
        RingClock.tsx
        FlipClock.tsx
        MinimalClock.tsx
      StatsPage/           # Stats dashboard + charts
      SettingsPanel/       # Global + per-timer settings
      InspirationOverlay/  # Inspirational message display
      MascotDisplay/       # User mascot image display
      SystemTray/          # System tray UI
    store/                 # Zustand store
      timerStore.ts        # Timer state + actions (one per timer)
      globalStore.ts       # App-wide state (settings, stats, UI)
      statsStore.ts        # Stats and history
    themes/                # CSS variables per theme
      variables.ts         # Theme token definitions
      light.css
      dark.css
      sakura.css
      forest.css
      neon.css
      paper.css
    assets/                # SVGs, icons, placeholder art
    types.ts               # Renderer-specific types (if needed)
    App.tsx                # Root component
    main.tsx               # Vite entry point
    app.css                # Global styles
  preload.ts               # Electron preload script (context bridge)
  types/                   # Shared TypeScript types
    index.ts
  shared/                  # Shared utilities
    constants.ts           # App constants, magic strings
    ipc.ts                 # IPC channel names (single source of truth)
    utils.ts               # Shared utility functions

.github/
  workflows/
    release.yml            # GitHub Actions release pipeline
  copilot-instructions.md  # Workspace instructions

scripts/
  release.ts               # Release script (version bump, changelog, tag)
  generate-changelog.ts    # Auto-generate CHANGELOG from commits

root/
  .gitignore
  .prettierrc.json
  .eslintrc.cjs
  electron-builder.yml     # electron-builder config
  vite.config.ts           # Vite config
  tsconfig.json            # Shared TypeScript config
  tsconfig.main.json       # Main process config
  tsconfig.renderer.json   # Renderer config
  package.json
  pnpm-lock.yaml (or package-lock.json)
  
  README.md
  CHANGELOG.md
  CONTRIBUTING.md
  DEVELOPER.md
  LICENSE (GPL-2.0-or-later)
  PLAN.md (this file)
```

## Phased Delivery

### Phase 1: Foundation + Release Pipeline ✅ COMPLETE

**Objectives:**
- [x] Scaffold project with TypeScript, Electron, React, Vite
- [x] Create full folder structure
- [x] Set up TypeScript configuration (separate for main/renderer)
- [x] Create shared type definitions and IPC channels
- [x] Implement electron-store typed schema
- [x] Create main process entry point + window setup
- [x] Implement preload script with context bridge
- [x] Set up Zustand stores (global, timer, stats)
- [x] Create Dashboard and TimerTile component skeletons
- [x] Wire IPC communication infrastructure
- [x] Create electron-builder configuration
- [x] Set up GitHub Actions release workflow
- [x] Create release scripts for semantic versioning
- [x] Create documentation (README, CONTRIBUTING, DEVELOPER)
- [x] Set up themes (Cozy Light, Cozy Dark)
- [x] Create clock display mode components (stubs)
- [x] All TypeScript type-checking passing

**Status:** ✅ Complete

**Next:** Phase 2 - Timer Engine + Core Timer Types

---

### Phase 2: Timer Engine + Core Timer Types ✅ COMPLETE

**Objectives:**
- [x] Complete timer engine implementation in main process
- [x] Implement resume logic (both continuity modes)
- [x] Create SitStandTimer logic
- [x] Create PomodoroTimer logic
- [x] Create GenericTimer logic
- [x] Wire timer state persistence
- [x] Implement play/pause/resume/reset logic
- [ ] Add user-supplied alert sound support (file picker)
- [x] Wire IPC handlers for timer operations
- [x] Test timer lifecycle and state management

**Estimated Scope:** Medium
**Timeline:** 1-2 work sessions

**Status:** ✅ Complete (audio picker deferred)

---

### Phase 3: Clock Display Modes ✅ COMPLETE

**Objectives:**
- [x] Implement DigitalClock (complete)
- [x] Implement AnalogClock (SVG with hands)
- [x] Implement RingClock (progress ring)
- [x] Implement FlipClock (card flip animation)
- [x] Implement MinimalClock (text only)
- [x] Add display mode toggle per tile
- [x] Smooth animations for all modes

**Estimated Scope:** Medium
**Timeline:** 1-2 work sessions

**Status:** ✅ Complete (animation polish ongoing)

---

### Phase 4: Themes + Visual Design + Mascot

**Objectives:**
- [x] Implement CSS variable theme system
- [x] Create 6 built-in themes
- [x] Theme selector in settings
- [x] Per-tile accent color override
- [x] Mascot upload + display logic
- [x] Mascot positioning and sizing
- [x] Basic mascot animations (shake, wiggle, etc) when timers hit certain percentages. User configurable per clock / global.
- [x] Cute SVG/placeholder assets
- [x] Implement a global settings modal that will let people change the app theme, the clock defaults, etc. 
- [x] Add an "update available" button next to the settings button when an update is available.

**Estimated Scope:** Medium
**Timeline:** 1-2 work sessions

**Status:** ✅ Complete

---

### Phase 5: Polish & Accessibility

**Objectives:**
- [x] System tray integration (minimize, restore, quit)
- [x] Always-on-top toggle
- [x] Compact/mini mode
- [x] Accessibility (ARIA labels, semantic HTML)
- [x] Error handling + open log button in bottom of settings menu.
- [x] Make sure any and all windows from this app do not open off screen.
- [x] Add "continue from where the timer left off" option to global and clock specific settings. Default to no. This setting makes it where the timer will set itself to whatever it was at when the app closed last.
- [x] Add "Keep the clock going" option to global and clock specific. Default to no. This setting makes it where the timer will "keep counting" when the app is closed and then pick up when started. We can do this by logging time on close and then calculating where the clock should be on start.

**Estimated Scope:** Medium
**Timeline:** 1-2 work sessions

**Status:** ✅ Complete

---

### Phase 6: Stats

**Objectives:**
- [x] Change the global settings button to be a dropdown. Have options for settings, stats, and open log, and a toggle for compact mode or not. Remove log and compact from main settings menu. Might as well add a quit as well.
- [x] Implement stats collection (per cycle end)
- [x] electron-store schema for stats + history
- [x] Create StatsPage component with charts
- [x] Rolling stats view (Today, Yesterday, Week, Month)
- [x] Lifetime stats (separate, manual reset only)
- [x] Auto-reset schedule logic
- [x] Manual reset with confirmation
- [x] Export to JSON/CSV

**Estimated Scope:** High
**Timeline:** 2-3 work sessions

**Status:** ✅ Complete

---

**Next:** Phase 7 - Streamer Mode

---

### Phase 7: Streamer Mode

**Objectives:**
- [ ] Implement StreamerWindowManager
- [ ] Per-tile "Pop Out" button
- [ ] IPC communication for streamer windows
- [ ] Background configuration (transparent or chroma key)
- [ ] Drop shadow/outline for visibility
- [ ] Window position (except if off screen) + size persistence

**Estimated Scope:** High
**Timeline:** 1-2 work sessions

---

## Development Commands

```bash
# Install dependencies
npm install

# Development (Vite + Electron in parallel)
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build

# Create release (bumps version, generates changelog, tags)
npm run release
```

## File Naming Conventions

- Components: `PascalCase.tsx` (e.g., `Dashboard.tsx`)
- Utilities/Stores: `camelCase.ts` (e.g., `timerStore.ts`)
- Types: filename matches export (e.g., `types/index.ts`)
- IPC Handlers: organized by domain in `ipcHandlers/` folder
- CSS Modules: `ComponentName.module.css`
- Themes: `themeName.css`

## Notes

- **Low Resource Usage (VRSleep principle):**
  - Timer ticks in main process, not renderer
  - Only active tiles re-render per tick (Zustand slices)
  - electron-store writes debounced
  - Audio lazily loaded/unloaded
  - No background polling or telemetry

- **Always Build for Windows .exe installer** via electron-builder NSIS config

- **GPL-2.0-or-later License** — derivatives must be GPL-2.0+

- **IPC channels** defined in `/src/shared/ipc.ts` as constants (single source of truth)

---

**Status as of March 16, 2026:** Foundation through Phase 6 complete. Phase 7 ready to start.
