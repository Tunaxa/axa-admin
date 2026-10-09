# Backend

The AXA Admin API — a NestJS application.

## Stack

- NestJS 12 + TypeScript, running as native ESM
- Prisma 7 over PostgreSQL 16
- Mongoose over MongoDB 8 for the docs module's pages
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

`docker compose up -d` now starts **two** databases: PostgreSQL and MongoDB.
MongoDB publishes on **27018**, again to avoid a collision, and the API needs
`MONGODB_URL` set — it refuses to boot without it rather than starting with a
docs module that cannot read anything.

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

Two carry the team:

| Model | Table | Role |
| --- | --- | --- |
| `TeamMember` | `team_members` | A person's place on the team and their default role |
| `AppOwnership` | `app_ownerships` | The role that person holds for one application |

Four more carry the work itself:

| Model | Table | Role |
| --- | --- | --- |
| `Project` | `projects` | A body of work grouping issues |
| `Issue` | `issues` | A unit of work |
| `Label` | `labels` | A tag applied to issues |
| `IssueLabel` | `issue_labels` | Join between issues and labels |
| `ActivityEvent` | `activity_events` | Append-only event log |

And two carry daily reports:

| Model | Table | Role |
| --- | --- | --- |
| `DailyReport` | `daily_reports` | One developer's update for one working day |
| `DailyReportIssue` | `daily_report_issues` | The issues a report refers to |
| `DevProfile` | `dev_profiles` | What one member works in, owns, and can be reached on |

`Issue` carries `status`, `priority`, `assigneeId`, its labels, and `app` — the
AXA application it delivers against. Enums are PostgreSQL types rather than
strings, so an unknown value is rejected by the database:

| Enum | Type | Values |
| --- | --- | --- |
| `ProjectStatus` | `project_status` | `backlog`, `planned`, `in_progress`, `paused`, `completed`, `cancelled` |
| `IssueStatus` | `issue_status` | `backlog`, `todo`, `in_progress`, `in_review`, `done`, `cancelled` |
| `IssuePriority` | `issue_priority` | `none`, `low`, `medium`, `high`, `urgent` |
| `AppKey` | `app_key` | `axa_admin`, `axacrm`, `axapass`, `website` |
| `Role` | `role` | `owner`, `pm_lead`, `dev_team_leader`, `developer`, `designer`, `viewer` |
| `ActivityEventType` | `activity_event_type` | `issue_status_changed`, `issue_assigned`, `issue_commented` |

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
### Team and roles

`TeamMember` is deliberately separate from `User`. `User` is the sign-in
identity; `TeamMember` is the person's place on the team. Whether AXA adopts
shared authentication across the ecosystem is still open — if it does, `User`
loses its tenant column and `TeamMember` becomes what ties an identity to an
organization, without roles having to move at the same time.

**`role x app` is expressed by `AppOwnership`.** A member holds a default
`role`, and a row per application overrides it:

| Member | Default | axapass | axacrm | Effective on axacrm |
| --- | --- | --- | --- | --- |
| Lead | `dev_team_leader` | `owner` | `viewer` | `viewer` |
| Dev | `viewer` | `developer` | — | `viewer` (default) |

So the effective role is *the ownership row for that application if one exists,
otherwise the member's default* — one left join, no precedence rules to
remember.

`(userId)` is unique, so a person has one membership; `(teamMemberId, app)` is
unique, so their role for an application is never ambiguous.

**Roles are an enum, not a table.** The plan is fixed roles now and a
customizable role editor later; promoting the enum to a table is a migration
when that day comes, which is the price of not building an editor nobody has
asked for. Approval rights — which the permission model keeps independent of
job title — are not here either; they are their own layer and their own task.

### Migrations

