// Owner / Platform Admin dashboard.
// Protected by src/middleware.ts (role === OWNER).
// Will surface: org management, course authoring, all-org reporting (TRK-08).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function OwnerDashboardPage() {
  const session = await getServerSession(authOptions);
  console.log("[owner dashboard] session role:", session?.user.role);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Owner Dashboard</h1>
      <p>Placeholder. Cross-org reporting goes here.</p>
      <p>
        <a href="/owner/organizations">Organizations</a> ·{" "}
        <a href="/owner/invitations">Invitations</a> ·{" "}
        <a href="/owner/courses">Courses</a> ·{" "}
        <a href="/owner/progress">Progress</a>
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
