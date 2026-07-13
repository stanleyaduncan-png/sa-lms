"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  sendInvitation,
  resendInvitation,
  revokeInvitation,
  getAllInvitations,
} from "@/actions/invitations";

type Invitation = Awaited<ReturnType<typeof getAllInvitations>>[number];

export default function InvitationsClient({ invitations }: { invitations: Invitation[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const result = await sendInvitation({ email, organizationId: null });
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    setEmail("");
    setInfo(`Invitation sent to ${email}`);
    router.refresh();
  }

  async function handleRevoke(id: string) {
    setError(null);
    const result = await revokeInvitation(id);
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    router.refresh();
  }

  async function handleResend(id: string) {
    setError(null);
    const result = await resendInvitation(id);
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {info && <p style={{ color: "green" }}>{info}</p>}

      <h2>Invite Individual Learner</h2>
      <form onSubmit={handleInvite} style={{ display: "flex", gap: "0.5rem", maxWidth: "480px" }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit">Send Invitation</button>
      </form>

      <h2>All Invitations</h2>
      {invitations.length === 0 && <p>No invitations yet.</p>}
      <table cellPadding={6} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Email</th>
            <th>Organization</th>
            <th>Status</th>
            <th>Sent</th>
            <th>Expires</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((inv) => (
            <tr key={inv.id} style={{ borderBottom: "1px solid #eee" }}>
              <td>{inv.email}</td>
              <td>{inv.organization?.name ?? "— individual —"}</td>
              <td>{inv.status}</td>
              <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
              <td>{new Date(inv.expiresAt).toLocaleDateString()}</td>
              <td>
                {inv.status === "PENDING" && (
                  <button onClick={() => handleRevoke(inv.id)}>Revoke</button>
                )}
                {(inv.status === "PENDING" || inv.status === "EXPIRED") && (
                  <button onClick={() => handleResend(inv.id)}>Resend</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
