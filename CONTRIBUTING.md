# Contributing

This repository is an npm workspace with three packages:

- `packages/symbiote-ui`
- `packages/symbiote-engine`
- `packages/symbiote-node`

Keep changes inside the package that owns the behavior. UI/provider metadata belongs in `symbiote-ui`; runtime execution belongs in `symbiote-engine`; `symbiote-node` is a terminal migration facade.

Run the relevant tests before opening a change:

```sh
npm test
npm run pack:dry-run
```

Do not include private coordination files, local paths, temporary audits, or generated package tarballs in commits.
