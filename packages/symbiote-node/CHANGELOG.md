# Changelog

## Unreleased

## 0.3.0-alpha.8

- Added `llms.txt` as a package-level resource map and included it in the
  published package.
- Updated the facade source to consume external `symbiote-ui@0.3.0-alpha.46` and `symbiote-engine@0.3.0-alpha.12`.
- Removed assumptions that the UI and engine source trees live inside this repository.

## 0.3.0-alpha.7

- Updated the terminal facade to consume external split package dependencies.
- Re-exported the cascade theme and themed scrollbar helpers for migration consumers.
- Kept new theme implementation ownership in `symbiote-ui`; `symbiote-node` remains a terminal facade.

## 0.3.0-alpha.6

- Updated terminal facade metadata and related package links for the standalone `symbiote-ui` and `symbiote-engine` repositories.
- Updated facade dependencies to the `0.3.0-alpha.6` split packages.

## 0.3.0-alpha.5

- Updated the migration facade dependencies to the `0.3.0-alpha.5` split packages.
- Kept legacy entrypoints delegating to `symbiote-ui` and `symbiote-engine`.

## 0.3.0-alpha.4

- Terminal migration release.
- Main UI/provider entrypoints now re-export from `symbiote-ui`.
- Engine/runtime entrypoints now re-export from `symbiote-engine`.
- New feature work should move to the split packages.
- Migration guide lives in the workspace `docs/package-split.md`.
