# Contributing to the AI-Native Workflow System

Thank you for your interest in contributing! This document provides guidelines and workflows to help you get started.

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

This project adheres to a [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [project maintainers].

---

## Getting Started

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally:
    ```bash
    git clone https://github.com/your-username/workflow-system.git
    cd workflow-system
    ```
3.  **Install dependencies**:
    ```bash
    npm install
    ```
4.  **Build the project**:
    ```bash
    npm run build
    ```
5.  **Run tests** to verify everything works:
    ```bash
    npm test
    ```

---

## Development Setup

### VS Code Extension Development

The VS Code extension lives in the `extension/` directory. To develop and debug:

1.  Open the project in VS Code.
2.  Press `F5` to launch a new Extension Development Host window.
3.  In the new window, open a test workspace (e.g., `./demo-workspace/`).
4.  Use the "Workflow Features" view in the Explorer sidebar.

**Recommended Extensions for Development:**
- ESLint
- Prettier
- TypeScript + JavaScript

### CLI Development

The CLI (`wf`) is built with TypeScript and `commander`. To test CLI changes locally:

```bash
npm run build:cli
npm link   # Makes `wf` available globally for testing
wf status  # Test commands
```

To unlink:
```bash
npm unlink -g wf-cli
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
├── .wf/                    # Default templates and config (used by `wf init`)
├── docs/                   # User and contributor documentation
│   ├── ARCHITECTURE.md
│   ├── WORKFLOW_YML.md
│   ├── EFFECTS.md
│   └── templates/          # Document templates
├── extension/              # VS Code extension source
│   ├── src/
│   │   ├── extension.ts    # Activation entry point
│   │   ├── commands/       # Command implementations
│   │   ├── tree/           # TreeDataProvider and ViewModel
│   │   ├── view/           # ViewState management
│   │   └── core/           # Core engine (reused from core package)
│   └── package.json        # Extension manifest
├── packages/
│   ├── core/               # Shared core engine (reducers, derived state)
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   ├── designReducer.ts
│   │   │   ├── planReducer.ts
│   │   │   ├── applyEvent.ts
│   │   │   └── derived.ts
│   │   └── test/
│   ├── cli/                # CLI application
│   │   ├── src/
│   │   │   ├── cli.ts
│   │   │   └── commands/
│   │   └── test/
│   └── fs/                 # Filesystem utilities (Markdown load/save)
│       ├── src/
│       └── test/
├── features/               # Example features for testing (ignored by Git)
├── demo-workspace/         # Empty workspace for extension debugging
└── package.json            # Monorepo root (uses npm workspaces)
```

---

## Architecture Principles

When contributing code, please adhere to the core architectural principles outlined in [ARCHITECTURE.md](./docs/ARCHITECTURE.md).

### 1. Pure Reducers for State Changes
All logic that modifies document state **must** be a pure function located in `packages/core/src/*Reducer.ts`. These functions take a `BaseDoc` and an `Event` and return a new `BaseDoc`. They **must not** perform I/O.

### 2. Effects for Side Effects
File writes, command execution, and notifications belong in the **Effects Layer** (`packages/core/src/effects/`). Effects are executed after the reducer updates state.

### 3. Derived State is Computed, Not Stored
Never add a field like `feature.status` to a file on disk. Status is always derived by `packages/core/src/derived.ts`.

### 4. No Global State
The system does not use a central state object or database. State is read from the filesystem on demand (with caching for performance).

---

## Coding Standards

- **Language:** TypeScript (strict mode enabled).
- **Formatting:** Prettier (run `npm run format` before committing).
- **Linting:** ESLint (run `npm run lint`).
- **Commit Messages:** Follow [Conventional Commits](https://www.conventionalcommits.org/) format:
  - `feat: add support for custom templates`
  - `fix: resolve stale detection when design version missing`
  - `docs: update EFFECTS.md with run_command examples`
  - `refactor: extract feature resolution to separate module`

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
npm test -- --filter=@wf/core
```

Write tests in `packages/core/test/` using a structure that mirrors `src/`.

### Integration Tests (CLI & FS)
Tests that touch the filesystem should create temporary directories.

```bash
npm test -- --filter=@wf/fs
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

1.  **Create a feature branch** from `main`:
    ```bash
    git checkout -b feat/my-new-feature
    ```
2.  **Make your changes**, adhering to coding standards and architecture principles.
3.  **Write or update tests** to cover your changes.
4.  **Update documentation** if you've added a new effect, CLI command, or workflow feature.
5.  **Run the full test suite**:
    ```bash
    npm run lint
    npm run format
    npm test
    ```
6.  **Commit with a descriptive message**:
    ```bash
    git commit -m "feat(core): add 'duplicate_design' event"
    ```
7.  **Push to your fork** and open a Pull Request on GitHub.

### Pull Request Checklist

- [ ] Code compiles without errors (`npm run build`).
- [ ] Linting passes (`npm run lint`).
- [ ] Tests pass (`npm test`).
- [ ] New features are documented in `docs/` if user-facing.
- [ ] Architecture decisions are explained in PR description.
- [ ] PR title follows Conventional Commits.

---

## Documentation Contributions

Documentation is a critical part of this project. Improvements to clarity, examples, and structure are highly valued.

- **User Docs:** `README.md`, `ARCHITECTURE.md`, `WORKFLOW_YML.md`, `EFFECTS.md`
- **Templates:** `docs/templates/`
- **Code Comments:** Use JSDoc for public APIs.

When updating docs, run a local markdown linter:
```bash
npx markdownlint-cli2 "docs/**/*.md" "*.md"
```

---

## Issue Reporting

### Bug Reports
Please include:
- OS and VS Code version.
- Steps to reproduce.
- Expected vs. actual behavior.
- Relevant `wf` CLI output or extension logs (found in Output panel → "Workflow Effects").

### Feature Requests
Check the [Project Roadmap](ROADMAP.md) first. If your idea isn't listed, open a discussion with:
- The problem it solves.
- Why it fits the project's philosophy.
- A rough idea of the implementation (optional).

---

## Getting Help

- **Questions?** Open a [GitHub Discussion](https://github.com/your-repo/discussions).
- **Development Chat:** Join our Discord server (link in README).

Thank you for contributing to a more structured, reliable AI development experience!