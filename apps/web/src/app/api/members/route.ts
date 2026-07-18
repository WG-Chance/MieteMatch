import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { sendInvitationEmail } from "@flowdesk/emails";
import { addDays } from "date-fns";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "AGENT", "VIEWER"]).default("AGENT"),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const members = await db.organizationMember.findMany({
    where: { organizationId: session.user.organizationId, isActive: true },
    include: { user: { select: { id: true, name: true, email: true, image: true, createdAt: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req);
  if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["OWNER", "ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 });

  const org = await db.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { name: true },
  });

  const expiresAt = addDays(new Date(), 7);

  const invitation = await db.invitation.upsert({
    where: { organizationId_email: { organizationId: session.user.organizationId, email: parsed.data.email } },
    create: {
      organizationId: session.user.organizationId,
      email: parsed.data.email,
      role: parsed.data.role,
      expiresAt,
      invitedById: session.user.id,
    },
    update: { role: parsed.data.role, expiresAt, acceptedAt: null },
  });

  const inviter = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });

  try {
    await sendInvitationEmail({
      to: parsed.data.email,
      orgName: org?.name ?? "Support Team",
      inviterName: inviter?.name ?? "A team member",
      role: parsed.data.role,
      acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`,
      expiresAt,
    });
  } catch (emailErr) {
    // Invitation is saved in DB — log but do not fail the request
    console.error("[Members] Failed to send invitation email to", parsed.data.email, emailErr);
  }

  await audit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "MEMBER_INVITED",
    entityType: "Invitation",
    after: { email: parsed.data.email, role: parsed.data.role },
  });

  return NextResponse.json({ success: true, email: parsed.data.email }, { status: 201 });
}
