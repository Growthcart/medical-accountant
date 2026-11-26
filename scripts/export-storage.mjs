// One-off migration: copies every file in the Supabase Storage bucket into the Cloudflare R2 bucket (binding BUCKET).
// Read-only against Supabase. Object keys are kept as they are ("post-images/x.webp"), so /files/... URLs do not change.
//
//   node --env-file=.env.local scripts/export-storage.mjs --remote      # upload to the real R2 bucket
//   node --env-file=.env.local scripts/export-storage.mjs --local       # upload to the local wrangler dev bucket
//
// Needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (and SUPABASE_STORAGE_BUCKET if not "uploads"), plus `wrangler login` for --remote.
// Safe to run again: files are overwritten with the same content.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const target = process.argv.includes('--remote') ? '--remote' : process.argv.includes('--local') ? '--local' : null;
if (!target) { console.error('Pass --remote or --local.'); process.exit(1); }
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.'); process.exit(1); }

const R2_BUCKET = 'medical-accountant-uploads'; // keep in step with wrangler.jsonc
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const bucket = sb.storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'uploads');

async function walk(folder = '') {
  const files = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await bucket.list(folder, { limit: 100, offset });
    if (error) throw new Error(error.message);
    for (const o of data) {
      const path = folder ? `${folder}/${o.name}` : o.name;
      if (o.id) files.push(path); else files.push(...(await walk(path)));
    }
    if (data.length < 100) return files;
  }
}

const keys = await walk();
console.log(`${keys.length} file(s) to copy to R2 bucket ${R2_BUCKET} (${target})`);
const tmpRoot = '.migration/files';
let done = 0;
for (const key of keys) {
  const { data, error } = await bucket.download(key);
  if (error || !data) { console.error(`FAILED download ${key}: ${error?.message}`); process.exitCode = 1; continue; }
  const file = join(tmpRoot, key);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(await data.arrayBuffer()));
  try {
    execFileSync('npx', ['wrangler', 'r2', 'object', 'put', `${R2_BUCKET}/${key}`, '--file', file, '--content-type', data.type || 'application/octet-stream', target], { stdio: 'pipe', shell: process.platform === 'win32' });
    done++;
  } catch (e) {
    console.error(`FAILED upload ${key}: ${e.stderr?.toString().trim() || e.message}`);
    process.exitCode = 1;
  }
  rmSync(file, { force: true });
}
console.log(`Copied ${done}/${keys.length}.`);
