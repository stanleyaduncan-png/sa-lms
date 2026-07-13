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
      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>Create Organization</h2>
      <form onSubmit={handleCreate} style={{ display: "flex", gap: "0.5rem", maxWidth: "480px" }}>
        <input
          placeholder="Name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          placeholder="Seat limit"
          type="number"
          min={1}
          value={newSeatLimit}
          onChange={(e) => setNewSeatLimit(e.target.value)}
        />
        <button type="submit">Create</button>
      </form>

      <h2>Organizations</h2>
      {organizations.length === 0 && <p>No organizations yet.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {organizations.map((org) => (
          <li
            key={org.id}
            style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}
          >
            {editingId === org.id ? (
              <form onSubmit={(e) => handleUpdate(e, org.id)} style={{ display: "flex", gap: "0.5rem" }}>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                <input
                  type="number"
                  min={1}
                  value={editSeatLimit}
                  onChange={(e) => setEditSeatLimit(e.target.value)}
                />
                <button type="submit">Save</button>
                <button type="button" onClick={() => setEditingId(null)}>
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <strong>{org.name}</strong> — {org.isActive ? "Active" : "Deactivated"}
                <div>Seats: {org.seatsUsed} / {org.seatLimit}</div>
                <div>
                  Org Admin(s):{" "}
                  {org.admins.length > 0
                    ? org.admins.map((a) => a.email).join(", ")
                    : "none assigned"}
                </div>
                <div style={{ marginTop: "0.5rem" }}>
                  <button onClick={() => startEdit(org)}>Edit</button>{" "}
                  {org.isActive && (
                    <button onClick={() => handleDeactivate(org.id)}>Deactivate</button>
                  )}
                </div>
                <form
                  onSubmit={(e) => handleAssignAdmin(e, org.id)}
                  style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}
                >
                  <input
                    placeholder="Assign Org Admin by email"
                    type="email"
                    value={adminEmailByOrg[org.id] ?? ""}
                    onChange={(e) =>
                      setAdminEmailByOrg((prev) => ({ ...prev, [org.id]: e.target.value }))
                    }
                  />
                  <button type="submit">Assign Org Admin</button>
                </form>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
