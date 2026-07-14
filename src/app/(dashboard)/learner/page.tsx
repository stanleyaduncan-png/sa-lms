// Learner dashboard: enrolled courses + course-level progress (TRK-*).
// Strictly scoped to the session user's own enrollments (getMyEnrollments).
// Quiz results (REV-*) land in a future epic; certificates (CERT-03) are
// at /learner/certificates.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMyEnrollments } from "@/actions/enrollments";
import LogoutButton from "@/components/LogoutButton";

export default async function LearnerDashboardPage() {
  const session = await getServerSession(authOptions);
  console.log("[learner dashboard] session role:", session?.user.role);

  const enrollments = await getMyEnrollments();

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>My Courses</h1>
      <p>
        <a href="/learner/certificates">My Certificates</a> ·{" "}
        <a href="/learner/reports">My Report</a>
      </p>
      <ul>
        <li>Name: {session?.user.name}</li>
        <li>Email: {session?.user.email}</li>
        <li>Role: {session?.user.role}</li>
      </ul>
      <LogoutButton />

      <h2>Enrolled Courses</h2>
      {enrollments.length === 0 && <p>No courses yet.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {enrollments.map((e) => (
          <li key={e.id} style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
            <a href={`/learner/courses/${e.courseId}`}>
              <strong>{e.course.title}</strong>
            </a>
            <div>Progress: {e.progressPercent}%</div>
            <div>Source: {e.source}</div>
            {e.completedAt && <div>Completed: {new Date(e.completedAt).toLocaleDateString()}</div>}
          </li>
        ))}
      </ul>
    </main>
  );
}
