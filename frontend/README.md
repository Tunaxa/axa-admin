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
│   │   ├── docs/            # Two-pane documentation reader
│   │   ├── team/            # Daily report form
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
| `CommandPalette` | `components/layout/command-palette.tsx` | Issue search, opens on Ctrl/Cmd+K |

Navigation items live in `components/layout/nav-items.ts` and are shared by the
sidebar and the palette, so they cannot drift apart.

**No functionality yet.** This is the shell only:

- Nav items are `<button>`s with no `href`. The module routes do not exist, so
  linking to them would not type-check under `typedRoutes` and would 404.
- The current item is hard-coded to the first entry so the active style is
  visible. Deriving it from the route belongs to the task that adds routing.
- The palette searches issues (see below); its navigation items are still
  inert.
- The account button is inert; session UI arrives with frontend auth.
- The sidebar is hidden below `md`. A mobile drawer needs open/close state,
  which is navigation behaviour rather than layout.

### Navigation

Sidebar items with a route render as `next/link` and highlight via
`usePathname`; the rest are still non-navigating buttons. Only **Work** (`/`)
and **Team** (`/team`) have pages, so those two are links today — each module's
task adds its own `href` when its page exists.

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
| `ViewToggle` | `components/work/view-toggle.tsx` | Board / List / Activity switch |
| `IssueBoard` | `components/work/issue-board.tsx` | Columns, counts, empty state, drag and drop |
| `IssueList` | `components/work/issue-list.tsx` | Table of every issue |
| `ActivityFeed` | `components/work/activity-feed.tsx` | Per-project chronological feed |
| `IssueDetailPanel` | `components/work/issue-detail-panel.tsx` | Side panel with the three dropdowns |
| `QuickCreateModal` | `components/work/quick-create-modal.tsx` | Create an issue from a title |
| `useCreateShortcut` | `components/work/use-create-shortcut.ts` | The `c` key binding and its guards |
| `IssuesProvider` | `components/work/issues-provider.tsx` | Shares issues and the open issue across the tree |
| `useIssues` | `components/work/use-issues.ts` | Loads issues, applies status changes |
| `IssueCard` | `components/work/issue-card.tsx` | Title, priority, linked app, assignee |
| `BOARD_COLUMNS` | `components/work/board-columns.ts` | Column order and labels |
| `Issue` types | `components/work/types.ts` | Mirror of the backend's enums |
| `issues-api.ts` | `components/work/issues-api.ts` | `fetchIssues`, `updateIssueStatus` |
| `api.ts` | `lib/api.ts` | Base URL, bearer token, error mapping |

### List

A table showing **every** issue, including statuses the board has no column for,
with Title, Status, Priority, App and Assignee. Rows open the detail panel;
dragging remains the board's job.

### Detail panel

Clicking a card or a table row opens a side panel showing the issue's title and
description, with dropdowns for **status**, **assignee** and **priority**.
Changing one sends a `PATCH /issues/:id` through the same optimistic path as a
drag, so a rejected change rolls back and reports itself.

The assignee options come from `GET /users`. Title, description and the linked
application are read-only here — editing text is a different interaction from
picking a value, and belongs to its own task.

The panel reads the issue from the shared list on every render rather than
keeping a copy, so it cannot drift from the board behind it.

### Command palette search

**Ctrl/Cmd+K** opens the palette. Typing searches the issues already loaded —
by title and by status, so `cancelled` finds work the board has no column for.
Selecting a result opens that issue's detail panel.

Issues appear only once something has been typed: the palette is for finding a
specific issue, and listing all of them on open would bury everything else. At
most 50 results render, because cmdk keeps every item mounted and scores it on
each keystroke.

The palette lives in the top bar and the board lives in the page — different
parts of the tree. Rather than letting the palette fetch its own copy of the
issues, `IssuesProvider` sits above the app shell and both read from it. That
is why an issue created a moment ago through quick create is immediately
findable, with no refetch.

### Activity

A third view alongside Board and List: a chronological feed of what happened in
one project, newest first and grouped by day.

Each event is rendered as a sentence rather than a raw payload — "Rochdi moved
*Add a test database to CI* from Todo to In Progress" — with actor names and
issue titles resolved from the data the provider already holds, and statuses
shown by their labels.

The project picker defaults to the first project. Switching remounts the feed
via a `key`, so each project starts from a clean loading state instead of an
effect resetting it.

The feed reads `GET /projects/:id/activity`. With no projects it says so, since
the feed is scoped to one and there is currently **no way to create a project
from the UI** — the API exposes only a listing.

### Quick create

Pressing **`c`** — or the **New issue** button in the view bar — opens a modal
that creates an issue from a title and an optional description. Status,
priority and assignee are left to the schema defaults and refined afterwards in
the detail panel.

The shortcut is deliberately narrow. It is ignored while the caret is in an
input, textarea, select or contenteditable, while a modifier is held (so
`Ctrl+C` still copies), and while any dialog is open — including the command
palette, whose search box would otherwise compete for the key.

The new issue is added to the list only once the server has accepted it, since
the id comes from the server. If the request fails the modal stays open, shows
the error and keeps what was typed.

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

## Daily reports

`/team/reports` holds two views, switched by the toggle at the top: **Submit**,
the form for one day, and **Timeline**, one developer's reports over time.

