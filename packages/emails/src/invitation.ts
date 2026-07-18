import { createResendClient, FROM_EMAIL, FROM_NAME } from "./client";

interface InvitationParams {
  to: string;
  orgName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
  expiresAt: Date;
}

export async function sendInvitationEmail(params: InvitationParams): Promise<void> {
  const resend = createResendClient();
  try {
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.to,
      subject: `You've been invited to join ${params.orgName} on FlowDesk`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:22px;">You're Invited 🎉</h1>
    </div>
    <div style="padding:32px;text-align:center;">
      <p style="color:#334155;font-size:16px;margin:0 0 8px;">
        <strong>${params.inviterName}</strong> invited you to join
      </p>
      <p style="color:#6366f1;font-size:24px;font-weight:700;margin:0 0 8px;">${params.orgName}</p>
      <p style="color:#64748b;margin:0 0 24px;">as a <strong>${params.role}</strong> on FlowDesk</p>
      <a href="${params.acceptUrl}" style="display:inline-block;background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;margin-bottom:16px;">
        Accept Invitation →
      </a>
      <p style="color:#94a3b8;font-size:12px;margin:0;">Expires ${params.expiresAt.toLocaleDateString()}</p>
    </div>
  </div>
</body>
</html>`,
    });
  } catch (error) {
    console.error("[FlowDesk Email] invitation failed:", error);
  }
}
