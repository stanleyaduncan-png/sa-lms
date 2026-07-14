"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSection, updateSection, deleteSection, createLesson, updateLesson, deleteLesson, reorderLessons } from "@/actions/lessons";
import { getCourse } from "@/actions/courses";
import QuizManager from "./QuizManager";
import { btnPrimary, btnTertiary, btnDestructive, input, errorText, sectionHeading, card, link } from "@/lib/ui";

type Course = NonNullable<Awaited<ReturnType<typeof getCourse>>>;
type Section = Course["sections"][number];
type Lesson = Section["lessons"][number];

const CONTENT_TYPES = ["VIDEO", "DOCUMENT", "SCORM"] as const;

const selectClass = "rounded-md border border-navy-300 px-2 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500";
const iconBtn = "inline-flex h-8 w-8 items-center justify-center rounded-md border border-navy-300 text-navy-900 hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-40";

function emptyLessonForm() {
  return { title: "", contentType: "VIDEO" as (typeof CONTENT_TYPES)[number], contentUrl: "", requiresPriorLesson: false };
}

export default function CourseDetailClient({ course }: { course: Course }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionTitle, setEditSectionTitle] = useState("");

  const [newLessonBySection, setNewLessonBySection] = useState<Record<string, ReturnType<typeof emptyLessonForm>>>({});
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editLesson, setEditLesson] = useState(emptyLessonForm());
  const [quizManagerLessonId, setQuizManagerLessonId] = useState<string | null>(null);

  function lessonForm(sectionId: string) {
    return newLessonBySection[sectionId] ?? emptyLessonForm();
  }
  function setLessonForm(sectionId: string, patch: Partial<ReturnType<typeof emptyLessonForm>>) {
    setNewLessonBySection((prev) => ({ ...prev, [sectionId]: { ...lessonForm(sectionId), ...patch } }));
  }

  async function handleAddSection(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await createSection(course.id, { title: newSectionTitle, order: course.sections.length });
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    setNewSectionTitle("");
    router.refresh();
  }

  function startEditSection(section: Section) {
    setEditingSectionId(section.id);
    setEditSectionTitle(section.title);
  }

  async function handleUpdateSection(e: FormEvent, section: Section) {
    e.preventDefault();
    setError(null);
    const result = await updateSection(section.id, { title: editSectionTitle, order: section.order });
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    setEditingSectionId(null);
    router.refresh();
  }

  async function handleDeleteSection(id: string) {
    setError(null);
    if (!window.confirm("Delete this section?")) return;
    const result = await deleteSection(id);
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    router.refresh();
  }

  async function handleAddLesson(e: FormEvent, section: Section) {
    e.preventDefault();
    setError(null);
    const form = lessonForm(section.id);
    const result = await createLesson(section.id, {
      title: form.title,
      order: section.lessons.length,
      contentType: form.contentType,
      contentUrl: form.contentUrl,
      requiresPriorLesson: form.requiresPriorLesson,
    });
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    setNewLessonBySection((prev) => ({ ...prev, [section.id]: emptyLessonForm() }));
    router.refresh();
  }

  function startEditLesson(lesson: Lesson) {
    setEditingLessonId(lesson.id);
    setEditLesson({
      title: lesson.title,
      contentType: lesson.contentType,
      contentUrl: lesson.contentUrl ?? "",
      requiresPriorLesson: lesson.requiresPriorLesson,
    });
  }

  async function handleUpdateLesson(e: FormEvent, lesson: Lesson) {
    e.preventDefault();
    setError(null);
    const result = await updateLesson(lesson.id, {
      title: editLesson.title,
      order: lesson.order,
      contentType: editLesson.contentType,
      contentUrl: editLesson.contentUrl,
      requiresPriorLesson: editLesson.requiresPriorLesson,
    });
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    setEditingLessonId(null);
    router.refresh();
  }

  async function handleDeleteLesson(id: string) {
    setError(null);
    if (!window.confirm("Delete this lesson?")) return;
    const result = await deleteLesson(id);
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    router.refresh();
  }

  async function handleMoveLesson(section: Section, index: number, direction: -1 | 1) {
    setError(null);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= section.lessons.length) return;
    const ids = section.lessons.map((l) => l.id);
    [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
    const result = await reorderLessons(section.id, ids);
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error && <p className={errorText}>{error}</p>}

      <h2 className={sectionHeading}>Add Section</h2>
      <form onSubmit={handleAddSection} className="flex max-w-md gap-2">
        <input
          placeholder="Section title"
          value={newSectionTitle}
          onChange={(e) => setNewSectionTitle(e.target.value)}
          className={input}
        />
        <button type="submit" className={btnPrimary}>Add Section</button>
      </form>

      {course.sections.length === 0 && <p className="mt-4 text-navy-700">No sections yet.</p>}

      {course.sections.map((section) => (
        <div key={section.id} className={`${card} mt-4`}>
          {editingSectionId === section.id ? (
            <form onSubmit={(e) => handleUpdateSection(e, section)} className="flex gap-2">
              <input value={editSectionTitle} onChange={(e) => setEditSectionTitle(e.target.value)} className={input} />
              <button type="submit" className={btnPrimary}>Save</button>
              <button type="button" onClick={() => setEditingSectionId(null)} className={btnTertiary}>Cancel</button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <strong className="text-navy-900">{section.title}</strong>
              <button onClick={() => startEditSection(section)} className={btnTertiary}>Edit</button>
              <button onClick={() => handleDeleteSection(section.id)} className={btnDestructive}>Delete Section</button>
            </div>
          )}

          <ul className="mt-2 divide-y divide-navy-100">
            {section.lessons.map((lesson, index) => (
              <li key={lesson.id} className="py-2">
                {editingLessonId === lesson.id ? (
                  <form
                    onSubmit={(e) => handleUpdateLesson(e, lesson)}
                    className="flex max-w-md flex-col gap-2"
                  >
                    <input
                      value={editLesson.title}
                      onChange={(e) => setEditLesson((f) => ({ ...f, title: e.target.value }))}
                      className={input}
                    />
                    <select
                      value={editLesson.contentType}
                      onChange={(e) => setEditLesson((f) => ({ ...f, contentType: e.target.value as (typeof CONTENT_TYPES)[number] }))}
                      className={selectClass}
                    >
                      {CONTENT_TYPES.map((ct) => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                    <input
                      placeholder="Content URL"
                      value={editLesson.contentUrl}
                      onChange={(e) => setEditLesson((f) => ({ ...f, contentUrl: e.target.value }))}
                      className={input}
                    />
                    <label className="flex items-center gap-2 text-sm text-navy-700">
                      <input
                        type="checkbox"
                        checked={editLesson.requiresPriorLesson}
                        onChange={(e) => setEditLesson((f) => ({ ...f, requiresPriorLesson: e.target.checked }))}
                      />
                      Requires prior lesson
                    </label>
                    <div className="flex gap-2">
                      <button type="submit" className={btnPrimary}>Save</button>
                      <button type="button" onClick={() => setEditingLessonId(null)} className={btnTertiary}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <strong className="text-navy-900">{lesson.title}</strong>{" "}
                    <span className="text-sm text-navy-600">— [{lesson.contentType}]</span>
                    {lesson.contentUrl && (
                      <>
                        {" "}
                        · <a href={lesson.contentUrl} target="_blank" rel="noreferrer" className={link}>{lesson.contentUrl}</a>
                      </>
                    )}
                    {lesson.requiresPriorLesson && <span className="text-sm text-navy-600"> · requires prior lesson</span>}
                    {lesson.quiz && <span className="text-sm text-navy-600"> · has quiz</span>}
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => handleMoveLesson(section, index, -1)} disabled={index === 0} className={iconBtn}>↑</button>
                      <button onClick={() => handleMoveLesson(section, index, 1)} disabled={index === section.lessons.length - 1} className={iconBtn}>↓</button>
                      <button onClick={() => startEditLesson(lesson)} className={btnTertiary}>Edit</button>
                      <button onClick={() => handleDeleteLesson(lesson.id)} className={btnDestructive}>Delete</button>
                      {lesson.contentType !== "SCORM" && (
                        <button
                          onClick={() =>
                            setQuizManagerLessonId(quizManagerLessonId === lesson.id ? null : lesson.id)
                          }
                          className={btnTertiary}
                        >
                          {quizManagerLessonId === lesson.id ? "Hide quiz" : "Manage quiz"}
                        </button>
                      )}
                    </div>
                    {quizManagerLessonId === lesson.id && <QuizManager lesson={lesson} />}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <form
            onSubmit={(e) => handleAddLesson(e, section)}
            className="mt-2 flex max-w-md flex-col gap-2"
          >
            <input
              placeholder="Lesson title"
              value={lessonForm(section.id).title}
              onChange={(e) => setLessonForm(section.id, { title: e.target.value })}
              className={input}
            />
            <select
              value={lessonForm(section.id).contentType}
              onChange={(e) => setLessonForm(section.id, { contentType: e.target.value as (typeof CONTENT_TYPES)[number] })}
              className={selectClass}
            >
              {CONTENT_TYPES.map((ct) => (
                <option key={ct} value={ct}>{ct}</option>
              ))}
            </select>
            <input
              placeholder="Content URL"
              value={lessonForm(section.id).contentUrl}
              onChange={(e) => setLessonForm(section.id, { contentUrl: e.target.value })}
              className={input}
            />
            <label className="flex items-center gap-2 text-sm text-navy-700">
              <input
                type="checkbox"
                checked={lessonForm(section.id).requiresPriorLesson}
                onChange={(e) => setLessonForm(section.id, { requiresPriorLesson: e.target.checked })}
              />
              Requires prior lesson
            </label>
            <button type="submit" className={`${btnPrimary} self-start`}>Add Lesson</button>
          </form>
        </div>
      ))}
    </div>
  );
}
