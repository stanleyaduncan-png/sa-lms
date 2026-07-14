// Owner: all issued certificates, across all orgs and individuals.
// Protected by src/middleware.ts (role === OWNER).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllCertificates } from "@/actions/certificates";

export default async function OwnerCertificatesPage() {
  const session = await getServerSession(authOptions);
  console.log("[owner/certificates] session role:", session?.user.role);

  const certificates = await getAllCertificates();

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>All Certificates</h1>
      <p>
        <a href="/owner">← Back to dashboard</a>
      </p>
      {certificates.length === 0 && <p>No certificates issued yet.</p>}
      <table cellPadding={6} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Learner</th>
            <th>Organization</th>
            <th>Course</th>
            <th>Issued</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {certificates.map((cert) => (
            <tr key={cert.id} style={{ borderBottom: "1px solid #eee" }}>
              <td>
                {cert.user.name} ({cert.user.email})
              </td>
              <td>{cert.user.organization?.name ?? "— individual —"}</td>
              <td>{cert.course.title}</td>
              <td>{new Date(cert.issuedAt).toLocaleDateString()}</td>
              <td>
                <a href={cert.pdfUrl}>Download</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
