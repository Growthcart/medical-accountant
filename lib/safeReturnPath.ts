// Only relative, same-origin paths (no open redirects via ?next=). Control
// characters and backslashes are refused outright because browsers strip tabs
// and newlines from URLs, so "/\t/evil.com" would otherwise become
// "//evil.com". The final origin check catches anything else that resolves
// off-site.
export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\x00-\x1f\x7f\\]/.test(value)) return null;
  try {
    const base = 'https://return-path.invalid';
    const u = new URL(value, base);
    return u.origin === base ? `${u.pathname}${u.search}${u.hash}` : null;
  } catch {
    return null;
  }
}

let returning = false;

// After signing in on /admin/login, go to the ?next= path (e.g. the Claude
// connector's OAuth consent screen) with a full page load, since it may be a
// server route. Returns false when there is no valid ?next= path. The login
// page and the admin layout both call this, so it navigates only once.
export function returnToNextPath(): boolean {
  if (typeof window === 'undefined') return false;
  const next = safeReturnPath(new URLSearchParams(window.location.search).get('next'));
  if (!next) return false;
  if (!returning) {
    returning = true;
    window.location.assign(next);
  }
  return true;
}
