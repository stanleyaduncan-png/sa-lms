"use client";

// TRK-02 (watch % → auto-complete at threshold) + TRK-06 (resume position).
// Progress writes are debounced client-side (Epic 4 risk #3) - timeupdate
// fires many times a second, so we only send on pause/ended or every ~5s.
//
// Resume-seek can't rely solely on the onLoadedMetadata React prop: the
// server-rendered <video src> starts loading as soon as the browser parses
// the initial HTML, before React hydrates and attaches listeners. A fast
// (e.g. cached) load can reach readyState >= HAVE_METADATA before
// hydration, so the native event fires with nobody listening yet. Guard
// with an explicit readyState check on mount as well.

import { useRef, useEffect, useState } from "react";
import type { Progress } from "@prisma/client";
import { updateLessonProgress } from "@/actions/progress";

const REPORT_INTERVAL_SECONDS = 5;

export default function VideoPlayer({
  lessonId,
  contentUrl,
  progress,
}: {
  lessonId: string;
  contentUrl: string | null;
  progress: Progress | null;
}) {
  const lastReportedAt = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [resumeApplied, setResumeApplied] = useState(false);

  function applyResume(video: HTMLVideoElement) {
    if (!resumeApplied && progress?.watchedSeconds) {
      video.currentTime = progress.watchedSeconds;
    }
    setResumeApplied(true);
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // HAVE_METADATA (readyState 1) or higher means duration/seekability are
    // already known - the loadedmetadata event may have already fired.
    if (video.readyState >= 1) {
      applyResume(video);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function report(video: HTMLVideoElement) {
    if (!video.duration) return;
    const watchedSeconds = Math.floor(video.currentTime);
    const watchedPercent = Math.min(100, (video.currentTime / video.duration) * 100);
    updateLessonProgress({ lessonId, watchedSeconds, watchedPercent });
  }

  if (!contentUrl) {
    return <p className="text-navy-700">No video URL set for this lesson.</p>;
  }

  return (
    <video
      ref={videoRef}
      src={contentUrl}
      controls
      className="w-full max-w-2xl rounded-lg border border-navy-100"
      onLoadedMetadata={(e) => applyResume(e.currentTarget)}
      onTimeUpdate={(e) => {
        const now = e.currentTarget.currentTime;
        if (now - lastReportedAt.current >= REPORT_INTERVAL_SECONDS) {
          lastReportedAt.current = now;
          report(e.currentTarget);
        }
      }}
      onPause={(e) => report(e.currentTarget)}
      onEnded={(e) => report(e.currentTarget)}
    />
  );
}
