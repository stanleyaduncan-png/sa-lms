"use client";

// Learner: quiz-taking (REV-03, REV-04). Questions arrive pre-stripped of
// isCorrect (see quizzes.ts getQuizForLearner) - this component never sees
// the answer key, only submits selections for server-side scoring.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitQuizAttempt } from "@/actions/quizAttempts";
import StatusBadge from "@/components/StatusBadge";
import { btnPrimary, errorText, card, sectionHeading } from "@/lib/ui";

type LearnerQuestion = {
  id: string;
  text: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
  options: { id: string; text: string }[];
};

type LearnerQuiz = {
  id: string;
  passThreshold: number;
  maxAttempts: number | null;
  questions: LearnerQuestion[];
};

export default function QuizPlayer({
  quiz,
  attemptCount,
  attemptsRemaining,
}: {
  quiz: LearnerQuiz;
  attemptCount: number;
  attemptsRemaining: number | null;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  const exhausted = attemptsRemaining !== null && attemptsRemaining <= 0;

  function selectSingle(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: [optionId] }));
  }

  function toggleMulti(questionId: string, optionId: string) {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: next };
    });
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const res = await submitQuizAttempt({ quizId: quiz.id, answers });
    setSubmitting(false);
    if (res && "error" in res) {
      setError(String(res.error));
      return;
    }
    setResult({ score: res.score, passed: res.passed });
    router.refresh();
  }

  function handleRetake() {
    setResult(null);
    setAnswers({});
  }

  return (
    <div className={`${card} mt-8`}>
      <h2 className={sectionHeading}>Quiz</h2>
      <p className="text-sm text-navy-700">
        Pass threshold: {quiz.passThreshold}%
        {quiz.maxAttempts && ` · ${attemptCount} of ${quiz.maxAttempts} attempts used`}
      </p>
      {error && <p className={`${errorText} mt-2`}>{error}</p>}

      {result ? (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <StatusBadge kind={result.passed ? "complete" : "failed"} label={`Score: ${Math.round(result.score)}% — ${result.passed ? "PASSED" : "FAILED"}`} />
          </div>
          {!result.passed && !exhausted && (
            <button onClick={handleRetake} className={`${btnPrimary} mt-3`}>Retake quiz</button>
          )}
          {!result.passed && exhausted && <p className="mt-3 text-navy-700">No attempts remaining.</p>}
        </div>
      ) : exhausted ? (
        <p className="mt-3 text-navy-700">You have used all {quiz.maxAttempts} attempt(s) for this quiz.</p>
      ) : (
        <div className="mt-3">
          {quiz.questions.map((q) => (
            <div key={q.id} className="mb-4">
              <p className="font-semibold text-navy-900">{q.text}</p>
              {q.options.map((opt) => (
                <label key={opt.id} className="mt-1 flex items-center gap-2 text-sm text-navy-900">
                  <input
                    type={q.type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"}
                    name={q.id}
                    checked={(answers[q.id] ?? []).includes(opt.id)}
                    onChange={() =>
                      q.type === "MULTIPLE_CHOICE" ? toggleMulti(q.id, opt.id) : selectSingle(q.id, opt.id)
                    }
                    className="accent-gold-500"
                  />
                  {opt.text}
                </label>
              ))}
            </div>
          ))}
          <button onClick={handleSubmit} disabled={submitting} className={btnPrimary}>
            {submitting ? "Submitting..." : "Submit Quiz"}
          </button>
        </div>
      )}
    </div>
  );
}
