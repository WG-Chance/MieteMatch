import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { audit } from "@/lib/audit";

const updateSchema = z.object({ role: z.enum(["ADMIN", "AGENT", "VIEWER"]) });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["OWNER", "ADMIN"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 });

  const member = await db.organizationMember.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (member.role === "OWNER") return NextResponse.json({ error: "Cannot change owner role" }, { status: 400 });

  const updated = await db.organizationMember.update({
    where: { id: params.id },
    data: { role: parsed.data.role },
  });

  await audit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "MEMBER_ROLE_CHANGED",
    entityId: params.id,
    entityType: "Member",
    before: { role: member.role },
    after: { role: parsed.data.role },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["OWNER", "ADMIN"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const member = await db.organizationMember.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (member.role === "OWNER") return NextResponse.json({ error: "Cannot remove owner" }, { status: 400 });
  if (member.userId === session.user.id) return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });

  await db.organizationMember.update({ where: { id: params.id }, data: { isActive: false } });

  await audit({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "MEMBER_REMOVED",
    entityId: params.id,
    entityType: "Member",
  });

  return NextResponse.json({ success: true });
}
