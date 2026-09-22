# Backend

The AXA Admin API — a NestJS application.

## Stack

- NestJS 12 + TypeScript, running as native ESM
- Prisma 7 over PostgreSQL 16
- JWT authentication via `@nestjs/jwt`, bcrypt password hashing
- Vitest for unit and end-to-end tests
- oxlint for linting, Prettier for formatting

Redis and the Socket.io gateway are planned but not yet wired up; they arrive
with their own tasks.

## Getting started

```bash
npm install
npm run start:dev
```

The API listens on `API_PORT`, defaulting to **4000** so it does not collide
with the frontend dev server on 3000.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run start:dev` | Start in watch mode |
| `npm run start` | Start once |
| `npm run start:prod` | Run the compiled output from `dist/` |
| `npm run build` | Compile to `dist/` |
| `npm run lint` | Lint `src/` and `test/` with oxlint |
| `npm run format` | Apply Prettier |
| `npm run format:check` | Verify formatting without writing |
| `npm run typecheck` | Type-check without emitting |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Create and apply a migration in development |
| `npm run db:deploy` | Apply pending migrations (CI/production) |
| `npm run db:status` | Show migration status |
| `npm run db:studio` | Open Prisma Studio |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run test:cov` | Run unit tests with coverage |

## Database

Start PostgreSQL from the repository root, then point the backend at it:

```bash
docker compose up -d          # from the repository root
cp .env.example .env          # in backend/
npm run db:generate
npm run db:status
```

The container publishes PostgreSQL on host port **5433** by default, not 5432,
to avoid colliding with other local PostgreSQL instances. Override it with
`POSTGRES_PORT` in the root `.env` and keep `DATABASE_URL` in `backend/.env` in
step with it.

### Prisma 7 notes

Two things changed in Prisma 7 and both are easy to trip over:

- The datasource URL lives in `prisma.config.ts`, **not** in `schema.prisma`.
  The schema declares only the provider.
- `.env` is no longer loaded implicitly, hence the `dotenv/config` import at the
  top of `prisma.config.ts`.

### Schema

Three models form the tenancy base:

| Model | Table | Role |
| --- | --- | --- |
| `Organization` | `organizations` | The tenant root |
| `Workspace` | `workspaces` | A container inside a tenant |
| `User` | `users` | A person who can sign in |

Four more carry the work itself:

| Model | Table | Role |
| --- | --- | --- |
| `Project` | `projects` | A body of work grouping issues |
| `Issue` | `issues` | A unit of work |
| `Label` | `labels` | A tag applied to issues |
| `IssueLabel` | `issue_labels` | Join between issues and labels |

`Issue` carries `status`, `priority`, `assigneeId`, its labels, and `app` — the
AXA application it delivers against. Enums are PostgreSQL types rather than
strings, so an unknown value is rejected by the database:

| Enum | Type | Values |
| --- | --- | --- |
| `ProjectStatus` | `project_status` | `backlog`, `planned`, `in_progress`, `paused`, `completed`, `cancelled` |
| `IssueStatus` | `issue_status` | `backlog`, `todo`, `in_progress`, `in_review`, `done`, `cancelled` |
| `IssuePriority` | `issue_priority` | `none`, `low`, `medium`, `high`, `urgent` |
| `AppKey` | `app_key` | `axa_admin`, `axacrm`, `axapass`, `website` |

Deletes are chosen per relation rather than uniformly. Removing a tenant
cascades to everything it owns, but removing an **assignee** or a **project**
leaves the issue in place with the reference set to null — losing work because
someone left the team or a project was closed would be the wrong default.

`Workspace` and `User` both carry `organizationId` with an index and a
cascading foreign key. Uniqueness is scoped to the tenant rather than global —
`(organizationId, slug)` for workspaces and `(organizationId, email)` for users
— so two organizations can each have a `core` workspace, and the same email
address can exist in both.

**Single-tenant for now.** The schema is shaped for multiple tenants, but the
application operates on exactly one organization. Nothing in the database
enforces that limit; it is an application-level assumption, so lifting it later
is a code change rather than a migration of every table. Row-level isolation,
a request-scoped tenant context and query guards are separate work.

Roles, permissions and memberships are deliberately absent — they belong to the
permissions work, not to the base schema.

### Migrations

| Migration | Contents |
| --- | --- |
| `20260922000000_init` | Empty baseline that initialises Prisma's migration history and the `_prisma_migrations` table |
| `20260922031628_add_base_multi_tenant_schema` | Creates `organizations`, `workspaces` and `users` |
| `20260922032154_add_user_password_hash` | Adds `users.passwordHash` for local authentication |
| `20260922144500_add_project_and_issue_schema` | Creates `projects`, `issues`, `labels`, `issue_labels` and their enums |

## Authentication

> **Provisional.** The ecosystem-wide shared-auth/SSO decision is still open.
> Tokens are currently issued *and* verified by this service. If AXA adopts a
> shared identity provider, the issuing half moves out and the verifying half
> stays — which is why they are separate pieces here.

### Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/auth/register` | Create a user and return an access token |
| `POST` | `/auth/login` | Exchange credentials for an access token |
| `GET` | `/auth/me` | Return the claims of the presented token |

`/auth/me` is guarded by `JwtAuthGuard` and exists to exercise verification.
Reuse that guard to protect other routes:

```ts
@UseGuards(JwtAuthGuard)
```

### Token claims

```json
{ "sub": "<user id>", "org": "<organization id>", "email": "<email>" }
```

`org` is included so a verified token carries the tenant boundary with it and
downstream code does not need a second lookup to know which tenant a request
belongs to.

### Configuration

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | Signing secret. Required — the app refuses to start without it. |
| `JWT_EXPIRES_IN` | Token lifetime, default `15m` |
| `CORS_ORIGINS` | Comma-separated browser origins allowed to call the API, default `http://localhost:3000` |

Generate a secret per environment:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Notes

- Passwords are hashed with bcrypt at 12 rounds. `passwordHash` is never
  returned by any endpoint.
- Login compares against a dummy hash when the account does not exist, so a
  missing account and a wrong password take a similar time to reject.
- `organizationId` is passed explicitly in the register and login payloads.
  Resolving the tenant implicitly — from the request host, from configuration,
  or from the single existing organization — belongs to the tenant-context
  work.
- Requests are validated by a global `ValidationPipe` with `whitelist` and
  `forbidNonWhitelisted`, so unknown properties are rejected rather than
  silently dropped.
- CORS lists allowed origins from `CORS_ORIGINS` rather than reflecting the
  request origin, so a misconfigured deployment fails closed instead of
  accepting every site.

## Workspaces API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/workspaces` | List the workspaces in the caller's tenant |

Guarded and tenant-scoped like everything else, returning `id`, `name` and
`slug` ordered by name. It exists because creating an issue requires a
`workspaceId` and the frontend had no way to learn one.

## Team API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/users` | List everyone in the caller's tenant |

Guarded by `JwtAuthGuard` and scoped to the token's `org`, like every other
resource. It returns `id`, `name` and `email` only — `passwordHash` is never
selected — and is ordered by name.

It exists because the issue detail panel needs somewhere to read assignable
people from. The wider roster work (roles, per-app ownership, capacity, daily
reports) is still ahead.
## Issues API

All routes are guarded by `JwtAuthGuard` and scoped to the tenant in the token's
`org` claim, never to an organization id taken from the request. A caller cannot
reach another tenant's issues by guessing ids.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/issues` | Create an issue |
| `GET` | `/issues` | List issues, optionally filtered |
| `PATCH` | `/issues/:id` | Update the fields supplied |
| `DELETE` | `/issues/:id` | Delete an issue (`204`) |

### Filters

`GET /issues` accepts `assigneeId`, `app` and `priority`. They combine with
AND, and an unknown enum value is rejected with `400`.

```
GET /issues?app=axacrm&priority=high
```

Results are ordered by `createdAt` descending.

### Behaviour worth knowing

- An issue belonging to another tenant is reported as **404, not 403**, so the
  response never confirms that an id exists elsewhere.
- `workspaceId`, `assigneeId` and `projectId` are checked against the caller's
  tenant on write and rejected with `400` when they belong to another one. The
  project is additionally checked against the issue's workspace.
- `workspaceId` cannot be changed through `PATCH`. Moving an issue between
  workspaces is a different operation, with its own rules about whether the
  project and assignee follow.
- Omitted fields keep their value; `status` and `priority` fall back to the
  schema defaults (`backlog`, `none`) on create.

## Structure

```
backend/
├── src/
│   ├── main.ts             # Bootstrap
│   ├── app.module.ts       # Root module, imports every feature module
│   ├── app.controller.ts   # Root route
│   ├── app.service.ts
│   ├── auth/               # JWT issue/verify, login and register
│   ├── prisma/             # PrismaService and module
│   ├── work/               # Workspaces API; issues, projects and cycles to follow
│   ├── team/               # Roster listing; roles and reports to follow
│   ├── company/            # Company details, KPI dashboard, goals
│   ├── docs/               # Living documentation and onboarding
│   └── requests/           # Account requests and provisioning
├── prisma/
│   ├── schema.prisma       # Data model
│   └── migrations/         # Migration history
├── prisma.config.ts        # Prisma CLI configuration
└── test/                   # End-to-end tests
```

`work/` now holds the Issues API. The remaining feature modules are still empty
`@Module({})`s registered in `AppModule`; controllers, services and Prisma
access are added by the feature task for each one, so the folder structure is in
place without pre-empting decisions those tasks need to make.

### Planned additions

- `src/common/` — interceptors, filters and the request-scoped tenant context
  that enforces `organization_id` isolation.
- `src/integrations/` — a pluggable webhook/event layer behind a provider
  interface, so GitHub, Microsoft Teams and Stripe can be added or swapped
  without module code depending on a provider SDK.

## ESM note

The project is native ESM (`"type": "module"` with `module: nodenext`), so
relative imports must carry the `.js` extension even when the source file is
`.ts`:

```ts
import { AppModule } from './app.module.js';
```
