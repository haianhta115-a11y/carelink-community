import { test, expect } from '@playwright/test';
test('Published GitHub Pages loads its routes, all 45 fields and local assets', async ({ page }) => {
  await page.goto('https://haianhta115-a11y.github.io/carelink-community/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Kết nối yêu thương');
  await expect(page.getByText('Bản public giao diện', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Khám phá tất cả lĩnh vực', exact: true }).click();
  await expect(page.locator('.expanded-catalog .category-card')).toHaveCount(45);
  await expect.poll(() => page.locator('.hero-photo img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBeTruthy();
  await page.getByRole('link', { name: 'Đăng nhập', exact: true }).first().click();
  await expect(page).toHaveURL(/#\/login$/); await expect(page.locator('#email')).toBeVisible();
});
