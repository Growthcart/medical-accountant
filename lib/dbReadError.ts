// A failed database read on a public page. At runtime this throws, so the
// visitor gets a retryable 500 instead of an empty page or a 404.
// During `next build` (no database binding) it only logs, so the build
// still completes.
export function dbReadFailed(context: string, message: string): void {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.error(`[${context}] database read failed during build:`, message);
    return;
  }
  throw new Error(`[${context}] database read failed: ${message}`);
}
