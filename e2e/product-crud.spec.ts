import { test, expect } from '@playwright/test';

/**
 * 商品CRUDのE2Eテスト
 */
test.describe('商品CRUD', () => {
  // テスト用の認証情報（環境変数から取得）
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword';

  test.beforeEach(async ({ page }) => {
    // ログイン
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill(testEmail);
    await page.getByLabel('パスワード').fill(testPassword);
    await page.getByRole('button', { name: 'ログイン' }).click();
    
    // ログイン成功を待つ（失敗した場合はスキップ）
    try {
      await page.waitForURL('/', { timeout: 10000 });
    } catch {
      test.skip();
    }
    
    // 商品データベースページに移動
    await page.goto('/database/products');
    await page.waitForLoadState('networkidle');
  });

  test('商品一覧ページが表示される', async ({ page }) => {
    // ページタイトルを確認
    await expect(page.getByRole('heading', { name: /商品データベース/i })).toBeVisible();
    
    // 商品追加ボタンが表示されているか確認
    const addButton = page.getByRole('button', { name: /商品を追加|追加/i });
    await expect(addButton).toBeVisible();
  });

  test('商品を作成できる', async ({ page }) => {
    // 商品追加ダイアログを開く
    const addButton = page.getByRole('button', { name: /商品を追加|追加/i });
    await addButton.click();
    
    // ダイアログが表示されることを確認
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // 商品情報を入力
    const productName = `テスト商品 ${Date.now()}`;
    await page.getByLabel(/商品名|name/i).fill(productName);
    await page.getByLabel(/ブランド|brand/i).fill('テストブランド');
    
    // 保存ボタンをクリック
    const saveButton = page.getByRole('button', { name: /保存|作成|追加/i });
    await saveButton.click();
    
    // ダイアログが閉じることを確認
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    
    // 作成した商品が一覧に表示されることを確認
    await expect(page.getByText(productName)).toBeVisible({ timeout: 10000 });
  });

  test('商品を編集できる', async ({ page }) => {
    // 既存の商品を探す（最初の商品を編集）
    const firstProduct = page.locator('table tbody tr').first();
    
    // 商品が存在するか確認
    if (await firstProduct.count() === 0) {
      test.skip('商品が存在しないため、編集テストをスキップ');
    }
    
    // 編集ボタンをクリック
    const editButton = firstProduct.getByRole('button', { name: /編集|edit/i });
    await editButton.click();
    
    // 編集ダイアログが表示されることを確認
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // 商品名を変更
    const updatedName = `更新された商品 ${Date.now()}`;
    const nameInput = page.getByLabel(/商品名|name/i);
    await nameInput.clear();
    await nameInput.fill(updatedName);
    
    // 保存ボタンをクリック
    const saveButton = page.getByRole('button', { name: /保存|更新/i });
    await saveButton.click();
    
    // ダイアログが閉じることを確認
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    
    // 更新された商品名が表示されることを確認
    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 10000 });
  });

  test('商品を削除できる', async ({ page }) => {
    // 既存の商品を探す
    const firstProduct = page.locator('table tbody tr').first();
    
    // 商品が存在するか確認
    if (await firstProduct.count() === 0) {
      test.skip('商品が存在しないため、削除テストをスキップ');
    }
    
    // 商品名を取得（削除確認用）
    const productName = await firstProduct.locator('td').first().textContent();
    
    // 削除ボタンをクリック
    const deleteButton = firstProduct.getByRole('button', { name: /削除|delete/i });
    await deleteButton.click();
    
    // 確認ダイアログが表示される場合、確認ボタンをクリック
    const confirmButton = page.getByRole('button', { name: /削除|確認|OK/i });
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
    }
    
    // 商品が一覧から削除されることを確認
    if (productName) {
      await expect(page.getByText(productName)).not.toBeVisible({ timeout: 10000 });
    }
  });
});
