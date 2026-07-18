import { createResendClient, FROM_EMAIL, FROM_NAME } from "./client";

interface TicketAssignedParams {
  to: string;
  agentName: string;
  ticketNumber: number;
  subject: string;
  priority: string;
  ticketUrl: string;
}

export async function sendTicketAssignedEmail(params: TicketAssignedParams): Promise<void> {
  const resend = createResendClient();
  const priorityColor: Record<string, string> = {
    CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#22c55e",
  };
  const color = priorityColor[params.priority] ?? "#6366f1";
  try {
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.to,
      subject: `[Assigned] #${params.ticketNumber} — ${params.subject}`,
      html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f8fafc;margin:0;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;border:1px solid #e2e8f0;padding:32px;">
    <h2 style="color:#1e293b;margin:0 0 16px;">Ticket Assigned to You</h2>
    <p style="color:#64748b;">Hi ${params.agentName}, a ticket has been assigned to you:</p>
    <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;"><strong style="color:#1e293b;">#${params.ticketNumber}</strong> — ${params.subject}</p>
      <span style="display:inline-block;background:${color};color:white;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;">${params.priority}</span>
    </div>
    <a href="${params.ticketUrl}" style="display:inline-block;background:#6366f1;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
      Open Ticket →
    </a>
  </div>
</body></html>`,
    });
  } catch (error) {
    console.error("[FlowDesk Email] ticket-assigned failed:", error);
  }
}
