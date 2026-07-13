"use server";

// Per-lesson progress tracking (TRK-01, TRK-02, TRK-03, TRK-06) and
// course-level roll-up (TRK-05).
//
// Cross-learner data leakage is the highest-severity risk here (Epic 4
// risk #4): every read/write below is scoped to getServerSession's own
// user id - never fetch or write a Progress/Enrollment purely by an ID
// supplied by the client.
//
// Completion definition (documented per Epic 4 risk #6): v1 defines course
// completion as 100% of lessons COMPLETE. Epic 5 may add "+ passing
// assessment" - that would change the trigger condition in
// recomputeEnrollmentCompletion below, not the Progress model itself, so
// the door stays open.

import { z } from "zod";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { courseProgressPercent } from "@/actions/enrollments";

// TRK-02: video auto-completes at this watched percentage.
const VIDEO_COMPLETE_THRESHOLD = 90;

async function recomputeEnrollmentCompletion(userId: string, courseId: string) {
  const totalLessons = await prisma.lesson.count({ where: { section: { courseId } } });
  if (totalLessons === 0) return;

  const completeCount = await prisma.progress.count({
    where: { userId, status: "COMPLETE", lesson: { section: { courseId } } },
  });

  if (completeCount >= totalLessons) {
    await prisma.enrollment.updateMany({
      where: { userId, courseId, completedAt: null },
      data: { completedAt: new Date() },
    });
  }
}

// Returns the course structure (sections/lessons) annotated with this
// learner's Progress per lesson and lock state (CRS-09: a lesson flagged
// requiresPriorLesson is locked until the immediately preceding lesson in
// course order - flattened across sections - is COMPLETE; schema has no
// explicit predecessor link, so "prior" means "previous in course order").
export async function getLearnerCourseView(courseId: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: "Not authorized" };
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId } },
  });
  if (!enrollment) {
    return { error: "You do not have access to this course" };
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!course) {
    return { error: "Course not found" };
  }

  const flatLessons = course.sections.flatMap((s) => s.lessons);
  const progressRows = await prisma.progress.findMany({
    where: { userId: session.user.id, lessonId: { in: flatLessons.map((l) => l.id) } },
  });
  const progressByLessonId = new Map(progressRows.map((p) => [p.lessonId, p]));

  let previousComplete = true; // the "start of course" has nothing to require
  const lockByLessonId = new Map<string, boolean>();
  for (const lesson of flatLessons) {
    const locked = lesson.requiresPriorLesson && !previousComplete;
    lockByLessonId.set(lesson.id, locked);
    previousComplete = progressByLessonId.get(lesson.id)?.status === "COMPLETE";
  }

  const sections = course.sections.map((section) => ({
    ...section,
    lessons: section.lessons.map((lesson) => ({
      ...lesson,
      progress: progressByLessonId.get(lesson.id) ?? null,
      locked: lockByLessonId.get(lesson.id) ?? false,
    })),
  }));

  return { course: { ...course, sections }, enrollment };
}

export async function getLessonForLearner(lessonId: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: "Not authorized" };
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { section: { include: { course: true } } },
  });
  if (!lesson) {
    return { error: "Lesson not found" };
  }

  const courseId = lesson.section.courseId;
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId } },
  });
  if (!enrollment) {
    return { error: "You do not have access to this lesson" };
  }

  const view = await getLearnerCourseView(courseId);
  if ("error" in view) {
    return { error: view.error };
  }
  const flatLessons = view.course.sections.flatMap((s) => s.lessons);
  const annotated = flatLessons.find((l) => l.id === lessonId);
  if (annotated?.locked) {
    return { error: "This lesson is locked until the prior lesson is complete" };
  }

  const progress = await prisma.progress.findUnique({
    where: { userId_lessonId: { userId: session.user.id, lessonId } },
  });

  return { lesson, courseId, progress };
}

const updateProgressSchema = z.object({
  lessonId: z.string().min(1),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETE"]).optional(),
  watchedSeconds: z.number().int().min(0).optional(),
  watchedPercent: z.number().min(0).max(100).optional(),
});

