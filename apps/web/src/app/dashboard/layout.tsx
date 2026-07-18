import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPlan } from "@/lib/subscription";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  if (!session.user.organizationId) redirect("/onboarding");

  const [user, org, plan] = await Promise.all([
    db.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true, image: true } }),
    db.organization.findUnique({ where: { id: session.user.organizationId }, select: { name: true } }),
    getPlan(session.user.organizationId),
  ]);

  if (!user || !org) redirect("/auth/signin");

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar
        user={{ ...user, role: session.user.role }}
        orgName={org.name}
        plan={plan}
      />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
