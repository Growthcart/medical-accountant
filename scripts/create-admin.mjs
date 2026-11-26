// Creates the SQL for the first admin user (users + profiles rows).
//
//   npm run db:create-admin -- you@medicalaccountant.ie "a long password" "Your Name"
//   then run:  npx wrangler d1 execute DB --remote --file .admin-seed.sql   (use --local for the dev database)
//
// The hash format matches lib/auth/password.ts (PBKDF2-SHA256, 100k iterations).
import { pbkdf2Sync, randomBytes, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const [email, password, fullName = 'Admin'] = process.argv.slice(2);
if (!email || !/^[^@\s']+@[^@\s']+\.[^@\s']+$/.test(email) || !password || password.length < 12) {
  console.error('Usage: npm run db:create-admin -- <email> <password, 12+ characters> [full name]');
  process.exit(1);
}

const ITERATIONS = 100_000;
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
const passwordHash = `pbkdf2$${ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`;

const id = randomUUID();
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const sql = [
  `INSERT INTO users (id, email, password_hash) VALUES (${q(id)}, ${q(email.trim().toLowerCase())}, ${q(passwordHash)});`,
  `INSERT INTO profiles (id, full_name, role) VALUES (${q(id)}, ${q(fullName)}, 'admin');`,
  '',
].join('\n');

writeFileSync('.admin-seed.sql', sql);
console.log('Wrote .admin-seed.sql. Run it with:  npx wrangler d1 execute DB --remote --file .admin-seed.sql   (--local for the dev database)');
console.log('Then delete .admin-seed.sql.');
