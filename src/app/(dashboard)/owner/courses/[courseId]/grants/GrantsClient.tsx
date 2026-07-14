"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { grantCourseToOrg, revokeCourseFromOrg, getGrantsForCourse, getActiveOrganizations } from "@/actions/courseGrants";
import { btnPrimary, btnDestructive, errorText, sectionHeading } from "@/lib/ui";

type Grant = Awaited<ReturnType<typeof getGrantsForCourse>>[number];
type Organization = Awaited<ReturnType<typeof getActiveOrganizations>>[number];

const selectClass = "rounded-md border border-navy-300 px-3 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:cursor-not-allowed disabled:opacity-50";

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
      {error && <p className={errorText}>{error}</p>}
      {!canGrant && (
        <p className={errorText}>
          Only published courses can be granted to an organization. Publish this course first.
        </p>
      )}

      <h2 className={sectionHeading}>Grant to Organization</h2>
      <form onSubmit={handleGrant} className="flex max-w-md gap-2">
        <select
          value={selectedOrgId}
          onChange={(e) => setSelectedOrgId(e.target.value)}
          disabled={!canGrant || availableOrgs.length === 0}
          className={selectClass}
        >
          <option value="">Select an organization…</option>
          {availableOrgs.map((org) => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
        <button type="submit" disabled={!canGrant || availableOrgs.length === 0} className={btnPrimary}>
          Grant
        </button>
      </form>

      <h2 className={sectionHeading}>Granted Organizations</h2>
      {grants.length === 0 && <p className="text-navy-700">Not granted to any organization yet.</p>}
      <ul className="divide-y divide-navy-100">
        {grants.map((grant) => (
          <li key={grant.id} className="flex items-center justify-between py-2 text-sm text-navy-900">
            {grant.organization.name}
            <button onClick={() => handleRevoke(grant.organizationId)} className={btnDestructive}>Revoke</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
