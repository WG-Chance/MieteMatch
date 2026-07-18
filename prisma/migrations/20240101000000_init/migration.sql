-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('STARTER', 'GROWTH', 'SCALE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIALING');
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'AGENT', 'VIEWER');
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED');
CREATE TYPE "TicketPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "TicketChannel" AS ENUM ('EMAIL', 'WIDGET', 'API', 'MANUAL');
CREATE TYPE "SlaStatus" AS ENUM ('OK', 'WARNING', 'BREACHED');
CREATE TYPE "AuditAction" AS ENUM (
  'TICKET_CREATED','TICKET_UPDATED','TICKET_ASSIGNED','TICKET_STATUS_CHANGED',
  'TICKET_PRIORITY_CHANGED','TICKET_RESOLVED','TICKET_CLOSED','REPLY_SENT',
  'NOTE_ADDED','AI_TRIAGE_COMPLETED','MEMBER_INVITED','MEMBER_REMOVED',
  'MEMBER_ROLE_CHANGED','SUBSCRIPTION_CHANGED','PAYMENT_SUCCEEDED','PAYMENT_FAILED',
  'ORGANIZATION_UPDATED','WIDGET_CONFIGURED','SLA_BREACHED'
);

CREATE TABLE "Account" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL, "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT, "access_token" TEXT, "expires_at" INTEGER,
  "token_type" TEXT, "scope" TEXT, "id_token" TEXT, "session_state" TEXT,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Session" (
  "id" TEXT NOT NULL, "sessionToken" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "VerificationToken" (
  "identifier" TEXT NOT NULL, "token" TEXT NOT NULL, "expires" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "User" (
  "id" TEXT NOT NULL, "name" TEXT, "email" TEXT, "emailVerified" TIMESTAMP(3),
  "image" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Organization" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "logoUrl" TEXT, "website" TEXT, "timezone" TEXT NOT NULL DEFAULT 'Europe/Berlin',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OrganizationMember" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "role" "MemberRole" NOT NULL DEFAULT 'AGENT', "isActive" BOOLEAN NOT NULL DEFAULT true,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Invitation" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "email" TEXT NOT NULL,
  "role" "MemberRole" NOT NULL DEFAULT 'AGENT', "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "acceptedAt" TIMESTAMP(3),
  "invitedById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Customer" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "email" TEXT NOT NULL,
  "name" TEXT, "avatarUrl" TEXT, "metadata" JSONB NOT NULL DEFAULT '{}',
  "ticketCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Ticket" (
  "id" TEXT NOT NULL, "number" INTEGER NOT NULL, "organizationId" TEXT NOT NULL,
  "customerId" TEXT, "assignedToId" TEXT,
  "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
  "channel" "TicketChannel" NOT NULL DEFAULT 'MANUAL',
  "subject" TEXT NOT NULL,
  "firstMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3), "closedAt" TIMESTAMP(3),
  "slaStatus" "SlaStatus" NOT NULL DEFAULT 'OK',
  "slaFirstResponseDue" TIMESTAMP(3), "slaResolutionDue" TIMESTAMP(3),
  "slaBreachedAt" TIMESTAMP(3), "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TicketReply" (
  "id" TEXT NOT NULL, "ticketId" TEXT NOT NULL, "authorId" TEXT,
  "authorType" TEXT NOT NULL DEFAULT 'AGENT', "content" TEXT NOT NULL,
  "isInternal" BOOLEAN NOT NULL DEFAULT false, "emailId" TEXT,
  "attachments" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TicketReply_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AiTriage" (
  "id" TEXT NOT NULL, "ticketId" TEXT NOT NULL, "category" TEXT NOT NULL,
  "priority" "TicketPriority" NOT NULL, "sentiment" TEXT NOT NULL,
  "suggestedTags" TEXT[], "summary" TEXT NOT NULL, "confidence" DOUBLE PRECISION NOT NULL,
  "reasoning" TEXT NOT NULL, "modelVersion" TEXT NOT NULL, "processingMs" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiTriage_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Tag" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#6366f1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TicketTag" (
  "ticketId" TEXT NOT NULL, "tagId" TEXT NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketTag_pkey" PRIMARY KEY ("ticketId","tagId")
);
CREATE TABLE "SlaPolicy" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL,
  "criticalResponseHours" INTEGER NOT NULL DEFAULT 1,
  "criticalResolutionHours" INTEGER NOT NULL DEFAULT 4,
  "highResponseHours" INTEGER NOT NULL DEFAULT 4,
  "highResolutionHours" INTEGER NOT NULL DEFAULT 24,
  "mediumResponseHours" INTEGER NOT NULL DEFAULT 8,
  "mediumResolutionHours" INTEGER NOT NULL DEFAULT 48,
  "lowResponseHours" INTEGER NOT NULL DEFAULT 24,
  "lowResolutionHours" INTEGER NOT NULL DEFAULT 72,
  "businessHoursOnly" BOOLEAN NOT NULL DEFAULT false,
  "businessHoursStart" INTEGER NOT NULL DEFAULT 9,
  "businessHoursEnd" INTEGER NOT NULL DEFAULT 18,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SlaPolicy_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WidgetConfig" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL,
  "primaryColor" TEXT NOT NULL DEFAULT '#6366f1',
  "title" TEXT NOT NULL DEFAULT 'Support',
  "welcomeMessage" TEXT NOT NULL DEFAULT 'How can we help you today?',
  "position" TEXT NOT NULL DEFAULT 'bottom-right',
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "allowedDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WidgetConfig_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL,
  "stripeCustomerId" TEXT NOT NULL, "stripeSubscriptionId" TEXT,
  "stripePriceId" TEXT, "plan" "Plan" NOT NULL DEFAULT 'STARTER',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
  "currentPeriodStart" TIMESTAMP(3), "currentPeriodEnd" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "ticketsThisMonth" INTEGER NOT NULL DEFAULT 0, "ticketResetAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "userId" TEXT,
  "action" "AuditAction" NOT NULL, "entityId" TEXT, "entityType" TEXT,
  "before" JSONB, "after" JSONB, "ipAddress" TEXT, "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider","providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier","token");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId","userId");
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");
CREATE UNIQUE INDEX "Invitation_organizationId_email_key" ON "Invitation"("organizationId","email");
CREATE UNIQUE INDEX "Customer_organizationId_email_key" ON "Customer"("organizationId","email");
CREATE UNIQUE INDEX "Ticket_organizationId_number_key" ON "Ticket"("organizationId","number");
CREATE UNIQUE INDEX "AiTriage_ticketId_key" ON "AiTriage"("ticketId");
CREATE UNIQUE INDEX "Tag_organizationId_name_key" ON "Tag"("organizationId","name");
CREATE UNIQUE INDEX "SlaPolicy_organizationId_key" ON "SlaPolicy"("organizationId");
CREATE UNIQUE INDEX "WidgetConfig_organizationId_key" ON "WidgetConfig"("organizationId");
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- Performance indexes
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");
CREATE INDEX "Customer_organizationId_idx" ON "Customer"("organizationId");
CREATE INDEX "Customer_email_idx" ON "Customer"("email");
CREATE INDEX "Ticket_organizationId_idx" ON "Ticket"("organizationId");
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");
CREATE INDEX "Ticket_priority_idx" ON "Ticket"("priority");
CREATE INDEX "Ticket_assignedToId_idx" ON "Ticket"("assignedToId");
CREATE INDEX "Ticket_customerId_idx" ON "Ticket"("customerId");
CREATE INDEX "Ticket_lastActivityAt_idx" ON "Ticket"("lastActivityAt");
CREATE INDEX "Ticket_slaStatus_idx" ON "Ticket"("slaStatus");
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");
CREATE INDEX "TicketReply_ticketId_idx" ON "TicketReply"("ticketId");
CREATE INDEX "TicketReply_authorId_idx" ON "TicketReply"("authorId");
CREATE INDEX "TicketReply_createdAt_idx" ON "TicketReply"("createdAt");
CREATE INDEX "AiTriage_ticketId_idx" ON "AiTriage"("ticketId");
CREATE INDEX "AiTriage_category_idx" ON "AiTriage"("category");
CREATE INDEX "Tag_organizationId_idx" ON "Tag"("organizationId");
CREATE INDEX "TicketTag_ticketId_idx" ON "TicketTag"("ticketId");
CREATE INDEX "TicketTag_tagId_idx" ON "TicketTag"("tagId");
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- Foreign keys
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL;
ALTER TABLE "TicketReply" ADD CONSTRAINT "TicketReply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE;
ALTER TABLE "TicketReply" ADD CONSTRAINT "TicketReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL;
ALTER TABLE "AiTriage" ADD CONSTRAINT "AiTriage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE;
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "TicketTag" ADD CONSTRAINT "TicketTag_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE;
ALTER TABLE "TicketTag" ADD CONSTRAINT "TicketTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE;
ALTER TABLE "SlaPolicy" ADD CONSTRAINT "SlaPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "WidgetConfig" ADD CONSTRAINT "WidgetConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;
