# Documentation Audit

Documentation is part of each implementation stage.

## Required Checks

Before closing a stage, verify that documentation matches current behavior for:

- public `symbiote-node` facade responsibilities
- package export maps
- CLI behavior
- external provider package versions
- WebMCP descriptor references
- migration notes for terminal `symbiote-node`
- release hygiene and npm package contents

## Required Structure

Public documentation should stay in these locations:

- root `README.md` for repository orientation
- root `CHANGELOG.md` for workspace-level release notes
- `docs/` for architecture, contracts, migration, WebMCP, and audit policy
- `packages/symbiote-node/README.md` for package-local use and ownership
- `packages/symbiote-node/CHANGELOG.md` for package-local release notes

Private coordination, delegation logs, and corporate memory stay in `.agent-portal/` and must not be copied into public docs, tests, package artifacts, or release notes.

## Agent-Facing Documentation

WebMCP metadata can document component capabilities for agents when it improves runtime composition. It should stay limited to public action surfaces, input schemas, SSR/client constraints, and visibility or permission hints.

For broader reasoning, agents should use the public docs and package manifests rather than inferring behavior from private implementation files.
