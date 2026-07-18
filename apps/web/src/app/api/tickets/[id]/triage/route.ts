import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { triageTicket } from "@/lib/ai-triage";
import { canUsePlanFeature } from "@/lib/subscription";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, "ai");
  if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAi = await canUsePlanFeature(session.user.organizationId, "aiTriage");
  if (!canAi) {
    return NextResponse.json(
      { error: "AI triage requires Growth or Scale plan", requiresUpgrade: true },
      { status: 402 }
    );
  }

  const ticket = await db.ticket.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
    include: { replies: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const firstMessage = ticket.replies[0]?.content ?? "";
  const triage = await triageTicket(ticket.subject, firstMessage);

  const result = await db.aiTriage.upsert({
    where: { ticketId: params.id },
    create: {
      ticketId: params.id,
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
    update: {
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

  await audit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "AI_TRIAGE_COMPLETED",
    entityId: params.id,
    entityType: "Ticket",
    after: { category: triage.category, priority: triage.priority, confidence: triage.confidence },
  });

  return NextResponse.json(result);
}
