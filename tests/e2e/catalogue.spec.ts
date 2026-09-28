import { test, expect } from '@playwright/test';
import { quizzes } from '../../src/content';

test('タグで記事の全問題を検索し、配置問題と判断問題を絞り込める', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: /練習ドリル/ })
    .first()
    .click();
  await page.getByRole('button', { name: '#記事104662', exact: true }).click();
  await expect(page.locator('.drill-card')).toHaveCount(56);
  await page.getByPlaceholder('ドリルを検索').fill('＃記事104662 #仕込み 判断');
  await expect(page.locator('.drill-card')).toHaveCount(3);
  await page.getByPlaceholder('ドリルを検索').fill('#Y字下ゾロ');
  await page.getByLabel('構築手数', { exact: true }).selectOption('2');
  expect(await page.locator('.drill-card').count()).toBeGreaterThan(0);
  await page.locator('.drill-card').first().click();
  await expect(page.getByRole('button', { name: 'ここに置く', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '#記事104662', exact: true }).click();
  await expect(page.locator('.drill-card')).toHaveCount(56);
  await page.getByPlaceholder('ドリルを検索').fill('#存在しないタグ');
  await expect(page.getByRole('heading', { name: '該当するドリルがありません' })).toBeVisible();
});

test('図を切り替えて判断し、正誤・学習記録・復習を保存する', async ({ page }) => {
  const q = quizzes.find((d) => d.diagrams.length === 5)!;
  await page.goto('/');
  await page
    .getByRole('button', { name: /練習ドリル/ })
    .first()
    .click();
  await page.getByPlaceholder('ドリルを検索').fill(q.title);
  await page.locator('.drill-card').click();
  await expect(page.getByRole('button', { name: '答え合わせする' })).toBeDisabled();
  await page.getByRole('button', { name: q.diagrams.at(-1)!.label, exact: true }).click();
  await expect(page.locator('.next-field-heading')).toContainText('5 / 5');
  await page.getByRole('radio', { name: q.options[(q.answer + 1) % 3], exact: true }).check();
  await page.getByRole('button', { name: '答え合わせする' }).click();
  await expect(page.getByRole('status')).toContainText(q.options[q.answer]);
  await expect(page.getByRole('button', { name: '答え合わせする' })).toBeDisabled();
  await page.reload();
  await page.getByRole('button', { name: '練習のきろく', exact: true }).click();
  await expect(page.locator('.history-list')).toContainText(q.title);
  await page.getByRole('button', { name: '復習する（1）', exact: true }).click();
  await expect(page.locator('.drill-card')).toHaveCount(1);
  await page.locator('.drill-card').click();
  await page.getByRole('radio', { name: q.options[q.answer], exact: true }).check();
  await page.getByRole('button', { name: '答え合わせする' }).click();
  await expect(page.getByRole('heading', { name: '正解', exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('puyolab-progress-v1')!).attempts.length,
    ),
  ).toBe(2);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