| Migration | Contents |
| --- | --- |
| `20260922000000_init` | Empty baseline that initialises Prisma's migration history and the `_prisma_migrations` table |
| `20260922031628_add_base_multi_tenant_schema` | Creates `organizations`, `workspaces` and `users` |
| `20260922032154_add_user_password_hash` | Adds `users.passwordHash` for local authentication |
| `20260922144500_add_project_and_issue_schema` | Creates `projects`, `issues`, `labels`, `issue_labels` and their enums |
| `20260923030029_add_daily_reports` | Creates `daily_reports` and `daily_report_issues` |
| `20260923061342_add_issue_closed_at` | Adds `issues.closedAt` and an index on `(organizationId, closedAt)` |
| `20260923013744_add_team_member_and_app_ownership` | Creates `team_members`, `app_ownerships` and the `role` enum |
| `20260922181030_add_activity_events` | Creates `activity_events` and its enum |
| `20261009221017_add_dev_profiles` | Creates `dev_profiles`, with a GIN index on `stack` |

## Docs content schema

The docs module's pages live in **MongoDB**, not PostgreSQL. A page is read and
written whole, its content is a list of blocks whose shape differs per block
type, and none of it is queried relationally — which is what a document store
is for. Everything else in this service stays in PostgreSQL.

| Collection | Contents |
| --- | --- |
| `pages` | A documentation page: its place in the tree, and its content blocks |

### The page tree

| Field | Purpose |
| --- | --- |
| `organizationId` | The owning tenant, as a PostgreSQL UUID |
| `title` | The page's name |
| `slug` | URL segment, unique per tenant |
| `parentId` | The page directly above, null at the root |
| `ancestors` | Every page above, ordered root first |
| `order` | Position among siblings |
| `blocks` | The content, in reading order |
| `authorId`, `lastEditedById` | PostgreSQL user UUIDs |

**The tree is stored twice, on purpose.** `parentId` is the edge; `ancestors`
is the whole path from the root. With `parentId` alone, expanding a branch or
building a breadcrumb costs one query per level. `ancestors` answers both in a
single indexed read:

```js
// Everything below a page, at any depth.
db.pages.find({ organizationId, ancestors: pageId })

// One level of the sidebar, in order.
db.pages.find({ organizationId, parentId }).sort({ order: 1 })
```

The cost is that **moving a page has to rewrite the `ancestors` of everything
beneath it**. That is the rarer operation, and it is a single
`updateMany` — the right side of the trade for a tree that is read constantly
and reshaped occasionally.

**`slug` is unique per tenant, not per parent**, so `/docs/<slug>` addresses a
page wherever it sits in the tree. Moving a page then does not break links to
it, which a nested path would guarantee.

### Content blocks

Blocks are **embedded in their page**, not a collection of their own. A page is
what gets read, edited and permissioned; a block outside its page means
nothing. Embedding also makes a save atomic, so a page is never half-written.

| Field | Purpose |
| --- | --- |
| `_id` | Assigned by Mongo; what anchors and links point at |
| `type` | One of the listed block types |
| `text` | The block's text, empty for blocks that carry none |
| `props` | The fields only some types have |

Types: `paragraph`, `heading_1`, `heading_2`, `heading_3`,
`bulleted_list_item`, `numbered_list_item`, `quote`, `callout`, `code`,
`divider`, `image`. The list is closed, so a typo cannot create a block type
nothing knows how to render.

`props` is deliberately untyped, and carries per type:

| Type | Keys |
| --- | --- |
| `code` | `language` |
| `image` | `url`, `alt` |
| `callout` | `icon` |
| everything else | none |

A discriminated union in the schema would have to be extended every time the
editor gains a block type. The rule that matters — which keys a type accepts —
belongs with the endpoint that writes blocks, where a bad value can be refused
with a `400`.

### What this schema does not do

- **Nothing cascades from PostgreSQL.** `organizationId`, `authorId` and
  `lastEditedById` are UUIDs in another database; Mongo cannot hold a foreign
  key to it. Deleting an organization leaves its pages behind, and cleaning
  them up is the application's job.
- **Blocks are a flat list.** Nesting — a list item containing sub-items — is
  not modelled. It would be a `children` array on `Block`, and it can be added
  without moving any existing data.
- **No versioning, no drafts, no page history.**
- **No permissions.** Every page in a tenant is readable by anything that can
  query the collection.
- **No full-text search index.** Searching docs is its own task, and the index
  it needs depends on whether search is Mongo's or something else's job.
- **A page's content is capped by Mongo's 16 MB document limit.** Enormous for
  prose; the point at which blocks would have to move to their own collection
  is far past any real documentation page.

