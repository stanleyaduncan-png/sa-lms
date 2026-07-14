// Org Admin dashboard.
// Protected by src/middleware.ts (role === ORG_ADMIN or OWNER).
// Will surface: own-org learner roster, seat usage (ACC-04/ACC-09),
// own-org progress reporting (TRK-07).
//
// IMPORTANT: every data query here must filter by the admin's own
// organizationId (from session) - never trust a client-supplied orgId.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardShell from "@/components/DashboardShell";
import { card } from "@/lib/ui";

export default async function OrgAdminDashboardPage() {
  const session = await getServerSession(authOptions);
  console.log("[org-admin dashboard] session role:", session?.user.role);

  return (
    <DashboardShell role="ORG_ADMIN" userName={session?.user.name} userEmail={session?.user.email} title="Org Admin Dashboard">
      <div className={card}>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="font-semibold text-navy-700">Name</dt>
            <dd className="text-navy-900">{session?.user.name}</dd>
          </div>
          <div>
            <dt className="font-semibold text-navy-700">Email</dt>
            <dd className="text-navy-900">{session?.user.email}</dd>
          </div>
          <div>
            <dt className="font-semibold text-navy-700">Role</dt>
            <dd className="text-navy-900">{session?.user.role}</dd>
          </div>
        </dl>
      </div>
    </DashboardShell>
  );
}
