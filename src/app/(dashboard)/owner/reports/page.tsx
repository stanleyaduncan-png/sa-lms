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
import DashboardShell from "@/components/DashboardShell";
import { tableWrap, table, tableHeadRow, tableHeadCell, tableRow, tableCell, sectionHeading } from "@/lib/ui";

export default async function OwnerReportsPage() {
  const session = await getServerSession(authOptions);
  console.log("[owner/reports] session role:", session?.user.role);

  const [orgSummaries, courseSummaries, individualLearners] = await Promise.all([
    getOwnerOrgSummaries(),
    getOwnerCourseSummaries(),
    getOwnerIndividualLearnersSummary(),
  ]);

  return (
    <DashboardShell role="OWNER" userName={session?.user.name} userEmail={session?.user.email} title="Reports">
      <CsvExportButton label="Export CSV" action={exportOwnerReportCsv} filename="owner-report.csv" />

      <h2 className={sectionHeading}>Organizations</h2>
      {orgSummaries.length === 0 && <p className="text-navy-700">No organizations yet.</p>}
      {orgSummaries.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Organization</th>
                <th className={tableHeadCell}>Status</th>
                <th className={tableHeadCell}>Seats</th>
                <th className={tableHeadCell}>Learners</th>
                <th className={tableHeadCell}>Enrollments</th>
                <th className={tableHeadCell}>Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {orgSummaries.map((org) => (
                <tr key={org.id} className={tableRow}>
                  <td className={tableCell}>{org.name}</td>
                  <td className={tableCell}>{org.isActive ? "Active" : "Deactivated"}</td>
                  <td className={tableCell}>
                    {org.seatsUsed} / {org.seatLimit}
                  </td>
                  <td className={tableCell}>{org.learnerCount}</td>
                  <td className={tableCell}>
                    {org.completedEnrollments} / {org.totalEnrollments}
                  </td>
                  <td className={tableCell}>{org.completionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className={sectionHeading}>Courses</h2>
      {courseSummaries.length === 0 && <p className="text-navy-700">No courses yet.</p>}
      {courseSummaries.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Course</th>
                <th className={tableHeadCell}>Status</th>
                <th className={tableHeadCell}>Enrollments</th>
                <th className={tableHeadCell}>Completion Rate</th>
                <th className={tableHeadCell}>Avg Quiz Score</th>
              </tr>
            </thead>
            <tbody>
              {courseSummaries.map((course) => (
                <tr key={course.id} className={tableRow}>
                  <td className={tableCell}>{course.title}</td>
                  <td className={tableCell}>{course.status}</td>
                  <td className={tableCell}>
                    {course.completedEnrollments} / {course.totalEnrollments}
                  </td>
                  <td className={tableCell}>{course.completionRate}%</td>
                  <td className={tableCell}>
                    {course.averageQuizScore !== null ? `${course.averageQuizScore}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className={sectionHeading}>Individual Learners</h2>
      {individualLearners.length === 0 && <p className="text-navy-700">No individual learners yet.</p>}
      {individualLearners.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Learner</th>
                <th className={tableHeadCell}>Enrollments</th>
                <th className={tableHeadCell}>Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {individualLearners.map((learner) => (
                <tr key={learner.id} className={tableRow}>
                  <td className={tableCell}>
                    {learner.name} ({learner.email})
                  </td>
                  <td className={tableCell}>
                    {learner.completedEnrollments} / {learner.totalEnrollments}
                  </td>
                  <td className={tableCell}>{learner.completionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
