import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// AUTH-02: enforce role-based access at the routing layer.
// This is a coarse first line of defense - individual API routes/server
// actions must still enforce org-scoping (e.g. an Org Admin only ever
// touching their own organization's data) at the data-access layer.

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role;

    if (pathname.startsWith("/owner") && role !== "OWNER") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (pathname.startsWith("/org-admin") && role !== "ORG_ADMIN" && role !== "OWNER") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // /learner is reachable by any authenticated role for now;
    // tighten if Owner/Org Admin shouldn't see the learner view directly.

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/owner/:path*", "/org-admin/:path*", "/learner/:path*"],
};
