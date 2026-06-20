# Release Checklist

This checklist records the `symbiote-node` facade release gates. It does not publish or version `symbiote-ui` or `symbiote-engine`; those are external projects.

## Registry Preflight

Run immediately before a `symbiote-node` publish:

```sh
npm view symbiote-ui dist-tags --json
npm view symbiote-engine dist-tags --json
npm view symbiote-node version --json
npm view symbiote-ui@0.3.0-alpha.45 version
npm view symbiote-engine@0.3.0-alpha.11 version
```

The current facade source depends on:

- `symbiote-ui@0.3.0-alpha.45`
- `symbiote-engine@0.3.0-alpha.11`
- `@symbiotejs/symbiote@3.8.0-webmcp.2`

## Consumer Verification

After packing or publishing, verify a clean consumer install that includes:

- registry `symbiote-node`;
- registry dependencies `symbiote-ui` and `symbiote-engine`;
- `@symbiotejs/symbiote@3.8.0-webmcp.2`;
- `linkedom`;
- `ws`;
- one resolved Symbiote runtime version.

For `jsda-kit` consumers, use npm overrides to keep a single Symbiote runtime:

```json
{
  "dependencies": {
    "@symbiotejs/symbiote": "3.8.0-webmcp.2"
  },
  "overrides": {
    "@symbiotejs/symbiote": "$@symbiotejs/symbiote"
  }
}
```

## Deprecation Message

After the terminal release is verified, use this message for old `symbiote-node` versions:

```text
symbiote-node is a terminal migration package. Use symbiote-ui for UI, provider catalogs, WebMCP metadata, and JSDA SSR contracts; use symbiote-engine for runtime execution, CLI, server, registry, persistence, and handlers.
```

## Pack Hygiene

Before publish, `npm pack --dry-run --json --workspace symbiote-node` must not include:

- `.agent-portal/`;
- `.gitmodules`;
- temporary audits;
- delegation logs;
- private memory files;
- local tarballs;
- embedded `symbiote-ui` or `symbiote-engine` source trees;
- absolute local paths;
- secrets or private URLs.
