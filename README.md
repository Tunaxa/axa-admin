# axa-admin

Internal operations and knowledge platform for the AXA ecosystem.

`axa-admin` is the fourth application in the AXA ecosystem. Unlike `axacrm`, `axapass`
and the public website, it is not customer-facing — it is the internal platform used to
run the company. It combines an **operations layer** (issue and project tracking, team
roster, roles, KPIs, company details) with a **knowledge layer** (living documentation
covering architecture, conventions, app structure and developer onboarding).

It also acts as the source of provisioning truth for the other AXA applications,
turning incoming account requests into active, billed accounts.

## Modules

| Module           | Purpose                                                                      |
| ---------------- | ---------------------------------------------------------------------------- |
| Work             | Issues, projects, cycles, kanban/list/board views, keyboard-first navigation |
| Roadmap          | Phase and milestone views linked to issues                                   |
| Team             | Roster, roles, per-app ownership, capacity, daily reports                    |
| Company          | Company details, KPI dashboard, goals and reviews                            |
| Docs             | Living documentation, architecture, conventions, developer profiles          |
| App Usage        | Deploy status, CI health, error rates, signups and MRR                       |
| Account Requests | Provisioning gateway across the customer-facing applications                 |
| Permissions      | Role- and app-scoped access control                                          |
| Activity Feed    | Chronological feed of status changes, comments and merges                    |

## Tech Stack

- **Frontend** — Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- **State & data** — TanStack Query, WebSockets
- **Backend** — NestJS, Prisma
- **Data** — PostgreSQL (primary), Redis (cache and real-time)
- **Infrastructure** — Docker, GitHub Actions

## Repository Structure

```
axa-admin/
├── apps/
│   ├── web/                 # Next.js frontend
│   └── api/                 # NestJS backend
├── packages/
│   ├── types/               # @axa-admin/types — shared domain model
│   └── config/              # @axa-admin/config — shared tsconfig/prettier presets
├── docs/                    # Repository documentation
├── docker-compose.yml       # Local PostgreSQL and Redis
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

A pnpm workspace orchestrated by Turborepo. The frontend and backend share one
domain model through `@axa-admin/types`, which contains types only so either
side can import it without pulling in framework code.

## Getting Started

```bash
pnpm install
cp .env.example .env
pnpm infra:up
```

See [docs/getting-started.md](./docs/getting-started.md) for the full script
reference, [docs/architecture.md](./docs/architecture.md) for the monorepo and
multi-tenancy design, and [docs/conventions.md](./docs/conventions.md) for
branching, commit and code conventions.

## Git Workflow

- `main` is the production branch and is never developed on directly.
- `dev` is the integration branch; every task branch is created from `dev`.
- Branches follow `feature/*`, `fix/*`, `refactor/*`, `docs/*`, `chore/*` and `test/*`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).
- Pull Requests target `dev` and are reviewed and merged by the repository maintainer.

## Status

Early development. The workspace structure, shared domain types, tooling and CI
are in place; `apps/web` and `apps/api` are prepared slots awaiting their
framework scaffolds. See the phased build plan in the project documentation.
