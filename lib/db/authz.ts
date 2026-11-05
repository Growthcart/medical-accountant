import type { QueryDesc } from './builder';
import { SERVER_ONLY } from './schema';

// Access rules for queries that arrive from the browser through /api/db.
// Signed-in admins may do anything except touch server-only tables; visitors
// get the narrow public reads and writes that the public pages need.

const PUBLIC_READ = new Set(['categories', 'tags', 'post_tags', 'site_settings', 'review_settings']);
const PUBLIC_FORM_COLUMNS = new Set(['id', 'name', 'slug', 'description', 'fields', 'success_message']);

export function authorize(desc: QueryDesc, isAdmin: boolean): QueryDesc | { error: string; status: number } {
  if (SERVER_ONLY.has(desc.table)) return { error: 'Forbidden', status: 403 };
  if (isAdmin) return desc;

  const denied = { error: 'Not authenticated', status: 401 };
  if (desc.op === 'insert') {
    return desc.table === 'cookie_consents' && desc.select === undefined && !Array.isArray(desc.values) ? desc : denied;
  }
  if (desc.op !== 'select' || desc.select?.includes('(') || desc.filters.some((f) => f.col.includes('.'))) return denied;

  const now = new Date().toISOString();
  const withFilters = (...f: QueryDesc['filters']) => ({ ...desc, filters: [...desc.filters, ...f] });
  if (PUBLIC_READ.has(desc.table)) return desc;
  switch (desc.table) {
    case 'posts':
      return withFilters({ col: 'status', op: 'eq', val: 'published' }, { col: 'published_at', op: 'lte', val: now });
    case 'header_menus':
    case 'reviews':
      return withFilters({ col: 'is_active', op: 'eq', val: true });
    case 'contact_forms': {
      const cols = (desc.select || '').split(',').map((c) => c.trim());
      return cols.every((c) => PUBLIC_FORM_COLUMNS.has(c)) ? withFilters({ col: 'is_active', op: 'eq', val: true }) : denied;
    }
    default:
      return denied;
  }
}
