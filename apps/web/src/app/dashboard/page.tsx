import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatRelative } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@flowdesk/ui";
import { Ticket, AlertTriangle, CheckCircle, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { TicketPriority, TicketStatus } from "@prisma/client";

const PRIORITY_VARIANT: Record<TicketPriority, "critical"|"high"|"medium"|"low"> = {
  CRITICAL: "critical", HIGH: "high", MEDIUM: "medium", LOW: "low",
};
const STATUS_VARIANT: Record<TicketStatus, "destructive"|"default"|"warning"|"success"|"secondary"> = {
  OPEN: "destructive", IN_PROGRESS: "warning", WAITING_ON_CUSTOMER: "secondary",
  RESOLVED: "success", CLOSED: "secondary",
};
const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open", IN_PROGRESS: "In Progress", WAITING_ON_CUSTOMER: "Waiting",
  RESOLVED: "Resolved", CLOSED: "Closed",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/onboarding");

  const orgId = session.user.organizationId;
  const now = new Date();

  const [openCount, resolvedToday, breachedSla, recentTickets, assignedToMe] = await Promise.all([
    db.ticket.count({ where: { organizationId: orgId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.ticket.count({
      where: {
        organizationId: orgId,
        status: { in: ["RESOLVED", "CLOSED"] },
        resolvedAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
      },
    }),
    db.ticket.count({ where: { organizationId: orgId, slaStatus: "BREACHED" } }),
    db.ticket.findMany({
      where: { organizationId: orgId },
      include: {
        customer: { select: { email: true, name: true } },
        assignedTo: { select: { name: true } },
        _count: { select: { replies: true } },
      },
      orderBy: { lastActivityAt: "desc" },
      take: 8,
    }),
    db.ticket.count({
      where: { organizationId: orgId, assignedToId: session.user.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
  ]);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Overview</h1>
          <p className="text-slate-400 text-sm mt-0.5">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <Link href="/dashboard/tickets/new" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
          <Ticket className="w-4 h-4" /> New Ticket
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Ticket} label="Open Tickets" value={openCount} color="indigo" />
        <StatCard icon={CheckCircle} label="Resolved Today" value={resolvedToday} color="emerald" />
        <StatCard icon={AlertTriangle} label="SLA Breaches" value={breachedSla} color={breachedSla > 0 ? "red" : "slate"} />
        <StatCard icon={Clock} label="Assigned to Me" value={assignedToMe} color="violet" />
      </div>

      {/* Recent tickets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Tickets</CardTitle>
          <Link href="/dashboard/tickets" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentTickets.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No tickets yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {recentTickets.map((t) => (
                <Link key={t.id} href={`/dashboard/tickets/${t.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-slate-800/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-mono">#{t.number}</span>
                      <p className="text-sm font-medium text-slate-200 truncate">{t.subject}</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t.customer?.email ?? "No customer"} · {t._count.replies} replies · {formatRelative(t.lastActivityAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={PRIORITY_VARIANT[t.priority]}>{t.priority}</Badge>
                    <Badge variant={STATUS_VARIANT[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-600/15 border-indigo-600/25 text-indigo-400",
    emerald: "bg-emerald-600/15 border-emerald-600/25 text-emerald-400",
    red: "bg-red-600/15 border-red-600/25 text-red-400",
    violet: "bg-violet-600/15 border-violet-600/25 text-violet-400",
    slate: "bg-slate-700/30 border-slate-600/25 text-slate-400",
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border mb-3 ${colors[color] ?? colors.slate}`}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}
