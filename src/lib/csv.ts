// CSV injection (Epic 7 risk #3): a cell beginning with =, +, -, or @ can
// be interpreted as a formula by spreadsheet software (e.g. Excel/Sheets
// auto-executing "=cmd|...") when the CSV is opened. User-supplied names/
// emails flow into these exports, so every cell is sanitized before
// escaping/joining.

const DANGEROUS_PREFIXES = ["=", "+", "-", "@"];

function sanitizeCell(value: string): string {
  return DANGEROUS_PREFIXES.some((p) => value.startsWith(p)) ? `'${value}` : value;
}

function escapeCell(value: string): string {
  const sanitized = sanitizeCell(value);
  if (/[",\n]/.test(sanitized)) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map((cell) => escapeCell(String(cell))).join(",")).join("\n");
}
