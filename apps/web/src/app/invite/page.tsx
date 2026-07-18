import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@flowdesk/ui";

export default function InvitePage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center max-w-sm mx-4">
        <h1 className="text-xl font-bold text-slate-100 mb-2">Invalid Invitation Link</h1>
        <p className="text-slate-400 text-sm mb-6">The invitation link is invalid or missing a token.</p>
        <Link href="/auth/signin"><Button>Sign In</Button></Link>
      </div>
    </div>
  );
}
