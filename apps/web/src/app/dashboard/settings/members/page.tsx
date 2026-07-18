import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Badge, Avatar, AvatarFallback, AvatarImage } from "@flowdesk/ui";
import { getInitials, formatDate } from "@/lib/utils";
import { InviteMemberForm } from "./invite-member-form";

export default async function MembersPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/onboarding");

  const members = await db.organizationMember.findMany({
    where: { organizationId: session.user.organizationId, isActive: true },
    include: { user: { select: { id: true, name: true, email: true, image: true, createdAt: true } } },
    orderBy: { joinedAt: "asc" },
  });

  const canManage = ["OWNER","ADMIN"].includes(session.user.role ?? "");
  const roleVariant: Record<string, "default"|"success"|"secondary"|"warning"> = {
    OWNER: "success", ADMIN: "default", AGENT: "secondary", VIEWER: "secondary",
  };

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Team Members</h1>
          <p className="text-slate-400 text-sm mt-0.5">{members.length} members</p>
        </div>
      </div>

      {canManage && (
        <Card className="mb-6">
          <CardHeader className="pb-3"><CardTitle className="text-base">Invite Member</CardTitle></CardHeader>
          <CardContent><InviteMemberForm /></CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-800">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                <Avatar className="w-9 h-9 flex-shrink-0">
                  <AvatarImage src={m.user.image ?? undefined} />
                  <AvatarFallback className="text-xs">{getInitials(m.user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{m.user.name ?? "Unknown"}</p>
                  <p className="text-xs text-slate-500 truncate">{m.user.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={roleVariant[m.role] ?? "secondary"}>{m.role}</Badge>
                  <span className="text-xs text-slate-600 hidden sm:block">Joined {formatDate(m.joinedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
