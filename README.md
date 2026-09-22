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

| Module | Purpose |
| --- | --- |
| Work | Issues, projects, cycles, kanban/list/board views, keyboard-first navigation |
| Roadmap | Phase and milestone views linked to issues |
| Team | Roster, roles, per-app ownership, capacity, daily reports |
| Company | Company details, KPI dashboard, goals and reviews |
| Docs | Living documentation, architecture, conventions, developer profiles |
| App Usage | Deploy status, CI health, error rates, signups and MRR |
| Account Requests | Provisioning gateway across the customer-facing applications |
| Permissions | Role- and app-scoped access control |
| Activity Feed | Chronological feed of status changes, comments and merges |

## Tech Stack

- **Frontend** — Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- **State & data** — TanStack Query, WebSockets
- **Backend** — NestJS, Prisma
- **Data** — PostgreSQL (primary), Redis (cache and real-time)
- **Infrastructure** — Docker, GitHub Actions

## Repository Structure

```
axa-admin/
├── frontend/            # Next.js application
├── backend/             # NestJS application
└── docker-compose.yml   # Local PostgreSQL
```

The frontend and backend share a repository but are two independent projects:
each owns its dependencies, lockfile and tooling, and neither is installed or
built through the other. They communicate over HTTP and WebSockets, so either
can be deployed on its own.

## Git Workflow

- `main` is the production branch and is never developed on directly.
- `dev` is the integration branch; every task branch is created from `dev`.
- Branches follow `feature/*`, `fix/*`, `refactor/*`, `docs/*`, `chore/*` and `test/*`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).
- Pull Requests target `dev` and are reviewed and merged by the repository maintainer.

## Status

Early development. The repository structure is in place;
`frontend/` and `backend/` are prepared directories awaiting their
framework scaffolds. See the phased build plan in the project
documentation.
