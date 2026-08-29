/** Dates are ISO `YYYY-MM-DD` in state, `26 Aug 2026` in UI. Timestamps always show UTC. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

export function formatIsoDateFull(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${MONTHS_FULL[Number(m) - 1]} ${y}`;
}

/** "2026-08-26 06:15 UTC" → "26 Aug 2026, 06:15 UTC" */
export function formatUtcTimestamp(ts: string): string {
  const [date, time] = ts.split(' ');
  if (!date || !time) return ts;
  return `${formatIsoDate(date)}, ${time} UTC`;
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (new Date(`${toIso}T00:00:00Z`).getTime() - new Date(`${fromIso}T00:00:00Z`).getTime()) / 86_400_000,
  );
}

export function monthLabel(mm: string): string {
  return MONTHS[Number(mm) - 1] ?? mm;
}
