import { createResendClient, FROM_EMAIL, FROM_NAME } from "./client";

interface TicketReplyParams {
  to: string;
  customerName: string;
  ticketNumber: number;
  subject: string;
  orgName: string;
  agentName: string;
  replyContent: string;
  ticketUrl: string;
}

export async function sendTicketReplyEmail(params: TicketReplyParams): Promise<void> {
  const resend = createResendClient();
  const escaped = params.replyContent.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  try {
    await resend.emails.send({
      from: `${params.orgName} via ${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.to,
      subject: `Re: [#${params.ticketNumber}] ${params.subject}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:32px 16px;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px 32px;">
      <h1 style="color:white;margin:0;font-size:18px;font-weight:700;">${params.orgName} Support</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#334155;margin:0 0 8px;">Hi ${params.customerName},</p>
      <p style="color:#64748b;margin:0 0 20px;font-size:14px;">${params.agentName} replied to ticket #${params.ticketNumber}:</p>
      <div style="border-left:3px solid #6366f1;padding:12px 16px;background:#f8f8ff;border-radius:0 8px 8px 0;margin:0 0 24px;">
        <p style="color:#334155;margin:0;line-height:1.6;">${escaped}</p>
      </div>
      <a href="${params.ticketUrl}" style="display:inline-block;background:#6366f1;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
        View Full Conversation →
      </a>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">Reply to this email to respond · Powered by FlowDesk</p>
    </div>
  </div>
</body>
</html>`,
    });
  } catch (error) {
    console.error("[FlowDesk Email] ticket-reply failed:", error);
  }
}
