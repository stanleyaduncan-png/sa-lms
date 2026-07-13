"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createCourse, updateCourse, archiveCourse, getCourses } from "@/actions/courses";

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
      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>Create Course</h2>
      <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "480px" }}>
        <input
          placeholder="Title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <textarea
          placeholder="Description"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
        />
        <input
          placeholder="Thumbnail URL (optional)"
          value={newThumbnailUrl}
          onChange={(e) => setNewThumbnailUrl(e.target.value)}
        />
        <button type="submit">Create</button>
      </form>

      <h2>Courses</h2>
      {courses.length === 0 && <p>No courses yet.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {courses.map((course) => (
          <li
            key={course.id}
            style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}
          >
            {editingId === course.id ? (
              <form
                onSubmit={(e) => handleUpdate(e, course.id)}
                style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "480px" }}
              >
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
                <input
                  placeholder="Thumbnail URL"
                  value={editThumbnailUrl}
                  onChange={(e) => setEditThumbnailUrl(e.target.value)}
                />
                <label>
                  Status:{" "}
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as "DRAFT" | "PUBLISHED")}
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                  </select>
                </label>
                <div>
                  <button type="submit">Save</button>{" "}
                  <button type="button" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <strong>{course.title}</strong> — {course.status}
                <div>Sections: {course._count.sections}</div>
                <div>Created: {new Date(course.createdAt).toLocaleDateString()}</div>
                <div style={{ marginTop: "0.5rem" }}>
                  <a href={`/owner/courses/${course.id}`}>Manage content</a>{" "}
                  · <a href={`/owner/courses/${course.id}/grants`}>Grants</a>
                </div>
                <div style={{ marginTop: "0.5rem" }}>
                  <button onClick={() => startEdit(course)}>Edit</button>{" "}
                  {course.status !== "ARCHIVED" && (
                    <button onClick={() => handleArchive(course.id, course.title)}>Archive</button>
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
