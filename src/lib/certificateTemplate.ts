// CERT-05: certificate layout/branding lives in one config object, not
// scattered hardcoded strings through the PDF generator. Swapping the
// title/branding/signature line later means editing CERTIFICATE_TEMPLATE
// here, not hunting through draw calls.
//
// CERT-01 storage decision (Epic 6 risk #1): PDFs are generated
// on-the-fly on every download rather than stored - no object storage
// provider has been chosen yet (see PROJECT.md §2 "Still undecided"), and
// on-the-fly avoids baking in a choice prematurely. Certificate.pdfUrl is
// a route (/api/certificates/[id]/pdf) that regenerates the PDF from
// current name/course-title data each time it's requested (Epic 6 risk
// #4: if a learner is renamed or a course retitled later, the cert
// reflects current data, not a frozen snapshot - an accepted v1 trade-off).

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const CERTIFICATE_TEMPLATE = {
  title: "Certificate of Completion",
  platformName: "SA LMS",
  signatureLine: "Platform Owner",
  bodyText: (learnerName: string, courseTitle: string) =>
    `This certifies that ${learnerName} has successfully completed the course "${courseTitle}".`,
};

export async function generateCertificatePdf({
  learnerName,
  courseTitle,
  issuedAt,
}: {
  learnerName: string;
  courseTitle: string;
  issuedAt: Date;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 landscape, in points
  const { width, height } = page.getSize();

  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const navy = rgb(0.11, 0.16, 0.32);
  const gray = rgb(0.35, 0.35, 0.35);

  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: navy,
    borderWidth: 3,
  });

  page.drawText(CERTIFICATE_TEMPLATE.platformName, {
    x: 50,
    y: height - 80,
    size: 14,
    font: regularFont,
    color: gray,
  });

  const titleSize = 32;
  const titleWidth = boldFont.widthOfTextAtSize(CERTIFICATE_TEMPLATE.title, titleSize);
  page.drawText(CERTIFICATE_TEMPLATE.title, {
    x: (width - titleWidth) / 2,
    y: height - 160,
    size: titleSize,
    font: boldFont,
    color: navy,
  });

  const body = CERTIFICATE_TEMPLATE.bodyText(learnerName, courseTitle);
  const bodySize = 16;
  const bodyWidth = regularFont.widthOfTextAtSize(body, bodySize);
  page.drawText(body, {
    x: Math.max(50, (width - bodyWidth) / 2),
    y: height - 260,
    size: bodySize,
    font: regularFont,
    color: rgb(0, 0, 0),
    maxWidth: width - 100,
  });

  const dateText = `Issued: ${issuedAt.toLocaleDateString()}`;
  page.drawText(dateText, {
    x: 60,
    y: 90,
    size: 12,
    font: regularFont,
    color: gray,
  });

  const signatureText = CERTIFICATE_TEMPLATE.signatureLine;
  const signatureWidth = regularFont.widthOfTextAtSize(signatureText, 12);
  page.drawText(signatureText, {
    x: width - 60 - signatureWidth,
    y: 90,
    size: 12,
    font: regularFont,
    color: gray,
  });

  return pdfDoc.save();
}
