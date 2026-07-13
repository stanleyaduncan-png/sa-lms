// Owner: course detail — sections & lessons (CRS-02, CRS-03, CRS-09).
// Protected by src/middleware.ts (role === OWNER).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCourse } from "@/actions/courses";
import { getCourseEnrollments } from "@/actions/enrollments";
import CourseDetailClient from "./CourseDetailClient";
import EnrollmentsClient from "./EnrollmentsClient";

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
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h1>Course not found</h1>
        <p>
          <a href="/owner/courses">← Back to courses</a>
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>
        {course.title} — {course.status}
      </h1>
      <p>
        <a href="/owner/courses">← Back to courses</a> ·{" "}
        <a href={`/owner/courses/${course.id}/grants`}>Grants</a>
      </p>
      <CourseDetailClient course={course} />
      <EnrollmentsClient courseId={course.id} enrollments={enrollments} />
    </main>
  );
}
