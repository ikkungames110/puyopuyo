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

test('記事の最善手問題を検索し、ツモを置いて最大連鎖の解答を再生する', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: /練習ドリル/ })
    .first()
    .click();
  await page.getByRole('button', { name: '#記事n951e68d4fdb9', exact: true }).click();
  await expect(page.locator('.drill-card')).toHaveCount(9);
  await page.locator('.drill-card').filter({ hasText: 'どう置く？ ハンバーガー型' }).click();
  await expect(page.locator('.next-rules')).toContainText('同じ最大連鎖に届く別解も正解');
  await expect(page.locator('.queue-slot')).toHaveCount(3);
  await page.getByRole('button', { name: 'ここに置く', exact: true }).click();
  await page.getByRole('button', { name: 'ここに置く', exact: true }).click();
  await page.getByRole('button', { name: '答え合わせする' }).click();
  await expect(page.getByRole('status')).toContainText('正解：このツモでの最大連鎖');
  await expect(page.getByRole('status')).toContainText('最大値：7連鎖');
  await page.getByRole('button', { name: '解答例と比較' }).click();
  await expect(page.getByRole('slider', { name: '再生する手順' })).toBeVisible();
  await expect(page.locator('.next-explanation')).toContainText('赤 → 2: 黄');
  await expect(page.getByRole('link', { name: /みらいやまさると最強の生活/ })).toHaveAttribute(
    'href',
    'https://note.com/saikyo3018/n/n951e68d4fdb9',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/note-fold-mobile.png', fullPage: true });
});
