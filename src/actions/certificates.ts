"use server";

// Certificate issuance (CERT-01, CERT-02) and access-scoped reads
// (CERT-03, CERT-04). A certificate is the product's proof-of-value
// (Epic 6 risk #2) - issueCertificate re-verifies Enrollment.completedAt
// itself from the DB on every call, regardless of caller, rather than
// trusting anything passed in. It is never imported into a client
// component; the only caller is recomputeEnrollmentCompletion in
// progress.ts, the single place Enrollment.completedAt is set (Epic 6
// risk #5).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function issueCertificate(userId: string, courseId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment || !enrollment.completedAt) {
    return { error: "Course is not complete for this user" };
  }

  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) {
    return { certificate: existing };
  }

  try {
    const certificate = await prisma.certificate.create({
      data: { userId, courseId, pdfUrl: "" },
    });
    // pdfUrl embeds the certificate's own id, so it's assigned after
    // creation - a route, not a stored file (see certificateTemplate.ts).
    return {
      certificate: await prisma.certificate.update({
        where: { id: certificate.id },
        data: { pdfUrl: `/api/certificates/${certificate.id}/pdf` },
      }),
    };
  } catch (e: unknown) {
    // Idempotency under races (Epic 6 risk #3): two completion events
    // firing together could both reach the create() above; rely on the
    // @@unique([userId, courseId]) constraint and return the winner
    // instead of erroring.
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") {
      const winner = await prisma.certificate.findUnique({
        where: { userId_courseId: { userId, courseId } },
      });
      if (winner) return { certificate: winner };
    }
    throw e;
  }
}

export async function getMyCertificates() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Not authorized");
  }

  return prisma.certificate.findMany({
    where: { userId: session.user.id },
    include: { course: { select: { title: true } } },
    orderBy: { issuedAt: "desc" },
  });
}

export async function getOrgCertificates() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ORG_ADMIN" || !session.user.organizationId) {
    throw new Error("Not authorized");
  }

  return prisma.certificate.findMany({
    where: { user: { organizationId: session.user.organizationId } },
    include: {
      course: { select: { title: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { issuedAt: "desc" },
  });
}

export async function getAllCertificates() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") {
    throw new Error("Not authorized");
  }

  return prisma.certificate.findMany({
    include: {
      course: { select: { title: true } },
      user: { select: { name: true, email: true, organization: { select: { name: true } } } },
    },
    orderBy: { issuedAt: "desc" },
  });
}

// Access-checked read backing the PDF download route - never serve a
// certificate by an unguarded ID (Epic 6 data-model note).
export async function getCertificateForDownload(certificateId: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: "Not authorized" };
  }

  const certificate = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: { user: true, course: true },
  });
  if (!certificate) {
    return { error: "Certificate not found" };
  }

  const isOwnCertificate = certificate.userId === session.user.id;
  const isOwner = session.user.role === "OWNER";
  const isOrgAdminForLearner =
    session.user.role === "ORG_ADMIN" &&
    session.user.organizationId !== null &&
    certificate.user.organizationId === session.user.organizationId;

  if (!isOwnCertificate && !isOwner && !isOrgAdminForLearner) {
    return { error: "Not authorized" };
  }

  return { certificate };
}
