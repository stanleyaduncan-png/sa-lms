// Single source of truth for SHEQ Partner brand colours. tailwind.config.ts
// imports these directly; globals.css mirrors them as CSS variables; the
// certificate PDF generator and email templates (neither of which can read
// Tailwind classes or CSS variables) import this file so the hex values
// never drift out of sync across the three surfaces.

export const navy = {
  50: "#F2F3F5",
  100: "#E6E8EB",
  200: "#CCD0D7",
  300: "#A6ADB8",
  400: "#7B8696",
  500: "#5A687C",
  600: "#3E4E65",
  700: "#253751",
  800: "#102441",
  900: "#011635",
  950: "#010E22",
} as const;

export const gold = {
  50: "#FEF9EB",
  100: "#FEF3D8",
  200: "#FCE7B1",
  300: "#FBD67B",
  400: "#F9C441",
  500: "#F7B40B",
  600: "#D99E0A",
  700: "#B28208",
  800: "#886306",
  900: "#634804",
  950: "#453203",
} as const;

export const offWhite = "#F7F7F7";

// Status ramp is deliberately non-gold — see EPIC-8 Task 2 (gold/amber
// collision: brand gold is a yellow-amber and would be visually
// indistinguishable from an amber "in progress" state).
export const status = {
  notStarted: { fg: navy[700], bg: navy[100] },
  inProgress: { fg: "#1E40AF", bg: "#EFF6FF", fill: "#2563EB" },
  complete: { fg: "#166534", bg: "#F0FDF4", fill: "#16A34A" },
  failed: { fg: "#991B1B", bg: "#FEF2F2", fill: "#DC2626" },
  expired: { fg: navy[600], bg: navy[100] },
} as const;
