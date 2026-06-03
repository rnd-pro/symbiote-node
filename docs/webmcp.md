# WebMCP Contracts

Symbiote WebMCP support follows the upstream reference:

- [Symbiote WebMCP docs](https://github.com/symbiotejs/symbiote.js/blob/webmcp/docs/webmcp.md)

This workspace uses WebMCP metadata as agent-facing documentation in reasonable bounds. It documents intentional public component capabilities, not every implementation detail.

## Policy

- Use `@symbiotejs/symbiote` exactly at `3.8.0-webmcp.2` while the WebMCP integration is in alpha.
- Prefer explicit tool descriptors over global mode switches.
- Do not enable `Symbiote.mcpToolMode = true` by default.
- Keep `symbiote-ui/webmcp` importable in Node/SSR without DOM globals.
- Register native WebMCP tools only when `document.modelContext` or an equivalent target is available.
- Keep permissions, visibility, and SSR expectations in metadata so agents can decide how to render or call a component.

## Descriptor Scope

Use `component-descriptor-v2` for public components that need agent-readable metadata:

- `contract.ssr.mode`
- `contract.webmcp.tools[].name`
- `contract.webmcp.tools[].description`
- `contract.webmcp.tools[].inputSchema`
- `contract.webmcp.tools[].annotations`
- `contract.webmcp.tools[].exposedTo`
- `contract.webmcp.tools[].visibilityDeps`

Permission and visibility hints currently live in `annotations`, `exposedTo`, and `visibilityDeps`; there is no separate `permissions` field in the schema.

Do not expose private handler internals, product routes, credentials, local file paths, or host-specific policies through WebMCP descriptors.

## SSR Classes

`contract.ssr.mode` must be one of:

- `node-safe`
- `ssr-entry-safe`
- `jsda-ssr-renderable`
- `hydrate-only`
- `client-only`

Canvas, XR, media, direct DOM measurement, and browser API components should be marked `client-only` unless a verified SSR fixture proves otherwise.
