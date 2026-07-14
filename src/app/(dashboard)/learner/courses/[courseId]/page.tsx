// Learner: course detail — sections/lessons with per-lesson status and
// CRS-09 lock enforcement. Opening this page is also the lazy
// auto-enrollment trigger for org-granted courses (Epic 4 risk #5).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrEnrollInCourse } from "@/actions/enrollments";
import { getLearnerCourseView } from "@/actions/progress";
import { getMyCertificates } from "@/actions/certificates";

export default async function LearnerCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await getServerSession(authOptions);
  console.log("[learner/courses/:id] session role:", session?.user.role);

  const enrollResult = await getOrEnrollInCourse(courseId);
  if ("error" in enrollResult) {
    return (
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h1>No access</h1>
        <p>{enrollResult.error}</p>
        <p>
          <a href="/learner">← Back to my courses</a>
        </p>
      </main>
    );
  }

  const view = await getLearnerCourseView(courseId);
  if ("error" in view) {
    return (
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h1>No access</h1>
        <p>{view.error}</p>
        <p>
          <a href="/learner">← Back to my courses</a>
        </p>
      </main>
    );
  }

  const { course, enrollment } = view;

  let certificatePdfUrl: string | null = null;
  if (enrollment.completedAt) {
    const certificates = await getMyCertificates();
    certificatePdfUrl = certificates.find((c) => c.courseId === course.id)?.pdfUrl ?? null;
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>{course.title}</h1>
      <p>
        <a href="/learner">← Back to my courses</a>
      </p>
      {enrollment.completedAt && (
        <p style={{ color: "green" }}>
          Course complete ({new Date(enrollment.completedAt).toLocaleDateString()})
          {certificatePdfUrl && (
            <>
              {" — "}
              <a href={certificatePdfUrl}>Download certificate</a>
            </>
          )}
        </p>
      )}
      {course.sections.map((section) => (
        <div key={section.id} style={{ marginTop: "1rem" }}>
          <h2>{section.title}</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {section.lessons.map((lesson) => (
              <li key={lesson.id} style={{ borderBottom: "1px solid #eee", padding: "0.5rem 0" }}>
                {lesson.locked ? (
                  <span style={{ color: "#888" }}>
                    🔒 {lesson.title} — [{lesson.contentType}] (locked until prior lesson completes)
                  </span>
                ) : (
                  <a href={`/learner/courses/${course.id}/lessons/${lesson.id}`}>
                    {lesson.title} — [{lesson.contentType}] — {lesson.progress?.status ?? "NOT_STARTED"}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </main>
  );
}
