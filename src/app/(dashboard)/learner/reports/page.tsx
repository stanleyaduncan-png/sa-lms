// Learner: own progress + certificates in one place (Epic 7). Read-only,
// strictly scoped to the session user - reuses getMyEnrollments /
// getMyCertificates rather than reimplementing the query.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMyEnrollments } from "@/actions/enrollments";
import { getMyCertificates } from "@/actions/certificates";

export default async function LearnerReportsPage() {
  const session = await getServerSession(authOptions);
  console.log("[learner/reports] session role:", session?.user.role);

  const [enrollments, certificates] = await Promise.all([
    getMyEnrollments(),
    getMyCertificates(),
  ]);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>My Report</h1>
      <p>
        <a href="/learner">← Back to my courses</a>
      </p>

      <h2>Progress</h2>
      {enrollments.length === 0 && <p>No enrollments yet.</p>}
      <table cellPadding={6} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Course</th>
            <th>Progress</th>
            <th>Completed</th>
          </tr>
        </thead>
        <tbody>
          {enrollments.map((e) => (
            <tr key={e.id} style={{ borderBottom: "1px solid #eee" }}>
              <td>{e.course.title}</td>
              <td>{e.progressPercent}%</td>
              <td>{e.completedAt ? new Date(e.completedAt).toLocaleDateString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Certificates</h2>
      {certificates.length === 0 && <p>No certificates yet.</p>}
      <table cellPadding={6} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Course</th>
            <th>Issued</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {certificates.map((cert) => (
            <tr key={cert.id} style={{ borderBottom: "1px solid #eee" }}>
              <td>{cert.course.title}</td>
              <td>{new Date(cert.issuedAt).toLocaleDateString()}</td>
              <td>
                <a href={cert.pdfUrl}>Download</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
