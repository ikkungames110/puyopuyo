import { expect, test, type Page } from '@playwright/test';
async function simulator(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'シミュレーター', exact: true }).click();
}
async function mockPad(page: Page) {
  await page.addInitScript(() => {
    const state = { connected: true, buttons: [] as number[], axes: [0, 0] };
    (window as unknown as { padState: typeof state }).padState = state;
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true,
      value: () =>
        state.connected
          ? [
              {
                id: 'Test Standard Pad',
                index: 0,
                connected: true,
                mapping: 'standard',
                timestamp: performance.now(),
                axes: state.axes,
                buttons: Array.from({ length: 17 }, (_, i) => ({
                  pressed: state.buttons.includes(i),
                  touched: state.buttons.includes(i),
                  value: state.buttons.includes(i) ? 1 : 0,
                })),
              },
            ]
          : [],
    });
  });
}
async function pad(page: Page, buttons: number[], axes = [0, 0]) {
  await page.evaluate(
    ({ buttons, axes }) => {
      const state = (window as unknown as { padState: { buttons: number[]; axes: number[] } })
        .padState;
      state.buttons = buttons;
      state.axes = axes;
    },
    { buttons, axes },
  );
  await page.waitForTimeout(60);
}
test('入力がなければ落下せず、長押しで横移動、下入力で接地確定できる', async ({ page }) => {
  await simulator(page);
  await expect(page.getByRole('button', { name: '自動落下', exact: true })).toHaveCount(0);
  const initial = await page
    .locator('.active-cell')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label')));
  await page.waitForTimeout(1000);
  expect(
    await page
      .locator('.active-cell')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label'))),
  ).toEqual(initial);
  await page.keyboard.down('ArrowLeft');
  await expect(page.locator('.active-cell').first()).toHaveAttribute('aria-label', /^1列12段/);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('ArrowDown');
  await expect(page.locator('.left-side')).toContainText('2 手目');
  await page.keyboard.up('ArrowDown');
  await expect(page.locator('.left-side')).toContainText('2 手目');
});
test('ゲームパッドの長押し・回転のエッジ検出・即設置・巻き戻し', async ({ page }) => {
  await mockPad(page);
  await simulator(page);
  await expect(page.locator('.controller-panel summary')).toContainText('接続中');
  await pad(page, [14]);
  await expect(page.locator('.active-cell').first()).toHaveAttribute('aria-label', /^1列12段/);
  await pad(page, []);
  await pad(page, [1]);
  await expect(page.locator('.active-cell')).toHaveCount(2);
  const turned = await page.locator('.active-cell').allTextContents();
  const positions = await page
    .locator('.active-cell')
    .evaluateAll((ns) => ns.map((n) => n.getAttribute('aria-label')));
  await page.waitForTimeout(350);
  expect(await page.locator('.active-cell').allTextContents()).toEqual(turned);
  expect(
    await page
      .locator('.active-cell')
      .evaluateAll((ns) => ns.map((n) => n.getAttribute('aria-label'))),
  ).toEqual(positions);
  await pad(page, []);
  await pad(page, [3]);
  await expect(page.locator('.left-side')).toContainText('2 手目');
  await page.waitForTimeout(250);
  await expect(page.locator('.left-side')).toContainText('2 手目');
  await pad(page, []);
  await pad(page, [4]);
  await expect(page.locator('.left-side')).toContainText('1 手目');
});
test('スティック・左右同時押し・同一フレームの移動と設置を扱う', async ({ page }) => {
  await mockPad(page);
  await simulator(page);
  await pad(page, [14, 15]);
  await page.waitForTimeout(180);
  await expect(page.locator('.active-cell').first()).toHaveAttribute('aria-label', /^3列12段/);
  await pad(page, [], [0.2, 0]);
  await expect(page.locator('.active-cell').first()).toHaveAttribute('aria-label', /^3列12段/);
  await pad(page, [], [0.8, 0]);
  await pad(page, []);
  const before = Number(
    (await page.locator('.active-cell').first().getAttribute('aria-label'))![0],
  );
  expect(before).toBeGreaterThanOrEqual(4);
  await pad(page, [3], [-0.8, 0]);
  await pad(page, []);
  await expect(
    page.getByRole('button', { name: new RegExp(`^${before - 1}列1段 (赤|青|緑|黄|紫)$`) }),
  ).toBeVisible();
  await expect(page.locator('.left-side')).toContainText('2 手目');
});
test('切断で入力を解除し、再接続は一度離してから受け付ける', async ({ page }) => {
  await mockPad(page);
  await simulator(page);
  await pad(page, [15]);
  await page.evaluate(() => {
    (window as unknown as { padState: { connected: boolean } }).padState.connected = false;
  });
  await expect(page.locator('.controller-panel summary')).toContainText('未接続');
  const positions = await page
    .locator('.active-cell')
    .evaluateAll((ns) => ns.map((n) => n.getAttribute('aria-label')));
  await page.waitForTimeout(220);
  expect(
    await page
      .locator('.active-cell')
      .evaluateAll((ns) => ns.map((n) => n.getAttribute('aria-label'))),
  ).toEqual(positions);
  await page.evaluate(() => {
    const state = (window as unknown as { padState: { connected: boolean; buttons: number[] } })
      .padState;
    state.connected = true;
    state.buttons = [3];
  });
  await page.waitForTimeout(100);
  await expect(page.locator('.left-side')).toContainText('1 手目');
  await pad(page, []);
  await pad(page, [3]);
  await expect(page.locator('.left-side')).toContainText('2 手目');
});
test('設定中は盤面を動かさず、ボタン割当と速度設定を保存する', async ({ page }) => {
  await mockPad(page);
  await simulator(page);
  await page.locator('.controller-panel summary').click();
  await page.getByLabel('右回転のボタン').selectOption('2');
  await page.getByRole('slider', { name: '横移動の長押し待ち' }).fill('250');
  await pad(page, [3]);
  await expect(page.locator('.left-side')).toContainText('1 手目');
  await pad(page, []);
  await page.locator('.play-toolbar').click();
  await pad(page, [2]);
  await expect(page.locator('.active-cell')).toHaveCount(2);
  await pad(page, []);
  await page.reload();
  await page.locator('.controller-panel summary').click();
  await expect(page.getByLabel('右回転のボタン')).toHaveValue('2');
  await expect(page.getByRole('slider', { name: '横移動の長押し待ち' })).toHaveValue('250');
});
test('ドリルでも下入力で確定でき、押しっぱなしの回転は一回だけ', async ({ page }) => {
  await mockPad(page);
  await page.goto('/');
  await page.waitForTimeout(60);
  await pad(page, [0]);
  const positions = await page
    .locator('.active-cell')
    .evaluateAll((ns) => ns.map((n) => n.getAttribute('aria-label')));
  await page.waitForTimeout(250);
  expect(
    await page
      .locator('.active-cell')
      .evaluateAll((ns) => ns.map((n) => n.getAttribute('aria-label'))),
  ).toEqual(positions);
  await pad(page, []);
  await pad(page, [13]);
  await expect(page.locator('.next-remaining')).toContainText('あと2手');
  await pad(page, []);
  await pad(page, [4]);
  await expect(page.locator('.next-remaining')).toContainText('あと3手');
});
test('学習分野から種の消去順を確認して、同じ種を自由練習へ持ち込める', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '学習ノート', exact: true }).click();
  await page.getByLabel('学習分野').selectOption('多重');
  await expect(page.locator('.study-card')).toHaveCount(5);
  const card = page.locator('.study-card').filter({ hasText: '座布団とL字を組み合わせる' });
  await card.getByRole('button', { name: '形と消え方を見る' }).click();
  await expect(card.locator('.study-seed-detail')).toContainText('8連鎖');
  await card.getByRole('button', { name: '次の段階' }).click();
  await expect(card.locator('.study-seed-detail')).toContainText('確認ツモを置く');
  await card.getByRole('button', { name: 'この種を自由に編集' }).click();
  await expect(page.locator('.play-toolbar')).toContainText('座布団の上にL字');
  expect(await page.locator('.board .puyo').count()).toBeGreaterThan(25);
  await page.getByRole('button', { name: '盤面を編集' }).click();
  await expect(page.getByRole('button', { name: '編集を完了' })).toBeVisible();
});
test('フォーカスを失った押しっぱなし入力は復帰時に暴発しない', async ({ page }) => {
  await mockPad(page);
  await simulator(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hasFocus', { configurable: true, value: () => false });
    window.dispatchEvent(new Event('blur'));
  });
  await pad(page, [3]);
  await page.evaluate(() =>
    Object.defineProperty(document, 'hasFocus', { configurable: true, value: () => true }),
  );
  await page.waitForTimeout(100);
  await expect(page.locator('.left-side')).toContainText('1 手目');
  await pad(page, []);
  await pad(page, [3]);
  await expect(page.locator('.left-side')).toContainText('2 手目');
});
test('スマホでも学習盤面・動画資料・操作設定がはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '学習ノート', exact: true }).click();
  await page.getByLabel('学習分野').selectOption('多重');
  await page.getByRole('button', { name: '形と消え方を見る' }).first().click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/study-mobile.png', fullPage: true });
  await page.getByRole('button', { name: '参考資料・素材について', exact: true }).click();
  await expect(page.locator('.video-grid article')).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'シミュレーター', exact: true }).click();
  await page.locator('.controller-panel summary').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/controller-mobile.png', fullPage: true });
});
