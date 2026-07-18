import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";

const googleClientId = process.env.AUTH_GOOGLE_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;
const authSecret = process.env.AUTH_SECRET;

if (!googleClientId || !googleClientSecret || !authSecret) {
  throw new Error(
    "[FlowDesk Auth] Missing AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, or AUTH_SECRET environment variables."
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  secret: authSecret,
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  session: { strategy: "database" },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;

        const membership = await db.organizationMember.findFirst({
          where: { userId: user.id, isActive: true },
          include: {
            organization: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { joinedAt: "asc" },
        });

        // These are safe — our next-auth.d.ts augments the Session type
        session.user.organizationId = membership?.organizationId ?? null;
        session.user.organizationSlug = membership?.organization.slug ?? null;
        session.user.role = membership?.role ?? null;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      console.info(`[FlowDesk] New user registered: ${user.email}`);
    },
  },
});
