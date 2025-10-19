// scripts/ci-lint-data.ts
import { lintData } from "../lib/dev/lintData";

const CRITICAL: Set<string> = new Set([
  "missing-name",
  "missing-slug",
  "duplicate-slug",
  "invalid-website-url",
  "invalid-docs-url",
  "invalid-video-id",
]);

(async () => {
  const { warnings, totals } = lintData();

  const crit = warnings.filter((w) => CRITICAL.has(w.type));
  const noncrit = warnings.filter((w) => !CRITICAL.has(w.type));

  // Pretty print
  const printGroup = (label: string, arr: typeof warnings) => {
    if (arr.length === 0) {
      console.log(`${label}: none`);
      return;
    }
    console.log(`${label}: ${arr.length}`);
    for (const w of arr) {
      console.log(`  - [${w.type}] ${w.slug || "-"} | ${w.name || "-"} | ${w.detail || "-"}`);
    }
  };

  console.log("== Data Lint Summary ==");
  console.log(Object.entries(totals).map(([k, v]) => `${k}:${v}`).join("  ") || "no warnings");
  console.log("");
  printGroup("Critical", crit);
  console.log("");
  printGroup("Other", noncrit);
  console.log("");

  if (crit.length > 0) {
    console.error(`✖ CI failed: ${crit.length} critical data issues found.`);
    process.exit(1);
  } else {
    console.log("✔ No critical data issues.");
    process.exit(0);
  }
})();
