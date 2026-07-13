# EPIC 4 — Tracking & Progress

**Status:** BLOCKED until Epics 2 AND 3 are complete
**Requirement IDs:** TRK-01 through TRK-08
**Depends on:** Epic 2 (need enrolled learners) + Epic 3 (need real lessons)

> This is the **convergence point** — it needs both an enrolled learner and
> real lessons to exist before it can be meaningfully built or tested.
> Hand this file to a fresh Claude Code session (model: **Sonnet**) with the
> Epic 3 completion summary pasted at the top.

---

## FIRST STEPS

1. Read `PROJECT.md` and `README.md`.
2. Run `node check.mjs` — confirm the post-Epic-3 baseline is green.
3. Read `prisma/schema.prisma` — confirm `Enrollment` and `Progress` models
   exist and their fields (especially `Progress.scormData` as `Json`).

---

## Goal

Enroll learners in courses, then track their progress lesson by lesson —
including video watch progress and SCORM runtime data — and roll it up to
course-level completion. Also introduces **individual-learner course
assignment** (deferred here from Epic 3).

---

## ⚠️ Data model — respect the Epic 2 decision

- `session.user.organizationId` is the single source of truth. A learner
  sees only their own enrollments; an Org Admin sees only their own org's
  learners' progress (TRK-07); the Owner sees everything (TRK-08).
- **Every progress/enrollment query must filter by the session user.** A
  learner must never be able to read another learner's progress by ID.

---

## Stack (do not change)

- Next.js 15, TypeScript, Prisma 5, NextAuth v4
- `getServerSession(authOptions)` for session reads
- Zod for validation; all logic in `src/actions/`

---

## Build tasks

### 1. Enrollment — DB-02, plus individual assignment (ACC-02 completion)

`src/actions/enrollments.ts`:
- `enrollLearner({ userId, courseId, source })` where `source` is
  `ORG_ASSIGNED` or `INDIVIDUAL_ASSIGNED` (matches the `EnrollmentSource`
  enum) — records **how** access was granted (DB-02 traceability)
- Auto-enrollment: when a course is granted to an org (Epic 3), org learners
  should get `ORG_ASSIGNED` enrollments. Decide and document: eager (on
  grant) vs lazy (on first access). **Recommendation: lazy** — create the
  enrollment when the learner first opens the course, to avoid mass-writes
  when a big org gets a grant.
- `assignCourseToIndividual({ userId, courseId })` → Owner-only; creates an
  `INDIVIDUAL_ASSIGNED` enrollment for a standalone learner

Owner UI: on `/owner/courses/[courseId]`, add an "Assign to individual
learner" control (email lookup → enroll).

**🚩 CHECKPOINT 1:** Owner can assign a course to an individual learner; an
org learner opening a granted course gets auto-enrolled. `node check.mjs`.

### 2. Learner catalog & course view

- `/learner` — lists the learner's enrolled courses with course-level
  progress (%). Uses only the session user's enrollments.
- `/learner/courses/[courseId]` — shows sections/lessons with per-lesson
  status (NOT_STARTED / IN_PROGRESS / COMPLETE) and honors
  `requiresPriorLesson` (a locked lesson can't be opened until the prior one
  is COMPLETE — CRS-09 enforcement lands here).

**🚩 CHECKPOINT 2:** Seeded learner sees their enrolled course and can open an
unlocked lesson; a `requiresPriorLesson` lesson is locked until its
predecessor completes. `node check.mjs`.

### 3. Per-lesson progress — TRK-01, TRK-02, TRK-03, TRK-06

`src/actions/progress.ts`:
- `updateLessonProgress({ lessonId, status, watchedSeconds?,
  watchedPercent? })` — upserts a `Progress` row for the session user
- **VIDEO (TRK-02):** track `watchedPercent`; auto-mark COMPLETE at a
  configurable threshold (default 90%)
- **DOCUMENT (TRK-03):** mark COMPLETE on open/acknowledge (a "Mark as read"
  action is acceptable for v1)
- **Resume (TRK-06):** store enough to resume where the learner left off
  (video position; SCORM `suspend_data` — see task 4)

**🚩 CHECKPOINT 3:** Watching a video past threshold flips it to COMPLETE;
reopening resumes position. `node check.mjs`.

### 4. SCORM tracking — TRK-04 (highest-risk task, read Risks first)

- Serve the SCORM package (from `Lesson.contentUrl`) in an iframe and expose
  a **SCORM API** (`SCORM 1.2` at minimum: the `API` object with
  `LMSInitialize`, `LMSGetValue`, `LMSSetValue`, `LMSCommit`, `LMSFinish`).
- On `LMSSetValue`/`LMSCommit`, persist the relevant CMI values into
  `Progress.scormData` (JSON): at least `cmi.core.lesson_status`,
  `cmi.core.score.raw`, `cmi.suspend_data`.
- Map SCORM `lesson_status` (`completed`/`passed`) → `Progress.status =
  COMPLETE`.
- On resume, feed stored `suspend_data` back via `LMSGetValue`.

**🚩 CHECKPOINT 4:** A test SCORM package initializes, writes status/score
back to `Progress.scormData`, and resumes with `suspend_data`. `node
check.mjs`.

