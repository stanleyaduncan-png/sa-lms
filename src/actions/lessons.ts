"use server";

// Section & Lesson structure (CRS-02, CRS-03, CRS-09). Owner-only - every
// mutation re-checks session.user.role === "OWNER" server-side; middleware
// is only the routing-layer first line of defense (see README "Important
// convention").

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

function revalidateCourse(courseId: string) {
  revalidatePath(`/owner/courses/${courseId}`);
}

// ─── Sections ────────────────────────────────────────────────────────────

const sectionSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  order: z.number().int().min(0),
});

export async function createSection(
  courseId: string,
  input: { title: string; order: number }
) {
  await requireOwner();

  const parsed = sectionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await prisma.section.create({
    data: { courseId, title: parsed.data.title, order: parsed.data.order },
  });

  revalidateCourse(courseId);
  return { success: true };
}

export async function updateSection(id: string, input: { title: string; order: number }) {
  await requireOwner();

  const parsed = sectionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const section = await prisma.section.update({
    where: { id },
    data: { title: parsed.data.title, order: parsed.data.order },
  });

  revalidateCourse(section.courseId);
  return { success: true };
}

export async function deleteSection(id: string) {
  await requireOwner();

  const section = await prisma.section.findUnique({
    where: { id },
    include: { _count: { select: { lessons: true } } },
  });
  if (!section) {
    return { error: "Section not found" };
  }
  if (section._count.lessons > 0) {
    return { error: "Cannot delete a section that still has lessons — remove them first" };
  }

  await prisma.section.delete({ where: { id } });

  revalidateCourse(section.courseId);
  return { success: true };
}

// ─── Lessons ─────────────────────────────────────────────────────────────

const lessonContentTypeValues = ["VIDEO", "DOCUMENT", "SCORM"] as const;

const lessonSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  order: z.number().int().min(0),
  contentType: z.enum(lessonContentTypeValues, { message: "Invalid content type" }),
  contentUrl: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
  requiresPriorLesson: z.boolean(),
});

export async function createLesson(
  sectionId: string,
  input: {
    title: string;
    order: number;
    contentType: string;
    contentUrl?: string;
    requiresPriorLesson: boolean;
  }
) {
  await requireOwner();

  const parsed = lessonSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) {
    return { error: "Section not found" };
  }

  const { title, order, contentType, contentUrl, requiresPriorLesson } = parsed.data;
  await prisma.lesson.create({
    data: {
      sectionId,
      title,
      order,
      contentType,
      contentUrl: contentUrl || null,
      requiresPriorLesson,
    },
  });

  revalidateCourse(section.courseId);
  return { success: true };
}

export async function updateLesson(
  id: string,
  input: {
    title: string;
    order: number;
    contentType: string;
    contentUrl?: string;
    requiresPriorLesson: boolean;
  }
) {
  await requireOwner();

  const parsed = lessonSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { title, order, contentType, contentUrl, requiresPriorLesson } = parsed.data;
  const lesson = await prisma.lesson.update({
    where: { id },
    data: { title, order, contentType, contentUrl: contentUrl || null, requiresPriorLesson },
    include: { section: true },
  });

  revalidateCourse(lesson.section.courseId);
  return { success: true };
}

export async function deleteLesson(id: string) {
  await requireOwner();

  const lesson = await prisma.lesson.findUnique({ where: { id }, include: { section: true } });
  if (!lesson) {
    return { error: "Lesson not found" };
  }

  await prisma.lesson.delete({ where: { id } });

  revalidateCourse(lesson.section.courseId);
  return { success: true };
}

export async function reorderLessons(sectionId: string, lessonIds: string[]) {
  await requireOwner();

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { lessons: { select: { id: true } } },
  });
  if (!section) {
    return { error: "Section not found" };
  }

  const currentIds = new Set(section.lessons.map((l) => l.id));
  const incomingIds = new Set(lessonIds);
  const sameSet =
    currentIds.size === incomingIds.size &&
    [...currentIds].every((id) => incomingIds.has(id));
  if (!sameSet) {
    return { error: "Lesson list does not match this section's lessons" };
  }

  await prisma.$transaction(
    lessonIds.map((id, index) =>
      prisma.lesson.update({ where: { id }, data: { order: index } })
    )
  );

  revalidateCourse(section.courseId);
  return { success: true };
}
