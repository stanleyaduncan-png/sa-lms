# EPIC 2 — Access & Invitations

**Status:** ✅ COMPLETE (documented here for reference)
**Requirement IDs:** ACC-01 through ACC-10
**Depends on:** Epic 1

> This epic is already built. This file records what it delivered and — most
> importantly — the **data-model decision** that every later epic depends on.

---

## Goal

Organizations with seat pools, Org Admin designation, individual + org-scoped
invitations, and the full invitation lifecycle (send / accept / expire /
resend / revoke).

## What was delivered

- **`src/actions/organizations.ts`** — create / update / deactivate org,
  assign Org Admin by email.
- **`src/actions/invitations.ts`** — send / resend / revoke invitation;
  seat-limit check in `sendInvitation`.
- **Owner UI**: `/owner/organizations`, `/owner/invitations`.
- **Org Admin UI**: `/org-admin/invitations` (scoped to own org, shows seat
  usage, blocks at limit).
- **`/invite/accept`** — token validation, lazy-expiry, set-password form,
  user creation, auto sign-in → `/learner`.
- **`prisma/seed.ts`** extended — Acme Corp org, an Org Admin, an individual
  learner (all idempotent).

## ⚠️ CRITICAL DATA-MODEL DECISION (all later epics depend on this)

**An Org Admin's organization is derived from the `adminOfOrganizations`
relation — NOT from `User.organizationId`.**

- `User.organizationId` is reserved **exclusively for learner seat
  tracking** (the ACC-09 seat formula). An Org Admin does **not** consume a
  seat.
- The Org Admin's org is computed at **login time** in `src/lib/auth.ts`
  from `adminOfOrganizations` and stored in the session.
- **`session.user.organizationId` is the single source of truth** for
  org-scoping — for both learners and Org Admins. Every org-scoped query
  filters by it. Never trust a client-supplied org ID.

This required a small change to Epic 1's `auth.ts`. Do not revert it.

## Seat formula (ACC-09)

```
seats used = (Users where organizationId = orgId)
           + (Invitations where organizationId = orgId AND status = PENDING)
```
Checked unconditionally server-side in `sendInvitation`, and surfaced in the
Org Admin UI (which disables the invite form at the limit).

## Known deviations / notes

- **Reseed does not reset roles.** The seed's `update: {}` is an intentional
  no-op so reseeding a shared dev DB doesn't silently undo real Owner
  actions (e.g. a learner promoted to Org Admin during testing stays that
  way). A pristine reset needs a separate DB-reset step.
- **Lazy expiry**: an expired token flips its DB status to `EXPIRED` on
  access, rather than via a scheduled job. Fine for v1.
- **Intermittent dev-server crashes** were observed mid-testing, no error in
  logs, restarts came back clean. Believed to be Next.js hot-reload
  instability under heavy file churn, not a code bug. Watch for recurrence.

## Baseline at completion

- `node check.mjs` → **80/80 passing** (up from 71)
