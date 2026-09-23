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

And two carry daily reports:

| Model | Table | Role |
| --- | --- | --- |
| `DailyReport` | `daily_reports` | One developer's update for one working day |
| `DailyReportIssue` | `daily_report_issues` | The issues a report refers to |

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

### Daily reports

A `DailyReport` answers the same three questions every day — what was
**shipped**, what is **blocked**, what is **next** — and links to the issues it
refers to.

**`blocked` is the only nullable one.** "Nothing is blocked" and "did not say"
are different answers, and a team leader needs to tell them apart; `shipped` and
`next` always have to be filled in.

**`reportDate` is a `date`, not a timestamp.** A report covers a working day, so
a time component would let the same day exist twice and quietly break the
`(authorId, reportDate)` uniqueness that makes one report per person per day
possible.

**Reports belong to a `User`, not a `TeamMember`.** Taking someone off the
roster must not erase their work log — a team leader may still need last
month's reports. Deleting the *account* does remove them, which is the right
line to draw.

**Deleting an issue removes the link, not the report.** The report is what
someone wrote that day; a ticket disappearing afterwards does not make their
update untrue.

### Migrations

| Migration | Contents |
| --- | --- |
| `20260922000000_init` | Empty baseline that initialises Prisma's migration history and the `_prisma_migrations` table |
| `20260922031628_add_base_multi_tenant_schema` | Creates `organizations`, `workspaces` and `users` |
| `20260922032154_add_user_password_hash` | Adds `users.passwordHash` for local authentication |
| `20260922144500_add_project_and_issue_schema` | Creates `projects`, `issues`, `labels`, `issue_labels` and their enums |
| `20260923030029_add_daily_reports` | Creates `daily_reports` and `daily_report_issues` |
| `20260923061342_add_issue_closed_at` | Adds `issues.closedAt` and an index on `(organizationId, closedAt)` |

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

## Daily reports API

| Method | Path | Purpose |
| --- | --- | --- |
| `PUT` | `/daily-reports/:date` | Submit or edit your report for that day |
| `GET` | `/daily-reports` | List reports, filterable by `date` and `authorId` |

Guarded and tenant-scoped like every other resource. **The author is always the
caller** — `authorId` in the body is rejected, so nobody can file a report on
someone else's behalf.

### Why `PUT` with the date in the path

There is one report per person per day, so submitting again is an **edit**, not
a second report. `PUT` says that: it is idempotent, and resubmitting replaces
the whole report — including clearing `blocked` when it is left out.

The date is explicit rather than derived from the server clock. Deriving
"today" server-side would give someone in Tunis a different day from the
server, and the column is a `date`, so the client's day is the one that
matters. `:date` is `YYYY-MM-DD`; `2026-02-31` is rejected rather than rolling
over into March.

### Linked issues

`issueIds` are checked against the caller's tenant and de-duplicated; an id from
another organization is a **400**. On an edit the links are replaced wholesale —
the report says which issues it refers to *now*.

Deleting an issue removes it from the report's links and leaves the report
standing.

### Reading

`GET /daily-reports` returns the tenant's reports, newest day first and then by
author name, so a day's digest reads in a stable order rather than by whoever
submitted first. `?date=YYYY-MM-DD` gives one day's digest; `?authorId=` gives
one person's history.

There are **no visibility rules yet** — any authenticated caller in the tenant
can read every report. The specification says reports are visible to the
appropriate team leader; nothing enforces that.

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

`GET /issues` accepts `assigneeId`, `app`, `priority`, `closedAfter` and
`closedBefore`. They combine with AND, and an unknown enum value is rejected
with `400`.

```
GET /issues?app=axacrm&priority=high
GET /issues?assigneeId=<uuid>&closedAfter=2026-09-22T23:00:00Z&closedBefore=2026-09-23T23:00:00Z
```

Results are ordered by `createdAt` descending.

`closedAfter` and `closedBefore` are **instants**, not a calendar day, and the
window is **half-open** — closed at or after the first, strictly before the
second. That is deliberate: `closedAt` is a timestamp, and a day only exists in
some timezone, which the server has no way to know. The client sends the
boundaries of its own day, and midnight belongs to one day rather than two.

This is the query behind the daily report's *Shipped* prefill: *which issues did
this person close on this day*.

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
- **`closedAt` is maintained by the service, not sent by the caller.** Moving an
  issue into `done` sets it; moving it out clears it; re-sending `done` leaves it
  alone, because it marks the move into `done` rather than the last time someone
  confirmed the issue was finished. The board's drag-and-drop records it without
  knowing it exists.
- `closedAt` is **not** `updatedAt`. Renaming a finished issue moves `updatedAt`
  and must not move the day the work was delivered, which is the whole reason the
  column exists.
- Issues that were already `done` before the column was added have `closedAt`
  null. Backfilling from `updatedAt` would have invented dates, so they are left
  unknown and simply do not appear in a closed-on window.

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
│   ├── team/               # Daily reports and the user listing; roster to follow
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
