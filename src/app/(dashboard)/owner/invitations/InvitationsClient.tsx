"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  sendInvitation,
  resendInvitation,
  revokeInvitation,
  getAllInvitations,
} from "@/actions/invitations";
import StatusBadge from "@/components/StatusBadge";
import {
  btnPrimary,
  btnTertiary,
  input,
  errorText,
  successText,
  sectionHeading,
  tableWrap,
  table,
  tableHeadRow,
  tableHeadCell,
  tableRow,
  tableCell,
} from "@/lib/ui";

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
      {error && <p className={errorText}>{error}</p>}
      {info && <p className={successText}>{info}</p>}

      <h2 className={sectionHeading}>Invite Individual Learner</h2>
      <form onSubmit={handleInvite} className="flex max-w-md gap-2">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={input}
        />
        <button type="submit" className={btnPrimary}>Send Invitation</button>
      </form>

      <h2 className={sectionHeading}>All Invitations</h2>
      {invitations.length === 0 && <p className="text-navy-700">No invitations yet.</p>}
      {invitations.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Email</th>
                <th className={tableHeadCell}>Organization</th>
                <th className={tableHeadCell}>Status</th>
                <th className={tableHeadCell}>Sent</th>
                <th className={tableHeadCell}>Expires</th>
                <th className={tableHeadCell}></th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} className={tableRow}>
                  <td className={tableCell}>{inv.email}</td>
                  <td className={tableCell}>{inv.organization?.name ?? "— individual —"}</td>
                  <td className={tableCell}>
                    {inv.status === "ACCEPTED" ? (
                      <StatusBadge kind="complete" label="Accepted" />
                    ) : inv.status === "PENDING" ? (
                      <StatusBadge kind="in-progress" label="Pending" />
                    ) : inv.status === "EXPIRED" ? (
                      <StatusBadge kind="expired" label="Expired" />
                    ) : (
                      <StatusBadge kind="expired" label={inv.status} />
                    )}
                  </td>
                  <td className={tableCell}>{new Date(inv.createdAt).toLocaleDateString()}</td>
                  <td className={tableCell}>{new Date(inv.expiresAt).toLocaleDateString()}</td>
                  <td className={tableCell}>
                    <div className="flex gap-2">
                      {inv.status === "PENDING" && (
                        <button onClick={() => handleRevoke(inv.id)} className={btnTertiary}>Revoke</button>
                      )}
                      {(inv.status === "PENDING" || inv.status === "EXPIRED") && (
                        <button onClick={() => handleResend(inv.id)} className={btnTertiary}>Resend</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
