"use server";

// Course CRUD (CRS-01, CRS-08). Owner-only - every mutation re-checks
// session.user.role === "OWNER" server-side; middleware is only the
// routing-layer first line of defense (see README "Important convention").

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

const courseStatusValues = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

const createCourseSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
  thumbnailUrl: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
});

export async function createCourse(input: {
  title: string;
  description?: string;
  thumbnailUrl?: string;
}) {
  await requireOwner();

  const parsed = createCourseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { title, description, thumbnailUrl } = parsed.data;
  await prisma.course.create({
    data: {
      title,
      description: description || null,
      thumbnailUrl: thumbnailUrl || null,
      status: "DRAFT",
    },
  });

  revalidatePath("/owner/courses");
  return { success: true };
}

const updateCourseSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
  thumbnailUrl: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
  status: z.enum(courseStatusValues, { message: "Invalid course status" }),
});

export async function updateCourse(
  id: string,
  input: { title: string; description?: string; thumbnailUrl?: string; status: string }
) {
  await requireOwner();

  const parsed = updateCourseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { title, description, thumbnailUrl, status } = parsed.data;
  await prisma.course.update({
    where: { id },
    data: { title, description: description || null, thumbnailUrl: thumbnailUrl || null, status },
  });

  revalidatePath("/owner/courses");
  revalidatePath(`/owner/courses/${id}`);
  return { success: true };
}

export async function archiveCourse(id: string) {
  await requireOwner();

  await prisma.course.update({ where: { id }, data: { status: "ARCHIVED" } });

  revalidatePath("/owner/courses");
  revalidatePath(`/owner/courses/${id}`);
  return { success: true };
}

export async function getCourses() {
  await requireOwner();

  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { sections: true } } },
  });

  return courses;
}

export async function getCourse(id: string) {
  await requireOwner();

  return prisma.course.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: { quiz: { include: { questions: { orderBy: { order: "asc" } } } } },
          },
        },
      },
    },
  });
}
