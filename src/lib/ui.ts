// Shared Tailwind class strings (EPIC-8 Task 5) so every screen uses the
// same button/table/input treatment instead of scattered inline styles.
// Presentational only — no behaviour lives here.

export const btnPrimary =
  "inline-flex items-center justify-center rounded-md bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-gold-600 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export const btnSecondary =
  "inline-flex items-center justify-center rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export const btnTertiary =
  "inline-flex items-center justify-center rounded-md border border-navy-300 bg-transparent px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export const btnDestructive =
  "inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export const input =
  "block w-full rounded-md border border-navy-300 px-3 py-2 text-sm text-navy-900 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500";

export const link = "text-navy-900 underline decoration-navy-300 hover:text-navy-700 hover:decoration-gold-500";

export const card = "rounded-lg border border-navy-100 bg-white p-6 shadow-sm";

export const pageHeading = "text-2xl font-bold uppercase tracking-wide text-navy-900";

export const sectionHeading = "text-lg font-bold uppercase tracking-wide text-navy-900 mt-8 mb-3";

export const tableWrap = "overflow-x-auto rounded-lg border border-navy-100";

export const table = "min-w-full divide-y divide-navy-100 text-sm";

export const tableHeadRow = "bg-navy-900 text-left text-white";

export const tableHeadCell = "px-4 py-2 font-semibold";

export const tableRow = "even:bg-navy-50 border-b border-navy-100 last:border-0";

export const tableCell = "px-4 py-2 text-navy-900";

export const errorText = "rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-800";

export const successText = "rounded-md bg-status-complete-bg px-3 py-2 text-sm font-medium text-status-complete-text";

export const progressTrack = "h-2 w-full overflow-hidden rounded-full bg-navy-100";

export const progressFill = "h-full rounded-full bg-gold-500";
