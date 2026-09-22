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
│   │   ├── layout.tsx       # Root layout, font and theme tokens
│   │   ├── page.tsx         # Scaffold page
│   │   └── globals.css      # Tailwind entry and shadcn/ui theme
│   ├── components/
│   │   └── ui/              # shadcn/ui primitives
│   └── lib/
│       └── utils.ts         # `cn` class merge helper
├── public/
└── components.json          # shadcn/ui configuration
```

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
