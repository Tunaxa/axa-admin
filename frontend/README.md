# Frontend

The AXA Admin web application.

> **Placeholder.** This directory is the prepared slot for the frontend. The
> Next.js, Tailwind CSS and shadcn/ui scaffold is delivered by its own task, so
> no framework code is committed here yet.

## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query for server state, WebSockets for real-time updates

## Intended layout

```
frontend/
├── src/
│   ├── app/          # App Router routes, one segment per module
│   ├── components/   # UI primitives and shared components
│   ├── features/     # Module code (work, team, company, docs, ...)
│   ├── hooks/
│   ├── lib/          # API client, utilities
│   └── types/
└── public/
```
