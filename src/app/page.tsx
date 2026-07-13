import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

// AUTH-02: route to the correct dashboard based on session role.
// No session -> /login. Otherwise -> role-specific dashboard.

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  switch (session.user.role) {
    case "OWNER":
      redirect("/owner");
    case "ORG_ADMIN":
      redirect("/org-admin");
    case "LEARNER":
      redirect("/learner");
    default:
      redirect("/login");
  }
}
