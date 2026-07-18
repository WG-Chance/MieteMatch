import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canUsePlanFeature } from "@/lib/subscription";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "@flowdesk/ui";
import { BarChart3, Lock, Sparkles, TrendingUp, AlertTriangle, CheckCircle, Inbox } from "lucide-react";
import Link from "next/link";
import { startOfMonth, subDays, startOfDay } from "date-fns";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/onboarding");

  const canAnalytics = await canUsePlanFeature(session.user.organizationId, "analytics");

  if (!canAnalytics) {
    return (
      <div className="animate-fade-in max-w-2xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/15 border border-indigo-600/25 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mb-3">Analytics</h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          Analytics are available on the <strong className="text-slate-200">Growth</strong> and <strong className="text-slate-200">Scale</strong> plans.
          Understand ticket volume, SLA performance, and team workload.
        </p>
        <Link href="/dashboard/billing">
          <Button className="gap-2"><Sparkles className="w-4 h-4" /> Upgrade Plan</Button>
        </Link>
      </div>
    );
  }

  const orgId = session.user.organizationId;
  const now = new Date();
  const monthStart = startOfMonth(now);
  const thirtyDaysAgo = subDays(now, 30);

  const [
    totalOpen, totalResolved, totalThisMonth, breachedSla,
    byPriority, byStatus, byChannel, recentTrend,
  ] = await Promise.all([
    db.ticket.count({ where: { organizationId: orgId, status: { in: ["OPEN","IN_PROGRESS"] } } }),
    db.ticket.count({ where: { organizationId: orgId, status: { in: ["RESOLVED","CLOSED"] }, resolvedAt: { gte: monthStart } } }),
    db.ticket.count({ where: { organizationId: orgId, createdAt: { gte: monthStart } } }),
    db.ticket.count({ where: { organizationId: orgId, slaStatus: "BREACHED" } }),
    db.ticket.groupBy({ by: ["priority"], where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } }, _count: { priority: true } }),
    db.ticket.groupBy({ by: ["status"], where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } }, _count: { status: true } }),
    db.ticket.groupBy({ by: ["channel"], where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } }, _count: { channel: true } }),
    Promise.all(
      Array.from({ length: 14 }, (_, i) => {
        const d = startOfDay(subDays(now, 13 - i));
        const next = startOfDay(subDays(now, 12 - i));
        return db.ticket.count({ where: { organizationId: orgId, createdAt: { gte: d, lt: next } } })
          .then(count => ({ date: d.toISOString().slice(0, 10), count }));
      })
    ),
  ]);

  const maxTrend = Math.max(...recentTrend.map(r => r.count), 1);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-400" /> Analytics
        </h1>
        <p className="text-slate-400 text-sm mt-1">Last 30 days · {orgId}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Inbox, label: "Open Tickets", value: totalOpen, color: "indigo" },
          { icon: CheckCircle, label: "Resolved This Month", value: totalResolved, color: "emerald" },
          { icon: TrendingUp, label: "Created This Month", value: totalThisMonth, color: "violet" },
          { icon: AlertTriangle, label: "SLA Breaches", value: breachedSla, color: breachedSla > 0 ? "red" : "slate" },
        ].map(({ icon: Icon, label, value, color }) => {
          const c: Record<string, string> = {
            indigo: "bg-indigo-600/15 border-indigo-600/25 text-indigo-400",
            emerald: "bg-emerald-600/15 border-emerald-600/25 text-emerald-400",
            violet: "bg-violet-600/15 border-violet-600/25 text-violet-400",
            red: "bg-red-600/15 border-red-600/25 text-red-400",
            slate: "bg-slate-700/30 border-slate-600/25 text-slate-400",
          };
          return (
            <Card key={label}>
              <CardContent className="p-5">
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border mb-3 ${c[color] ?? c.slate}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-2xl font-bold text-slate-100">{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Volume trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Daily Ticket Volume (14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-28">
              {recentTrend.map(({ date, count }) => (
                <div key={date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-indigo-600/60 hover:bg-indigo-500/70 rounded-sm transition-colors relative group"
                    style={{ height: `${Math.max(4, (count / maxTrend) * 96)}px` }}
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-slate-200 text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {date.slice(5)}: {count}
                    </div>
                  </div>
                  <span className="text-[8px] text-slate-600 hidden lg:block">{date.slice(8)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* By priority */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">By Priority (30 days)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {["CRITICAL","HIGH","MEDIUM","LOW"].map(p => {
              const row = byPriority.find(r => r.priority === p);
              const count = row?._count.priority ?? 0;
              const total = byPriority.reduce((s, r) => s + r._count.priority, 0) || 1;
              const pct = Math.round((count / total) * 100);
              const colors: Record<string, string> = { CRITICAL: "bg-red-500", HIGH: "bg-orange-500", MEDIUM: "bg-yellow-500", LOW: "bg-slate-500" };
              return (
                <div key={p}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{p}</span>
                    <span className="text-slate-400">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${colors[p]} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By status */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">By Status (30 days)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {byStatus.map(({ status, _count }) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-slate-300">{status.replace("_"," ")}</span>
                <Badge variant={status === "OPEN" ? "destructive" : status === "RESOLVED" ? "success" : "secondary"}>
                  {_count.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* By channel */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">By Channel (30 days)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {byChannel.map(({ channel, _count }) => (
              <div key={channel} className="flex items-center justify-between">
                <span className="text-sm text-slate-300">{channel}</span>
                <Badge variant="secondary">{_count.channel}</Badge>
              </div>
            ))}
            {byChannel.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
