// Invitation acceptance (ACC-07, ACC-08). Public route - no session required
// (the whole point is that the invitee doesn't have an account yet).

import { getInvitationStatus } from "@/actions/invitations";
import AcceptInviteClient from "./AcceptInviteClient";
import AuthShell from "@/components/AuthShell";
import { pageHeading } from "@/lib/ui";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthShell>
        <h1 className={pageHeading}>Invalid invitation</h1>
        <p className="mt-4 text-navy-700">This invitation link is invalid or missing a token.</p>
      </AuthShell>
    );
  }

  const result = await getInvitationStatus(token);

  if (result.status === "not_found" || result.status === "invalid") {
    return (
      <AuthShell>
        <h1 className={pageHeading}>Invalid invitation</h1>
        <p className="mt-4 text-navy-700">This invitation link is invalid. Please contact the person who invited you.</p>
      </AuthShell>
    );
  }

  if (result.status === "expired") {
    return (
      <AuthShell>
        <h1 className={pageHeading}>Link expired</h1>
        <p className="mt-4 text-navy-700">
          This invitation link has expired. Please contact the person who invited you to
          request a new one.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className={pageHeading}>Accept Invitation</h1>
      <p className="mt-2 mb-6 text-sm text-navy-700">Setting up an account for {result.email}</p>
      <AcceptInviteClient token={token} />
    </AuthShell>
  );
}
