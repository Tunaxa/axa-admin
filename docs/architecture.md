# Architecture

## Monorepo layout

```
axa-admin/
├── apps/
│   ├── web/                 # Next.js frontend
│   └── api/                 # NestJS backend
├── packages/
│   ├── types/               # @axa-admin/types — shared domain model
│   └── config/              # @axa-admin/config — shared tsconfig/prettier presets
├── docs/                    # Repository documentation
├── .github/workflows/       # CI
├── docker-compose.yml       # Local PostgreSQL and Redis
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

A single repository is used because the frontend and backend share one domain
model. `@axa-admin/types` is the contract between them: it holds types only, so
importing it from either side never drags framework code along.

**pnpm workspaces** handle dependency resolution and **Turborepo** orchestrates
tasks. Every workspace exposes the same task names (`build`, `dev`, `lint`,
`typecheck`, `test`, `clean`), so a root-level `pnpm typecheck` fans out to
whichever workspaces declare that task. Adding a workspace requires no changes
to the root configuration.

## Dependency direction

```
apps/web  ──┐
            ├──>  packages/types  (types only, no runtime dependencies)
apps/api  ──┘
```

Applications depend on packages. Packages never depend on applications, and
`apps/web` and `apps/api` never import from each other — they communicate over
HTTP and WebSockets.

## Multi-tenancy

The data model is tenant-shaped from day one rather than retro-fitted in
Phase 4, because adding a tenant boundary to an existing schema is far more
invasive than starting with one.

- `Organization` is the tenant root; `Workspace` subdivides it.
- `TenantScopedEntity` contributes `organizationId` — the `org_id` /
  `tenant_id` column that every table indexes and every query filters on.
- `WorkspaceScopedEntity` adds `workspaceId` for project-level records.
- Roles live on `Membership`, not `User`, so one identity can hold different
  permissions in different organizations.

Phase 1 shapes the model; Phase 4 enforces isolation end to end (row-level
policies, a request-scoped tenant context and query guards).

## Permission model

Four layers, as specified:

1. **System roles** — a fixed set (`owner`, `pm_lead`, `dev_team_leader`,
   `developer`, `designer`, `viewer`). A customizable editor is deferred.
2. **Per-app scoping** — permissions resolve as `role x app`, held in
   `Membership.appRoles`.
3. **Approval rights** — granted per application and independent of job title,
   held in `Membership.approvalGrants`.
4. **Tenant isolation** — enforced below the permission check, so a permitted
   action still cannot cross an organization boundary.

## Real-time

Real-time is treated as an architectural input rather than a later addition,
because it shapes how the Work module reads and writes. The intended approach is
a Socket.io gateway on the backend with Redis pub/sub for fan-out across
instances, and TanStack Query on the frontend with cache updates driven by
server events. The Activity Feed is the first consumer: its append-only
`ActivityEvent` stream doubles as the change log the UI subscribes to.

## Integrations

GitHub, Microsoft Teams and Stripe are consumed through a pluggable
webhook/event layer under `apps/api/src/integrations`, behind a provider
interface. No module code references a provider SDK directly, so a provider can
be added or replaced without touching module logic.

## Open decisions

These remain deliberately open and should not be settled silently:

- Shared authentication / SSO across the AXA ecosystem
- Final stack confirmation
- Custom UI versus an open-source Linear-like base
- GitHub synchronization direction (one-way or two-way)
- Notification channels
- Handling and visibility of missed daily reports
