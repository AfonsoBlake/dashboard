// Shared display formatting helpers used across the dashboard
// to avoid leaking raw template placeholders, null values, or
// relative-date strings into the UI.

export const APP_NAME = "Fluario";

const TEMPLATE_RE = /\{\{[^}]*\}\}/;

/** Returns a safe contact name. Falls back to "Unknown Lead" when missing
 *  or when the upstream value is still a raw template placeholder
 *  (e.g. "{{full_name}}"). */
export function displayName(name?: string | null): string {
  if (!name) return "Unknown Lead";
  const trimmed = String(name).trim();
  if (!trimmed) return "Unknown Lead";
  if (TEMPLATE_RE.test(trimmed)) return "Unknown Lead";
  if (/^not provided$/i.test(trimmed)) return "Unknown Lead";
  return trimmed;
}

/** Returns a value or an em-dash placeholder if the value is missing,
 *  empty, a template placeholder, or the literal string "not provided". */
export function displayDash(value?: string | null): string {
  if (value === null || value === undefined) return "—";
  const trimmed = String(value).trim();
  if (!trimmed) return "—";
  if (TEMPLATE_RE.test(trimmed)) return "—";
  if (/^not provided$/i.test(trimmed)) return "—";
  return trimmed;
}

/** Resolves relative-day strings ("today", "tomorrow", "day after tomorrow")
 *  to a formatted absolute date like "Wed, May 14". Other inputs are passed
 *  through displayDash. */
export function resolvePreferredDay(value?: string | null): string {
  if (!value) return "—";
  const raw = String(value).trim();
  if (!raw) return "—";
  if (TEMPLATE_RE.test(raw) || /^not provided$/i.test(raw)) return "—";

  const lower = raw.toLowerCase();
  const offsets: Record<string, number> = {
    today: 0,
    tomorrow: 1,
    "day after tomorrow": 2,
    "the day after tomorrow": 2,
  };
  if (lower in offsets) {
    const d = new Date();
    d.setDate(d.getDate() + offsets[lower]);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  return raw;
}
