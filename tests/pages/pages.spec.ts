import { test, expect } from '@playwright/test';
import { readdir, readFile } from 'node:fs/promises';

test('公開物に公式画像を含めず、フォントのライセンスを保持する', async () => {
  expect(await readdir('dist')).not.toContain('official');
  for (const name of await readdir('public/licenses')) {
    expect(await readFile(`dist/licenses/${name}`, 'utf8')).toBe(
      await readFile(`public/licenses/${name}`, 'utf8'),
    );
  }
});

test('サブパスで画像・フォントを読み込み、操作と記録の保存ができる', async ({ page }) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => errors.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('./');
  await expect(page.locator('.board svg.puyo').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole('button', { name: 'ここに置く', exact: true }).click();
  await expect(page.locator('.next-remaining')).toContainText('あと2手');
  await page.getByRole('button', { name: 'ここに置く', exact: true }).click();
  await page.getByRole('button', { name: 'ここに置く', exact: true }).click();
  await page.getByRole('button', { name: '答え合わせする' }).click();
  await expect(page.locator('.next-feedback')).toBeVisible();
  await page.reload();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('puyolab-progress-v1')!).attempts.length,
    ),
  ).toBe(1);
  await page.getByRole('button', { name: '参考資料・クレジット', exact: true }).click();
  await expect(page.getByText('公式ぷよ画像は配信していません。', { exact: false })).toBeVisible();
  await expect(page.locator('a[href*="SEGA_License"]')).toHaveCount(0);
  expect(requests.some((url) => url.includes('.woff2'))).toBe(true);
  expect(requests.every((url) => url.startsWith('http://127.0.0.1:4174/puyopuyo/'))).toBe(true);
  expect(requests.some((url) => url.includes('/official/'))).toBe(false);
  expect(errors).toEqual([]);
});
