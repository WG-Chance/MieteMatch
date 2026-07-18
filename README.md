# FlowDesk

> AI-powered customer support operations platform for modern SaaS teams.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 App Router (TypeScript strict) |
| Monorepo | Turborepo |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth v5 (Google OAuth, database sessions) |
| Payments | Stripe Subscriptions + Webhooks |
| Email | Resend |
| AI | OpenAI `gpt-4o-mini` (JSON mode) |
| Validation | Zod |
| UI | Radix UI + Tailwind CSS |
| Deployment | Vercel |

## Quick Start

```bash
npm install
cp .env.example apps/web/.env.local
# Fill in environment variables
npm run db:push
npm run dev
```

See `docs/SETUP.md` for full setup guide.

## Plans

| Feature | Starter ($29) | Growth ($79) | Scale ($199) |
|---------|:---:|:---:|:---:|
| Agent seats | 3 | 10 | Unlimited |
| Tickets/month | 500 | 2,000 | Unlimited |
| AI triage | — | ✓ | ✓ |
| SLA tracking | — | ✓ | ✓ |
| Analytics | — | ✓ | ✓ |
| API access | — | ✓ | ✓ |
| Priority support | — | — | ✓ |

## AI Triage

Automatically classifies every incoming ticket by:
- **Category** — billing, technical, account, feature-request, bug, general
- **Priority** — CRITICAL / HIGH / MEDIUM / LOW
- **Sentiment** — POSITIVE / NEUTRAL / NEGATIVE / URGENT
- **Confidence score** — 0.0–1.0

Auto-adjusts ticket priority when confidence ≥ 0.85. Advisory only — never closes, assigns, or deletes.

## Project Structure

```
flowdesk/
├── apps/web/          # Next.js application
│   ├── src/app/       # Pages + API routes
│   ├── src/lib/       # Server utilities
│   └── src/components/
├── packages/
│   ├── db/            # Prisma client
│   ├── types/         # Shared types + plan limits
│   ├── ui/            # Component library
│   ├── emails/        # Email templates
│   └── config/        # Shared configs
└── prisma/
    ├── schema.prisma
    └── migrations/
```

## License

MIT
