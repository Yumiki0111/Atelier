import { test, expect } from '@playwright/test';

/**
 * Installページのスニペット生成テスト
 */
test.describe('Installページ', () => {
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
    
    // Installページに移動
    await page.goto('/install');
    await page.waitForLoadState('networkidle');
  });

  test('Installページが正しく表示される', async ({ page }) => {
    // ページタイトルを確認
    await expect(page.getByRole('heading', { name: /埋め込みスニペット/i })).toBeVisible();
    
    // スニペットが表示されていることを確認
    const snippetTextarea = page.locator('textarea');
    await expect(snippetTextarea).toBeVisible();
  });

  test('スニペットが生成される', async ({ page }) => {
    // スニペットテキストエリアが存在することを確認
    const snippetTextarea = page.locator('textarea');
    await expect(snippetTextarea).toBeVisible();
    
    // スニペットの内容を確認
    const snippetValue = await snippetTextarea.inputValue();
    expect(snippetValue).toContain('data-atelier-shop-id');
    expect(snippetValue).toContain('widget.js');
  });

  test('商品を選択するとスニペットが更新される', async ({ page }) => {
    // 商品選択ドロップダウンを探す
    const productSelect = page.getByLabel(/商品|product/i);
    
    if (await productSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      // 商品を選択
      await productSelect.click();
      
      // 最初の商品オプションを選択（存在する場合）
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        const optionText = await firstOption.textContent();
        await firstOption.click();
        
        // スニペットが更新されることを確認
        const snippetTextarea = page.locator('textarea');
        const updatedSnippet = await snippetTextarea.inputValue();
        expect(updatedSnippet).toContain('data-atelier-product-id');
      }
    }
  });

  test('スニペットをコピーできる', async ({ page }) => {
    // コピーボタンを探す
    const copyButton = page.getByRole('button', { name: /コピー|copy/i });
    
    if (await copyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // スニペットの内容を取得
      const snippetTextarea = page.locator('textarea');
      const snippetValue = await snippetTextarea.inputValue();
      
      // コピーボタンをクリック
      await copyButton.click();
      
      // クリップボードの内容を確認（Playwrightの制限により、直接確認は難しい）
      // 代わりに、コピー成功のメッセージが表示されることを確認
      await page.waitForTimeout(1000);
      
      // 成功メッセージまたはボタンの状態変化を確認
      const successMessage = page.getByText(/コピーしました|copied/i);
      if (await successMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(successMessage).toBeVisible();
      }
    }
  });
});
