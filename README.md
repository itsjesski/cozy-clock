# Cozy Clock

[![Download Latest](https://img.shields.io/badge/Download-Latest%20Release-7c3aed?style=for-the-badge)](https://github.com/itsjesski/cozy-clock/releases/latest)

A customizable sit/stand, pomodoro, and generic timer desktop app with a cute, modular dashboard. Built with Electron, React, Vite, and TypeScript.

<img width="859" height="743" alt="image" src="https://github.com/user-attachments/assets/b10ffab1-b0e4-48dc-9223-a75e5c672213" />


## Features

- ✨ Three timer types: Sit/Stand, Pomodoro, Generic
- 🎨 Multiple clock display modes: Digital, Analog, Ring, Flip, and compact/minimal-friendly layouts
- 🎭 10 built-in themes: Cozy, Sakura, Forest, Neon, and Paper in Light and Dark variants
- 🖼️ User-supplied mascot/character display with global and per-timer overrides
- ⏱️ Timer continuity: resume from last time or while app is closed
- 🔊 Custom alert sounds with global defaults, per-timer overrides, and local file picker support
- 💫 Optional inspirational messages at countdown milestones
- 📊 Comprehensive stats dashboard plus per-timer day/week/month/year breakdowns
- 🎯 Low resource usage (tick engine in main process)
- 🔄 Auto-update support (GitHub Releases)

## Installation

Download the latest Windows installer from [Releases](https://github.com/itsjesski/cozy-clock/releases).

## Development

### Prerequisites
- Node.js 20+
- npm or pnpm

### Setup

```bash
git clone https://github.com/itsjesski/cozy-clock.git
cd cozy-clock
npm install
```

### Development Mode

```bash
npm run dev
```

This starts the Vite dev server and Electron in dev mode.

The development server is bound to `127.0.0.1` and the app only trusts its own signed dev server instance.

### Build for Production

```bash
npm run build
```

Creates an optimized build and NSIS installer.

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Project Structure

See [PLAN.md](PLAN.md) for detailed folder structure and architecture.

## Release Process

1. Make commits with conventional commit messages (`feat:`, `fix:`, `chore:`, etc.)
2. Run one of:
   - `npm run release` for the interactive flow
   - `npm run release:patch`
   - `npm run release:minor`
   - `npm run release:major`
3. The release script updates `CHANGELOG.md`, bumps the version, creates a git tag, and pushes everything
4. GitHub Actions automatically builds and publishes the installer to GitHub Releases, using the newest `CHANGELOG.md` section as the release notes
5. Users get auto-update notifications on next app launch

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Developer Guide

See [DEVELOPER.md](DEVELOPER.md) for detailed development information.

## License

GPL-2.0-or-later. See [LICENSE](LICENSE) for details.
