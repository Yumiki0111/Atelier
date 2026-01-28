import { defineConfig, devices } from '@playwright/test';

/**
 * E2Eテストの設定
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* テストを並列実行するか */
  fullyParallel: true,
  /* CI環境で失敗したテストを再実行するか */
  forbidOnly: !!process.env.CI,
  /* CI環境でリトライするか */
  retries: process.env.CI ? 2 : 0,
  /* 並列実行するワーカー数 */
  workers: process.env.CI ? 1 : undefined,
  /* レポーター設定 */
  reporter: 'html',
  /* 共有設定 */
  use: {
    /* ベースURL */
    baseURL: 'http://localhost:3000',
    /* アクションのタイムアウト */
    actionTimeout: 10000,
    /* ナビゲーションのタイムアウト */
    navigationTimeout: 30000,
    /* スクリーンショットを撮るタイミング */
    screenshot: 'only-on-failure',
    /* 動画を録画するタイミング */
    video: 'retain-on-failure',
    /* トレースを記録するタイミング */
    trace: 'on-first-retry',
  },

  /* テスト対象のプロジェクト */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* 開発サーバーの設定 */
  webServer: {
    command: 'npm run dev:console',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
