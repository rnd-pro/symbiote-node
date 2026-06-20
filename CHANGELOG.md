# Changelog

## Unreleased

## 0.3.0-alpha.8

- Added `llms.txt` as a compact agent-facing resource map for the migration
  facade repository.
- Removed embedded `symbiote-ui` and `symbiote-engine` source ownership from the workspace.
- Kept this repository focused on the terminal `symbiote-node` facade and external package dependencies.

## 0.3.0-alpha.5

- Published the package split export contract that keeps browser UI entrypoints off the engine barrel.
- Kept terminal `symbiote-node` as a migration facade while updating split package dependencies.

## 0.3.0-alpha.4

- Split the repository into `symbiote-ui`, `symbiote-engine`, and terminal `symbiote-node` workspace packages.
- Added `.agent-portal/` as a private corporate-memory submodule.
- Moved future UI/provider work to `symbiote-ui` and engine/runtime work to `symbiote-engine`.
