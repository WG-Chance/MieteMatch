import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@flowdesk/ui";
import { OrgSettingsForm } from "./org-settings-form";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/onboarding");

  const org = await db.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { id: true, name: true, website: true, timezone: true, slug: true },
  });

  if (!org) redirect("/onboarding");

  const canEdit = ["OWNER","ADMIN"].includes(session.user.role ?? "");

  return (
    <div className="animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-100 mb-6">Organization Settings</h1>
      <OrgSettingsForm org={org} canEdit={canEdit} />
    </div>
  );
}
