import { test, expect } from '@playwright/test';

const BASE = 'https://haianhta115-a11y.github.io/carelink-community';

test('live public flow is fully functional like real backend', async ({ page }) => {
  const stamp = Date.now();
  const email = `nguoidung${stamp}@example.vn`;
  const password = 'Test@12345';

  // No demo banner or demo wording on landing.
  await page.goto(`${BASE}/`);
  await expect(page.getByText('Bản public demo')).toHaveCount(0);
  await expect(page.getByText('(Demo)')).toHaveCount(0);

  // Register a brand-new account (previously impossible).
  await page.goto(`${BASE}/#/register`);
  await page.getByText('Tôi cần được hỗ trợ', { exact: true }).click();
  await page.getByLabel('Họ và tên', { exact: true }).fill('Người Dùng Thật');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#confirmPassword').fill(password);
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await expect(page).toHaveURL(/#\/login$/);

  // Login with the new account.
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/#\/my-requests$/);

  // Create a request.
  const title = `Cần giúp đỡ thật ${stamp}`;
  await page.goto(`${BASE}/#/requests/new`);
  await page.getByLabel('Tiêu đề yêu cầu').fill(title);
  await page.getByLabel('Danh mục', { exact: true }).selectOption('1');
  await page.getByLabel('Địa điểm cần hỗ trợ').fill('Cầu Giấy, Hà Nội');
  await page.getByLabel('Nội dung cần hỗ trợ').fill('Mô tả chi tiết để kiểm tra luồng thật trên bản public, đủ hai mươi ký tự trở lên.');
  await page.getByRole('button', { name: 'Đăng yêu cầu hỗ trợ', exact: true }).click();
  await expect(page).toHaveURL(/#\/requests\/[a-f0-9-]+$/);
  const requestId = new URL(page.url().replace('#', '')).pathname.split('/').at(-1) as string;

  // Same browser: log out, log in as helper, accept + start + chat.
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await page.locator('#email').fill('helper1@carelink.vn');
  await page.locator('#password').fill('Demo@12345');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.goto(`${BASE}/#/requests/${requestId}`);
  await expect(page.locator('.journey-actions').getByRole('button', { name: 'Tôi muốn hỗ trợ', exact: true })).toBeVisible();
  await page.locator('.journey-actions').getByRole('button', { name: 'Tôi muốn hỗ trợ', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Tôi muốn hỗ trợ', exact: true }).click();
  await expect(page).toHaveURL(/#\/sessions\/.+$/);
  await page.locator('.journey-actions').getByRole('button', { name: 'Bắt đầu hỗ trợ', exact: true }).click();
  await expect(page.locator('.journey-actions').getByText('Người cần hỗ trợ sẽ xác nhận')).toBeVisible();
  await page.getByRole('textbox', { name: 'Nội dung tin nhắn' }).fill('Chào bạn, mình nhận giúp việc này nhé!');
  await page.getByRole('textbox', { name: 'Nội dung tin nhắn' }).press('Enter');
  await expect(page.getByText('Chào bạn, mình nhận giúp việc này nhé!', { exact: true })).toBeVisible();

  // Same browser: back to requester, complete + review.
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.goto(`${BASE}/#/requests/${requestId}`);
  await page.locator('.journey-actions').getByRole('button', { name: 'Xác nhận hoàn thành', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận hoàn thành', exact: true }).click();
  await expect(page.locator('.journey-actions').getByText('Hành trình hỗ trợ đã hoàn thành')).toBeVisible();
});
