// EPIC-8 Task 8: branded invitation email. Most email clients strip
// <style> blocks and ignore Tailwind classes entirely, so this uses
// inline styles and table-based layout exclusively - the one email-safe
// approach that survives Outlook/Gmail/etc. Colours are hardcoded from
// src/lib/brand.ts rather than imported, since this string may eventually
// be handed to an external mail-sending service that only accepts a raw
// HTML string (no build-time module resolution).

const NAVY = "#011635";
const GOLD = "#F7B40B";
const OFF_WHITE = "#F7F7F7";

export function invitationEmailHtml(inviteUrl: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:${OFF_WHITE};font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${OFF_WHITE};padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background-color:${NAVY};padding:24px 32px;">
                <span style="font-size:18px;font-weight:bold;color:#ffffff;">SHEQ</span>
                <span style="font-size:18px;font-weight:bold;color:${GOLD};">&nbsp;PARTNER</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:${NAVY};font-size:15px;line-height:1.5;">
                <p style="margin:0 0 16px 0;">You've been invited to join SHEQ Partner, an invite-only learning platform.</p>
                <p style="margin:0 0 24px 0;">Click below to set up your account.</p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color:${GOLD};border-radius:6px;">
                      <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:bold;color:${NAVY};text-decoration:none;">Accept invitation</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0 0;font-size:13px;color:#5A687C;">If the button doesn't work, copy and paste this link into your browser:<br>${inviteUrl}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function invitationEmailText(inviteUrl: string): string {
  return `You've been invited to join SHEQ Partner, an invite-only learning platform.\n\nAccept your invitation: ${inviteUrl}`;
}