## Docs API

All routes are guarded by `JwtAuthGuard` and scoped to the tenant in the token's
`org` claim, never to an organization id taken from the request.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/docs/pages` | Create a page |
| `GET` | `/docs/pages` | The tenant's tree, **without** page content |
| `GET` | `/docs/pages/:id` | One page, with its blocks |
| `PATCH` | `/docs/pages/:id` | Update the fields supplied |
| `DELETE` | `/docs/pages/:id` | Delete the page **and everything below it** |

### Behaviour worth knowing

- **`ancestors` is never accepted from a caller.** It is derived from the parent
  on create and recomputed on a move. A tree whose paths can be set by hand is
  a tree that will eventually disagree with itself; sending the field is
  rejected with a `400`.
- **Moving a page rewrites its descendants' paths**, in one pipelined
  `updateMany` rather than one write per descendant.
- **A page cannot be moved under itself or under its own descendant.** Both are
  refused with a `400`, because either one detaches a whole branch from the
  tree and leaves it reachable from nothing.
- **`GET /docs/pages` leaves out `blocks`.** A sidebar needs every node to draw
  itself and none of their content, which is the bulk of a page. One request
  for the whole tree, not one per level.
- **`PATCH` with `blocks` replaces the content wholesale.** A page's content is
  an ordered list, and a partial update has no way to say that a block was
  deleted — so a caller changing one paragraph sends the list back.
- **`DELETE` removes the subtree** and answers `200 {"deleted": n}` rather than
  the `204` the other modules use. Refusing while a page has children would
  leave no way to remove a section except leaf by leaf, and a call that took
  twelve pages with it should say so.
- **A duplicate slug is a `409`.** It is caught from the write rather than
  checked beforehand: two callers creating the same slug at once would both
  pass a check, and only the unique index can actually decide.
- A page belonging to another tenant is reported as **404, not 403**, so the
  response never confirms that an id exists elsewhere.
- A path parameter that is not a MongoDB id is a **400**, not a `500`.

### The slug uniqueness depends on an index

`409` on a duplicate slug is the unique index doing its job — the API has no
other check. Mongoose creates that index at startup (`autoIndex` defaults to
true), so a normal boot has it. **An environment where the index is missing
will silently accept duplicate slugs**, and `/docs/<slug>` then has two answers.
`autoIndex` is not what production should rely on; applying the indexes as a
deployment step is a task of its own and has not been done.

## Dev profiles

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/dev-profiles` | The directory, filterable by `?stack=` |
| `GET` | `/dev-profiles/:teamMemberId` | One profile |
| `PUT` | `/dev-profiles/:teamMemberId` | Create or replace **your own** |

A profile carries a `stack`, an `ownershipArea` and contact handles, and is
addressed by team member id because that is what it belongs to.

### It hangs off `TeamMember`, not `User`

Like `AppOwnership`. A profile describes somebody's place on a team and stops
meaning anything when they leave it, so removing them from the roster takes it
with them. The cost is that re-adding someone loses what they wrote, which is
acceptable for a description — and is exactly why the daily reports went the
other way and point at `User`: a work log must outlive a roster change, a
self-description need not.

### `ownershipArea` is prose, deliberately

`AppOwnership` already records which applications somebody holds a role in.
That is a different question from *who do I ask about provisioning*, which is
what this field answers. A controlled vocabulary would need a list of areas
nobody has agreed on.

### The stack is normalised, not validated

Entries are trimmed, lower-cased and de-duplicated on write, so `React`,
`react` and `  react ` do not become three skills and the filter finds all of
them. There is no list of allowed technologies — free text is the right shape
here — but without normalising, the field would be unsearchable within a month.

### `PUT` replaces

Anything left out is cleared, including the contact handles. A client loads the
profile before saving it, the same contract the daily report form works to.

### A note on the GIN index

`stack` carries a GIN index, because a b-tree cannot answer array containment
at all: `WHERE stack @> ARRAY['go']` has no other structure to use.

Measured at 5,000 profiles, the planner **chooses a sequential scan anyway** —
the whole table is 1.5 MB across 193 pages, so reading it is cheaper than
consulting the index. With `enable_seqscan` off it does use it:

