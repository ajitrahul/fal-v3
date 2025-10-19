// app/api/summarize-diff/route.ts
export const runtime = "nodejs";

type Resp = { differentiators: string[]; source?: string };

function clean(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim();
}

function uniqueKeepOrder<T>(arr: T[]) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    const key = String(item).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function extractBullets(html: string): string[] {
  const out: string[] = [];

  // 1) meta description
  const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1];
  if (metaDesc) out.push(clean(metaDesc));

  // 2) Headings that often denote differentiators
  const blocks: string[] = [];
  const headingRegex = /<(h1|h2|h3)[^>]*>(.*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = headingRegex.exec(html))) {
    const label = m[2].toLowerCase();
    if (/(feature|why|benefit|differentiator|faq|highlights|capabilities)/.test(label)) {
      // take the slice after this heading
      const start = Math.max(0, m.index);
      blocks.push(html.slice(start, Math.min(html.length, start + 4000))); // 4k chars after heading
    }
  }

  // 3) From these blocks, pull list items
  for (const b of blocks) {
    const listRegex = /<li[^>]*>(.*?)<\/li>/gis;
    let lm: RegExpExecArray | null;
    while ((lm = listRegex.exec(b))) {
      const txt = clean(lm[1].replace(/<[^>]+>/g, " "));
      if (txt && txt.length >= 20) out.push(txt);
      if (out.length > 12) break;
    }
    if (out.length > 12) break;
  }

  // 4) Fallback: paragraphs after headings
  if (out.length < 3 && blocks.length) {
    const pRegex = /<p[^>]*>(.*?)<\/p>/gis;
    let pm: RegExpExecArray | null;
    while ((pm = pRegex.exec(blocks[0]))) {
      const txt = clean(pm[1].replace(/<[^>]+>/g, " "));
      if (txt.length >= 40) out.push(txt);
      if (out.length >= 8) break;
    }
  }

  // 5) Keep top 6, unique, reasonable length
  return uniqueKeepOrder(out)
    .filter((s) => s && s.length >= 20 && s.length <= 240)
    .slice(0, 6);
}

export async function POST(req: Request) {
  try {
    const { url } = (await req.json()) as { url?: string; slug?: string };
    if (!url || !/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ differentiators: [] } satisfies Resp), { status: 200 });
    }

    const res = await fetch(url, {
      // Some sites dislike default fetch UA; keep it harmless
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AIToolsDirectoryBot/1.0)" },
      redirect: "follow",
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ differentiators: [] } satisfies Resp), { status: 200 });
    }

    const html = await res.text();
    const diffs = extractBullets(html);

    return new Response(JSON.stringify({ differentiators: diffs, source: url } satisfies Resp), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ differentiators: [] } satisfies Resp), { status: 200 });
  }
}
