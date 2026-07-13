# EPIC 3 — Course Authoring

**Status:** ← NEXT TO BUILD
**Requirement IDs:** CRS-01 through CRS-11
**Depends on:** Epic 1 (Foundation) ✅. Can run in parallel with Epic 2 ✅
(both done).

> Hand this whole file to a fresh Claude Code session. Set the model to
> **Sonnet**. Paste the Epic 2 completion summary at the top of the session
> first, then this file.

---

## FIRST STEPS (do before writing any code)

1. Read `PROJECT.md` and `README.md`.
2. Run `node check.mjs` — confirm the baseline is **80/80** before you
   start. If it isn't, stop and report.
3. Read `prisma/schema.prisma` — confirm the `Course`, `Section`, `Lesson`,
   and `CourseGrant` models exist (they were scaffolded in the initial
   setup). You'll be building on them, not creating them.

---

## Goal

The Owner can author a course end to end: create it, structure it into
sections and ordered lessons, attach content (video / document / SCORM via
URL), publish it, and grant it to organizations.

---

## ⚠️ Data model — respect the Epic 2 decision

- `session.user.organizationId` is the single source of truth for
  org-scoping. Course grants are Owner-only actions, so this epic is mostly
  Owner-scoped — but when you touch anything org-related (granting a course
  to an org), use the session, never a client-supplied ID.
- Course authoring is **Owner only**. Org Admins and Learners never see
  these screens. Enforce this in each action AND rely on the middleware.

---

## Stack (do not change)

- Next.js 15 (App Router), TypeScript
- Prisma 5 on Supabase (do NOT upgrade to Prisma 7)
- NextAuth v4, `getServerSession(authOptions)` for session reads
- Zod for input validation
- All business logic in `src/actions/` — not inline in pages/components

---

## Build tasks

### 1. Course CRUD — CRS-01, CRS-08

`src/actions/courses.ts`:
- `createCourse({ title, description, thumbnailUrl? })` → status defaults to
  `DRAFT`
- `updateCourse(id, { title, description, thumbnailUrl?, status })` → Owner
  only; validate `status` is a valid `CourseStatus` enum value
- `archiveCourse(id)` → sets `status=ARCHIVED`

Owner UI at `/owner/courses`:
- List all courses (title, status, section count, created date)
- Create-course form (title + description; thumbnail URL optional)
- Edit course (title, description, status toggle DRAFT/PUBLISHED)
- Archive button (with confirmation)

**🚩 CHECKPOINT 1:** Owner can create a DRAFT course, see it listed, edit it,
and archive it. Run `node check.mjs`.

### 2. Section & Lesson structure — CRS-02, CRS-03, CRS-09

`src/actions/lessons.ts`:
- `createSection(courseId, { title, order })`
- `updateSection(id, { title, order })`
- `deleteSection(id)` → only if it contains no lessons (block otherwise with
  a clear error)
- `createLesson(sectionId, { title, order, contentType, contentUrl?,
  requiresPriorLesson })`
- `updateLesson(id, { … })`
- `deleteLesson(id)`
- `reorderLessons(sectionId, lessonIds[])` → updates the `order` field for
  each lesson in array order

Owner UI at `/owner/courses/[courseId]`:
- Course detail showing all sections and their lessons
- Add/edit/delete sections inline
- Add/edit/delete lessons within each section
- Each lesson shows: title, contentType badge, contentUrl if set
- Reorder: simple up/down buttons are fine (no drag-and-drop in v1)
- `requiresPriorLesson` toggle per lesson (CRS-09)

**🚩 CHECKPOINT 2:** Owner can add two sections, add lessons of each content
type, reorder them, and delete an empty section. Run `node check.mjs`.

### 3. Content URL handling — CRS-04, CRS-05, CRS-06

Content is **URL-based in v1** — no browser file upload (storage provider
not yet chosen; see Risks). The Owner supplies a URL per lesson:
- `VIDEO` → hosted video URL
- `DOCUMENT` → publicly accessible PDF/slide URL
- `SCORM` → URL to a hosted SCORM package entry point (e.g. `index.html`)

Validate URL format with Zod on save. Store in `Lesson.contentUrl`.
**Do not build a file-upload UI.**

### 4. Course-to-org assignment — ACC-02 (partial)

`src/actions/courseGrants.ts`:
- `grantCourseToOrg(courseId, organizationId)` → creates a `CourseGrant`;
  **only PUBLISHED courses may be granted** (block DRAFT/ARCHIVED with a
  clear error)
- `revokeCourseFromOrg(courseId, organizationId)` → deletes the `CourseGrant`

