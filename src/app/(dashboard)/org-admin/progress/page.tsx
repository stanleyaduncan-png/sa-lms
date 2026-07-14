// Org Admin: per-learner progress, scoped to their own org only (TRK-07).
// Protected by src/middleware.ts (role === ORG_ADMIN or OWNER).

import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrgProgress } from "@/actions/progress";
import DashboardShell from "@/components/DashboardShell";
import StatusBadge from "@/components/StatusBadge";
import { tableWrap, table, tableHeadRow, tableHeadCell, tableRow, tableCell, link } from "@/lib/ui";

export default async function OrgAdminProgressPage() {
  const session = await getServerSession(authOptions);
  console.log("[org-admin/progress] session role:", session?.user.role);

  if (session?.user.role !== "ORG_ADMIN") {
    return (
      <DashboardShell role="OWNER" userName={session?.user.name} userEmail={session?.user.email} title="Progress">
        <p className="text-navy-700">This view is scoped to a single organization&apos;s Org Admin.</p>
        <p>
          <Link href="/owner/progress" className={link}>Go to Owner progress</Link>
        </p>
      </DashboardShell>
    );
  }

  const enrollments = await getOrgProgress();

  return (
    <DashboardShell role="ORG_ADMIN" userName={session?.user.name} userEmail={session?.user.email} title="Learner Progress">
      {enrollments.length === 0 && <p className="text-navy-700">No enrollments yet.</p>}
      {enrollments.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Learner</th>
                <th className={tableHeadCell}>Course</th>
                <th className={tableHeadCell}>Source</th>
                <th className={tableHeadCell}>Progress</th>
                <th className={tableHeadCell}>Completed</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <tr key={e.id} className={tableRow}>
                  <td className={tableCell}>
                    {e.user.name} ({e.user.email})
                  </td>
                  <td className={tableCell}>{e.course.title}</td>
                  <td className={tableCell}>{e.source}</td>
                  <td className={tableCell}>{e.progressPercent}%</td>
                  <td className={tableCell}>
                    {e.completedAt ? (
                      <StatusBadge kind="complete" label={new Date(e.completedAt).toLocaleDateString()} />
                    ) : e.progressPercent > 0 ? (
                      <StatusBadge kind="in-progress" label="In progress" />
                    ) : (
                      <StatusBadge kind="not-started" label="Not started" />
                    )}
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
