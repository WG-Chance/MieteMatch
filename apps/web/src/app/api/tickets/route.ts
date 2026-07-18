import { NextRequest, NextResponse } from "next/server";
import type { TicketStatus, TicketPriority } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { triageTicket } from "@/lib/ai-triage";
import { canUsePlanFeature } from "@/lib/subscription";
import { calculateSlaDueDates } from "@/lib/sla";
import { sendTicketCreatedEmail } from "@flowdesk/emails";

const createTicketSchema = z.object({
  subject: z.string().min(3).max(255),
  message: z.string().min(1).max(10000),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  channel: z.enum(["EMAIL", "WIDGET", "API", "MANUAL"]).default("MANUAL"),
  customerEmail: z.string().email().optional(),
  customerName: z.string().max(100).optional(),
  tagIds: z.array(z.string()).max(10).optional(),
});

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, "tickets");
  if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const assignedToId = searchParams.get("assignedTo");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") ?? "25"));

  const where = {
    organizationId: session.user.organizationId,
    ...(status ? { status: status as TicketStatus } : {}),
    ...(priority ? { priority: priority as TicketPriority } : {}),
    ...(assignedToId === "me" ? { assignedToId: session.user.id } : assignedToId ? { assignedToId } : {}),
    ...(search ? {
      OR: [
        { subject: { contains: search, mode: "insensitive" as const } },
        { customer: { email: { contains: search, mode: "insensitive" as const } } },
      ],
    } : {}),
  };

  const [tickets, total] = await Promise.all([
    db.ticket.findMany({
      where,
      include: {
        customer: { select: { email: true, name: true } },
        assignedTo: { select: { name: true, image: true } },
        tags: { include: { tag: true } },
        aiTriage: { select: { category: true, priority: true, confidence: true } },
        _count: { select: { replies: true } },
      },
      orderBy: [{ priority: "asc" }, { lastActivityAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.ticket.count({ where }),
  ]);

  return NextResponse.json({
    tickets,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, "tickets");
  if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createTicketSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 });

  const { subject, message, priority, channel, customerEmail, customerName, tagIds } = parsed.data;
  const orgId = session.user.organizationId;

  // Get or create customer
  let customer = null;
  if (customerEmail) {
    customer = await db.customer.upsert({
      where: { organizationId_email: { organizationId: orgId, email: customerEmail } },
      create: { organizationId: orgId, email: customerEmail, name: customerName ?? null },
      update: { name: customerName ?? undefined },
    });
  }

  // Generate unique ticket number
  const maxTicket = await db.ticket.findFirst({
    where: { organizationId: orgId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const ticketNumber = (maxTicket?.number ?? 0) + 1;

  // Get SLA policy
  const slaPolicy = await db.slaPolicy.findUnique({ where: { organizationId: orgId } });
  const ticketPriority = priority ?? "MEDIUM";

  let slaFirstResponseDue: Date | null = null;
  let slaResolutionDue: Date | null = null;

  const canSla = await canUsePlanFeature(orgId, "slaTracking");
  if (canSla && slaPolicy) {
    const sla = calculateSlaDueDates(new Date(), ticketPriority, slaPolicy);
    slaFirstResponseDue = sla.firstResponseDue;
    slaResolutionDue = sla.resolutionDue;
  }

  let ticket;
  try {
    ticket = await db.ticket.create({
      data: {
        number: ticketNumber,
        organizationId: orgId,
        customerId: customer?.id ?? null,
        status: "OPEN",
        priority: ticketPriority,
        channel,
        subject,
        slaFirstResponseDue,
        slaResolutionDue,
        replies: {
          create: {
            authorId: customer ? null : session.user.id,
            authorType: customer ? "CUSTOMER" : "AGENT",
            content: message,
          },
        },
        ...(tagIds?.length ? {
          tags: { create: tagIds.map(tagId => ({ tagId })) }
        } : {}),
      },
      include: { customer: true, replies: true },
    });
  } catch (err: unknown) {
    const isPrismaConflict = typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002";
    if (isPrismaConflict) {
      console.error("[Tickets] Ticket number conflict for org", orgId, "- concurrent request race");
      return NextResponse.json({ error: "Conflict: please retry" }, { status: 409 });
    }
    console.error("[Tickets] Failed to create ticket for org", orgId, err);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }

  // Update customer ticket count
  if (customer) {
    await db.customer.update({
      where: { id: customer.id },
      data: { ticketCount: { increment: 1 } },
    });
  }

  // AI triage (async, non-blocking for response)
  const canAi = await canUsePlanFeature(orgId, "aiTriage");
  if (canAi) {
    triageTicket(subject, message).then(async (triage) => {
      await db.aiTriage.create({
        data: {
          ticketId: ticket.id,
          category: triage.category,
          priority: triage.priority,
          sentiment: triage.sentiment,
          suggestedTags: triage.suggestedTags,
          summary: triage.summary,
          confidence: triage.confidence,
          reasoning: triage.reasoning,
          modelVersion: triage.modelVersion,
          processingMs: triage.processingMs,
        },
      });
      // Auto-update priority if AI confidence is high
      if (triage.confidence > 0.85 && triage.priority !== ticketPriority) {
        await db.ticket.update({
          where: { id: ticket.id },
          data: { priority: triage.priority },
        });
      }
    }).catch(console.error);
  }

  // Send confirmation email to customer
  if (customer?.email) {
    const org = await db.organization.findUnique({ where: { id: orgId }, select: { name: true } });
    sendTicketCreatedEmail({
      to: customer.email,
      customerName: customer.name ?? "there",
      ticketNumber: ticket.number,
      subject,
      orgName: org?.name ?? "Support",
      ticketUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tickets/${ticket.number}`,
    }).catch(console.error);
  }

  await audit({
    organizationId: orgId,
    userId: session.user.id,
    action: "TICKET_CREATED",
    entityId: ticket.id,
    entityType: "Ticket",
    after: { ticketNumber, subject, priority: ticketPriority },
  });

  return NextResponse.json(ticket, { status: 201 });
}
