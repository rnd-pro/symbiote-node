# symbiote-node

This repository maintains the `symbiote-node` terminal migration facade.

`symbiote-ui` and `symbiote-engine` are standalone external projects. This repository does not own their source trees; it depends on their published packages and keeps the legacy `symbiote-node` entrypoints available while consumers migrate.

## Package

- [`symbiote-node`](packages/symbiote-node) - terminal migration package for existing consumers.

## External Projects

- [`symbiote-ui`](https://github.com/RND-PRO/symbiote-ui) - Web Components, UI/layout primitives, provider catalogs, themes, tokens, rules, schemas, WebMCP metadata, and JSDA SSR integration contracts.
- [`symbiote-engine`](https://github.com/RND-PRO/symbiote-engine) - graph runtime, CLI runtime commands, server helpers, registry, persistence, and handlers.

The current facade dependencies are `symbiote-ui@0.3.0-alpha.45` and `symbiote-engine@0.3.0-alpha.11`.

## Documentation

- [Package split](docs/package-split.md)
- [Agentic runtime goal](docs/agentic-runtime.md)
- [Agent contract index](docs/agent-contracts.md)
- [WebMCP contracts](docs/webmcp.md)
- [Documentation audit](docs/documentation-audit.md)
- [Release checklist](docs/release-checklist.md)

The upstream Symbiote WebMCP reference is [docs/webmcp.md](https://github.com/symbiotejs/symbiote.js/blob/webmcp/docs/webmcp.md).

Corporate memory lives in the private `.agent-portal/` submodule and is not part of npm packages, public docs, tests, or release artifacts.
