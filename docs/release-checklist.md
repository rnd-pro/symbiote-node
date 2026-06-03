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

1. Published `symbiote-ui@0.3.0-alpha.4` with browser npm authorization.
2. Published `symbiote-engine@0.3.0-alpha.4` with browser npm authorization.
3. Published terminal `symbiote-node@0.3.0-alpha.4` as the migration facade.
4. Verified public registry dist-tags after publish.

Post-release registry state:

- `symbiote-ui`: `latest` and `alpha` point to `0.3.0-alpha.4`.
- `symbiote-engine`: `latest` and `alpha` point to `0.3.0-alpha.4`.
- `symbiote-node`: `latest` points to `0.3.0-alpha.4`; `alpha` remains on the previous alpha channel.

Follow-up registry state for `0.3.0-alpha.5`:

- Publish `symbiote-engine@0.3.0-alpha.5` first.
- Publish `symbiote-ui@0.3.0-alpha.5` after the engine package is available.
- Publish terminal `symbiote-node@0.3.0-alpha.5` after both split packages are available.
- Verify `latest` and `alpha` dist-tags point to `0.3.0-alpha.5` for all three packages after publish.

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
