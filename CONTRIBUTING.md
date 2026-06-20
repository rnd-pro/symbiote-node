# Contributing

This repository is an npm workspace with one package:

- `packages/symbiote-node`

Keep changes inside the package that owns the behavior. This repository owns only the `symbiote-node` terminal migration facade. UI/provider metadata belongs in the external `symbiote-ui` project, and runtime execution belongs in the external `symbiote-engine` project.

Run the relevant tests before opening a change:

```sh
npm test
npm run pack:dry-run
```

Do not include private coordination files, local paths, temporary audits, or generated package tarballs in commits.
