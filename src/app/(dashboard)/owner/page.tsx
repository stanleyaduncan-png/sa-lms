// Owner / Platform Admin dashboard.
// Protected by src/middleware.ts (role === OWNER).
// Will surface: org management, course authoring, all-org reporting (TRK-08).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardShell from "@/components/DashboardShell";
import { card } from "@/lib/ui";

export default async function OwnerDashboardPage() {
  const session = await getServerSession(authOptions);
  console.log("[owner dashboard] session role:", session?.user.role);

  return (
    <DashboardShell role="OWNER" userName={session?.user.name} userEmail={session?.user.email} title="Owner Dashboard">
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
