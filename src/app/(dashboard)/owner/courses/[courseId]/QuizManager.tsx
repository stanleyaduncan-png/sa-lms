"use client";

// Owner: quiz authoring per lesson (REV-01, REV-02). Rendered inline under
// each lesson in CourseDetailClient.

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createQuiz, addQuestion, updateQuestion, deleteQuestion } from "@/actions/quizzes";
import { getCourse } from "@/actions/courses";
import { btnPrimary, btnTertiary, btnDestructive, input, errorText, card } from "@/lib/ui";

type Course = NonNullable<Awaited<ReturnType<typeof getCourse>>>;
type Lesson = Course["sections"][number]["lessons"][number];
type Quiz = NonNullable<Lesson["quiz"]>;
type Question = Quiz["questions"][number];

const QUESTION_TYPES = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"] as const;
type QuestionType = (typeof QUESTION_TYPES)[number];
type Option = { id: string; text: string; isCorrect: boolean };

const selectClass = "rounded-md border border-navy-300 px-2 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500";
const smallInput = `${input} w-20`;

function defaultOptionsForType(type: QuestionType): Option[] {
  if (type === "TRUE_FALSE") {
    return [
      { id: "true", text: "True", isCorrect: true },
      { id: "false", text: "False", isCorrect: false },
    ];
  }
  return [
    { id: crypto.randomUUID(), text: "", isCorrect: false },
    { id: crypto.randomUUID(), text: "", isCorrect: false },
  ];
}

function emptyQuestionForm() {
  return { text: "", type: "SINGLE_CHOICE" as QuestionType, options: defaultOptionsForType("SINGLE_CHOICE") };
}

