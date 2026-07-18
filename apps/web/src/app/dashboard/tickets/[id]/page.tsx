import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { formatDateTime, formatRelative } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, Badge, Avatar, AvatarFallback, AvatarImage } from "@flowdesk/ui";
import { ArrowLeft, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";
import { TicketActions } from "./ticket-actions";
import { ReplyBox } from "./reply-box";
import type { TicketPriority, TicketStatus } from "@prisma/client";

const PRIORITY_VARIANT: Record<TicketPriority, "critical"|"high"|"medium"|"low"> = {
  CRITICAL: "critical", HIGH: "high", MEDIUM: "medium", LOW: "low",
};

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/onboarding");

  const ticket = await db.ticket.findFirst({
    where: { id: params.id, organizationId: session.user.organizationId },
    include: {
      customer: true,
      assignedTo: { select: { id: true, name: true, image: true, email: true } },
      tags: { include: { tag: true } },
      aiTriage: true,
      replies: {
        include: { author: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) notFound();

  const members = await db.organizationMember.findMany({
    where: { organizationId: session.user.organizationId, isActive: true },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  return (
    <div className="animate-fade-in max-w-6xl">
      <Link href="/dashboard/tickets" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 mb-5">
        <ArrowLeft className="w-4 h-4" /> All Tickets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-500 font-mono">#{ticket.number}</span>
                    <Badge variant={PRIORITY_VARIANT[ticket.priority]}>{ticket.priority}</Badge>
                    {ticket.slaStatus === "BREACHED" && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="w-3 h-3" />SLA Breached
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-lg font-semibold text-slate-100">{ticket.subject}</h1>
                  <p className="text-xs text-slate-500 mt-1">
                    {ticket.channel} · Created {formatDateTime(ticket.createdAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Triage */}
          {ticket.aiTriage && (
            <Card className="border-indigo-600/25 bg-indigo-950/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-indigo-300 mb-1">
                      AI Triage · {Math.round(ticket.aiTriage.confidence * 100)}% confidence
                    </p>
                    <p className="text-sm text-slate-300">{ticket.aiTriage.summary}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="secondary">Category: {ticket.aiTriage.category}</Badge>
                      <Badge variant="secondary">Sentiment: {ticket.aiTriage.sentiment}</Badge>
                      {ticket.aiTriage.suggestedTags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                    {ticket.aiTriage.reasoning && (
                      <p className="text-[11px] text-slate-500 mt-2 italic">{ticket.aiTriage.reasoning}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Conversation */}
          <div className="space-y-3">
            {ticket.replies.map((reply) => {
              const isAgent = reply.authorType === "AGENT";
              const isSystem = reply.authorType === "SYSTEM";
              return (
                <Card key={reply.id} className={reply.isInternal ? "border-yellow-700/40 bg-yellow-950/10" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={reply.author?.image ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {isAgent ? (reply.author?.name?.[0] ?? "A") : isSystem ? "S" : ticket.customer?.name?.[0] ?? "C"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-slate-300">
                            {isAgent ? (reply.author?.name ?? "Agent") : isSystem ? "System" : (ticket.customer?.name ?? ticket.customer?.email ?? "Customer")}
                          </span>
                          {reply.isInternal && <Badge variant="warning" className="text-[10px]">Internal Note</Badge>}
                          <span className="text-[10px] text-slate-500 ml-auto">{formatRelative(reply.createdAt)}</span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Reply box */}
          {ticket.status !== "CLOSED" && (
            <ReplyBox ticketId={ticket.id} currentUserId={session.user.id} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <TicketActions
            ticket={{
              id: ticket.id,
              status: ticket.status,
              priority: ticket.priority,
              assignedToId: ticket.assignedTo?.id ?? null,
            }}
            members={members.map(m => ({ id: m.userId, name: m.user.name, image: m.user.image }))}
            currentUserRole={session.user.role ?? "AGENT"}
          />

          {/* Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DetailRow label="Customer" value={ticket.customer?.email ?? "No customer"} />
              <DetailRow label="Channel" value={ticket.channel} />
              <DetailRow label="Assigned" value={ticket.assignedTo?.name ?? "Unassigned"} />
              {ticket.slaFirstResponseDue && (
                <DetailRow
                  label="First Response Due"
                  value={formatDateTime(ticket.slaFirstResponseDue)}
                  warn={ticket.slaFirstResponseDue < new Date()}
                />
              )}
              {ticket.slaResolutionDue && (
                <DetailRow
                  label="Resolution Due"
                  value={formatDateTime(ticket.slaResolutionDue)}
                  warn={ticket.slaResolutionDue < new Date()}
                />
              )}
              {ticket.tags.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ticket.tags.map(({ tag }) => (
                      <span key={tag.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                        style={{ background: tag.color }}>
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className={warn ? "text-red-400 font-medium" : "text-slate-300"}>{value}</span>
    </div>
  );
}
