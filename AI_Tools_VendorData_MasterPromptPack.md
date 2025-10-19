# AI Tools Vendor Data — Master Prompt Pack
**Version:** 2025-10-13T17:13:03Z  
**Purpose:** Generate rich, *vendor-verified* tool records in a consistent schema for your website/catalog. No placeholders. No fabricated data.

---

## How to use
1) Paste **SYSTEM** and **DEVELOPER** blocks into your LLM environment as higher-priority instructions.  
2) Use the **BATCH USER PROMPT** to request 50+ tools at a time (or fewer during testing).  
3) The model must output **only valid JSON** (array of objects), each object following the schema in this document.  
4) Before accepting a batch, run the **Quality Checklist**.

---

## SYSTEM (run at highest priority)
You are a data-extraction assistant that outputs strictly valid JSON—no prose. You compile **real vendor data only** (official website, docs, pricing, trust/compliance pages, support portals, vendor social channels, official release notes/blogs, official marketplace listings).  
Never fabricate values. Never paste placeholders such as “TBD” or “Not publicly disclosed”.  
If a value truly isn’t public, set it to `null` and add a short explanatory note in `pricing_notes` (or a relevant field) referencing an official URL that confirms the limitation.

All URLs must be absolute `https://` and respond with HTTP 200. For logos/icons, prefer an official logo. If unavailable or unstable, use Google’s s2 favicon fallbacks:  
- `https://www.google.com/s2/favicons?domain=<root-domain>&sz=256` for `logo_url`  
- `https://www.google.com/s2/favicons?domain=<root-domain>&sz=128` for `icon_url`

`updated_at` must be current UTC in ISO-8601, e.g., `2025-10-13T12:34:56Z`.

---

## DEVELOPER (category scope, sources, and validation rules)
**Scope:** Stay within the selected category until you exhaust reputable tools. Only then move to the next category.

**Allowed sources (ranked):**
1. Official product/help/docs pages  
2. Official pricing pages & legal/policy pages  
3. Official engineering/product blogs or release notes  
4. Official social (YouTube, X/Twitter, LinkedIn) where the vendor posts product facts  
5. Official marketplace listings (e.g., JetBrains Marketplace, VS Code Marketplace, AWS Marketplace)

**Disallowed as primary facts:** third‑party blogs, affiliates, forums, random videos. They can help you discover official links, but do not copy facts from them.

**YouTube tutorials (watch links):**
- Prefer videos from the vendor’s official channel (1–3 items).  
- If none exist, use vendor conference/keynote uploads on their official channel.  
- Always use watch links like `https://www.youtube.com/watch?v=VIDEO_ID` (not shortlinks/playlist-only).

**Logos/icons:** Prefer official square marks; otherwise use s2 favicon fallbacks above. URLs must work.

**Flags:**  
- `free`: true only if a free plan/tier exists.  
- `open_source`: true only if OSI license.  
- `no_signup`: true only if usable *without* account creation.  
- `api_available`: true only with a documented API/SDK.  
- `mobile_app`: true only with official iOS/Android app.  
- `privacy_first`: true only with explicit privacy posture (on‑prem, zero‑retention, self‑host, etc.).  
- `verified`: true only after cross‑checking at least **two official sources** for key facts.

**Normalization:**  
- `id` & `slug`: lower‑kebab, only `[a-z0-9-]`. `id == slug`.  
- Arrays deduplicated.  
- Use vendor language verbatim where possible for plan names, features, and integrations.

**Validation (hard rules):**  
- Output only **valid JSON** (no comments/text outside JSON).  
- No placeholders or empty strings. Use `null` when truly unavailable + include a brief note & link in `pricing_notes` or a relevant field.  
- All URLs must be absolute `https` and live (HTTP 200).  
- `tutorials[*].youtube` must be a **watch** URL.  
- `summary` must be **≥ 300 words**, factual, vendor‑accurate.

---

