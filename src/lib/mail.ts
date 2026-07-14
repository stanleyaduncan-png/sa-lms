// Invitation email delivery.
//
// EMAIL_SERVER_* in .env.local are still placeholders (smtp.example.com /
// CHANGE_ME) - there's no real SMTP account for this environment yet, so
// this logs the email to the server console instead of sending it. The
// branded HTML/text bodies (EPIC-8 Task 8) are built here so the shape is
// ready for a future Nodemailer transport (using
// EMAIL_SERVER_HOST/PORT/USER/PASSWORD/EMAIL_FROM) - the call site
// (src/actions/invitations.ts) doesn't need to change.

import { invitationEmailHtml, invitationEmailText } from "./emailTemplates";

export async function sendInvitationEmail(to: string, inviteUrl: string) {
  const html = invitationEmailHtml(inviteUrl);
  const text = invitationEmailText(inviteUrl);
  console.log(
    `[mail] Invitation → ${to}\n[mail] Accept link: ${inviteUrl}\n` +
      `[mail] Branded HTML body built (${html.length} chars) + text fallback (${text.length} chars) - not sent, no SMTP configured`
  );
}
