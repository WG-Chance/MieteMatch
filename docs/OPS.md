# OPS.md — Disaster Recovery

## Database Backup (Neon / Supabase)

Neon and Supabase both provide **continuous WAL-based backups** with point-in-time recovery (PITR).

- Neon Free: 7-day restore window
- Neon Pro: 30-day restore window (recommended for production)
- Supabase Pro: 7-day PITR

**Assumed behavior:** Backups run automatically. You do not manage them manually.

---

## Restore Procedure

### If data is corrupted or accidentally deleted:

1. Go to Neon dashboard → your project → Branches
2. Click **"Restore"** → select a point in time before the incident
3. Neon creates a new branch from that point
4. Update `DATABASE_URL` in Vercel dashboard to point to the restored branch
5. Redeploy the app (Vercel → Deployments → Redeploy latest)
6. Verify data integrity with Prisma Studio: `npm run db:studio`
7. Once confirmed, promote the restored branch to main in Neon

**Expected time:** 15–30 minutes end-to-end.

---

## What Data Loss Is Acceptable

| Data | Acceptable to lose? |
|------|---------------------|
| Audit logs | Yes — operational records, not customer data |
| AI triage results | Yes — can be re-run |
| Session tokens | Yes — users re-login |
| Tickets | **NO** — core product data |
| Customer records | **NO** — GDPR obligation |
| Subscriptions | **NO** — billing source of truth is Stripe, but local state must match |
| Organization data | **NO** |

---

## Subscription Recovery After DB Restore

If you restore to a point before a Stripe webhook was processed:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Find the failed events (will show as undelivered after your restore point)
3. Click **"Resend"** on each event
4. The webhook handler will reprocess and correct the DB state

The webhook handler is idempotent — resending is safe.

---

## Solo Founder Responsibility During an Incident

You are the only person. Do this in order:

1. **Assess:** Is the site down for all users, or one org, or one feature?
2. **Check Vercel:** Dashboard → Functions tab → look for error spikes
3. **Check DB:** Neon dashboard → is the instance running?
4. **Check logs:** Vercel → Deployments → latest deployment → Runtime Logs
5. **Decide:** Rollback to previous deployment (Vercel → Deployments → previous → Redeploy) OR fix forward
6. **Communicate:** If customers are affected, post a status update on your status page or email them directly

**Rollback is almost always faster than fixing forward at 2am.**
