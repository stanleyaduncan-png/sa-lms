// Org Admin dashboard.
// Protected by src/middleware.ts (role === ORG_ADMIN or OWNER).
// Will surface: own-org learner roster, seat usage (ACC-04/ACC-09),
// own-org progress reporting (TRK-07).
//
// IMPORTANT: every data query here must filter by the admin's own
// organizationId (from session) - never trust a client-supplied orgId.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function OrgAdminDashboardPage() {
  const session = await getServerSession(authOptions);
  console.log("[org-admin dashboard] session role:", session?.user.role);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Org Admin Dashboard</h1>
      <p>Placeholder. Own-organization learner roster and progress reporting go here.</p>
      <p>
        <a href="/org-admin/invitations">Invitations</a> ·{" "}
        <a href="/org-admin/progress">Progress</a> ·{" "}
        <a href="/org-admin/certificates">Certificates</a>
      </p>
      <ul>
        <li>Name: {session?.user.name}</li>
        <li>Email: {session?.user.email}</li>
        <li>Role: {session?.user.role}</li>
      </ul>
      <LogoutButton />
    </main>
  );
}
