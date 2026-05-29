# Contributing to symbiote-node

Thank you for your interest in contributing to `symbiote-node`! We welcome contributions from developers, technical writers, and researchers.

This document provides guidelines to help you set up your development environment, understand our codebase structure, write code that follows our style guidelines, run tests, and submit pull requests.

---

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Folder Structure](#folder-structure)
3. [Coding Guidelines](#coding-guidelines)
4. [Testing Policies](#testing-policies)
5. [Git Workflow & Conventional Commits](#git-workflow--conventional-commits)
6. [Pull Request Checklist](#pull-request-checklist)

---

## Development Environment Setup

To get started with local development, ensure you have **Node.js (>= 18.0.0)** installed.

### 1. Clone the Repository
Clone the repository and navigate into the `symbiote-node` package directory:
```bash
git clone https://github.com/RND-PRO/symbiote-node.git
cd symbiote-node
```

### 2. Install Dependencies
Run the standard npm installation:
```bash
npm install
```

### 3. Run the Interactive Demo
You can run a local development server to serve the demo in `demo/`:
```bash
npm run demo
```
This runs `npx -y serve -l 3000 .`. You can then open [http://localhost:3000/demo/](http://localhost:3000/demo/) in your browser.

---

## Folder Structure

The project is structured logically into subdirectories. Each module has a specific responsibility:

| Directory | Responsibility |
|-----------|----------------|
| `core/` | Core graph classes: `NodeEditor`, `Node`, `Connection`, `Socket`, `Portal` |
| `canvas/` | Canvas UI components: `NodeCanvas`, connection rendering, `FlowSimulator`, `AutoLayout` |
| `node/` | Node-specific Web Components: `GraphNode`, `PortItem`, `CtrlItem`, `NodeSocket` |
| `graph/` | Node-safe `graph-model-v1` normalizers for shared project/workflow graphs |
| `layout/` | BSP layout engine, `LayoutSidebar`, and URL-backed `LayoutRouter` |
| `display/` | Text/code helpers: `CodeBlock`, `SourceViewer`, `SourceEditor`, and markdown rendering |
| `menu/` | Interactive context menu components |
| `interactions/` | Viewport drag/zoom, rubber-band selector, grid-snapping, socket highlight, connection drag |
| `engine/` | Server-side execution engine, runtime step execution, and the CLI tool (`symbiote-node`) |
| `manifest/` | Agent-readable catalogs, package metadata discovery exports |
| `tokens/` | Design tokens in DTCG format & JSON themes |
| `rules/` | Isomorphic rule boundaries for agents and validators |
| `schemas/` | JSON schemas for graphs, projects, and transactions |
| `shapes/` | SVG shape registry and built-in vector shape definitions |
| `themes/` | Core Theme, Palette, and Skin class/data implementations |
| `tests/` | Node.js native test suite for core logic, engine executors, and API contracts |

---

## Coding Guidelines

We maintain a highly modular, clean, and modern codebase. Please follow these principles when writing code:

### 1. Strict No-Semicolon Formatting
All new files and modifications **MUST** follow strict **no-semicolon formatting**.
Do not append semicolons (`;`) at the ends of your statements in JavaScript/ES modules unless absolutely required for syntax disambiguation (e.g., when a line starts with `[` or `(`).

**Bad:**
```javascript
import { Node } from './core/node.js';
const node = new Node('Source');
console.log(node);
```

**Good:**
```javascript
import { Node } from './core/node.js'
const node = new Node('Source')
console.log(node)
```

### 2. Isomorphic & SSR Compatibility
* The core codebase under `symbiote-node` (e.g. `core/`, `graph/`, `engine/`) must remain **Node-safe** and must not refer to browser-specific globals like `window`, `document`, `HTMLElement`, or `customElements`.
* Browser-specific modules are kept under `symbiote-node/ui` or browser-only folders. When imported in a server/Node environment (SSR), they must not throw exceptions. Keep UI elements inert until DOM globals exist.

### 3. Component Reusability
* UI components should rely on CSS variables (`--sn-*`) and inherit them through the cascade.
* Avoid duplicating UI boilerplate or hardcoding specific colors or spacing. Use standard themes and token sets from `symbiote-node/ui` or `tokens/`.

---

## Testing Policies

We believe that **unverified code is unfinished code**. All contributions must be accompanied by comprehensive tests to ensure reliability and prevent regressions.

### Running Tests
We use Node.js's native test runner. To execute the entire test suite, run:
```bash
npm test
```
Alternatively, you can target specific test suites directly:
```bash
node --test tests/*.test.js
```

### Writing Tests
* Place all test files in the `tests/` directory with the suffix `*.test.js`.
* Mock browser-only features when testing core/isomorphic behaviors inside Node.js.
* Ensure tests run quickly and cover negative edge cases (invalid inputs, missing ports, etc.).

---

## Git Workflow & Conventional Commits

We follow a structured Git branching and commit strategy.

### 1. Branching Strategy
Create task-specific branches off the `main` or development branch. Keep branches focused and short-lived:
* New features: `feat/feature-name`
* Bug fixes: `fix/bug-name`
* Documentation: `docs/doc-name`
* Code formatting or refactoring: `style/refactor-name`

### 2. Commit Message Guidelines
We strictly enforce **Conventional Commits** formatting. This allows us to auto-generate changelogs and maintain clean release histories. Commit messages must follow this structure:

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

#### Types
* **feat**: A new feature (corresponds to a minor version bump).
* **fix**: A bug fix (corresponds to a patch version bump).
* **docs**: Documentation-only changes.
* **style**: Changes that do not affect the meaning of the code (formatting, missing semi-colons, etc.).
* **refactor**: A code change that neither fixes a bug nor adds a feature.
* **perf**: A code change that improves performance.
* **test**: Adding missing tests or correcting existing tests.
* **chore**: Changes to the build process, auxiliary tools, or package manager settings.

#### Examples
* `feat(editor): add multi-socket connection compatibility check`
* `fix(engine): resolve topological sort lock when cycle is detected`
* `docs(readme): add installation section and compatibility matrix`

---

## Pull Request Checklist

Before submitting a Pull Request, please ensure you have completed the following steps:

1. [ ] **No-Semicolon Rule**: Verify that your files do not contain trailing semicolons.
2. [ ] **Tests Pass**: Run `npm test` locally to ensure there are no regressions.
3. [ ] **No Extra Code**: Keep your changes minimal and target-focused. Avoid formatting adjacent files or adding unrelated modifications.
4. [ ] **Conventional Commits**: Ensure your commit messages match the Conventional Commits format.
5. [ ] **Documentation**: Update relevant documentation or inline comments if your change introduces new behaviors, APIs, or design tokens.

Thank you for contributing! Your efforts help make `symbiote-node` an exceptional tool for developers and agents alike.
