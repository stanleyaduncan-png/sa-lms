// Owner / Platform Admin dashboard.
// Protected by src/middleware.ts (role === OWNER).
// Will surface: org management, course authoring, all-org reporting (TRK-08).

export default function OwnerDashboardPage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Owner Dashboard</h1>
      <p>Placeholder. Org management, course authoring, and cross-org reporting go here.</p>
    </main>
  );
}
