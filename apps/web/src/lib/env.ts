function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`[FlowDesk] Missing required env var: ${key}`);
  return v;
}
function optional(key: string, fb = ""): string { return process.env[key] ?? fb; }

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  AUTH_SECRET: required("AUTH_SECRET"),
  AUTH_GOOGLE_ID: required("AUTH_GOOGLE_ID"),
  AUTH_GOOGLE_SECRET: required("AUTH_GOOGLE_SECRET"),
  STRIPE_SECRET_KEY: required("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: required("STRIPE_WEBHOOK_SECRET"),
  STRIPE_STARTER_PRICE_ID: required("STRIPE_STARTER_PRICE_ID"),
  STRIPE_GROWTH_PRICE_ID: required("STRIPE_GROWTH_PRICE_ID"),
  STRIPE_SCALE_PRICE_ID: required("STRIPE_SCALE_PRICE_ID"),
  RESEND_API_KEY: required("RESEND_API_KEY"),
  OPENAI_API_KEY: required("OPENAI_API_KEY"),
  OPENAI_MODEL: optional("OPENAI_MODEL", "gpt-4o-mini"),
  NEXT_PUBLIC_APP_URL: optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  NODE_ENV: optional("NODE_ENV", "development"),
} as const;