### 5. Course-level roll-up — TRK-05

- Course progress = (COMPLETE lessons / total lessons) for that learner.
- When all lessons are COMPLETE, set `Enrollment.completedAt`. (This becomes
  the trigger point for certificate issuance in Epic 6 — but do NOT build
  certificate logic here.)

### 6. Progress visibility — TRK-07, TRK-08

- **Org Admin** (`/org-admin` area): per-learner and aggregate progress for
  courses within **their own org only** (session-scoped).
- **Owner:** progress across all orgs and individuals.
- Keep these views minimal — richer reporting is **Epic 7**. Just prove the
  data is queryable and correctly scoped here.

### 7. Update `seed.ts` and `check.mjs`

- Seed: enroll the seeded Acme learner into "Intro to Safety"; add a couple
  of `Progress` rows (one COMPLETE, one IN_PROGRESS) so dashboards have data.
- `check.mjs`: add an "Epic 4 — Tracking & Progress" section checking the
  new action files and learner course routes exist.

---

## Acceptance criteria (all must pass)

- [ ] Owner can assign a course to an individual learner (INDIVIDUAL_ASSIGNED)
- [ ] Org learner opening a granted course gets auto-enrolled (ORG_ASSIGNED)
- [ ] Learner catalog shows only their enrollments with course % progress
- [ ] Per-lesson status tracks correctly (NOT_STARTED/IN_PROGRESS/COMPLETE)
- [ ] Video auto-completes at threshold; resumes position (TRK-02, TRK-06)
- [ ] Document lessons can be marked complete (TRK-03)
- [ ] SCORM package initializes, writes status/score to `scormData`, resumes
      via `suspend_data` (TRK-04)
- [ ] `requiresPriorLesson` locks a lesson until its predecessor completes
- [ ] Course completion sets `Enrollment.completedAt` (TRK-05)
- [ ] Org Admin sees only their org's progress (TRK-07); Owner sees all
      (TRK-08)
- [ ] `npx prisma db seed` runs cleanly with progress data
- [ ] `node check.mjs` passes (including Epic 4 checks)

---

## Do NOT build yet

- Quizzes/assessment (Epic 5) — a quiz attempt is a form of progress but it
  belongs to Epic 5
- Certificate generation (Epic 6) — even though completion is detected here,
  issuing the cert is Epic 6
- Rich reporting dashboards, CSV export, charts (Epic 7)

---

## ⚠️ Risks & potential issues (read before starting)

1. **SCORM is the single biggest risk in the whole project.** It's a fiddly
   1990s-era JS contract. Budget real time for task 4. Get a *single* SCORM
   1.2 package working end to end before worrying about SCORM 2004. Find the
   `API` object placement rule: SCORM content searches `window.parent` /
   `window.opener` chains for a global named exactly `API` (1.2) or
   `API_1484_11` (2004). If it can't find it, the package silently fails to
   initialize. This trips up almost everyone the first time.
   - **Same-origin gotcha (decide this before coding task 4):** the SCORM
     content runs in an iframe and reaches *up* to `window.parent.API`.
     Browsers block that reach across origins. So a package served from an
     arbitrary external `contentUrl` (a different domain) generally CANNOT
     talk to your API object. For SCORM to work, the package needs to be
     served from the **same origin** as the app (e.g. unpacked into your own
     storage/route and served under your domain), not hot-linked from a
     third-party host. This means `contentUrl` for a SCORM lesson should
     point at a package you host, and a SCORM package is a **zip that must be
     unpacked** to serve its `index.html` entry point — it is not a single
     file. Epic 3 deliberately only stored the URL and did not build upload/
     unpack; that storage+unpack decision lands here (or gets stubbed with a
     locally-served test package). Flag your approach in the summary. For the
     v1 checkpoint, a same-origin test package placed in `public/` (or served
     via a route) is enough to prove the API handshake — you do not need the
     full upload/unpack pipeline to pass the checkpoint, but note that gap.
2. **`scormData` as untyped JSON.** Flexible, but validate on write with Zod
   so you don't persist garbage. Store only the CMI keys you actually use.
3. **Progress write frequency.** Video progress fires often — debounce
   client-side (e.g. every 5–10s or on pause), don't write on every
   `timeupdate` tick, or you'll hammer the DB.
4. **Cross-learner data leakage.** The highest-severity correctness risk:
   every progress read must be scoped to the session user (or, for
   admins/owner, to the correctly scoped set). Add an explicit check —
   never fetch a `Progress`/`Enrollment` purely by an ID from the client.
5. **Auto-enroll write storms.** If you choose eager auto-enrollment on
   course grant, granting to a 500-seat org writes 500 rows synchronously.
   Lazy enrollment (on first open) avoids this. Recommended.
6. **Completion definition is still an open question** (see PROJECT.md §6):
   is a course "complete" at 100% of lessons, or lessons + passing
   assessment? Epic 5 adds assessment. For now, implement lesson-based
   completion but **leave the door open** — don't hardcode assumptions that
   Epic 6 will have to tear out. Flag your choice in the summary.

---

## When done

Write the standard completion summary and paste it back into planning before
starting Epic 5.
