# OPERATIONS.md — Founder Runbook

This document covers how to handle operational situations as a solo founder.
Read this before an incident, not during one.

---

## How to Disable an Organization Safely

Use this when an org is abusing the system, has an unpaid bill, or you need to suspend them.

1. Open Prisma Studio: `npm run db:studio`
2. Find the `Subscription` table → locate the org's record
3. Set `status` to `INACTIVE`
4. The app checks `canUsePlanFeature()` server-side — they lose access to Pro features immediately
5. To fully block login: set `isActive = false` on all `OrganizationMember` records for that org
6. The org's data remains intact — they cannot log in but nothing is deleted

**To re-enable:** Set `isActive = true` on their members and `status = ACTIVE` on their subscription.

---

## How to Handle Stripe Payment Failures

When a payment fails, Stripe sets the subscription to `past_due`. Your webhook writes `PAST_DUE` to the DB.

**What happens to the customer:**
- They lose access to Pro features immediately (plan check returns STARTER)
- No automated email from your app (Stripe sends its own dunning emails)

**Your actions:**
1. Check Stripe Dashboard → Customers → find the customer
2. See the invoice status — is it retrying automatically? Stripe retries 3–4 times over ~2 weeks
3. If they contact you: send them the Stripe customer portal link (`/api/stripe/portal`)
4. If they update their card: Stripe automatically retries the invoice
5. After successful payment: Stripe fires `invoice.payment_succeeded` → your webhook updates DB to `ACTIVE`

**You do not need to manually intervene** unless the customer contacts you.

---

## How to Manually Resolve Subscription Mismatches

A mismatch happens when Stripe shows ACTIVE but your DB shows INACTIVE, or vice versa.

**Step 1: Identify the correct state**
- Stripe Dashboard is always the source of truth for billing state
- Your DB should reflect Stripe

**Step 2: Find the customer**
```
Stripe Dashboard → Customers → search by email
Note their: subscription status, current plan price ID
```

**Step 3: Fix the DB via Prisma Studio**
```
Open: npm run db:studio
Table: Subscription
Find: by stripeCustomerId
Update:
  - status → match Stripe status (ACTIVE/CANCELLED/PAST_DUE)
  - plan → STARTER/GROWTH/SCALE (based on price ID)
  - currentPeriodEnd → match Stripe's current_period_end (Unix timestamp → date)
```

**Step 4: Replay the webhook (preferred)**
```
Stripe Dashboard → Developers → Webhooks → your endpoint
Find the relevant event (customer.subscription.updated)
Click Resend
```
Replaying is safer than manual edits because it goes through validation logic.

---

## How to Respond to Production Incidents

**Severity 1: Site completely down (500 on all routes)**
1. Check Vercel status: status.vercel.com
2. Check Neon status: neon.tech/status
3. Check your last deployment: did you just deploy? Rollback immediately.
4. If Vercel is fine: check Runtime Logs for the specific error

**Severity 2: Feature broken for all users**
1. Reproduce the issue in a private browser window
2. Check Vercel Runtime Logs → filter by the affected route
3. If it's a DB query error: check if schema migration ran correctly
4. Fix forward if < 30 minutes, rollback if > 30 minutes

**Severity 3: Issue for one organization**
1. Ask them to send you their organization ID (visible in URL or Prisma Studio)
2. Check AuditLog table for recent events for their org
3. Check if their subscription state is correct

**General rule:** If you can't diagnose in 15 minutes, rollback and diagnose on the previous version.

---

## How to Delete Customer Data (GDPR)

When a customer requests deletion of their personal data:

**Step 1: Confirm identity**
- They must send the request from their registered email

**Step 2: Delete via Prisma Studio**
```
1. Find their User record by email
2. Note their userId and organizationId
3. Delete OrganizationMember records for this user
4. Delete their User record
   → Cascade deletes: Account, Session, assignedTickets (sets null)
5. If they are the org OWNER and want the entire org deleted:
   - Delete Organization record
   - Cascade deletes: all Tickets, Customers, Members, Subscriptions, AuditLogs
6. In Stripe: Dashboard → Customers → delete customer record
7. In Resend: no stored customer data (emails are transactional only)
```

**Step 3: Confirm**
- Reply to their email confirming deletion within 30 days of request
- Keep a record that you processed the request (personal note or spreadsheet is fine at this scale)

**Warning:** Deleting an OWNER deletes the entire organization and all its tickets. Confirm with them.

---

## Routine Checks (Weekly, 5 minutes)

- [ ] Vercel dashboard: any function error spikes?
- [ ] Stripe dashboard: any failed payments unresolved?
- [ ] Neon dashboard: database size growing as expected?
- [ ] Check the cron job ran: GET /api/cron/sla-check should appear in Vercel logs every 15 min
