// Certificate PDF download (CERT-03). A route handler, not a server
// action, because this needs to stream a binary response with
// Content-Disposition headers - not a fit for a JSON-serializable RPC
// call. Authorization itself still lives in the action layer
// (getCertificateForDownload), not here, per the README convention.

import { NextRequest, NextResponse } from "next/server";
import { getCertificateForDownload } from "@/actions/certificates";
import { generateCertificatePdf } from "@/lib/certificateTemplate";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  const { certificateId } = await params;
  const result = await getCertificateForDownload(certificateId);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  const { certificate } = result;
  const pdfBytes = await generateCertificatePdf({
    learnerName: certificate.user.name ?? certificate.user.email,
    courseTitle: certificate.course.title,
    issuedAt: certificate.issuedAt,
  });

  const filename = `certificate-${certificate.course.title.replace(/[^a-z0-9]+/gi, "-")}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
