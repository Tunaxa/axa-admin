# Backend

The AXA Admin API.

> **Placeholder.** This directory is the prepared slot for the backend. The
> NestJS scaffold, Prisma schema and migrations are delivered by their own
> tasks, so no framework code is committed here yet.

## Stack

- NestJS + TypeScript
- Prisma ORM over PostgreSQL
- Redis for cache and real-time fan-out
- JWT authentication (pending the shared-auth/SSO decision)

## Intended layout

```
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/         # Guards, interceptors, tenant context
│   ├── modules/        # One module per AXA Admin module
│   ├── integrations/   # Pluggable webhook/event providers
│   └── prisma/
└── prisma/
    └── schema.prisma
```
