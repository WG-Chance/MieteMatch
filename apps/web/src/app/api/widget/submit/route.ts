import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { canUsePlanFeature } from "@/lib/subscription";
import { triageTicket } from "@/lib/ai-triage";
import { sendTicketCreatedEmail } from "@flowdesk/emails";

const widgetSchema = z.object({
  organizationId: z.string(),
  email: z.string().email(),
  name: z.string().max(100).optional(),
  subject: z.string().min(3).max(255),
  message: z.string().min(1).max(10000),
});

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, "widget");
  if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = widgetSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 });

  const { organizationId, email, name, subject, message } = parsed.data;

  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const widgetConfig = await db.widgetConfig.findUnique({ where: { organizationId } });
  if (!widgetConfig?.isEnabled) return NextResponse.json({ error: "Widget disabled" }, { status: 403 });

  const customer = await db.customer.upsert({
    where: { organizationId_email: { organizationId, email } },
    create: { organizationId, email, name: name ?? null },
    update: { name: name ?? undefined },
  });

  const maxTicket = await db.ticket.findFirst({
    where: { organizationId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const ticketNumber = (maxTicket?.number ?? 0) + 1;

  let ticket;
  try {
    ticket = await db.ticket.create({
      data: {
        number: ticketNumber,
        organizationId,
        customerId: customer.id,
        status: "OPEN",
        priority: "MEDIUM",
        channel: "WIDGET",
        subject,
        replies: { create: { authorType: "CUSTOMER", content: message } },
      },
    });
  } catch (err: unknown) {
    const isPrismaConflict = typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002";
    if (isPrismaConflict) {
      return NextResponse.json({ error: "Conflict: please retry" }, { status: 409 });
    }
    console.error("[Widget] Failed to create ticket for org", organizationId, err);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }

  await db.customer.update({
    where: { id: customer.id },
    data: { ticketCount: { increment: 1 } },
  });

  // AI triage if plan supports it
  const canAi = await canUsePlanFeature(organizationId, "aiTriage");
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
    }).catch(console.error);
  }

  sendTicketCreatedEmail({
    to: email,
    customerName: name ?? "there",
    ticketNumber,
    subject,
    orgName: org.name,
    ticketUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tickets/${ticketNumber}`,
  }).catch(console.error);

  return NextResponse.json({ ticketNumber, message: "Ticket created successfully" }, { status: 201 });
}
