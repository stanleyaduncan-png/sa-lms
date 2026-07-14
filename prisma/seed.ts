// Seeds test data for Foundation (AUTH-01/02), Access & Invitations
// (ACC-01/02/03), Course Authoring (CRS-*), and Tracking & Progress (TRK-*)
// epics.
// Run: npx prisma db seed

import { PrismaClient, LessonContentType, QuestionType } from "@prisma/client";
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

  // Epic 5: a short quiz on the Safety Handbook lesson (a DOCUMENT lesson,
  // not SCORM - see quizzes.ts createQuiz for why SCORM can't carry a
  // native quiz), so Epic 6 has a gated completion to work with.
  const handbookLesson = await prisma.lesson.findFirst({
    where: { sectionId: module1.id, title: "Safety Handbook" },
  });
  if (handbookLesson) {
    let handbookQuiz = await prisma.quiz.findUnique({ where: { lessonId: handbookLesson.id } });
    if (!handbookQuiz) {
      handbookQuiz = await prisma.quiz.create({
        data: { lessonId: handbookLesson.id, passThreshold: 80 },
      });
    }

    async function ensureQuestion(
      quizId: string,
      data: {
        text: string;
        type: QuestionType;
        options: { id: string; text: string; isCorrect: boolean }[];
        order: number;
      }
    ) {
      const existing = await prisma.quizQuestion.findFirst({ where: { quizId, text: data.text } });
      if (!existing) {
        await prisma.quizQuestion.create({ data: { quizId, ...data } });
      }
    }

    await ensureQuestion(handbookQuiz.id, {
      text: "What should you do first if you notice a safety hazard?",
      type: "SINGLE_CHOICE",
      options: [
        { id: "report", text: "Report it immediately", isCorrect: true },
        { id: "ignore", text: "Ignore it", isCorrect: false },
      ],
      order: 0,
    });
    await ensureQuestion(handbookQuiz.id, {
      text: "All employees must complete safety training annually.",
      type: "TRUE_FALSE",
      options: [
        { id: "true", text: "True", isCorrect: true },
        { id: "false", text: "False", isCorrect: false },
      ],
      order: 1,
    });
    await ensureQuestion(handbookQuiz.id, {
      text: "Which of the following are examples of PPE?",
      type: "MULTIPLE_CHOICE",
      options: [
        { id: "glasses", text: "Safety glasses", isCorrect: true },
        { id: "gloves", text: "Gloves", isCorrect: true },
        { id: "sandals", text: "Sandals", isCorrect: false },
      ],
      order: 2,
    });
    console.log(`Seeded quiz (${handbookQuiz.passThreshold}% pass) on "${handbookLesson.title}"`);

    // Epic 6: a fully-completed learner so a Certificate exists on first
    // run for UI testing, without disturbing acmeLearner's partial-progress
    // demo data above (kept as one COMPLETE + one IN_PROGRESS on purpose).
    const certifiedLearner = await prisma.user.upsert({
      where: { email: "certifiedlearner@lms.local" },
      update: {},
      create: {
        email: "certifiedlearner@lms.local",
        name: "Certified Learner",
        passwordHash,
        role: "LEARNER",
        organizationId: null,
      },
    });
    console.log(`Seeded Certified Learner account: ${certifiedLearner.email} (${certifiedLearner.id})`);

    const allIntroLessons = await prisma.lesson.findMany({
      where: { section: { courseId: introCourse.id } },
    });
    for (const lesson of allIntroLessons) {
      await prisma.progress.upsert({
        where: { userId_lessonId: { userId: certifiedLearner.id, lessonId: lesson.id } },
        update: { status: "COMPLETE" },
        create: { userId: certifiedLearner.id, lessonId: lesson.id, status: "COMPLETE" },
      });
    }

    const existingAttempt = await prisma.quizAttempt.findFirst({
      where: { quizId: handbookQuiz.id, userId: certifiedLearner.id },
    });
    if (!existingAttempt) {
      await prisma.quizAttempt.create({
        data: {
          quizId: handbookQuiz.id,
          userId: certifiedLearner.id,
          score: 100,
          passed: true,
          answers: {
            [(await prisma.quizQuestion.findFirstOrThrow({ where: { quizId: handbookQuiz.id, order: 0 } })).id]: ["report"],
            [(await prisma.quizQuestion.findFirstOrThrow({ where: { quizId: handbookQuiz.id, order: 1 } })).id]: ["true"],
            [(await prisma.quizQuestion.findFirstOrThrow({ where: { quizId: handbookQuiz.id, order: 2 } })).id]: ["glasses", "gloves"],
          },
        },
      });
    }

    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: certifiedLearner.id, courseId: introCourse.id } },
      update: { completedAt: new Date() },
      create: {
        userId: certifiedLearner.id,
        courseId: introCourse.id,
        source: "INDIVIDUAL_ASSIGNED",
        completedAt: new Date(),
      },
    });
    console.log(`Enrolled + completed ${certifiedLearner.email} in "${introCourse.title}"`);

    const existingCertificate = await prisma.certificate.findUnique({
      where: { userId_courseId: { userId: certifiedLearner.id, courseId: introCourse.id } },
    });
    if (!existingCertificate) {
      const certificate = await prisma.certificate.create({
        data: { userId: certifiedLearner.id, courseId: introCourse.id, pdfUrl: "" },
      });
      await prisma.certificate.update({
        where: { id: certificate.id },
        data: { pdfUrl: `/api/certificates/${certificate.id}/pdf` },
      });
      console.log(`Issued certificate for ${certifiedLearner.email}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
