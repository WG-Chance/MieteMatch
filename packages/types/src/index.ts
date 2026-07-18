// ============================================
// FlowDesk — Shared Type Definitions
// ============================================

export type Plan = "STARTER" | "GROWTH" | "SCALE";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_ON_CUSTOMER" | "RESOLVED" | "CLOSED";
export type TicketPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type TicketChannel = "EMAIL" | "WIDGET" | "API" | "MANUAL";
export type MemberRole = "OWNER" | "ADMIN" | "AGENT" | "VIEWER";
export type SlaStatus = "OK" | "WARNING" | "BREACHED";

export interface AiTriageResult {
  category: string;
  priority: TicketPriority;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "URGENT";
  suggestedTags: string[];
  summary: string;
  confidence: number;
  reasoning: string;
}

export interface TicketMetadata {
  browser?: string;
  os?: string;
  url?: string;
  customFields?: Record<string, string>;
}

export interface SlaPolicy {
  name: string;
  firstResponseHours: number;
  resolutionHours: number;
  businessHoursOnly: boolean;
}

export interface PlanLimits {
  agentSeats: number;
  ticketsPerMonth: number;
  aiTriage: boolean;
  slaTracking: boolean;
  analytics: boolean;
  customWidget: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  STARTER: {
    agentSeats: 3,
    ticketsPerMonth: 500,
    aiTriage: false,
    slaTracking: false,
    analytics: false,
    customWidget: true,
    apiAccess: false,
    prioritySupport: false,
  },
  GROWTH: {
    agentSeats: 10,
    ticketsPerMonth: 2000,
    aiTriage: true,
    slaTracking: true,
    analytics: true,
    customWidget: true,
    apiAccess: true,
    prioritySupport: false,
  },
  SCALE: {
    agentSeats: -1, // unlimited
    ticketsPerMonth: -1, // unlimited
    aiTriage: true,
    slaTracking: true,
    analytics: true,
    customWidget: true,
    apiAccess: true,
    prioritySupport: true,
  },
};

export const PLAN_PRICES: Record<Plan, { monthly: number; label: string }> = {
  STARTER: { monthly: 29, label: "Starter" },
  GROWTH: { monthly: 79, label: "Growth" },
  SCALE: { monthly: 199, label: "Scale" },
};

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WidgetConfig {
  organizationId: string;
  primaryColor: string;
  title: string;
  welcomeMessage: string;
  position: "bottom-right" | "bottom-left";
}
