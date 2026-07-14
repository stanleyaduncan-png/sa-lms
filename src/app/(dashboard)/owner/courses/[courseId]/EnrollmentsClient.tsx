"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { assignCourseToIndividual, getCourseEnrollments } from "@/actions/enrollments";
import StatusBadge from "@/components/StatusBadge";
import { btnPrimary, input, errorText, successText, sectionHeading } from "@/lib/ui";

type Enrollment = Awaited<ReturnType<typeof getCourseEnrollments>>[number];

export default function EnrollmentsClient({
  courseId,
  enrollments,
}: {
  courseId: string;
  enrollments: Enrollment[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const result = await assignCourseToIndividual(courseId, email);
    if (result && "error" in result) {
      setError(String(result.error));
      return;
    }
    setInfo(`Enrolled ${email}`);
    setEmail("");
    router.refresh();
  }

  return (
    <div className="mt-8">
      <h2 className={sectionHeading}>Assign to Individual Learner</h2>
      {error && <p className={errorText}>{error}</p>}
      {info && <p className={successText}>{info}</p>}
      <form onSubmit={handleAssign} className="flex max-w-md gap-2">
        <input
          type="email"
          placeholder="Learner email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={input}
        />
        <button type="submit" className={btnPrimary}>Assign</button>
      </form>

      <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-navy-700">Enrolled Learners</h3>
      {enrollments.length === 0 && <p className="text-navy-700">No learners enrolled yet.</p>}
      <ul className="mt-2 divide-y divide-navy-100">
        {enrollments.map((e) => (
          <li key={e.id} className="flex items-center justify-between py-2 text-sm text-navy-900">
            <span>
              {e.user.name} ({e.user.email}) — {e.source}
            </span>
            {e.completedAt && <StatusBadge kind="complete" label="Complete" />}
          </li>
        ))}
      </ul>
    </div>
  );
}
