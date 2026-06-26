// Org Admin dashboard.
// Protected by src/middleware.ts (role === ORG_ADMIN or OWNER).
// Will surface: own-org learner roster, seat usage (ACC-04/ACC-09),
// own-org progress reporting (TRK-07).
//
// IMPORTANT: every data query here must filter by the admin's own
// organizationId (from session) - never trust a client-supplied orgId.

export default function OrgAdminDashboardPage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Org Admin Dashboard</h1>
      <p>Placeholder. Own-organization learner roster and progress reporting go here.</p>
    </main>
  );
}
