import { test, expect } from '@playwright/test';
test('ホームから実際の操作で3連鎖、記録・リロード後の永続化', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /ひとつ先の、.*連鎖へ。/ })).toBeVisible();
  await expect(page.locator('.board img').first()).toHaveAttribute('src', /official/);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space');
  await expect(page.getByRole('heading', { name: 'クリア！ その調子。' })).toBeVisible({
    timeout: 8000,
  });
  await expect(page.locator('.feedback-card')).toContainText('3連鎖');
  await page.getByRole('button', { name: '練習のきろく', exact: true }).click();
  await expect(page.locator('.progress-stats')).toContainText('100');
  await expect(page.locator('.history-list')).toContainText('階段積みで3連鎖');
  await page.reload();
  await expect(page.locator('.stat-row')).toContainText('1 /');
  await expect(page.locator('.stat-row>div').nth(2)).toContainText('3');
  expect(errors).toEqual([]);
});
test('正解例は記録せず、キャンセルした再生の状態が他の画面を壊さない', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '正解例を再生する' }).click();
  await expect(page.getByRole('heading', { name: '正解例をチェック' })).toBeVisible({
    timeout: 8000,
  });
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('puyolab-progress-v1') || '{"attempts":[]}').attempts
          .length,
    ),
  ).toBe(0);
  await page.getByRole('button', { name: 'もう一度', exact: true }).click();
  await page.getByRole('button', { name: '正解例を再生する' }).click();
  await page.getByRole('button', { name: 'シミュレーター', exact: true }).click();
  await page.waitForTimeout(3500);
  await expect(page.getByRole('heading', { name: '何度でも、試そう。' })).toBeVisible();
  await expect(page.locator('.board .puyo')).toHaveCount(3); // active pivot + 2 ghost cells
});
test('選択クイズの誤答・復習フィルター・解説', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: /練習ドリル/ })
    .first()
    .click();
  await page.getByRole('button', { name: /NEXTを見るタイミング/ }).click();
  await page.getByRole('button', { name: /現在の組ぷよを確定してから初めて見る/ }).click();
  await page.getByRole('button', { name: '答え合わせする' }).click();
  await expect(page.getByRole('heading', { name: '正解を確認してみよう。' })).toBeVisible();
  await page.getByRole('button', { name: 'ドリル一覧に戻る' }).click();
  await page.getByRole('checkbox', { name: /間違えた問題だけ/ }).check();
  await expect(page.locator('.drill-card')).toHaveCount(1);
  await expect(page.locator('.drill-card')).toContainText('NEXTを見るタイミング');
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
test('スマホ幅でもタッチ操作でき、横にはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '左へ移動' }).click();
  await page.getByRole('button', { name: '左へ移動' }).click();
  await page.getByRole('button', { name: 'ここに置く' }).click();
  await expect(page.getByRole('heading', { name: 'クリア！ その調子。' })).toBeVisible({
    timeout: 8000,
  });
  await page.getByRole('button', { name: '表示設定', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'あなたの練習環境に。' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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

test('操作ドリルが入力数を採点し、最短の正解例を表示する', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: /練習ドリル/ })
    .first()
    .click();
  await page.getByRole('button', { name: /4列目に迷わず置く/ }).click();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(page.locator('.feedback-card')).toContainText('もう一度、考えてみよう。');
  await expect(page.locator('.feedback-card')).toContainText('3入力');
  await page.getByRole('button', { name: 'もう一度', exact: true }).click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(page.getByRole('heading', { name: 'クリア！ その調子。' })).toBeVisible();
  await expect(page.locator('.solution-path')).toContainText('→ → Space');
});
