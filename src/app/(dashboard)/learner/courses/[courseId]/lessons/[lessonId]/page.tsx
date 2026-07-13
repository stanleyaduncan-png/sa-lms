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
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h1>Cannot open lesson</h1>
        <p>{result.error}</p>
        <p>
          <a href={`/learner/courses/${courseId}`}>← Back to course</a>
        </p>
      </main>
    );
  }

  const { lesson, progress } = result;
  const quizResult = await getQuizForLearner(lessonId);
  const quizData = "error" in quizResult ? null : quizResult;

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>{lesson.title}</h1>
      <p>
        <a href={`/learner/courses/${courseId}`}>← Back to course</a>
      </p>
      <p>Status: {progress?.status ?? "NOT_STARTED"}</p>

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
    </main>
  );
}
