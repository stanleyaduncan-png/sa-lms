"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { grantCourseToOrg, revokeCourseFromOrg, getGrantsForCourse, getActiveOrganizations } from "@/actions/courseGrants";

type Grant = Awaited<ReturnType<typeof getGrantsForCourse>>[number];
type Organization = Awaited<ReturnType<typeof getActiveOrganizations>>[number];

export default function GrantsClient({
  courseId,
  courseStatus,
  grants,
  organizations,
}: {
  courseId: string;
  courseStatus: string;
  grants: Grant[];
  organizations: Organization[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const grantedOrgIds = new Set(grants.map((g) => g.organizationId));
  const availableOrgs = organizations.filter((o) => !grantedOrgIds.has(o.id));
  const [selectedOrgId, setSelectedOrgId] = useState("");

  const canGrant = courseStatus === "PUBLISHED";

  async function handleGrant(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedOrgId) {
      setError("Select an organization");
      return;
    }
    const result = await grantCourseToOrg(courseId, selectedOrgId);
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    setSelectedOrgId("");
    router.refresh();
  }

  async function handleRevoke(organizationId: string) {
    setError(null);
    const result = await revokeCourseFromOrg(courseId, organizationId);
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!canGrant && (
        <p style={{ color: "red" }}>
          Only published courses can be granted to an organization. Publish this course first.
        </p>
      )}

      <h2>Grant to Organization</h2>
      <form onSubmit={handleGrant} style={{ display: "flex", gap: "0.5rem", maxWidth: "480px" }}>
        <select
          value={selectedOrgId}
          onChange={(e) => setSelectedOrgId(e.target.value)}
          disabled={!canGrant || availableOrgs.length === 0}
        >
          <option value="">Select an organization…</option>
          {availableOrgs.map((org) => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
        <button type="submit" disabled={!canGrant || availableOrgs.length === 0}>
          Grant
        </button>
      </form>

      <h2>Granted Organizations</h2>
      {grants.length === 0 && <p>Not granted to any organization yet.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {grants.map((grant) => (
          <li key={grant.id} style={{ borderBottom: "1px solid #eee", padding: "0.5rem 0" }}>
            {grant.organization.name}{" "}
            <button onClick={() => handleRevoke(grant.organizationId)}>Revoke</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
