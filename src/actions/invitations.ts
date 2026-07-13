"use server";

// Invitation flow (ACC-06, ACC-07, ACC-08, ACC-09).
//
// RBAC note: sendInvitation/resendInvitation/revokeInvitation re-check
// session.user.role AND, for Org Admins, that the invitation's
// organizationId matches session.user.organizationId. Middleware only
// guards routes, not data - this is what makes ACC-05 (org data isolation)
// actually true rather than assumed (see README "Important convention").

import crypto from "crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInvitationEmail } from "@/lib/mail";

function expiryDate() {
  const days = Number(process.env.INVITATION_EXPIRY_DAYS) || 14;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function inviteUrl(token: string) {
  return `${process.env.NEXTAUTH_URL}/invite/accept?token=${token}`;
}

function revalidateInvitationPaths() {
  revalidatePath("/owner/invitations");
  revalidatePath("/org-admin/invitations");
}

export async function getAllInvitations() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") {
    throw new Error("Not authorized");
  }

  return prisma.invitation.findMany({
    orderBy: { createdAt: "desc" },
    include: { organization: { select: { id: true, name: true } } },
  });
}

export async function getOrgInvitations() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ORG_ADMIN" || !session.user.organizationId) {
    throw new Error("Not authorized");
  }

  const organizationId = session.user.organizationId;

  const [invitations, org, learnerCount] = await Promise.all([
    prisma.invitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
    prisma.user.count({ where: { organizationId } }),
  ]);

  const pendingInviteCount = invitations.filter((i) => i.status === "PENDING").length;

  return {
    invitations,
    organization: org,
    seatsUsed: learnerCount + pendingInviteCount,
  };
}

const sendInvitationSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  organizationId: z.string().nullish(),
  courseIds: z.array(z.string()).default([]),
});

export async function sendInvitation(input: {
  email: string;
  organizationId?: string | null;
  courseIds?: string[];
}) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "ORG_ADMIN")) {
    return { error: "Not authorized" };
  }

  const parsed = sendInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { email, courseIds } = parsed.data;
  let { organizationId } = parsed.data;

  if (session.user.role === "ORG_ADMIN") {
    // Org Admins can only ever invite into their own org (ACC-05) -
    // never trust a client-supplied organizationId for this role.
    organizationId = session.user.organizationId;
    if (!organizationId) {
      return { error: "Your account is not linked to an organization" };
    }
  }

  if (organizationId) {
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) {
      return { error: "Organization not found" };
    }
    if (!org.isActive) {
      return { error: "This organization is deactivated" };
    }

    const [learnerCount, pendingInviteCount] = await Promise.all([
      prisma.user.count({ where: { organizationId } }),
      prisma.invitation.count({ where: { organizationId, status: "PENDING" } }),
    ]);
    if (learnerCount + pendingInviteCount >= org.seatLimit) {
      return { error: "Seat limit reached for this organization" };
    }
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "A user with this email already exists" };
  }

  const token = crypto.randomUUID();
  const invitation = await prisma.invitation.create({
    data: {
      email,
      token,
      expiresAt: expiryDate(),
      status: "PENDING",
      invitedById: session.user.id,
      organizationId: organizationId ?? null,
      courseIds,
    },
  });

  await sendInvitationEmail(email, inviteUrl(token));
  revalidateInvitationPaths();
  return { success: true, invitationId: invitation.id };
}

async function authorizeInvitationAccess(invitationId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "ORG_ADMIN")) {
    return { error: "Not authorized" as const };
  }

  const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } });
  if (!invitation) {
    return { error: "Invitation not found" as const };
  }

  if (session.user.role === "ORG_ADMIN") {
    if (!invitation.organizationId || invitation.organizationId !== session.user.organizationId) {
      return { error: "Not authorized" as const };
    }
  }

  return { invitation };
}

export async function resendInvitation(invitationId: string) {
  const result = await authorizeInvitationAccess(invitationId);
  if ("error" in result) return result;

  const token = crypto.randomUUID();
  const updated = await prisma.invitation.update({
    where: { id: invitationId },
    data: { token, expiresAt: expiryDate(), status: "PENDING" },
  });

  await sendInvitationEmail(updated.email, inviteUrl(token));
  revalidateInvitationPaths();
  return { success: true };
}

export async function revokeInvitation(invitationId: string) {
  const result = await authorizeInvitationAccess(invitationId);
  if ("error" in result) return result;

  await prisma.invitation.update({
    where: { id: invitationId },
    data: { status: "REVOKED" },
  });

  revalidateInvitationPaths();
  return { success: true };
}

// ─── Invitation acceptance (public, unauthenticated) ───────────────────────

type InvitationStatusResult =
  | { status: "not_found" }
  | { status: "invalid" }
  | { status: "expired" }
  | { status: "valid"; email: string };

export async function getInvitationStatus(token: string): Promise<InvitationStatusResult> {
  const invitation = await prisma.invitation.findUnique({ where: { token } });
  if (!invitation) {
    return { status: "not_found" };
  }

  if (invitation.status === "REVOKED" || invitation.status === "ACCEPTED") {
    return { status: "invalid" };
  }

  if (invitation.status === "EXPIRED") {
    return { status: "expired" };
  }

  // status === "PENDING" - check expiry lazily on access.
  if (invitation.expiresAt.getTime() < Date.now()) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    return { status: "expired" };
  }

  return { status: "valid", email: invitation.email };
}

const acceptInvitationSchema = z
  .object({
    token: z.string().min(1),
    name: z.string().trim().min(1, "Name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function acceptInvitation(input: {
  token: string;
  name: string;
  password: string;
  confirmPassword: string;
}) {
  const parsed = acceptInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { token, name, password } = parsed.data;

  const invitation = await prisma.invitation.findUnique({ where: { token } });
  if (
    !invitation ||
    invitation.status !== "PENDING" ||
    invitation.expiresAt.getTime() < Date.now()
  ) {
    return { error: "This invitation link is invalid or has expired" };
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } });
  if (existingUser) {
    return { error: "An account with this email already exists" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: invitation.email,
      name,
      passwordHash,
      role: "LEARNER",
      organizationId: invitation.organizationId,
    },
  });

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: "ACCEPTED", invitedUserId: user.id },
  });

  revalidateInvitationPaths();
  return { success: true, email: user.email };
}
