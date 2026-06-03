# symbiote-node workspace

This repository hosts the Symbiote provider workspace for agentic UI and runtime construction.

The libraries are designed for agents that construct dynamic components and layouts at runtime. A chat agent can describe, register, and render a component with data, compose surrounding layouts, and hydrate browser-only behavior without requiring a server restart.

## Packages

- `symbiote-ui` - Web Components, UI/layout primitives, provider catalogs, themes, tokens, rules, schemas, WebMCP metadata, and JSDA SSR integration contracts.
- `symbiote-engine` - graph runtime, CLI runtime commands, server helpers, registry, persistence, and handlers.
- `symbiote-node` - terminal migration package for existing consumers. New feature work belongs in `symbiote-ui` or `symbiote-engine`.

## Documentation

- [Package split](docs/package-split.md)
- [Agentic runtime goal](docs/agentic-runtime.md)
- [WebMCP contracts](docs/webmcp.md)
- [Documentation audit](docs/documentation-audit.md)
- [Release checklist](docs/release-checklist.md)

The upstream Symbiote WebMCP reference is [docs/webmcp.md](https://github.com/symbiotejs/symbiote.js/blob/webmcp/docs/webmcp.md).

Corporate memory lives in the private `.agent-portal/` submodule and is not part of npm packages, public docs, tests, or release artifacts.
