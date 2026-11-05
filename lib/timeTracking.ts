// Shared time-tracking rules used by the entries API routes.

// A single task is capped at this many minutes. If a timer is left running
// (browser closed, left overnight), the recorded duration never exceeds this,
// and stale running entries are auto-finalized at started_at + this many ms.
export const MAX_TASK_MINUTES = 120;
export const MAX_TASK_MS = MAX_TASK_MINUTES * 60 * 1000;

// Whole minutes between two timestamps, clamped to [0, MAX_TASK_MINUTES].
export function computeDurationMinutes(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const minutes = Math.round(ms / 60000);
  return Math.min(Math.max(minutes, 0), MAX_TASK_MINUTES);
}

// The capped end time for a running entry: started_at + MAX_TASK_MS.
export function cappedEndIso(startIso: string): string {
  return new Date(new Date(startIso).getTime() + MAX_TASK_MS).toISOString();
}

// True when a running entry has exceeded the cap and should be auto-finalized.
export function isStale(startIso: string, now: number = Date.now()): boolean {
  return now - new Date(startIso).getTime() > MAX_TASK_MS;
}
