"use server";

// Cross-cutting reporting (Epic 7). Read-only over data Epics 2/4/6
// already produce - no new models here.
//
// Cross-org leakage is THE risk of this epic (risk #1): every Org Admin
// query below filters by session.user.organizationId, never a
// client-supplied org id. Owner-only functions intentionally have no such
// filter - that's the one place "see everything" is correct.
//
// "Complete" reuses Epic 5's single source of truth - Enrollment.completedAt
// - rather than reimplementing a rate calculation that could drift from
// what actually gates a certificate (risk #5).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrganizationsWithUsage } from "@/actions/organizations";
import { courseProgressPercent } from "@/actions/enrollments";
import { getOrgCertificates } from "@/actions/certificates";
import { toCsv } from "@/lib/csv";

async function requireOwner() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") {
    throw new Error("Not authorized");
  }
  return session;
}

function completionRate(completed: number, total: number) {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

// ─── Owner: cross-org reporting ─────────────────────────────────────────────

export async function getOwnerOrgSummaries() {
  await requireOwner();

  const orgs = await getOrganizationsWithUsage();

  return Promise.all(
    orgs.map(async (org) => {
      const [learnerCount, totalEnrollments, completedEnrollments] = await Promise.all([
        prisma.user.count({ where: { organizationId: org.id, role: "LEARNER" } }),
        prisma.enrollment.count({ where: { user: { organizationId: org.id } } }),
        prisma.enrollment.count({
          where: { user: { organizationId: org.id }, completedAt: { not: null } },
        }),
      ]);
      return {
        id: org.id,
        name: org.name,
        isActive: org.isActive,
        seatLimit: org.seatLimit,
        seatsUsed: org.seatsUsed,
        learnerCount,
        totalEnrollments,
        completedEnrollments,
        completionRate: completionRate(completedEnrollments, totalEnrollments),
      };
    })
  );
}

export async function getOwnerCourseSummaries() {
  await requireOwner();

  const courses = await prisma.course.findMany({ orderBy: { createdAt: "desc" } });

  return Promise.all(
    courses.map(async (course) => {
      const [totalEnrollments, completedEnrollments, scoreAgg] = await Promise.all([
        prisma.enrollment.count({ where: { courseId: course.id } }),
        prisma.enrollment.count({ where: { courseId: course.id, completedAt: { not: null } } }),
        prisma.quizAttempt.aggregate({
          where: { quiz: { lesson: { section: { courseId: course.id } } } },
          _avg: { score: true },
        }),
      ]);
      return {
        id: course.id,
        title: course.title,
        status: course.status,
        totalEnrollments,
        completedEnrollments,
        completionRate: completionRate(completedEnrollments, totalEnrollments),
        averageQuizScore: scoreAgg._avg.score !== null ? Math.round(scoreAgg._avg.score) : null,
      };
    })
  );
}

export async function getOwnerIndividualLearnersSummary() {
  await requireOwner();

  const learners = await prisma.user.findMany({
    where: { role: "LEARNER", organizationId: null },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    learners.map(async (learner) => {
      const [totalEnrollments, completedEnrollments] = await Promise.all([
        prisma.enrollment.count({ where: { userId: learner.id } }),
        prisma.enrollment.count({ where: { userId: learner.id, completedAt: { not: null } } }),
      ]);
      return {
        id: learner.id,
        name: learner.name,
        email: learner.email,
        totalEnrollments,
        completedEnrollments,
        completionRate: completionRate(completedEnrollments, totalEnrollments),
      };
    })
  );
}

// ─── Org Admin: own-org-only reporting ──────────────────────────────────────

async function requireOrgAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ORG_ADMIN" || !session.user.organizationId) {
    throw new Error("Not authorized");
  }
  return session;
}

export async function getOrgAdminRoster() {
  const session = await requireOrgAdmin();
  const organizationId = session.user.organizationId as string;

  const learners = await prisma.user.findMany({
    where: { organizationId, role: "LEARNER" },
    orderBy: { name: "asc" },
  });

  return Promise.all(
    learners.map(async (learner) => {
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: learner.id },
        include: { course: { select: { title: true } } },
      });
      const enrollmentsWithProgress = await Promise.all(
        enrollments.map(async (e) => ({
          courseTitle: e.course.title,
          progressPercent: await courseProgressPercent(learner.id, e.courseId),
          completedAt: e.completedAt,
        }))
      );
      return {
        id: learner.id,
        name: learner.name,
        email: learner.email,
        enrollments: enrollmentsWithProgress,
      };
    })
  );
}

