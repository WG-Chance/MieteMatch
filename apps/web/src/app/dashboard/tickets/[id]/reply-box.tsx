"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Textarea } from "@flowdesk/ui";
import { Send, Lock, Loader2 } from "lucide-react";

interface ReplyBoxProps {
  ticketId: string;
  currentUserId: string;
}

export function ReplyBox({ ticketId }: ReplyBoxProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), isInternal }),
      });
      if (res.ok) {
        setContent("");
        setIsInternal(false);
        router.refresh();
      } else {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to send reply");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className={`rounded-xl border p-1 transition-colors ${isInternal ? "border-yellow-700/50 bg-yellow-950/10" : "border-slate-700"}`}>
        <Textarea
          placeholder={isInternal ? "Write an internal note (not visible to customer)..." : "Write a reply to the customer..."}
          value={content}
          onChange={e => setContent(e.target.value)}
          className="min-h-[100px] border-0 bg-transparent focus-visible:ring-0 text-sm"
          disabled={loading}
        />
        <div className="flex items-center justify-between px-2 pb-1 pt-0.5">
          <button
            type="button"
            onClick={() => setIsInternal(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors ${isInternal ? "bg-yellow-900/40 text-yellow-400" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"}`}
          >
            <Lock className="w-3 h-3" />
            {isInternal ? "Internal note" : "Make internal"}
          </button>
          <Button type="submit" size="sm" disabled={loading || !content.trim()} className="gap-1.5 text-xs h-7">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            {isInternal ? "Add Note" : "Send Reply"}
          </Button>
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
