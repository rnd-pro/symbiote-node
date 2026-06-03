# Agentic Runtime Goal

Symbiote packages are libraries for agentic construction of arbitrary projects, not a single application shell.

The core goal is to let an agent construct UI and runtime structure dynamically:

- describe components as data
- register or hydrate Web Components on demand
- render components in chat or host layouts with live data
- compose surrounding layouts around the agent's own output
- update project graph, UI graph, and runtime workflow state without a server restart
- expose enough metadata for another agent to inspect capabilities and choose safe composition paths

## Design Boundary

`symbiote-ui` owns the component, layout, token, manifest, and WebMCP-facing metadata needed by agents and hosts to compose interfaces.

`symbiote-engine` owns runtime execution and workflow behavior.

Hosts own product routing, persistence policy, authorization, transport, and user-specific orchestration.

## Component Contracts

Agent-constructable components should publish:

- a stable tag name
- public properties and events
- SSR classification
- WebMCP tool metadata only when the component exposes an intentional action or inspection surface
- token and slot expectations
- client-only constraints for canvas, XR, browser APIs, or hydration-only behavior

This keeps agent composition practical without turning every internal method into a public protocol.
