# FlowDesk — Architecture

## Structure
Turborepo monorepo with:
- `apps/web` — Next.js 14 App Router (main application)
- `packages/db` — Prisma client singleton
- `packages/types` — Shared TypeScript types, plan limits
- `packages/ui` — Radix UI component library
- `packages/emails` — Resend email templates
- `packages/config` — Shared tsconfig presets

## Multi-tenancy
Every data table carries `organizationId`. All queries are scoped. No cross-tenant leakage possible via Prisma.

## AI Triage
- Model: `gpt-4o-mini` with JSON mode and temperature 0.1
- Validates all output before persistence (category, priority, sentiment enums)
- Falls back gracefully — never blocks ticket creation
- Auto-adjusts ticket priority only when confidence > 0.85
- AI never closes, assigns, or deletes — advisory only

## Plan Enforcement
- `PLAN_LIMITS` in `@flowdesk/types` is the single source of truth
- Checked server-side via `canUsePlanFeature(orgId, feature)`
- Stripe webhook is the only plan writer
- Plans: STARTER ($29) → GROWTH ($79) → SCALE ($199)

## SLA Enforcement
- Due dates computed at ticket creation from `SlaPolicy`
- Stored on ticket for efficient SQL indexing
- Vercel Cron (`/api/cron/sla-check`) runs every 15 minutes
- Breach emails sent to OWNER/ADMIN roles
- Status: OK → WARNING (2hr warning) → BREACHED

## Security Layers
1. Rate limiting (per-IP, per-endpoint)
2. NextAuth database session validation
3. Organization membership check
4. Role authorization (OWNER/ADMIN/AGENT/VIEWER)
5. Zod input validation
6. Tenant-scoped Prisma queries

## Audit Log
Append-only. Written on every state change, payment, AI action, member change.
Fields: organizationId, userId, action (enum), entityId, before/after JSON.
