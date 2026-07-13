# Epic Handoff Files — LMS Platform

These are standalone build instructions for Claude Code, one per epic. Each
file is self-contained: a fresh Claude Code session can open any one of
them (once its dependencies are complete) and build the epic end to end.

## How to use these

1. Complete epics **in order** — each assumes the prior ones are done.
2. For each epic: paste the completion summary from the *previous* epic at
   the top of the Claude Code session, then hand it the epic file.
3. Claude Code must **read `PROJECT.md` first**, every session.
4. Set the model to **Sonnet** for implementation.
5. After the epic is done, paste the completion summary back into the
   planning conversation before starting the next one.

## Build order & dependencies

```
EPIC-1  Foundation            (blocking — everything depends on it)   ✅ DONE
   │
   ├─────────────┬─────────────┐
   ▼             ▼             (2 and 3 run in parallel)
EPIC-2  Access   EPIC-3  Course
        & Invites        Authoring                        ✅ DONE / ← NEXT
   │             │
   └──────┬──────┘
          ▼
EPIC-4  Tracking & Progress   (convergence — needs 2 AND 3)
          │
          ├───────────────► EPIC-7  Reporting & Admin Views
          │                         (cross-cutting; can build incrementally
          ▼                          once its data sources exist)
EPIC-5  Reviewing (Assessment)
          │
          ▼
EPIC-6  Certificates          (capstone — needs 4 AND 5)
```

## Status tracker

| Epic | File | Status | Requirement IDs |
|---|---|---|---|
| 1 | `EPIC-1-foundation.md` | ✅ Complete | AUTH-01–03, DB-* |
| 2 | `EPIC-2-access-invitations.md` | ✅ Complete | ACC-01–10 |
| 3 | `EPIC-3-course-authoring.md` | ← Next | CRS-01–11 |
| 4 | `EPIC-4-tracking-progress.md` | Blocked on 2+3 | TRK-01–08 |
| 5 | `EPIC-5-reviewing-assessment.md` | Blocked on 4 | REV-01–06 |
| 6 | `EPIC-6-certificates.md` | Blocked on 4+5 | CERT-01–06 |
| 7 | `EPIC-7-reporting-admin.md` | Blocked on 2,4,6 | (cross-cutting) |

## The confirmed data model (read before any epic)

Two decisions were locked in during Epics 1–2. Every epic file repeats
these, but they matter enough to state once here:

1. **Org Admin's org is derived from the `adminOfOrganizations` relation**,
   NOT from `User.organizationId`. The `organizationId` field is reserved
   exclusively for **learner seat tracking** (the ACC-09 seat formula). An
   Org Admin does not consume a seat. Their org is computed at login in
   `src/lib/auth.ts` and stored in the session.

2. **`session.user.organizationId` is the single source of truth** for
   org-scoping — for both learners and Org Admins. Every org-scoped query
   filters by it. Never trust a client-supplied org ID.

## Conventions every epic follows

- All business logic lives in `src/actions/` — never inline in pages/components.
- Server-side session reads use `getServerSession(authOptions)` (NextAuth
  v4) — never the v5 `auth()` helper.
- Stack is locked: Next.js 15, Prisma 5 (not 7), NextAuth v4 with
  `@next-auth/prisma-adapter` (not `@auth/prisma-adapter`).
- Run `node check.mjs` after every file; fix regressions before continuing.
- Each epic adds its own checks to `check.mjs` (the passing count grows
  each epic: 71 → 80 → …).
- Flag deviations in the end-of-epic summary rather than changing approach
  silently.

### ⚠️ Route-group path convention (important for `check.mjs`)

Dashboard pages live inside the `(dashboard)` **route group**, and auth
pages inside the `(auth)` route group. A route group's parenthesized folder
name is part of the **filesystem path** but NOT part of the **URL**. So:

| URL (what the browser sees) | Actual file path (what `check.mjs` checks) |
|---|---|
| `/owner/courses` | `src/app/(dashboard)/owner/courses/page.tsx` |
| `/org-admin/reports` | `src/app/(dashboard)/org-admin/reports/page.tsx` |
| `/learner/certificates` | `src/app/(dashboard)/learner/certificates/page.tsx` |
| `/login` | `src/app/(auth)/login/page.tsx` |
| `/invite/accept` | `src/app/invite/accept/page.tsx` (no group) |

When an epic file lists a route like `/owner/courses` in a **UI** section,
that's the URL. When adding a **`check.mjs`** file-existence check, use the
**full filesystem path** including `src/app/` and the `(dashboard)` /
`(auth)` group — otherwise the check looks in the wrong place and fails even
though the file exists correctly. When in doubt, confirm the real path by
listing `src/app` before writing the check.
