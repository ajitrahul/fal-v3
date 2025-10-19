import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

function loadTools(): any[] {
  const p1 = path.join(process.cwd(), 'data', 'tools.json');
  const raw = fs.readFileSync(p1, 'utf8');
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : (Array.isArray((data as any).tools) ? (data as any).tools : []);
}

test('home loads', async ({ page, baseURL }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/FindAIList/i);
});

test('tools index loads', async ({ page }) => {
  await page.goto('/tools');
  await expect(page).toHaveURL(/\/tools/);
});

test('first tool detail loads and shows name', async ({ page }) => {
  const tools = loadTools();
  if (!tools.length) test.skip(true, 'No tools in data/tools.json');
  const first = tools[0];
  const slug = first.slug;
  const name = first.name;
  await page.goto(`/tools/${slug}`);
  // The title should contain the tool name somewhere on the page
  await expect(page.getByText(new RegExp(name, 'i'))).toBeVisible();
});
