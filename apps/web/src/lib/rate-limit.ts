import { NextRequest } from "next/server";

const store = new Map<string, { count: number; resetAt: number }>();

const CONFIGS: Record<string, { requests: number; windowMs: number }> = {
  default: { requests: 60, windowMs: 60_000 },
  auth: { requests: 10, windowMs: 60_000 },
  tickets: { requests: 30, windowMs: 60_000 },
  ai: { requests: 10, windowMs: 60_000 },
  stripe: { requests: 10, windowMs: 60_000 },
  widget: { requests: 20, windowMs: 60_000 },
};

export function rateLimit(req: NextRequest, key = "default"): { success: boolean } {
  const config = CONFIGS[key] ?? CONFIGS.default;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const storeKey = `${key}:${ip}`;
  const now = Date.now();
  const entry = store.get(storeKey);

  if (!entry || now > entry.resetAt) {
    store.set(storeKey, { count: 1, resetAt: now + config.windowMs });
    return { success: true };
  }

  if (entry.count >= config.requests) return { success: false };
  entry.count++;
  return { success: true };
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) if (now > v.resetAt) store.delete(k);
}, 5 * 60_000);
