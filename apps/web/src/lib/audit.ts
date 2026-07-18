import { db } from "@/lib/db";
import type { AuditAction } from "@prisma/client";

export async function audit(data: {
  organizationId: string;
  userId?: string;
  action: AuditAction;
  entityId?: string;
  entityType?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  try {
    await db.auditLog.create({ data });
  } catch (e) {
    console.error("[FlowDesk Audit] Failed:", e);
  }
}
