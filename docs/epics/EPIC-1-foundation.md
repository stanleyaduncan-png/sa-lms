# EPIC 1 — Foundation

**Status:** ✅ COMPLETE (documented here for reference)
**Requirement IDs:** AUTH-01, AUTH-02, AUTH-03, DB-*
**Depends on:** nothing (this is the blocking foundation)

> This epic is already built. This file is a reference record of what it
> delivered, so later epics have a clear picture of the baseline. Do not
> re-run this unless rebuilding from scratch.

---

## Goal

A working login flow with role-based session handling and a seeded Owner
account — the load-bearing base everything else builds on.

## What was delivered

- **`prisma/seed.ts`** — seeds the Owner account (`owner@lms.local`,
  bcrypt saltRounds=12, `role=OWNER`).
- **`src/app/(auth)/login/page.tsx`** — real login form, Zod validation,
  `signIn("credentials", { redirect: false })` with manual redirect so the
  error path doesn't navigate away.
- **`src/app/page.tsx`** — server component; reads session, redirects by
  role (OWNER → `/owner`, ORG_ADMIN → `/org-admin`, LEARNER → `/learner`,
  none → `/login`).
- **Three dashboard placeholders** (`owner`, `org-admin`, `learner`) — each
  shows the session user's name/email/role and a logout button.
- **`src/components/LogoutButton.tsx`** — shared client component wrapping
  `signOut()`.
- **`src/middleware.ts`** — RBAC route protection (was already scaffolded;
  confirmed working).

## Key patterns established (later epics must follow these)

- **`getServerSession(authOptions)`** for all server-side session reads.
  NOT the v5 `auth()` helper.
- Session carries `role` and `organizationId` (typed via
  `src/types/next-auth.d.ts`).
- Role redirects are **two-hop by design**: middleware enforces "you can't
  be here" and bounces to `/`; the root page then sends the user to their
  correct dashboard. This is intentional separation of concerns, not a bug
  — do not "fix" it into a single hop.

## Known deviations / notes

- `package.json` has a CommonJS compiler-options override for the
  `prisma.seed` script, because the root `tsconfig.json` uses
  `module: esnext`/`bundler` for Next.js, which `ts-node` can't run
  directly.

## Baseline at completion

- `node check.mjs` → **71/71 passing**
- Migrations applied against Supabase
- Dev server runs clean on Next.js 15
