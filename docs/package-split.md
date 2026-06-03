# Package Split

`symbiote-node` is being split into two active packages plus one terminal migration package.

## Repository Links

| Package | Role | Source | npm |
|---|---|---|---|
| `symbiote-ui` | Active UI/provider package | [`packages/symbiote-ui`](../packages/symbiote-ui) | [`symbiote-ui`](https://www.npmjs.com/package/symbiote-ui) |
| `symbiote-engine` | Active runtime package | [`packages/symbiote-engine`](../packages/symbiote-engine) | [`symbiote-engine`](https://www.npmjs.com/package/symbiote-engine) |
| `symbiote-node` | Terminal migration package | [`packages/symbiote-node`](../packages/symbiote-node) | [`symbiote-node`](https://www.npmjs.com/package/symbiote-node) |

## Active Packages

### `symbiote-ui`

Owns browser-facing and agent-facing UI contracts:

- Web Components and browser registration through `symbiote-ui/ui`
- Node/SSR-safe graph, layout, locale, and manifest helpers
- provider catalogs, theme rules, tokens, schemas, and `custom-elements.json`
- `component-descriptor-v2` metadata
- WebMCP helper metadata through `symbiote-ui/webmcp`
- provider discovery through `symbiote-ui/discover` and the `symbiote-ui discover` CLI command

The root `symbiote-ui` entrypoint must remain importable in Node and SSR contexts. Browser-only behavior belongs behind `symbiote-ui/ui` or explicit client-only component contracts.

### `symbiote-engine`

Owns runtime execution:

- graph runtime primitives
- workflow execution
- CLI runtime commands
- server helpers
- registry, persistence, lifecycle, and handler loading
- runtime packs under `symbiote-engine/packs/*`

Engine internals must not import browser UI runtime modules.

## Terminal Package

### `symbiote-node`

`symbiote-node@0.3.0-alpha.5` is the terminal migration package. It keeps old public entrypoints working by delegating to `symbiote-ui` and `symbiote-engine`.

New feature work should not be added to `symbiote-node`.

## Migration Map

| Old import | New import |
|---|---|
| `symbiote-node` | `symbiote-ui` for UI/provider helpers or `symbiote-engine` for runtime helpers |
| `symbiote-node/ui` | `symbiote-ui/ui` |
| `symbiote-node/manifest` | `symbiote-ui/manifest` |
| `symbiote-node/layout` | `symbiote-ui/layout` |
| `symbiote-node/graph` | `symbiote-ui/graph` |
| `symbiote-node/locale` | `symbiote-ui/locale` |
| `symbiote-node/xr` | `symbiote-ui/xr` |
| `symbiote-node/webmcp` | `symbiote-ui/webmcp` |
| `symbiote-node/engine` | `symbiote-engine` |

## Release Hygiene

Before publishing, verify packed packages do not include `.agent-portal/`, `.gitmodules`, temporary audits, delegation logs, private memory files, or local environment paths.
