"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Textarea, Card, CardContent, CardHeader, CardTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@flowdesk/ui";
import { ArrowLeft, Loader2, Ticket } from "lucide-react";
import Link from "next/link";

export default function NewTicketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    subject: "", message: "", priority: "MEDIUM",
    customerEmail: "", customerName: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: form.subject,
          message: form.message,
          priority: form.priority,
          channel: "MANUAL",
          customerEmail: form.customerEmail || undefined,
          customerName: form.customerName || undefined,
        }),
      });
      const data = await res.json() as { id?: string; error?: string };
      if (res.ok && data.id) {
        router.push(`/dashboard/tickets/${data.id}`);
      } else {
        setError(typeof data.error === "string" ? data.error : "Failed to create ticket");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <Link href="/dashboard/tickets" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 mb-6">
        <ArrowLeft className="w-4 h-4" /> All Tickets
      </Link>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-600/15 border border-indigo-600/25 flex items-center justify-center">
          <Ticket className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">New Ticket</h1>
          <p className="text-slate-400 text-sm">Create a support ticket manually</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Customer</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" className="mt-1" placeholder="customer@example.com"
                  value={form.customerEmail} onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="cname">Name</Label>
                <Input id="cname" className="mt-1" placeholder="Jane Smith"
                  value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Ticket Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Input id="subject" className="mt-1" placeholder="Brief description of the issue"
                value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                required minLength={3} maxLength={255} />
            </div>
            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea id="message" className="mt-1 min-h-[120px]" placeholder="Full description..."
                value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                required minLength={1} />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["CRITICAL","HIGH","MEDIUM","LOW"].map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading || !form.subject || !form.message} className="flex-1">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Ticket"}
          </Button>
          <Link href="/dashboard/tickets">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
