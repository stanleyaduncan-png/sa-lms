// Owner: course detail — sections & lessons (CRS-02, CRS-03, CRS-09).
// Protected by src/middleware.ts (role === OWNER).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCourse } from "@/actions/courses";
import { getCourseEnrollments } from "@/actions/enrollments";
import CourseDetailClient from "./CourseDetailClient";
import EnrollmentsClient from "./EnrollmentsClient";
import DashboardShell from "@/components/DashboardShell";
import { link } from "@/lib/ui";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await getServerSession(authOptions);
  console.log("[owner/courses/:id] session role:", session?.user.role);

  const course = await getCourse(courseId);
  const enrollments = course ? await getCourseEnrollments(courseId) : [];

  if (!course) {
    return (
      <DashboardShell role="OWNER" userName={session?.user.name} userEmail={session?.user.email} title="Course not found">
        <p>
          <a href="/owner/courses" className={link}>← Back to courses</a>
        </p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      role="OWNER"
      userName={session?.user.name}
      userEmail={session?.user.email}
      title={`${course.title} — ${course.status}`}
    >
      <p className="mb-6">
        <a href="/owner/courses" className={link}>← Back to courses</a>{" "}
        <span className="text-navy-300">·</span>{" "}
        <a href={`/owner/courses/${course.id}/grants`} className={link}>Grants</a>
      </p>
      <CourseDetailClient course={course} />
      <EnrollmentsClient courseId={course.id} enrollments={enrollments} />
    </DashboardShell>
  );
}
