// Org Admin: invitation management, scoped to their own org (ACC-05, ACC-09).
// Protected by src/middleware.ts (role === ORG_ADMIN or OWNER).
//
// IMPORTANT: getOrgInvitations() derives the org strictly from
// session.user.organizationId server-side - never from a client-supplied
// value. This is what keeps ACC-05 (org data isolation) true.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrgInvitations } from "@/actions/invitations";
import OrgAdminInvitationsClient from "./OrgAdminInvitationsClient";

export default async function OrgAdminInvitationsPage() {
  const session = await getServerSession(authOptions);
  console.log("[org-admin/invitations] session role:", session?.user.role);

  if (session?.user.role !== "ORG_ADMIN") {
    // OWNER can also reach this route per middleware, but has no own-org
    // scope to manage invitations for - point them at the org-scoped view.
    return (
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h1>Invitations</h1>
        <p>This view is scoped to a single organization&apos;s Org Admin.</p>
        <p>
          <a href="/owner/invitations">Go to Owner invitations</a>
        </p>
      </main>
    );
  }

  const { invitations, organization, seatsUsed } = await getOrgInvitations();

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Invitations — {organization.name}</h1>
      <p>
        <a href="/org-admin">← Back to dashboard</a>
      </p>
      <p>
        Seats used: {seatsUsed} / {organization.seatLimit}
      </p>
      <OrgAdminInvitationsClient
        invitations={invitations}
        seatsUsed={seatsUsed}
        seatLimit={organization.seatLimit}
      />
    </main>
  );
}