```
Bitmap Heap Scan on dev_profiles
  ->  Bitmap Index Scan on dev_profiles_stack_idx
        Index Cond: (stack @> '{go}'::text[])
```

So the index works and is not yet earning its keep. It stays because it is the
only structure that *can* serve the query as the directory grows, and adding it
with the table costs nothing next to adding it to a live one.

### What this does not do

- **Nobody can edit somebody else's profile**, not even an owner. A profile is
  self-authored, and "a leader may also fix yours" is a per-record rule while
  the permission guard decides per route.
- **No delete.** A `PUT` with no fields empties a profile; removing it entirely
  means removing the member.
- **No avatar, no bio, no working hours, no timezone.**
- **`phone` is personal data** in the same table as everything else, with no
  separate handling and no way to hide it from other members.
- **No search across `ownershipArea`**, the field most likely to be searched in
  prose. That wants full text, not an array index.

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
| `GET` | `/team-members` | The roster: membership, role, user details and app ownerships |
| `POST` | `/team-members` | Put an existing user on the team |
| `PATCH` | `/team-members/:id` | Change a member's role |
| `DELETE` | `/team-members/:id` | Remove someone from the team (`204`) |
| `GET` | `/users` | List sign-in identities in the caller's tenant |

All guarded by `JwtAuthGuard` and scoped to the token's `org`, like every other
resource. `passwordHash` is never selected.

### Behaviour worth knowing

- **Registering does not put anyone on the team.** `POST /auth/register` creates
  a `User`; membership is granted deliberately through `POST /team-members`. A
  tenant can therefore have users and an empty roster — which is exactly the
  state every tenant is in today.
- **Removing a member does not delete their account.** The `User` survives; the
  membership goes, and their app ownerships cascade away with it.
- `role` defaults to `viewer` when omitted on create.
- Adding someone twice returns **409**. The unique constraint would reject it
  anyway, but a conflict that explains itself beats a 500.
- Adding a user from another tenant returns **400**, and a membership in another
  tenant reads as **404** rather than 403 — the response never confirms that an
  id exists elsewhere.
- `PATCH` changes the role and nothing else. Moving a membership to a different
  person is removing one and adding another, not an edit.
- The roster is ordered by the member's name, and each row carries its
  `role x app` ownerships.

### `/users` versus `/team-members`

Both exist and answer different questions. `/users` lists sign-in identities and
is what the assignee picker reads; `/team-members` is the roster, with roles.
They will need reconciling once assignment should be limited to people actually
on the team — a product decision, not a refactor.

Capacity, daily reports and managing app ownerships are still ahead.
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

## Activity feed