export async function updateLessonProgress(input: {
  lessonId: string;
  status?: string;
  watchedSeconds?: number;
  watchedPercent?: number;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: "Not authorized" };
  }

  const parsed = updateProgressSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { lessonId, watchedSeconds, watchedPercent } = parsed.data;
  let { status } = parsed.data;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { section: true },
  });
  if (!lesson) {
    return { error: "Lesson not found" };
  }
  const courseId = lesson.section.courseId;

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId } },
  });
  if (!enrollment) {
    return { error: "You do not have access to this lesson" };
  }

  // TRK-02: video auto-completes at threshold, regardless of what the
  // client thinks the status is - don't trust the client for completion.
  if (lesson.contentType === "VIDEO" && watchedPercent !== undefined) {
    status = watchedPercent >= VIDEO_COMPLETE_THRESHOLD ? "COMPLETE" : "IN_PROGRESS";
  }

  await prisma.progress.upsert({
    where: { userId_lessonId: { userId: session.user.id, lessonId } },
    update: {
      ...(status && { status }),
      ...(watchedSeconds !== undefined && { watchedSeconds }),
      ...(watchedPercent !== undefined && { watchedPercent }),
    },
    create: {
      userId: session.user.id,
      lessonId,
      status: status ?? "IN_PROGRESS",
      watchedSeconds,
      watchedPercent,
    },
  });

  if (status === "COMPLETE") {
    await recomputeEnrollmentCompletion(session.user.id, courseId);
  }

  revalidatePath(`/learner/courses/${courseId}`);
  revalidatePath(`/learner/courses/${courseId}/lessons/${lessonId}`);
  return { success: true };
}

// TRK-04: SCORM 1.2 CMI persistence. Only the CMI keys actually used by
// the API bridge are accepted/typed here (Epic 4 risk #2) - arbitrary
// content can't write unvalidated JSON into scormData. suspend_data is
// capped at 4096 chars per the SCORM 1.2 spec.
const scormProgressSchema = z.object({
  lessonId: z.string().min(1),
  lessonStatus: z.string().max(50).optional(),
  scoreRaw: z.string().max(20).optional(),
  scoreMin: z.string().max(20).optional(),
  scoreMax: z.string().max(20).optional(),
  lessonLocation: z.string().max(200).optional(),
  totalTime: z.string().max(50).optional(),
  suspendData: z.string().max(4096).optional(),
});

const SCORM_COMPLETE_STATUSES = ["completed", "passed"];

export async function updateScormProgress(input: {
  lessonId: string;
  lessonStatus?: string;
  scoreRaw?: string;
  scoreMin?: string;
  scoreMax?: string;
  lessonLocation?: string;
  totalTime?: string;
  suspendData?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: "Not authorized" };
  }

  const parsed = scormProgressSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { lessonId, ...cmi } = parsed.data;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { section: true },
  });
  if (!lesson) {
    return { error: "Lesson not found" };
  }
  const courseId = lesson.section.courseId;

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId } },
  });
  if (!enrollment) {
    return { error: "You do not have access to this lesson" };
  }

  const existing = await prisma.progress.findUnique({
    where: { userId_lessonId: { userId: session.user.id, lessonId } },
  });
  const existingScormData = (existing?.scormData as Record<string, string> | null) ?? {};

  // Map SCORM lesson_status (completed/passed) -> Progress.status = COMPLETE.
  const status = cmi.lessonStatus && SCORM_COMPLETE_STATUSES.includes(cmi.lessonStatus)
    ? "COMPLETE"
    : existing?.status ?? "IN_PROGRESS";

  await prisma.progress.upsert({
    where: { userId_lessonId: { userId: session.user.id, lessonId } },
    update: { scormData: { ...existingScormData, ...cmi }, status },
    create: { userId: session.user.id, lessonId, scormData: cmi, status },
  });

  if (status === "COMPLETE") {
    await recomputeEnrollmentCompletion(session.user.id, courseId);
  }

  revalidatePath(`/learner/courses/${courseId}`);
  revalidatePath(`/learner/courses/${courseId}/lessons/${lessonId}`);
  return { success: true };
}

// ─── Progress visibility (TRK-07, TRK-08) ───────────────────────────────────
// Minimal read-only views - richer reporting (charts, CSV export) is Epic 7.
// Just prove the data is queryable and correctly scoped here.

// Org Admin: per-learner progress for their own org only. Never trust a
// client-supplied orgId - scoped strictly to session.user.organizationId.
export async function getOrgProgress() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ORG_ADMIN" || !session.user.organizationId) {
    throw new Error("Not authorized");
  }
  const organizationId = session.user.organizationId;

  const enrollments = await prisma.enrollment.findMany({
    where: { user: { organizationId } },
    include: { user: { select: { id: true, name: true, email: true } }, course: true },
    orderBy: { enrolledAt: "desc" },
  });

  return Promise.all(
    enrollments.map(async (e) => ({
      ...e,
      progressPercent: await courseProgressPercent(e.userId, e.courseId),
    }))
  );
}

// Owner: progress across all orgs and individuals.
export async function getAllProgress() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") {
    throw new Error("Not authorized");
  }

  const enrollments = await prisma.enrollment.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, organization: { select: { name: true } } } },
      course: true,
    },
    orderBy: { enrolledAt: "desc" },
  });

  return Promise.all(
    enrollments.map(async (e) => ({
      ...e,
      progressPercent: await courseProgressPercent(e.userId, e.courseId),
    }))
  );
}
