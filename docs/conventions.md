# Conventions

## Branching

`main` is the production branch and is never developed on directly. `dev` is the
integration branch, and **every task branch is created from `dev`**.

| Prefix      | Use                                    |
| ----------- | -------------------------------------- |
| `feature/`  | New functionality                      |
| `fix/`      | Bug fixes                              |
| `refactor/` | Restructuring without behaviour change |
| `docs/`     | Documentation                          |
| `chore/`    | Tooling, configuration, maintenance    |
| `test/`     | Tests                                  |

Task names are lowercase kebab-case, e.g. `feature/initialize-monorepo`.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/):
`<type>(<optional scope>): <description>`

Types in use: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `perf`, `ci`.

```
feat(work): add issue board drag-and-drop
fix(api): resolve tenant leak in issue lookup
chore: configure development tooling
```

Keep commits small and scoped to the task.

## Pull requests

- Target `dev`. Never open a PR directly against `main`.
- Fill in the PR template: summary, what was implemented, main changes,
  technical decisions, testing performed, and screenshots for visual changes.
- The repository maintainer reviews, approves and merges. Authors do not merge
  their own pull requests.

## Naming

| Subject                | Convention                 | Example              |
| ---------------------- | -------------------------- | -------------------- |
| Directories            | kebab-case                 | `account-requests/`  |
| React components       | PascalCase file and export | `IssueBoard.tsx`     |
| Hooks                  | `use` prefix, camelCase    | `useIssueFilters.ts` |
| Non-component TS files | kebab-case                 | `account-request.ts` |
| Types and interfaces   | PascalCase                 | `AccountRequest`     |
| Union member strings   | snake_case                 | `'in_progress'`      |
| Environment variables  | SCREAMING_SNAKE_CASE       | `DATABASE_URL`       |
| Workspace packages     | `@axa-admin/<name>`        | `@axa-admin/types`   |

## Code style

- TypeScript `strict` mode, plus `noUncheckedIndexedAccess`. Avoid `any`.
- Prefer `import type` for type-only imports.
- Formatting is owned by Prettier (single quotes, semicolons, 100 columns,
  trailing commas). Run `pnpm format` rather than hand-aligning code.
- Nullable fields are modelled explicitly as `T | null` rather than as optional
  properties, so a value that is absent in the database reads the same way in
  both applications.
- String union types are declared through a `const` array plus
  `(typeof ARRAY)[number]`, so the runtime list and the type stay in sync.
- Shared domain types belong in `@axa-admin/types`, never duplicated per app.
