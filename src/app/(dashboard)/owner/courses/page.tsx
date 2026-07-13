// Owner: course management (CRS-01, CRS-08).
// Protected by src/middleware.ts (role === OWNER).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCourses } from "@/actions/courses";
import CoursesClient from "./CoursesClient";

export default async function OwnerCoursesPage() {
  const session = await getServerSession(authOptions);
  console.log("[owner/courses] session role:", session?.user.role);

  const courses = await getCourses();

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Courses</h1>
      <p>
        <a href="/owner">← Back to dashboard</a>
      </p>
      <CoursesClient courses={courses} />
    </main>
  );
}
