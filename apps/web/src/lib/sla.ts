import { db } from "@/lib/db";
import type { TicketPriority, SlaPolicy } from "@prisma/client";

export function calculateSlaDueDates(
  createdAt: Date,
  priority: TicketPriority,
  policy: SlaPolicy
): { firstResponseDue: Date; resolutionDue: Date } {
  function addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }

  const responseHoursMap: Record<TicketPriority, number> = {
    CRITICAL: policy.criticalResponseHours,
    HIGH: policy.highResponseHours,
    MEDIUM: policy.mediumResponseHours,
    LOW: policy.lowResponseHours,
  };
  const resolutionHoursMap: Record<TicketPriority, number> = {
    CRITICAL: policy.criticalResolutionHours,
    HIGH: policy.highResolutionHours,
    MEDIUM: policy.mediumResolutionHours,
    LOW: policy.lowResolutionHours,
  };

  return {
    firstResponseDue: addHours(createdAt, responseHoursMap[priority]),
    resolutionDue: addHours(createdAt, resolutionHoursMap[priority]),
  };
}

export async function checkAndUpdateSlaStatus(): Promise<void> {
  const now = new Date();
  const openTickets = await db.ticket.findMany({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS"] },
      slaStatus: { not: "BREACHED" },
      OR: [
        { slaFirstResponseDue: { lt: now } },
        { slaResolutionDue: { lt: now } },
      ],
    },
    select: { id: true, slaFirstResponseDue: true, slaResolutionDue: true, organizationId: true },
  });

  for (const ticket of openTickets) {
    const isBreached =
      (ticket.slaFirstResponseDue && ticket.slaFirstResponseDue < now) ||
      (ticket.slaResolutionDue && ticket.slaResolutionDue < now);

    const newStatus =
      isBreached ? "BREACHED" :
      (ticket.slaResolutionDue && ticket.slaResolutionDue < new Date(now.getTime() + 2 * 60 * 60 * 1000))
        ? "WARNING"
        : "OK";

    await db.ticket.update({
      where: { id: ticket.id },
      data: {
        slaStatus: newStatus,
        ...(isBreached && !ticket.slaFirstResponseDue ? {} : {}),
      },
    });
  }
}
