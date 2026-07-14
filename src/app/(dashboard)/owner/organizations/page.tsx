// Owner: organization management (ACC-01, ACC-02, ACC-03).
// Protected by src/middleware.ts (role === OWNER).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrganizationsWithUsage } from "@/actions/organizations";
import OrganizationsClient from "./OrganizationsClient";
import DashboardShell from "@/components/DashboardShell";

export default async function OwnerOrganizationsPage() {
  const session = await getServerSession(authOptions);
  console.log("[owner/organizations] session role:", session?.user.role);

  const organizations = await getOrganizationsWithUsage();

  return (
    <DashboardShell role="OWNER" userName={session?.user.name} userEmail={session?.user.email} title="Organizations">
      <OrganizationsClient organizations={organizations} />
    </DashboardShell>
  );
}
