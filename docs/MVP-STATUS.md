# AXA Admin — MVP Status & Production Launch Audit

> **Document version:** 1.0.0  
> **Target branch:** `dev`  
> **Last updated:** 2026-10-20  
> **Author:** Antigravity Engineering

---

## 1. Executive Summary

`axa-admin` is the internal operations and knowledge platform for the AXA ecosystem. It provides multi-tenant operations (issue tracking, team roster, daily reports, company KPIs, calendar, organigramme) and a knowledge layer (living documentation with Notion-style editing).

The codebase is split into two independent projects:
- **`backend/`**: NestJS 12 (native ESM), PostgreSQL 16 with Prisma 7, MongoDB 8 with Mongoose 9 for documentation blocks, JWT authentication with role-based permissions guard (`PermissionsGuard`).
- **`frontend/`**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Radix UI primitives, shadcn/ui.

This document provides a transparent, exhaustive inventory of what is currently operational, trivial fixes applied, and the specific blockers that prevent a public production launch.

---

## 2. Implemented & Functional Modules

| Module | Stack / Path | Status | Capabilities |
| :--- | :--- | :--- | :--- |
| **Authentication & RBAC** | `backend/src/auth/` | **Functional** | JWT issuance, `PermissionsGuard` registered as global `APP_GUARD`, closed permission matrix (`Role` × `Permission`). |
| **Work (Issues & Projects)** | `backend/src/work/`<br>`frontend/src/components/work/` | **Functional** | Multi-view Kanban board, list view, issue creation modal, comments, status transitions, activity feed tracking. |
| **Team & Roster** | `backend/src/team/`<br>`frontend/src/components/team/` | **Functional** | Team member roster, developer profiles (stack, ownership, Slack handle), daily report submission and chronological timeline. |
| **Documentation (Docs)** | `backend/src/docs/`<br>`frontend/src/components/docs/` | **Functional** | MongoDB-backed embedded blocks. Notion-style block editor with `/` slash menu, markdown triggers (`# `, `[] `, etc.), WAI-ARIA page tree with roving tabindex, global shortcuts (`⌘K`, `⌘⇧N`, `⌘⇧D`, `⌘⇧⌫`, `⌘E`). |
| **Calendar** | `backend/src/calendar/`<br>`frontend/src/components/calendar/` | **Functional** | Month, week, and day views, Notion-style single-key navigation, optimistic drag-and-drop event rescheduling, event modal. |
| **Organigramme** | `backend/src/orgchart/`<br>`frontend/src/components/orgchart/` | **Functional** | Native SVG canvas, wheel zoom, mouse drag/pan, floating tool palette (rectangle, circle, diamond, arrow, text), connector arrows with auto-routing, in-memory undo/redo (`⌘Z`/`⌘⇧Z`), debounced auto-save. |
| **GitHub Integration** | `backend/src/github/` | **Functional** | Webhook listener verifying HMAC signatures, GitHub link parsing, automatic association of PRs and branch names to issue keys. |
| **Billing (Stripe Checkout)** | `backend/src/billing/` | **Partial** | Creates Stripe Checkout sessions (`POST /billing/checkout-session`) with tier validation. |
| **Container Hardening** | `backend/Dockerfile`<br>`frontend/Dockerfile` | **Functional** | Multi-stage production Docker images running as non-root with `tini` PID 1. |

---

## 3. Production Launch Blockers (Detailed Audit)

The following items are deliberately **not** solved in this PR and represent the roadmap blockers required before a real production deployment:

### 3.1 Stripe Webhook Handler Absent
- **Current state:** `backend/src/billing/` implements `BillingController` with `POST /billing/checkout-session`, calling `StripeService.createCheckoutSession`.
- **Blocker:** There is no webhook endpoint (`POST /billing/webhook`) listening to Stripe events (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`).
- **Impact:** Once a customer completes checkout on Stripe, `axa-admin` does not receive notification to activate or update the organization's subscription tier. Subscriptions remain unfulfilled in the database.

### 3.2 Absence of Automated Unit & End-to-End Test Suites
- **Current state:** `backend/test/` only contains a boilerplate `app.e2e-spec.ts`. Feature services (`IssuesService`, `PagesService`, `CalendarService`, `OrgChartService`, `DailyReportsService`, `PermissionsGuard`) have no dedicated unit tests. Frontend has no test runner (Playwright/Jest/Vitest).
- **Blocker:** CI runs `lint`, `typecheck`, and `format:check`, but `npm test` runs zero feature assertions.
- **Impact:** High regression risk on schema migrations, tenant permission boundary bypasses, and multi-tenant filter leaks.

### 3.3 Authentication UX & Token Handling (localStorage)
- **Current state:** The frontend reads access tokens from `localStorage` under `axa-admin.accessToken` (`frontend/src/lib/api.ts`). A mock or manual token injection is required to authenticate API calls in production mode.
- **Blocker:** Missing a dedicated, production-hardened sign-in / sign-up screen, refresh token rotation, and `httpOnly` secure cookies.
- **Impact:** Storing JWT tokens in `localStorage` exposes sessions to XSS theft. Token expiration requires manual intervention rather than silent background refreshing.

### 3.4 Monotenant Integration Assumptions
- **Current state:**
  - `backend/src/integrations/teams.service.ts` reads a single `TEAMS_WEBHOOK_URL` from environment variables.
  - `backend/src/github/github.config.ts` reads global `GITHUB_CLIENT_ID` and `GITHUB_WEBHOOK_SECRET`.
- **Blocker:** In a true multi-tenant deployment, each organization must be able to configure their own Microsoft Teams webhook URL and GitHub App installation.
- **Impact:** Cross-tenant notifications would route to a single shared webhook or fail for non-default tenants.

### 3.5 Docker Images Not Published to a Registry
- **Current state:** Hardened multi-stage Dockerfiles exist for both frontend and backend, verified with `-68%` (backend) and `-81%` (frontend) footprint reductions.
- **Blocker:** GitHub Actions builds images on PR (`images` job in `ci.yml`) but does not push tagged or versioned images to a container registry (GHCR, AWS ECR, or Docker Hub).
- **Impact:** Deployments cannot pull container images from a registry; deployment pipelines require manual build steps on host nodes.

### 3.6 Multi-Tenant Onboarding & Self-Service Provisioning
- **Current state:** `Organization` records are created manually via database seeding or direct Prisma calls.
- **Blocker:** No public self-service signup flow exists to register a company, validate uniqueness of the issue prefix / URL slug, and provision the initial `owner` user account.
- **Impact:** Manual database manipulation is required to onboard any new client or company.

### 3.7 Real-Time Infrastructure (WebSockets / Redis)
- **Current state:** Issues, daily reports, and organigramme synchronize via HTTP polling and optimistic client state.
- **Blocker:** Socket.io gateway and Redis pub/sub are referenced in initial architecture plans but not implemented.
- **Impact:** Collaborative multi-user editing on the Kanban board or Organigramme canvas does not reflect concurrent changes in real time.

---

## 4. Trivial Polish Applied in this PR

1. **Root `README.md`**:
   - Updated outdated `## Status` section linking to this living audit document.
   - Corrected tech stack specifications (clarified native HTTP client usage vs placeholder libraries).
   - Added `Calendar` and `Organigramme` modules to the root documentation table.
2. **Docs navigation**:
   - Ensured consistent route references and verified internal markdown links.
