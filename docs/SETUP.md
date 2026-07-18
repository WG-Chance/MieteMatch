# FlowDesk — Setup Guide

## Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or Neon/Supabase)
- Stripe account
- Google Cloud Console project
- Resend account
- OpenAI account

## 1. Install Dependencies
```bash
npm install
```

## 2. Environment Variables
```bash
cp .env.example apps/web/.env.local
# Fill in all values
```

## 3. Database
```bash
# Development — push schema directly
npm run db:push

# Production — run migrations
npm run db:migrate
```

## 4. Google OAuth
1. Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Authorized redirect URI: `https://your-domain.com/api/auth/callback/google`
4. Copy Client ID → `AUTH_GOOGLE_ID`
5. Copy Client Secret → `AUTH_GOOGLE_SECRET`

## 5. Stripe Setup
1. Create product "FlowDesk Starter" with $29/month price → `STRIPE_STARTER_PRICE_ID`
2. Create product "FlowDesk Growth" with $79/month price → `STRIPE_GROWTH_PRICE_ID`
3. Create product "FlowDesk Scale" with $199/month price → `STRIPE_SCALE_PRICE_ID`
4. Copy Secret Key → `STRIPE_SECRET_KEY`
5. Webhook endpoint: `https://your-domain.com/api/stripe/webhook`
6. Webhook events to enable:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
7. Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`

### Local Stripe testing
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 6. Resend
1. Create account at resend.com
2. Verify your sending domain
3. Create API key → `RESEND_API_KEY`
4. Set `RESEND_FROM_EMAIL` to your verified domain email

## 7. OpenAI
1. Create account at platform.openai.com
2. Create API key → `OPENAI_API_KEY`
3. Default model: `gpt-4o-mini` (cost-efficient for classification)

## 8. Auth Secret
```bash
openssl rand -base64 32
# Copy output → AUTH_SECRET
```

## 9. Run Development
```bash
npm run dev
# Opens at http://localhost:3000
```

## 10. Deploy to Vercel
```bash
npx vercel
# Set all environment variables in Vercel dashboard
```

## SLA Cron Job
The `/api/cron/sla-check` route runs every 15 minutes via Vercel Cron.
Set `CRON_SECRET` env var and add to vercel.json (already configured).
