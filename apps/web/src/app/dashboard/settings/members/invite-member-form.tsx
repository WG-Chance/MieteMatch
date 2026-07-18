"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@flowdesk/ui";
import { Loader2, UserPlus } from "lucide-react";

export function InviteMemberForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("AGENT");
  const [message, setMessage] = useState<{ type: "success"|"error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json() as { error?: string };
      if (res.ok) {
        setMessage({ type: "success", text: `Invitation sent to ${email}` });
        setEmail("");
        router.refresh();
      } else {
        setMessage({ type: "error", text: data.error ?? "Failed to send invite" });
      }
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
      <div className="flex-1">
        <Label htmlFor="inv-email">Email</Label>
        <Input id="inv-email" type="email" className="mt-1" placeholder="colleague@company.com"
          value={email} onChange={e => setEmail(e.target.value)} required />
      </div>
      <div className="w-36">
        <Label>Role</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="AGENT">Agent</SelectItem>
            <SelectItem value="VIEWER">Viewer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={loading || !email} className="gap-2 mb-px">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
        Invite
      </Button>
      {message && (
        <p className={`text-xs ${message.type === "success" ? "text-emerald-400" : "text-red-400"} mt-1`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
