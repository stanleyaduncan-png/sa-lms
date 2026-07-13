import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// NOTE: AUTH-* requirements implemented here:
// - AUTH-01: email + password login, hashed via bcrypt
// - AUTH-02: role (OWNER / ORG_ADMIN / LEARNER) attached to session/JWT for RBAC checks
// - AUTH-03: session handling via NextAuth JWT strategy
//
// Still TODO during technical design:
// - AUTH-04: password reset flow (separate route + emailed token, similar pattern to Invitation)
// - AUTH-05: login attempt throttling/lockout
// - AUTH-06: SSO providers (v2) - would be added as additional NextAuth providers

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { adminOfOrganizations: { select: { id: true } } },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        // organizationId means different things per role:
        // - LEARNER: the org they belong to (seat-holding affiliation, ACC-06)
        // - ORG_ADMIN: the org they administer (adminOfOrganizations, not the
        //   seat-holding field - keeps User.organizationId exclusively a seat
        //   count input for ACC-09)
        // - OWNER: always null, scoped to everything
        const organizationId =
          user.role === "ORG_ADMIN"
            ? user.adminOfOrganizations[0]?.id ?? null
            : user.organizationId;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Persist role + org onto the JWT at login time
      if (user) {
        token.role = user.role;
        token.organizationId = user.organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose role + org on the client session for RBAC checks in UI/middleware
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.organizationId = token.organizationId;
      }
      return session;
    },
  },
};
