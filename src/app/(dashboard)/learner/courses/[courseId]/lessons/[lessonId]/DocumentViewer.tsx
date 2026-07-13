"use client";

// TRK-03: document lessons complete via explicit acknowledgement.

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Progress } from "@prisma/client";
import { updateLessonProgress } from "@/actions/progress";

export default function DocumentViewer({
  lessonId,
  contentUrl,
  progress,
}: {
  lessonId: string;
  contentUrl: string | null;
  progress: Progress | null;
}) {
  const router = useRouter();
  const [marking, setMarking] = useState(false);
  const isComplete = progress?.status === "COMPLETE";

  async function handleMarkRead() {
    setMarking(true);
    await updateLessonProgress({ lessonId, status: "COMPLETE" });
    setMarking(false);
    router.refresh();
  }

  return (
    <div>
      {contentUrl ? (
        <p>
          <a href={contentUrl} target="_blank" rel="noreferrer">
            Open document
          </a>
        </p>
      ) : (
        <p>No document URL set for this lesson.</p>
      )}
      <button onClick={handleMarkRead} disabled={isComplete || marking}>
        {isComplete ? "Marked as read" : marking ? "Saving..." : "Mark as read"}
      </button>
    </div>
  );
}
