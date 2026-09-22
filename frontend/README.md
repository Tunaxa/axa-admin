# Frontend

The AXA Admin web application — a Next.js application.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (CSS-first configuration)
- shadcn/ui on Radix primitives, Lucide icons, Geist font

## Getting started

```bash
npm install
npm run dev
```

The dev server listens on **3000**.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | Lint with ESLint |
| `npm run format` | Apply Prettier |
| `npm run format:check` | Verify formatting without writing |
| `npm run typecheck` | Type-check without emitting |

## Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout, font, theme tokens, app shell
│   │   ├── page.tsx         # Issue board
│   │   └── globals.css      # Tailwind entry and shadcn/ui theme
│   ├── components/
│   │   ├── layout/          # App shell: sidebar, top bar, command palette
│   │   ├── work/            # Issue board and list views
│   │   └── ui/              # shadcn/ui primitives
│   └── lib/
│       └── utils.ts         # `cn` class merge helper
├── public/
└── components.json          # shadcn/ui configuration
```

## Base layout

`AppShell` wraps every page from the root layout: a sidebar on the left, a top
bar above the content, and the page in a scrollable main region.

| Component | File | Contents |
| --- | --- | --- |
| `AppShell` | `components/layout/app-shell.tsx` | Composition of the three below |
| `AppSidebar` | `components/layout/app-sidebar.tsx` | Brand and primary navigation |
| `TopBar` | `components/layout/top-bar.tsx` | Command palette trigger, account button |
| `CommandPalette` | `components/layout/command-palette.tsx` | Palette shell, opens on Ctrl/Cmd+K |

Navigation items live in `components/layout/nav-items.ts` and are shared by the
sidebar and the palette, so they cannot drift apart.

**No functionality yet.** This is the shell only:

- Nav items are `<button>`s with no `href`. The module routes do not exist, so
  linking to them would not type-check under `typedRoutes` and would 404.
- The current item is hard-coded to the first entry so the active style is
  visible. Deriving it from the route belongs to the task that adds routing.
- The palette opens, filters and closes, but selecting an item only closes it —
  there are no commands to run.
- The account button is inert; session UI arrives with frontend auth.
- The sidebar is hidden below `md`. A mobile drawer needs open/close state,
  which is navigation behaviour rather than layout.

### cmdk context

`CommandDialog` from the shadcn registry renders its children straight into the
dialog **without** providing cmdk's context, so palette contents must be
wrapped in `Command`:

```tsx
<CommandDialog …>
  <Command>
    <CommandInput … />
    …
  </Command>
</CommandDialog>
```

Without that wrapper `CommandInput` throws `Cannot read properties of undefined
(reading 'subscribe')` at render — and because the palette is mounted in the
root layout, that takes down every page.

## Issue views

The home page offers two views of the same issues, switched with the Board /
List toggle above them. Both read one request, so switching neither refetches
nor loses a change made in the other view.

### Board

A kanban with one column per workflow status:

| Column | Status |
| --- | --- |
| Backlog | `backlog` |
| Todo | `todo` |
| In Progress | `in_progress` |
| In Review | `in_review` |
| Done | `done` |

`cancelled` is a valid issue status but has no column — cancelled work does not
belong on a board showing what is in flight. The list view is where those
issues are visible, and the board's header says how many are not being shown.

| Component | File | Contents |
| --- | --- | --- |
| `IssueViews` | `components/work/issue-views.tsx` | Owns the issues and the selected view |
| `ViewToggle` | `components/work/view-toggle.tsx` | Board / List switch |
| `IssueBoard` | `components/work/issue-board.tsx` | Columns, counts, empty state, drag and drop |
| `IssueList` | `components/work/issue-list.tsx` | Table of every issue |
| `useIssues` | `components/work/use-issues.ts` | Loads issues, applies status changes |
| `IssueCard` | `components/work/issue-card.tsx` | Title, priority, linked app, assignee |
| `BOARD_COLUMNS` | `components/work/board-columns.ts` | Column order and labels |
| `Issue` types | `components/work/types.ts` | Mirror of the backend's enums |
| `issues-api.ts` | `components/work/issues-api.ts` | `fetchIssues`, `updateIssueStatus` |
| `api.ts` | `lib/api.ts` | Base URL, bearer token, error mapping |

### List

A table showing **every** issue, including statuses the board has no column for,
with Title, Status, Priority, App and Assignee. It is read-only: dragging is the
board's job, and editing from a table row is separate work.

### Data and drag and drop

The board loads from `GET /issues` and moves cards with `PATCH /issues/:id`.
Dropping a card applies the new status optimistically and rolls it back if the
request fails, so a card never sits in a column the server did not accept; the
failure is shown in a banner above the board.

Dragging uses the browser's native HTML5 drag events rather than a library. It
only moves cards **between** columns — ordering **within** a column would need a
persisted rank, and the schema has no such column.

### Configuration and the access token

`NEXT_PUBLIC_API_URL` points at the API (default `http://localhost:4000`); see
`.env.example`.

The API requires a bearer token and the frontend has **no sign-in screen yet**,
so `lib/api.ts` reads the token from `localStorage` under
`axa-admin.accessToken`. That is a placeholder, not a decision — see the note
in that file. Until a sign-in flow exists, the board shows its error state.

The board scrolls horizontally rather than wrapping, so the page itself never
overflows sideways.

## Adding shadcn/ui components

```bash
npx shadcn@latest add <component>
```

Components land in `src/components/ui` and are owned by this repository — edit
them freely rather than treating them as vendor code. `components.json` records
the preset (`radix-nova`), the `neutral` base colour and the path aliases.

## Notes

- Imports use the `@/` alias for anything under `src/`.
- Theme colours come from the CSS variables in `globals.css`
  (`bg-background`, `text-muted-foreground`, …) rather than hard-coded palette
  values.
- ESLint is pinned to v9: `eslint-plugin-react`, which `eslint-config-next`
  bundles, is not yet compatible with ESLint 10.
