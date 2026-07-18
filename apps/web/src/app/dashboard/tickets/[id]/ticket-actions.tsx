"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@flowdesk/ui";
import { Loader2, Sparkles } from "lucide-react";
import type { TicketStatus, TicketPriority, MemberRole } from "@prisma/client";

interface Member { id: string; name: string | null; image: string | null; }
interface TicketActionsProps {
  ticket: { id: string; status: TicketStatus; priority: TicketPriority; assignedToId: string | null };
  members: Member[];
  currentUserRole: MemberRole | string;
}

const STATUSES: TicketStatus[] = ["OPEN","IN_PROGRESS","WAITING_ON_CUSTOMER","RESOLVED","CLOSED"];
const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open", IN_PROGRESS: "In Progress", WAITING_ON_CUSTOMER: "Waiting on Customer",
  RESOLVED: "Resolved", CLOSED: "Closed",
};
const PRIORITIES: TicketPriority[] = ["CRITICAL","HIGH","MEDIUM","LOW"];

export function TicketActions({ ticket, members, currentUserRole }: TicketActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [triageLoading, setTriageLoading] = useState(false);

  const canEdit = ["OWNER","ADMIN","AGENT"].includes(currentUserRole);

  async function update(field: string, value: string | null) {
    setLoading(field);
    try {
      await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      router.refresh();
    } finally { setLoading(null); }
  }

  async function assign(userId: string | null) {
    setLoading("assign");
    try {
      await fetch(`/api/tickets/${ticket.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: userId }),
      });
      router.refresh();
    } finally { setLoading(null); }
  }

  async function runTriage() {
    setTriageLoading(true);
    try {
      await fetch(`/api/tickets/${ticket.id}/triage`, { method: "POST" });
      router.refresh();
    } finally { setTriageLoading(false); }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {canEdit && (
          <>
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Status</p>
              <Select value={ticket.status} onValueChange={(v) => update("status", v)} disabled={!!loading}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Priority</p>
              <Select value={ticket.priority} onValueChange={(v) => update("priority", v)} disabled={!!loading}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Assigned To</p>
              <Select
                value={ticket.assignedToId ?? "unassigned"}
                onValueChange={(v) => assign(v === "unassigned" ? null : v)}
                disabled={!!loading}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name ?? m.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={runTriage}
              disabled={triageLoading}
            >
              {triageLoading
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Sparkles className="w-3 h-3" />}
              Re-run AI Triage
            </Button>
          </>
        )}
        {loading && (
          <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Saving...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
