// Learner: own progress + certificates in one place (Epic 7). Read-only,
// strictly scoped to the session user - reuses getMyEnrollments /
// getMyCertificates rather than reimplementing the query.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMyEnrollments } from "@/actions/enrollments";
import { getMyCertificates } from "@/actions/certificates";
import DashboardShell from "@/components/DashboardShell";
import { tableWrap, table, tableHeadRow, tableHeadCell, tableRow, tableCell, sectionHeading, link } from "@/lib/ui";

export default async function LearnerReportsPage() {
  const session = await getServerSession(authOptions);
  console.log("[learner/reports] session role:", session?.user.role);

  const [enrollments, certificates] = await Promise.all([
    getMyEnrollments(),
    getMyCertificates(),
  ]);

  return (
    <DashboardShell role="LEARNER" userName={session?.user.name} userEmail={session?.user.email} title="My Report">
      <h2 className={sectionHeading}>Progress</h2>
      {enrollments.length === 0 && <p className="text-navy-700">No enrollments yet.</p>}
      {enrollments.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Course</th>
                <th className={tableHeadCell}>Progress</th>
                <th className={tableHeadCell}>Completed</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <tr key={e.id} className={tableRow}>
                  <td className={tableCell}>{e.course.title}</td>
                  <td className={tableCell}>{e.progressPercent}%</td>
                  <td className={tableCell}>{e.completedAt ? new Date(e.completedAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className={sectionHeading}>Certificates</h2>
      {certificates.length === 0 && <p className="text-navy-700">No certificates yet.</p>}
      {certificates.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Course</th>
                <th className={tableHeadCell}>Issued</th>
                <th className={tableHeadCell}></th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((cert) => (
                <tr key={cert.id} className={tableRow}>
                  <td className={tableCell}>{cert.course.title}</td>
                  <td className={tableCell}>{new Date(cert.issuedAt).toLocaleDateString()}</td>
                  <td className={tableCell}>
                    <a href={cert.pdfUrl} className={link}>Download</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
