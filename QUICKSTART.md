# Cozy Clock - Quick Start Guide

Welcome! Here's what you need to know to get started.

## Essential Files to Review (in order)

1. **[PLAN.md](PLAN.md)** — Full project roadmap with all 8 phases ⭐ START HERE
2. **[DEVELOPER.md](DEVELOPER.md)** — Architecture, design patterns, development workflow
3. **[README.md](README.md)** — Project overview, features, commands
4. **[SETUP_COMPLETE.md](SETUP_COMPLETE.md)** — What Phase 1 accomplished

## Key Files to Understand the Code

### Types & Constants
- `src/types/index.ts` — All shared types (TimerConfig, TimerState, IPC messages)
- `src/shared/ipc.ts` — IPC channel names (single source of truth)
- `src/shared/constants.ts` — Default values, theme names, durations

### Main Process (Electron)
- `src/main/index.ts` — App entry point
- `src/main/store.ts` — Data persistence (electron-store wrapper)
- `src/main/timerEngine.ts` — Timer tick engine (to be completed in Phase 2)

### Renderer (React)
- `src/renderer/App.tsx` — Root component
- `src/renderer/components/Dashboard/Dashboard.tsx` — Main layout
- `src/renderer/store/` — Zustand stores

### Configuration
- `vite.config.ts` — Vite bundler
- `tsconfig.json` — TypeScript settings
- `electron-builder.yml` — Windows installer config
- `.github/workflows/release.yml` — GitHub Actions release pipeline

## Common Commands

```bash
# Development (Vite + Electron dev mode)
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build production executable
npm run build

# Create a release (bump version, tag, push)
npm run release
```

## Project Structure at a Glance

```
src/
  main/           ← Electron main process
  renderer/       ← React app (Vite)
  types/          ← Shared TypeScript definitions
  shared/         ← Shared utilities & constants
  preload.ts      ← Context bridge (safe IPC)
```

## What's Ready for Phase 2?

✅ Full foundation — no major refactoring needed
✅ Type system — all types defined
✅ IPC infrastructure — context bridge ready
✅ State management — Zustand stores ready
✅ UI components — placeholders in place
✅ Build pipeline — electron-builder configured
✅ Release pipeline — GitHub Actions ready

## What Phase 2 Will Add

- Complete timer engine implementation
- Timer type logic (Sit/Stand, Pomodoro, Generic)
- Timer state persistence
- IPC handlers for all timer operations
- Alert sound support

See [PLAN.md](PLAN.md) for full Phase 2 details.

---

## Quick Reference

| Layer | Location | Status |
|---|---|---|
| Types | `src/types/` | ✅ Complete |
| IPC Channels | `src/shared/ipc.ts` | ✅ Complete |
| Main Process | `src/main/` | ✅ Scaffolded |
| Timer Engine | `src/main/timerEngine.ts` | ⏳ Phase 2 |
| Renderer | `src/renderer/` | ✅ Scaffolded |
| Components | `src/renderer/components/` | ✅ Stubs ready |
| Stores | `src/renderer/store/` | ✅ Complete |
| Themes | `src/renderer/themes/` | ✅ 2/6 themes |
| Docs | Root `.md` files | ✅ Complete |

---

**Ready to code? Start with [PLAN.md](PLAN.md) and [DEVELOPER.md](DEVELOPER.md)!**
