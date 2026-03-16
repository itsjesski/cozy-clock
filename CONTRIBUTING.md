# Contributing to Cozy Clock

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to Cozy Clock.

## Code of Conduct

Be respectful and inclusive. We welcome contributors of all backgrounds and experience levels.

## How to Contribute

### Reporting Bugs

1. Check existing [Issues](https://github.com/itsjesski/CozyClock/issues) to avoid duplicates
2. Create a new issue with:
   - Clear title describing the bug
   - Steps to reproduce
   - Expected vs. actual behavior
   - System info (Windows version, app version)

### Suggesting Features

1. Check existing [Issues](https://github.com/itsjesski/CozyClock/discussions) first
2. Create a discussion or issue describing:
   - The feature and use case
   - Why it would be valuable
   - Any alternative approaches

### Code Contributions

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Follow the development setup in [README.md](README.md)
4. Make your changes
5. Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`
6. Push and create a Pull Request

## Commit Message Convention

Follow conventional commits:

```
feat: add pomodoro timer countdown
fix: resolve timer pause bug
docs: update README with setup instructions
chore: update dependencies
refactor: reorganize timer engine code
```

## Pull Request Process

1. Ensure `npm run type-check` and `npm run lint` pass
2. Write a clear PR description
3. Reference related issues
4. Be open to feedback and iterate

## Code Guidelines

- Use TypeScript with strict mode enabled
- Organize components/modules into focused files
- Write self-documenting code with comments where needed
- Follow the existing code style (check `.eslintrc`, `.prettierrc`)
- Keep components focused and reusable

## License

By contributing, you agree that your code will be licensed under GPL-2.0-or-later.

---

Questions? Create a discussion or reach out!
