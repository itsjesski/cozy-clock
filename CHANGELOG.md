# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-03-17

### Added
- Update mascot settings and improve alert cue handling

---

[Full commit history](https://github.com/itsjesski/cozy-clock/commits/main)

## [1.1.9] - 2026-03-17

### Added
- Enhance updater logic to validate artifacts and download latest release

---

[Full commit history](https://github.com/itsjesski/cozy-clock/commits/main)

## [1.1.8] - 2026-03-17

### Fixed
- Update release action to create draft releases and disable makeLatest

---

[Full commit history](https://github.com/itsjesski/cozy-clock/commits/main)

## [1.1.7] - 2026-03-17

### Added
- Implement updater status functionality and integrate with IPC

---

[Full commit history](https://github.com/itsjesski/cozy-clock/commits/main)

## [1.1.6] - 2026-03-17

### Added
- Add next timer phase functionality and UI integration
- Add Streamer Mode for OBS capture

### Fixed
- Update renderer loading path to use app.getAppPath()

---

[Full commit history](https://github.com/itsjesski/cozy-clock/commits/main)

## [1.1.5] - 2026-03-17

### Added
- Add comprehensive error logging for renderer loading diagnostics

### Changed
- - Log startup flow to diagnose white screen issues
- - Add error handlers for did-fail-load and render-process-gone
- - Will help identify if issues occur in packaged vs dev mode
- 

### Fixed
- Load packaged renderer from correct production path

---

[Full commit history](https://github.com/itsjesski/cozy-clock/commits/main)

## [1.1.4] - 2026-03-17

### Fixed
- Packaged app asset loading and improve release icon clarity

### Documentation
- Mark releases as latest and add README download button

---

[Full commit history](https://github.com/itsjesski/cozy-clock/commits/main)

## [1.1.3] - 2026-03-17

### Fixed
- Disable electron-builder implicit publish in CI builds

---

[Full commit history](https://github.com/itsjesski/cozy-clock/commits/main)

## [1.1.2] - 2026-03-17

### Fixed
- Correct repo name case, engines version, and explicit CI token
- Add missing author field to package.json for electron-builder
- Remove deprecated electron-builder win signing properties

---

[Full commit history](https://github.com/itsjesski/cozy-clock/commits/main)

## [1.1.1] - 2026-03-17

### Documentation
- Add terser as explicit dev dependency for Vite build

---

[Full commit history](https://github.com/itsjesski/cozy-clock/commits/main)

## [1.1.0] - 2026-03-17

### Documentation
- Track package-lock.json for reproducible CI builds

---

[Full commit history](https://github.com/itsjesski/cozy-clock/commits/main)

## [1.0.0] - 2026-03-17

### Added
- Implement timer creation and management hooks
- Add Zustand store for managing individual timer states

### Changed
- - Introduce `useTimerTileRuntime` to manage timer state and interactions.
- - Create `useTimerTileSettings` for configurable timer settings with global store integration.
- - Implement `useTimerTileStats` to track and display timer statistics over different periods.
- - Add `useUpdaterModal` for managing update notifications and downloads.
- - Define default timer values in `timerDefaults.ts` for consistency across timer types.
- - Implement phase resolution and total duration calculation in `timerPhase.ts` for timer logic.
- 
- Refactor timer store and utilities; add new timer configuration and control functions
- - Introduced utility functions for circular index navigation in timers.
- - Added timer configuration factory to build timer settings based on type and mode.
- - Created timer control functions to manage play/pause labels.
- - Implemented timer math utilities for sanitizing inputs and converting minutes to seconds.
- - Added functions to resolve timer modes based on app settings.
- - Created phase management utilities for timers, including phase labels and duration calculations.
- - Developed timer statistics utilities for handling period stats and live stats categories.
- - Introduced a custom hook for IPC subscription management.
- - Updated global store to use a factory function for default app settings.
- - Added multiple theme styles for the application.
- - Created utility for converting files to data URLs.
- - Updated constants and default settings for improved theme management.
- - Enhanced IPC communication with new actions for sound file handling and server port management.
- - Refactored server port utilities for validation and parsing.
- - Updated Vite configuration to reflect changes in server port handling.
- 
- - Added methods to set timer phase, elapsed time, remaining time, and to update the timer state.
- - Introduced functions to retrieve, delete, and list all timer stores.
- 
- Initial commit: Cozy Clock - Performance-optimized timer app with tray support
- - Multi-timer support (sit/stand, pomodoro, generic countdown)
- - System tray integration with minimize-to-tray functionality
- - Persistent timer state restoration across app restarts
- - Real-time stats tracking (sit/stand/work/break breakdown)
- - Configurable server port with conflict detection
- - Compact and full-screen UI modes
- - Always-on-top window option
- - Dark theme with accent colors
- - Timer continuity: restore last known state on app relaunch
- - Performance optimizations: IPC throttling, settings caching, hidden window optimization
- - Streamer mode with separate stats windows
- - Update management and automatic checks
- - Pixel art mascot character with animations
- - CSV export for stats data
- 
- Recent improvements:
- - Fixed timer state hydration for sit/stand and pomodoro multi-phase timers
- - Redesigned per-tile stats UI with category toggles (no more scrollbars)
- - Resilient tray icon management with executable fallback
- - Renamed devServerPort to serverPort (works in both dev and production)
- - Added port conflict detection modal with option to change port and restart
- - Applied low-RAM optimizations (V8 heap limit, GPU compositing disable)
- - Optimized IPC tick throttling (250ms) and settings caching (1s TTL)
- - Uses mascot pixel art image for tray icon when available
- 

---

[Full commit history](https://github.com/itsjesski/cozy-clock/commits/main)

## [0.1.0] - 2026-03-16

### Added

- Initial project scaffold with Electron, React, Vite, and TypeScript
- Project folder structure and modular organization
- Type definitions for timers, stats, and IPC communication
- Zustand store setup (global, timer, and stats stores)
- Main process infrastructure (electron-store, auto-updater, system tray)
- Basic Dashboard and TimerTile components
- Cozy Light and Cozy Dark themes with CSS variable system
- GitHub Actions release workflow
- Release script for semantic versioning
- Documentation (README, CONTRIBUTING, DEVELOPER guide)

### In Progress

- Phase 2: Timer Engine + Core Timer Types (next)
