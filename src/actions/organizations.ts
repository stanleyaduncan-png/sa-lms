"use server";

// Organization CRUD + Org Admin assignment (ACC-01, ACC-02, ACC-03).
// Owner-only - every mutation here re-checks session.user.role === "OWNER"
// server-side, since middleware is only the routing-layer first line of
// defense (see README "Important convention").

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

const orgSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  seatLimit: z.number().int().min(1, "Seat limit must be at least 1"),
});

export async function createOrganization(name: string, seatLimit: number) {
  await requireOwner();

  const parsed = orgSchema.safeParse({ name, seatLimit });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await prisma.organization.create({ data: parsed.data });
  revalidatePath("/owner/organizations");
  return { success: true };
}

export async function updateOrganization(id: string, name: string, seatLimit: number) {
  await requireOwner();

  const parsed = orgSchema.safeParse({ name, seatLimit });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await prisma.organization.update({ where: { id }, data: parsed.data });
  revalidatePath("/owner/organizations");
  return { success: true };
}

export async function deactivateOrganization(id: string) {
  await requireOwner();

  await prisma.organization.update({ where: { id }, data: { isActive: false } });
  revalidatePath("/owner/organizations");
  return { success: true };
}

export async function assignOrgAdmin(orgId: string, email: string) {
  await requireOwner();

  const parsed = z.string().trim().email("Enter a valid email address").safeParse(email);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data } });
  if (!user) {
    return { error: "No user found with that email" };
  }
  if (user.role === "OWNER") {
    return { error: "Cannot assign the Owner as an Org Admin" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      role: "ORG_ADMIN",
      adminOfOrganizations: { connect: { id: orgId } },
    },
  });

  revalidatePath("/owner/organizations");
  return { success: true };
}

export async function getOrganizationsWithUsage() {
  await requireOwner();

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      admins: { select: { id: true, name: true, email: true } },
    },
  });

  return Promise.all(
    orgs.map(async (org) => {
      const [learnerCount, pendingInviteCount] = await Promise.all([
        prisma.user.count({ where: { organizationId: org.id } }),
        prisma.invitation.count({ where: { organizationId: org.id, status: "PENDING" } }),
      ]);
      return {
        ...org,
        seatsUsed: learnerCount + pendingInviteCount,
      };
    })
  );
}
