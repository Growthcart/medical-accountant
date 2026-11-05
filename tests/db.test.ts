import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { test } from 'node:test';
import { QueryBuilder } from '../lib/db/builder';
import { authorize } from '../lib/db/authz';
import { runQuery, type D1Like } from '../lib/db/exec';
import { hashPassword, verifyPassword } from '../lib/auth/password';
import { sanitizePostHtml } from '../lib/blog/sanitizePostHtml';

// Real Postgres (PGlite, in-process) standing in for Supabase, loaded with the real schema.
async function freshDb() {
  const pg = new PGlite();
  await pg.exec(readFileSync(new URL('../database/supabase-schema.sql', import.meta.url), 'utf8'));
  const d1: D1Like = {
    prepare: (sql) => ({
      bind: (...values) => ({
        all: async () => {
          let n = 0;
          const res = await pg.query(sql.replace(/\?/g, () => '$' + ++n), values as unknown[]);
          return { results: res.rows as Record<string, unknown>[] };
        },
      }),
    }),
  };
  const from = (table: string) => new QueryBuilder((d) => runQuery(d1, d), table);
  return { from };
}

async function seed() {
  const db = await freshDb();
  const { error: e1 } = await db.from('categories').insert([
    { name: 'News', slug: 'news' },
    { name: 'Guides', slug: 'guides' },
  ]);
  assert.equal(e1, null);
  const { data: cats } = await db.from('categories').select('id, slug');
  const news = cats.find((c: { slug: string }) => c.slug === 'news').id;
  const { data: tag } = await db.from('tags').insert({ name: 'SEO', slug: 'seo' }).select('id').single();
  for (let i = 1; i <= 3; i++) {
    const { data: post, error } = await db
      .from('posts')
      .insert({
        title: `Post ${i}`, slug: `post-${i}`, category_id: news, status: i === 3 ? 'draft' : 'published',
        is_featured: i === 1, published_at: `2026-01-0${i}T10:00:00+00:00`,
      })
      .select('id')
      .single();
    assert.equal(error, null);
    if (i <= 2) await db.from('post_tags').insert({ post_id: post.id, tag_id: tag.id });
  }
  return { db, news, tagId: tag.id };
}

test('insert generates ids and normalises timestamps and booleans', async () => {
  const { db } = await seed();
  const { data } = await db.from('posts').select('id, is_featured, published_at').eq('slug', 'post-1').single();
  assert.match(data.id, /^[0-9a-f-]{36}$/);
  assert.equal(data.is_featured, true);
  assert.equal(data.published_at, '2026-01-01T10:00:00.000Z');
});

test('select with filters, ordering, range and exact count', async () => {
  const { db } = await seed();
  const { data, count } = await db
    .from('posts')
    .select('slug', { count: 'exact' })
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .range(0, 0);
  assert.deepEqual(data, [{ slug: 'post-2' }]);
  assert.equal(count, 2);

  const head = await db.from('posts').select('id', { count: 'exact', head: true }).is('category_id', null);
  assert.equal(head.count, 0);
  assert.equal(head.data, null);
});

test('embedded selects: many-to-one and one-to-many with !inner filter', async () => {
  const { db, tagId } = await seed();
  const { data } = await db.from('posts').select('slug, categories(name, slug)').eq('slug', 'post-2').single();
  assert.deepEqual(data, { slug: 'post-2', categories: { name: 'News', slug: 'news' } });

  const { data: tagged, count } = await db
    .from('posts')
    .select('slug, post_tags!inner(tag_id)', { count: 'exact' })
    .eq('post_tags.tag_id', tagId)
    .order('slug');
  assert.deepEqual(tagged.map((p: { slug: string }) => p.slug), ['post-1', 'post-2']);
  assert.equal(count, 2);

  const { data: joined } = await db.from('post_tags').select('tags(name, slug)').eq('tag_id', tagId);
  assert.deepEqual(joined[0], { tags: { name: 'SEO', slug: 'seo' } });
});

test('in() uses one bound parameter, so long lists work', async () => {
  const { db } = await seed();
  const ids = Array.from({ length: 500 }, (_, i) => `missing-${i}`);
  const { data, error } = await db.from('posts').select('slug').in('id', ids);
  assert.equal(error, null);
  assert.deepEqual(data, []);
});

