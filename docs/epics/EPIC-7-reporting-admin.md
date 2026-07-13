# EPIC 7 — Reporting & Admin Views

**Status:** BLOCKED — needs its data sources (Epics 2, 4, 6) to exist
**Requirement IDs:** cross-cutting (draws on ACC-, TRK-, CERT- data)
**Depends on:** Epic 2 (orgs/learners), Epic 4 (progress), Epic 6 (certs)

> The standalone, cross-cutting epic. It builds **no new domain data** — it
> reads and presents what Epics 2/4/6 already produce. Can be built
> incrementally once those exist. Hand to a fresh Claude Code session
> (model: **Sonnet**) with the Epic 6 completion summary at the top.

---

## FIRST STEPS

1. Read `PROJECT.md` and `README.md`.
2. Run `node check.mjs` — confirm the post-Epic-6 baseline is green.
3. Skim the existing Owner and Org Admin dashboard routes — this epic
   consolidates and deepens them rather than starting fresh.

---

## Goal

Give the Owner a cross-org view and each Org Admin a scoped view of their own
org — completion rates, progress, and certificates — as proper reporting
surfaces rather than the thin per-epic views built along the way.

---

## ⚠️ Data model — respect the Epic 2 decision (this is the crux of this epic)

- **`session.user.organizationId` is the single source of truth.** This epic
  lives and dies by correct scoping:
  - **Owner** sees everything, across all orgs and individual learners.
  - **Org Admin** sees **only their own org** — every query filtered by the
    session's org, no exceptions, no client-supplied org IDs.
- Reporting is exactly where a scoping bug leaks one org's data to another.
  Treat every query as a potential leak until proven scoped.

---

## Stack (do not change)

- Next.js 15, TypeScript, Prisma 5, NextAuth v4
- `getServerSession(authOptions)`, logic in `src/actions/`
- No new models. If you find yourself adding a table, stop — this epic is
  read-only reporting over existing data.

---

## Build tasks

### 1. Owner reporting — cross-org

`/owner/reports`:
- Per-org summary: seats used / seat limit, number of learners, course
  completion rate.
- Per-course summary: enrollments, completion rate, average quiz score.
- Individual learners (non-org) roll-up alongside orgs.

**🚩 CHECKPOINT 1:** Owner report shows every org plus individuals with
correct counts against seeded data. `node check.mjs`.

### 2. Org Admin reporting — own org only

`/org-admin/reports`:
- Roster with per-learner progress across assigned courses.
- Per-course completion rate within the org.
- Certificates earned within the org.
- **Every query scoped to the session org.**

**🚩 CHECKPOINT 2:** Signed in as the seeded Org Admin, the report shows only
that org's data. Attempting to view another org's report is denied/redirected.
`node check.mjs`.

### 3. Learner self-view — own record

`/learner/reports` (or fold into `/learner`):
- The learner's own progress and certificates in one place. Read-only,
  session-scoped.

### 4. CSV export (optional, Should)

- Let Owner and Org Admin export their (scoped) report as CSV. Generate
  server-side; the Org Admin export must carry the same scoping as the view.

### 5. Update `check.mjs`

- Add an "Epic 7 — Reporting" section checking the report routes/actions
  exist. This is the final epic — note the final total in the summary.

---

## Acceptance criteria (all must pass)

- [ ] Owner sees cross-org + individual reporting with correct figures
- [ ] Org Admin sees only their own org's reporting (no cross-org leakage)
- [ ] Learner can see their own progress + certificates
- [ ] Any CSV export honors the same scoping as the on-screen report
- [ ] Attempting to access another org's report as an Org Admin is denied
- [ ] No new database models were introduced
- [ ] `node check.mjs` passes (including Epic 7 checks)

---

## Do NOT build

- New domain tables or fields — this epic is read-only over existing data
- Anything descoped in the BRD (payments, public verification, etc.)
- Heavy BI/charting libraries unless genuinely warranted — simple tables and
  percentages meet the requirement for v1

---

## ⚠️ Risks & potential issues

1. **Cross-org data leakage is THE risk of this epic.** Reporting aggregates
   are exactly where an unscoped `findMany` quietly returns every org's rows.
   For every Org Admin query, ask: "is this filtered by the session org?" If
   you can't point to the filter, it's a leak. Consider a shared scoped-query
   helper so scoping isn't re-implemented (and re-forgotten) per report.
2. **Aggregation performance.** Completion rates over many enrollments can
   get expensive. Prefer DB-side aggregation (Prisma `groupBy`/`count`) over
   pulling rows into JS and counting. Add indexes if a report is slow.
3. **CSV injection.** If exporting CSV, sanitize cells that begin with `=`,
   `+`, `-`, `@` (spreadsheet formula injection) — prefix with a quote or
   strip. User-supplied names/emails flow into these exports.
4. **Consistency with per-epic views.** Epics 4 and 6 built thin
   progress/cert views. Either replace them with these reports or make them
   share the same scoped queries — divergent numbers between two screens
   erode trust in the data.
5. **"Complete" definition must match Epic 5.** Completion rates here must
   use the same definition finalized in Epic 5 (lessons + passing
   assessments). If reporting counts "all lessons viewed" while Epic 5 gates
   on assessments, the numbers won't match certificates issued. Reuse the
   completion logic, don't reimplement it.

---

## When done — project v1 complete

Write the final completion summary, including the final `check.mjs` total and
a short "state of the build" note. At this point all seven epics are done and
the v1 scope from the BRD is delivered. Update PROJECT.md's changelog and
status accordingly.
