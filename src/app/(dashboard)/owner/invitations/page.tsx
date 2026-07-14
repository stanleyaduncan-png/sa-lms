// Owner: invitation management, individual learners (ACC-06, ACC-07, ACC-08).
// Protected by src/middleware.ts (role === OWNER).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllInvitations } from "@/actions/invitations";
import InvitationsClient from "./InvitationsClient";
import DashboardShell from "@/components/DashboardShell";

export default async function OwnerInvitationsPage() {
  const session = await getServerSession(authOptions);
  console.log("[owner/invitations] session role:", session?.user.role);

  const invitations = await getAllInvitations();

  return (
    <DashboardShell role="OWNER" userName={session?.user.name} userEmail={session?.user.email} title="Invitations">
      <InvitationsClient invitations={invitations} />
    </DashboardShell>
  );
}
