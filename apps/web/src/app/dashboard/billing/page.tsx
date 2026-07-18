import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPlan } from "@/lib/subscription";
import { PLAN_LIMITS, PLAN_PRICES } from "@flowdesk/types";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@flowdesk/ui";
import { BillingActions } from "./billing-actions";
import { CheckCircle, Zap } from "lucide-react";
import type { Plan } from "@flowdesk/types";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { success?: string; cancelled?: string };
}) {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/onboarding");

  const [currentPlan, sub] = await Promise.all([
    getPlan(session.user.organizationId),
    db.subscription.findUnique({
      where: { organizationId: session.user.organizationId },
      select: { status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true, plan: true },
    }),
  ]);

  const isOwner = session.user.role === "OWNER";
  const plans: Plan[] = ["STARTER", "GROWTH", "SCALE"];

  return (
    <div className="animate-fade-in max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-100 mb-2">Billing & Plans</h1>
      <p className="text-slate-400 text-sm mb-8">Manage your subscription and plan features</p>

      {searchParams.success && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-600/40 bg-emerald-950/20 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-300">Payment successful! Your plan has been updated.</p>
        </div>
      )}
      {searchParams.cancelled && (
        <div className="mb-6 p-4 rounded-xl border border-slate-600/40 bg-slate-800/30">
          <p className="text-sm text-slate-400">Checkout cancelled. No charges were made.</p>
        </div>
      )}

      {/* Current plan status */}
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Current Plan</CardTitle>
            <Badge variant={sub?.status === "ACTIVE" ? "success" : "secondary"}>
              {sub?.status ?? "FREE"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/15 border border-indigo-600/25 flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-100">{currentPlan} Plan</p>
              <p className="text-sm text-slate-400">
                {PLAN_PRICES[currentPlan].monthly > 0
                  ? `$${PLAN_PRICES[currentPlan].monthly}/month`
                  : "Free"}
                {sub?.currentPeriodEnd && ` · Renews ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`}
                {sub?.cancelAtPeriodEnd && " · Cancels at period end"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {plans.map(plan => {
          const limits = PLAN_LIMITS[plan];
          const price = PLAN_PRICES[plan];
          const isCurrent = plan === currentPlan;
          const features = [
            `${limits.agentSeats === -1 ? "Unlimited" : limits.agentSeats} agent seats`,
            `${limits.ticketsPerMonth === -1 ? "Unlimited" : limits.ticketsPerMonth.toLocaleString()} tickets/month`,
            limits.aiTriage ? "AI triage & categorization" : null,
            limits.slaTracking ? "SLA tracking & enforcement" : null,
            limits.analytics ? "Analytics dashboard" : null,
            limits.apiAccess ? "API access" : null,
            limits.prioritySupport ? "Priority support" : null,
          ].filter(Boolean) as string[];

          return (
            <Card key={plan} className={isCurrent ? "border-indigo-600/50 bg-indigo-950/10" : ""}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-100">{price.label}</h3>
                  {isCurrent && <Badge variant="default">Current</Badge>}
                </div>
                <p className="text-2xl font-bold text-slate-100 mb-4">
                  ${price.monthly}<span className="text-sm font-normal text-slate-400">/mo</span>
                </p>
                <ul className="space-y-1.5 mb-5">
                  {features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                      <CheckCircle className="w-3 h-3 text-indigo-400 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                {isOwner && !isCurrent && (
                  <BillingActions plan={plan} currentPlan={currentPlan} hasSubscription={!!sub?.status} />
                )}
                {isCurrent && isOwner && sub?.status === "ACTIVE" && (
                  <BillingActions plan={plan} currentPlan={currentPlan} hasSubscription manageOnly />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-slate-500">
            Payments processed securely by <strong className="text-slate-300">Stripe</strong>.
            No card data stored on our servers. Cancel anytime from the billing portal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
