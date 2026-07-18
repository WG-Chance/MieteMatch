import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Card, CardContent } from "@flowdesk/ui";
import { AcceptInviteButton } from "./accept-invite-button";
import { Mail, Building2 } from "lucide-react";

export default async function AcceptInvitePage({ params }: { params: { token: string } }) {
  const session = await auth();

  const invitation = await db.invitation.findUnique({
    where: { token: params.token },
    include: { organization: { select: { name: true } }, invitedBy: { select: { name: true } } },
  });

  if (!invitation) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-sm mx-4">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-xl font-bold text-slate-100 mb-2">Invalid Link</h1>
          <p className="text-slate-400 text-sm mb-6">This invitation link is invalid or has expired.</p>
          <Link href="/auth/signin"><Button>Sign In</Button></Link>
        </div>
      </div>
    );
  }

  if (invitation.expiresAt < new Date()) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-sm mx-4">
          <div className="text-5xl mb-4">⏰</div>
          <h1 className="text-xl font-bold text-slate-100 mb-2">Invitation Expired</h1>
          <p className="text-slate-400 text-sm mb-6">Ask your team to send a new invite.</p>
          <Link href="/auth/signin"><Button>Sign In</Button></Link>
        </div>
      </div>
    );
  }

  if (invitation.acceptedAt) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-2xl mb-5">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">You&apos;ve been invited!</h1>
          <p className="text-slate-400 text-sm mt-2">
            {invitation.invitedBy.name} invited you to join{" "}
            <strong className="text-slate-200">{invitation.organization.name}</strong>
          </p>
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="p-3 rounded-lg bg-slate-800 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Organization</span>
                <span className="text-slate-200 font-medium">{invitation.organization.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Role</span>
                <span className="text-slate-200 font-medium">{invitation.role}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Invited email</span>
                <span className="text-slate-200 font-medium flex items-center gap-1">
                  <Mail className="w-3 h-3" />{invitation.email}
                </span>
              </div>
            </div>
            {session?.user ? (
              <AcceptInviteButton token={params.token} userEmail={session.user.email ?? ""} inviteEmail={invitation.email} />
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 text-center">Sign in with the invited email address to accept</p>
                <Link href={`/auth/signin?callbackUrl=/invite/${params.token}`}>
                  <Button className="w-full">Sign in to Accept</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
