// Seeds test data for Foundation (AUTH-01/02), Access & Invitations
// (ACC-01/02/03), Course Authoring (CRS-*), and Tracking & Progress (TRK-*)
// epics.
// Run: npx prisma db seed

import { PrismaClient, LessonContentType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_PASSWORD = "ChangeMe123!";

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  const owner = await prisma.user.upsert({
    where: { email: "owner@lms.local" },
    update: {},
    create: {
      email: "owner@lms.local",
      name: "Platform Owner",
      passwordHash,
      role: "OWNER",
    },
  });
  console.log(`Seeded Owner account: ${owner.email} (${owner.id})`);

  // Organization.name has no unique constraint, so upsert-by-name isn't
  // available - find-then-create keeps this idempotent on reruns instead.
  let acmeCorp = await prisma.organization.findFirst({ where: { name: "Acme Corp" } });
  if (!acmeCorp) {
    acmeCorp = await prisma.organization.create({
      data: { name: "Acme Corp", seatLimit: 5 },
    });
  }
  console.log(`Seeded Organization: ${acmeCorp.name} (${acmeCorp.id})`);

  const orgAdmin = await prisma.user.upsert({
    where: { email: "orgadmin@lms.local" },
    update: {
      role: "ORG_ADMIN",
      adminOfOrganizations: { connect: { id: acmeCorp.id } },
    },
    create: {
      email: "orgadmin@lms.local",
      name: "Acme Org Admin",
      passwordHash,
      role: "ORG_ADMIN",
      adminOfOrganizations: { connect: { id: acmeCorp.id } },
    },
  });
  console.log(`Seeded Org Admin account: ${orgAdmin.email} (${orgAdmin.id})`);

  const learner = await prisma.user.upsert({
    where: { email: "learner@lms.local" },
    update: {},
    create: {
      email: "learner@lms.local",
      name: "Individual Learner",
      passwordHash,
      role: "LEARNER",
      organizationId: null,
    },
  });
  console.log(`Seeded Individual Learner account: ${learner.email} (${learner.id})`);

  // Course/Section have no unique constraint beyond id, so find-then-create
  // keeps this idempotent on reruns, same pattern as Organization above.
  let introCourse = await prisma.course.findFirst({ where: { title: "Intro to Safety" } });
  if (!introCourse) {
    introCourse = await prisma.course.create({
      data: { title: "Intro to Safety", status: "PUBLISHED" },
    });
  }
  console.log(`Seeded Course: ${introCourse.title} (${introCourse.id})`);

  async function ensureSection(courseId: string, title: string, order: number) {
    let section = await prisma.section.findFirst({ where: { courseId, title } });
    if (!section) {
      section = await prisma.section.create({ data: { courseId, title, order } });
    }
    return section;
  }

  async function ensureLesson(
    sectionId: string,
    data: { title: string; order: number; contentType: LessonContentType; contentUrl: string }
  ) {
    const lesson = await prisma.lesson.findFirst({ where: { sectionId, title: data.title } });
    if (!lesson) {
      await prisma.lesson.create({ data: { sectionId, ...data } });
    }
  }

  const module1 = await ensureSection(introCourse.id, "Module 1: Basics", 0);
  const module2 = await ensureSection(introCourse.id, "Module 2: Advanced", 1);

  await ensureLesson(module1.id, {
    title: "Safety Intro Video",
    order: 0,
    contentType: "VIDEO",
    contentUrl: "https://example.com/video1.mp4",
  });
  await ensureLesson(module1.id, {
    title: "Safety Handbook",
    order: 1,
    contentType: "DOCUMENT",
    contentUrl: "https://example.com/doc1.pdf",
  });
  await ensureLesson(module2.id, {
    title: "Advanced Safety Video",
    order: 0,
    contentType: "VIDEO",
    contentUrl: "https://example.com/video2.mp4",
  });
  // Epic 4 deviation: the SCORM lesson URL is same-origin
  // (/scorm-test-package/) rather than the external https://example.com
  // placeholder the Epic 3 spec used. SCORM content reaches window.parent.API
  // across the iframe boundary, which browsers block cross-origin - an
  // external URL would silently fail the handshake. Epic 3 deliberately
  // didn't build upload/unpack, so a same-origin static test package
  // (public/scorm-test-package/) stands in for it; see ScormPlayer.tsx.
  await ensureLesson(module2.id, {
    title: "Safety SCORM Module",
    order: 1,
    contentType: "SCORM",
    contentUrl: "/scorm-test-package/index.html",
  });
  console.log(`Seeded sections and lessons for "${introCourse.title}"`);

  const existingGrant = await prisma.courseGrant.findUnique({
    where: { courseId_organizationId: { courseId: introCourse.id, organizationId: acmeCorp.id } },
  });
  if (!existingGrant) {
    await prisma.courseGrant.create({
      data: { courseId: introCourse.id, organizationId: acmeCorp.id },
    });
  }
  console.log(`Granted "${introCourse.title}" to ${acmeCorp.name}`);

  // Epic 4: a seeded Acme-affiliated learner with enrollment + progress
  // data, so dashboards have something to show. (orgadmin@lms.local is an
  // ORG_ADMIN and doesn't hold a seat; learner@lms.local is an individual
  // with no org - neither is "the seeded Acme learner" the epic assumes,
  // so this account was added here to fill that gap.)
  const acmeLearner = await prisma.user.upsert({
    where: { email: "acmelearner@lms.local" },
    update: { organizationId: acmeCorp.id },
    create: {
      email: "acmelearner@lms.local",
      name: "Acme Learner",
      passwordHash,
      role: "LEARNER",
      organizationId: acmeCorp.id,
    },
  });
  console.log(`Seeded Acme Learner account: ${acmeLearner.email} (${acmeLearner.id})`);

  const existingEnrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: acmeLearner.id, courseId: introCourse.id } },
  });
  if (!existingEnrollment) {
    await prisma.enrollment.create({
      data: { userId: acmeLearner.id, courseId: introCourse.id, source: "ORG_ASSIGNED" },
    });
  }
  console.log(`Enrolled ${acmeLearner.email} in "${introCourse.title}"`);

  const introVideoLesson = await prisma.lesson.findFirst({
    where: { sectionId: module1.id, title: "Safety Intro Video" },
  });
  const advancedVideoLesson = await prisma.lesson.findFirst({
    where: { sectionId: module2.id, title: "Advanced Safety Video" },
  });

  if (introVideoLesson) {
    await prisma.progress.upsert({
      where: { userId_lessonId: { userId: acmeLearner.id, lessonId: introVideoLesson.id } },
      update: {},
      create: {
        userId: acmeLearner.id,
        lessonId: introVideoLesson.id,
        status: "COMPLETE",
        watchedSeconds: 120,
        watchedPercent: 100,
      },
    });
  }
  if (advancedVideoLesson) {
    await prisma.progress.upsert({
      where: { userId_lessonId: { userId: acmeLearner.id, lessonId: advancedVideoLesson.id } },
      update: {},
      create: {
        userId: acmeLearner.id,
        lessonId: advancedVideoLesson.id,
        status: "IN_PROGRESS",
        watchedSeconds: 45,
        watchedPercent: 40,
      },
    });
  }
  console.log(`Seeded progress rows for ${acmeLearner.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
