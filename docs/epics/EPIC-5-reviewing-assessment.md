# EPIC 5 — Reviewing (Assessment)

**Status:** BLOCKED until Epic 4 is complete
**Requirement IDs:** REV-01 through REV-06
**Depends on:** Epic 4 (a quiz attempt is a specialized form of progress)

> Hand to a fresh Claude Code session (model: **Sonnet**) with the Epic 4
> completion summary pasted at the top.

---

## FIRST STEPS

1. Read `PROJECT.md` and `README.md`.
2. Run `node check.mjs` — confirm the post-Epic-4 baseline is green.
3. Read `prisma/schema.prisma` — confirm `Quiz`, `QuizQuestion`,
   `QuizAttempt` models and the `QuestionType` enum exist.

---

## Goal

The Owner can attach quizzes to lessons (or a course's final assessment),
learners can take them, attempts are scored and stored, and course
completion can be **gated on passing** — not merely on viewing all lessons.

---

## ⚠️ Data model — respect the Epic 2 decision

- `session.user.organizationId` remains the single source of truth. A
  learner takes quizzes only for their own enrollments; attempts are always
  written for the session user. Org Admins/Owner viewing results are scoped
  per Epic 4's pattern.

---

## Stack (do not change)

- Next.js 15, TypeScript, Prisma 5, NextAuth v4
- `getServerSession(authOptions)`, Zod, logic in `src/actions/`

---

## Build tasks

### 1. Quiz authoring — REV-01, REV-02

`src/actions/quizzes.ts` (Owner only):
- `createQuiz(lessonId, { passThreshold, maxAttempts? })` — one quiz per
  lesson (the schema has `Quiz.lessonId @unique`)
- `addQuestion(quizId, { text, type, options, order })` where `type` is
  `SINGLE_CHOICE` / `MULTIPLE_CHOICE` / `TRUE_FALSE`; `options` is JSON:
  `[{ id, text, isCorrect }]`
- `updateQuestion` / `deleteQuestion` / `reorderQuestions`

Owner UI: on the lesson editor (`/owner/courses/[courseId]`), add a "Manage
quiz" area to build questions and set the pass threshold (default 80%).

**🚩 CHECKPOINT 1:** Owner can attach a quiz to a lesson, add all three
question types, set a pass threshold. `node check.mjs`.

### 2. Taking a quiz — REV-03, REV-04

`src/actions/quizAttempts.ts`:
- `submitQuizAttempt(quizId, answers)` →
  - scores server-side (**never trust a client-submitted score**)
  - computes `passed = score >= passThreshold`
  - writes a `QuizAttempt` (score, passed, answers JSON, timestamp) for the
    session user — one row **per attempt** (REV-04, audit trail)
  - enforces `maxAttempts` if set (REV-03): block with a clear message when
    exhausted; allow retake otherwise

Learner UI: quiz surface inside `/learner/courses/[courseId]` — render
questions, submit, show score + pass/fail and (if allowed) a retake button.

**🚩 CHECKPOINT 2:** Learner takes a quiz, gets a server-computed score,
sees pass/fail; a second attempt is blocked once `maxAttempts` is hit.
`node check.mjs`.

### 3. SCORM-native assessment — REV-05

- SCORM packages that carry their own assessment already report score via
  the SCORM API (Epic 4's `LMSSetValue` → `cmi.core.score.raw` and
  `lesson_status`). Treat a SCORM `passed`/`failed` status as equivalent to
  a native quiz pass/fail for completion gating.
- Do **not** rebuild scoring for SCORM — consume what the runtime reports.
  Just make sure a SCORM `failed` blocks completion the same way a failed
  native quiz does.

### 4. Completion gating — REV-06 (this resolves an open question)

- A course/lesson with an assessment is **complete only when the assessment
  is passed** — not merely when content is viewed.
- Update the Epic 4 roll-up: a lesson with a quiz requires a passing
  `QuizAttempt` (or passing SCORM status) before it counts COMPLETE.
- **This finalizes the "what does complete mean" open question** (PROJECT.md
  §6) as: *all lessons viewed AND all attached assessments passed.* Update
  PROJECT.md §6 to mark it resolved, and note it in your summary.

**🚩 CHECKPOINT 3:** A course with a final quiz does not reach 100%/completed
until the quiz is passed; passing it flips `Enrollment.completedAt`. `node
check.mjs`.

### 5. Update `seed.ts` and `check.mjs`

- Seed: attach a short quiz (2–3 questions) to one lesson of "Intro to
  Safety", with a known pass threshold, so Epic 6 has a gated completion to
  work with.
- `check.mjs`: add an "Epic 5 — Reviewing" section checking the new action
  files and quiz UI routes exist.

---

## Acceptance criteria (all must pass)

- [ ] Owner can attach a quiz to a lesson with a configurable pass threshold
- [ ] Owner can author SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE questions
- [ ] Learner can take a quiz; score is computed **server-side**
- [ ] Each attempt is stored with score, pass/fail, answers, timestamp (REV-04)
- [ ] `maxAttempts` is enforced when set (REV-03)
- [ ] SCORM-reported pass/fail gates completion equivalently (REV-05)
- [ ] A lesson/course with an assessment is COMPLETE only when passed (REV-06)
- [ ] Passing the final assessment flips `Enrollment.completedAt`
- [ ] `npx prisma db seed` runs cleanly with quiz data
- [ ] `node check.mjs` passes (including Epic 5 checks)

---

## Do NOT build yet

- Certificate generation (Epic 6) — completion is now gate-able, but issuing
  the certificate is next epic
- Rich analytics on quiz performance (Epic 7)

---

## ⚠️ Risks & potential issues

1. **Never trust client-side scoring.** The single most important rule here.
   Score every attempt on the server from the stored correct answers. A
   client-submitted score is an open door to fake a pass → fake a
   certificate.
2. **Answer key exposure.** `QuizQuestion.options` contains `isCorrect`
   flags. When sending questions to the learner's browser, **strip
   `isCorrect`** — otherwise the answers are sitting in the page source.
   Send a learner-safe projection.
3. **`maxAttempts` race.** Two rapid submissions could both pass the
   attempt-count check. Enforce in a transaction (count + insert atomically)
   if this matters; at minimum, count immediately before insert.
4. **Completion-gating interaction with Epic 4.** You're modifying the
   roll-up logic Epic 4 wrote. Re-test Epic 4's completion cases after this
   change — don't just test the quiz path. A regression here silently breaks
   certificate eligibility in Epic 6.
5. **MULTIPLE_CHOICE scoring rule.** Decide and document: all-correct-or-
   nothing, or partial credit? Recommendation for v1: all-or-nothing (the
   selected set must exactly equal the correct set). Note your choice.
6. **SCORM vs native double-counting.** A SCORM lesson that is *also* given a
   native quiz would have two assessment sources. Keep it simple in v1: a
   SCORM lesson's assessment is the SCORM result; don't also attach a native
   quiz to a SCORM lesson. Enforce or document.

---

## When done

Write the standard completion summary. Confirm you updated PROJECT.md §6
(completion definition resolved). Paste the summary back into planning
before starting Epic 6.
