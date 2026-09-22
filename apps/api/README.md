# @axa-admin/api

AXA Admin backend.

> **Status — placeholder.** This task established the workspace slot, the
> dependency on `@axa-admin/types` and the intended folder layout. The NestJS
> scaffold, Prisma schema and migrations are delivered by their own follow-up
> tasks, so no framework code is committed here yet.

## Stack

- NestJS + TypeScript
- Prisma ORM over PostgreSQL
- Redis for cache and real-time fan-out
- Socket.io gateway for live Work module updates
- JWT authentication (pending the shared-auth/SSO decision)

## Intended layout

```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/              # Guards, interceptors, tenant context, filters
│   ├── modules/             # One Nest module per AXA Admin module
│   │   ├── work/
│   │   ├── roadmap/
│   │   ├── team/
│   │   ├── company/
│   │   ├── docs/
│   │   ├── app-usage/
│   │   ├── account-requests/
│   │   └── permissions/
│   ├── integrations/        # Pluggable webhook/event providers (GitHub, Teams, Stripe)
│   └── prisma/
└── prisma/
    └── schema.prisma
```

Integrations sit in their own directory and are consumed through a provider
interface, so GitHub, Microsoft Teams and Stripe can be added or swapped without
touching module code.
