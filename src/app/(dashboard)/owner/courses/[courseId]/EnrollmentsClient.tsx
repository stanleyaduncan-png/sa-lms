"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { assignCourseToIndividual, getCourseEnrollments } from "@/actions/enrollments";

type Enrollment = Awaited<ReturnType<typeof getCourseEnrollments>>[number];

export default function EnrollmentsClient({
  courseId,
  enrollments,
}: {
  courseId: string;
  enrollments: Enrollment[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const result = await assignCourseToIndividual(courseId, email);
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    setInfo(`Enrolled ${email}`);
    setEmail("");
    router.refresh();
  }

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2>Assign to Individual Learner</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {info && <p style={{ color: "green" }}>{info}</p>}
      <form onSubmit={handleAssign} style={{ display: "flex", gap: "0.5rem", maxWidth: "480px" }}>
        <input
          type="email"
          placeholder="Learner email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit">Assign</button>
      </form>

      <h3>Enrolled Learners</h3>
      {enrollments.length === 0 && <p>No learners enrolled yet.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {enrollments.map((e) => (
          <li key={e.id} style={{ borderBottom: "1px solid #eee", padding: "0.25rem 0" }}>
            {e.user.name} ({e.user.email}) — {e.source}
            {e.completedAt && " — COMPLETE"}
          </li>
        ))}
      </ul>
    </div>
  );
}
