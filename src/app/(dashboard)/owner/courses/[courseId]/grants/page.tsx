// Owner: course-to-org grants (ACC-02 partial).
// Protected by src/middleware.ts (role === OWNER).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCourse } from "@/actions/courses";
import { getGrantsForCourse, getActiveOrganizations } from "@/actions/courseGrants";
import GrantsClient from "./GrantsClient";

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
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h1>Course not found</h1>
        <p>
          <a href="/owner/courses">← Back to courses</a>
        </p>
      </main>
    );
  }

  const [grants, organizations] = await Promise.all([
    getGrantsForCourse(courseId),
    getActiveOrganizations(),
  ]);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>
        Grants — {course.title} ({course.status})
      </h1>
      <p>
        <a href={`/owner/courses/${course.id}`}>← Back to course</a>
      </p>
      <GrantsClient
        courseId={course.id}
        courseStatus={course.status}
        grants={grants}
        organizations={organizations}
      />
    </main>
  );
}
