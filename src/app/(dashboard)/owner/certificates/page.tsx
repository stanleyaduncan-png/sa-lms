// Owner: all issued certificates, across all orgs and individuals.
// Protected by src/middleware.ts (role === OWNER).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllCertificates } from "@/actions/certificates";
import DashboardShell from "@/components/DashboardShell";
import { tableWrap, table, tableHeadRow, tableHeadCell, tableRow, tableCell, link } from "@/lib/ui";

export default async function OwnerCertificatesPage() {
  const session = await getServerSession(authOptions);
  console.log("[owner/certificates] session role:", session?.user.role);

  const certificates = await getAllCertificates();

  return (
    <DashboardShell role="OWNER" userName={session?.user.name} userEmail={session?.user.email} title="All Certificates">
      {certificates.length === 0 && <p className="text-navy-700">No certificates issued yet.</p>}
      {certificates.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Learner</th>
                <th className={tableHeadCell}>Organization</th>
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
                  <td className={tableCell}>{cert.user.organization?.name ?? "— individual —"}</td>
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
