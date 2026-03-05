// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Home page', () => {
  test('loads home page and shows TEAL Jewellery branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/TEAL Jewellery/);
    await expect(page.locator('text=TEAL Jewellery')).toBeVisible();
  });

  test('has navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Collections/i })).toBeVisible();
  });
});

test.describe('Catalog page', () => {
  test('loads catalog and shows filter UI', async ({ page }) => {
    await page.goto('/catalog');
    await expect(page.locator('h1')).toContainText('All Jewellery');
    await expect(page.locator('input[name="q"]')).toBeVisible();
  });
});

test.describe('Auth pages', () => {
  test('register page has form', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.locator('h1')).toContainText('Create Account');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('login page has form', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('h1, h2, h3')).toContainText(/Sign In|Welcome/i);
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });
});

test.describe('Protected routes redirect', () => {
  test('cart redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/cart');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('checkout redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe('Health check', () => {
  test('GET /healthz returns JSON status ok', async ({ page }) => {
    const response = await page.request.get('/healthz');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});
