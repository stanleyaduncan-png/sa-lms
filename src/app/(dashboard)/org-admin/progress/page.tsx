// Org Admin: per-learner progress, scoped to their own org only (TRK-07).
// Protected by src/middleware.ts (role === ORG_ADMIN or OWNER).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrgProgress } from "@/actions/progress";

export default async function OrgAdminProgressPage() {
  const session = await getServerSession(authOptions);
  console.log("[org-admin/progress] session role:", session?.user.role);

  if (session?.user.role !== "ORG_ADMIN") {
    return (
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h1>Progress</h1>
        <p>This view is scoped to a single organization&apos;s Org Admin.</p>
        <p>
          <a href="/owner/progress">Go to Owner progress</a>
        </p>
      </main>
    );
  }

  const enrollments = await getOrgProgress();

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Learner Progress</h1>
      <p>
        <a href="/org-admin">← Back to dashboard</a>
      </p>
      {enrollments.length === 0 && <p>No enrollments yet.</p>}
      <table cellPadding={6} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Learner</th>
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
