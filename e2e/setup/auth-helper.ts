/**
 * 認証ヘルパー関数
 * テスト用のユーザーでログインするためのヘルパー
 */
import { Page } from '@playwright/test';

/**
 * テスト用ユーザーでログインする
 * @param page PlaywrightのPageオブジェクト
 * @param email メールアドレス（デフォルト: 環境変数から取得）
 * @param password パスワード（デフォルト: 環境変数から取得）
 * @returns ログイン成功した場合true、失敗した場合false
 */
export async function loginAsTestUser(
  page: Page,
  email?: string,
  password?: string
): Promise<boolean> {
  const testEmail = email || process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = password || process.env.TEST_USER_PASSWORD || 'testpassword';

  try {
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill(testEmail);
    await page.getByLabel('パスワード').fill(testPassword);
    await page.getByRole('button', { name: 'ログイン' }).click();
    
    // ログイン成功を待つ（最大10秒）
    await page.waitForURL('/', { timeout: 10000 });
    return true;
  } catch (error) {
    console.warn('ログインに失敗しました:', error);
    return false;
  }
}

/**
 * テスト用ユーザーが存在するか確認する
 * 環境変数が設定されている場合、ユーザーが存在すると仮定
 */
export function hasTestUser(): boolean {
  return !!(
    process.env.TEST_USER_EMAIL &&
    process.env.TEST_USER_PASSWORD &&
    process.env.TEST_USER_EMAIL !== 'test@example.com'
  );
}
