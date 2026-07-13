"use server";

// Course-to-org assignment (ACC-02 partial). Owner-only - every mutation
// re-checks session.user.role === "OWNER" server-side; middleware is only
// the routing-layer first line of defense (see README "Important
// convention").
//
// Grant-before-publish must be enforced here, not just by hiding a UI
// button - a DRAFT course granted to an org would leak unfinished content.

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

export async function grantCourseToOrg(courseId: string, organizationId: string) {
  await requireOwner();

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    return { error: "Course not found" };
  }
  if (course.status !== "PUBLISHED") {
    return { error: "Only published courses can be granted to an organization" };
  }

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) {
    return { error: "Organization not found" };
  }

  const existing = await prisma.courseGrant.findUnique({
    where: { courseId_organizationId: { courseId, organizationId } },
  });
  if (existing) {
    return { error: "This course is already granted to that organization" };
  }

  await prisma.courseGrant.create({ data: { courseId, organizationId } });

  revalidatePath(`/owner/courses/${courseId}/grants`);
  return { success: true };
}

export async function revokeCourseFromOrg(courseId: string, organizationId: string) {
  await requireOwner();

  await prisma.courseGrant.delete({
    where: { courseId_organizationId: { courseId, organizationId } },
  });

  revalidatePath(`/owner/courses/${courseId}/grants`);
  return { success: true };
}

export async function getGrantsForCourse(courseId: string) {
  await requireOwner();

  return prisma.courseGrant.findMany({
    where: { courseId },
    include: { organization: { select: { id: true, name: true, isActive: true } } },
    orderBy: { grantedAt: "desc" },
  });
}

export async function getActiveOrganizations() {
  await requireOwner();

  return prisma.organization.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
