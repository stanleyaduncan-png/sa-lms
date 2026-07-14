// Owner: course management (CRS-01, CRS-08).
// Protected by src/middleware.ts (role === OWNER).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCourses } from "@/actions/courses";
import CoursesClient from "./CoursesClient";
import DashboardShell from "@/components/DashboardShell";

export default async function OwnerCoursesPage() {
  const session = await getServerSession(authOptions);
  console.log("[owner/courses] session role:", session?.user.role);

  const courses = await getCourses();

  return (
    <DashboardShell role="OWNER" userName={session?.user.name} userEmail={session?.user.email} title="Courses">
      <CoursesClient courses={courses} />
    </DashboardShell>
  );
}
