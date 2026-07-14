// Owner: cross-org + individual reporting (Epic 7). Read-only over data
// Epics 2/4/6 already produce - no new domain logic here.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getOwnerOrgSummaries,
  getOwnerCourseSummaries,
  getOwnerIndividualLearnersSummary,
  exportOwnerReportCsv,
} from "@/actions/reports";
import CsvExportButton from "@/components/CsvExportButton";

export default async function OwnerReportsPage() {
  const session = await getServerSession(authOptions);
  console.log("[owner/reports] session role:", session?.user.role);

  const [orgSummaries, courseSummaries, individualLearners] = await Promise.all([
    getOwnerOrgSummaries(),
    getOwnerCourseSummaries(),
    getOwnerIndividualLearnersSummary(),
  ]);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Reports</h1>
      <p>
        <a href="/owner">← Back to dashboard</a>
      </p>
      <p>
        <CsvExportButton label="Export CSV" action={exportOwnerReportCsv} filename="owner-report.csv" />
      </p>

      <h2>Organizations</h2>
      {orgSummaries.length === 0 && <p>No organizations yet.</p>}
      <table cellPadding={6} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Organization</th>
            <th>Status</th>
            <th>Seats</th>
            <th>Learners</th>
            <th>Enrollments</th>
            <th>Completion Rate</th>
          </tr>
        </thead>
        <tbody>
          {orgSummaries.map((org) => (
            <tr key={org.id} style={{ borderBottom: "1px solid #eee" }}>
              <td>{org.name}</td>
              <td>{org.isActive ? "Active" : "Deactivated"}</td>
              <td>
                {org.seatsUsed} / {org.seatLimit}
              </td>
              <td>{org.learnerCount}</td>
              <td>
                {org.completedEnrollments} / {org.totalEnrollments}
              </td>
              <td>{org.completionRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Courses</h2>
      {courseSummaries.length === 0 && <p>No courses yet.</p>}
      <table cellPadding={6} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Course</th>
            <th>Status</th>
            <th>Enrollments</th>
            <th>Completion Rate</th>
            <th>Avg Quiz Score</th>
          </tr>
        </thead>
        <tbody>
          {courseSummaries.map((course) => (
            <tr key={course.id} style={{ borderBottom: "1px solid #eee" }}>
              <td>{course.title}</td>
              <td>{course.status}</td>
              <td>
                {course.completedEnrollments} / {course.totalEnrollments}
              </td>
              <td>{course.completionRate}%</td>
              <td>{course.averageQuizScore !== null ? `${course.averageQuizScore}%` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Individual Learners</h2>
      {individualLearners.length === 0 && <p>No individual learners yet.</p>}
      <table cellPadding={6} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Learner</th>
            <th>Enrollments</th>
            <th>Completion Rate</th>
          </tr>
        </thead>
        <tbody>
          {individualLearners.map((learner) => (
            <tr key={learner.id} style={{ borderBottom: "1px solid #eee" }}>
              <td>
                {learner.name} ({learner.email})
              </td>
              <td>
                {learner.completedEnrollments} / {learner.totalEnrollments}
              </td>
              <td>{learner.completionRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
