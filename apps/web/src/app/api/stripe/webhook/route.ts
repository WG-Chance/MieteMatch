import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import type Stripe from "stripe";
import type { Plan } from "@flowdesk/types";

export const runtime = "nodejs";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) throw new Error("[FlowDesk] Missing STRIPE_WEBHOOK_SECRET");

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }
  } catch (err) {
    // Return 500 so Stripe retries — do NOT swallow DB errors silently
    console.error("[Webhook] Processing error for event", event.id, event.type, err);
    return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleSubscriptionChange(sub: Stripe.Subscription) {
  const customerId = sub.customer as string;
  const record = await db.subscription.findUnique({ where: { stripeCustomerId: customerId } });
  if (!record) return;

  const priceId = sub.items.data[0]?.price.id;
  const plan = getPlanFromPriceId(priceId);
  const status = mapStatus(sub.status);

  await db.subscription.update({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId ?? null,
      plan,
      status,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });

  await audit({
    organizationId: record.organizationId,
    action: "SUBSCRIPTION_CHANGED",
    after: { plan, status, priceId },
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId = sub.customer as string;
  const record = await db.subscription.findUnique({ where: { stripeCustomerId: customerId } });
  if (!record) return;

  await db.subscription.update({
    where: { stripeCustomerId: customerId },
    data: { status: "CANCELLED", plan: "STARTER", stripeSubscriptionId: null },
  });

  await audit({
    organizationId: record.organizationId,
    action: "SUBSCRIPTION_CHANGED",
    after: { status: "CANCELLED", plan: "STARTER", stripeSubscriptionId: sub.id },
  });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const record = await db.subscription.findUnique({ where: { stripeCustomerId: customerId } });
  if (!record) return;

  await audit({
    organizationId: record.organizationId,
    action: "PAYMENT_SUCCEEDED",
    after: { amount: invoice.amount_paid / 100, currency: invoice.currency },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const record = await db.subscription.findUnique({ where: { stripeCustomerId: customerId } });
  if (!record) return;

  await db.subscription.update({
    where: { stripeCustomerId: customerId },
    data: { status: "PAST_DUE" },
  });

  await audit({
    organizationId: record.organizationId,
    action: "PAYMENT_FAILED",
    after: { amount: invoice.amount_due / 100 },
  });
}

function getPlanFromPriceId(priceId?: string): Plan {
  if (!priceId) return "STARTER";
  if (priceId === process.env.STRIPE_GROWTH_PRICE_ID) return "GROWTH";
  if (priceId === process.env.STRIPE_SCALE_PRICE_ID) return "SCALE";
  return "STARTER";
}

function mapStatus(s: Stripe.Subscription.Status): "ACTIVE"|"INACTIVE"|"PAST_DUE"|"CANCELLED"|"TRIALING" {
  switch (s) {
    case "active": return "ACTIVE";
    case "trialing": return "TRIALING";
    case "past_due": return "PAST_DUE";
    case "canceled": return "CANCELLED";
    default: return "INACTIVE";
  }
}
