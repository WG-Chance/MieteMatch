import { createResendClient, FROM_EMAIL, FROM_NAME } from "./client";

interface SlaBreachParams {
  to: string;
  orgName: string;
  ticketNumber: number;
  subject: string;
  priority: string;
  breachType: "FIRST_RESPONSE" | "RESOLUTION";
  overdueByMinutes: number;
  ticketUrl: string;
}

export async function sendSlaBreachEmail(params: SlaBreachParams): Promise<void> {
  const resend = createResendClient();
  const hours = Math.floor(params.overdueByMinutes / 60);
  const mins = params.overdueByMinutes % 60;
  const overdueStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  try {
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.to,
      subject: `⚠️ SLA Breach: #${params.ticketNumber} — ${params.subject}`,
      html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f8fafc;margin:0;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;border:2px solid #ef4444;padding:32px;">
    <h2 style="color:#ef4444;margin:0 0 16px;">⚠️ SLA Breach Detected</h2>
    <p style="color:#64748b;">The following ticket has breached its ${params.breachType === "FIRST_RESPONSE" ? "first response" : "resolution"} SLA by <strong>${overdueStr}</strong>:</p>
    <div style="background:#fef2f2;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #fecaca;">
      <p style="margin:0;font-weight:700;color:#1e293b;">#${params.ticketNumber} — ${params.subject}</p>
      <p style="margin:4px 0 0;color:#64748b;font-size:14px;">Priority: ${params.priority}</p>
    </div>
    <a href="${params.ticketUrl}" style="display:inline-block;background:#ef4444;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
      Resolve Immediately →
    </a>
  </div>
</body></html>`,
    });
  } catch (error) {
    console.error("[FlowDesk Email] sla-breach failed:", error);
  }
}
