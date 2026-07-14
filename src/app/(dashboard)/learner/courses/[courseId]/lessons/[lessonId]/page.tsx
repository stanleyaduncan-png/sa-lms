// Learner: lesson viewer (TRK-01/02/03/04/06). Content rendering only -
// no video player chrome/PDF viewer/SCORM runtime beyond the minimum
// needed to prove progress tracking works (see Epic 4 "Do NOT build yet").

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLessonForLearner } from "@/actions/progress";
import { getQuizForLearner } from "@/actions/quizzes";
import VideoPlayer from "./VideoPlayer";
import DocumentViewer from "./DocumentViewer";
import ScormPlayer from "./ScormPlayer";
import QuizPlayer from "./QuizPlayer";
import DashboardShell from "@/components/DashboardShell";
import StatusBadge from "@/components/StatusBadge";
import { link } from "@/lib/ui";

export default async function LessonViewerPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const session = await getServerSession(authOptions);
  console.log("[learner/lesson] session role:", session?.user.role);

  const result = await getLessonForLearner(lessonId);
  if ("error" in result) {
    return (
      <DashboardShell role="LEARNER" userName={session?.user.name} userEmail={session?.user.email} title="Cannot open lesson">
        <p className="text-navy-700">{result.error}</p>
        <p>
          <a href={`/learner/courses/${courseId}`} className={link}>← Back to course</a>
        </p>
      </DashboardShell>
    );
  }

  const { lesson, progress } = result;
  const quizResult = await getQuizForLearner(lessonId);
  const quizData = "error" in quizResult ? null : quizResult;

  return (
    <DashboardShell role="LEARNER" userName={session?.user.name} userEmail={session?.user.email} title={lesson.title}>
      <p className="mb-4">
        <a href={`/learner/courses/${courseId}`} className={link}>← Back to course</a>
      </p>
      <div className="mb-4">
        {progress?.status === "COMPLETE" ? (
          <StatusBadge kind="complete" label="Complete" />
        ) : progress?.status === "IN_PROGRESS" ? (
          <StatusBadge kind="in-progress" label="In progress" />
        ) : (
          <StatusBadge kind="not-started" label="Not started" />
        )}
      </div>

      {lesson.contentType === "VIDEO" && (
        <VideoPlayer lessonId={lesson.id} contentUrl={lesson.contentUrl} progress={progress} />
      )}
      {lesson.contentType === "DOCUMENT" && (
        <DocumentViewer lessonId={lesson.id} contentUrl={lesson.contentUrl} progress={progress} />
      )}
      {lesson.contentType === "SCORM" && session && (
        <ScormPlayer
          lessonId={lesson.id}
          contentUrl={lesson.contentUrl}
          progress={progress}
          studentId={session.user.id}
          studentName={session.user.name ?? session.user.email}
        />
      )}

      {quizData && (
        <QuizPlayer
          quiz={quizData.quiz}
          attemptCount={quizData.attemptCount}
          attemptsRemaining={quizData.attemptsRemaining}
        />
      )}
    </DashboardShell>
  );
}
