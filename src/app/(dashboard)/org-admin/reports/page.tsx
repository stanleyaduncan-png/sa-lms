// Org Admin: own-org-only reporting (Epic 7). Every query in
// getOrgAdminRoster/getOrgAdminCourseSummary/getOrgCertificates is scoped
// to session.user.organizationId server-side - this page never passes a
// client-supplied org id anywhere (Epic 7 risk #1).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrgAdminRoster, getOrgAdminCourseSummary, exportOrgAdminReportCsv } from "@/actions/reports";
import { getOrgCertificates } from "@/actions/certificates";
import CsvExportButton from "@/components/CsvExportButton";

export default async function OrgAdminReportsPage() {
  const session = await getServerSession(authOptions);
  console.log("[org-admin/reports] session role:", session?.user.role);

  if (session?.user.role !== "ORG_ADMIN") {
    return (
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h1>Reports</h1>
        <p>This view is scoped to a single organization&apos;s Org Admin.</p>
        <p>
          <a href="/owner/reports">Go to Owner reports</a>
        </p>
      </main>
    );
  }

  const [roster, courseSummary, certificates] = await Promise.all([
    getOrgAdminRoster(),
    getOrgAdminCourseSummary(),
    getOrgCertificates(),
  ]);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Reports</h1>
      <p>
        <a href="/org-admin">← Back to dashboard</a>
      </p>
      <p>
        <CsvExportButton label="Export CSV" action={exportOrgAdminReportCsv} filename="org-report.csv" />
      </p>

      <h2>Learner Roster</h2>
      {roster.length === 0 && <p>No learners in your organization yet.</p>}
      <table cellPadding={6} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Learner</th>
            <th>Course</th>
            <th>Progress</th>
            <th>Completed</th>
          </tr>
        </thead>
        <tbody>
          {roster.flatMap((learner) =>
            learner.enrollments.length === 0 ? (
              <tr key={learner.id} style={{ borderBottom: "1px solid #eee" }}>
                <td>
                  {learner.name} ({learner.email})
                </td>
                <td colSpan={3}>No enrollments yet</td>
              </tr>
            ) : (
              learner.enrollments.map((e, i) => (
                <tr key={`${learner.id}-${i}`} style={{ borderBottom: "1px solid #eee" }}>
                  <td>
                    {learner.name} ({learner.email})
                  </td>
                  <td>{e.courseTitle}</td>
                  <td>{e.progressPercent}%</td>
                  <td>{e.completedAt ? new Date(e.completedAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))
            )
          )}
        </tbody>
      </table>

      <h2>Course Completion (within your org)</h2>
      {courseSummary.length === 0 && <p>No enrollments yet.</p>}
      <table cellPadding={6} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Course</th>
            <th>Enrollments</th>
            <th>Completion Rate</th>
          </tr>
        </thead>
        <tbody>
          {courseSummary.map((course) => (
            <tr key={course.id} style={{ borderBottom: "1px solid #eee" }}>
              <td>{course.title}</td>
              <td>
                {course.completedEnrollments} / {course.totalEnrollments}
              </td>
              <td>{course.completionRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Certificates Earned</h2>
      {certificates.length === 0 && <p>No certificates issued yet.</p>}
      <table cellPadding={6} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Learner</th>
            <th>Course</th>
            <th>Issued</th>
          </tr>
        </thead>
        <tbody>
          {certificates.map((cert) => (
            <tr key={cert.id} style={{ borderBottom: "1px solid #eee" }}>
              <td>
                {cert.user.name} ({cert.user.email})
              </td>
              <td>{cert.course.title}</td>
              <td>{new Date(cert.issuedAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
