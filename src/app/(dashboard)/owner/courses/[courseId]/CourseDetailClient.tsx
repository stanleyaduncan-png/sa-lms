"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSection, updateSection, deleteSection, createLesson, updateLesson, deleteLesson, reorderLessons } from "@/actions/lessons";
import { getCourse } from "@/actions/courses";
import QuizManager from "./QuizManager";

type Course = NonNullable<Awaited<ReturnType<typeof getCourse>>>;
type Section = Course["sections"][number];
type Lesson = Section["lessons"][number];

const CONTENT_TYPES = ["VIDEO", "DOCUMENT", "SCORM"] as const;

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
      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>Add Section</h2>
      <form onSubmit={handleAddSection} style={{ display: "flex", gap: "0.5rem", maxWidth: "480px" }}>
        <input
          placeholder="Section title"
          value={newSectionTitle}
          onChange={(e) => setNewSectionTitle(e.target.value)}
        />
        <button type="submit">Add Section</button>
      </form>

      {course.sections.length === 0 && <p>No sections yet.</p>}

      {course.sections.map((section) => (
        <div key={section.id} style={{ border: "1px solid #ccc", padding: "1rem", marginTop: "1rem" }}>
          {editingSectionId === section.id ? (
            <form onSubmit={(e) => handleUpdateSection(e, section)} style={{ display: "flex", gap: "0.5rem" }}>
              <input value={editSectionTitle} onChange={(e) => setEditSectionTitle(e.target.value)} />
              <button type="submit">Save</button>
              <button type="button" onClick={() => setEditingSectionId(null)}>Cancel</button>
            </form>
          ) : (
            <div>
              <strong>{section.title}</strong>{" "}
              <button onClick={() => startEditSection(section)}>Edit</button>{" "}
              <button onClick={() => handleDeleteSection(section.id)}>Delete Section</button>
            </div>
          )}

          <ul style={{ listStyle: "none", padding: 0, marginTop: "0.5rem" }}>
            {section.lessons.map((lesson, index) => (
              <li key={lesson.id} style={{ borderTop: "1px solid #eee", padding: "0.5rem 0" }}>
                {editingLessonId === lesson.id ? (
                  <form
                    onSubmit={(e) => handleUpdateLesson(e, lesson)}
                    style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "480px" }}
                  >
                    <input
                      value={editLesson.title}
                      onChange={(e) => setEditLesson((f) => ({ ...f, title: e.target.value }))}
                    />
                    <select
                      value={editLesson.contentType}
                      onChange={(e) => setEditLesson((f) => ({ ...f, contentType: e.target.value as (typeof CONTENT_TYPES)[number] }))}
                    >
                      {CONTENT_TYPES.map((ct) => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                    <input
                      placeholder="Content URL"
                      value={editLesson.contentUrl}
                      onChange={(e) => setEditLesson((f) => ({ ...f, contentUrl: e.target.value }))}
                    />
                    <label>
                      <input
                        type="checkbox"
                        checked={editLesson.requiresPriorLesson}
                        onChange={(e) => setEditLesson((f) => ({ ...f, requiresPriorLesson: e.target.checked }))}
                      />{" "}
                      Requires prior lesson
                    </label>
                    <div>
                      <button type="submit">Save</button>{" "}
                      <button type="button" onClick={() => setEditingLessonId(null)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <strong>{lesson.title}</strong> — [{lesson.contentType}]
                    {lesson.contentUrl && (
                      <>
                        {" "}
                        · <a href={lesson.contentUrl} target="_blank" rel="noreferrer">{lesson.contentUrl}</a>
                      </>
                    )}
                    {lesson.requiresPriorLesson && <> · requires prior lesson</>}
                    {lesson.quiz && <> · has quiz</>}
                    <div>
                      <button onClick={() => handleMoveLesson(section, index, -1)} disabled={index === 0}>↑</button>{" "}
                      <button onClick={() => handleMoveLesson(section, index, 1)} disabled={index === section.lessons.length - 1}>↓</button>{" "}
                      <button onClick={() => startEditLesson(lesson)}>Edit</button>{" "}
                      <button onClick={() => handleDeleteLesson(lesson.id)}>Delete</button>{" "}
                      {lesson.contentType !== "SCORM" && (
                        <button
                          onClick={() =>
                            setQuizManagerLessonId(quizManagerLessonId === lesson.id ? null : lesson.id)
                          }
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
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "480px", marginTop: "0.5rem" }}
          >
            <input
              placeholder="Lesson title"
              value={lessonForm(section.id).title}
              onChange={(e) => setLessonForm(section.id, { title: e.target.value })}
            />
            <select
              value={lessonForm(section.id).contentType}
              onChange={(e) => setLessonForm(section.id, { contentType: e.target.value as (typeof CONTENT_TYPES)[number] })}
            >
              {CONTENT_TYPES.map((ct) => (
                <option key={ct} value={ct}>{ct}</option>
              ))}
            </select>
            <input
              placeholder="Content URL"
              value={lessonForm(section.id).contentUrl}
              onChange={(e) => setLessonForm(section.id, { contentUrl: e.target.value })}
            />
            <label>
              <input
                type="checkbox"
                checked={lessonForm(section.id).requiresPriorLesson}
                onChange={(e) => setLessonForm(section.id, { requiresPriorLesson: e.target.checked })}
              />{" "}
              Requires prior lesson
            </label>
            <button type="submit">Add Lesson</button>
          </form>
        </div>
      ))}
    </div>
  );
}
