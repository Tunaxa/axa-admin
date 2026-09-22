# Workflows

| Workflow | Trigger                                     | Purpose                                                 |
| -------- | ------------------------------------------- | ------------------------------------------------------- |
| `ci.yml` | Push to `main`/`dev`, PRs into `main`/`dev` | Format, typecheck, lint, test and build every workspace |

`ci.yml` runs each stage through Turborepo, so a workspace is only checked when
it declares the matching task. Packages added later are picked up automatically.
