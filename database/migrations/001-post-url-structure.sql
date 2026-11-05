-- Existing databases only (new ones get this from d1-schema.sql).
-- 'category' -> /posts/{category}/{post}, 'flat' -> /posts/{post}
ALTER TABLE site_settings ADD COLUMN post_url_structure TEXT NOT NULL DEFAULT 'category' CHECK (post_url_structure IN ('category', 'flat'));
