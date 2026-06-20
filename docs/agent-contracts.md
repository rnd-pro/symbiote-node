# Agent Contract Index

This repository exposes the `symbiote-node` terminal facade. Agent-facing UI and runtime contracts come from the external `symbiote-ui` and `symbiote-engine` packages through package exports, schemas, manifests, and WebMCP descriptors. Agents should prefer these public artifacts over implementation files.

## Contract Sources

| Need | Public Source | Notes |
|---|---|---|
| Package boundary and migration | [`docs/package-split.md`](package-split.md) | Use `symbiote-ui` for UI/provider contracts and `symbiote-engine` for runtime execution. |
| Component catalog | `symbiote-ui/manifest`, `symbiote-ui/custom-elements.json` | Discover tags, modules, categories, descriptors, and Custom Elements metadata. |
| Provider discovery | `symbiote-ui discover` or `symbiote-ui/discover` | Returns exports, components, schemas, rules, themes, locale metadata, runtime packs, and driver menus as JSON. |
| Component descriptor schema | `symbiote-ui/schemas/component-descriptor-v2.json` | Use for SSR class, WebMCP tools, properties, events, slots, theme aliases, and public capabilities. |
| Runtime UI layout tree | `symbiote-ui/schemas/runtime-ui-v1.json` | Describes dynamic component trees, props, attrs, bindings, events, layout regions, themes, and children. |
| Project package | `symbiote-ui/schemas/project-package-v1.json` | Binds graphs, layouts, themes, data sources, packs, and agent rules into one project payload. |
| Project transaction | `symbiote-ui/schemas/project-transaction-v1.json` | Describes graph, layout, and theme mutations that can be applied without a server restart. |
| WebMCP policy | [`docs/webmcp.md`](webmcp.md), `symbiote-ui/webmcp` | Documents intentional tool descriptors and native registration behavior. |
| Agentic runtime goal | [`docs/agentic-runtime.md`](agentic-runtime.md) | Explains the runtime composition model and host boundary. |

## Entry Point Classes

| Entry Point | Class | Agent Use |
|---|---|---|
| `symbiote-ui` | `node-safe` | Import in Node or SSR for provider/core helpers without creating DOM globals. |
| `symbiote-ui/core` | `node-safe` | Use graph editor data primitives. |
| `symbiote-ui/graph` | `node-safe` | Normalize and project graph models across UI and runtime hosts. |
| `symbiote-ui/manifest` | `node-safe` | Read provider catalogs for components, rules, tokens, schemas, and themes. |
| `symbiote-ui/layout` | `ssr-entry-safe` | Build layout trees and section/router metadata without browser component registration. |
| `symbiote-ui/webmcp` | `ssr-entry-safe` | Create bounded descriptors and register native tools only when a model context exists. |
| `symbiote-ui/ui` | `browser` | Register browser Web Components and hydrate interactive UI. |
| `symbiote-ui/xr` | `ssr-entry-safe` | Use XR capability and spatial layout helpers; renderer surfaces still require browser checks. |
| `symbiote-engine` | `node-safe` | Run graph execution, handler packs, server helpers, persistence, and CLI workflows. |

## Composition Flow

1. Read `symbiote-ui/manifest` or run `symbiote-ui discover`.
2. Choose a component by descriptor, SSR mode, public properties, events, slots, and theme aliases.
3. Build a `runtime-ui-v1` tree with component tags, props, bindings, events, layout metadata, and theme references.
4. Use `project-package-v1` when the agent needs to describe a complete graph/layout/theme bundle.
5. Use `project-transaction-v1` for incremental graph, layout, or theme updates while the host stays running.
6. Register browser components through `symbiote-ui/ui` only in browser or hydrated host code.
7. Use WebMCP descriptors only for explicit public actions or inspection surfaces.

## WebMCP Bounds

WebMCP metadata is documentation for agents when it describes a stable public affordance. Keep it limited to:

- `contract.webmcp.tools[].name`
- `contract.webmcp.tools[].description`
- `contract.webmcp.tools[].inputSchema`
- `contract.webmcp.tools[].annotations`
- `contract.webmcp.tools[].exposedTo`
- `contract.webmcp.tools[].visibilityDeps`
- SSR or client-only constraints

Permission and visibility hints are represented by `annotations`, `exposedTo`, and `visibilityDeps`; do not invent a separate `permissions` field unless the schema adds one.

Do not expose host routes, credentials, private handler internals, local paths, private memory, or product policy through WebMCP metadata.

## SSR And Client Constraints

Agents must respect `contract.ssr.mode` from `component-descriptor-v2`:

- `node-safe`: no DOM globals are required.
- `ssr-entry-safe`: importable in SSR entry code without registering browser components.
- `jsda-ssr-renderable`: renderable after the host provides the JSDA/linkedom SSR environment.
- `hydrate-only`: SSR may provide shell markup, but behavior activates in the browser.
- `client-only`: requires browser APIs such as canvas, XR, observers, layout metrics, focus, or animation frames.

`node-safe` and `ssr-entry-safe` mean import safety. They do not guarantee that every exported helper is meaningful without host data, a DOM adapter, browser hydration, or runtime-provided objects.

External SSR hosts can use `jsda-kit` and `linkedom` for integration tests, but `jsda-kit` is not a runtime dependency of `symbiote-ui` and is not maintained in this repository.

## Boundaries

Agents should not deep-import implementation paths from `symbiote-ui`, `symbiote-engine`, or legacy `symbiote-node` sources in consuming projects. If a capability is missing from a package export, add or request a public contract instead of relying on a private file path.

Private `.agent-portal/` content is coordination memory. It is not a public contract and must not be copied into package docs, tests, fixtures, or release artifacts.
