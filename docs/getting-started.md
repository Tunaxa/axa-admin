# Getting Started

## Requirements

- Node.js 20.11 or newer (see `.nvmrc`)
- pnpm 9 or newer
- Docker, for the local PostgreSQL and Redis containers

## Setup

```bash
pnpm install
cp .env.example .env
pnpm infra:up
```

`pnpm infra:up` starts PostgreSQL and Redis from `docker-compose.yml`. Stop them
again with `pnpm infra:down`.

## Scripts

Every script runs from the repository root and fans out through Turborepo to the
workspaces that declare the matching task.

| Script                              | Purpose                                        |
| ----------------------------------- | ---------------------------------------------- |
| `pnpm dev`                          | Start all applications in watch mode           |
| `pnpm build`                        | Build every workspace                          |
| `pnpm typecheck`                    | Run TypeScript across the monorepo             |
| `pnpm lint`                         | Lint every workspace                           |
| `pnpm test`                         | Run the test suites                            |
| `pnpm format`                       | Apply Prettier formatting                      |
| `pnpm format:check`                 | Verify formatting without writing (used by CI) |
| `pnpm clean`                        | Remove build output and `node_modules`         |
| `pnpm infra:up` / `pnpm infra:down` | Start or stop local PostgreSQL and Redis       |

## Current state

The workspace structure, shared domain types, tooling and CI are in place.
`apps/web` and `apps/api` are prepared workspace slots — their framework
scaffolds arrive in their own tasks, so `pnpm dev` has nothing to start yet.

## Working on a task

1. `git checkout dev && git pull`
2. `git checkout -b feature/<task-name>`
3. Implement, committing with Conventional Commits.
4. `pnpm format:check && pnpm typecheck`
5. Push and open a pull request into `dev`. See
   [conventions.md](./conventions.md).
