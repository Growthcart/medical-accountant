import type { DbResult, Filter, QueryDesc } from './builder';
import { TABLES } from './schema';

// Runs a query descriptor against Postgres (Supabase) through lib/db/env.ts, which turns the
// "?" placeholders into $1, $2... (D1Like is the small prepare/bind/all shape that adapter implements). Table and column names are validated here because descriptors can
// come from the browser via /api/db; values are always bound parameters.

export interface D1Like {
  prepare(sql: string): {
    bind(...values: unknown[]): { all(): Promise<{ results?: Record<string, unknown>[] }> };
  };
}

type Row = Record<string, unknown>;

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function ident(name: string): string {
  if (!IDENT.test(name)) throw new Error(`Invalid identifier: ${name}`);
  return `"${name}"`;
}

function tableMeta(table: string) {
  const meta = TABLES[table];
  if (!meta) throw new Error(`Unknown table: ${table}`);
  return meta;
}

// ---- value coercion -------------------------------------------------

function toDb(table: string, col: string, value: unknown): unknown {
  const meta = tableMeta(table);
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  if (meta.json?.includes(col) && typeof value !== 'string') return value === null ? null : JSON.stringify(value);
  // Timestamps are stored as ISO strings so they sort and compare as text.
  if (col.endsWith('_at') && typeof value === 'string') {
    const t = Date.parse(value);
    if (!Number.isNaN(t)) return new Date(t).toISOString();
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Uint8Array)) return JSON.stringify(value);
  return value;
}

function fromDb(table: string, row: Row): Row {
  const meta = tableMeta(table);
  for (const col of meta.bool ?? []) if (col in row && row[col] !== null) row[col] = row[col] === 1 || row[col] === true;
  for (const col of meta.json ?? []) {
    const v = row[col];
    if (typeof v === 'string') {
      try { row[col] = JSON.parse(v); } catch { /* leave as text */ }
    }
  }
  return row;
}

// ---- select parsing -------------------------------------------------

interface Embed { name: string; inner: boolean; cols: string[] }

function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function parseSelect(select: string | undefined): { cols: string[]; embeds: Embed[] } {
  const cols: string[] = [];
  const embeds: Embed[] = [];
  for (const part of splitTop(select || '*')) {
    const m = part.match(/^([A-Za-z_][A-Za-z0-9_]*)(!inner)?\((.*)\)$/s);
    if (m) embeds.push({ name: m[1], inner: Boolean(m[2]), cols: splitTop(m[3]) });
    else cols.push(part);
  }
  return { cols, embeds };
}

// ---- WHERE ----------------------------------------------------------

function cond(col: string, f: Filter, params: unknown[], table: string): string {
  const bind = (v: unknown) => { params.push(toDb(table, col, v)); return '?'; };
  const c = ident(col);
  let sql: string;
  switch (f.op) {
    case 'eq': sql = f.val === null ? 'NULL IS NOT NULL' : `${c} = ${bind(f.val)}`; break;
    case 'neq': sql = `${c} <> ${bind(f.val)}`; break;
    case 'gt': sql = `${c} > ${bind(f.val)}`; break;
    case 'gte': sql = `${c} >= ${bind(f.val)}`; break;
    case 'lt': sql = `${c} < ${bind(f.val)}`; break;
    case 'lte': sql = `${c} <= ${bind(f.val)}`; break;
    case 'like': sql = `${c} LIKE ${bind(f.val)}`; break;
    case 'ilike': sql = `${c} ILIKE ${bind(f.val)}`; break;
    case 'is': sql = f.val === null ? `${c} IS NULL` : `${c} = ${bind(f.val)}`; break;
    // One array parameter keeps this a single bound value however long the list is.
    case 'in': {
      const list = Array.isArray(f.val) ? f.val : [];
      params.push(list.map((v) => toDb(table, col, v)));
      sql = `${c} = ANY(?)`;
      break;
    }
    default: throw new Error(`Unsupported operator: ${f.op}`);
  }
  return f.not ? `NOT (${sql})` : sql;
}

