import { test, expect, type Page } from '@playwright/test';
import { drills } from '../../src/content';
import { placements } from '../../src/engine';
import { evaluate, makeTurn } from '../../src/sequence';
const featured = drills.find((d) => d.id === 'next-piro-1-2')!;
const key: Record<string, string> = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  cw: 'x',
  ccw: 'z',
  down: 'ArrowDown',
};
async function play(page: Page, paths: string[][]) {
  for (const path of paths) {
    for (const a of path) await page.keyboard.press(key[a]);
    await page.getByRole('button', { name: 'ここに置く', exact: true }).click();
  }
}
async function library(page: Page) {
  await page
    .getByRole('button', { name: /練習ドリル/ })
    .first()
    .click();
}
test('3手のNEXT構築を実操作して8連鎖検証、記録を永続化する', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.board img').first()).toHaveAttribute('src', /official/);
  await expect(page.getByRole('button', { name: '答え合わせする' })).toBeDisabled();
  await expect(page.locator('.queue-slot')).toHaveCount(4);
  await play(page, featured.witness);
  await page.getByRole('button', { name: '答え合わせする' }).click();
  await expect(page.getByRole('heading', { name: '正解：接続条件を達成' })).toBeVisible();
  await expect(page.locator('.next-feedback')).toContainText('8 / 8連鎖');
  await page.getByRole('button', { name: '練習のきろく', exact: true }).click();
  await expect(page.locator('.history-list')).toContainText(featured.title);
  await page.reload();
  await expect(page.locator('.stat-row')).toContainText(`1 / ${drills.length}`);
  expect(errors).toEqual([]);
});
test('解答例は記録せず、手順のコマ送りと再生中の画面切替ができる', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '解答例を見る' }).click();
  await expect(page.locator('.next-explanation')).toContainText('解答例の手順');
  await page.getByRole('slider', { name: '再生する手順' }).fill('2');
  await expect(page.locator('.next-replay')).toContainText('2手目の配置');
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('puyolab-progress-v1') || '{"attempts":[]}').attempts
          .length,
    ),
  ).toBe(0);
  await page.getByRole('button', { name: '自動再生' }).click();
  await page.getByRole('button', { name: 'シミュレーター', exact: true }).click();
  await expect(page.locator('.board .puyo')).toHaveCount(3);
});
test('問題集の検索・テーマ・難易度・手数・催促フィルター', async ({ page }) => {
  await page.goto('/');
  await library(page);
  await expect(page.locator('.drill-card')).toHaveCount(drills.length);
  await expect(page.locator('.drill-card')).not.toContainText(['はじめの4個消し']);
  await page.getByLabel('テーマ', { exact: true }).selectOption('潜り込み・斉藤SP');
  await expect(page.locator('.drill-card')).toHaveCount(8);
  await page.getByLabel('難易度', { exact: true }).selectOption('上級');
  expect(await page.locator('.drill-card').count()).toBeGreaterThan(0);
  await page.getByLabel('テーマ', { exact: true }).selectOption('すべて');
  await page.getByLabel('難易度', { exact: true }).selectOption('すべて');
  await page.getByLabel('構築手数', { exact: true }).selectOption('3');
  await expect(page.locator('.drill-card')).toHaveCount(
    drills.filter((d) => d.queue.length === 3).length,
  );
  await page.getByLabel('構築手数', { exact: true }).selectOption('すべて');
  await page.locator('.filter-tabs').getByRole('button', { name: '催促・判断' }).click();
  await expect(page.locator('.drill-card')).toHaveCount(8);
  await page.locator('.filter-tabs').getByRole('button', { name: 'すべて', exact: true }).click();
  await page.getByPlaceholder('ドリルを検索').fill('ぴろぷよ');
  await expect(page.locator('.drill-card')).toHaveCount(10);
});
test('誤答の理由・回答再生・解答比較と復習フィルター', async ({ page }) => {
  const d = drills.find((d) => d.queue.length === 1 && !d.attack)!;
  const p = placements(d.board, d.queue[0]).find(
    (p) => !evaluate(d, [makeTurn(d.board, d.queue[0], p.path)]).correct,
  )!;
  await page.goto('/');
  await library(page);
  await page.locator('.drill-card').filter({ hasText: d.title }).click();
  await play(page, [p.path]);
  await page.getByRole('button', { name: '答え合わせする' }).click();
  await expect(page.getByRole('heading', { name: '配置を見直してみよう' })).toBeVisible();
  await page.getByRole('button', { name: '自分の回答を再生' }).click();
  await expect(page.getByRole('slider')).toBeVisible();
  await page.getByRole('button', { name: '解答例と比較' }).click();
  await expect(page.locator('.next-explanation')).toContainText('解答例の手順');
  await page.getByRole('button', { name: 'ドリル一覧に戻る' }).click();
  await page.getByRole('checkbox', { name: /間違えた問題だけ/ }).check();
  await expect(page.locator('.drill-card')).toHaveCount(1);
});
test('催促の攻撃と本線の残しを判定する', async ({ page }) => {
  const d = drills.find((d) => d.attack && d.queue.length === 2)!;
  await page.goto('/');
  await library(page);
  await page.locator('.drill-card').filter({ hasText: d.title }).click();
  await play(page, d.witness);
  await page.getByRole('button', { name: '答え合わせする' }).click();
  await expect(page.locator('.next-feedback')).toContainText('正解：接続条件を達成');
  await page.getByRole('button', { name: '自分の回答を再生' }).click();
  await expect(page.locator('.next-explanation')).toContainText('接続検証の消去順');
});
test('スマホのタッチ入力・巻戻し・再挑戦、横にはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '左へ移動' }).click();
  await page.getByRole('button', { name: 'ここに置く' }).click();
  await expect(page.locator('.next-remaining')).toContainText('あと2手');
  await page.getByRole('button', { name: '1手戻す' }).click();
  await expect(page.locator('.next-remaining')).toContainText('あと3手');
  await play(page, featured.witness);
  await page.getByRole('button', { name: '答え合わせする' }).click();
  await expect(page.locator('.next-feedback')).toContainText('正解：接続条件を達成');
  await page.getByRole('button', { name: '最初から', exact: true }).click();
  await expect(page.locator('.next-feedback')).toHaveCount(0);
  await library(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('フリー操作、巻き戻し、編集、プリセット連鎖、JSON保存と再読込', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'シミュレーター', exact: true }).click();
  await page.keyboard.press('Space');
  await expect(page.locator('.side-caption')).toContainText([
    '消去得点',
    '2 手目',
    'ひとつずつ、つなげよう。',
  ]);
  await page.getByRole('button', { name: '1手戻す' }).click();
  await expect(page.locator('.left-side')).toContainText('1 手目');
  await page.getByRole('button', { name: '盤面を編集' }).click();
  await page.getByRole('button', { name: '1列1段 空白', exact: true }).click();
  await page.getByRole('button', { name: '編集を完了' }).click();
  await expect(page.getByRole('button', { name: '1列1段 赤', exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('puyo-lab-board.json');
  const json = await page.locator('textarea').inputValue();
  expect(JSON.parse(json).board[0][0]).toBe(1);
  await page.locator('textarea').fill('{broken');
  await page.getByRole('button', { name: 'このデータを読み込む' }).click();
  await expect(page.getByRole('status')).toContainText('読み込めません');
  await page.locator('textarea').fill(json);
  await page.getByRole('button', { name: 'このデータを読み込む' }).click();
  await expect(page.getByRole('status')).toContainText('読み込みました');
  await page.getByRole('button', { name: '3連鎖の形を読み込む' }).click();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space');
  await expect(page.locator('.chain-log')).toContainText('1,000', { timeout: 8000 });
  await page.locator('.chain-log>button').first().click();
  await expect(page.getByRole('button', { name: '現在の盤面に戻る' })).toBeVisible();
  await page.getByRole('button', { name: '現在の盤面に戻る' }).click();
  await expect(page.getByRole('button', { name: '落とす', exact: false })).toBeEnabled();
});
test('主要ページとデスクトップ・スマホのスクリーンショット', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
  for (const name of ['学習ノート', '練習のきろく', '参考資料・クレジット', '表示設定']) {
    await page.getByRole('button', { name, exact: true }).first().click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole('button', { name: 'ホーム', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
});

test('編集した盤面だけを再生して全消しできる', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'シミュレーター', exact: true }).click();
  await page.getByRole('button', { name: '盤面を編集' }).click();
  for (let y = 1; y <= 4; y++) {
    await page.getByRole('button', { name: `1列${y}段 空白`, exact: true }).click();
  }
  await page.getByRole('button', { name: '盤面の連鎖を再生' }).click();
  await expect(page.locator('.chain-log')).toContainText('ALL CLEAR!', { timeout: 5000 });
  await expect(page.locator('.chain-log .log-total')).toContainText('40');
  await expect(page.locator('.left-side')).toContainText('1 手目');
});
