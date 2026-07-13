// Owner: invitation management, individual learners (ACC-06, ACC-07, ACC-08).
// Protected by src/middleware.ts (role === OWNER).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllInvitations } from "@/actions/invitations";
import InvitationsClient from "./InvitationsClient";

export default async function OwnerInvitationsPage() {
  const session = await getServerSession(authOptions);
  console.log("[owner/invitations] session role:", session?.user.role);

  const invitations = await getAllInvitations();

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Invitations</h1>
      <p>
        <a href="/owner">← Back to dashboard</a>
      </p>
      <InvitationsClient invitations={invitations} />
    </main>
  );
}
