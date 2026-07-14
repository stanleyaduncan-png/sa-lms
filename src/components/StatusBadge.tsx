// Status colour ramp is deliberately NOT gold/amber — brand gold is a
// yellow-amber and would be visually indistinguishable from a conventional
// "in progress" amber state. See src/lib/brand.ts (status export) and
// EPIC-8 Task 2.

export type StatusKind = "not-started" | "in-progress" | "complete" | "failed" | "expired";

const STYLES: Record<StatusKind, string> = {
  "not-started": "bg-navy-100 text-navy-700",
  "in-progress": "bg-status-progress-bg text-status-progress-text",
  complete: "bg-status-complete-bg text-status-complete-text",
  failed: "bg-status-failed-bg text-status-failed-text",
  expired: "bg-navy-100 text-navy-600",
};

export default function StatusBadge({ kind, label }: { kind: StatusKind; label: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[kind]}`}
    >
      {label}
    </span>
  );
}
