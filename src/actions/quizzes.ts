"use server";

// Quiz authoring (REV-01, REV-02). Owner-only - every mutation re-checks
// session.user.role === "OWNER" server-side; middleware is only the
// routing-layer first line of defense (see README "Important convention").
//
// Answer-key exposure (Epic 5 risk #2): QuizQuestion.options carries
// isCorrect flags. getQuizForLearner strips them before the questions ever
// reach a learner's browser - getQuizForOwner (used by the authoring UI)
// is the only read that returns the full options including isCorrect.
//
// SCORM/native double-counting (Epic 5 risk #6): a SCORM lesson's
// assessment is the SCORM result. createQuiz rejects attaching a native
// quiz to a SCORM lesson so there's never two assessment sources for one
// lesson.

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

async function courseIdForLesson(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { section: true },
  });
  return lesson?.section.courseId;
}

async function courseIdForQuiz(quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { lesson: { include: { section: true } } },
  });
  return quiz?.lesson.section.courseId;
}

const createQuizSchema = z.object({
  passThreshold: z.number().int().min(1).max(100),
  maxAttempts: z.number().int().min(1).optional(),
});

export async function createQuiz(
  lessonId: string,
  input: { passThreshold: number; maxAttempts?: number }
) {
  await requireOwner();

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    return { error: "Lesson not found" };
  }
  if (lesson.contentType === "SCORM") {
    return { error: "SCORM lessons report their own pass/fail - a native quiz can't also be attached" };
  }

  const existing = await prisma.quiz.findUnique({ where: { lessonId } });
  if (existing) {
    return { error: "This lesson already has a quiz" };
  }

  const parsed = createQuizSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await prisma.quiz.create({
    data: { lessonId, passThreshold: parsed.data.passThreshold, maxAttempts: parsed.data.maxAttempts },
  });

  const courseId = await courseIdForLesson(lessonId);
  if (courseId) revalidatePath(`/owner/courses/${courseId}`);
  return { success: true };
}

const questionTypeValues = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"] as const;

const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().min(1),
  isCorrect: z.boolean(),
});

const questionSchema = z.object({
  text: z.string().trim().min(1, "Question text is required"),
  type: z.enum(questionTypeValues, { message: "Invalid question type" }),
  options: z.array(optionSchema).min(2, "At least 2 options are required"),
  order: z.number().int().min(0),
});

export async function addQuestion(
  quizId: string,
  input: { text: string; type: string; options: { id: string; text: string; isCorrect: boolean }[]; order: number }
) {
  await requireOwner();

  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  if (!parsed.data.options.some((o) => o.isCorrect)) {
    return { error: "At least one option must be marked correct" };
  }

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) {
    return { error: "Quiz not found" };
  }

  await prisma.quizQuestion.create({
    data: {
      quizId,
      text: parsed.data.text,
      type: parsed.data.type,
      options: parsed.data.options,
      order: parsed.data.order,
    },
  });

  const courseId = await courseIdForQuiz(quizId);
  if (courseId) revalidatePath(`/owner/courses/${courseId}`);
  return { success: true };
}

export async function updateQuestion(
  id: string,
  input: { text: string; type: string; options: { id: string; text: string; isCorrect: boolean }[]; order: number }
) {
  await requireOwner();

  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  if (!parsed.data.options.some((o) => o.isCorrect)) {
    return { error: "At least one option must be marked correct" };
  }

  const question = await prisma.quizQuestion.update({
    where: { id },
    data: {
      text: parsed.data.text,
      type: parsed.data.type,
      options: parsed.data.options,
      order: parsed.data.order,
    },
  });

  const courseId = await courseIdForQuiz(question.quizId);
  if (courseId) revalidatePath(`/owner/courses/${courseId}`);
  return { success: true };
}

export async function deleteQuestion(id: string) {
  await requireOwner();

  const question = await prisma.quizQuestion.findUnique({ where: { id } });
  if (!question) {
    return { error: "Question not found" };
  }
  await prisma.quizQuestion.delete({ where: { id } });

  const courseId = await courseIdForQuiz(question.quizId);
  if (courseId) revalidatePath(`/owner/courses/${courseId}`);
  return { success: true };
}

export async function reorderQuestions(quizId: string, questionIds: string[]) {
  await requireOwner();

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { select: { id: true } } },
  });
  if (!quiz) {
    return { error: "Quiz not found" };
  }

  const currentIds = new Set(quiz.questions.map((q) => q.id));
  const incomingIds = new Set(questionIds);
  const sameSet =
    currentIds.size === incomingIds.size && [...currentIds].every((id) => incomingIds.has(id));
  if (!sameSet) {
    return { error: "Question list does not match this quiz's questions" };
  }

  await prisma.$transaction(
    questionIds.map((id, index) => prisma.quizQuestion.update({ where: { id }, data: { order: index } }))
  );

  const courseId = await courseIdForQuiz(quizId);
  if (courseId) revalidatePath(`/owner/courses/${courseId}`);
  return { success: true };
}

// Owner authoring view - includes isCorrect flags.
export async function getQuizForOwner(lessonId: string) {
  await requireOwner();

  return prisma.quiz.findUnique({
    where: { lessonId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
}

// Learner-safe projection - isCorrect is stripped from every option before
// this ever leaves the server (Epic 5 risk #2).
export async function getQuizForLearner(lessonId: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: "Not authorized" };
  }

  const quiz = await prisma.quiz.findUnique({
    where: { lessonId },
    include: {
      questions: { orderBy: { order: "asc" } },
      lesson: { include: { section: true } },
    },
  });
  if (!quiz) {
    return { error: "No quiz on this lesson" };
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId: quiz.lesson.section.courseId } },
  });
  if (!enrollment) {
    return { error: "You do not have access to this quiz" };
  }

  const attemptCount = await prisma.quizAttempt.count({
    where: { quizId: quiz.id, userId: session.user.id },
  });
  const attemptsRemaining = quiz.maxAttempts ? Math.max(0, quiz.maxAttempts - attemptCount) : null;

  return {
    quiz: {
      id: quiz.id,
      passThreshold: quiz.passThreshold,
      maxAttempts: quiz.maxAttempts,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: (q.options as { id: string; text: string }[]).map((o) => ({
          id: o.id,
          text: o.text,
        })),
      })),
    },
    attemptCount,
    attemptsRemaining,
  };
}
