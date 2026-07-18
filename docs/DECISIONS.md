# DECISIONS.md — Anti-Overengineering Guardrails

## What "Launch-Ready" Means for This SaaS

Launch-ready means:
- A paying customer can sign up, create tickets, manage their team, and contact support
- A Stripe subscription can be created, upgraded, and cancelled without manual intervention
- Data is not lost if the app crashes
- You can diagnose a production issue within 30 minutes using logs alone
- You can onboard 10 customers without the system breaking

Launch-ready does NOT mean:
- Zero bugs
- Perfect performance
- Feature parity with Zendesk
- Automated everything

---

## What Is Explicitly Postponed

Do not work on any of the following until you have 10 paying customers:

| Feature | Reason Postponed |
|---------|-----------------|
| Email ingestion (inbound email → ticket) | High complexity, Resend inbound is not trivial. Widget covers launch. |
| Customer portal | Agents can copy ticket URLs manually. Not blocking revenue. |
| Slack integration | Nice-to-have. Webhook system would come first. |
| File attachments | Schema column exists. S3 setup and signed URLs add complexity. |
| Knowledge base | Separate product surface. Out of scope for V1. |
| Real-time collision detection | WebSockets add operational overhead. Not needed at early scale. |
| AI suggested replies | Current AI triage is enough. Don't add OpenAI cost before validating. |
| Redis / Upstash rate limiting | In-memory is fine on a single Vercel deployment. |
| Usage-based billing enforcement | Implement when first customer hits a limit. |
| Multi-language widget | Target English-speaking market first. |
| Report export (PDF/CSV) | Build when an enterprise customer asks for it. |
| Public status page | Manual tweet works fine at <50 customers. |
| CSAT surveys | Add when you have enough volume to measure. |

---

## Criteria to Resume Feature Development

Only add a new feature when one of these is true:

1. **A paying customer explicitly asks for it** — not "would be nice", but "I need this to continue paying"
2. **You are losing deals because of its absence** — confirmed in sales conversations, not assumed
3. **A current feature is causing churn** — users leaving because something doesn't work, not because something is missing

Do not add features because:
- You think customers might want it
- Competitors have it
- It would be technically interesting
- You are bored with the current state

---

## Rules to Prevent Feature Creep

**The 48-hour rule:** If an idea feels urgent, wait 48 hours before starting it. Most urgency is an illusion.

**The customer rule:** You must be able to name a specific customer who needs this feature before building it.

**The rollback rule:** Every change must be deployable and rollback-able independently. No bundled releases.

**The scope rule:** If a "small fix" requires touching more than 3 files, it is not small. Stop and plan it.

**The dependency rule:** Do not add a new npm package for a problem that can be solved with 10 lines of code.

---

## What Should NOT Be Worked On Next

In order of temptation (resist all of these):

1. Rewriting the rate limiter in Redis — the in-memory version works
2. Adding Sentry or another error monitoring tool — Vercel logs are sufficient at this stage
3. Building a public API — no customer has asked for it yet
4. Adding more auth providers — Google covers most B2B users
5. Refactoring the monorepo structure — it works, touching it adds risk with no user value
6. Performance optimization — premature, no users to measure against yet

---

## The Only Honest Question

Before starting anything new, ask:

> "Will this help me close my next 5 paying customers, or retain the ones I have?"

If the answer is no, do not build it.
