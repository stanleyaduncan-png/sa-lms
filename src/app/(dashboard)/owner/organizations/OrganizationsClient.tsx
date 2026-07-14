"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createOrganization,
  updateOrganization,
  deactivateOrganization,
  assignOrgAdmin,
  getOrganizationsWithUsage,
} from "@/actions/organizations";
import {
  btnPrimary,
  btnSecondary,
  btnTertiary,
  btnDestructive,
  input,
  errorText,
  sectionHeading,
  card,
} from "@/lib/ui";

type Organization = Awaited<ReturnType<typeof getOrganizationsWithUsage>>[number];

export default function OrganizationsClient({
  organizations,
}: {
  organizations: Organization[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newSeatLimit, setNewSeatLimit] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSeatLimit, setEditSeatLimit] = useState("");

  const [adminEmailByOrg, setAdminEmailByOrg] = useState<Record<string, string>>({});

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await createOrganization(newName, Number(newSeatLimit));
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    setNewName("");
    setNewSeatLimit("");
    router.refresh();
  }

  function startEdit(org: Organization) {
    setEditingId(org.id);
    setEditName(org.name);
    setEditSeatLimit(String(org.seatLimit));
  }

  async function handleUpdate(e: FormEvent, id: string) {
    e.preventDefault();
    setError(null);
    const result = await updateOrganization(id, editName, Number(editSeatLimit));
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function handleDeactivate(id: string) {
    setError(null);
    const result = await deactivateOrganization(id);
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    router.refresh();
  }

  async function handleAssignAdmin(e: FormEvent, orgId: string) {
    e.preventDefault();
    setError(null);
    const email = adminEmailByOrg[orgId] ?? "";
    const result = await assignOrgAdmin(orgId, email);
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    setAdminEmailByOrg((prev) => ({ ...prev, [orgId]: "" }));
    router.refresh();
  }

  return (
    <div>
      {error && <p className={errorText}>{error}</p>}

      <h2 className={sectionHeading}>Create Organization</h2>
      <form onSubmit={handleCreate} className="flex max-w-md gap-2">
        <input
          placeholder="Name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className={input}
        />
        <input
          placeholder="Seat limit"
          type="number"
          min={1}
          value={newSeatLimit}
          onChange={(e) => setNewSeatLimit(e.target.value)}
          className={input}
        />
        <button type="submit" className={btnPrimary}>Create</button>
      </form>

      <h2 className={sectionHeading}>Organizations</h2>
      {organizations.length === 0 && <p className="text-navy-700">No organizations yet.</p>}
      <ul className="grid grid-cols-1 gap-4">
        {organizations.map((org) => (
          <li key={org.id} className={card}>
            {editingId === org.id ? (
              <form onSubmit={(e) => handleUpdate(e, org.id)} className="flex flex-wrap items-center gap-2">
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className={input} />
                <input
                  type="number"
                  min={1}
                  value={editSeatLimit}
                  onChange={(e) => setEditSeatLimit(e.target.value)}
                  className={input}
                />
                <button type="submit" className={btnPrimary}>Save</button>
                <button type="button" onClick={() => setEditingId(null)} className={btnTertiary}>
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <strong className="text-navy-900">{org.name}</strong>{" "}
                <span className="text-sm text-navy-600">— {org.isActive ? "Active" : "Deactivated"}</span>
                <div className="mt-1 text-sm text-navy-700">Seats: {org.seatsUsed} / {org.seatLimit}</div>
                <div className="mt-1 text-sm text-navy-700">
                  Org Admin(s):{" "}
                  {org.admins.length > 0
                    ? org.admins.map((a) => a.email).join(", ")
                    : "none assigned"}
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => startEdit(org)} className={btnTertiary}>Edit</button>
                  {org.isActive && (
                    <button onClick={() => handleDeactivate(org.id)} className={btnDestructive}>Deactivate</button>
                  )}
                </div>
                <form
                  onSubmit={(e) => handleAssignAdmin(e, org.id)}
                  className="mt-3 flex gap-2"
                >
                  <input
                    placeholder="Assign Org Admin by email"
                    type="email"
                    value={adminEmailByOrg[org.id] ?? ""}
                    onChange={(e) =>
                      setAdminEmailByOrg((prev) => ({ ...prev, [org.id]: e.target.value }))
                    }
                    className={input}
                  />
                  <button type="submit" className={btnSecondary}>Assign Org Admin</button>
                </form>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
