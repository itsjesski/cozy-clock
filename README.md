# Cozy Clock

A customizable sit/stand, pomodoro, and generic timer desktop app with a cute, modular dashboard. Built with Electron, React, Vite, and TypeScript.

## Features

- ✨ Three timer types: Sit/Stand, Pomodoro, Generic
- 🎨 Multiple clock display modes: Digital, Analog, Ring, Flip, Minimal
- 🎭 6 built-in themes with user-customizable accents
- 🖼️ User-supplied mascot/character display
- 🎬 Streamer Mode for OBS capture (transparent windows)
- ⏱️ Timer continuity: resume from last time or while app is closed
- 🔊 Custom alert sounds per timer event
- 💫 Optional inspirational messages at countdown milestones
- 📊 Comprehensive stats dashboard (rolling + lifetime)
- 🎯 Low resource usage (tick engine in main process)
- 🔄 Auto-update support (GitHub Releases)

## Installation

Download the latest Windows installer from [Releases](https://github.com/itsjesski/CozyClock/releases).

## Development

### Prerequisites
- Node.js 20+
- npm or pnpm

### Setup

```bash
git clone https://github.com/itsjesski/CozyClock.git
cd CozyClock
npm install
```

### Development Mode

```bash
npm run dev
```

This starts both the Vite dev server (on port 5173) and Electron in dev mode.

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
2. Run `npm run release`
   - Bumps version in `package.json`
   - Updates `CHANGELOG.md`
   - Creates and pushes git tag
3. GitHub Actions automatically builds and publishes the installer to GitHub Releases
4. Users get auto-update notifications on next app launch

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Developer Guide

See [DEVELOPER.md](DEVELOPER.md) for detailed development information.

## License

GPL-2.0-or-later. See [LICENSE](LICENSE) for details.

## Credits

Inspired by the low-resource-usage philosophy of [VRSleep](https://github.com/itsjesski/VRSleep).

---

Built with ❤️ by [itsjesski](https://github.com/itsjesski)
