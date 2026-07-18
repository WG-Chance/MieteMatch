import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { sendTicketReplyEmail } from "@flowdesk/emails";

const replySchema = z.object({
  content: z.string().min(1).max(50000),
  isInternal: z.boolean().default(false),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, "tickets");
  if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ticket = await db.ticket.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
    include: {
      customer: { select: { email: true, name: true } },
      assignedTo: { select: { name: true } },
    },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 });

  const reply = await db.ticketReply.create({
    data: {
      ticketId: params.id,
      authorId: session.user.id,
      authorType: "AGENT",
      content: parsed.data.content,
      isInternal: parsed.data.isInternal,
    },
    include: { author: { select: { name: true, image: true } } },
  });

  await db.ticket.update({
    where: { id: params.id },
    data: {
      lastActivityAt: new Date(),
      // Mark as IN_PROGRESS when agent first replies
      status: ticket.status === "OPEN" ? "IN_PROGRESS" : undefined,
    },
  });

  // Send email to customer (not for internal notes)
  if (!parsed.data.isInternal && ticket.customer?.email) {
    const agent = await db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });
    const org = await db.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { name: true },
    });
    sendTicketReplyEmail({
      to: ticket.customer.email,
      customerName: ticket.customer.name ?? "there",
      ticketNumber: ticket.number,
      subject: ticket.subject,
      orgName: org?.name ?? "Support",
      agentName: agent?.name ?? "Support Team",
      replyContent: parsed.data.content,
      ticketUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tickets/${ticket.number}`,
    }).catch(console.error);
  }

  await audit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: parsed.data.isInternal ? "NOTE_ADDED" : "REPLY_SENT",
    entityId: params.id,
    entityType: "Ticket",
  });

  return NextResponse.json(reply, { status: 201 });
}