export default function QuizManager({ lesson }: { lesson: Lesson }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const [passThreshold, setPassThreshold] = useState("80");
  const [maxAttempts, setMaxAttempts] = useState("");

  const [questionForm, setQuestionForm] = useState(emptyQuestionForm());
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyQuestionForm());

  if (lesson.contentType === "SCORM") {
    return <p className="text-sm text-navy-500">SCORM lessons report their own pass/fail - no native quiz here.</p>;
  }

  async function handleCreateQuiz(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await createQuiz(lesson.id, {
      passThreshold: Number(passThreshold),
      maxAttempts: maxAttempts ? Number(maxAttempts) : undefined,
    });
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    router.refresh();
  }

  function setFormOptionText(
    form: typeof questionForm,
    setForm: (f: typeof questionForm) => void,
    optionId: string,
    text: string
  ) {
    setForm({ ...form, options: form.options.map((o) => (o.id === optionId ? { ...o, text } : o)) });
  }

  function setFormOptionCorrect(
    form: typeof questionForm,
    setForm: (f: typeof questionForm) => void,
    optionId: string
  ) {
    const singleAnswer = form.type !== "MULTIPLE_CHOICE";
    setForm({
      ...form,
      options: form.options.map((o) =>
        o.id === optionId
          ? { ...o, isCorrect: !o.isCorrect }
          : { ...o, isCorrect: singleAnswer ? false : o.isCorrect }
      ),
    });
  }

  async function handleAddQuestion(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!lesson.quiz) return;
    const result = await addQuestion(lesson.quiz.id, {
      text: questionForm.text,
      type: questionForm.type,
      options: questionForm.options,
      order: lesson.quiz.questions.length,
    });
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    setQuestionForm(emptyQuestionForm());
    router.refresh();
  }

  function startEditQuestion(q: Question) {
    setEditingQuestionId(q.id);
    setEditForm({
      text: q.text,
      type: q.type,
      options: q.options as Option[],
    });
  }

  async function handleUpdateQuestion(e: FormEvent, q: Question) {
    e.preventDefault();
    setError(null);
    const result = await updateQuestion(q.id, {
      text: editForm.text,
      type: editForm.type,
      options: editForm.options,
      order: q.order,
    });
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    setEditingQuestionId(null);
    router.refresh();
  }

  async function handleDeleteQuestion(id: string) {
    setError(null);
    if (!window.confirm("Delete this question?")) return;
    const result = await deleteQuestion(id);
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    router.refresh();
  }

  function OptionEditor({
    form,
    setForm,
  }: {
    form: typeof questionForm;
    setForm: (f: typeof questionForm) => void;
  }) {
    const inputType = form.type === "MULTIPLE_CHOICE" ? "checkbox" : "radio";
    return (
      <div className="flex flex-col gap-2">
        {form.options.map((opt) => (
          <div key={opt.id} className="flex items-center gap-2">
            <input
              type={inputType}
              checked={opt.isCorrect}
              onChange={() => setFormOptionCorrect(form, setForm, opt.id)}
              disabled={form.type === "TRUE_FALSE"}
            />
            <input
              value={opt.text}
              placeholder="Option text"
              disabled={form.type === "TRUE_FALSE"}
              onChange={(e) => setFormOptionText(form, setForm, opt.id, e.target.value)}
              className={input}
            />
            {form.type !== "TRUE_FALSE" && form.options.length > 2 && (
              <button
                type="button"
                onClick={() => setForm({ ...form, options: form.options.filter((o) => o.id !== opt.id) })}
                className={btnTertiary}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {form.type !== "TRUE_FALSE" && (
          <button
            type="button"
            onClick={() =>
              setForm({ ...form, options: [...form.options, { id: crypto.randomUUID(), text: "", isCorrect: false }] })
            }
            className={`${btnTertiary} self-start`}
          >
            Add option
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`${card} mt-2 bg-navy-50`}>
      {error && <p className={errorText}>{error}</p>}

      {!lesson.quiz ? (
        <form onSubmit={handleCreateQuiz} className="flex flex-wrap items-center gap-4">
          <label className="text-sm text-navy-700">
            Pass threshold %{" "}
            <input
              type="number"
              min={1}
              max={100}
              value={passThreshold}
              onChange={(e) => setPassThreshold(e.target.value)}
              className={smallInput}
            />
          </label>
          <label className="text-sm text-navy-700">
            Max attempts (optional){" "}
            <input
              type="number"
              min={1}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(e.target.value)}
              className={smallInput}
            />
          </label>
          <button type="submit" className={btnPrimary}>Create Quiz</button>
        </form>
      ) : (
        <div>
          <strong className="text-navy-900">
            Quiz — pass threshold {lesson.quiz.passThreshold}%
            {lesson.quiz.maxAttempts && `, max ${lesson.quiz.maxAttempts} attempts`}
          </strong>

          <ul className="mt-2 divide-y divide-navy-200">
            {lesson.quiz.questions.map((q) => (
              <li key={q.id} className="py-2">
                {editingQuestionId === q.id ? (
                  <form onSubmit={(e) => handleUpdateQuestion(e, q)} className="flex max-w-md flex-col gap-2">
                    <input value={editForm.text} onChange={(e) => setEditForm({ ...editForm, text: e.target.value })} className={input} />
                    <select
                      value={editForm.type}
                      onChange={(e) => {
                        const type = e.target.value as QuestionType;
                        setEditForm({ ...editForm, type, options: defaultOptionsForType(type) });
                      }}
                      className={selectClass}
                    >
                      {QUESTION_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <OptionEditor form={editForm} setForm={setEditForm} />
                    <div className="flex gap-2">
                      <button type="submit" className={btnPrimary}>Save</button>
                      <button type="button" onClick={() => setEditingQuestionId(null)} className={btnTertiary}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <strong className="text-navy-900">{q.text}</strong>{" "}
                    <span className="text-sm text-navy-600">[{q.type}]</span>
                    <ul className="ml-4 list-disc text-sm text-navy-700">
                      {(q.options as Option[]).map((o) => (
                        <li key={o.id}>
                          {o.text} {o.isCorrect && "✓"}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => startEditQuestion(q)} className={btnTertiary}>Edit</button>
                      <button onClick={() => handleDeleteQuestion(q.id)} className={btnDestructive}>Delete</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <form onSubmit={handleAddQuestion} className="mt-2 flex max-w-md flex-col gap-2">
            <input
              placeholder="Question text"
              value={questionForm.text}
              onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
              className={input}
            />
            <select
              value={questionForm.type}
              onChange={(e) => {
                const type = e.target.value as QuestionType;
                setQuestionForm({ ...questionForm, type, options: defaultOptionsForType(type) });
              }}
              className={selectClass}
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <OptionEditor form={questionForm} setForm={setQuestionForm} />
            <button type="submit" className={`${btnPrimary} self-start`}>Add Question</button>
          </form>
        </div>
      )}
    </div>
  );
}
