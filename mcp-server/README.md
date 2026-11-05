# MedicalAccountant.ie publishing MCP server (Claude Code)

A small [Model Context Protocol](https://modelcontextprotocol.io) server that lets Claude Code
(and any other MCP client) publish to the medicalaccountant.ie blog through the site's publishing
API. It runs locally over stdio and talks to `https://medicalaccountant.ie/api/posts/*` with the
site's `POSTS_API_KEY`. No database credentials are needed on your machine.

For publishing from a normal Claude.ai chat (no repository), use the hosted connector instead:
see [docs/MCP-SETUP.md](../docs/MCP-SETUP.md).

## Tools

| Tool | What it does |
| --- | --- |
| `whoami` | Shows the target site and the default author/category posts publish as |
| `list_categories` | Category slugs you can file a post under |
| `list_authors` | Accounts a post can be attributed to |
| `list_posts` | Search/page through drafts and published posts |
| `get_post` | One post by slug or id, with HTML body |
| `seo_preflight` | Checks title, excerpt, body, links, images and tags against Google search and Discover guidelines |
| `upload_image` | Uploads a local file or remote URL to the site and reports whether it is Discover-ready (>= 1200px wide) |
| `create_post` | Creates a post from Markdown or HTML (runs the preflight first) |
| `update_post` | Partial update by slug or id, including slug renames with an automatic 301 |
| `publish_post` / `unpublish_post` | Flip a post between draft and published |
| `markdown_to_html` | Preview the HTML the site will store |

Every create/update refreshes the article page, the blog index, category, tag and author
archives, the homepage "latest posts", `/sitemap.xml`, `/image-sitemap.xml`, `/feed.xml`,
`/llms.txt` and `/llms-full.txt`, and pings IndexNow, so a new post is live within seconds.

## Setup

1. Install dependencies once:

   ```bash
   cd mcp-server && npm install
   ```

2. Put the site API key in your shell environment (never commit it). It is the
   `POSTS_API_KEY` value set on the site (wrangler secret):

   ```bash
   export CMS_POSTS_API_KEY="..."         # required
   export CMS_DEFAULT_AUTHOR="vijay"       # optional: username (or full name) used when a call omits author_username
   export CMS_DEFAULT_CATEGORY="seo"       # optional: category slug used when a call omits category_slug
   ```

   Posts need an author, so either set `CMS_DEFAULT_AUTHOR` or name one in each request.

3. The repo ships a project-scoped `.mcp.json`, so opening this repository in Claude Code
   registers the `yourbrand` server automatically (Claude Code asks you to approve project MCP
   servers the first time). You can also add it by hand from any directory:

   ```bash
   claude mcp add yourbrand -s user \
     -e CMS_POSTS_API_KEY="$CMS_POSTS_API_KEY" \
     -e CMS_DEFAULT_AUTHOR="$CMS_DEFAULT_AUTHOR" \
     -- node /absolute/path/to/MedicalAccountant.ieWebsite/mcp-server/index.mjs
   ```

4. Check it is connected with `/mcp` inside Claude Code, then try:

   > Use the yourbrand tools to list categories, then draft an 800-word post about ... with a
   > 150-character excerpt and three tags, run seo_preflight, and save it as a draft.

## Point it at a preview deployment

Set `CMS_SITE_URL` to the preview URL to publish to a staging copy of the site. The API
key must match that deployment's `POSTS_API_KEY`.

## Running it by hand

```bash
CMS_POSTS_API_KEY=... node mcp-server/index.mjs
```

The server speaks JSON-RPC over stdin/stdout and prints nothing on its own.
