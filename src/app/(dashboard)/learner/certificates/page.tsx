// Learner: my certificates (CERT-03). Strictly scoped to the session
// user's own certificates via getMyCertificates.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMyCertificates } from "@/actions/certificates";

export default async function LearnerCertificatesPage() {
  const session = await getServerSession(authOptions);
  console.log("[learner/certificates] session role:", session?.user.role);

  const certificates = await getMyCertificates();

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>My Certificates</h1>
      <p>
        <a href="/learner">← Back to my courses</a>
      </p>
      {certificates.length === 0 && <p>No certificates yet — complete a course to earn one.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {certificates.map((cert) => (
          <li key={cert.id} style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
            <strong>{cert.course.title}</strong>
            <div>Issued: {new Date(cert.issuedAt).toLocaleDateString()}</div>
            <a href={cert.pdfUrl}>Download PDF</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
