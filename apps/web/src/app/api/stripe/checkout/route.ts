import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, getPriceId } from "@/lib/stripe";
import { getOrCreateStripeCustomer } from "@/lib/subscription";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import type { Plan } from "@flowdesk/types";

const schema = z.object({ plan: z.enum(["STARTER","GROWTH","SCALE"]) });

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, "stripe");
  if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const session = await auth();
  if (!session?.user?.id || !session.user.email || !session.user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 });

  const org = await db.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { name: true },
  });

  const customerId = await getOrCreateStripeCustomer(
    session.user.organizationId,
    session.user.email,
    org?.name ?? session.user.name ?? "Organization"
  );

  const priceId = getPriceId(parsed.data.plan as Plan);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const checkout = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/billing?success=1`,
    cancel_url: `${appUrl}/dashboard/billing?cancelled=1`,
    metadata: { organizationId: session.user.organizationId, plan: parsed.data.plan },
    subscription_data: { metadata: { organizationId: session.user.organizationId } },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkout.url });
}
