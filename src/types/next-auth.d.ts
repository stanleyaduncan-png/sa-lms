import { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

// Augments NextAuth's built-in types so session.user.role and
// organizationId are properly typed everywhere, instead of using `any`.

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: Role;
      organizationId: string | null;
    };
  }

  interface User {
    id: string;
    role: Role;
    organizationId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    organizationId: string | null;
  }
}
