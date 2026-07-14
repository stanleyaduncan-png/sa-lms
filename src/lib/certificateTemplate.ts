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
import { navy as navyScale, gold as goldScale } from "./brand";

// EPIC-8 Task 7: brand colours sourced from src/lib/brand.ts (the single
// hex source of truth) rather than re-guessed here - pdf-lib takes 0-1
// floats, so hex is converted once at module load.
function hexToRgb(hex: string) {
  const int = parseInt(hex.replace("#", ""), 16);
  return rgb(((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255);
}

const navy = hexToRgb(navyScale[900]);
const gold = hexToRgb(goldScale[500]);
const gray = rgb(0.35, 0.35, 0.35);

export const CERTIFICATE_TEMPLATE = {
  title: "Certificate of Completion",
  brandWordmarkNavy: "SHEQ",
  brandWordmarkGold: "PARTNER",
  signatureLine: "Platform Owner",
  bodyText: (courseTitle: string) => `has successfully completed the course "${courseTitle}"`,
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

  // Outer navy border with a thin gold accent rule just inside it.
  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: navy,
    borderWidth: 3,
  });
  page.drawRectangle({
    x: 32,
    y: 32,
    width: width - 64,
    height: height - 64,
    borderColor: gold,
    borderWidth: 1,
  });

  // Brand wordmark (text-based lockup - no logo asset supplied yet, see
  // BrandLogo.tsx TODO). Gold is only ever used as text on navy elsewhere
  // in the app; here it sits on the off-white certificate background, so
  // it's kept to the wordmark only, matching the marketing-banner-style
  // display use the epic spec calls out as the one exception.
  const wordmarkSize = 16;
  const navyPart = CERTIFICATE_TEMPLATE.brandWordmarkNavy + " ";
  const navyPartWidth = boldFont.widthOfTextAtSize(navyPart, wordmarkSize);
  page.drawText(navyPart, {
    x: 50,
    y: height - 80,
    size: wordmarkSize,
    font: boldFont,
    color: navy,
  });
  page.drawText(CERTIFICATE_TEMPLATE.brandWordmarkGold, {
    x: 50 + navyPartWidth,
    y: height - 80,
    size: wordmarkSize,
    font: boldFont,
    color: gold,
  });

  const titleSize = 28;
  const titleWidth = boldFont.widthOfTextAtSize(CERTIFICATE_TEMPLATE.title, titleSize);
  page.drawText(CERTIFICATE_TEMPLATE.title, {
    x: (width - titleWidth) / 2,
    y: height - 160,
    size: titleSize,
    font: boldFont,
    color: navy,
  });

  // Learner name, set apart with its own gold accent rule underneath.
  const nameSize = 26;
  const nameWidth = boldFont.widthOfTextAtSize(learnerName, nameSize);
  const nameY = height - 235;
  page.drawText(learnerName, {
    x: (width - nameWidth) / 2,
    y: nameY,
    size: nameSize,
    font: boldFont,
    color: navy,
  });
  const ruleWidth = Math.max(nameWidth, 160);
  page.drawRectangle({
    x: (width - ruleWidth) / 2,
    y: nameY - 12,
    width: ruleWidth,
    height: 2,
    color: gold,
  });

  const body = CERTIFICATE_TEMPLATE.bodyText(courseTitle);
  const bodySize = 16;
  const bodyWidth = regularFont.widthOfTextAtSize(body, bodySize);
  page.drawText(body, {
    x: Math.max(50, (width - bodyWidth) / 2),
    y: nameY - 50,
    size: bodySize,
    font: regularFont,
    color: navy,
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
