import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { slugify } from "@/lib/utils";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

const createOrgSchema = z.object({
  name: z.string().min(2).max(60),
  website: z.string().url().optional(),
  timezone: z.string().default("Europe/Berlin"),
});

const updateOrgSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  website: z.string().url().nullable().optional(),
  timezone: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await db.organizationMember.findFirst({
    where: { userId: session.user.id, isActive: true },
    include: {
      organization: {
        include: {
          subscription: true,
          widgetConfig: true,
          slaPolicy: true,
          _count: { select: { members: true, tickets: true } },
        },
      },
    },
  });

  if (!membership) return NextResponse.json(null);
  return NextResponse.json({ ...membership.organization, role: membership.role });
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req);
  if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existingMembership = await db.organizationMember.findFirst({
    where: { userId: session.user.id },
  });
  if (existingMembership) {
    return NextResponse.json({ error: "You already belong to an organization" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createOrgSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 });

  let slug = slugify(parsed.data.name);
  const existing = await db.organization.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const org = await db.organization.create({
    data: {
      name: parsed.data.name,
      slug,
      website: parsed.data.website ?? null,
      timezone: parsed.data.timezone,
      members: { create: { userId: session.user.id, role: "OWNER" } },
      slaPolicy: { create: {} },
      widgetConfig: { create: { title: `${parsed.data.name} Support` } },
    },
  });

  await audit({
    organizationId: org.id,
    userId: session.user.id,
    action: "ORGANIZATION_UPDATED",
    entityId: org.id,
    entityType: "Organization",
    after: { name: org.name, slug: org.slug },
  });

  return NextResponse.json(org, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const rl = rateLimit(req);
  if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["OWNER", "ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateOrgSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 });

  const org = await db.organization.update({
    where: { id: session.user.organizationId },
    data: parsed.data,
  });

  await audit({
    organizationId: org.id,
    userId: session.user.id,
    action: "ORGANIZATION_UPDATED",
    entityId: org.id,
    entityType: "Organization",
    after: parsed.data,
  });

  return NextResponse.json(org);
}
