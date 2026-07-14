// Owner: progress across all orgs and individuals (TRK-08).
// Protected by src/middleware.ts (role === OWNER).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllProgress } from "@/actions/progress";
import DashboardShell from "@/components/DashboardShell";
import StatusBadge from "@/components/StatusBadge";
import { tableWrap, table, tableHeadRow, tableHeadCell, tableRow, tableCell } from "@/lib/ui";

export default async function OwnerProgressPage() {
  const session = await getServerSession(authOptions);
  console.log("[owner/progress] session role:", session?.user.role);

  const enrollments = await getAllProgress();

  return (
    <DashboardShell role="OWNER" userName={session?.user.name} userEmail={session?.user.email} title="All Progress">
      {enrollments.length === 0 && <p className="text-navy-700">No enrollments yet.</p>}
      {enrollments.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Learner</th>
                <th className={tableHeadCell}>Organization</th>
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
                  <td className={tableCell}>{e.user.organization?.name ?? "— individual —"}</td>
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
