# Release Checklist

This checklist prepares the package split release without publishing from automation.

## Registry Preflight

Run immediately before publish:

```sh
npm view symbiote-ui
npm view symbiote-engine
npm view symbiote-node version --json
```

As of 2026-06-03, `symbiote-ui` and `symbiote-engine` were not published in the public npm registry, and `symbiote-node` resolved to `0.3.0-alpha.1`.

## Publish Order

1. Publish `symbiote-ui@0.3.0-alpha.4` with an alpha or next dist-tag.
2. Publish `symbiote-engine@0.3.0-alpha.4` with the same prerelease dist-tag.
3. Publish terminal `symbiote-node@0.3.0-alpha.4` as the migration facade.
4. Move `symbiote-node` `latest` only after consumer verification passes.

## Consumer Verification

Before changing `latest`, verify a clean consumer install that includes:

- packed `symbiote-ui`, `symbiote-engine`, and `symbiote-node`;
- `@symbiotejs/symbiote@3.8.0-webmcp.2`;
- `linkedom`;
- `jsda-kit`;
- one resolved Symbiote version.

## Deprecation Message

After the terminal release is verified, use this message for old `symbiote-node` versions:

```text
symbiote-node is a terminal migration package. Use symbiote-ui for UI, provider catalogs, WebMCP metadata, and JSDA SSR contracts; use symbiote-engine for runtime execution, CLI, server, registry, persistence, and handlers.
```

## Pack Hygiene

Before publish, `npm pack --dry-run --json --workspace <package>` must not include:

- `.agent-portal/`;
- `.gitmodules`;
- temporary audits;
- delegation logs;
- private memory files;
- local tarballs;
- absolute local paths;
- secrets or private URLs.