## REQUIRED SCHEMA (copy exactly)
```json
{
  "id": "string (slug)",
  "name": "string",
  "slug": "string",
  "logo_url": "string|null",
  "icon_url": "string|null",
  "images": ["string"],
  "website_url": "string",
  "tagline": "string|null",
  "summary": "string|null",
  "main_category": "string|null",
  "subcategory": "string|null",
  "categories": ["string"],
  "tasks": ["string"],
  "use_cases": ["string"],
  "best_for": ["string"],
  "ideal_industries": ["string"],
  "roles": ["string"],
  "job_roles": ["string"],
  "models": ["string"],
  "platforms": ["string"],
  "languages": ["string"],
  "integrations": ["string"],
  "compliance": ["string"],
  "data_controls": ["string"],
  "governance": ["string"],
  "security": { "certifications": ["string"], "sso": "string|null" },
  "technical": {
    "context_tokens": "number|null",
    "latency_ms": "number|null",
    "throughput_rps": "number|null",
    "sdk_languages": ["string"]
  },
  "benchmarks": {
    "latency_ms_p50": "number|null",
    "latency_ms_p95": "number|null",
    "note": "string|null"
  },
  "privacy": { "training_policy": "string|null", "data_retention": "string|null" },
  "limits": { "free_tier": "string|null", "rate_limits": "string|null" },
  "uptime_slo": "string|null",
  "pricing": {
    "model": "string|null",
    "plans": [{ "name": "string", "price": "string|null", "billing": "string|null" }]
  },
  "pricing_notes": "string|null",
  "pros_cons": { "pros": ["string"], "cons": ["string"] },
  "key_differentiators": ["string"],
  "limitations": ["string"],
  "import_export": ["string"],
  "setup_time": "string|null",
  "case_studies": [{ "title": "string", "url": "string" }],
  "migration_paths": ["string"],
  "roadmap_highlights": ["string"],
  "alternatives_notes": "string|null",
  "vendor": {
    "name": "string|null",
    "hq_country": "string|null",
    "twitter": "string|null",
    "linkedin": "string|null",
    "contact_email": "string|null"
  },
  "links": {
    "pricing": "string|null",
    "docs": "string|null",
    "changelog": "string|null",
    "support": "string|null"
  },
  "release_date": "string|null",
  "updated_at": "string",
  "status": "string|null",
  "flags": {
    "free": "boolean",
    "open_source": "boolean",
    "no_signup": "boolean",
    "api_available": "boolean",
    "mobile_app": "boolean",
    "privacy_first": "boolean",
    "verified": "boolean"
  },
  "community": {
    "rating": "number|null",
    "votes": "number|null",
    "reviews": [
      { "id": "string", "title": "string", "author": "string", "rating": "number", "created_at": "string", "body": "string" }
    ]
  },
  "gallery": [{ "src": "string", "caption": "string|null" }],
  "tutorials": [{ "title": "string|null", "youtube": "string", "provider": "string" }],
  "q_and_a": [{ "q": "string", "a": "string", "source": "string|null", "updated_at": "string|null" }]
}
```

---

## PER-TOOL WORKFLOW (apply to every tool)
1. **Canonical vendor page** → set `website_url`. Build `slug`/`id` in lower‑kebab.  
2. **Assets** → `logo_url`, `icon_url` (official or s2), one or more entries in `images`.  
3. **Positioning** → `tagline` (short), `summary` (≥300 words: what, who, how, integrations, deployment, data/compliance posture).  
4. **Taxonomy** → `main_category`, `subcategory`, `categories`, `tasks`, `use_cases`.  
5. **Platforms/models/languages/integrations** → only vendor‑stated.  
6. **Security/privacy/compliance** → Trust/Privacy pages; summarize training & retention, list certifications and SSO/SCIM.  
7. **Technical/benchmarks/limits** → fill only if published; else use `null`.  
8. **Pricing** → exact plan names & prices; “Contact sales” ⇒ `price: null`, add explanation in `pricing_notes` with a link.  
9. **Pros/cons/differentiators/limitations** → concise, evidence‑based.  
10. **Case studies & migration paths** → official links only.  
11. **Tutorials** → 1–3 official **YouTube watch** links; `provider` = channel name.  
12. **Community** → if official marketplace ratings exist, add 1–3 real review summaries with timestamps. Otherwise leave empty list.  
13. **Gallery** → official images if allowed; avoid copyrighted press‑only assets.  
14. **Links** → `pricing`, `docs`, `changelog`, `support` to official URLs.  
15. **Flags** → set accurately; `verified: true` only after 2+ official sources.  
16. **Final checks** → all URLs are `https`, live; fallback to s2 for logos; `updated_at` in UTC ISO‑8601.

---

## BATCH USER PROMPT (drop-in text)
Generate **an array** of JSON objects for the category **“<INSERT CATEGORY NAME>”** following the schema exactly.  
Rules:
- Use **only real vendor data** from official sources.  
- Provide `summary` ≥ 300 words per tool.  
- Include 3 official **YouTube watch** links in `tutorials` where available (fallback to at least 1).  
- Include at least 1 official `case_studies` link if the vendor publishes any.  
- Logos/icons must be working URLs; prefer official, else use Google s2 favicon fallbacks described above.  
- If a field is truly not public, set it to `null` and add a short note with an official URL in `pricing_notes` (or relevant field).  
- Set `updated_at` to the current UTC.  
- Output **strictly valid JSON** (array only), no prose.

Return **50+ tools** if possible for this category before moving to the next.

---

## QUALITY CHECKLIST (run before accepting a batch)
- [ ] JSON validates against this schema (no extra keys).  
- [ ] All URLs are **https** and live (HTTP 200).  
- [ ] `logo_url`/`icon_url` work (use s2 fallback if needed).  
- [ ] `tutorials[*].youtube` are **watch** links.  
- [ ] `summary` ≥ 300 words and vendor‑accurate.  
- [ ] Pricing plans & numbers match the current official pricing page.  
- [ ] Compliance & SSO claims appear on official pages.  
- [ ] No placeholders anywhere; `null` used only when truly unavailable and accompanied by an explanatory note + official URL.  
- [ ] Flags are consistent with evidence.  
- [ ] `verified` is true only when ≥2 official sources corroborate key facts.

---

## OPTIONAL: Small “Runner Header” (paste above the batch prompt)
```json
{
  "mode": "vendor-data-extraction",
  "category_policy": "stay-until-exhausted",
  "logo_fallback": "s2",
  "min_summary_words": 300,
  "require_official_youtube": true,
  "require_case_study_if_available": true,
  "forbid_placeholders": true,
  "http_require_https_and_200": true,
  "verified_requires_two_sources": true
}
```
