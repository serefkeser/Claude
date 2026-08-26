import { expect, test } from '@playwright/test';

test.describe('OTONOM browser smoke', () => {
  test('uygulama açılır, ana sekmeler ve video butonu görünür', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Metin / Haber' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Haber Linki' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Medya Analizi' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Serbest Prompt' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gazete Takip' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Video oluştur/i })).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test('Gazete Takip sekmesine geçilebilir ve uygulama çökmez', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.goto('/');
    await page.getByRole('button', { name: 'Gazete Takip' }).click();

    await expect(page.getByRole('button', { name: 'Gazete Takip' })).toBeVisible();
    await expect(page.locator('body')).toContainText(/gazete/i);
    expect(pageErrors).toEqual([]);
  });

  test('mobil görünüm yatay taşma üretmez', async ({ page }) => {
    await page.goto('/');

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    await expect(page.getByRole('button', { name: /Video oluştur/i })).toBeVisible();
  });
});
