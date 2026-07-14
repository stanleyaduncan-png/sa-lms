// Org Admin: own-org-only reporting (Epic 7). Every query in
// getOrgAdminRoster/getOrgAdminCourseSummary/getOrgCertificates is scoped
// to session.user.organizationId server-side - this page never passes a
// client-supplied org id anywhere (Epic 7 risk #1).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrgAdminRoster, getOrgAdminCourseSummary, exportOrgAdminReportCsv } from "@/actions/reports";
import { getOrgCertificates } from "@/actions/certificates";
import CsvExportButton from "@/components/CsvExportButton";
import DashboardShell from "@/components/DashboardShell";
import { tableWrap, table, tableHeadRow, tableHeadCell, tableRow, tableCell, sectionHeading, link } from "@/lib/ui";

export default async function OrgAdminReportsPage() {
  const session = await getServerSession(authOptions);
  console.log("[org-admin/reports] session role:", session?.user.role);

  if (session?.user.role !== "ORG_ADMIN") {
    return (
      <DashboardShell role="OWNER" userName={session?.user.name} userEmail={session?.user.email} title="Reports">
        <p className="text-navy-700">This view is scoped to a single organization&apos;s Org Admin.</p>
        <p>
          <a href="/owner/reports" className={link}>Go to Owner reports</a>
        </p>
      </DashboardShell>
    );
  }

  const [roster, courseSummary, certificates] = await Promise.all([
    getOrgAdminRoster(),
    getOrgAdminCourseSummary(),
    getOrgCertificates(),
  ]);

  return (
    <DashboardShell role="ORG_ADMIN" userName={session?.user.name} userEmail={session?.user.email} title="Reports">
      <CsvExportButton label="Export CSV" action={exportOrgAdminReportCsv} filename="org-report.csv" />

      <h2 className={sectionHeading}>Learner Roster</h2>
      {roster.length === 0 && <p className="text-navy-700">No learners in your organization yet.</p>}
      {roster.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Learner</th>
                <th className={tableHeadCell}>Course</th>
                <th className={tableHeadCell}>Progress</th>
                <th className={tableHeadCell}>Completed</th>
              </tr>
            </thead>
            <tbody>
              {roster.flatMap((learner) =>
                learner.enrollments.length === 0 ? (
                  <tr key={learner.id} className={tableRow}>
                    <td className={tableCell}>
                      {learner.name} ({learner.email})
                    </td>
                    <td className={tableCell} colSpan={3}>No enrollments yet</td>
                  </tr>
                ) : (
                  learner.enrollments.map((e, i) => (
                    <tr key={`${learner.id}-${i}`} className={tableRow}>
                      <td className={tableCell}>
                        {learner.name} ({learner.email})
                      </td>
                      <td className={tableCell}>{e.courseTitle}</td>
                      <td className={tableCell}>{e.progressPercent}%</td>
                      <td className={tableCell}>{e.completedAt ? new Date(e.completedAt).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      <h2 className={sectionHeading}>Course Completion (within your org)</h2>
      {courseSummary.length === 0 && <p className="text-navy-700">No enrollments yet.</p>}
      {courseSummary.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Course</th>
                <th className={tableHeadCell}>Enrollments</th>
                <th className={tableHeadCell}>Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {courseSummary.map((course) => (
                <tr key={course.id} className={tableRow}>
                  <td className={tableCell}>{course.title}</td>
                  <td className={tableCell}>
                    {course.completedEnrollments} / {course.totalEnrollments}
                  </td>
                  <td className={tableCell}>{course.completionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className={sectionHeading}>Certificates Earned</h2>
      {certificates.length === 0 && <p className="text-navy-700">No certificates issued yet.</p>}
      {certificates.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Learner</th>
                <th className={tableHeadCell}>Course</th>
                <th className={tableHeadCell}>Issued</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((cert) => (
                <tr key={cert.id} className={tableRow}>
                  <td className={tableCell}>
                    {cert.user.name} ({cert.user.email})
                  </td>
                  <td className={tableCell}>{cert.course.title}</td>
                  <td className={tableCell}>{new Date(cert.issuedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