| Component | File | Contents |
| --- | --- | --- |
| `ReportsView` | `components/team/reports-view.tsx` | Submit / timeline switch |
| `DailyReportForm` | `components/team/daily-report-form.tsx` | Day picker and the form |
| `DailyReportTimeline` | `components/team/daily-report-timeline.tsx` | Developer picker and the timeline |
| `daily-reports-api.ts` | `components/team/daily-reports-api.ts` | `/auth/me`, read, submit, read by author |

**The form loads the chosen day before letting you save it.** Submitting is a
`PUT` that replaces the whole report, so opening the page and saving without
loading first would quietly wipe an earlier update. When a report already
exists the form says so and the button reads *Update report*.

**Leaving Blocked empty means nothing is blocked** — it is sent as absent, and
the API stores null, which is how "no blockers" stays distinguishable from
"did not say".

**The day comes from the viewer's own timezone**, not the server's, because the
API takes the date in the path and the column is a calendar date. Future days
are not selectable.

**Shipped is filled in from the issues you closed that day**, one title per
line, and the form says so. It happens only when no report exists yet — what
someone wrote outranks what the board can infer, so an existing report is never
overwritten. The issues come from `GET /issues?assigneeId=&closedAfter=&closedBefore=`,
with the day's boundaries computed here because only the browser knows the
viewer's timezone. If that request fails the field is simply left empty; a
report must still be fileable when the prefill cannot be built.

Issues come from the shared `IssuesProvider`, so the list matches the board.

### The timeline

The **Timeline** view lists one developer's reports, newest day first. The
developer list comes from the same `IssuesProvider` as the board's assignees,
and the reports come from `GET /daily-reports?authorId=...`, which already
filters and orders them — the view only renders what it is given.

**A day with no report is simply absent.** The API has no row for "did not
submit", so a gap in the timeline is a gap, not a claim that nobody worked.
Answering "who owes a report for Tuesday" needs the roster to compare against.

**`reportDate` is formatted in UTC.** It arrives as UTC midnight, so reading it
in the viewer's timezone would label it the previous day for anyone west of
Greenwich.

**A report with no blocker reads "Nothing blocked."** rather than showing an
empty field, which is the distinction the nullable column exists for.

### Reaching the page

The route is `/team/reports`. It is **not linked from the sidebar yet**: the
Team nav item is given its `href` by the roster branch, and adding a second
`href` here would collide in the same file. Once both land, the natural home is
a tab on the Team page.
## Team roster

`/team` shows the roster in two layouts, switched by a Grid / List toggle. Both
carry the same three things: **who someone is** (initials avatar, name, email),
**the role they hold**, and **which applications they own**.

| Component | File | Contents |
| --- | --- | --- |
| `RosterView` | `components/team/roster-view.tsx` | Layout toggle, grid and table |
| `Avatar`, `RoleBadge`, `OwnershipTags` | `components/team/member-bits.tsx` | The three pieces both layouts share |
| `fetchRoster` | `components/team/roster-api.ts` | `GET /team-members` |

**There are no avatar images in the data model**, so the avatar is the member's
initials. It is `aria-hidden`, because the name is always rendered next to it.

**Ownership tags carry the app *and* the role held there** — the same person
can own one application and only read another, so showing the app alone would
lose the half that matters. Role badges are tinted but always show their label,
so nothing depends on colour alone.

An empty roster says why: registering creates a user account, and membership is
granted separately.

## Docs

`/docs` is the documentation reader: the page tree on the left, the selected
page rendered on the right.

| Component | File | Contents |
| --- | --- | --- |
| `DocsView` | `components/docs/docs-view.tsx` | The two panes and the selection |
| `PageTreeNav` | `components/docs/page-tree.tsx` | The tree, expand and collapse |
| `PageContent` | `components/docs/page-content.tsx` | The rendered page |
| `blocksToMarkdown` | `components/docs/blocks-to-markdown.ts` | Blocks → one Markdown document |
| `docs-api.ts` | `components/docs/docs-api.ts` | `/docs/pages` reads |

**The tree is one request, the content is one more.** `GET /docs/pages` returns
every node without its blocks, which is what a sidebar needs; a page's content
is fetched only when it is opened. That split is why the API has two shapes.

### Why the content goes through Markdown

Blocks are serialised into a single Markdown document and rendered once, rather
than each block type mapping straight to an element. That is what makes inline
formatting work: a paragraph's text can hold `**bold**`, a link or a code span,
and one renderer handles all of it instead of every block type growing its own
parser.

Two cases the serialiser has to get right:

- **Consecutive list items stay on adjacent lines.** Separated by blank lines,
  Markdown reads each one as its own list and the spacing falls apart.
- **A code block is fenced with more backticks than it contains.** A snippet
  that shows a Markdown fence would otherwise close the block early and spill
  the rest of the page into the document as markup.

Numbered items are always written as `1.`; Markdown numbers the rendered list
itself, so inserting an item in the middle cannot leave the rest counting wrong.

### Page content is not trusted

`react-markdown` does not render raw HTML unless `rehype-raw` is added, and it
deliberately is not. `<img src=x onerror=…>` in a block's text is displayed as
text. Element styling is passed to the renderer rather than applied with a
typography plugin, so the only elements that can appear are the ones listed in
`page-content.tsx`.

### Reaching the page

The route is `/docs`. It is **not linked from the sidebar yet**: `nav-items.ts`
says links are added by the tasks that create the routes, but giving an item an
`href` also means changing the `NavItem` shape and how the sidebar and command
palette render — shared files that other open branches are editing. That is the
conflict class that broke `dev`, so the one-line link is left for whoever lands
these chains.

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