test('update, upsert, delete and the filter requirement', async () => {
  const { db } = await seed();
  assert.equal((await db.from('posts').update({ is_featured: false }).eq('slug', 'post-1')).error, null);
  const { data: p } = await db.from('posts').select('is_featured').eq('slug', 'post-1').single();
  assert.equal(p.is_featured, false);

  await db.from('site_settings').upsert({ id: '00000000-0000-0000-0000-000000000001', gtm_id: 'GTM-1', header_banner_enabled: true });
  const { data: s } = await db.from('site_settings').select('gtm_id, header_banner_enabled, cookie_consent_enabled').single();
  assert.deepEqual(s, { gtm_id: 'GTM-1', header_banner_enabled: true, cookie_consent_enabled: true });

  assert.match((await db.from('posts').delete()).error?.message ?? '', /requires a filter/);
  assert.equal((await db.from('posts').delete().eq('slug', 'post-3')).error, null);
  const { data: left } = await db.from('posts').select('slug');
  assert.equal(left.length, 2);
});

test('errors: duplicate key, single() with no row, json round trip', async () => {
  const { db } = await seed();
  const dup = await db.from('categories').insert({ name: 'News 2', slug: 'news' });
  assert.equal(dup.error?.code, '23505');
  assert.match(dup.error?.message ?? '', /duplicate/);

  const none = await db.from('posts').select('id').eq('slug', 'nope').single();
  assert.equal(none.error?.code, 'PGRST116');
  assert.equal((await db.from('posts').select('id').eq('slug', 'nope').maybeSingle()).data, null);

  const fields = [{ name: 'email', type: 'email' }];
  await db.from('contact_forms').insert({ name: 'Contact', slug: 'contact', recipient_email: 'a@b.co', fields });
  const { data: form } = await db.from('contact_forms').select('fields, is_active').eq('slug', 'contact').single();
  assert.deepEqual(form, { fields, is_active: true });
});

test('rejects unknown tables and unsafe identifiers', async () => {
  const { db } = await seed();
  assert.match((await db.from('sqlite_master').select('*')).error?.message ?? '', /Unknown table/);
  assert.match((await db.from('posts').select('slug').eq('slug; DROP TABLE posts', 'x')).error?.message ?? '', /Invalid identifier/);
});

test('browser access rules', () => {
  const q = (table: string, extra: object = {}) => ({ table, op: 'select' as const, filters: [], orders: [], ...extra });
  assert.deepEqual(authorize(q('users'), true), { error: 'Forbidden', status: 403 });
  assert.equal('error' in authorize(q('posts'), true), false);
  assert.equal('error' in authorize(q('profiles'), false), true);
  assert.equal('error' in authorize(q('categories'), false), false);
  const posts = authorize(q('posts', { select: 'slug' }), false);
  assert.ok(!('error' in posts) && posts.filters.some((f) => f.col === 'status' && f.val === 'published'));
  assert.equal('error' in authorize(q('contact_forms', { select: 'recipient_email' }), false), true);
  assert.equal('error' in authorize(q('contact_forms', { select: 'id, name, fields' }), false), false);
  assert.equal('error' in authorize(q('categories', { select: 'slug, posts(id)' }), false), true);
  assert.equal('error' in authorize({ ...q('cookie_consents'), op: 'insert', values: { consent_given: true } }, false), false);
  assert.equal('error' in authorize({ ...q('posts'), op: 'delete' }, false), true);
});

test('password hashing', async () => {
  const hash = await hashPassword('correct horse battery');
  assert.equal(await verifyPassword('correct horse battery', hash), true);
  assert.equal(await verifyPassword('wrong', hash), false);
  assert.equal(await verifyPassword('x', 'garbage'), false);
});

test('sanitizer keeps content, drops scripts and foreign iframes', () => {
  const out = sanitizePostHtml(
    '<h2 id="a">Hi</h2><p onclick="x()">t <a href="javascript:alert(1)">l</a><script>bad()</script></p>' +
      '<iframe src="https://evil.example/x"></iframe><iframe src="https://www.youtube.com/embed/abc"></iframe><img src="/a.png" alt="a">',
  );
  assert.ok(out.includes('<h2 id="a">Hi</h2>'));
  assert.ok(!out.includes('onclick') && !out.includes('bad()') && !out.includes('javascript:') && !out.includes('evil.example'));
  assert.ok(out.includes('youtube.com/embed/abc') && out.includes('<img src="/a.png" alt="a">'));
});
