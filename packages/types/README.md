# @axa-admin/types

Shared domain types consumed by both `apps/web` and `apps/api`.

This package is the single definition of the AXA Admin data model. It contains
types only — no runtime logic, no validation and no dependencies — so it can be
imported from either side of the monorepo without pulling in framework code.

## Multi-tenancy

Multi-tenancy is part of the model from day one rather than retro-fitted later:

- `TenantScopedEntity` adds `organizationId`, the `org_id` / `tenant_id` column
  that the persistence layer indexes and filters on.
- `WorkspaceScopedEntity` adds `workspaceId` for records that also belong to a
  workspace inside the tenant.
- Roles live on `Membership`, not `User`, so one identity can hold different
  permissions in different organizations.

## Contents

| File                 | Entities                                                         |
| -------------------- | ---------------------------------------------------------------- |
| `common.ts`          | Id aliases, `BaseEntity`, tenant/workspace scoping, pagination   |
| `organization.ts`    | `Organization`, `Workspace`, `CompanyProfile`                    |
| `app.ts`             | `App`, `AppKey`                                                  |
| `user.ts`            | `User`, `TeamMemberProfile`                                      |
| `role.ts`            | `SystemRole`, `AppRoleAssignment`, `ApprovalGrant`, `Membership` |
| `project.ts`         | `Project`, `Cycle`, `Milestone`                                  |
| `issue.ts`           | `Issue`, `IssueLabel`, `IssueComment`, `IssueGithubLink`         |
| `activity.ts`        | `ActivityEvent`, `ActivityEventType`                             |
| `daily-report.ts`    | `DailyReport`, `DailyReportDigest`                               |
| `account-request.ts` | `AccountRequest`, `AccountRequestAuditEntry`                     |
| `app-usage.ts`       | `AppUsageSnapshot`, `CompanyKpi`                                 |

## Usage

```ts
import type { Issue, IssueStatus } from '@axa-admin/types';
```
