// gemini-list-models.mjs
// Run with: node --env-file=.env.local gemini-list-models.mjs
const KEY = process.env.GEMINI_API_KEY;
const EPs = [
  "https://generativelanguage.googleapis.com/v1",
  "https://generativelanguage.googleapis.com/v1beta",
];
if (!KEY) {
  console.error("❌ Missing GEMINI_API_KEY");
  process.exit(1);
}

for (const ENDPOINT of EPs) {
  const url = `${ENDPOINT}/models?key=${encodeURIComponent(KEY)}`;
  console.log("\n== Trying:", url);
  try {
    const res = await fetch(url);
    const txt = await res.text();
    console.log("Status:", res.status);
    let data = null;
    try { data = JSON.parse(txt); } catch {}
    if (res.ok && data?.models) {
      const names = data.models.map(m => m.name);
      console.log("Models available:", names.slice(0, 50));
    } else {
      console.log("Raw body:", txt.slice(0, 2000));
    }
  } catch (e) {
    console.log("Fetch error:", e?.message || e);
  }
}