function where(desc: QueryDesc, embeds: Embed[], params: unknown[]): string {
  const meta = tableMeta(desc.table);
  const parts: string[] = [];
  const touched = new Set<string>();
  for (const f of desc.filters) {
    const dot = f.col.indexOf('.');
    if (dot === -1) { parts.push(cond(f.col, f, params, desc.table)); continue; }
    // Filter on an embedded one-to-many relation (post_tags.tag_id): keep rows
    // that have a matching child.
    const rel = meta.rel?.[f.col.slice(0, dot)];
    if (!rel?.many) throw new Error(`Unsupported filter column: ${f.col}`);
    touched.add(f.col.slice(0, dot));
    parts.push(`${ident(meta.pk[0])} IN (SELECT ${ident(rel.fk)} FROM ${ident(rel.table)} WHERE ${cond(f.col.slice(dot + 1), f, params, rel.table)})`);
  }
  // !inner with no filter still means "has at least one child".
  for (const e of embeds) {
    const rel = meta.rel?.[e.name];
    if (e.inner && rel?.many && !touched.has(e.name)) {
      parts.push(`${ident(meta.pk[0])} IN (SELECT ${ident(rel.fk)} FROM ${ident(rel.table)})`);
    }
  }
  return parts.length ? ` WHERE ${parts.join(' AND ')}` : '';
}

// ---- run ------------------------------------------------------------

function errorFor(e: unknown): DbResult {
  const message = e instanceof Error ? e.message : String(e);
  const code = (e as { code?: string })?.code;
  // Postgres SQLSTATE codes (23505 unique, 23503 foreign key, 42703 unknown column) pass straight through.
  return { data: null, error: code ? { message, code } : { message } };
}

async function all(db: D1Like, sql: string, params: unknown[]): Promise<Row[]> {
  const res = await db.prepare(sql).bind(...params).all();
  return (res.results ?? []) as Row[];
}

function project(rows: Row[], cols: string[]): Row[] {
  if (cols.length === 0 || cols.includes('*')) return rows;
  return rows.map((r) => Object.fromEntries(cols.filter((c) => c in r).map((c) => [c, r[c]])));
}

async function attachEmbeds(db: D1Like, table: string, rows: Row[], embeds: Embed[]): Promise<Row[]> {
  const meta = tableMeta(table);
  for (const e of embeds) {
    const rel = meta.rel?.[e.name];
    if (!rel) throw new Error(`Unknown relation ${e.name} on ${table}`);
    const relMeta = tableMeta(rel.table);
    const cols = e.cols.includes('*') ? ['*'] : e.cols;
    const wantAll = cols[0] === '*';
    if (rel.many) {
      const ids = rows.map((r) => r[meta.pk[0]]).filter((v) => v != null);
      const kids = ids.length
        ? await all(db, `SELECT * FROM ${ident(rel.table)} WHERE ${ident(rel.fk)} = ANY(?)`, [ids])
        : [];
      for (const r of rows) {
        r[e.name] = project(kids.filter((k) => k[rel.fk] === r[meta.pk[0]]).map((k) => fromDb(rel.table, { ...k })), cols);
      }
    } else {
      const ids = [...new Set(rows.map((r) => r[rel.fk]).filter((v) => v != null))];
      const targets = ids.length
        ? await all(db, `SELECT * FROM ${ident(rel.table)} WHERE ${ident(relMeta.pk[0])} = ANY(?)`, [ids])
        : [];
      const byId = new Map(targets.map((t) => [t[relMeta.pk[0]], t]));
      for (const r of rows) {
        const t = byId.get(r[rel.fk]);
        r[e.name] = t ? project([fromDb(rel.table, { ...t })], wantAll ? ['*'] : cols)[0] : null;
      }
    }
  }
  return rows;
}

function shape(desc: QueryDesc, rows: Row[], count: number | null): DbResult {
  if (!desc.single) return { data: rows, error: null, count };
  if (rows.length === 1) return { data: rows[0], error: null, count };
  if (rows.length === 0 && desc.single === 'maybe') return { data: null, error: null, count };
  return {
    data: null,
    error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' },
    count,
  };
}

