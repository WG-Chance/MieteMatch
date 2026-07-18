import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { sendTicketAssignedEmail } from "@flowdesk/emails";

const assignSchema = z.object({
  assignedToId: z.string().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 });

  const ticket = await db.ticket.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
    select: { id: true, number: true, subject: true, priority: true, assignedToId: true },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify assignee is a member
  if (parsed.data.assignedToId) {
    const member = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: session.user.organizationId,
          userId: parsed.data.assignedToId,
        },
      },
    });
    if (!member || !member.isActive) {
      return NextResponse.json({ error: "Assignee is not an active member" }, { status: 400 });
    }
  }

  const updated = await db.ticket.update({
    where: { id: params.id },
    data: { assignedToId: parsed.data.assignedToId, lastActivityAt: new Date() },
    include: { assignedTo: { select: { name: true, email: true } } },
  });

  // Notify newly assigned agent
  if (parsed.data.assignedToId && parsed.data.assignedToId !== ticket.assignedToId) {
    const assignee = await db.user.findUnique({
      where: { id: parsed.data.assignedToId },
      select: { email: true, name: true },
    });
    if (assignee?.email) {
      sendTicketAssignedEmail({
        to: assignee.email,
        agentName: assignee.name ?? "Agent",
        ticketNumber: ticket.number,
        subject: ticket.subject,
        priority: ticket.priority,
        ticketUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tickets/${ticket.id}`,
      }).catch(console.error);
    }
  }

  await audit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "TICKET_ASSIGNED",
    entityId: params.id,
    entityType: "Ticket",
    before: { assignedToId: ticket.assignedToId },
    after: { assignedToId: parsed.data.assignedToId },
  });

  return NextResponse.json(updated);
}
