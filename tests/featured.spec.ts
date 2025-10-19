// tests/featured.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Home: Featured Tools (strict + stable)", () => {
  test("renders only featured tools, survives reload, links to details", async ({ page }) => {
    // Initial load
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const section = page.locator('section#featured-tools');
    await expect(section).toBeVisible();

    // Featured cards exist
    const cards = section.locator("article, a.group.block");
    const initialCount = await cards.count();
    expect(initialCount).toBeGreaterThan(0);

    // Reload and verify again (SSR/CSR stability)
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(section).toBeVisible();
    const countAfter = await cards.count();
    expect(countAfter).toBeGreaterThan(0);

    // Each card should have a link to /tools/[slug]
    for (let i = 0; i < countAfter; i++) {
      const card = cards.nth(i);

      // Navigation link must exist
      const link = card.locator('a[href^="/tools/"]');
      await expect(link).toHaveCount(1);
      const href = await link.getAttribute("href");
      expect(href).toMatch(/^\/tools\/[a-z0-9-]+$/);

      // If an iframe exists, ensure it's youtube-nocookie and survives another reload
      const iframe = card.locator('iframe[src*="youtube-nocookie.com/embed/"]');
      const hasIframe = (await iframe.count()) > 0;
      if (hasIframe) {
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(section).toBeVisible();
        const sameCard = section.locator("article, a.group.block").nth(i);
        await expect(sameCard.locator('iframe[src*="youtube-nocookie.com/embed/"]')).toHaveCount(1);
      }
    }
  });
});
