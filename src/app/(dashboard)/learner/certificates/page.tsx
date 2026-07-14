// Learner: my certificates (CERT-03). Strictly scoped to the session
// user's own certificates via getMyCertificates.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMyCertificates } from "@/actions/certificates";
import DashboardShell from "@/components/DashboardShell";
import { card, link } from "@/lib/ui";

export default async function LearnerCertificatesPage() {
  const session = await getServerSession(authOptions);
  console.log("[learner/certificates] session role:", session?.user.role);

  const certificates = await getMyCertificates();

  return (
    <DashboardShell role="LEARNER" userName={session?.user.name} userEmail={session?.user.email} title="My Certificates">
      {certificates.length === 0 && (
        <p className="text-navy-700">No certificates yet — complete a course to earn one.</p>
      )}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {certificates.map((cert) => (
          <li key={cert.id} className={card}>
            <strong className="text-navy-900">{cert.course.title}</strong>
            <div className="mt-1 text-sm text-navy-700">
              Issued: {new Date(cert.issuedAt).toLocaleDateString()}
            </div>
            <a href={cert.pdfUrl} className={`${link} mt-2 inline-block`}>Download PDF</a>
          </li>
        ))}
      </ul>
    </DashboardShell>
  );
}
