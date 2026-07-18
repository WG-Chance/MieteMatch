import { createResendClient, FROM_EMAIL, FROM_NAME } from "./client";

interface TicketCreatedParams {
  to: string;
  customerName: string;
  ticketNumber: number;
  subject: string;
  orgName: string;
  ticketUrl: string;
}

export async function sendTicketCreatedEmail(params: TicketCreatedParams): Promise<void> {
  const resend = createResendClient();
  try {
    await resend.emails.send({
      from: `${params.orgName} via ${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.to,
      subject: `[#${params.ticketNumber}] We received your request: ${params.subject}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:32px 16px;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;">
      <h1 style="color:white;margin:0;font-size:20px;font-weight:700;">FlowDesk Support</h1>
      <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px;">${params.orgName}</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#334155;margin:0 0 16px;">Hi ${params.customerName},</p>
      <p style="color:#64748b;line-height:1.6;margin:0 0 24px;">
        We've received your support request and our team will get back to you shortly.
      </p>
      <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:0 0 24px;">
        <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em;">Ticket</p>
        <p style="color:#1e293b;font-weight:700;font-size:16px;margin:0;">#${params.ticketNumber} — ${params.subject}</p>
      </div>
      <a href="${params.ticketUrl}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
        View Ticket Status →
      </a>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">Powered by FlowDesk · Reply to this email to respond</p>
    </div>
  </div>
</body>
</html>`,
    });
  } catch (error) {
    console.error("[FlowDesk Email] ticket-created failed:", error);
  }
}
