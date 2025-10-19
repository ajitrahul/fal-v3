// modify-tutorials.mjs
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * How to run:
 *   node modify-tutorials.mjs ./data/tools-batch-real-20.json ./data/tools-batch-real-20.watch.json
 * Only modifies tutorials[].url to use real YouTube watch links from the mapping below.
 */

const [,, inputPath = "./data/tools-batch-real-20.json", outputPath = "./data/tools-batch-real-20.watch.json"] = process.argv;

// --- BEGIN mapping: slug -> list of watch URLs (exactly 3 preferred) ---
const WATCH_LINKS = {
  // Image Generation
  "midjourney": [
    "https://www.youtube.com/watch?v=vUj4VNXXC1c",
    "https://www.youtube.com/watch?v=877HAXmKwwM",
    "https://www.youtube.com/watch?v=90tXPbyRGS8"
  ],
  "dall-e-3": [
    "https://www.youtube.com/watch?v=wdaxa9B4zto",
    "https://www.youtube.com/watch?v=dznRyGdBudU",
    "https://www.youtube.com/watch?v=ri1FCeVHGPg"
  ],
  "adobe-firefly": [
    "https://www.youtube.com/watch?v=lt4k9lVnS1Y",
    "https://www.youtube.com/watch?v=ykiYSXbLexU",
    "https://www.youtube.com/watch?v=UWfq0T0l1Do"
  ],
  "stable-diffusion-sdxl": [
    "https://www.youtube.com/watch?v=9k-yb83ZHfc",
    "https://www.youtube.com/watch?v=nqZkm216Glk",
    "https://www.youtube.com/watch?v=yamusLEyt4g"
  ],
  "leonardo-ai": [
    "https://www.youtube.com/watch?v=DzJPO1-KZSE",
    "https://www.youtube.com/watch?v=gv0wm-_ajgM",
    "https://www.youtube.com/watch?v=QPIZznz9ik4"
  ],

  // Video
  "runway-gen-2": [
    "https://www.youtube.com/watch?v=yP67VfjjOSc",
    "https://www.youtube.com/watch?v=c38vtLw1nSk",
    "https://www.youtube.com/watch?v=ZA5GfyKFYuw"
  ],
  "pika": [
    "https://www.youtube.com/watch?v=F4vZTKOCeds",
    "https://www.youtube.com/watch?v=x1z3Ypd49hs",
    "https://www.youtube.com/watch?v=QL6bCyYRMdM"
  ],
  "synthesia": [
    "https://www.youtube.com/watch?v=7k3N1bUURa4",
    "https://www.youtube.com/watch?v=ZEEIEs2ey_4",
    "https://www.youtube.com/watch?v=p1YGrj7vPl8"
  ],
  "heygen": [
    "https://www.youtube.com/watch?v=E3K2KZF8fEg",
    "https://www.youtube.com/watch?v=xHZ3kfzP6YY",
    "https://www.youtube.com/watch?v=C2bFuSVX2c4"
  ],
  "descript": [
    "https://www.youtube.com/watch?v=YEzJ_r7geuc",
    "https://www.youtube.com/watch?v=qHtqRWUKPfc",
    "https://www.youtube.com/watch?v=1zf56OidJUU"
  ],
  "kapwing": [
    "https://www.youtube.com/watch?v=IluyRwn3fbo",
    "https://www.youtube.com/watch?v=ehqwoScTXho",
    "https://www.youtube.com/watch?v=IGt6l5XWeEk"
  ],

  // Audio/Voice
  "elevenlabs": [
    "https://www.youtube.com/watch?v=Z2B_pgJ9hbA",
    "https://www.youtube.com/watch?v=Jdsf81ECwBE",
    "https://www.youtube.com/watch?v=SjpRb5eB96I"
  ],
  "play-ht": [
    "https://www.youtube.com/watch?v=_T-d5GOIspA",
    "https://www.youtube.com/watch?v=i3GzNrluY9o",
    "https://www.youtube.com/watch?v=VmqUNwUx_VQ"
  ],

  // Code Assistants
  "tabnine": [
    "https://www.youtube.com/watch?v=Dx6pWyfaNkA",
    "https://www.youtube.com/watch?v=vFBb6CYp6mw",
    "https://www.youtube.com/watch?v=o8ZiDLIxBW8"
  ],
  "codeium": [
    "https://www.youtube.com/watch?v=YM2ingiVVJ0",
    "https://www.youtube.com/watch?v=lu-p9wtps4w",
    "https://www.youtube.com/watch?v=mCLZeQnNFOg"
  ],
  "cursor": [
    "https://www.youtube.com/watch?v=3289vhOUdKA",
    "https://www.youtube.com/watch?v=ocMOZpuAMw4",
    "https://www.youtube.com/watch?v=cE84Q5IRR6U"
  ],
  "replit-ghostwriter": [
    "https://www.youtube.com/watch?v=N6-eFp-3qs4",
    "https://www.youtube.com/watch?v=zzrJ3T1FsRo",
    "https://www.youtube.com/watch?v=79GKxffzYIE"
  ],

  // Assistants
  "chatgpt": [
    "https://www.youtube.com/watch?v=g5oEAoKdrdw",
    "https://www.youtube.com/watch?v=hOe0maWOhp8",
    "https://www.youtube.com/watch?v=WTF5qphyy8w"
  ],
  "claude": [
    "https://www.youtube.com/watch?v=6eBSHbLKuN0",
    "https://www.youtube.com/watch?v=SUysp3sJHbA",
    "https://www.youtube.com/watch?v=f4-a2li1Dp0"
  ],
  "perplexity": [
    "https://www.youtube.com/watch?v=YoWdogtZRw8",
    "https://www.youtube.com/watch?v=LnURCxwsB34",
    "https://www.youtube.com/watch?v=XwQLF7ziRS4"
  ]
};
// --- END mapping ---

function replaceTutorialUrls(tool) {
  const links = WATCH_LINKS[tool.slug];
  if (!links || !Array.isArray(tool.tutorials)) return tool;

  // only replace the URL string, keep title/provider/language
  const updated = tool.tutorials.map((t, i) => {
    if (links[i]) return { ...t, url: links[i] };
    return t; // leave extra/tutorials beyond 3 untouched
  });
  return { ...tool, tutorials: updated };
}

async function main() {
  const inputAbs = path.resolve(inputPath);
  const outputAbs = path.resolve(outputPath);

  const raw = await readFile(inputAbs, "utf8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error(`Expected top-level JSON array, got ${typeof data}`);
  }

  const out = data.map(replaceTutorialUrls);

  await writeFile(outputAbs, JSON.stringify(out, null, 2), "utf8");
  console.log(`✓ Wrote ${out.length} tools with watch URLs to ${outputAbs}`);
}

main().catch(err => {
  console.error("✗ Failed to modify tutorials:", err.message);
  process.exit(1);
});
