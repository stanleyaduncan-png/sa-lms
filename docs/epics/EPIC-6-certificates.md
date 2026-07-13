# EPIC 6 — Certificates

**Status:** BLOCKED until Epics 4 AND 5 are complete
**Requirement IDs:** CERT-01 through CERT-06
**Depends on:** Epic 4 (completion detection) + Epic 5 (completion gating)

> The capstone epic. Hand to a fresh Claude Code session (model: **Sonnet**)
> with the Epic 5 completion summary pasted at the top.

---

## FIRST STEPS

1. Read `PROJECT.md` and `README.md`.
2. Run `node check.mjs` — confirm the post-Epic-5 baseline is green.
3. Read `prisma/schema.prisma` — confirm the `Certificate` model exists
   (`userId`, `courseId`, `pdfUrl`, `issuedAt`, unique on `[userId,
   courseId]`).
4. Confirm `pdf-lib` is in `package.json` (it was added in the scaffold).

---

## Goal

When a learner meets a course's completion criteria (all lessons viewed +
all assessments passed, as finalized in Epic 5), automatically generate a
downloadable PDF certificate they can retrieve any time.

---

## ⚠️ Data model — respect the Epic 2 decision

- `session.user.organizationId` remains the single source of truth. A
  learner downloads only their **own** certificates. An Org Admin may view
  their own org's learners' certificates (CERT-04). Owner sees all.
- Never serve a certificate by an unguarded ID — scope every fetch to the
  session user (or correctly scoped admin/owner view).

---

## Stack (do not change)

- Next.js 15, TypeScript, Prisma 5, NextAuth v4
- `getServerSession(authOptions)`, Zod, logic in `src/actions/`
- PDF generation: **pdf-lib** (already a dependency)

---

## Build tasks

### 1. Certificate generation — CERT-01, CERT-02

`src/actions/certificates.ts`:
- `issueCertificate({ userId, courseId })`:
  - **Guard:** only issue if the enrollment is genuinely complete
    (`Enrollment.completedAt` is set). Re-check server-side — do not trust a
    caller claiming completion.
  - Idempotent: the `@@unique([userId, courseId])` means one cert per
    learner per course. If it exists, return it rather than erroring.
  - Generate a PDF with pdf-lib containing (CERT-02): learner name, course
    title, completion date, and Owner/platform branding.
  - Store the PDF (see Risks re: storage) and save the reference in
    `Certificate.pdfUrl`.

- **Trigger:** call `issueCertificate` at the moment completion is detected
  — i.e. where Epic 4/5 sets `Enrollment.completedAt`. Wire the trigger
  there rather than polling.

**🚩 CHECKPOINT 1:** Completing the seeded gated course produces exactly one
`Certificate` row with a working `pdfUrl`. Re-completing doesn't duplicate
it. `node check.mjs`.

### 2. Learner download — CERT-03

- `/learner/certificates` — lists the session learner's certificates
  (course title, issue date, download link).
- Also surface a download link on the course view once complete.
- Download must stream the learner's **own** cert only.

**🚩 CHECKPOINT 2:** Seeded learner sees and downloads their certificate;
attempting to fetch another user's cert ID is denied. `node check.mjs`.

### 3. Org Admin visibility — CERT-04

- In the `/org-admin` area, let an Org Admin view/download certificates
  earned by learners **in their own org only** (session-scoped).

### 4. Configurable template — CERT-05 (Should; keep simple)

- Make the certificate layout/template driven by a small config (title text,
  logo, signature line) rather than hardcoded strings scattered through the
  generator. A single template module/config is enough for v1 — no
  template-builder UI required.

> **CERT-06 is explicitly descoped** (no third-party verification / QR).
> Do not build verification. PDF download only.

### 5. Update `seed.ts` and `check.mjs`

- Seed: since the Epic 5 seed leaves a gated course ready, optionally seed
  one already-completed enrollment so a certificate exists on first run for
  UI testing. (Keep it idempotent.)
- `check.mjs`: add an "Epic 6 — Certificates" section checking
  `src/actions/certificates.ts`, `/learner/certificates` route, and the
  template config module exist.

---

## Acceptance criteria (all must pass)

- [ ] Completing a course (lessons + passing assessments) auto-issues a cert
- [ ] Certificate PDF contains name, course title, completion date, branding
- [ ] Exactly one certificate per learner per course (idempotent, no dupes)
- [ ] Issuing is guarded server-side by real `completedAt` (can't be faked)
- [ ] Learner can view and download their own certificate(s) (CERT-03)
- [ ] A learner cannot download someone else's certificate
- [ ] Org Admin can view their own org's learners' certificates (CERT-04)
- [ ] Template is config-driven, not hardcoded (CERT-05)
- [ ] No verification/QR built (CERT-06 correctly descoped)
- [ ] `npx prisma db seed` runs cleanly
- [ ] `node check.mjs` passes (including Epic 6 checks)

---

## Do NOT build yet

- Reporting dashboards / exports (Epic 7)
- Any third-party certificate verification (CERT-06 — descoped entirely)

---

## ⚠️ Risks & potential issues

1. **Storage of generated PDFs is the key open decision.** Options: (a)
   generate on-the-fly on each download (no storage, but re-renders every
   time), or (b) generate once and store in object storage, saving the URL.
   For v1, **on-the-fly generation** is simplest and avoids the
   still-unmade storage-provider decision — `pdfUrl` can be a route like
   `/api/certificates/[id]/pdf` that regenerates. If you store instead, note
   which provider. Flag your choice in the summary.
2. **Issuance guard is a security boundary.** A certificate is the product's
   proof-of-value. If `issueCertificate` can be called without a real
   completion check, the whole assessment/gating chain (Epics 4–5) is
   bypassable. Re-verify `completedAt` server-side inside the action, every
   time.
3. **Idempotency under races.** Two completion events firing together could
   both try to insert a cert. Rely on the DB unique constraint and handle
   the conflict gracefully (catch → return existing), rather than checking-
   then-inserting non-atomically.
4. **Name/title accuracy.** The PDF embeds the learner's name and course
   title at issue time. If either changes later, the stored/regenerated cert
   should reflect a sensible choice — for v1, regenerate from current data
   is fine, but be aware a renamed course changes old certs if you generate
   on-the-fly. Note this trade-off.
5. **Trigger placement.** Wiring issuance at the `completedAt` transition
   (not a cron/poll) keeps it immediate and simple — but make sure that
   transition point is single-sourced (Epic 4/5 should set `completedAt` in
   one place). If it's set in multiple spots, the trigger can be missed.
6. **PDF font/branding assets.** pdf-lib needs fonts embedded for anything
   beyond the standard set. Keep branding simple (standard font + a logo
   image) unless you're ready to embed custom fonts.

---

## When done

Write the standard completion summary. Paste it back into planning before
starting Epic 7 (the last one).