export async function runQuery(db: D1Like, desc: QueryDesc): Promise<DbResult> {
  try {
    const meta = tableMeta(desc.table);
    const t = ident(desc.table);
    const { cols, embeds } = parseSelect(desc.select);
    const wantRows = desc.op === 'select' || desc.select !== undefined;

    if (desc.op === 'select') {
      const params: unknown[] = [];
      const w = where(desc, embeds, params);
      let total: number | null = null;
      if (desc.count) total = Number((await all(db, `SELECT COUNT(*) AS n FROM ${t}${w}`, params))[0]?.n ?? 0);
      if (desc.head) return { data: null, error: null, count: total };

      // Embeds need their key columns even when not selected; dropped again below.
      const hidden: string[] = [];
      const star = desc.select === undefined || cols.includes('*');
      if (!star) {
        for (const e of embeds) {
          const rel = meta.rel?.[e.name];
          const key = rel?.many ? meta.pk[0] : rel?.fk;
          if (key && !cols.includes(key)) { hidden.push(key); cols.push(key); }
        }
      }
      let sql = `SELECT ${star ? '*' : cols.map(ident).join(', ')} FROM ${t}${w}`;
      if (desc.orders.length) {
        sql += ' ORDER BY ' + desc.orders
          .map((o) => `${ident(o.col)} ${o.asc ? 'ASC' : 'DESC'} NULLS ${(o.nullsFirst ?? !o.asc) ? 'FIRST' : 'LAST'}`)
          .join(', ');
      }
      const qp = [...params];
      if (desc.range) { sql += ' LIMIT ? OFFSET ?'; qp.push(desc.range[1] - desc.range[0] + 1, desc.range[0]); }
      else if (desc.limit !== undefined) { sql += ' LIMIT ?'; qp.push(desc.limit); }
      else if (desc.single) { sql += ' LIMIT 2'; }

      let rows = (await all(db, sql, qp)).map((r) => fromDb(desc.table, r));
      rows = await attachEmbeds(db, desc.table, rows, embeds);
      if (hidden.length) for (const r of rows) for (const h of hidden) delete r[h];
      return shape(desc, rows, total);
    }

    if (desc.op === 'delete' || desc.op === 'update') {
      if (desc.filters.length === 0) return { data: null, error: { message: `${desc.op} requires a filter` } };
      const params: unknown[] = [];
      let sql: string;
      if (desc.op === 'update') {
        const entries = Object.entries(desc.values ?? {}).filter(([, v]) => v !== undefined);
        if (entries.length === 0) return { data: null, error: { message: 'update requires values' } };
        sql = `UPDATE ${t} SET ${entries.map(([c, v]) => { params.push(toDb(desc.table, c, v)); return `${ident(c)} = ?`; }).join(', ')}`;
      } else {
        sql = `DELETE FROM ${t}`;
      }
      sql += where(desc, [], params);
      if (wantRows) sql += ' RETURNING *';
      const rows = (await all(db, sql, params)).map((r) => fromDb(desc.table, r));
      return wantRows ? shape(desc, project(rows, cols), null) : { data: null, error: null };
    }

    // insert / upsert
    const list = (Array.isArray(desc.values) ? desc.values : [desc.values ?? {}]) as Row[];
    if (list.length === 0) return { data: [], error: null };
    const columns = [...new Set(list.flatMap((r) => Object.keys(r).filter((k) => r[k] !== undefined)))];
    // Generate ids for single-column text primary keys named "id".
    const genId = meta.pk.length === 1 && meta.pk[0] === 'id' && !columns.includes('id');
    const allCols = genId ? ['id', ...columns] : columns;
    const target = desc.op === 'upsert'
      ? (desc.onConflict ? desc.onConflict.split(',').map((x) => x.trim()) : meta.pk).map(ident).join(', ')
      : '';
    const updates = allCols.filter((c) => !meta.pk.includes(c) && c !== desc.onConflict);
    const conflict = desc.op !== 'upsert' ? ''
      : updates.length
        ? ` ON CONFLICT (${target}) DO UPDATE SET ${updates.map((c) => `${ident(c)} = excluded.${ident(c)}`).join(', ')}`
        : ` ON CONFLICT (${target}) DO NOTHING`;
    // Postgres allows 65535 bound parameters per statement; split very large inserts well below that.
    const perStatement = Math.max(1, Math.floor(10000 / allCols.length));
    const out: Row[] = [];
    for (let i = 0; i < list.length; i += perStatement) {
      const params: unknown[] = [];
      const tuples = list.slice(i, i + perStatement).map((r) => {
        const vals = allCols.map((c) => (c === 'id' && genId ? crypto.randomUUID() : toDb(desc.table, c, r[c])));
        params.push(...vals);
        return `(${vals.map(() => '?').join(', ')})`;
      });
      const sql = `INSERT INTO ${t} (${allCols.map(ident).join(', ')}) VALUES ${tuples.join(', ')}${conflict}${wantRows ? ' RETURNING *' : ''}`;
      out.push(...(await all(db, sql, params)));
    }
    const rows = out.map((r) => fromDb(desc.table, r));
    return wantRows ? shape(desc, project(rows, cols), null) : { data: null, error: null };
  } catch (e) {
    return errorFor(e);
  }
}
