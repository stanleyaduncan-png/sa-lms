// Learner dashboard: enrolled courses + course-level progress (TRK-*).
// Strictly scoped to the session user's own enrollments (getMyEnrollments).
// Quiz results (REV-*) land in a future epic; certificates (CERT-03) are
// at /learner/certificates.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMyEnrollments } from "@/actions/enrollments";
import DashboardShell from "@/components/DashboardShell";
import StatusBadge from "@/components/StatusBadge";
import { card, link, progressTrack, progressFill, sectionHeading } from "@/lib/ui";

export default async function LearnerDashboardPage() {
  const session = await getServerSession(authOptions);
  console.log("[learner dashboard] session role:", session?.user.role);

  const enrollments = await getMyEnrollments();

  return (
    <DashboardShell role="LEARNER" userName={session?.user.name} userEmail={session?.user.email} title="My Courses">
      <div className={card}>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="font-semibold text-navy-700">Name</dt>
            <dd className="text-navy-900">{session?.user.name}</dd>
          </div>
          <div>
            <dt className="font-semibold text-navy-700">Email</dt>
            <dd className="text-navy-900">{session?.user.email}</dd>
          </div>
          <div>
            <dt className="font-semibold text-navy-700">Role</dt>
            <dd className="text-navy-900">{session?.user.role}</dd>
          </div>
        </dl>
      </div>

      <h2 className={sectionHeading}>Enrolled Courses</h2>
      {enrollments.length === 0 && <p className="text-navy-700">No courses yet.</p>}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {enrollments.map((e) => (
          <li key={e.id} className={card}>
            <a href={`/learner/courses/${e.courseId}`} className={link}>
              <strong>{e.course.title}</strong>
            </a>
            <div className="mt-2">
              <div className={progressTrack}>
                <div className={progressFill} style={{ width: `${e.progressPercent}%` }} />
              </div>
              <div className="mt-1 text-xs text-navy-600">{e.progressPercent}% complete</div>
            </div>
            <div className="mt-2 text-sm text-navy-700">Source: {e.source}</div>
            <div className="mt-2">
              {e.completedAt ? (
                <StatusBadge kind="complete" label={`Completed ${new Date(e.completedAt).toLocaleDateString()}`} />
              ) : e.progressPercent > 0 ? (
                <StatusBadge kind="in-progress" label="In progress" />
              ) : (
                <StatusBadge kind="not-started" label="Not started" />
              )}
            </div>
          </li>
        ))}
      </ul>
    </DashboardShell>
  );
}
