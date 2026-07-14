"use client";

import { usePathname } from "next/navigation";
import BrandLogo from "./BrandLogo";
import LogoutButton from "./LogoutButton";
import { pageHeading } from "@/lib/ui";

type Role = "OWNER" | "ORG_ADMIN" | "LEARNER";

const NAV_LINKS: Record<Role, { label: string; href: string }[]> = {
  OWNER: [
    { label: "Dashboard", href: "/owner" },
    { label: "Organizations", href: "/owner/organizations" },
    { label: "Invitations", href: "/owner/invitations" },
    { label: "Courses", href: "/owner/courses" },
    { label: "Progress", href: "/owner/progress" },
    { label: "Certificates", href: "/owner/certificates" },
    { label: "Reports", href: "/owner/reports" },
  ],
  ORG_ADMIN: [
    { label: "Dashboard", href: "/org-admin" },
    { label: "Invitations", href: "/org-admin/invitations" },
    { label: "Progress", href: "/org-admin/progress" },
    { label: "Certificates", href: "/org-admin/certificates" },
    { label: "Reports", href: "/org-admin/reports" },
  ],
  LEARNER: [
    { label: "My Courses", href: "/learner" },
    { label: "My Certificates", href: "/learner/certificates" },
    { label: "My Report", href: "/learner/reports" },
  ],
};

function isActive(pathname: string, href: string, rootHref: string) {
  if (href === rootHref) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function DashboardShell({
  role,
  userName,
  userEmail,
  title,
  children,
}: {
  role: Role;
  userName?: string | null;
  userEmail?: string | null;
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const links = NAV_LINKS[role];
  const rootHref = links[0].href;

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <header className="bg-navy-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <a href={rootHref} className="shrink-0">
            <BrandLogo variant="reversed" />
          </a>
          <nav className="flex flex-wrap gap-1">
            {links.map((l) => {
              const active = isActive(pathname, l.href, rootHref);
              return (
                <a
                  key={l.href}
                  href={l.href}
                  className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "border-b-2 border-gold-500 text-white"
                      : "border-b-2 border-transparent text-navy-200 hover:text-white"
                  }`}
                >
                  {l.label}
                </a>
              );
            })}
          </nav>
          <div className="flex items-center gap-3 text-sm text-navy-200">
            <span className="hidden sm:inline">{userName ?? userEmail}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className={pageHeading}>{title}</h1>
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
