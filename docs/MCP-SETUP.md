# Publishing to the MedicalAccountant.ie blog from Claude (MCP)

The site can be driven by Claude in two ways, the same as bizztor.com:

| | Claude.ai chat connector | Claude Code (`mcp-server/`) |
| --- | --- | --- |
| Where it runs | Hosted on the site at `/api/mcp` | Locally, started by Claude Code from `.mcp.json` |
| Sign-in | Your MedicalAccountant.ie admin login (OAuth) | The site's `POSTS_API_KEY` in your shell |
| Images | From a public URL | Local files or a URL |
| Setup | Add a custom connector in Claude.ai | `cd mcp-server && npm install`, export the key |

Both use the same publishing logic (`lib/posts-admin.ts`), so slugs, tags, redirects on rename
and cache refresh behave identically, and both offer the same tools: `whoami` (connector only),
`list_categories`, `list_authors`, `list_posts`, `get_post`, `seo_preflight`, `markdown_to_html`,
`upload_image`, `create_post`, `update_post`, `publish_post`, `unpublish_post`.

Claude Code setup is in [mcp-server/README.md](../mcp-server/README.md). The rest of this page is
the Claude.ai connector.

## What's running on the site

| URL | Purpose |
| --- | --- |
| `https://medicalaccountant.ie/api/mcp` | The MCP endpoint (the publishing tools) |
| `https://medicalaccountant.ie/.well-known/oauth-protected-resource` | Tells Claude which login server protects it |
| `https://medicalaccountant.ie/.well-known/oauth-authorization-server` | OAuth discovery |
| `https://medicalaccountant.ie/api/oauth/register` `/authorize` `/token` `/revoke` | OAuth sign-in flow (reuses the admin login) |

## One-time deploy steps

1. **Deploy** this branch so the routes above are live.
2. **Apply the schema** (`npm run db:migrate:remote`). `database/d1-schema.sql` already includes
   the three `mcp_oauth_*` tables that hold OAuth clients, codes and tokens (hashed, server-only).
3. Check `NEXT_PUBLIC_SITE_URL=https://medicalaccountant.ie` is set for the build and as a Worker variable
   (see the README). For Claude Code you also need `POSTS_API_KEY` (any long random string:
   `openssl rand -hex 32`, set as the `POSTS_API_KEY` environment variable in Vercel).
4. Quick check in a browser: both `.well-known` URLs above return JSON, and
   `https://medicalaccountant.ie/api/mcp` returns a JSON "use POST" error.

`NEXT_PUBLIC_SITE_URL` must be the exact address you give Claude (with or without `www`), because
the OAuth documents advertise it.

## Add the connector in Claude.ai

1. In Claude.ai open **Settings → Connectors** and click **Add custom connector**.
2. Name it `MedicalAccountant.ie` and paste the URL `https://medicalaccountant.ie/api/mcp`.
3. Save, then click **Connect**. You are sent to the MedicalAccountant.ie admin sign-in page.
4. Sign in with your admin account. You come back to an **Authorize publishing access**
   screen: click **Allow**.
5. Claude returns to the chat with the connector connected.

## Use it

Enable the MedicalAccountant.ie connector for a conversation and ask in plain language, for example:

> Using MedicalAccountant.ie, list the categories. Then write an 800-word post about local SEO for dental
> practices, with a 150-character excerpt and three tags. Run the SEO preflight and save it as a
> draft so I can review it.

Drafts appear in the admin under **Posts**; publish them there or ask Claude to `publish_post`.

### Featured images

The site only displays images stored on the site itself (Supabase Storage, served from `/files/...` or your
public file domain) or Unsplash (see the Content-Security-Policy in `next.config.mjs`). So:

- Give `create_post` or `update_post` a `featured_image_source_url` and the image is downloaded,
  stored on the site in one step; or run `upload_image` with a
  `source_url` first and pass the returned URL as `featured_image_url`.
- A `featured_image_url` on any other host is copied onto the site automatically.
- Google Discover needs the image to be at least 1200px wide; the tools report this.
- Files attached in the chat cannot be read by the connector; give it a URL, or use Claude Code,
  which accepts local files.

## Notes and limits

- **Only admins can publish.** Posts are attributed to the signed-in account unless you ask for
  another author (`list_authors`).
- **Access lasts 1 hour and refreshes automatically for 30 days**, then you sign in again.
- **Scheduling:** a future `published_at` saves the post as published but it only appears on the
  site from that time (pages are rendered per request, so it appears on time).
- **Renaming** a published post (`new_slug`, or moving it to another category) adds a 301 in
  **URL Redirects**.
- **Security:** tokens are stored only as hashes; the endpoint enforces PKCE (S256) and an exact
  redirect-URI match; registration and revocation are rate-limited. To cut access, remove the
  connector in Claude.ai, or delete the rows in `mcp_oauth_tokens`. To clear expired codes and
  tokens, run it in the Supabase SQL Editor:
  `DELETE FROM mcp_oauth_auth_codes WHERE expires_at < to_char(now() - interval '1 day', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');`
  `DELETE FROM mcp_oauth_tokens WHERE revoked = 1 OR access_expires_at < to_char(now() - interval '7 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');`

## If adding the connector fails

- Use the URL without a trailing slash: `https://medicalaccountant.ie/api/mcp`.
- Check the two `.well-known` URLs return JSON and the schema from step 2 has been applied.
- "Unknown client" when signing in: remove and re-add the connector so it registers again.
- Custom connectors may need a paid Claude plan; if **Add custom connector** is missing, that is
  a Claude account setting, not the site.
