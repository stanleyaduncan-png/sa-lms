// Invitation acceptance (ACC-07, ACC-08). Public route - no session required
// (the whole point is that the invitee doesn't have an account yet).

import { getInvitationStatus } from "@/actions/invitations";
import AcceptInviteClient from "./AcceptInviteClient";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h1>Invalid invitation</h1>
        <p>This invitation link is invalid or missing a token.</p>
      </main>
    );
  }

  const result = await getInvitationStatus(token);

  if (result.status === "not_found" || result.status === "invalid") {
    return (
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h1>Invalid invitation</h1>
        <p>This invitation link is invalid. Please contact the person who invited you.</p>
      </main>
    );
  }

  if (result.status === "expired") {
    return (
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h1>Link expired</h1>
        <p>
          This invitation link has expired. Please contact the person who invited you to
          request a new one.
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Accept Invitation</h1>
      <p>Setting up an account for {result.email}</p>
      <AcceptInviteClient token={token} />
    </main>
  );
}
