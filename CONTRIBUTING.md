# Contributing to REslava Loom

Thank you for your interest in contributing to REslava Loom! This document provides guidelines and workflows to help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Architecture Principles](#architecture-principles)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Documentation Contributions](#documentation-contributions)
- [Issue Reporting](#issue-reporting)

---

## Code of Conduct

This project adheres to a [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/reslava-loom.git
   cd reslava-loom
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Build the project**:
   ```bash
   npm run build
   ```
5. **Run tests** to verify everything works:
   ```bash
   npm test
   ```

---

## Development Setup

### VS Code Extension Development

The VS Code extension lives in the `packages/vscode/` directory. To develop and debug:

1. Open the project in VS Code.
2. Press `F5` to launch a new Extension Development Host window.
3. In the new window, open a test loom (e.g., `~/looms/test/`).
4. Use the "Loom" view in the Explorer sidebar.

**Recommended Extensions for Development:**
- ESLint
- Prettier
- TypeScript

### CLI Development

The CLI (`loom`) is built with TypeScript and `commander`. To test CLI changes locally:

```bash
npm run build:cli
npm link   # Makes `loom` available globally for testing
loom status
```

To unlink:
```bash
npm unlink -g @reslava-loom/cli
```

### Running in Watch Mode

For faster iteration:
```bash
npm run watch        # Rebuilds on file changes (extension)
npm run watch:cli    # Rebuilds CLI on file changes
```

---

## Project Structure

```
.
├── .loom/                    # Default templates and config (used by `loom init`)
├── docs/                     # User and contributor documentation
│   ├── ARCHITECTURE.md
│   ├── WORKFLOW_YML.md
│   ├── EFFECTS.md
│   ├── AI_INTEGRATION.md
│   ├── CONFIGURATION.md
│   ├── COLLABORATION.md
│   ├── TROUBLESHOOTING.md
│   └── DOCUMENTATION_GUIDE.md
├── loom/refs/                # Reference materials (CLI commands, directory structure)
├── packages/
│   ├── core/                 # Shared core engine (reducers, derived state)
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   ├── designReducer.ts
│   │   │   ├── planReducer.ts
│   │   │   ├── applyEvent.ts
│   │   │   ├── derived.ts
│   │   │   └── registry.ts
│   │   └── test/
│   ├── fs/                   # Filesystem utilities (Markdown load/save)
│   │   ├── src/
│   │   └── test/
│   ├── cli/                  # CLI application
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── commands/
│   │   └── test/
│   └── vscode/               # VS Code extension
│       ├── src/
│       │   ├── extension.ts
│       │   ├── commands/
│       │   ├── tree/
│       │   └── views/
│       └── package.json
├── threads/                  # Example threads for testing (ignored by Git)
├── looms/                    # Test looms for manual verification
└── package.json              # Monorepo root (uses npm workspaces)
```

---

## Architecture Principles

When contributing code, please adhere to the core architectural principles outlined in [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

### 1. Pure Reducers for State Changes
All logic that modifies document state **must** be a pure function located in `packages/core/src/*Reducer.ts`. These functions take a `BaseDoc` and an `Event` and return a new `BaseDoc`. They **must not** perform I/O.

### 2. Effects for Side Effects
File writes, command execution, and notifications belong in the **Effects Layer** (`packages/core/src/effects/`). Effects are executed after the reducer updates state.

### 3. Derived State is Computed, Not Stored
Never add a field like `thread.status` to a file on disk. Status is always derived by `packages/core/src/derived.ts`.

### 4. No Global State
The system does not use a central state object or database. State is read from the filesystem on demand (with caching for performance).

### 5. Multi‑Loom Resolution
The active loom is resolved by `packages/fs/src/utils.ts` → `getActiveLoomRoot()`. This function checks the global registry (`~/.loom/config.yaml`) and falls back to local `.loom/` discovery.

---

## Coding Standards

- **Language:** TypeScript (strict mode enabled).
- **Formatting:** Prettier (run `npm run format` before committing).
- **Linting:** ESLint (run `npm run lint`).
- **Commit Messages:** Follow [Conventional Commits](https://www.conventionalcommits.org/) format:
  - `feat(core): add REFINE_DESIGN reducer`
  - `fix(fs): resolve thread root from active loom`
  - `docs(readme): update CLI examples`
  - `refactor(cli): extract status command`

### Naming Conventions
- Files: `kebab-case.ts`
- Classes/Interfaces: `PascalCase`
- Functions/Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`

---

## Testing

### Unit Tests (Core Engine)
All pure functions in `packages/core` must have unit tests.

```bash
npm test -- --filter=@reslava-loom/core
```

Write tests in `packages/core/test/` using a structure that mirrors `src/`.

### Integration Tests (CLI & FS)
Tests that touch the filesystem should create temporary directories.

```bash
npm test -- --filter=@reslava-loom/fs
```

### Extension Tests
Extension tests run inside VS Code's Extension Host. We use `@vscode/test-electron`.

```bash
npm run test:extension
```

**Test Coverage Goals:**
- Core reducers: >90%
- Derived state functions: 100%
- CLI commands: Smoke tests for happy paths

---

## Submitting Changes

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/my-new-feature
   ```
2. **Make your changes**, adhering to coding standards and architecture principles.
3. **Write or update tests** to cover your changes.
4. **Update documentation** if you've added a new effect, CLI command, or workflow feature.
5. **Run the full test suite**:
   ```bash
   npm run lint
   npm run format
   npm test
   ```
6. **Commit with a descriptive message**:
   ```bash
   git commit -m "feat(core): add 'duplicate_design' event"
   ```
7. **Push to your fork** and open a Pull Request on GitHub.

### Pull Request Checklist

- [ ] Code compiles without errors (`npm run build`).
- [ ] Linting passes (`npm run lint`).
- [ ] Tests pass (`npm test`).
- [ ] New features are documented in `docs/` if user‑facing.
- [ ] Architecture decisions are explained in PR description.
- [ ] PR title follows Conventional Commits.

---

## Documentation Contributions

Documentation is a critical part of REslava Loom. Improvements to clarity, examples, and structure are highly valued.

- **User Docs:** `README.md`, `docs/ARCHITECTURE.md`, `docs/WORKFLOW_YML.md`, `docs/EFFECTS.md`, `docs/AI_INTEGRATION.md`, `docs/CONFIGURATION.md`, `docs/COLLABORATION.md`, `docs/TROUBLESHOOTING.md`
- **Reference Docs:** `loom/refs/cli-commands-reference.md`, `loom/refs/vscode-commands-reference.md`, `loom/refs/workspace-directory-structure-reference.md`
- **Templates:** `.loom/templates/`
- **Code Comments:** Use JSDoc for public APIs.

When updating docs, follow the conventions in [`DOCUMENTATION_GUIDE.md`](./docs/DOCUMENTATION_GUIDE.md).

---

## Issue Reporting

### Bug Reports
Please include:
- OS and VS Code version.
- Steps to reproduce.
- Expected vs. actual behavior.
- Relevant `loom` CLI output or extension logs (found in Output panel → "Loom: Core").

### Feature Requests
Check existing issues and discussions first. If your idea isn't listed, open a discussion with:
- The problem it solves.
- Why it fits REslava Loom's philosophy.
- A rough idea of the implementation (optional).

---

## Getting Help

- **Questions?** Open a [GitHub Discussion](https://github.com/reslava/reslava-loom/discussions).
- **Development Chat:** Join our Discord server (link in README).

Thank you for contributing to REslava Loom! 🧵✨