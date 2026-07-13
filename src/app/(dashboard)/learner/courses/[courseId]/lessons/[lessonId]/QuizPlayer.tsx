"use client";

// Learner: quiz-taking (REV-03, REV-04). Questions arrive pre-stripped of
// isCorrect (see quizzes.ts getQuizForLearner) - this component never sees
// the answer key, only submits selections for server-side scoring.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitQuizAttempt } from "@/actions/quizAttempts";

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
    <div style={{ marginTop: "2rem", border: "1px solid #ccc", padding: "1rem" }}>
      <h2>Quiz</h2>
      <p>
        Pass threshold: {quiz.passThreshold}%
        {quiz.maxAttempts && ` · ${attemptCount} of ${quiz.maxAttempts} attempts used`}
      </p>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {result ? (
        <div>
          <p style={{ fontWeight: "bold", color: result.passed ? "green" : "red" }}>
            Score: {Math.round(result.score)}% — {result.passed ? "PASSED" : "FAILED"}
          </p>
          {!result.passed && !exhausted && <button onClick={handleRetake}>Retake quiz</button>}
          {!result.passed && exhausted && <p>No attempts remaining.</p>}
        </div>
      ) : exhausted ? (
        <p>You have used all {quiz.maxAttempts} attempt(s) for this quiz.</p>
      ) : (
        <div>
          {quiz.questions.map((q) => (
            <div key={q.id} style={{ marginBottom: "1rem" }}>
              <p style={{ fontWeight: "bold" }}>{q.text}</p>
              {q.options.map((opt) => (
                <label key={opt.id} style={{ display: "block" }}>
                  <input
                    type={q.type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"}
                    name={q.id}
                    checked={(answers[q.id] ?? []).includes(opt.id)}
                    onChange={() =>
                      q.type === "MULTIPLE_CHOICE" ? toggleMulti(q.id, opt.id) : selectSingle(q.id, opt.id)
                    }
                  />{" "}
                  {opt.text}
                </label>
              ))}
            </div>
          ))}
          <button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Quiz"}
          </button>
        </div>
      )}
    </div>
  );
}
