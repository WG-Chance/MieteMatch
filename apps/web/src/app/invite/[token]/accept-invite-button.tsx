"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@flowdesk/ui";
import { Loader2, CheckCircle } from "lucide-react";

export function AcceptInviteButton({
  token,
  userEmail,
  inviteEmail,
}: {
  token: string;
  userEmail: string;
  inviteEmail: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailMismatch = userEmail.toLowerCase() !== inviteEmail.toLowerCase();

  async function accept() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, { method: "POST" });
      const data = await res.json() as { organizationId?: string; error?: string };
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(data.error ?? "Failed to accept invitation");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (emailMismatch) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-yellow-400 text-center">
          You&apos;re signed in as <strong>{userEmail}</strong> but the invite was sent to <strong>{inviteEmail}</strong>.
          Sign in with the correct account to accept.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button className="w-full gap-2" onClick={accept} disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
        Accept Invitation
      </Button>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  );
}
