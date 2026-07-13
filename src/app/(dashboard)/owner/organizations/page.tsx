// Owner: organization management (ACC-01, ACC-02, ACC-03).
// Protected by src/middleware.ts (role === OWNER).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrganizationsWithUsage } from "@/actions/organizations";
import OrganizationsClient from "./OrganizationsClient";

export default async function OwnerOrganizationsPage() {
  const session = await getServerSession(authOptions);
  console.log("[owner/organizations] session role:", session?.user.role);

  const organizations = await getOrganizationsWithUsage();

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Organizations</h1>
      <p>
        <a href="/owner">← Back to dashboard</a>
      </p>
      <OrganizationsClient organizations={organizations} />
    </main>
  );
}
