"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Ticket, BarChart3, Settings,
  Users, LogOut, Sparkles, CreditCard, Zap,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage, Badge } from "@flowdesk/ui";
import type { MemberRole } from "@prisma/client";

interface SidebarUser {
  name: string | null | undefined;
  email: string | null | undefined;
  image: string | null | undefined;
  role: MemberRole | null;
}

interface SidebarProps {
  user: SidebarUser;
  orgName: string;
  plan: string;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/tickets", label: "Tickets", icon: Ticket, exact: false },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, exact: false },
  { href: "/dashboard/settings/members", label: "Team", icon: Users, exact: false },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, exact: true },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard, exact: false },
];

export function Sidebar({ user, orgName, plan }: SidebarProps) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean): boolean {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  const planVariant = plan === "SCALE" ? "success" : plan === "GROWTH" ? "default" : "secondary";

  return (
    <aside className="w-60 min-h-screen bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
      {/* Brand */}
      <div className="p-5 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-100 text-sm truncate">{orgName}</p>
            <p className="text-[10px] text-indigo-400 font-medium tracking-wide">FlowDesk</p>
          </div>
        </Link>
      </div>

      {/* Plan */}
      <div className="px-4 py-2.5 border-b border-slate-800 flex items-center gap-2">
        <Sparkles className="w-3 h-3 text-indigo-400 flex-shrink-0" />
        <span className="text-xs text-slate-500">Plan:</span>
        <Badge variant={planVariant} className="text-[10px] py-0 px-2">{plan}</Badge>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-600/25"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-2.5 mb-3">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
            <AvatarFallback className="text-[10px]">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-200 truncate">{user.name ?? "Agent"}</p>
            <p className="text-[10px] text-slate-500 truncate">{user.role ?? "AGENT"}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-800 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
