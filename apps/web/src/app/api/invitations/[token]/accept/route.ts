import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invitation = await db.invitation.findUnique({ where: { token: params.token } });
  if (!invitation) return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
  if (invitation.expiresAt < new Date()) return NextResponse.json({ error: "Invitation expired" }, { status: 410 });
  if (invitation.acceptedAt) return NextResponse.json({ error: "Already accepted" }, { status: 409 });

  // Check email matches
  if (session.user.email !== invitation.email) {
    return NextResponse.json({ error: "Invitation email does not match your account" }, { status: 403 });
  }

  // Check not already a member
  const existing = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: invitation.organizationId, userId: session.user.id } },
  });
  if (existing) {
    await db.invitation.update({ where: { token: params.token }, data: { acceptedAt: new Date() } });
    return NextResponse.json({ organizationId: invitation.organizationId });
  }

  await db.$transaction([
    db.organizationMember.create({
      data: { organizationId: invitation.organizationId, userId: session.user.id, role: invitation.role },
    }),
    db.invitation.update({ where: { token: params.token }, data: { acceptedAt: new Date() } }),
  ]);

  return NextResponse.json({ organizationId: invitation.organizationId });
}
