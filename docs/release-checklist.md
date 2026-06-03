# Release Checklist

This checklist records the package split release gates and post-release verification.

## Registry Preflight

Run immediately before publish:

```sh
npm view symbiote-ui
npm view symbiote-engine
npm view symbiote-node version --json
```

On 2026-06-03, the preflight showed `symbiote-ui` and `symbiote-engine` were not published in the public npm registry, and `symbiote-node` resolved to `0.3.0-alpha.1`.

## Publish Order

1. Published `symbiote-engine@0.3.0-alpha.6` with browser npm authorization.
2. Published `symbiote-ui@0.3.0-alpha.6` with browser npm authorization.
3. Published terminal `symbiote-node@0.3.0-alpha.6` as the migration facade.
4. Verified public registry dist-tags after publish and browser-auth tag updates.

Post-release registry state:

- `symbiote-engine`: `latest`, `alpha`, and `next` point to `0.3.0-alpha.6`.
- `symbiote-ui`: `latest`, `alpha`, and `next` point to `0.3.0-alpha.6`.
- `symbiote-node`: `latest` and `alpha` point to `0.3.0-alpha.6`.

## Consumer Verification

After publish, verify a clean consumer install that includes:

- registry `symbiote-ui`, `symbiote-engine`, and `symbiote-node`;
- `@symbiotejs/symbiote@3.8.0-webmcp.2`;
- `linkedom`;
- `jsda-kit`;
- one resolved Symbiote version.

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

Before publish, `npm pack --dry-run --json --workspace <package>` must not include:

- `.agent-portal/`;
- `.gitmodules`;
- temporary audits;
- delegation logs;
- private memory files;
- local tarballs;
- absolute local paths;
- secrets or private URLs.
