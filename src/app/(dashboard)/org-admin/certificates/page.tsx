// Org Admin: certificates earned by their own org's learners (CERT-04).
// Protected by src/middleware.ts (role === ORG_ADMIN or OWNER).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrgCertificates } from "@/actions/certificates";

export default async function OrgAdminCertificatesPage() {
  const session = await getServerSession(authOptions);
  console.log("[org-admin/certificates] session role:", session?.user.role);

  if (session?.user.role !== "ORG_ADMIN") {
    return (
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h1>Certificates</h1>
        <p>This view is scoped to a single organization&apos;s Org Admin.</p>
        <p>
          <a href="/owner/certificates">Go to Owner certificates</a>
        </p>
      </main>
    );
  }

  const certificates = await getOrgCertificates();

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Learner Certificates</h1>
      <p>
        <a href="/org-admin">← Back to dashboard</a>
      </p>
      {certificates.length === 0 && <p>No certificates issued yet.</p>}
      <table cellPadding={6} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Learner</th>
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
