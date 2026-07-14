"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createCourse, updateCourse, archiveCourse, getCourses } from "@/actions/courses";
import {
  btnPrimary,
  btnTertiary,
  btnDestructive,
  input,
  errorText,
  sectionHeading,
  card,
  link,
} from "@/lib/ui";

type Course = Awaited<ReturnType<typeof getCourses>>[number];

export default function CoursesClient({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newThumbnailUrl, setNewThumbnailUrl] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editThumbnailUrl, setEditThumbnailUrl] = useState("");
  const [editStatus, setEditStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await createCourse({
      title: newTitle,
      description: newDescription,
      thumbnailUrl: newThumbnailUrl,
    });
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    setNewTitle("");
    setNewDescription("");
    setNewThumbnailUrl("");
    router.refresh();
  }

  function startEdit(course: Course) {
    setEditingId(course.id);
    setEditTitle(course.title);
    setEditDescription(course.description ?? "");
    setEditThumbnailUrl(course.thumbnailUrl ?? "");
    setEditStatus(course.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT");
  }

  async function handleUpdate(e: FormEvent, id: string) {
    e.preventDefault();
    setError(null);
    const result = await updateCourse(id, {
      title: editTitle,
      description: editDescription,
      thumbnailUrl: editThumbnailUrl,
      status: editStatus,
    });
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function handleArchive(id: string, title: string) {
    setError(null);
    if (!window.confirm(`Archive "${title}"? This will hide it from new grants.`)) {
      return;
    }
    const result = await archiveCourse(id);
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error && <p className={errorText}>{error}</p>}

      <h2 className={sectionHeading}>Create Course</h2>
      <form onSubmit={handleCreate} className="flex max-w-md flex-col gap-2">
        <input
          placeholder="Title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className={input}
        />
        <textarea
          placeholder="Description"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          className={input}
        />
        <input
          placeholder="Thumbnail URL (optional)"
          value={newThumbnailUrl}
          onChange={(e) => setNewThumbnailUrl(e.target.value)}
          className={input}
        />
        <button type="submit" className={`${btnPrimary} self-start`}>Create</button>
      </form>

      <h2 className={sectionHeading}>Courses</h2>
      {courses.length === 0 && <p className="text-navy-700">No courses yet.</p>}
      <ul className="grid grid-cols-1 gap-4">
        {courses.map((course) => (
          <li key={course.id} className={card}>
            {editingId === course.id ? (
              <form
                onSubmit={(e) => handleUpdate(e, course.id)}
                className="flex max-w-md flex-col gap-2"
              >
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className={input} />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className={input}
                />
                <input
                  placeholder="Thumbnail URL"
                  value={editThumbnailUrl}
                  onChange={(e) => setEditThumbnailUrl(e.target.value)}
                  className={input}
                />
                <label className="text-sm text-navy-700">
                  Status:{" "}
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as "DRAFT" | "PUBLISHED")}
                    className="rounded-md border border-navy-300 px-2 py-1 text-sm"
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                  </select>
                </label>
                <div className="flex gap-2">
                  <button type="submit" className={btnPrimary}>Save</button>
                  <button type="button" onClick={() => setEditingId(null)} className={btnTertiary}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <strong className="text-navy-900">{course.title}</strong>{" "}
                <span className="text-sm text-navy-600">— {course.status}</span>
                <div className="mt-1 text-sm text-navy-700">Sections: {course._count.sections}</div>
                <div className="mt-1 text-sm text-navy-700">Created: {new Date(course.createdAt).toLocaleDateString()}</div>
                <div className="mt-2">
                  <a href={`/owner/courses/${course.id}`} className={link}>Manage content</a>{" "}
                  <span className="text-navy-300">·</span>{" "}
                  <a href={`/owner/courses/${course.id}/grants`} className={link}>Grants</a>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => startEdit(course)} className={btnTertiary}>Edit</button>
                  {course.status !== "ARCHIVED" && (
                    <button onClick={() => handleArchive(course.id, course.title)} className={btnDestructive}>Archive</button>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
