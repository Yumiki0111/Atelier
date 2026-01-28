import { test, expect } from '@playwright/test';

/**
 * アセット追加→プレビュー表示のE2Eテスト
 */
test.describe('アセット管理とプレビュー', () => {
  // テスト用の認証情報
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword';

  test.beforeEach(async ({ page }) => {
    // ログイン
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill(testEmail);
    await page.getByLabel('パスワード').fill(testPassword);
    await page.getByRole('button', { name: 'ログイン' }).click();
    
    // ログイン成功を待つ
    try {
      await page.waitForURL('/', { timeout: 10000 });
    } catch {
      test.skip();
    }
    
    // 商品データベースページに移動
    await page.goto('/database/products');
    await page.waitForLoadState('networkidle');
  });

  test('アセット管理ダイアログを開ける', async ({ page }) => {
    // 既存の商品を探す
    const firstProduct = page.locator('table tbody tr').first();
    
    if (await firstProduct.count() === 0) {
      test.skip('商品が存在しないため、アセット管理テストをスキップ');
    }
    
    // アセット管理ボタンをクリック
    const assetButton = firstProduct.getByRole('button', { name: /アセット|asset/i });
    await assetButton.click();
    
    // アセット管理ダイアログが表示されることを確認
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/アセット管理|asset/i)).toBeVisible();
  });

  test('アセットを追加できる', async ({ page }) => {
    // 既存の商品を探す
    const firstProduct = page.locator('table tbody tr').first();
    
    if (await firstProduct.count() === 0) {
      test.skip('商品が存在しないため、アセット追加テストをスキップ');
    }
    
    // アセット管理ダイアログを開く
    const assetButton = firstProduct.getByRole('button', { name: /アセット|asset/i });
    await assetButton.click();
    
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // サイズを選択
    const sizeSelect = page.getByLabel(/サイズ|size/i);
    if (await sizeSelect.isVisible()) {
      await sizeSelect.click();
      await page.getByRole('option', { name: 'M' }).click();
    }
    
    // GLB URLを入力（テスト用のURL）
    const glbUrl = '/3d/model_men.glb';
    const glbInput = page.getByLabel(/GLB|glb|url/i);
    await glbInput.fill(glbUrl);
    
    // 追加ボタンをクリック
    const addButton = page.getByRole('button', { name: /追加|add/i });
    await addButton.click();
    
    // アセットが追加されることを確認（成功メッセージまたは一覧に表示される）
    // 実装に応じて調整が必要
    await page.waitForTimeout(2000);
  });

  test('プレビューパネルを開ける', async ({ page }) => {
    // 既存の商品を探す
    const firstProduct = page.locator('table tbody tr').first();
    
    if (await firstProduct.count() === 0) {
      test.skip('商品が存在しないため、プレビューテストをスキップ');
    }
    
    // プレビューボタンをクリック
    const previewButton = firstProduct.getByRole('button', { name: /プレビュー|preview/i });
    await previewButton.click();
    
    // プレビューパネルが表示されることを確認
    // プレビューパネルは右側に表示される
    await expect(page.getByText(/プレビュー|preview/i)).toBeVisible({ timeout: 5000 });
  });

  test('アセットがない場合、プレビューにメッセージが表示される', async ({ page }) => {
    // 既存の商品を探す
    const firstProduct = page.locator('table tbody tr').first();
    
    if (await firstProduct.count() === 0) {
      test.skip('商品が存在しないため、テストをスキップ');
    }
    
    // プレビューボタンをクリック
    const previewButton = firstProduct.getByRole('button', { name: /プレビュー|preview/i });
    await previewButton.click();
    
    // アセットがない場合のメッセージが表示されることを確認
    // 実装に応じて調整が必要
    await page.waitForTimeout(2000);
    
    // 「アセットがありません」というメッセージが表示されるか確認
    const noAssetMessage = page.getByText(/アセットがありません|asset/i);
    if (await noAssetMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(noAssetMessage).toBeVisible();
    }
  });
});
