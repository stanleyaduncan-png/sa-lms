"use client";

// TRK-04 SCORM 1.2 tracking - the single highest-risk piece of Epic 4.
//
// SAME-ORIGIN GOTCHA (see Epic 4 risk #1): SCORM content in the iframe
// reaches *up* via window.parent.API. Browsers block that reach across
// origins, so contentUrl must point at a package served from this app's
// own origin - not a hot-linked third-party host. Epic 3 only stored a
// URL (no upload/unpack pipeline), so this component works against
// whatever contentUrl is set; for the checkpoint, contentUrl is pointed
// at a static test package under public/scorm-test-package/ (same origin
// as this Next.js app). A real deployment still needs the upload/unpack
// pipeline that decision was deferred to - not built here.
//
// window.API must exist before the iframe's content runs its own API
// discovery (which usually happens on the iframe's window.onload), so we
// don't render the iframe until window.API has been assigned.

import { useEffect, useRef, useState } from "react";
import type { Progress } from "@prisma/client";
import { updateScormProgress } from "@/actions/progress";
import StatusBadge from "@/components/StatusBadge";

type ScormData = {
  lessonStatus?: string;
  scoreRaw?: string;
  scoreMin?: string;
  scoreMax?: string;
  lessonLocation?: string;
  totalTime?: string;
  suspendData?: string;
};

type CmiCore = {
  student_id: string;
  student_name: string;
  lesson_status: string;
  score_raw: string;
  score_min: string;
  score_max: string;
  lesson_location: string;
  total_time: string;
  entry: string;
  exit: string;
};

export default function ScormPlayer({
  lessonId,
  contentUrl,
  progress,
  studentId,
  studentName,
}: {
  lessonId: string;
  contentUrl: string | null;
  progress: Progress | null;
  studentId: string;
  studentName: string;
}) {
  const scormData = (progress?.scormData as ScormData | null) ?? {};
  const [apiReady, setApiReady] = useState(false);
  const [displayStatus, setDisplayStatus] = useState(scormData.lessonStatus ?? "not attempted");

  const cmiRef = useRef<CmiCore>({
    student_id: studentId,
    student_name: studentName,
    lesson_status: scormData.lessonStatus ?? "not attempted",
    score_raw: scormData.scoreRaw ?? "",
    score_min: scormData.scoreMin ?? "",
    score_max: scormData.scoreMax ?? "",
    lesson_location: scormData.lessonLocation ?? "",
    total_time: scormData.totalTime ?? "0000:00:00.00",
    entry: scormData.suspendData ? "resume" : "ab-initio",
    exit: "",
  });
  const suspendDataRef = useRef<string>(scormData.suspendData ?? "");
  const initializedRef = useRef(false);
  const lastErrorRef = useRef("0");

  function commit() {
    updateScormProgress({
      lessonId,
      lessonStatus: cmiRef.current.lesson_status,
      scoreRaw: cmiRef.current.score_raw,
      scoreMin: cmiRef.current.score_min,
      scoreMax: cmiRef.current.score_max,
      lessonLocation: cmiRef.current.lesson_location,
      totalTime: cmiRef.current.total_time,
      suspendData: suspendDataRef.current,
    });
    setDisplayStatus(cmiRef.current.lesson_status);
  }

  useEffect(() => {
    const w = window as unknown as { API?: Record<string, (...args: string[]) => string> };

    w.API = {
      LMSInitialize() {
        initializedRef.current = true;
        lastErrorRef.current = "0";
        return "true";
      },
      LMSFinish() {
        commit();
        initializedRef.current = false;
        lastErrorRef.current = "0";
        return "true";
      },
      LMSGetValue(key: string) {
        lastErrorRef.current = "0";
        switch (key) {
          case "cmi.core.student_id":
            return cmiRef.current.student_id;
          case "cmi.core.student_name":
            return cmiRef.current.student_name;
          case "cmi.core.lesson_status":
            return cmiRef.current.lesson_status;
          case "cmi.core.score.raw":
            return cmiRef.current.score_raw;
          case "cmi.core.score.min":
            return cmiRef.current.score_min;
          case "cmi.core.score.max":
            return cmiRef.current.score_max;
          case "cmi.core.lesson_location":
            return cmiRef.current.lesson_location;
          case "cmi.core.total_time":
            return cmiRef.current.total_time;
          case "cmi.core.entry":
            return cmiRef.current.entry;
          case "cmi.suspend_data":
            return suspendDataRef.current;
          default:
            return "";
        }
      },
      LMSSetValue(key: string, value: string) {
        lastErrorRef.current = "0";
        switch (key) {
          case "cmi.core.lesson_status":
            cmiRef.current.lesson_status = value;
            break;
          case "cmi.core.score.raw":
            cmiRef.current.score_raw = value;
            break;
          case "cmi.core.score.min":
            cmiRef.current.score_min = value;
            break;
          case "cmi.core.score.max":
            cmiRef.current.score_max = value;
            break;
          case "cmi.core.lesson_location":
            cmiRef.current.lesson_location = value;
            break;
          case "cmi.core.total_time":
            cmiRef.current.total_time = value;
            break;
          case "cmi.core.exit":
            cmiRef.current.exit = value;
            break;
          case "cmi.suspend_data":
            suspendDataRef.current = value;
            break;
          default:
            break; // accept and ignore unsupported keys rather than erroring
        }
        return "true";
      },
      LMSCommit() {
        commit();
        return "true";
      },
      LMSGetLastError() {
        return lastErrorRef.current;
      },
      LMSGetErrorString(code: string) {
        return code === "0" ? "No error" : "Error";
      },
      LMSGetDiagnostic() {
        return "";
      },
    };
    setApiReady(true);

    function handleBeforeUnload() {
      if (initializedRef.current) commit();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (initializedRef.current) commit();
      delete w.API;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!contentUrl) {
    return <p className="text-navy-700">No SCORM package URL set for this lesson.</p>;
  }

  const scormStatusBadge =
    displayStatus === "completed" || displayStatus === "passed" ? (
      <StatusBadge kind="complete" label={displayStatus} />
    ) : displayStatus === "failed" ? (
      <StatusBadge kind="failed" label={displayStatus} />
    ) : displayStatus === "incomplete" || displayStatus === "browsed" ? (
      <StatusBadge kind="in-progress" label={displayStatus} />
    ) : (
      <StatusBadge kind="not-started" label={displayStatus} />
    );

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm text-navy-700">SCORM status:</span>
        {scormStatusBadge}
      </div>
      {apiReady ? (
        <iframe
          src={contentUrl}
          title="SCORM content"
          className="h-[480px] w-full rounded-lg border border-navy-100"
        />
      ) : (
        <p className="text-navy-700">Loading SCORM API…</p>
      )}
    </div>
  );
}
