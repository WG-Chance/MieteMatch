import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

const updateSchema = z.object({
  status: z.enum(["OPEN","IN_PROGRESS","WAITING_ON_CUSTOMER","RESOLVED","CLOSED"]).optional(),
  priority: z.enum(["CRITICAL","HIGH","MEDIUM","LOW"]).optional(),
  subject: z.string().min(3).max(255).optional(),
  assignedToId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ticket = await db.ticket.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
    include: {
      customer: true,
      assignedTo: { select: { id: true, name: true, image: true, email: true } },
      tags: { include: { tag: true } },
      aiTriage: true,
      replies: {
        include: { author: { select: { name: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(ticket);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, "tickets");
  if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ticket = await db.ticket.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 });

  const { tagIds, ...updateData } = parsed.data;
  const now = new Date();

  const updated = await db.ticket.update({
    where: { id: params.id },
    data: {
      ...updateData,
      lastActivityAt: now,
      ...(updateData.status === "RESOLVED" ? { resolvedAt: now } : {}),
      ...(updateData.status === "CLOSED" ? { closedAt: now } : {}),
      ...(tagIds !== undefined ? {
        tags: {
          deleteMany: {},
          create: tagIds.map(tagId => ({ tagId })),
        },
      } : {}),
    },
    include: {
      customer: true,
      assignedTo: { select: { id: true, name: true, image: true } },
      tags: { include: { tag: true } },
      aiTriage: true,
    },
  });

  // Determine audit action
  let action: Parameters<typeof audit>[0]["action"] = "TICKET_UPDATED";
  if (updateData.status) action = "TICKET_STATUS_CHANGED";
  else if (updateData.priority) action = "TICKET_PRIORITY_CHANGED";
  else if (updateData.assignedToId !== undefined) action = "TICKET_ASSIGNED";

  await audit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action,
    entityId: params.id,
    entityType: "Ticket",
    before: { status: ticket.status, priority: ticket.priority, assignedToId: ticket.assignedToId },
    after: updateData,
  });

  return NextResponse.json(updated);
}
