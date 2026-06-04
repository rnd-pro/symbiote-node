# Changelog

## 0.3.0-alpha.7

- Updated the terminal facade to consume `symbiote-ui@0.3.0-alpha.11` while keeping `symbiote-engine@0.3.0-alpha.6`.
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
