import { db } from "@/lib/db";
import type { Plan } from "@flowdesk/types";
import { PLAN_LIMITS } from "@flowdesk/types";

export async function getSubscription(organizationId: string) {
  return db.subscription.findUnique({ where: { organizationId } });
}

export async function getPlan(organizationId: string): Promise<Plan> {
  const sub = await getSubscription(organizationId);
  if (!sub) return "STARTER";
  if (sub.status !== "ACTIVE" && sub.status !== "TRIALING") return "STARTER";
  return (sub.plan as Plan) ?? "STARTER";
}

export async function canUsePlanFeature(
  organizationId: string,
  feature: keyof (typeof PLAN_LIMITS)[Plan]
): Promise<boolean> {
  const plan = await getPlan(organizationId);
  return Boolean(PLAN_LIMITS[plan][feature]);
}

export async function getOrCreateStripeCustomer(
  organizationId: string,
  email: string,
  name: string
): Promise<string> {
  const { stripe } = await import("@/lib/stripe");
  const existing = await db.subscription.findUnique({
    where: { organizationId },
    select: { stripeCustomerId: true },
  });
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const customer = await stripe.customers.create({ email, name, metadata: { organizationId } });

  await db.subscription.create({
    data: { organizationId, stripeCustomerId: customer.id, status: "INACTIVE", plan: "STARTER" },
  });

  return customer.id;
}
