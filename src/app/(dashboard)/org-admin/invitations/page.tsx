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
import DashboardShell from "@/components/DashboardShell";
import { link } from "@/lib/ui";

export default async function OrgAdminInvitationsPage() {
  const session = await getServerSession(authOptions);
  console.log("[org-admin/invitations] session role:", session?.user.role);

  if (session?.user.role !== "ORG_ADMIN") {
    // OWNER can also reach this route per middleware, but has no own-org
    // scope to manage invitations for - point them at the org-scoped view.
    return (
      <DashboardShell role="OWNER" userName={session?.user.name} userEmail={session?.user.email} title="Invitations">
        <p className="text-navy-700">This view is scoped to a single organization&apos;s Org Admin.</p>
        <p>
          <a href="/owner/invitations" className={link}>Go to Owner invitations</a>
        </p>
      </DashboardShell>
    );
  }

  const { invitations, organization, seatsUsed } = await getOrgInvitations();

  return (
    <DashboardShell
      role="ORG_ADMIN"
      userName={session?.user.name}
      userEmail={session?.user.email}
      title={`Invitations — ${organization.name}`}
    >
      <p className="mb-6 text-sm font-medium text-navy-700">
        Seats used: {seatsUsed} / {organization.seatLimit}
      </p>
      <OrgAdminInvitationsClient
        invitations={invitations}
        seatsUsed={seatsUsed}
        seatLimit={organization.seatLimit}
      />
    </DashboardShell>
  );
}
