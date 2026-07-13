"use server";

// Quiz-taking (REV-03, REV-04). Never trust a client-submitted score
// (Epic 5 risk #1) - every attempt is scored here from the server-held
// QuizQuestion.options (including isCorrect), which never leaves the
// server for a learner-facing read (see quizzes.ts getQuizForLearner).

import { z } from "zod";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recomputeEnrollmentCompletion } from "@/actions/progress";

const submitSchema = z.object({
  quizId: z.string().min(1),
  answers: z.record(z.string(), z.array(z.string())),
});

type QuizOption = { id: string; text: string; isCorrect: boolean };

export async function submitQuizAttempt(input: { quizId: string; answers: Record<string, string[]> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: "Not authorized" };
  }

  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { quizId, answers } = parsed.data;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: true, lesson: { include: { section: true } } },
  });
  if (!quiz) {
    return { error: "Quiz not found" };
  }

  const courseId = quiz.lesson.section.courseId;
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId } },
  });
  if (!enrollment) {
    return { error: "You do not have access to this quiz" };
  }

  // maxAttempts race (Epic 5 risk #3): count + insert inside one
  // transaction to shrink the window for two rapid submissions both
  // passing the count check.
  type AttemptResult = { error: string } | { attempt: { score: number; passed: boolean } };
  const result: AttemptResult = await prisma.$transaction(async (tx): Promise<AttemptResult> => {
    if (quiz.maxAttempts) {
      const attemptCount = await tx.quizAttempt.count({
        where: { quizId, userId: session.user.id },
      });
      if (attemptCount >= quiz.maxAttempts) {
        return { error: `You have used all ${quiz.maxAttempts} attempt(s) for this quiz` };
      }
    }

    // MULTIPLE_CHOICE scoring rule (Epic 5 risk #5): all-or-nothing - the
    // selected set must exactly equal the correct set. Applies uniformly
    // to SINGLE_CHOICE/TRUE_FALSE too, where the correct set is size 1.
    let correctCount = 0;
    for (const question of quiz.questions) {
      const options = question.options as QuizOption[];
      const correctIds = new Set(options.filter((o) => o.isCorrect).map((o) => o.id));
      const selectedIds = new Set(answers[question.id] ?? []);
      const isExactMatch =
        correctIds.size === selectedIds.size && [...correctIds].every((id) => selectedIds.has(id));
      if (isExactMatch) correctCount++;
    }
    const score = quiz.questions.length > 0 ? (correctCount / quiz.questions.length) * 100 : 0;
    const passed = score >= quiz.passThreshold;

    const attempt = await tx.quizAttempt.create({
      data: { quizId, userId: session.user.id, score, passed, answers },
    });

    return { attempt };
  });

  if ("error" in result) {
    return result;
  }

  // Passing a quiz can be the last missing piece for course completion
  // (REV-06) - recompute regardless of whether this attempt itself passed,
  // since recomputeEnrollmentCompletion no-ops unless every gate is met.
  if (result.attempt.passed) {
    await recomputeEnrollmentCompletion(session.user.id, courseId);
  }

  revalidatePath(`/learner/courses/${courseId}`);
  revalidatePath(`/learner/courses/${courseId}/lessons/${quiz.lessonId}`);
  return { success: true, score: result.attempt.score, passed: result.attempt.passed };
}

export async function getMyQuizAttempts(quizId: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Not authorized");
  }

  return prisma.quizAttempt.findMany({
    where: { quizId, userId: session.user.id },
    orderBy: { attemptedAt: "desc" },
  });
}
