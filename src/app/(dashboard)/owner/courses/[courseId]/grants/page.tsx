// Owner: course-to-org grants (ACC-02 partial).
// Protected by src/middleware.ts (role === OWNER).

import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCourse } from "@/actions/courses";
import { getGrantsForCourse, getActiveOrganizations } from "@/actions/courseGrants";
import GrantsClient from "./GrantsClient";
import DashboardShell from "@/components/DashboardShell";
import { link } from "@/lib/ui";

export default async function CourseGrantsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await getServerSession(authOptions);
  console.log("[owner/courses/:id/grants] session role:", session?.user.role);

  const course = await getCourse(courseId);

  if (!course) {
    return (
      <DashboardShell role="OWNER" userName={session?.user.name} userEmail={session?.user.email} title="Course not found">
        <p>
          <Link href="/owner/courses" className={link}>← Back to courses</Link>
        </p>
      </DashboardShell>
    );
  }

  const [grants, organizations] = await Promise.all([
    getGrantsForCourse(courseId),
    getActiveOrganizations(),
  ]);

  return (
    <DashboardShell
      role="OWNER"
      userName={session?.user.name}
      userEmail={session?.user.email}
      title={`Grants — ${course.title} (${course.status})`}
    >
      <p className="mb-6">
        <Link href={`/owner/courses/${course.id}`} className={link}>← Back to course</Link>
      </p>
      <GrantsClient
        courseId={course.id}
        courseStatus={course.status}
        grants={grants}
        organizations={organizations}
      />
    </DashboardShell>
  );
}