An append-only log of what happened to an issue.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/issues/:id/activity` | The issue's events, newest first |
| `GET` | `/projects/:id/activity` | The project's events, newest first (capped at 100) |
| `POST` | `/issues/:id/comments` | Record a comment |

`GET /projects` lists the tenant's projects, which is what the feed's project
picker reads.

The project feed is scoped through the issue's **current** `projectId` rather
than a column on the event, so an issue moved between projects takes its
history with it. Recording the project on each event would instead freeze where
it happened — a defensible reading, but not the one a project feed is read for.

Events are written by the issues service, in the **same transaction** as the
change they describe, so the feed cannot end up disagreeing with the issue.

| Type | Recorded when | Payload |
| --- | --- | --- |
| `issue_status_changed` | `PATCH` changes `status` | `{ "from": "todo", "to": "in_progress" }` |
| `issue_assigned` | `PATCH` changes `assigneeId` | `{ "from": null, "to": "<user id>" }` |
| `issue_commented` | `POST /issues/:id/comments` | `{ "body": "…" }` |

A `PATCH` that sets a field to the value it already has records nothing, and
fields other than status and assignee are not logged — the feed is a record of
the decisions worth reading back, not a diff of every column.

### Append-only

There is no `updatedAt` on `activity_events` and nothing rewrites a row. A
correction is a new event. That is what makes the feed a record of *what
happened* rather than of what things look like now, and it is the property the
account-request audit trail will depend on later.

`actorId` is `SetNull` rather than cascading, so an event survives the person
who caused it leaving. Deleting the **issue** does cascade its events, which
follows from issues being hard-deletable.

### Comments have no table of their own

A comment is an activity event carrying its text, so comments **cannot be
edited or deleted**. That is a deliberate floor, not the end state: the data
model notes an `IssueComment` entity, and when it arrives the event should
reference the comment by id instead of carrying the body.

## Permissions

Until now any authenticated member of a tenant could do anything — create,
edit and delete every issue, page and report. `PermissionsGuard` closes that.

### Declared per route, decided in one place

Routes say what they *are*; `src/auth/permissions.ts` says who may.

```ts
@RequirePermissions('work:delete')
@Delete(':id')
remove(...)
```

Annotating routes with roles instead would spread policy across every
controller: deciding that a designer may now delete a page would mean editing
call sites rather than one table.

| Permission | Covers |
| --- | --- |
| `work:read` / `work:write` / `work:delete` | Issues, projects, workspaces, activity |
| `docs:read` / `docs:write` / `docs:delete` | Documentation pages |
| `team:read` / `team:manage` | The roster and the user list |
| `reports:read` / `reports:write` | Daily reports |

| Role | Reads | Writes | Deletes | Manages the roster |
| --- | --- | --- | --- | --- |
| `owner` | ✓ | ✓ | ✓ | ✓ |
| `pm_lead` | ✓ | ✓ | ✓ | ✓ |
| `dev_team_leader` | ✓ | ✓ | ✓ | — |
| `developer` | ✓ | ✓ | — | — |
| `designer` | ✓ | ✓ | — | — |
| `viewer` | ✓ | — | — | — |

Deleting is kept away from the roles that do the day's work: an issue or a page
removed by accident takes what it said with it, so deletion sits with the
people accountable for the record.

### It denies by default

The guard is global, and **a route that declares nothing is refused** — for an
`owner` as much as anyone. A new endpoint added without a decision about who
may call it fails in development instead of shipping open, which is how this
service has been running until now. The refusal is logged with the handler's
name, because it is a mistake in the code rather than in the request.

Three decorators cover everything:

| Decorator | Means |
| --- | --- |
| `@Public()` | No token — registering, logging in, the health check |
| `@AuthenticatedOnly()` | A valid token and nothing more — only `/auth/me`, which has to work before anyone has a role |
| `@RequirePermissions(…)` | A valid token and every permission listed |

### The guard runs the token check itself

A global guard runs *before* controller guards, so registering both would mean
checking permissions before anything had verified the token. `PermissionsGuard`
calls `JwtAuthGuard` first instead, and `@UseGuards(JwtAuthGuard)` has been
removed from the controllers — one guard, one place to reason about.

### Bootstrapping an empty tenant

Adding the first member needs `team:manage`, which needs a membership, which
nobody has. So **while a tenant has no members at all, any account in it may
create roster entries — and nothing else.** The first `POST /team-members`
closes the door behind it.

Two consequences, both deliberate and both worth knowing:

- Whoever registers first in an empty tenant can appoint themselves. Seeding an
  owner at provisioning time would close that, and is the better answer once
  there is a provisioning step to hang it on.
- **Removing the last member re-opens it.** Nothing yet stops a roster from
  being emptied, and an empty roster is a bootstrappable one.

### What this does not do

- **The per-application layer is not enforced.** `AppOwnership` grants a role
  per application, and the guard ignores it: only `TeamMember.role` decides.
  Enforcing it needs each route to say which application it concerns, which for
  `PATCH /issues/:id` means loading the issue before the guard can decide.
  Treating ownerships as extra permissions in the meantime would have been
  worse than ignoring them — owning one application would quietly raise your
  role everywhere.
- **No ownership of records.** A developer may edit any issue, not only their
  own, and anyone with `reports:read` reads everybody's daily report. The
  specification wants reports visible to the appropriate team leader; that is a
  row-level rule, not a route-level one.
- **One query per request** to resolve the caller's role. Nothing is cached.
- **Feature modules still import `AuthModule`** although they no longer use
  `JwtAuthGuard` directly. Removing those imports touches five module files
  that open pull requests are also editing, for no change in behaviour.

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