Owner UI at `/owner/courses/[courseId]/grants`:
- List orgs this course is granted to
- "Grant to org" — dropdown of active orgs
- Revoke button per granted org

> Individual-learner course assignment is **Epic 4** (built alongside
> enrollment). Do not build it here.

**🚩 CHECKPOINT 3:** Owner can publish a course, grant it to Acme Corp, see
the grant listed, and revoke it. Granting a DRAFT course is blocked. Run
`node check.mjs`.

### 5. Update `prisma/seed.ts` — course test data

After existing seed data, upsert (idempotently):
- Course: `title="Intro to Safety"`, `status=PUBLISHED`
- Two sections: "Module 1: Basics", "Module 2: Advanced"
- Four lessons total (two per section):
  - VIDEO — `https://example.com/video1.mp4`
  - DOCUMENT — `https://example.com/doc1.pdf`
  - VIDEO — `https://example.com/video2.mp4`
  - SCORM — `https://example.com/scorm1/index.html`
- Grant "Intro to Safety" to "Acme Corp"

Run `npx prisma db seed` and confirm it's idempotent (rerun → same result).

### 6. Update `check.mjs` — Epic 3 checks

Add a section "Epic 3 — Course Authoring" verifying:
- `src/actions/courses.ts`, `src/actions/lessons.ts`,
  `src/actions/courseGrants.ts` exist
- `src/app/(dashboard)/owner/courses/page.tsx`,
  `src/app/(dashboard)/owner/courses/[courseId]/page.tsx`,
  `src/app/(dashboard)/owner/courses/[courseId]/grants/page.tsx` exist
  (note the `(dashboard)` route group in the path — see the route-group
  convention in `README.md`; confirm the real path by listing `src/app`
  before writing the check)
- `Course`, `Section`, `Lesson`, `CourseGrant` models still present

The passing count will rise above 80 — expected.

---

## Acceptance criteria (all must pass)

- [ ] Owner can create a course (DRAFT by default)
- [ ] Owner can add sections and lessons
- [ ] Owner can set contentType (VIDEO/DOCUMENT/SCORM) + contentUrl per lesson
- [ ] Owner can reorder lessons within a section
- [ ] Owner can toggle `requiresPriorLesson`
- [ ] Owner can publish (DRAFT → PUBLISHED) and archive a course
- [ ] Owner can grant a PUBLISHED course to an org
- [ ] Granting a DRAFT/ARCHIVED course is blocked with a clear error
- [ ] Owner can revoke a course grant
- [ ] `npx prisma db seed` runs cleanly with course data, idempotently
- [ ] `node check.mjs` passes (including new Epic 3 checks)

---

## Do NOT build yet

- Learner-facing catalog or course player (Epic 4)
- Individual-learner course assignment / enrollment (Epic 4)
- Quiz/assessment authoring (Epic 5)
- Progress tracking (Epic 4)
- Any actual video player, PDF viewer, or SCORM runtime — this epic only
  stores content URLs, it does not render/play content

---

## ⚠️ Risks & potential issues (watch for these)

1. **Scope creep into content rendering.** It is tempting to start building
   a video player or SCORM runtime here. Don't. This epic authors metadata
   and URLs only. Playback/runtime is Epic 4 territory. If you find yourself
   embedding an `<iframe>` SCORM player, stop.
2. **File upload temptation.** The storage provider (S3/Supabase Storage/etc)
   is deliberately undecided. Building an upload UI now bakes in a choice
   that hasn't been made. URL fields only.
3. **Reorder edge cases.** `reorderLessons` should handle the full ordered
   array in one transaction, not one-off swaps, to avoid duplicate/skipped
   `order` values if two updates race. Use a Prisma `$transaction`.
4. **`deleteSection` with lessons.** Must be blocked, not cascade-deleted —
   silently deleting lessons because a section was removed would destroy
   authoring work. Return a clear error telling the Owner to remove lessons
   first.
5. **Grant-before-publish.** The "only PUBLISHED can be granted" rule must be
   enforced **server-side in the action**, not just by hiding a button.
   A DRAFT course granted to an org would leak unfinished content.
6. **Course status transitions.** Consider what happens to existing grants
   when a PUBLISHED course is later ARCHIVED. For v1: leave existing grants
   intact (archiving hides it from new grants, doesn't revoke existing
   access). Note this in the summary if you implement it differently.

---

## When done

Write a completion summary (same format as Epics 1 and 2): acceptance
criteria table, files created/changed, any deviations, and the final
`check.mjs` count. Paste it back into the planning conversation before
starting Epic 4.
