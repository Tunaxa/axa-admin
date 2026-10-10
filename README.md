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
- **Data** — PostgreSQL (primary), MongoDB (docs pages), Redis (cache and real-time)
- **Infrastructure** — Docker, GitHub Actions

## Repository Structure

```
axa-admin/
├── frontend/            # Next.js application
├── backend/             # NestJS application
├── docker-compose.yml   # Local PostgreSQL and MongoDB
└── .github/workflows/   # CI
```

The frontend and backend share a repository but are two independent projects:
each owns its dependencies, lockfile and tooling, and neither is installed or
built through the other. They communicate over HTTP and WebSockets, so either
can be deployed on its own.

## Continuous Integration

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`
and `dev`. The frontend and backend are checked in separate jobs, each with its
own `working-directory` and dependency cache, and each runs **lint**,
**type-check** and **test**.

A `detect` job runs first and reports which projects have been scaffolded, so a
project that does not exist yet is skipped rather than failing the run. No
workflow change is needed when a project is scaffolded — detection starts
matching on its own.

The backend job generates the Prisma client before type-checking, because the
model types live in the generated client. It sets a placeholder `DATABASE_URL`
for that step; generation does not open a connection, so CI starts no database.

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

## Container images

Both projects build to a container image. `docker compose` still only runs the
databases — these are for deploying, not for local development.

```bash
docker build -t axa-admin-backend backend
docker build -t axa-admin-frontend --build-arg NEXT_PUBLIC_API_URL=https://api.example frontend
```

### Measured

| Image | Single stage | Multi-stage | |
| --- | --- | --- | --- |
| Backend | 1.4 GB | **453 MB** | −68% |
| Frontend | 1.74 GB | **324 MB** | −81% |

The numbers come from building both ways and reading `docker images`, not from
an estimate.

**The frontend saving is `output: 'standalone'`.** Next traces the modules the
server actually imports and emits them next to it, so the runtime image carries
56 MB of traced dependencies instead of a full `node_modules`.

**Most of the backend saving is one flag.** `npm ci --omit=dev` is not enough:
npm has installed peer dependencies automatically since v7, and
`@prisma/client` peers on the `prisma` CLI and on TypeScript. The CLI brings
Prisma Studio, pglite, `mysql2` and `tsc` with it — 280 MB that a compiled
server never imports. `--omit=peer` does **not** remove them; `--legacy-peer-deps`
does, taking `node_modules` from 436 MB to 154 MB.

That is a sharp edge: if anything ever does need a peer at run time, the
container stops booting. CI builds the image and starts it on every pull
request for exactly that reason.

### Hardening

- **Four stages**, so the shipped image has no compiler, no dev dependencies
  and no source.
- **Non-root.** Both images run as `node` (uid 1000). Root in a container is
  one escaped process away from root on the host.
- **`tini` as PID 1.** Node does not forward `SIGTERM` or reap children, so a
  `docker stop` would wait out the grace period. Measured: the backend stops in
  **592 ms**, the frontend in **877 ms**.
- **`.dockerignore` in both projects.** Without it, `COPY . .` ships the host's
  `node_modules` — wrong architecture, hundreds of megabytes — along with any
  `.env` lying around.
- **`NEXT_PUBLIC_*` is baked in at build time**, so the frontend is an
  image per environment rather than one image promoted between them.

### CI

`format:check` now runs on both projects, and `no-unreachable` is an **error**
rather than a warning. Both were added because of what they would have caught:
a bad merge resolution left two consecutive `return` statements in the issues
service, so every issue update silently stopped recording activity, and the
pipeline stayed green — `format:check` was not run at all, and oxlint reported
the dead code as a warning, which exits 0.

Confirmed: the hardened lint exits **1** on that file and **0** on this branch.

A new `images` job builds both containers on every pull request and prints
their sizes, so an image that quietly doubles shows up in the log rather than
at deploy time.
