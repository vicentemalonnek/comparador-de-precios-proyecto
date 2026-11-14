// SQLite CURRENT_TIMESTAMP is UTC and looks like "2026-11-08 14:03:21"
export function parseDbDate(value: string): Date {
  return new Date(value.replace(" ", "T") + "Z");
}