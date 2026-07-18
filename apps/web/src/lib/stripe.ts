import Stripe from "stripe";
import { Plan } from "@flowdesk/types";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error("[FlowDesk Stripe] Missing STRIPE_SECRET_KEY");

export const stripe = new Stripe(key, { apiVersion: "2024-06-20", typescript: true });

export function getPriceId(plan: Plan): string {
  const map: Record<Plan, string> = {
    STARTER: process.env.STRIPE_STARTER_PRICE_ID ?? "",
    GROWTH: process.env.STRIPE_GROWTH_PRICE_ID ?? "",
    SCALE: process.env.STRIPE_SCALE_PRICE_ID ?? "",
  };
  const id = map[plan];
  if (!id) throw new Error(`[FlowDesk Stripe] Missing price ID for plan: ${plan}`);
  return id;
}
