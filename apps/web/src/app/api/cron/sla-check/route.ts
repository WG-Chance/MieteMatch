import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSlaBreachEmail } from "@flowdesk/emails";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Vercel cron authorization
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[Cron] CRON_SECRET env var is not set — refusing to run");
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find tickets that should be marked as BREACHED
  const toBreach = await db.ticket.findMany({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS"] },
      slaStatus: { not: "BREACHED" },
      OR: [
        { slaFirstResponseDue: { lt: now } },
        { slaResolutionDue: { lt: now } },
      ],
    },
    select: {
      id: true, number: true, subject: true, priority: true,
      organizationId: true, slaFirstResponseDue: true, slaResolutionDue: true,
    },
    take: 100,
  });

  let breached = 0;
  let warned = 0;

  for (const ticket of toBreach) {
    const firstResponseBreached = ticket.slaFirstResponseDue && ticket.slaFirstResponseDue < now;
    const resolutionBreached = ticket.slaResolutionDue && ticket.slaResolutionDue < now;

    await db.ticket.update({
      where: { id: ticket.id },
      data: { slaStatus: "BREACHED", slaBreachedAt: now },
    });

    // Notify org admins
    const [admins, org] = await Promise.all([
      db.organizationMember.findMany({
        where: { organizationId: ticket.organizationId, role: { in: ["OWNER","ADMIN"] }, isActive: true },
        include: { user: { select: { email: true } } },
      }),
      db.organization.findUnique({
        where: { id: ticket.organizationId },
        select: { name: true },
      }),
    ]);

    for (const admin of admins) {
      if (admin.user.email) {
        const breachType = firstResponseBreached ? "FIRST_RESPONSE" : "RESOLUTION";
        const dueDate = firstResponseBreached ? ticket.slaFirstResponseDue! : ticket.slaResolutionDue!;
        const overdueMs = now.getTime() - dueDate.getTime();
        const overdueMinutes = Math.floor(overdueMs / 60000);

        sendSlaBreachEmail({
          to: admin.user.email,
          orgName: org?.name ?? ticket.organizationId,
          ticketNumber: ticket.number,
          subject: ticket.subject,
          priority: ticket.priority,
          breachType,
          overdueByMinutes: overdueMinutes,
          ticketUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tickets/${ticket.id}`,
        }).catch(console.error);
      }
    }

    await audit({
      organizationId: ticket.organizationId,
      action: "SLA_BREACHED",
      entityId: ticket.id,
      entityType: "Ticket",
      after: { priority: ticket.priority, overdueMinutes: 0 },
    });

    breached++;
  }

  // Find tickets approaching breach (2 hours)
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const toWarn = await db.ticket.findMany({
    where: {
      status: { in: ["OPEN","IN_PROGRESS"] },
      slaStatus: "OK",
      OR: [
        { slaResolutionDue: { gte: now, lt: twoHoursFromNow } },
      ],
    },
    select: { id: true },
    take: 100,
  });

  for (const ticket of toWarn) {
    await db.ticket.update({ where: { id: ticket.id }, data: { slaStatus: "WARNING" } });
    warned++;
  }

  return NextResponse.json({ processed: toBreach.length, breached, warned, timestamp: now.toISOString() });
}
