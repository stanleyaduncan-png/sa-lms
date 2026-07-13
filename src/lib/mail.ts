// Invitation email delivery.
//
// EMAIL_SERVER_* in .env.local are still placeholders (smtp.example.com /
// CHANGE_ME) - there's no real SMTP account for this environment yet, so
// this logs the email to the server console instead of sending it. Swap
// the body of sendInvitationEmail for a Nodemailer transport (using
// EMAIL_SERVER_HOST/PORT/USER/PASSWORD/EMAIL_FROM) once real credentials
// are available - the call site (src/actions/invitations.ts) doesn't need
// to change.

export async function sendInvitationEmail(to: string, inviteUrl: string) {
  console.log(`[mail] Invitation → ${to}\n[mail] Accept link: ${inviteUrl}`);
}
