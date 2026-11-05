-- ============================================================
-- Supabase (Postgres) schema for the site's database.
-- Run once: Supabase dashboard > SQL Editor > paste this file > Run.
-- It is safe to run again (everything is IF NOT EXISTS / ON CONFLICT).
-- Timestamps are ISO-8601 UTC strings (TEXT), flags are 0/1 integers and JSON is TEXT;
-- the app layer (lib/db) converts these back to JS types, exactly as it did on D1.
-- Row Level Security is switched on for every table with NO policies: Supabase's public
-- REST API (anon key) can read nothing. The app connects with DATABASE_URL, which bypasses RLS.
-- ============================================================

-- Auth ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL
);

-- Content ------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  profile_photo_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'admin' CHECK (role = 'admin'),
  job_title TEXT,
  linkedin_url TEXT,
  twitter_handle TEXT,
  website_url TEXT,
  created_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT,
  excerpt TEXT,
  featured_image_url TEXT,
  featured_image_alt TEXT,
  featured_image_credit TEXT,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  author_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  is_featured INTEGER DEFAULT 0,
  published_at TEXT,
  created_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'audio')),
  media_url TEXT,
  media_caption TEXT,
  media_credit TEXT,
  canonical_url TEXT,
  schema_type TEXT
);
CREATE INDEX IF NOT EXISTS idx_posts_status_published_date ON posts (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category_published ON posts (category_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_status ON posts (author_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts (is_featured, status, published_at DESC);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags (tag_id);

-- Site ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
  header_banner_enabled INTEGER DEFAULT 0,
  header_banner_content TEXT DEFAULT '',
  header_banner_bg_color TEXT DEFAULT '#1e1b4b',
  ga4_measurement_id TEXT,
  meta_pixel_id TEXT,
  gtm_id TEXT,
  twitter_pixel_id TEXT,
  linkedin_partner_id TEXT,
  tiktok_pixel_id TEXT,
  google_search_console_id TEXT,
  custom_head_scripts TEXT,
  custom_body_scripts TEXT,
  cookie_consent_enabled INTEGER DEFAULT 1,
  cookie_banner_message TEXT DEFAULT 'We use cookies to enhance your browsing experience and analyze site traffic.',
  cookie_policy_content TEXT,
  cookie_uk_consent_required INTEGER DEFAULT 1,
  post_html_block_enabled INTEGER DEFAULT 0,
  post_html_block_content TEXT DEFAULT '',
  footer_banner_enabled INTEGER DEFAULT 0,
  footer_banner_content TEXT DEFAULT '',
  footer_banner_bg_color TEXT DEFAULT '#1e1b4b',
  -- 'category' -> /posts/{category}/{post}, 'flat' -> /posts/{post}
  post_url_structure TEXT NOT NULL DEFAULT 'category' CHECK (post_url_structure IN ('category', 'flat')),
  created_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);
INSERT INTO site_settings (id) VALUES ('00000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS business_info (
  id TEXT PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
  business_name TEXT NOT NULL DEFAULT '',
  business_category TEXT,
  logo_url TEXT,
  description TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_postal_code TEXT,
  address_country TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  social_facebook TEXT,
  social_twitter TEXT,
  social_instagram TEXT,
  social_linkedin TEXT,
  social_youtube TEXT,
  social_tiktok TEXT,
  social_github TEXT,
  created_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

CREATE TABLE IF NOT EXISTS header_menus (
  id TEXT PRIMARY KEY,
  menu_text TEXT NOT NULL,
  menu_link TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);
CREATE INDEX IF NOT EXISTS idx_header_menus_active_order ON header_menus (is_active, display_order);

CREATE TABLE IF NOT EXISTS url_redirects (
  id TEXT PRIMARY KEY,
  from_path TEXT NOT NULL,
  to_path TEXT NOT NULL,
  status_code INTEGER DEFAULT 301 CHECK (status_code IN (301, 302, 307, 308)),
  notes TEXT,
  is_automatic INTEGER DEFAULT 0,
  redirect_type TEXT,
  hit_count INTEGER DEFAULT 0,
  last_hit_at TEXT,
  created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);
CREATE INDEX IF NOT EXISTS idx_url_redirects_from_path ON url_redirects (from_path);

CREATE TABLE IF NOT EXISTS cookie_consents (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  user_id TEXT,
  consent_given INTEGER DEFAULT 0,
  consent_type TEXT DEFAULT 'all',
  analytics_consent INTEGER DEFAULT 0,
  marketing_consent INTEGER DEFAULT 0,
  essential_consent INTEGER DEFAULT 1,
  ip_address TEXT,
  country TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

-- Forms --------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_forms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  fields TEXT NOT NULL DEFAULT '[]',
  recipient_email TEXT NOT NULL,
  success_message TEXT DEFAULT 'Thank you! We will get back to you soon.',
  is_active INTEGER DEFAULT 1,
  admin_email_subject TEXT,
  admin_email_template TEXT,
  user_email_enabled INTEGER DEFAULT 0,
  user_email_field TEXT,
  user_email_subject TEXT,
  user_email_template TEXT,
  created_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

CREATE TABLE IF NOT EXISTS form_submissions (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES contact_forms(id) ON DELETE CASCADE,
  data TEXT NOT NULL DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions (form_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_is_read ON form_submissions (form_id, is_read);

-- Reviews ------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  review_date TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD')),
  spoiler TEXT,
  review TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  designation TEXT,
  business_name TEXT,
  website_url TEXT,
  is_active INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);
CREATE INDEX IF NOT EXISTS idx_reviews_active_order ON reviews (is_active, display_order);

CREATE TABLE IF NOT EXISTS review_settings (
  id TEXT PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
  google_reviews_text TEXT DEFAULT '',
  google_reviews_link TEXT DEFAULT '',
  updated_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);
INSERT INTO review_settings (id) VALUES ('00000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;

-- Time tracking ------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects (is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  started_at TEXT NOT NULL DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ended_at TEXT,
  duration_minutes INTEGER,
  created_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at TEXT DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_started ON time_entries (project_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_started ON time_entries (started_at DESC);
-- At most ONE running entry (ended_at IS NULL) across the table.
CREATE UNIQUE INDEX IF NOT EXISTS idx_time_entries_single_running
  ON time_entries ((ended_at IS NULL)) WHERE ended_at IS NULL;

-- MCP OAuth (Claude connector) ---------------------------------
CREATE TABLE IF NOT EXISTS mcp_oauth_clients (
  client_id TEXT PRIMARY KEY,
  client_secret_hash TEXT,
  client_name TEXT,
  redirect_uris TEXT NOT NULL DEFAULT '[]',
  grant_types TEXT NOT NULL DEFAULT '["authorization_code","refresh_token"]',
  token_endpoint_auth_method TEXT NOT NULL DEFAULT 'none',
  scope TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

CREATE TABLE IF NOT EXISTS mcp_oauth_auth_codes (
  code_hash TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES mcp_oauth_clients(client_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL DEFAULT 'S256',
  scope TEXT,
  expires_at TEXT NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);
CREATE INDEX IF NOT EXISTS idx_mcp_auth_codes_expires ON mcp_oauth_auth_codes (expires_at);

CREATE TABLE IF NOT EXISTS mcp_oauth_tokens (
  id TEXT PRIMARY KEY,
  access_token_hash TEXT NOT NULL UNIQUE,
  refresh_token_hash TEXT UNIQUE,
  client_id TEXT NOT NULL REFERENCES mcp_oauth_clients(client_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scope TEXT,
  access_expires_at TEXT NOT NULL,
  refresh_expires_at TEXT,
  revoked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  last_used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_mcp_tokens_user ON mcp_oauth_tokens (user_id) WHERE revoked = 0;

-- Lock the public REST API ----------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE header_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE url_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cookie_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_oauth_auth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_oauth_tokens ENABLE ROW LEVEL SECURITY;
