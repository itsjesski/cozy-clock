# Cozy Clock - Developer Guide

This guide covers architecture, development practices, and implementation details for contributors.

## Architecture Overview

Cozy Clock follows a main-process/renderer-process architecture:

### Main Process (`src/main/`)

Runs in the background and handles:
- **Timer Engine** — core tick loop (setInterval-based)
- **Data Persistence** — electron-store for all app state
- **System Integration** — tray, shortcuts, auto-updates
- **IPC Communication** — sends timer ticks to renderer, receives commands

### Renderer Process (`src/renderer/`)

React app that handles:
- **UI Rendering** — components for timers, stats, settings
- **User Input** — interacts with timers via IPC
- **Real-time Updates** — listens to IPC events from main process
- **State Management** — Zustand stores (one per timer + global)

### Shared (`src/shared/`, `src/types/`)

- **Types** — shared TypeScript interfaces (TimerConfig, TimerState, etc.)
- **Constants** — app-wide defaults (durations, theme names, etc.)
- **Utilities** — time formatting, ID generation, etc.
- **IPC Channels** — centralized IPC event names

## Key Design Principles

### Low Resource Usage

- Timer ticks happen in **main process only** (not renderer)
- Renderer only updates on IPC events (not continuous polling)
- electron-store writes are debounced
- Audio loaded lazily and unloaded when idle

### Type Safety

- Strict TypeScript throughout (main + renderer)
- Shared type definitions (no duplication)
- IPC messages are typed

### Modularity

- One component per file (or multiple if closely related)
- Each timer type has its own logic (SitStandTimer, PomodoroTimer, etc.) — to be implemented in phases
- Stores are scoped (global, per-timer, stats)
- IPC handlers organized by domain

## Development Workflow

### File Organization

```
src/
  main/
    index.ts              # Entry point, window setup
    timerEngine.ts        # Core timer tick loop
    store.ts              # electron-store wrapper (typed)
    updater.ts            # Auto-update logic
    tray.ts               # System tray
    resumeEngine.ts       # Timer continuity (delayed implementation)
    streamerWindows.ts    # Streamer mode windows (delayed)
    ipcHandlers/          # IPC handlers by domain
      timerHandlers.ts
      settingsHandlers.ts
      statsHandlers.ts
  
  renderer/
    App.tsx               # Root component
    main.tsx              # Vite entry point
    app.css               # Global styles
    
    components/
      Dashboard/
      TimerTile/
      ClockFaces/        # All 5 display modes
      StatsPage/
      SettingsPanel/
    
    store/
      timerStore.ts       # Zustand factory for per-timer state
      globalStore.ts      # Global settings/UI state
      statsStore.ts       # Stats and history
    
    themes/
      light.css
      dark.css
      sakura.css
      ...
```

### Adding a New Component

1. Create folder: `src/renderer/components/MyComponent/`
2. Create `MyComponent.tsx` (the component)
3. Create `MyComponent.module.css` (scoped styles)
4. Export from `index.ts` if needed

### Adding a New Timer Type

1. Extend `TimerConfig` in `src/types/index.ts` (add type-specific fields)
2. Create timer logic in `src/main/timerEngine.ts` or separate file
3. Add initialization/reset logic
4. Create UI component in `src/renderer/components/`

### IPC Communication

1. Define channel in `src/shared/ipc.ts`
2. Add type in `src/types/index.ts` (e.g., `IpcCreateTimer`)
3. Set up handler in `src/main/` (e.g., `ipcHandlers/timerHandlers.ts`)
4. Register handler in main process
5. Call from renderer via `window.electronAPI.method()`

Example:

```typescript
// src/shared/ipc.ts
export const IPC_MY_ACTION = 'my:action'

// src/types/index.ts
export interface IpcMyAction {
  value: string
}

// src/main/ipcHandlers/myHandlers.ts
ipcMain.handle(IPC_MY_ACTION, (event, data: IpcMyAction) => {
  // Handle action
  return result
})

// src/renderer/components/MyComponent.tsx
const result = await window.electronAPI.myAction('value')
```

### Styling

- Use CSS Modules for component scoping
- Define theme colors as CSS variables (see `src/renderer/themes/`)
- All theme variables start with `--` and are set via `data-theme` attribute
- Responsive design using CSS Grid and Flexbox

## Testing

Currently no test framework is set up. Consider adding Jest or Vitest for Phase 8.

## Common Tasks

### Add a New Theme

1. Create `src/renderer/themes/mytheme.css`
2. Define all CSS variables (copy from `light.css` as template)
3. Add theme name to `AVAILABLE_THEMES` in `src/shared/constants.ts`
4. Theme will be selectable in Settings

### Implement Timer Continuity

1. See `src/main/resumeEngine.ts` (skeleton exists)
2. On app load, check `continueFromLastTime` and `continueWhileAppClosed` flags
3. If `continueWhileAppClosed`: calculate elapsed real-world time since app closed
4. Resume timer at calculated position

### Add Stats Tracking

1. When timer completes, collect elapsed time by category
2. Update `stats` and `statsHistory` via electron-store
3. Also update `lifetimeStats` (never auto-resets)
4. Implement auto-reset schedule check

## Debugging

### Dev Mode

```bash
npm run dev
```

Opens DevTools automatically. Use Chromium DevTools for renderer debugging.

### Main Process Debugging

Add `console.log()` statements in main process files. Output appears in terminal.

### IPC Debugging

Add logging to IPC handlers to trace message flow.

## Performance Tips

- Use React.memo() for components that receive the same props frequently
- Debounce electron-store writes
- Avoid rendering all timers per tick — only the active one
- Use CSS transforms for animations (GPU-accelerated)

## Phases Checklist

- [x] Phase 1: Foundation (current)
- [ ] Phase 2: Timer Engine + Types
- [ ] Phase 3: Clock Display Modes
- [ ] Phase 4: Streamer Mode
- [ ] Phase 5: Themes + Mascot
- [ ] Phase 6: Inspirational Messages
- [ ] Phase 7: Stats
- [ ] Phase 8: Polish

Check [PLAN.md](PLAN.md) for detailed phase descriptions.

---

Have questions? Review the code, read comments, or open a discussion!
