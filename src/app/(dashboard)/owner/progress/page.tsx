// Owner: progress across all orgs and individuals (TRK-08).
// Protected by src/middleware.ts (role === OWNER).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllProgress } from "@/actions/progress";

export default async function OwnerProgressPage() {
  const session = await getServerSession(authOptions);
  console.log("[owner/progress] session role:", session?.user.role);

  const enrollments = await getAllProgress();

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>All Progress</h1>
      <p>
        <a href="/owner">← Back to dashboard</a>
      </p>
      {enrollments.length === 0 && <p>No enrollments yet.</p>}
      <table cellPadding={6} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Learner</th>
            <th>Organization</th>
            <th>Course</th>
            <th>Source</th>
            <th>Progress</th>
            <th>Completed</th>
          </tr>
        </thead>
        <tbody>
          {enrollments.map((e) => (
            <tr key={e.id} style={{ borderBottom: "1px solid #eee" }}>
              <td>
                {e.user.name} ({e.user.email})
              </td>
              <td>{e.user.organization?.name ?? "— individual —"}</td>
              <td>{e.course.title}</td>
              <td>{e.source}</td>
              <td>{e.progressPercent}%</td>
              <td>{e.completedAt ? new Date(e.completedAt).toLocaleDateString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
