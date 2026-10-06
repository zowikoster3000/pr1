import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const day = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

test('home page is accessible and sends strict security headers', async ({ page }) => {
  const res = await page.goto('/');
  const headers = res!.headers();
  expect(headers['content-security-policy']).toMatch(
    /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/,
  );
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['strict-transport-security']).toContain('max-age=');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-powered-by']).toBeUndefined();

  const csp: string[] = [];
  page.on('console', (m) => m.text().includes('Content Security Policy') && csp.push(m.text()));
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(csp).toEqual([]);

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
  expect(axe.violations).toEqual([]);
});

test('search from the home page streams ranked results', async ({ page }) => {
  await page.goto('/');
  const from = page.getByRole('combobox', { name: 'From' });
  await from.fill('amster');
  await page
    .getByRole('option', { name: /Amsterdam/ })
    .first()
    .click();
  await expect(from).toHaveValue('Amsterdam (AMS)');

  const to = page.getByRole('combobox', { name: 'To' });
  await to.fill('lis');
  await to.press('Enter');
  await expect(to).toHaveValue('Lisbon (LIS)');

  await page.getByLabel('Depart').fill(day(40));
  await page.getByLabel(/Return/).fill(day(47));
  await page.getByRole('button', { name: 'Search flights' }).click();

  await expect(page).toHaveURL(/\/search\?origin=AMS&destination=LIS/);
  await expect(page.getByRole('heading', { name: 'Amsterdam → Lisbon' })).toBeVisible();
  await expect(page.getByText(/^\d+ of \d+ results$/)).toBeVisible();
  await expect(page.getByText(/Demo data — prices/)).toBeVisible();

  const rows = page.locator('ol > li');
  expect(await rows.count()).toBeGreaterThan(5);

  // Expanding a result shows the score breakdown and a safe outbound link.
  await rows.first().getByRole('button').first().click();
  await expect(page.getByText(/Why score \d+/)).toBeVisible();
  const link = page.getByRole('link', { name: /View deal/ });
  await expect(link).toHaveAttribute('href', /^https:\/\/www\.google\.com\//);
  await expect(link).toHaveAttribute('rel', /noopener/);

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
  expect(axe.violations).toEqual([]);
});

test('sorting by price orders results cheapest first', async ({ page }) => {
  await page.goto(`/search?origin=AMS&destination=BCN&departDate=${day(30)}`);
  await expect(page.getByText(/^\d+ of \d+ results$/)).toBeVisible();
  await page.getByRole('button', { name: 'Cheapest' }).click();
  const prices = await page
    .locator('ol > li .text-xl')
    .allInnerTexts()
    .then((t) => t.map((p) => Number(p.replace(/[^\d]/g, ''))));
  expect(prices.length).toBeGreaterThan(3);
  expect([...prices].sort((a, b) => a - b)).toEqual(prices);
});

test('invalid searches are rejected with a helpful message', async ({ page, request }) => {
  await page.goto('/search?origin=AMS&destination=AMS&departDate=2026-01-01');
  await expect(page.getByRole('heading', { name: 'Check your search' })).toBeVisible();
  await expect(page.getByText(/Origin and destination must differ/)).toBeVisible();

  const api = await request.get('/api/search?origin=AMS&destination=<script>&departDate=x');
  expect(api.status()).toBe(400);
});
