import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canUsePlanFeature } from "@/lib/subscription";
import { rateLimit } from "@/lib/rate-limit";
import { startOfDay, subDays, startOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  const rl = rateLimit(req);
  if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAnalytics = await canUsePlanFeature(session.user.organizationId, "analytics");
  if (!canAnalytics) {
    return NextResponse.json({ error: "Analytics requires Growth or Scale plan", requiresUpgrade: true }, { status: 402 });
  }

  const orgId = session.user.organizationId;
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const monthStart = startOfMonth(now);

  const [
    totalOpen,
    totalResolved,
    totalThisMonth,
    ,
    breachedSla,
    byPriority,
    byStatus,
    byChannel,
    recentTrend,
  ] = await Promise.all([
    db.ticket.count({ where: { organizationId: orgId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.ticket.count({ where: { organizationId: orgId, status: { in: ["RESOLVED", "CLOSED"] }, resolvedAt: { gte: monthStart } } }),
    db.ticket.count({ where: { organizationId: orgId, createdAt: { gte: monthStart } } }),
    Promise.resolve(null), // avg resolution time placeholder
    db.ticket.count({ where: { organizationId: orgId, slaStatus: "BREACHED" } }),
    db.ticket.groupBy({
      by: ["priority"],
      where: { organizationId: orgId, status: { in: ["OPEN", "IN_PROGRESS"] } },
      _count: { priority: true },
    }),
    db.ticket.groupBy({
      by: ["status"],
      where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } },
      _count: { status: true },
    }),
    db.ticket.groupBy({
      by: ["channel"],
      where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } },
      _count: { channel: true },
    }),
    // Last 14 days daily ticket counts
    Promise.all(
      Array.from({ length: 14 }, (_, i) => {
        const d = startOfDay(subDays(now, 13 - i));
        const next = startOfDay(subDays(now, 12 - i));
        return db.ticket.count({
          where: { organizationId: orgId, createdAt: { gte: d, lt: next } },
        }).then(count => ({ date: d.toISOString().slice(0, 10), count }));
      })
    ),
  ]);

  return NextResponse.json({
    summary: {
      totalOpen,
      totalResolved,
      totalThisMonth,
      breachedSla,
    },
    byPriority: byPriority.map(r => ({ priority: r.priority, count: r._count.priority })),
    byStatus: byStatus.map(r => ({ status: r.status, count: r._count.status })),
    byChannel: byChannel.map(r => ({ channel: r.channel, count: r._count.channel })),
    recentTrend,
  });
}
