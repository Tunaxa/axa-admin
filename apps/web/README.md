# @axa-admin/web

AXA Admin frontend.

> **Status — placeholder.** This task established the workspace slot, the
> dependency on `@axa-admin/types` and the intended folder layout. The Next.js,
> Tailwind CSS and shadcn/ui scaffold is delivered by the follow-up task
> `feature/setup-nextjs-tailwind-shadcn`, so no framework code is committed here
> yet.

## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query for server state, WebSockets for real-time updates

## Intended layout

```
apps/web/
├── src/
│   ├── app/                 # App Router routes, one segment per module
│   ├── components/
│   │   ├── ui/              # shadcn/ui primitives
│   │   └── <shared>/        # composed, cross-module components
│   ├── features/            # Module code: work, roadmap, team, company,
│   │                        # docs, app-usage, account-requests, permissions
│   ├── hooks/
│   ├── lib/                 # API client, query client, utilities
│   └── styles/
└── public/
```

Module code lives under `src/features/<module>` so each of the planned AXA Admin
modules can grow independently while sharing the `components/ui` primitives.
