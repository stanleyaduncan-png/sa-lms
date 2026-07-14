// Org Admin: certificates earned by their own org's learners (CERT-04).
// Protected by src/middleware.ts (role === ORG_ADMIN or OWNER).

import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrgCertificates } from "@/actions/certificates";
import DashboardShell from "@/components/DashboardShell";
import { tableWrap, table, tableHeadRow, tableHeadCell, tableRow, tableCell, link } from "@/lib/ui";

export default async function OrgAdminCertificatesPage() {
  const session = await getServerSession(authOptions);
  console.log("[org-admin/certificates] session role:", session?.user.role);

  if (session?.user.role !== "ORG_ADMIN") {
    return (
      <DashboardShell role="OWNER" userName={session?.user.name} userEmail={session?.user.email} title="Certificates">
        <p className="text-navy-700">This view is scoped to a single organization&apos;s Org Admin.</p>
        <p>
          <Link href="/owner/certificates" className={link}>Go to Owner certificates</Link>
        </p>
      </DashboardShell>
    );
  }

  const certificates = await getOrgCertificates();

  return (
    <DashboardShell role="ORG_ADMIN" userName={session?.user.name} userEmail={session?.user.email} title="Learner Certificates">
      {certificates.length === 0 && <p className="text-navy-700">No certificates issued yet.</p>}
      {certificates.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Learner</th>
                <th className={tableHeadCell}>Course</th>
                <th className={tableHeadCell}>Issued</th>
                <th className={tableHeadCell}></th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((cert) => (
                <tr key={cert.id} className={tableRow}>
                  <td className={tableCell}>
                    {cert.user.name} ({cert.user.email})
                  </td>
                  <td className={tableCell}>{cert.course.title}</td>
                  <td className={tableCell}>{new Date(cert.issuedAt).toLocaleDateString()}</td>
                  <td className={tableCell}>
                    <a href={cert.pdfUrl} className={link}>Download</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
