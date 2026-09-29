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

test('未確定盤面とツモで方針を選び、回答後に候補を比較する', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '土台判断を始める' }).click();
  await expect(page.locator('.foundation-trainer')).toBeVisible();
  await page.getByRole('button', { name: 'ドリル一覧に戻る' }).click();
  await page.getByRole('button', { name: '#土台判断', exact: true }).click();
  await expect(page.locator('.drill-card')).toHaveCount(9);
  await page.locator('.drill-card').first().click();
  await expect(page.locator('.queue-slot')).toHaveCount(3);
  await expect(page.getByText('接続確認', { exact: true })).toHaveCount(0);
  await expect(page.locator('.foundation-comparison')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/foundation-desktop.png', fullPage: true });
  await expect(page.getByRole('button', { name: '方針を答え合わせする' })).toBeDisabled();
  await page.getByRole('radio', { name: '座布団を優先する', exact: true }).check();
  await page.getByRole('button', { name: '方針を答え合わせする' }).click();
  await expect(page.getByRole('status')).toContainText('見えているツモに2個');
  await expect(page.getByRole('status')).toContainText('ほかの方針と比べてみよう');
  await expect(page.locator('.foundation-comparison')).toContainText('横3にする緑が1個不足');
  await page
    .getByRole('button', { name: 'クッション・卍型Aへ進める受けを作る：配置例を見る', exact: true })
    .click();
  await expect(page.getByRole('slider', { name: '組み始めを比較' })).toHaveValue('3');
  await expect(page.locator('.next-replay')).toContainText(
    'この3手で連鎖を完成させる必要はありません',
  );
  await page.getByRole('button', { name: 'ツモ違い 1 を解く', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '配ぷよから方針を選ぶ 02', exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('.foundation-comparison')).toHaveCount(0);
  await page.getByRole('radio', { name: '座布団を優先する', exact: true }).check();
  await page.getByRole('button', { name: '方針を答え合わせする' }).click();
  await expect(page.getByRole('status')).toContainText('このツモに合った方針です');
  await expect(page.getByRole('status')).toContainText('見えているツモに3個');
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('puyolab-progress-v1')!).attempts.map(
        (a: { correct: boolean }) => a.correct,
      ),
    ),
  ).toEqual([false, true]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/foundation-mobile.png', fullPage: true });
  await page.reload();
  await page.getByRole('button', { name: '練習のきろく', exact: true }).click();
  await page.getByRole('button', { name: '復習する（1）', exact: true }).click();
  await expect(page.locator('.drill-card')).toHaveCount(1);
  await expect(page.locator('.drill-card')).toContainText('配ぷよから方針を選ぶ 01');
});
