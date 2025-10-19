# AI Tools Directory (JSON-first) — Fixed ESM Configs

Quickstart:
```bash
npm install
npm run dev
```
All data in `/data`. This bundle uses ESM Tailwind/PostCSS configs to avoid `module is not defined` errors.

## New in the final build
- **/go/[slug]** affiliate-safe redirect with outbound tracking (writes `data/events.json`)
- **Vendor card & flags**, **JSON-LD** on tool pages, and a **deadpool** banner
- **Search upgrades** (synonyms + typo tolerance)
- **Submissions** (`/api/submit`) + **Admin moderation** at `/admin` (set `ADMIN_TOKEN` env, send in header `x-admin-token`)
- **Newsletter** subscribe (`/api/newsletter`) and UI at `/newsletter`
- **Analytics** endpoint `/api/track`
- **Entity pages** now include FAQ and ItemList JSON-LD

### Admin
Set an env var before `npm run start` (or in Vercel env):
```
ADMIN_TOKEN=your-secret
```
Then use the token in the `/admin` page when approving.


## Segmented Sitemaps
This build serves a sitemap index at **/sitemap.xml** that points to:
- /sitemaps/tools.xml
- /sitemaps/categories.xml
- /sitemaps/tasks.xml
- /sitemaps/roles.xml
- /sitemaps/collections.xml

Set **SITE_URL** in env for correct absolute URLs; otherwise defaults to `https://example.com`.

## Sponsorships & Ads
- Data-driven placements in `data/sponsorships.json`.
- Use `<AdSlot slot="homepage_hero" />` on the homepage and `<AdSlot slot="category_native" context={{ category: 'image-generation' }} />` on category pages.
- All ads are labeled **Sponsored** and tracked via `/api/track` as `sponsor_impression` and `sponsor_click`.
- See `/sponsor` page for inventory overview.

## Analytics (GA4 optional + privacy-first)
- Set `NEXT_PUBLIC_GA4_ID` to enable GA4. A consent banner defaults to **Essential only**; users can opt into **Allow all** for GA4.
- All events still log to `/api/track` (JSON, PII-safe). With consent+GA4, events are also forwarded to GA4 via `gtag`.

## Pro stubs
- `/pro` toggles a demo Pro flag (localStorage) to unlock **Save** and **Alerts**.
- Replace with real auth/billing later.

## Compare tools
- Click **+ Compare** on cards to add tools to a tray; open `/compare?ids=...` to see a side-by-side table (up to 4 tools).

## Admin Env Health
- Visit **/admin/health** for a read-only dashboard of env presence, analytics consent/GA4 load, SEO endpoints reachability, and JSON store stats.

### Env Health — Extra Checks
- **Uptime:** `/api/uptime` shows server start time & seconds up.
- **File system:** `/api/fs-check` verifies read/write to `/data`.
- **Cache/ISR:** `/api/cache-info` clarifies NODE_ENV and ISR applicability.

## Admin — Analytics Dashboard
Go to **/admin/events** for charts and summaries based on `data/events.json` using Recharts.

## Gemini AI Studio — Tool Comparison
We call Google **AI Studio** for AI comparisons on the `/compare` page.

### How to get an API key
1. Visit **https://aistudio.google.com/** and sign in.
2. Go to **Get API key** → **Create API key**.
3. Copy the key and put it in your `.env.local`:
   ```
   GEMINI_API_KEY=your_api_key_here
   GEMINI_MODEL=gemini-2.5-pro
   GEMINI_TEMPERATURE=0.3
   GEMINI_MAX_TOKENS=1600
   AI_COMPARE_CACHE_TTL_DAYS=7
   ```
4. Install deps and run:
   ```bash
   npm i @google/generative-ai
   npm run dev
   ```

### Usage
- Open **/compare**, select tools, then click **Generate AI comparison**.
- Choose **Structured** (JSON) or **Markdown** format.
- Results are cached in `data/ai-cache/` keyed by tool IDs and config.

### Gemini AI — Streaming & Toolbar
- **/api/compare/ai/stream** streams a markdown comparison.
- On **/compare**, enable **Stream (markdown only)** to see live output.
- Toolbar lets you **Copy**, **Download** (.md or .json), and **Save to list (Pro)** (stored in localStorage).