export async function getOrgAdminCourseSummary() {
  const session = await requireOrgAdmin();
  const organizationId = session.user.organizationId as string;

  const enrollments = await prisma.enrollment.findMany({
    where: { user: { organizationId } },
    select: { courseId: true },
    distinct: ["courseId"],
  });

  return Promise.all(
    enrollments.map(async ({ courseId }) => {
      const course = await prisma.course.findUniqueOrThrow({ where: { id: courseId } });
      const [totalEnrollments, completedEnrollments] = await Promise.all([
        prisma.enrollment.count({ where: { courseId, user: { organizationId } } }),
        prisma.enrollment.count({
          where: { courseId, user: { organizationId }, completedAt: { not: null } },
        }),
      ]);
      return {
        id: course.id,
        title: course.title,
        totalEnrollments,
        completedEnrollments,
        completionRate: completionRate(completedEnrollments, totalEnrollments),
      };
    })
  );
}

// ─── CSV export ──────────────────────────────────────────────────────────
// Every export reuses the same scoped read functions the on-screen report
// uses - the export can't diverge from (or leak beyond) what's rendered.

export async function exportOwnerReportCsv() {
  await requireOwner();

  const [orgs, courses, individuals] = await Promise.all([
    getOwnerOrgSummaries(),
    getOwnerCourseSummaries(),
    getOwnerIndividualLearnersSummary(),
  ]);

  const rows: (string | number)[][] = [];
  rows.push(["Organizations"]);
  rows.push(["Organization", "Status", "Seats Used", "Seat Limit", "Learners", "Enrollments", "Completed", "Completion Rate %"]);
  for (const org of orgs) {
    rows.push([org.name, org.isActive ? "Active" : "Deactivated", org.seatsUsed, org.seatLimit, org.learnerCount, org.totalEnrollments, org.completedEnrollments, org.completionRate]);
  }
  rows.push([]);
  rows.push(["Courses"]);
  rows.push(["Course", "Status", "Enrollments", "Completed", "Completion Rate %", "Avg Quiz Score %"]);
  for (const course of courses) {
    rows.push([course.title, course.status, course.totalEnrollments, course.completedEnrollments, course.completionRate, course.averageQuizScore ?? ""]);
  }
  rows.push([]);
  rows.push(["Individual Learners"]);
  rows.push(["Learner", "Email", "Enrollments", "Completed", "Completion Rate %"]);
  for (const learner of individuals) {
    rows.push([learner.name ?? "", learner.email, learner.totalEnrollments, learner.completedEnrollments, learner.completionRate]);
  }

  return { csv: toCsv(rows) };
}

export async function exportOrgAdminReportCsv() {
  await requireOrgAdmin();

  const [roster, courseSummary, certificates] = await Promise.all([
    getOrgAdminRoster(),
    getOrgAdminCourseSummary(),
    getOrgCertificates(),
  ]);

  const rows: (string | number)[][] = [];
  rows.push(["Learner Roster"]);
  rows.push(["Learner", "Email", "Course", "Progress %", "Completed"]);
  for (const learner of roster) {
    if (learner.enrollments.length === 0) {
      rows.push([learner.name ?? "", learner.email, "", "", ""]);
      continue;
    }
    for (const e of learner.enrollments) {
      rows.push([
        learner.name ?? "",
        learner.email,
        e.courseTitle,
        e.progressPercent,
        e.completedAt ? new Date(e.completedAt).toLocaleDateString() : "",
      ]);
    }
  }
  rows.push([]);
  rows.push(["Course Completion"]);
  rows.push(["Course", "Enrollments", "Completed", "Completion Rate %"]);
  for (const course of courseSummary) {
    rows.push([course.title, course.totalEnrollments, course.completedEnrollments, course.completionRate]);
  }
  rows.push([]);
  rows.push(["Certificates"]);
  rows.push(["Learner", "Email", "Course", "Issued"]);
  for (const cert of certificates) {
    rows.push([cert.user.name ?? "", cert.user.email, cert.course.title, new Date(cert.issuedAt).toLocaleDateString()]);
  }

  return { csv: toCsv(rows) };
}
