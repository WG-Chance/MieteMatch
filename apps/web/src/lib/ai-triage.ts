import OpenAI from "openai";
import type { AiTriageResult, TicketPriority } from "@flowdesk/types";

// Internal type that extends the public result with tracking fields
export interface TriageResultInternal extends AiTriageResult {
  processingMs: number;
  modelVersion: string;
}

const VALID_PRIORITIES: TicketPriority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const VALID_SENTIMENTS = ["POSITIVE", "NEUTRAL", "NEGATIVE", "URGENT"] as const;
const VALID_CATEGORIES = ["billing", "technical", "account", "feature-request", "bug", "general"] as const;

const SYSTEM_PROMPT = `You are a customer support triage AI. Analyze the ticket and return ONLY valid JSON.

Respond with exactly:
{
  "category": "billing|technical|account|feature-request|bug|general",
  "priority": "CRITICAL|HIGH|MEDIUM|LOW",
  "sentiment": "POSITIVE|NEUTRAL|NEGATIVE|URGENT",
  "suggestedTags": ["tag1", "tag2"],
  "summary": "one sentence summary",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Priority rules:
- CRITICAL: service down, data loss, security breach, cannot use product
- HIGH: major feature broken, significant business impact
- MEDIUM: partial breakage, workaround exists
- LOW: cosmetic, feature request, general question

Return ONLY the JSON. No markdown.`;

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("[FlowDesk AI] Missing OPENAI_API_KEY");
  return new OpenAI({ apiKey: key });
}

export async function triageTicket(
  subject: string,
  firstMessage: string
): Promise<TriageResultInternal> {
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const start = Date.now();

  const prompt = `Subject: ${subject}\n\nMessage:\n${firstMessage.slice(0, 2000)}`;

  let raw = "{}";
  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      max_tokens: 400,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });
    raw = response.choices[0]?.message?.content ?? "{}";
  } catch (error) {
    console.error("[FlowDesk AI] Triage API failed:", error);
    return buildFallback(subject, Date.now() - start, model);
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return validateAndSanitize(parsed, Date.now() - start, model);
  } catch {
    console.error("[FlowDesk AI] Triage JSON parse failed:", raw.slice(0, 200));
    return buildFallback(subject, Date.now() - start, model);
  }
}

function validateAndSanitize(
  raw: Record<string, unknown>,
  processingMs: number,
  modelVersion: string
): TriageResultInternal {
  const priority: TicketPriority = VALID_PRIORITIES.includes(raw.priority as TicketPriority)
    ? (raw.priority as TicketPriority)
    : "MEDIUM";

  const sentiment: AiTriageResult["sentiment"] = VALID_SENTIMENTS.includes(
    raw.sentiment as (typeof VALID_SENTIMENTS)[number]
  )
    ? (raw.sentiment as AiTriageResult["sentiment"])
    : "NEUTRAL";

  const category: string = VALID_CATEGORIES.includes(
    raw.category as (typeof VALID_CATEGORIES)[number]
  )
    ? (raw.category as string)
    : "general";

  const suggestedTags: string[] = Array.isArray(raw.suggestedTags)
    ? (raw.suggestedTags as unknown[])
        .filter((t): t is string => typeof t === "string" && t.length <= 30)
        .slice(0, 5)
    : [];

  const confidence =
    typeof raw.confidence === "number"
      ? Math.min(1, Math.max(0, raw.confidence))
      : 0.7;

  return {
    category,
    priority,
    sentiment,
    suggestedTags,
    summary:
      typeof raw.summary === "string"
        ? raw.summary.slice(0, 200)
        : "Support request",
    confidence,
    reasoning:
      typeof raw.reasoning === "string" ? raw.reasoning.slice(0, 500) : "",
    processingMs,
    modelVersion,
  };
}

function buildFallback(
  subject: string,
  processingMs: number,
  modelVersion: string
): TriageResultInternal {
  return {
    category: "general",
    priority: "MEDIUM",
    sentiment: "NEUTRAL",
    suggestedTags: [],
    summary: `Support request: ${subject.slice(0, 100)}`,
    confidence: 0.0,
    reasoning: "Fallback: AI triage unavailable",
    processingMs,
    modelVersion: `${modelVersion}-fallback`,
  };
}
