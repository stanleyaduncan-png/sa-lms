"use server";

// Enrollment (DB-02 traceability, ACC-02 completion via individual
// assignment). session.user.organizationId is the single source of truth
// for org-scoping (Epic 2 decision) - lazy auto-enrollment below trusts
// only the session's own organizationId, never a client-supplied one.

import { z } from "zod";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireOwner() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") {
    throw new Error("Not authorized");
  }
  return session;
}

const emailSchema = z.string().trim().email("Enter a valid email address");

export async function getCourseEnrollments(courseId: string) {
  await requireOwner();

  return prisma.enrollment.findMany({
    where: { courseId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { enrolledAt: "desc" },
  });
}

// Owner-only: assign a course directly to a standalone (non-org) learner.
export async function assignCourseToIndividual(courseId: string, email: string) {
  const session = await requireOwner();

  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    return { error: "Course not found" };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data } });
  if (!user) {
    return { error: "No user found with that email" };
  }
  if (user.role !== "LEARNER") {
    return { error: "Course assignment is only for learner accounts" };
  }

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
  });
  if (existing) {
    return { error: "This learner is already enrolled in this course" };
  }

  await prisma.enrollment.create({
    data: {
      userId: user.id,
      courseId,
      source: "INDIVIDUAL_ASSIGNED",
      assignedById: session.user.id,
    },
  });

  revalidatePath(`/owner/courses/${courseId}`);
  return { success: true };
}

// Lazy auto-enrollment (Epic 4 risk #5): creates an ORG_ASSIGNED enrollment
// the first time an org learner opens a course their org has been granted,
// instead of writing N rows synchronously at grant time.
export async function getOrEnrollInCourse(courseId: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: "Not authorized" };
  }
  const userId = session.user.id;

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) {
    return { enrollment: existing };
  }

  if (session.user.role === "LEARNER" && session.user.organizationId) {
    const grant = await prisma.courseGrant.findUnique({
      where: {
        courseId_organizationId: { courseId, organizationId: session.user.organizationId },
      },
    });
    if (grant) {
      const enrollment = await prisma.enrollment.create({
        data: { userId, courseId, source: "ORG_ASSIGNED" },
      });
      return { enrollment };
    }
  }

  return { error: "You do not have access to this course" };
}

export async function courseProgressPercent(userId: string, courseId: string) {
  const totalLessons = await prisma.lesson.count({
    where: { section: { courseId } },
  });
  if (totalLessons === 0) return 0;

  const completeCount = await prisma.progress.count({
    where: { userId, status: "COMPLETE", lesson: { section: { courseId } } },
  });
  return Math.round((completeCount / totalLessons) * 100);
}

// Learner catalog data - strictly scoped to the session user's own
// enrollments (never trust a client-supplied userId).
export async function getMyEnrollments() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Not authorized");
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: session.user.id },
    include: { course: true },
    orderBy: { enrolledAt: "desc" },
  });

  return Promise.all(
    enrollments.map(async (e) => ({
      ...e,
      progressPercent: await courseProgressPercent(session.user.id, e.courseId),
    }))
  );
}
