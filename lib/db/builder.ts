// Small PostgREST-style query builder. It only records what was asked for
// (a plain JSON-serialisable descriptor); an executor runs it: Postgres directly on
// the server (lib/db/exec.ts), or POST /api/db from the browser.

export type FilterOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'is' | 'ilike' | 'like';

export interface Filter {
  col: string;
  op: FilterOp;
  val: unknown;
  not?: boolean;
}

export interface QueryDesc {
  table: string;
  op: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  select?: string;
  count?: boolean;
  head?: boolean;
  filters: Filter[];
  orders: { col: string; asc: boolean; nullsFirst?: boolean }[];
  limit?: number;
  range?: [number, number];
  single?: 'single' | 'maybe';
  values?: Record<string, unknown> | Record<string, unknown>[];
  onConflict?: string;
}

export interface DbError {
  message: string;
  code?: string;
}

export interface DbResult {
  // Rows are loosely typed: the shape depends on the select string, which the
  // type system cannot see.
  data: any;
  error: DbError | null;
  count?: number | null;
}

export type Executor = (desc: QueryDesc) => Promise<DbResult>;

export class QueryBuilder implements PromiseLike<DbResult> {
  private desc: QueryDesc;

  constructor(private exec: Executor, table: string) {
    this.desc = { table, op: 'select', filters: [], orders: [] };
  }

  // After insert/update/upsert/delete, select() asks for the written rows back.
  select(columns = '*', opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): this {
    this.desc.select = columns;
    if (opts?.count) this.desc.count = true;
    if (opts?.head) this.desc.head = true;
    return this;
  }

  insert(values: QueryDesc['values']): this {
    this.desc.op = 'insert';
    this.desc.values = values;
    return this;
  }

  update(values: Record<string, unknown>): this {
    this.desc.op = 'update';
    this.desc.values = values;
    return this;
  }

  upsert(values: QueryDesc['values'], opts?: { onConflict?: string }): this {
    this.desc.op = 'upsert';
    this.desc.values = values;
    this.desc.onConflict = opts?.onConflict;
    return this;
  }

  delete(): this {
    this.desc.op = 'delete';
    return this;
  }

  private add(op: FilterOp, col: string, val: unknown): this {
    this.desc.filters.push({ col, op, val });
    return this;
  }

  eq(col: string, val: unknown): this { return this.add('eq', col, val); }
  neq(col: string, val: unknown): this { return this.add('neq', col, val); }
  gt(col: string, val: unknown): this { return this.add('gt', col, val); }
  gte(col: string, val: unknown): this { return this.add('gte', col, val); }
  lt(col: string, val: unknown): this { return this.add('lt', col, val); }
  lte(col: string, val: unknown): this { return this.add('lte', col, val); }
  in(col: string, val: unknown[]): this { return this.add('in', col, val); }
  is(col: string, val: null | boolean): this { return this.add('is', col, val); }
  ilike(col: string, val: string): this { return this.add('ilike', col, val); }
  like(col: string, val: string): this { return this.add('like', col, val); }

  not(col: string, op: FilterOp, val: unknown): this {
    this.desc.filters.push({ col, op, val, not: true });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): this {
    this.desc.orders.push({ col, asc: opts?.ascending !== false, nullsFirst: opts?.nullsFirst });
    return this;
  }

  limit(n: number): this {
    this.desc.limit = n;
    return this;
  }

  range(from: number, to: number): this {
    this.desc.range = [from, to];
    return this;
  }

  single(): this {
    this.desc.single = 'single';
    return this;
  }

  maybeSingle(): this {
    this.desc.single = 'maybe';
    return this;
  }

  // Accepted so call sites can pass a timeout; it is currently ignored.
  abortSignal(_signal: AbortSignal): this {
    return this;
  }

  then<R1 = DbResult, R2 = never>(
    onfulfilled?: ((value: DbResult) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.exec(this.desc).then(onfulfilled, onrejected);
  }
}
