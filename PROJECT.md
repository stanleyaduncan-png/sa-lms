# Project Reference — LMS Platform

> **Status:** Living document. Update this as decisions are made or
> revisited — this is the single source of truth for *why* things are the
> way they are, not just *what* they are. The README is for quick
> orientation; this file is for context and rationale.
>
> **Last updated:** June 2026 · BRD sent for external review, stack
> finalized, epics sequenced. Implementation not yet started.

---

## 1. What we're building

An invite-only learning platform — a private "Udemy" with a single content
owner (no marketplace, no multi-instructor support, no public sign-up).

Two learner populations:
- **Corporate-affiliated learners** — grouped under an Organization with a
  seat pool, managed by an Org Admin.
- **Individually invited learners** — invited directly, no org affiliation.

Full detail lives in the BRD (see `docs/` — link or copy the finalized BRD
there once review feedback is incorporated).

### Explicitly out of scope (v1)

- Public sign-up / marketplace browsing
- Payments, checkout, pricing
- Multi-instructor support
- Third-party verifiable certificates (PDF-only, no public lookup/QR)
- Live/cohort scheduling
- Native mobile apps

---

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15** (App Router) | See [Stack Decision](#3-stack-decision-spring--nextjs) below |
| Language | TypeScript | |
| Database | **PostgreSQL** | |
| ORM | **Prisma 5** | Deliberately not v7 — see [Prisma Version](#4-prisma-version-staying-on-5) |
| Auth | **Auth.js (NextAuth v4)**, credentials provider | `@next-auth/prisma-adapter` (v4-compatible) — not `@auth/prisma-adapter`, which targets v5 |
| PDF generation | pdf-lib | For certificates (`CERT-01`) |
| Validation | Zod | |
| CI | GitHub Actions | Runs build + lint + migrations against a real Postgres service container |

**Still undecided** (flag during technical design, don't assume):
- Video hosting/streaming approach (self-hosted vs. Mux/Cloudflare Stream)
- SCORM runtime/player library
- Object storage provider for video/document/SCORM assets

---

## 3. Stack decision: Spring → Next.js

**This was revisited mid-project — worth recording why, so it isn't
re-litigated without context.**

- Early on, the plan was a Spring Boot (Java) backend. This came from an
  ambiguous early reference to a "Spring approach," which got interpreted
  as a firm technical requirement.
- On revisiting: there was no hard requirement for Java/Spring. The
  person building this is more familiar with Next.js from prior projects
  (referenced as "GDEI" and "VRP").
- Decision: **familiarity and shipping speed outweigh "enterprise-default"
  stack choice**, especially for a single-owner project. Nothing in the
  BRD's five pillars (database, login, tracking, reviewing, certificates)
  technically requires Java — Next.js + Prisma + Postgres covers all of
  it, including SCORM (which is JS-shaped anyway) and RBAC (via Auth.js +
  middleware + org-scoped query filtering).
- **Lesson for future decisions:** don't infer a stack from ambiguous
  terminology — confirm explicitly before scaffolding.

---

## 4. Prisma version: staying on 5

Prisma 7 is out and the CLI nags about it on every `generate` — **this is
intentional, not an oversight.** Don't upgrade without a deliberate reason.

Why not 7 (as of this writing):
- ESM-only, requires Node 20.19+ and TS 5.4+
- `datasource.url` moves out of `schema.prisma` into a new
  `prisma.config.ts` file
- Driver adapters become mandatory (no more bare connection string)
- Client import path changes (`@prisma/client` → generated output folder)
- Released very recently — community troubleshooting resources are thin,
  several rough edges still being patched (e.g. mapped-enum behavior was
  reverted in a patch after initial release)

**Also avoid:** `@auth/prisma-adapter` — that package targets NextAuth v5's
adapter interface, not v4's, and will cause type errors. Use
`@next-auth/prisma-adapter` (v1.x) instead.

Revisit this once v7 has had more time to stabilize and there's a clear
reason to move (not just "newer exists").

---

## 5. Epics & sequencing

Seven epics, derived from the BRD's five pillars (some pillars split
further, "Reporting" extracted as its own cross-cutting epic rather than
duplicated inside the others).

```
1. Foundation (blocking)
   └─ Auth + core data model (User, Organization skeleton)
        │
        ├──────────────┬──────────────┐
        ▼ (parallel)   ▼ (parallel)
   2. Access &     3. Course
      Invitations      Authoring
        │              │
        └──────┬───────┘
               ▼
   4. Tracking & Progress (convergence point)
               │
               ├─────────────► Reporting & Admin Views
               │               (cross-cutting, branches off Tracking;
               │                doesn't block downstream epics)
               ▼
   5. Reviewing (Assessment)
               │
               ▼
   6. Certificates (capstone)
```

| # | Epic | Depends on | Requirement IDs | Notes |
|---|---|---|---|---|
| 1 | Foundation | — | `AUTH-01`–`03`, parts of `DB-*` | Nothing else can start without this |
| 2 | Access & Invitations | Foundation | `ACC-01`–`10` | Runs in parallel with #3 |
| 3 | Course Authoring | Foundation | `CRS-01`–`11` | Runs in parallel with #2 |
| 4 | Tracking & Progress | #2 + #3 | `TRK-01`–`08` | Convergence point — needs both enrolled learners and real lessons to exist |
| 5 | Reviewing (Assessment) | #4 | `REV-01`–`06` | Quiz attempts are a specialized form of progress tracking |
| 6 | Certificates | #4 + #5 | `CERT-01`–`06` | Can't evaluate "complete" until tracking + assessment both work |
| 7 | Reporting & Admin Views | #2, #4, #6 (data sources) | — | **Standalone**, not folded into other epics. Cross-cutting: Org Admin views their org's data, Owner views everything |

**Decision:** Reporting kept standalone rather than embedded as a
sub-task in each epic, since it touches data produced by three different
epics and would otherwise get duplicated three times.

---

## 6. Open questions (carried from BRD, unresolved)

These affect the data model and should be resolved before — or early
in — the epics that depend on them. Update this list as answers come in.

- Should Org Admins see individual quiz answers, or only pass/fail +
  score? *(affects Epic 5)*
- What exactly defines "course complete" by default — 100% of lessons,
  or lessons + passing assessment? Configurable per course? *(affects
  Epics 4, 5, 6)*
- Multiple Org Admins per Organization with different permission levels
  (view-only vs. can-invite)? *(affects Epic 2)*
- Seat limits: hard cap (block) or soft cap (warn but allow)? *(affects
  Epic 2)*
- Any per-Organization branding/white-labeling needs? *(affects Epics 2,
  7)*

---

## 7. Repo & traceability conventions

- Repo: `https://github.com/stanleyaduncan-png/sa-lms.git`
- Commit/PR convention: reference the requirement ID, e.g.
  `feat(auth): implement password reset flow (AUTH-04)`
- Issues use the requirement-tagged template in
  `.github/ISSUE_TEMPLATE/requirement.md`
- Branch naming: `feature/<req-id>-short-description`, e.g.
  `feature/TRK-04-scorm-tracking`

---

## 8. Changelog

Keep this short — just enough to track when a *decision* (not a code
change) was made, so future-you can answer "wait, why did we do it this
way?" without digging through chat history.

| Date | Change |
|---|---|
| June 2026 | BRD completed, five pillars defined, sent for external review |
| June 2026 | Stack decision reversed: Spring/Java → Next.js + Prisma + Postgres |
| June 2026 | Confirmed Auth.js v4 (not v5 beta) + `@next-auth/prisma-adapter` (not `@auth/prisma-adapter`) |
| June 2026 | Confirmed staying on Prisma 5, not upgrading to 7 |
| June 2026 | Epics defined and sequenced; Reporting kept as standalone epic |
