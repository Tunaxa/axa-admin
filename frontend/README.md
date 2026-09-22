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
│   │   ├── page.tsx         # Placeholder page content
│   │   └── globals.css      # Tailwind entry and shadcn/ui theme
│   ├── components/
│   │   ├── layout/          # App shell: sidebar, top bar, command palette
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
