// Learner: course detail — sections/lessons with per-lesson status and
// CRS-09 lock enforcement. Opening this page is also the lazy
// auto-enrollment trigger for org-granted courses (Epic 4 risk #5).

import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrEnrollInCourse } from "@/actions/enrollments";
import { getLearnerCourseView } from "@/actions/progress";
import { getMyCertificates } from "@/actions/certificates";
import DashboardShell from "@/components/DashboardShell";
import StatusBadge from "@/components/StatusBadge";
import { link, sectionHeading } from "@/lib/ui";

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
      <DashboardShell role="LEARNER" userName={session?.user.name} userEmail={session?.user.email} title="No access">
        <p className="text-navy-700">{enrollResult.error}</p>
        <p>
          <Link href="/learner" className={link}>← Back to my courses</Link>
        </p>
      </DashboardShell>
    );
  }

  const view = await getLearnerCourseView(courseId);
  if ("error" in view) {
    return (
      <DashboardShell role="LEARNER" userName={session?.user.name} userEmail={session?.user.email} title="No access">
        <p className="text-navy-700">{view.error}</p>
        <p>
          <Link href="/learner" className={link}>← Back to my courses</Link>
        </p>
      </DashboardShell>
    );
  }

  const { course, enrollment } = view;

  let certificatePdfUrl: string | null = null;
  if (enrollment.completedAt) {
    const certificates = await getMyCertificates();
    certificatePdfUrl = certificates.find((c) => c.courseId === course.id)?.pdfUrl ?? null;
  }

  return (
    <DashboardShell role="LEARNER" userName={session?.user.name} userEmail={session?.user.email} title={course.title}>
      <p className="mb-6">
        <a href="/learner" className={link}>← Back to my courses</a>
      </p>
      {enrollment.completedAt && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <StatusBadge kind="complete" label={`Course complete — ${new Date(enrollment.completedAt).toLocaleDateString()}`} />
          {certificatePdfUrl && (
            <a href={certificatePdfUrl} className={link}>Download certificate</a>
          )}
        </div>
      )}
      {course.sections.map((section) => (
        <div key={section.id} className="mt-4">
          <h2 className={sectionHeading}>{section.title}</h2>
          <ul className="divide-y divide-navy-100 rounded-lg border border-navy-100 bg-white">
            {section.lessons.map((lesson) => (
              <li key={lesson.id} className="flex items-center justify-between px-4 py-3">
                {lesson.locked ? (
                  <span className="text-navy-400">
                    🔒 {lesson.title} — [{lesson.contentType}] (locked until prior lesson completes)
                  </span>
                ) : (
                  <Link
                    href={`/learner/courses/${course.id}/lessons/${lesson.id}`}
                    className={`${link} flex flex-1 items-center justify-between gap-3`}
                  >
                    <span>
                      {lesson.title} — [{lesson.contentType}]
                    </span>
                    {lesson.progress?.status === "COMPLETE" ? (
                      <StatusBadge kind="complete" label="Complete" />
                    ) : lesson.progress?.status === "IN_PROGRESS" ? (
                      <StatusBadge kind="in-progress" label="In progress" />
                    ) : (
                      <StatusBadge kind="not-started" label="Not started" />
                    )}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </DashboardShell>
  );
}
