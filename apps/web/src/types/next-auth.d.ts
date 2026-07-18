import type { DefaultSession } from "next-auth";
import type { MemberRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string | null;
      organizationSlug: string | null;
      role: MemberRole | null;
    } & DefaultSession["user"];
  }
}
