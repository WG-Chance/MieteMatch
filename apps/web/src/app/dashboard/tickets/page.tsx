import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatRelative } from "@/lib/utils";
import { Card, CardContent, Badge, Button } from "@flowdesk/ui";
import { Ticket, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import type { TicketPriority, TicketStatus } from "@prisma/client";

const PRIORITY_VARIANT: Record<TicketPriority, "critical"|"high"|"medium"|"low"> = {
  CRITICAL: "critical", HIGH: "high", MEDIUM: "medium", LOW: "low",
};
const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open", IN_PROGRESS: "In Progress", WAITING_ON_CUSTOMER: "Waiting",
  RESOLVED: "Resolved", CLOSED: "Closed",
};

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: { status?: string; priority?: string; page?: string };
}) {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/onboarding");

  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const pageSize = 25;

  const where = {
    organizationId: session.user.organizationId,
    ...(searchParams.status ? { status: searchParams.status as TicketStatus } : {}),
    ...(searchParams.priority ? { priority: searchParams.priority as TicketPriority } : {}),
  };

  const [tickets, total] = await Promise.all([
    db.ticket.findMany({
      where,
      include: {
        customer: { select: { email: true, name: true } },
        assignedTo: { select: { name: true, image: true } },
        aiTriage: { select: { category: true, sentiment: true } },
        _count: { select: { replies: true } },
      },
      orderBy: [{ slaStatus: "asc" }, { priority: "asc" }, { lastActivityAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.ticket.count({ where }),
  ]);

  const statuses: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"];
  const priorities: TicketPriority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Tickets</h1>
          <p className="text-slate-400 text-sm mt-0.5">{total} total</p>
        </div>
        <Link href="/dashboard/tickets/new">
          <Button className="gap-2"><Plus className="w-4 h-4" /> New Ticket</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <Link href="/dashboard/tickets">
          <Button variant={!searchParams.status ? "default" : "secondary"} size="sm">All</Button>
        </Link>
        {statuses.map(s => (
          <Link key={s} href={`/dashboard/tickets?status=${s}`}>
            <Button variant={searchParams.status === s ? "default" : "secondary"} size="sm">{STATUS_LABEL[s]}</Button>
          </Link>
        ))}
        <div className="w-px bg-slate-700 mx-1" />
        {priorities.map(p => (
          <Link key={p} href={`/dashboard/tickets?priority=${p}`}>
            <Button variant={searchParams.priority === p ? "default" : "secondary"} size="sm">{p}</Button>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {tickets.length === 0 ? (
            <div className="text-center py-16">
              <Ticket className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium mb-1">No tickets found</p>
              <p className="text-slate-500 text-sm">Adjust filters or create a new ticket</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              <div className="grid grid-cols-12 gap-4 px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                <div className="col-span-1">#</div>
                <div className="col-span-4">Subject</div>
                <div className="col-span-2">Customer</div>
                <div className="col-span-2">Assigned</div>
                <div className="col-span-1">Priority</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1">Updated</div>
              </div>
              {tickets.map((t) => (
                <Link key={t.id} href={`/dashboard/tickets/${t.id}`}
                  className="grid grid-cols-12 gap-4 px-5 py-3 hover:bg-slate-800/40 transition-colors items-center">
                  <div className="col-span-1 text-xs text-slate-500 font-mono">#{t.number}</div>
                  <div className="col-span-4 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{t.subject}</p>
                    {t.aiTriage && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-indigo-400 mt-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> {t.aiTriage.category}
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 text-xs text-slate-400 truncate">{t.customer?.email ?? "—"}</div>
                  <div className="col-span-2 text-xs text-slate-400 truncate">{t.assignedTo?.name ?? "Unassigned"}</div>
                  <div className="col-span-1"><Badge variant={PRIORITY_VARIANT[t.priority]} className="text-[10px]">{t.priority}</Badge></div>
                  <div className="col-span-1">
                    <Badge variant={t.status === "OPEN" ? "destructive" : t.status === "RESOLVED" ? "success" : "secondary"} className="text-[10px]">
                      {STATUS_LABEL[t.status]}
                    </Badge>
                  </div>
                  <div className="col-span-1 text-xs text-slate-500 truncate">{formatRelative(t.lastActivityAt)}</div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
