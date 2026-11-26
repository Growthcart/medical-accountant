// One-off migration: copies every table from Supabase into a SQL file for Cloudflare D1.
// Read-only against Supabase: it reads through the HTTPS API with the service-role key (no database password or IPv6 needed).
//
//   node --env-file=.env.local scripts/export-supabase.mjs          # writes .migration/d1-data.sql
//   npx wrangler d1 execute DB --remote --file .migration/d1-data.sql   # (after `npm run db:migrate:remote`)
//
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Sessions and rate limits are skipped: everyone logs in again.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. Run with: node --env-file=.env.local scripts/export-supabase.mjs');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Parents before children, so foreign keys are satisfied as rows are inserted.
const ORDER = [
  'users', 'profiles', 'categories', 'tags', 'posts', 'post_tags',
  'site_settings', 'business_info', 'header_menus', 'url_redirects', 'cookie_consents',
  'contact_forms', 'form_submissions', 'reviews', 'review_settings',
  'projects', 'time_entries',
  'mcp_oauth_clients', 'mcp_oauth_auth_codes', 'mcp_oauth_tokens',
];
const SKIP = new Set(['sessions', 'rate_limits']);

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
function lit(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'bigint') return v.toString();
  if (v instanceof Date) return q(v.toISOString());
  if (typeof v === 'object') return q(JSON.stringify(v));
  return q(v);
}

async function fetchAll(table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select('*').range(from, from + 999);
    if (error) return { error };
    rows.push(...data);
    if (data.length < 1000) return { rows };
  }
}

const out = ['PRAGMA defer_foreign_keys = on;'];
let supabaseUrls = 0;
for (const table of ORDER) {
  const { rows, error } = await fetchAll(table);
  if (error) { console.error(`FAILED ${table}: ${error.message}`); process.exitCode = 1; continue; }
  for (const row of rows) {
    const cols = Object.keys(row);
    for (const v of Object.values(row)) if (typeof v === 'string' && v.includes('.supabase.co')) { supabaseUrls++; break; }
    out.push(`INSERT OR REPLACE INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${cols.map((c) => lit(row[c])).join(', ')});`);
  }
  console.log(`${table}: ${rows.length} rows`);
}

mkdirSync('.migration', { recursive: true });
writeFileSync('.migration/d1-data.sql', out.join('\n') + '\n');
console.log('\nWrote .migration/d1-data.sql');
if (supabaseUrls) console.warn(`WARNING: ${supabaseUrls} row(s) contain a *.supabase.co URL (images linked straight to Supabase Storage). Rewrite them to /files/... or keep Supabase Storage until they are replaced.`);
