"use client";
import { useState } from "react";
import { Button } from "@flowdesk/ui";
import { Loader2, ExternalLink } from "lucide-react";
import type { Plan } from "@flowdesk/types";

interface BillingActionsProps {
  plan: Plan;
  currentPlan: Plan;
  hasSubscription: boolean;
  manageOnly?: boolean;
}

export function BillingActions({ plan, currentPlan, hasSubscription, manageOnly }: BillingActionsProps) {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json() as { url?: string };
      if (data.url) window.location.href = data.url;
    } finally { setLoading(false); }
  }

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json() as { url?: string };
      if (data.url) window.location.href = data.url;
    } finally { setLoading(false); }
  }

  if (manageOnly) {
    return (
      <Button variant="outline" size="sm" className="w-full gap-2" onClick={openPortal} disabled={loading}>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
        Manage Subscription
      </Button>
    );
  }

  const planOrder: Plan[] = ["STARTER","GROWTH","SCALE"];
  const isUpgrade = planOrder.indexOf(plan) > planOrder.indexOf(currentPlan);

  return (
    <Button
      variant={isUpgrade ? "default" : "outline"}
      size="sm"
      className="w-full"
      onClick={startCheckout}
      disabled={loading}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
      {isUpgrade ? "Upgrade" : "Downgrade"}
    </Button>
  );
}
