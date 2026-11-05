// Static facts about database/d1-schema.sql that the query layer needs:
// SQLite has no boolean/JSON/uuid types, and there is no PostgREST to infer
// relations. Keep this in step with the schema.

export interface TableMeta {
  /** Primary-key columns (used for upsert conflicts and generated ids). */
  pk: string[];
  /** Columns stored as 0/1 and exposed as booleans. */
  bool?: string[];
  /** Columns stored as JSON text and exposed as parsed values. */
  json?: string[];
  /** Related tables, for embedded selects like `categories(name, slug)`. */
  rel?: Record<string, { table: string; fk: string; many?: boolean }>;
}

export const TABLES: Record<string, TableMeta> = {
  users: { pk: ['id'] },
  sessions: { pk: ['token_hash'] },
  rate_limits: { pk: ['key'] },
  profiles: { pk: ['id'] },
  categories: { pk: ['id'] },
  tags: { pk: ['id'] },
  posts: {
    pk: ['id'],
    bool: ['is_featured'],
    rel: {
      categories: { table: 'categories', fk: 'category_id' },
      profiles: { table: 'profiles', fk: 'author_id' },
      post_tags: { table: 'post_tags', fk: 'post_id', many: true },
    },
  },
  post_tags: {
    pk: ['post_id', 'tag_id'],
    rel: {
      posts: { table: 'posts', fk: 'post_id' },
      tags: { table: 'tags', fk: 'tag_id' },
    },
  },
  site_settings: {
    pk: ['id'],
    bool: [
      'header_banner_enabled', 'cookie_consent_enabled', 'cookie_uk_consent_required',
      'post_html_block_enabled', 'footer_banner_enabled',
    ],
  },
  business_info: { pk: ['id'] },
  header_menus: { pk: ['id'], bool: ['is_active'] },
  url_redirects: { pk: ['id'], bool: ['is_automatic'] },
  cookie_consents: {
    pk: ['id'],
    bool: ['consent_given', 'analytics_consent', 'marketing_consent', 'essential_consent'],
  },
  contact_forms: {
    pk: ['id'],
    bool: ['is_active', 'user_email_enabled'],
    json: ['fields'],
  },
  form_submissions: {
    pk: ['id'],
    bool: ['is_read'],
    json: ['data'],
    rel: { contact_forms: { table: 'contact_forms', fk: 'form_id' } },
  },
  reviews: { pk: ['id'], bool: ['is_active'] },
  review_settings: { pk: ['id'] },
  projects: { pk: ['id'], bool: ['is_active'] },
  time_entries: {
    pk: ['id'],
    rel: { projects: { table: 'projects', fk: 'project_id' } },
  },
  mcp_oauth_clients: { pk: ['client_id'], json: ['redirect_uris', 'grant_types', 'metadata'] },
  mcp_oauth_auth_codes: { pk: ['code_hash'], bool: ['consumed'] },
  mcp_oauth_tokens: { pk: ['id'], bool: ['revoked'] },
};

/** Tables that only server code may touch (never reachable from /api/db). */
export const SERVER_ONLY = new Set([
  'users', 'sessions', 'rate_limits', 'mcp_oauth_clients', 'mcp_oauth_auth_codes', 'mcp_oauth_tokens',
]);
